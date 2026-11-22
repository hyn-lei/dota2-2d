import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import * as Inventory from '../src/inventory.js';
import * as Items from '../src/item-runtime.js';
import * as Skills from '../src/hero-runtime.js';
import * as Courier from '../src/courier.js';
import {BASES} from '../src/map-data.js';

function arena(difficulty='hell',hero='crystal_maiden',enemyId='juggernaut'){
  const g=new Game({difficulty,seed:17}),bot=g._makeHero(hero,1,0,false,0),enemy=g._makeHero(enemyId,0,0,true,0);
  for(const [i,h] of [bot,enemy].entries())Object.assign(h,{x:10400+i*350,y:10400,abilityLevels:[0,0,0,0],skillPoints:0,talentPoints:0,gold:0,mana:1000,aiTimer:i?Infinity:0,isHuman:!!i,hpRegen:0,manaRegen:0,attackCooldown:999,botShop:{nextAt:Infinity,needsShop:false}});
  bot.draftRole='support';g.entities=[bot,enemy];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
  for(const c of g.camps)c.nextSpawn=Infinity;g._index();return {g,bot,enemy};
}
function equip(g,h,ids){h.inventory=ids;h.inventoryMeta=[];Inventory.ensureInventory(h);g._refreshHero(h);h.mana=1000;}
function fade(g,bot,enemy,id='glimmer_cape'){
  const start=g.time;equip(g,enemy,[id]);g._botTick(bot,0);assert.ok(Items.useItem(g,enemy,0,enemy).ok);
  g.time=start+.1;g._botTick(bot,.1);g.time=start+.7;
}

for(const difficulty of ['hard','nightmare','hell'])test(`${difficulty} reveals observed enemy Glimmer with real Dust centered on the caster`,()=>{
  const {g,bot,enemy}=arena(difficulty);equip(g,bot,['dust']);fade(g,bot,enemy);
  assert.equal(g.canSee(bot,enemy),false);g._botTick(bot,.6);
  assert.equal(g.canSee(bot,enemy),true,'use real detection after the observed fade');
  assert.equal(Inventory.itemEntries(bot).some(e=>e.id==='dust'),false);
  const zone=g.itemZones.find(z=>z.itemId==='dust');assert.equal(zone.x,bot.x);assert.equal(zone.y,bot.y);
});

test('a support buys observed-threat Dust with real gold and courier delivery without transit duplicates',()=>{
  const {g,bot,enemy}=arena('hard');fade(g,bot,enemy);bot.gold=80;delete bot.botShop;
  g._botTick(bot,0);
  assert.equal(bot.gold,0);assert.ok(bot.stash.includes('dust'),'remote purchase must enter the real stash');
  const uid=bot.stashMeta[bot.stash.indexOf('dust')].uid,c=Courier.ensureCourier(g,bot);
  g.time+=1;g._botTick(bot,0);assert.equal(bot.botShop.purchases,1);
  for(let i=0;i<100&&!bot.inventory.includes('dust');i++){g.time+=.5;Courier.tickCouriers(g,.5);Inventory.tickInventory(g,bot);}
  assert.ok(bot.inventory.includes('dust'));assert.equal(bot.inventoryMeta[bot.inventory.indexOf('dust')].uid,uid);assert.equal(c.cargo.filter(Boolean).length,0);
});

test('a support buys a real Sentry for repeated observed invisibility when Dust is unaffordable',()=>{
  const {g,bot,enemy}=arena('hard');fade(g,bot,enemy);g._botTick(bot,.6);
  g.time=20;Items.tickUnit(g,enemy,20);fade(g,bot,enemy);g._botTick(bot,.6);bot.gold=50;delete bot.botShop;g.time+=.5;g._botTick(bot,.5);
  assert.equal(bot.gold,0);assert.ok(bot.stash.includes('ward_sentry'));assert.equal(bot.botShop.detectionGoal,'ward_sentry');
});

test('a healthy late support buys one real Gem after repeated observed invisibility',()=>{
  const {g,bot,enemy}=arena('hell');
  for(const at of [600,620,640]){g.time=at;Items.tickUnit(g,enemy,20);fade(g,bot,enemy);g._botTick(bot,.6);}
  bot.gold=2000;delete bot.botShop;g.time+=.5;g._botTick(bot,.5);
  assert.equal(bot.gold,1100);assert.ok(bot.stash.includes('gem'));assert.equal(bot.botShop.detectionGoal,'gem');
});

test('an owned Sentry is placed within real cast range around the last visible position',()=>{
  const {g,bot,enemy}=arena('hell');enemy.x=bot.x+700;equip(g,bot,['ward_sentry']);fade(g,bot,enemy);
  g._botTick(bot,.6);const ward=g.entities.find(e=>e.wardType==='sentry');
  assert.ok(ward);assert.ok(Math.hypot(ward.x-bot.x,ward.y-bot.y)<=500.001);assert.equal(ward.ownerId,bot.id);
  assert.equal(g.canSee(bot,enemy),true);assert.equal(Inventory.itemEntries(bot).some(e=>e.id==='ward_sentry'),false);
});

test('an owned Gem active uses a legal point from memory without following the hidden target position',()=>{
  const {g,bot,enemy}=arena('hell');equip(g,bot,['gem']);fade(g,bot,enemy);enemy.x=bot.x+1100;g._index();
  assert.equal(g.canSee(bot,enemy),false);g._botTick(bot,.6);
  const zone=g.itemZones.find(z=>z.itemId==='gem');assert.ok(zone);assert.equal(zone.x,bot.x+300);assert.equal(zone.y,bot.y);
  assert.ok(bot.inventoryMeta[0].cooldownRemaining>0);assert.equal(zone.radius,300);assert.equal(g.canSee(bot,enemy),false,'a target escaping the remembered area stays hidden');
});

test('an existing allied Sentry covering the disappearance point prevents another Dust cast',()=>{
  const {g,bot,enemy}=arena('hell');equip(g,bot,['dust']);fade(g,bot,enemy);
  const ward=g._unit('ward',1,bot.x+350,bot.y,{wardType:'sentry',trueSight:1050,maxHp:2,ownerId:bot.id});g.entities.push(ward);
  enemy.x=bot.x+1800;g._index();assert.equal(g.canSee(bot,enemy),false);
  g._botTick(bot,.6);assert.ok(bot.inventory.includes('dust'),'the remembered area already has real allied true sight');
});

test('Gem carrier approaches a distant disappearance point before spending its short-range active',()=>{
  const {g,bot,enemy}=arena('hell');enemy.x=bot.x+800;equip(g,bot,['gem']);fade(g,bot,enemy);enemy.x=bot.x+1600;g._index();
  g._botTick(bot,.6);assert.equal(bot.inventoryMeta[0].cooldownRemaining,0,'the active must reach the remembered point');
  assert.equal(bot.botState.mode,'search');
  for(let i=0;i<5&&bot.inventoryMeta[0].cooldownRemaining===0;i++){g.time+=.1;g._botTick(bot,.1);}
  assert.ok(bot.inventoryMeta[0].cooldownRemaining>0,'use the active after a bounded approach');
});

for(const item of ['invis_sword','silver_edge'])test(`challenge counters observed ${item} with actual Dust`,()=>{
  const {g,bot,enemy}=arena('hard');equip(g,bot,['dust']);fade(g,bot,enemy,item);assert.equal(g.canSee(bot,enemy),false);
  g._botTick(bot,.6);assert.equal(g.canSee(bot,enemy),true);assert.ok(!bot.inventory.includes('dust'));
});

test('challenge counters observed Weaver Shukuchi with actual Dust',()=>{
  const {g,bot,enemy}=arena('hard','crystal_maiden','weaver');equip(g,bot,['dust']);enemy.abilityLevels=[0,1,0,0];
  g._botTick(bot,0);assert.ok(g._cast(enemy,1,enemy).ok);g.time=.1;g._botTick(bot,.1);g.time=.4;
  assert.equal(g.canSee(bot,enemy),false);g._botTick(bot,.3);assert.equal(g.canSee(bot,enemy),true);assert.ok(!bot.inventory.includes('dust'));
});

test('unobserved hidden enemies do not trigger Dust or searches and their hidden inventory is never inspected',()=>{
  const {g,bot,enemy}=arena('hell');equip(g,bot,['dust']);equip(g,enemy,['glimmer_cape']);assert.ok(Items.useItem(g,enemy,0,enemy).ok);g.time=.7;
  Object.defineProperty(enemy,'inventory',{get(){throw new Error('hidden inventory was inspected');}});
  g._botTick(bot,.7);assert.ok(bot.inventory.includes('dust'));assert.notEqual(bot.botState.mode,'search');assert.equal(bot.targetId,null);
});

test('one nearby support reveals while teammates preserve their Dust and resume normal targeting',()=>{
  const {g,bot,enemy}=arena('hell'),ally=g._makeHero('axe',1,2,false,1);
  Object.assign(ally,{x:bot.x+40,y:bot.y,draftRole:'carry',abilityLevels:[0,0,0,0],skillPoints:0,talentPoints:0,gold:0,aiTimer:0,attackCooldown:999,botShop:{nextAt:Infinity}});
  equip(g,bot,['dust']);equip(g,ally,['dust']);g.entities.push(ally);g._index();fade(g,bot,enemy);
  g._botTick(ally,.6);assert.notEqual(ally.botState.mode,'search');assert.ok(ally.inventory.includes('dust'));
  g._botTick(bot,.6);g._botTick(ally,.1);
  assert.equal((g.itemZones||[]).filter(z=>z.itemId==='dust').length,1);assert.ok(ally.inventory.includes('dust'));assert.equal(ally.targetId,enemy.id);
});

test('an allied Dust zone already covering the disappearance point prevents duplicate use',()=>{
  const {g,bot,enemy}=arena('hell'),ally=g._makeHero('axe',1,2,false,1);
  Object.assign(ally,{x:bot.x+20,y:bot.y,aiTimer:Infinity});equip(g,bot,['dust']);equip(g,ally,['dust']);g.entities.push(ally);g._index();fade(g,bot,enemy);
  enemy.x=bot.x+1800;g._index();assert.ok(Items.useItem(g,ally,0,ally).ok);g._botTick(bot,.6);
  assert.ok(bot.inventory.includes('dust'));assert.equal(g.itemZones.filter(z=>z.itemId==='dust').length,1);
});

test('a disappearance search uses the frozen visible position and releases its original lane after five seconds',()=>{
  const {g,bot,enemy}=arena('hell');fade(g,bot,enemy);const lastX=enemy.x,lastY=enemy.y;
  enemy.x=bot.x-1600;enemy.y=bot.y+1600;g._index();Object.defineProperty(enemy,'inventory',{get(){throw new Error('hidden inventory was inspected');}});
  g._botTick(bot,.6);assert.equal(bot.botState.mode,'search');assert.deepEqual(bot.botState.goal,{x:lastX,y:lastY});
  assert.ok(Math.hypot(bot.x-lastX,bot.y-lastY)<=900);
  g.time=6;bot.aiTimer=0;g._botTick(bot,.1);assert.notEqual(bot.botState.mode,'search');assert.equal(bot.lane,0);
});

test('friendly Glimmer and actual Smoke do not consume detection supplies',()=>{
  const {g,bot,enemy}=arena('hell');equip(g,bot,['dust']);equip(g,enemy,['smoke_of_deceit']);g._botTick(bot,0);
  assert.ok(Items.useItem(g,enemy,0,enemy).ok);assert.ok(Skills.hasStatusFlag(g,enemy,'smoked'));g.time=.1;g._botTick(bot,.1);
  assert.ok(bot.inventory.includes('dust'));assert.equal(g.canSee(bot,enemy),false);
  const ally=g._makeHero('ogre_magi',1,1,false,1);Object.assign(ally,{x:bot.x+100,y:bot.y,aiTimer:Infinity});equip(g,ally,['glimmer_cape']);g.entities=[bot,ally];g._index();
  assert.ok(Items.useItem(g,ally,0,ally).ok);g.time=1;g._botTick(bot,.9);assert.ok(bot.inventory.includes('dust'));
});

test('full core equipment is not sold or bought over for detection consumables',()=>{
  const {g,bot,enemy}=arena('hard');fade(g,bot,enemy);equip(g,bot,['phase_boots','blink','black_king_bar','heart','assault','blade_mail']);
  bot.backpack=['greater_crit','satanic','pipe'];Inventory.ensureInventory(bot);const before=[...bot.inventory,...bot.backpack].sort();bot.gold=500;
  bot.botShop={completed:Array.from({length:30},(_,i)=>i),targets:{},nextAt:0,purchases:0,spent:0,needsShop:false};
  Object.assign(bot,BASES[1]);g._index();g._botTick(bot,0);
  assert.deepEqual(Inventory.itemEntries(bot,['inventory','backpack']).map(e=>e.id).sort(),before);assert.equal(bot.gold,500);assert.ok(!Inventory.itemEntries(bot).some(e=>['dust','ward_sentry','gem'].includes(e.id)));
});

test('a full support reserves a detection slot by moving equipment instead of selling it before buying Dust',()=>{
  const {g,bot,enemy}=arena('hell');equip(g,bot,['phase_boots','force_staff','glimmer_cape','black_king_bar','heart','aether_lens']);
  const core=bot.inventory.slice().sort();fade(g,bot,enemy);bot.gold=80;delete bot.botShop;g._botTick(bot,.6);
  assert.equal(bot.gold,0);assert.ok(bot.stash.includes('dust'));
  assert.deepEqual(Inventory.itemEntries(bot,['inventory','backpack']).map(e=>e.id).sort(),core);
  assert.ok(bot.inventory.includes('phase_boots')&&bot.inventory.includes('black_king_bar'));
});

test('a full support prepares backpack Dust and respects six seconds before using it on a later observed fade',()=>{
  const {g,bot,enemy}=arena('hell');equip(g,bot,['phase_boots','force_staff','glimmer_cape','black_king_bar','heart','aether_lens']);bot.backpack=['dust'];bot.backpackMeta=[];Inventory.ensureInventory(bot);
  fade(g,bot,enemy);g._botTick(bot,.6);
  assert.ok(bot.inventory.includes('dust'),'prepare the real active slot from the observed gear cue');
  assert.equal(g.canSee(bot,enemy),false,'backpack activation delay must still prevent immediate use');
  let index=bot.inventory.indexOf('dust');assert.ok(Items.itemState(g,bot,index).ready>5);
  bot.botShop={completed:Array.from({length:30},(_,i)=>i),targets:{},nextAt:0,purchases:0,spent:0,needsShop:false};
  for(const at of [1,2,3,4,5,6.2]){g.time=at;g._botTick(bot,.1);}
  index=bot.inventory.indexOf('dust');assert.ok(index>=0);assert.equal(Items.itemState(g,bot,index).ready,0);
  g.time=20;Items.tickUnit(g,enemy,20);fade(g,bot,enemy);g._botTick(bot,.6);
  assert.equal(g.canSee(bot,enemy),true);assert.ok(!bot.inventory.includes('dust'));
});

test('a standard allied teammate buys delivers and uses Dust after a clearly observed enemy fade',()=>{
  const {g,bot,enemy}=arena('hell');bot.team=0;enemy.team=1;
  Object.assign(bot,{x:BASES[0].x+1400,y:BASES[0].y});Object.assign(enemy,{x:bot.x+350,y:bot.y});g._index();fade(g,bot,enemy);
  bot.gold=80;delete bot.botShop;g._botTick(bot,.6);assert.equal(bot.gold,0);assert.ok(bot.stash.includes('dust'));
  bot.botShop.nextAt=Infinity;
  for(let i=0;i<60&&!bot.inventory.includes('dust');i++){g.time+=.5;Courier.tickCouriers(g,.5);Inventory.tickInventory(g,bot);}
  assert.ok(bot.inventory.includes('dust'));g.time+=20;Items.tickUnit(g,enemy,20);fade(g,bot,enemy);g._botTick(bot,.6);
  assert.equal(g.canSee(bot,enemy),true);assert.ok(!bot.inventory.includes('dust'));
});

test('easy bots use already owned Dust for a clearly observed enemy Glimmer fade',()=>{
  const {g,bot,enemy}=arena('easy');equip(g,bot,['dust']);fade(g,bot,enemy);g._botTick(bot,.6);
  assert.equal(g.canSee(bot,enemy),true);assert.ok(!bot.inventory.includes('dust'));
});

test('counter equipment shopping does not inspect an unobserved hidden enemy inventory',()=>{
  const {g,bot,enemy}=arena('hell','drow_ranger');equip(g,enemy,['glimmer_cape']);assert.ok(Items.useItem(g,enemy,0,enemy).ok);g.time=.7;
  Object.defineProperty(enemy,'inventory',{get(){throw new Error('hidden inventory was inspected');}});
  bot.botShop={completed:[0,1,2,3,4,5,6,7,8,9,11,12,13,14],targets:{},nextAt:0,purchases:0,spent:0,needsShop:false};
  g._botTick(bot,.7);assert.equal(bot.botShop.goal,'butterfly');
});

test('visible Phantasm invulnerability is not mistaken for an invisibility disappearance',()=>{
  const {g,bot,enemy}=arena('hard','crystal_maiden','chaos_knight');equip(g,bot,['dust']);enemy.abilityLevels=[0,0,0,1];
  g._botTick(bot,0);assert.ok(g._cast(enemy,3,enemy).ok);g.time=.5;Skills.tickWorldAbilities(g);
  assert.equal(g.canSee(bot,enemy),true);assert.ok(Skills.isInvulnerable(g,enemy));g._botTick(bot,.5);
  assert.ok(bot.inventory.includes('dust'));assert.notEqual(bot.botState.mode,'search');
});

test('a retreating carrier can reveal a nearby observed invisible threat without starting a search',()=>{
  const {g,bot,enemy}=arena('hell');equip(g,bot,['dust']);bot.hp=bot.maxHp*.3;fade(g,bot,enemy);
  assert.equal(bot.retreating,true);g._botTick(bot,.6);
  assert.equal(g.canSee(bot,enemy),true);assert.ok(!bot.inventory.includes('dust'));assert.equal(bot.retreating,true);assert.notEqual(bot.botState.mode,'search');
});

test('observed Smoke does not cause delayed detection purchases after last-visible memory expires',()=>{
  const {g,bot,enemy}=arena('hard');equip(g,enemy,['smoke_of_deceit']);g._botTick(bot,0);assert.ok(Items.useItem(g,enemy,0,enemy).ok);
  g.time=.1;g._botTick(bot,.1);bot.gold=80;delete bot.botShop;
  for(const at of [13,14]){g.time=at;g._botTick(bot,.1);}
  assert.equal(bot.gold,80);assert.ok(!Inventory.itemEntries(bot).some(e=>e.id==='dust'));
});

test('a publicly dead observed Weaver releases detection and search commitments',()=>{
  const {g,bot,enemy}=arena('hard','crystal_maiden','weaver');equip(g,bot,['dust']);g._botTick(bot,0);
  g._kill(enemy,bot);g.time=.2;g._index();g._botTick(bot,.2);
  assert.equal(enemy.dead,true);assert.ok(bot.inventory.includes('dust'));assert.notEqual(bot.botState.mode,'search');assert.ok(!(g.itemZones||[]).some(z=>z.itemId==='dust'));
});

test('the assigned responder briefly searches an observed fade before attacking a nearby creep then resumes after timeout',()=>{
  const {g,bot,enemy}=arena('hard');fade(g,bot,enemy,'invis_sword');
  const creep=g._unit('creep',0,bot.x+120,bot.y,{maxHp:1000,hp:1000,damage:0});g.entities.push(creep);bot.attackCooldown=0;g._index();
  g._botTick(bot,.6);assert.equal(bot.botState.mode,'search','a nearby creep must not permanently block the primary response');assert.equal(bot.targetId,null);
  g.time=6;bot.aiTimer=0;g._botTick(bot,.1);assert.notEqual(bot.botState.mode,'search');assert.equal(bot.targetId,creep.id);assert.equal(bot.lane,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { BOT_DIFFICULTY } from '../src/bot-ai.js';
import * as Skills from '../src/hero-runtime.js';
import * as Inventory from '../src/inventory.js';

function battlefield(difficulty='nightmare',botIds=['axe','crystal_maiden','windranger','kunkka','ogre_magi']){
  const g=new Game({difficulty,seed:17});
  const bots=botIds.map((hero,i)=>g._makeHero(hero,1,i%3,false,i));
  const humans=['juggernaut','axe','crystal_maiden','windranger','kunkka'].map((hero,i)=>g._makeHero(hero,0,i%3,true,i));
  for(const [i,h] of [...bots,...humans].entries())Object.assign(h,{
    x:10400+i*40,y:10400,isHuman:h.team===0,aiTimer:h.team===1?0:Infinity,
    abilityLevels:[0,0,0,0],skillPoints:0,talentPoints:0,gold:0,mana:0,
    hpRegen:0,manaRegen:0,attackCooldown:999,botShop:{nextAt:Infinity,needsShop:false}
  });
  g.entities=[...bots,...humans];g.nextWave=Infinity;g.nextNeutralSpawn=Infinity;g.roshanRespawnAt=Infinity;
  for(const c of g.camps)c.nextSpawn=Infinity;
  g._index();return {g,bots,humans};
}

test('nightmare reacquires an appearing human sooner than hard',()=>{
  function acquisition(difficulty){
    const {g,bots,humans}=battlefield(difficulty,['axe']),bot=bots[0],human=humans[0];
    g.entities=[bot];g._index();g._botTick(bot,0);
    human.x=bot.x+200;g.entities.push(human);g._index();
    for(let i=0;i<12;i++){g.time+=.01;g._botTick(bot,.01);if(bot.targetId===human.id)return g.time;}
    return Infinity;
  }
  const hard=acquisition('hard'),nightmare=acquisition('nightmare');
  assert.ok(nightmare<=.04,`nightmare acquisition took ${nightmare}s`);
  assert.ok(hard>=.08&&nightmare<hard*.6,`hard=${hard}, nightmare=${nightmare}`);
});

test('nearby Dire bots converge on the same vulnerable human instead of separate closest heroes',()=>{
  const {g,bots,humans}=battlefield();
  for(const [i,h] of bots.entries())Object.assign(h,{x:10400+i*180,y:10400});
  for(const [i,h] of humans.entries())Object.assign(h,{x:bots[i].x,y:10600});
  const vulnerable=humans[4];Object.assign(vulnerable,{x:11500,y:10550,hp:vulnerable.maxHp*.32});
  bots[2].focusTargetId=humans[2].id;
  g._index();for(const bot of bots)g._botTick(bot,0);
  assert.deepEqual(bots.map(h=>h.targetId),Array(5).fill(vulnerable.id));
  assert.deepEqual(bots.map(h=>h.teamFocusTargetId),Array(5).fill(vulnerable.id));
  assert.equal(bots[2].focusTargetId,humans[2].id,'team coordination must preserve real Focus Fire state');
});

test('nightmare reserves a pending stun and chains Frostbite near its end',()=>{
  const {g,bots,humans}=battlefield('nightmare',['ogre_magi','crystal_maiden']);
  const [ogre,maiden]=bots,human=humans[0];g.entities=[ogre,maiden,human];
  Object.assign(ogre,{x:10400,y:10400,abilityLevels:[1,0,0,0],mana:1000,speed:0});
  Object.assign(maiden,{x:10440,y:10400,abilityLevels:[0,1,0,0],mana:1000,speed:0});
  Object.assign(human,{x:10600,y:10400,speed:0});g._index();
  g._botTick(ogre,0);g._botTick(maiden,0);
  assert.equal(ogre.castPhase?.index,0);
  assert.ok(!maiden.castPhase,'an ally must keep Frostbite while Fireblast is winding up');
  g.step(.5);assert.equal(g.isStunned(human),true);assert.equal(g.isRooted(human),false);
  g.step(.7);assert.equal(maiden.cooldowns[1],0,'long remaining stun must preserve the second control');
  g.step(.2);assert.equal(maiden.castPhase?.index,1,'start casting as the previous control approaches expiry');
  g.step(.35);assert.equal(g.isRooted(human),true);assert.ok(maiden.cooldowns[1]>0);
  assert.ok(human.statuses.root.startedAt>=1.6,'Frostbite should land near Fireblast expiry');
});

test('nightmare avoids spending Axe Call over a long taunt and resumes when it ends',()=>{
  const {g,bots,humans}=battlefield('nightmare',['axe']),bot=bots[0],human=humans[0];
  g.entities=[bot,human];Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000});human.x=bot.x+150;
  Skills.addStatus(g,human,'taunt',{duration:3,sourceId:'another-axe'});human.buffs.tauntUntil=3;g._index();
  g._botTick(bot,0);assert.ok(!bot.castPhase);assert.equal(bot.cooldowns[0],0);
  g.time=2.8;bot.aiTimer=0;g._botTick(bot,0);assert.equal(bot.castPhase?.index,0);
});

test('nightmare preserves an owned silence item while an ally silence is already active',()=>{
  const {g,bots,humans}=battlefield('nightmare',['crystal_maiden','ogre_magi']),human=humans[0];
  g.entities=[...bots,human];human.x=10600;
  for(const bot of bots){bot.inventory=['orchid'];Inventory.ensureInventory(bot);bot.mana=1000;}
  g._index();g._botTick(bots[0],0);g._botTick(bots[1],0);
  assert.ok(Skills.hasStatusFlag(g,human,'silenced'));
  assert.ok(bots[0].inventoryMeta[0].cooldownRemaining>0);
  assert.equal(bots[1].inventoryMeta[0].cooldownRemaining,0,'keep the second Orchid for the next silence');
});

test('nightmare supports a threatened teammate outside hard support range',()=>{
  const {g,bots,humans}=battlefield('nightmare',['axe','crystal_maiden']),[helper,ally]=bots,human=humans[0];
  Object.assign(ally,{x:13000,y:10400,targetId:human.id});Object.assign(human,{x:13200,y:10400,targetId:ally.id});
  g.entities=[helper,ally,human];g._index();g._botTick(helper,0);
  assert.equal(helper.botState.mode,'assist');
  assert.ok(Math.hypot(helper.botState.goal.x-human.x,helper.botState.goal.y-human.y)<100);
});

test('nightmare nearby bots group to defend the most pressured allied structure',()=>{
  const {g,bots,humans}=battlefield(),tower=g._unit('tower',1,13000,10400,{lane:2,range:700});
  const quietTower=g._unit('tower',1,10400,13000,{lane:0,range:700});
  const creep=g._unit('creep',0,10400,13100,{lane:0});
  const human=humans[0];Object.assign(human,{x:13200,y:10400,targetId:tower.id});
  g.entities=[...bots,human,quietTower,creep,tower];g._index();for(const bot of bots)g._botTick(bot,0);
  assert.deepEqual(bots.map(h=>h.botState.mode),Array(5).fill('defend'));
  assert.deepEqual(bots.map(h=>h.lane),Array(5).fill(2));
  assert.ok(bots.every(h=>Math.hypot(h.botState.goal.x-tower.x,h.botState.goal.y-tower.y)<300));
});

test('nightmare groups on an unprotected push objective with an actual allied wave',()=>{
  const {g,bots}=battlefield(),tower=g._unit('tower',0,13300,10400,{lane:2,tier:1,range:700});
  const creep=g._unit('creep',1,13100,10400,{lane:2});
  g.time=180;g.entities=[...bots,tower,creep];g._index();for(const bot of bots)g._botTick(bot,0);
  assert.deepEqual(bots.map(h=>h.botState.mode),Array(5).fill('push'));
  assert.deepEqual(bots.map(h=>h.lane),Array(5).fill(2));
  assert.ok(bots.every(h=>h.botState.goal&&Math.hypot(h.botState.goal.x-tower.x,h.botState.goal.y-tower.y)<800));
});

test('nightmare caches peaceful team decisions instead of scanning distant units every bot tick',()=>{
  const {g,bots}=battlefield('nightmare',['axe']),ambient=g._unit('neutral',2,19000,19000);
  let inspections=0;Object.defineProperty(ambient,'kind',{get(){inspections++;return 'neutral';}});
  g.entities=[...bots,ambient];g._index();
  for(let i=0;i<10;i++){g.time=i*.01;g._botTick(bots[0],0);}
  assert.ok(inspections<=4,`distant unit was scanned ${inspections} times within one director interval`);
});

test('nightmare leaves the original profiles and natural hero economy unchanged',()=>{
  assert.deepEqual(BOT_DIFFICULTY.easy,{reaction:.35,jitter:.06,awareness:1100,lead:.45,advantage:1.85});
  assert.deepEqual(BOT_DIFFICULTY.normal,{reaction:.18,jitter:.035,awareness:1250,lead:.75,advantage:1.65});
  assert.deepEqual(BOT_DIFFICULTY.hard,{reaction:.08,jitter:.015,awareness:1450,lead:1,advantage:1.5});
  const hard=new Game({difficulty:'hard'}),nightmare=new Game({difficulty:'nightmare'});
  const stats=g=>g.entities.filter(e=>e.kind==='hero').map(h=>[h.heroId,h.team,h.maxHp,h.maxMana,h.damage,h.armor,h.gold]);
  assert.deepEqual(stats(nightmare),stats(hard));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as Skills from '../src/hero-runtime.js';
import * as Items from '../src/item-runtime.js';
import {tacticalWorld,tacticalPlan} from '../src/bot-tactics.js';
import {tacticalArena,supplyTp,tower,advanceBots} from './bot-tactics-scenarios.mjs';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(const team of [0,1])for(const difficulty of ['easy','normal','hard','nightmare']){
  test(`team ${team} / ${difficulty} uses a real TP to defend a distant tower`,()=>{
    const {g,bot,enemy}=tacticalArena(team,difficulty);
    const own=tower(g,team,15000);Object.assign(enemy,{x:15400,targetId:own.id});g._index();
    const mana=bot.mana,charges=bot.tpMeta[0].charges;g._botTick(bot,.05);
    assert.equal(bot.itemChannel?.kind,'teleport');assert.equal(bot.itemChannel.targetId,own.id);
    assert.ok(bot.mana<mana);assert.equal(bot.tp.length,0);assert.ok(charges>0);
    assert.ok(bot.itemCooldowns.teleport>0);assert.equal(bot.botState.mode,'defend');
    g.time=3.1;Items.tickUnit(g,bot,.05);g._index();
    assert.ok(distance(bot,own)<300,'the channel must actually deliver the bot');
    g._botTick(bot,.05);assert.equal(bot.targetId,enemy.id,'arrival resumes combat rather than returning to the old lane');
  });
}

for(const team of [0,1])test(`team ${team} teleports to a forming fight and joins its ally`,()=>{
  const {g,bots,bot,enemy}=tacticalArena(team,'normal',2),ally=bots[1];
  Object.assign(ally,{x:15300,targetId:enemy.id});Object.assign(enemy,{x:15700,targetId:ally.id});
  const own=tower(g,team,14700);g._index();g._botTick(bot,.05);
  assert.equal(bot.botState.mode,'assist');assert.equal(bot.itemChannel?.targetId,own.id);
  g.time=3.1;Items.tickUnit(g,bot,.05);g._index();g._botTick(bot,.05);
  assert.equal(bot.targetId,enemy.id);
});

test('a support request recruits missing defenders and preserves other lanes',()=>{
  const {g,bots,enemy}=tacticalArena(0,'hard',5),own=tower(g,0,15000);
  Object.assign(enemy,{x:15500,targetId:own.id});g._index();
  const plans=tacticalWorld(g).teams[0].plans;
  assert.equal([...plans.values()].filter(p=>p.objectiveId===own.id).length,2);
  assert.equal(bots.filter(h=>!plans.has(h.id)).length,3);
});

test('base defense overrides an unrelated fight and recruits extra support',()=>{
  const {g,bots,enemy}=tacticalArena(0,'hard',5);
  const ancient=g._unit('ancient',0,15000,10400,{maxHp:4500});g.entities.push(ancient);
  Object.assign(enemy,{x:15300,targetId:ancient.id});
  const intruder=g._makeHero('juggernaut',1,1,true,1);Object.assign(intruder,{x:16000,y:10400,targetId:ancient.id,aiTimer:Infinity});
  g._index();const plans=tacticalWorld(g).teams[0].plans;
  assert.ok(plans.size>=3);assert.ok([...plans.values()].every(p=>p.objectiveId===ancient.id));
  assert.ok(bots.some(h=>plans.has(h.id)));
});

test('team tasks remain assigned when helpers swap their nearest distance slightly',()=>{
  const {g,bots,enemy}=tacticalArena(0,'normal',4),own=tower(g,0,15000);enemy.x=15400;enemy.targetId=own.id;g._index();
  const first=[...tacticalWorld(g).teams[0].plans.keys()];
  bots[0].x+=20;bots[2].x-=20;g.time=.3;g._index();
  assert.deepEqual([...tacticalWorld(g).teams[0].plans.keys()],first);
});

test('helpers already teleporting remain reserved rather than recruiting replacement heroes',()=>{
  const {g,bots,enemy}=tacticalArena(0,'normal',5),own=tower(g,0,15000);enemy.x=15400;enemy.targetId=own.id;g._index();
  const ids=[...tacticalWorld(g).teams[0].plans.keys()];
  for(const h of bots)if(ids.includes(h.id))g._botTick(h,.05);
  assert.ok(bots.filter(h=>ids.includes(h.id)).every(h=>h.itemChannel?.kind==='teleport'));
  g.time=.4;g._index();assert.deepEqual([...tacticalWorld(g).teams[0].plans.keys()],ids);
});

test('support does not teleport while enemies can interrupt the caster',()=>{
  const {g,bot,enemy}=tacticalArena();const own=tower(g,0,15000);enemy.x=15400;enemy.targetId=own.id;
  const nearby=g._makeHero('ogre_magi',1,1,true,1);Object.assign(nearby,{x:bot.x+700,y:bot.y,aiTimer:Infinity});
  g._index();g._botTick(bot,.05);assert.equal(bot.itemChannel,undefined);assert.ok(bot.tp.includes('tpscroll'));
});

test('cooldown, missing mana and roots do not grant a free support teleport',()=>{
  for(const block of [(g,h)=>h.itemCooldowns={teleport:20},(g,h)=>h.mana=0,(g,h)=>Skills.applyRoot(g,h,4,null),(g,h)=>{h.tp=[];h.tpMeta=[];}]){
    const {g,bot,enemy}=tacticalArena(),own=tower(g,0,15000);enemy.x=15400;enemy.targetId=own.id;block(g,bot);g._index();
    g._botTick(bot,.05);assert.equal(bot.itemChannel,undefined);assert.equal(bot.botState.mode,'defend');
  }
});

test('a nearby objective is approached on foot instead of wasting a scroll',()=>{
  const {g,bot,enemy}=tacticalArena(),own=tower(g,0,11900);enemy.x=12300;enemy.targetId=own.id;g._index();
  const before=distance(bot,own);g._botTick(bot,.1);
  assert.equal(bot.itemChannel,undefined);assert.ok(distance(bot,own)<before);assert.ok(bot.tp.includes('tpscroll'));
});

test('teleport skips a dying tower and an overwhelmingly dangerous landing',()=>{
  for(const dying of [false,true]){
    const {g,bot,enemy}=tacticalArena(),own=tower(g,0,15000);enemy.x=15150;enemy.targetId=own.id;
    if(dying)own.hp=50;
    else {enemy.level=15;g._refreshHero(enemy);enemy.hp=enemy.maxHp;}
    g._index();g._botTick(bot,.05);assert.equal(bot.itemChannel,undefined);assert.ok(bot.tp.includes('tpscroll'));
  }
});

test('unseen and invisible enemies do not create omniscient fight requests',()=>{
  const {g,bot,enemy}=tacticalArena();enemy.x=19000;enemy.y=19000;enemy.targetId=bot.id;g._index();
  assert.equal(tacticalPlan(g,bot),undefined);
  const own=tower(g,0,15000);enemy.x=15400;enemy.y=10400;enemy.targetId=own.id;
  Skills.addStatus(g,enemy,'testInvisible',{duration:10,invisible:true});g.time=.3;g._index();
  assert.equal(tacticalPlan(g,bot),undefined);
});

test('a destroyed objective releases its support assignment',()=>{
  const {g,bot,enemy}=tacticalArena(),own=tower(g,0,15000);enemy.x=15400;enemy.targetId=own.id;g._index();
  assert.equal(tacticalPlan(g,bot).objectiveId,own.id);own.dead=true;own.hp=0;g.time=.3;
  assert.equal(tacticalPlan(g,bot),undefined);
});

for(const difficulty of ['easy','normal','hard','nightmare']){
  test(`${difficulty} holds a stable safe position against a higher-level hero`,()=>{
    const {g,bot,enemy}=tacticalArena(1,difficulty);enemy.x=bot.x+450;enemy.level=12;g._refreshHero(enemy);enemy.hp=enemy.maxHp;
    bot.tp=[];bot.tpMeta=[];g._index();const before=distance(bot,enemy);
    const samples=advanceBots(g,[bot],12).map(row=>row[0]);
    assert.ok(distance(bot,enemy)>before+150);assert.equal(bot.botState.mode,'disengage');
    assert.ok(samples.every(s=>s.target!==enemy.id));
    const tail=samples.slice(-60);assert.ok(Math.max(...tail.map(s=>distance(s,tail[0])))<35,'no repeated approach/retreat cycle');
    enemy.x+=3000;g.time+=.3;g._index();advanceBots(g,[bot],2);
    assert.equal(bot.botState.safety,null,'the bot must resume after the threat actually leaves');
  });
}

test('waiting outside an unsupported tower does not repeatedly enter its range',()=>{
  const {g,bot,enemy}=tacticalArena();enemy.dead=true;enemy.hp=0;bot.tp=[];bot.tpMeta=[];
  const enemyTower=tower(g,1,bot.x+950);g._index();
  const samples=advanceBots(g,[bot],12).map(row=>row[0]);
  assert.equal(bot.botState.mode,'wait-wave');assert.ok(samples.every(p=>distance(p,enemyTower)>enemyTower.range+100));
  const tail=samples.slice(-60);assert.ok(Math.max(...tail.map(s=>distance(s,tail[0])))<35);
  const creep=g._unit('creep',0,enemyTower.x-300,enemyTower.y,{maxHp:1000,range:60});g.entities.push(creep);g._index();
  advanceBots(g,[bot],1);assert.equal(bot.botState.safety,null);assert.equal(bot.targetId,enemyTower.id);
});

test('a ranged higher-level threat remains remembered beyond the easy awareness boundary',()=>{
  const {g,bot,enemy}=tacticalArena(1,'easy');enemy.x=bot.x+500;enemy.range=650;enemy.level=15;g._refreshHero(enemy);enemy.range=650;
  bot.tp=[];bot.tpMeta=[];g._index();const samples=advanceBots(g,[bot],15).map(row=>row[0]),tail=samples.slice(-80);
  assert.equal(bot.botState.mode,'disengage');assert.ok(distance(bot,enemy)>1100);
  assert.ok(Math.max(...tail.map(p=>distance(p,tail[0])))<35);
});

test('briefly arriving and dying creeps do not repeatedly release tower staging',()=>{
  const {g,bot,enemy}=tacticalArena();enemy.dead=true;enemy.hp=0;const t=tower(g,1,bot.x+950);advanceBots(g,[bot],4);
  const goal={...bot.botState.safety.goal},c=g._unit('creep',0,t.x-200,t.y,{maxHp:100});g.entities.push(c);
  for(let i=0;i<10;i++){c.hp=100;c.dead=false;advanceBots(g,[bot],.2);c.dead=true;c.hp=0;advanceBots(g,[bot],.2);}
  assert.equal(bot.botState.mode,'wait-wave');assert.deepEqual(bot.botState.safety.goal,goal);
});

test('waiting for a wave still permits safe last hits without chasing under the tower',()=>{
  const {g,bot,enemy}=tacticalArena();enemy.dead=true;enemy.hp=0;bot.attackCooldown=0;
  tower(g,1,bot.x+1050);const creep=g._unit('creep',1,bot.x+50,bot.y,{maxHp:10,armor:0});g.entities.push(creep);g._index();
  g._botTick(bot,.05);assert.equal(creep.dead,true);assert.equal(bot.lastHits,1);assert.equal(bot.botState.mode,'wait-wave');
});

test('sufficient allies let a bot engage a higher-level enemy instead of waiting forever',()=>{
  const {g,bots,bot,enemy}=tacticalArena(0,'normal',5);enemy.x=bot.x+500;enemy.level=5;g._refreshHero(enemy);
  for(const ally of bots){ally.damage=150;ally.attackInterval=.8;}g._index();g._botTick(bot,.05);
  assert.equal(bot.targetId,enemy.id);assert.ok(!bot.botState.safety);
});

test('safe-position commitments survive save and restore',()=>{
  const {g,bot,enemy}=tacticalArena();enemy.isHuman=false;enemy.isPlayer=true;g.heroChoice='axe';
  const ownPlayer=g._makeHero('axe',0,1,true,1);ownPlayer.x=3000;ownPlayer.y=17000;enemy.isPlayer=false;enemy.aiTimer=Infinity;
  enemy.x=bot.x+450;enemy.level=12;g._refreshHero(enemy);g._index();advanceBots(g,[bot],4);
  const goal={...bot.botState.safety.goal};
  const resumed=restoreMatch(parseMatch(serializeMatch(g)));resumed.paused=false;
  const restored=resumed.entities.find(e=>e.id===bot.id);resumed._botTick(restored,.05);
  assert.deepEqual(restored.botState.safety.goal,goal);assert.equal(restored.botState.mode,'disengage');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {campSpawnBounds,insideCampSpawnBounds} from '../src/world-runtime.js';
import {tacticalPlan} from '../src/bot-tactics.js';
import {tacticalArena} from './bot-tactics-scenarios.mjs';

function campArena(time){
 const {g,bots:[support,carry],enemy}=tacticalArena(1,'nightmare',2);
 // This scenario uses the actual map sight, navigation, and camp spawn box.
 delete g.canSee;
 const camp=g.camps.find(c=>c.id==='camp-7'),bounds=campSpawnBounds(camp);
 g.camps=[camp];g.time=time;g.nextNeutralSpawn=120;camp.nextSpawn=120;
 enemy.dead=true;enemy.hp=0;enemy.respawnTimer=60;
 Object.assign(support,{x:camp.x-160,y:camp.y,lane:0,draftRole:'support',attackCooldown:0});
 Object.assign(carry,{x:camp.x+850,y:camp.y,lane:1,draftRole:'carry'});
 const neutral=g._makeNeutral('ghost',{x:camp.x,y:camp.y},camp);g._index();
 return {g,support,carry,enemy,camp,bounds,neutral};
}

test('one support stacks a real camp and a ward physically inside still blocks the minute spawn',()=>{
 for(const blocked of [false,true]){
  const {g,support,carry,camp,bounds,neutral}=campArena(113.2);
  if(blocked)g.entities.push(g._unit('ward',1,camp.x,camp.y,{wardType:'observer',maxHp:2,ownerId:carry.id,expiresAt:200}));
  g._index();
  assert.equal(tacticalPlan(g,support)?.mode,'stack-camp');
  assert.equal(tacticalPlan(g,carry),undefined);
  g.step(6.5);
  assert.equal(insideCampSpawnBounds(neutral,bounds),false);
  g.step(.5);
  assert.equal(camp.blocked,blocked);
  assert.equal(camp.spawnCount,blocked?0:1);
  g.step(.5);
  assert.equal(tacticalPlan(g,support),undefined);
  assert.equal(support.lane,0);
 }
});

test('a support pulls an approaching lane creep into the real camp and resumes the original lane',()=>{
 const {g,support,carry,camp,bounds,neutral}=campArena(92);
 g.entities=g.entities.filter(e=>e!==carry&&e!==neutral);
 Object.assign(support,{x:camp.x-130,y:camp.y-100});
 const beast=g._makeNeutral('fel_beast',camp,camp);
 const x=6970,y=4704+(x-5216)*(4256-4704)/(8592-5216);
 const creep=g._unit('creep',1,x,y,{lane:0,pathIndex:3,maxHp:560,damage:25,speed:325,range:120});
 g.entities.push(creep);g._index();
 assert.equal(tacticalPlan(g,support)?.mode,'pull-camp');
 let pulled=false;
 for(let i=0;i<55;i++){
  g.step(.2);
  pulled||=creep.targetId===beast.id&&insideCampSpawnBounds(creep,bounds);
 }
 assert.equal(pulled,true,'the lane creep chases and enters the real spawn box');
 assert.equal(tacticalPlan(g,support),undefined);
 assert.equal(support.botState.mode,'push');
 assert.equal(support.botState.lane,0);
});

test('a support abandons a stack when the last camp neutral dies before the spawn',()=>{
 const {g,support,carry,camp,neutral}=campArena(113.2);
 assert.equal(tacticalPlan(g,support)?.mode,'stack-camp');
 g.step(.4);
 g._kill(neutral,carry);
 g.step(.3);
 assert.equal(tacticalPlan(g,support),undefined);
 assert.equal(support.botState.mode,'push');
 assert.equal(support.lane,0);
 assert.ok(g.time<camp.nextSpawn);
});

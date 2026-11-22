import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import * as Inventory from '../src/inventory.js';
import * as Skills from '../src/hero-runtime.js';
import { tickBotShopping } from '../src/bot-items.js';
import { BASES } from '../src/map-data.js';

function botArena(ranks=[1,1,1,1]) {
  const a=arena('weaver',ranks);
  a.p.isPlayer=false;a.e.isPlayer=true;a.p.gold=0;a.p.aiTimer=0;
  return a;
}
function previous(g,target,hp) {
  target.weaverTimeLapseHistory=[{time:g.time-5,x:target.x-60,y:target.y,hp,mana:target.mana,dead:false}];
  target.weaverNextHistoryAt=g.time+.1;
}

test('Weaver AI starts self Time Lapse when its real history restores substantial health', () => {
  const {g,p,e}=botArena([0,0,1,1]);
  p.hp=p.maxHp*.25;previous(g,p,p.maxHp*.9);e.x=p.x+350;g._index();
  g._botTick(p,.05);
  assert.equal(p.castPhase?.index,3);
});

test('Weaver AI saves an injured ally with Scepter Time Lapse and avoids a harmful rewind', () => {
  const {g,p,e}=botArena([0,0,1,1]);p.hasScepter=true;
  const ally=g._makeHero('axe',0,0,false,0);
  Object.assign(ally,{x:p.x+160,y:p.y,isPlayer:true,hp:200,maxHp:1000,aiTimer:Infinity});
  previous(g,ally,900);g.entities=[p,e,ally];g._index();
  g._botTick(p,.05);
  assert.equal(p.castPhase?.extraId,'weaver_time_lapse_ally');
  assert.equal(p.castPhase?.targetId,ally.id);
  Skills.interruptCast(g,p);p.aiTimer=0;previous(g,ally,100);
  g._botTick(p,.05);
  assert.equal(p.castPhase,null,'AI must not rewind the ally to lower health');
});

test('Weaver AI sends The Swarm at an enemy hero then keeps its reaction timer bounded', () => {
  const {g,p,e}=botArena([1,0,1,0]);e.x=p.x+700;g.entities=[p,e];g._index();
  g._botTick(p,.05);
  assert.equal(p.castPhase?.index,0);
  assert.ok(p.aiTimer>0&&p.aiTimer<.3,'a cast attempt must reset normal reaction timing');
});

test('Weaver AI uses Shukuchi to escape and continues moving while it is active', () => {
  const {g,p,e}=botArena([0,1,1,0]);p.hp=p.maxHp*.25;e.x=p.x+200;g._index();
  g._botTick(p,.05);
  assert.ok(p.weaverShukuchi?.until>g.time,'escape starts a real Shukuchi cast');
  const start={x:p.x,y:p.y};p.aiTimer=0;g._botTick(p,.1);
  assert.ok(Math.hypot(p.x-start.x,p.y-start.y)>0,'active Shukuchi must allow retreat movement');
});

test('Weaver shopping consumes delivered components into its ranged carry equipment route', () => {
  const {g,p}=botArena([0,0,0,0]);Object.assign(p,BASES[0]);p.gold=7000;
  Inventory.ensureInventory(p);
  for(let i=0;i<18;i++){g.time+=.5;tickBotShopping(g,p);}
  const items=Inventory.itemEntries(p,['inventory','backpack','stash']).map(e=>e.id);
  assert.ok(items.includes('power_treads'));
  assert.ok(items.includes('maelstrom'));
  assert.ok(p.botShop.completed.length>=5,'Weaver must progress beyond starter items');
});

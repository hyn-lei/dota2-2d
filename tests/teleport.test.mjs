import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { BASES } from '../src/map-data.js';
import * as Skills from '../src/hero-runtime.js';
import * as ItemRuntime from '../src/item-runtime.js';
import {Navigator} from '../src/navigation.js';
const setup=()=>{const g=new Game({hero:'crystal_maiden'}),p=g.player;g.entities=g.entities.filter(e=>e.isPlayer||e.kind==='fountain');g.nextWave=g.nextNeutralSpawn=Infinity;p.x=9000;p.y=9000;return {g,p};};
test('movement and roots cancel teleport without refunding the consumed scroll or cooldown',()=>{
 for(const cancel of [(g,p)=>g.moveTo(p.x+300,p.y),(g,p)=>Skills.applyRoot(g,p,2,null)]){
  const {g,p}=setup();assert.equal(g.recall().ok,true);cancel(g,p);g.step(.1);
  assert.equal(p.itemChannel,null);assert.equal(p.recallTimer,0);assert.ok(p.itemCooldowns.teleport>79);assert.equal(p.tp.length,0);
 }
});
test('upgraded travel boots retain scroll charges and reduce channel and cooldown',()=>{
 const {g,p}=setup();p.inventory=['travel_boots_2'];g._refreshHero(p);
 assert.equal(g.recall().ok,true);assert.equal(p.tpMeta[0].charges,1);assert.equal(p.itemCooldowns.teleport,40);
 g.step(2.1);assert.ok(Math.hypot(p.x-BASES[0].x,p.y-BASES[0].y)<250);assert.equal(p.itemChannel,null);
});
test('travel boots target eligible allied units and reject dropped objects and couriers',()=>{
 const {g,p}=setup();p.inventory=['travel_boots'];g._refreshHero(p);
 const courier=g.courier;courier.x=p.x;courier.y=p.y;
 assert.equal(g.useItem(0,courier,'tp').ok,false);
 const creep=g._unit('creep',0,11000,11000);g.entities.push(creep);
 assert.equal(g.useItem(0,creep,'tp').ok,true);creep.dead=true;g.step(.1);assert.equal(p.itemChannel,null);
});
test('human and AI fountain teleports land outside the visible attacking circle even on completely open terrain',()=>{
 for(const team of [0,1])for(const human of [true,false]){
  const g=new Game(),h=g.entities.find(e=>e.kind==='hero'&&e.team===team),f=g.entities.find(e=>e.kind==='fountain'&&e.team===team);
  g.entities=[h,f];g.navigation=new Navigator({cols:700,rows:700,cellSize:32,blocked:'0'.repeat(490000)},[]);
  Object.assign(h,{x:9000,y:9000,isPlayer:human,isHuman:human,controller:human?'human':'ai'});g._index();
  const mana=h.mana;assert.equal(ItemRuntime.useItem(g,h,0,f,'tp').ok,true);
  g.time=h.itemChannel.until;ItemRuntime.tickUnit(g,h,.05);
  const d=Math.hypot(h.x-f.x,h.y-f.y);
  assert.ok(d>=200+h.collisionRadius&&d<300,`fountain landing ${d} must be just outside the circle`);
  assert.equal(g.navigation.isWalkable(h),true);assert.equal(g.collisions.overlaps(h),false);
  assert.equal(h.itemChannel,null);assert.ok(h.mana<mana);assert.equal(h.tp.length,0);
 }
});
test('simultaneous fountain returns reserve separate positions outside the circle',()=>{
 const g=new Game(),f=g.entities.find(e=>e.kind==='fountain'&&e.team===0),heroes=g.entities.filter(e=>e.kind==='hero'&&e.team===0);
 for(const [i,h] of heroes.entries()){
  Object.assign(h,{x:9000+i*100,y:9000});g.collisions.update(h);assert.equal(ItemRuntime.useItem(g,h,0,f,'tp').ok,true);
 }
 g.time=Math.max(...heroes.map(h=>h.itemChannel.until));
 for(const h of heroes){ItemRuntime.tickUnit(g,h,.05);assert.ok(Math.hypot(h.x-f.x,h.y-f.y)>=200+h.collisionRadius);assert.equal(g.collisions.overlaps(h),false);}
 for(const h of heroes)for(const other of heroes)if(other!==h)assert.ok(Math.hypot(h.x-other.x,h.y-other.y)>=h.collisionRadius+other.collisionRadius-.001);
});

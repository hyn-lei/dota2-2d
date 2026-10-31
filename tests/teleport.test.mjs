import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { BASES } from '../src/map-data.js';
import * as Skills from '../src/hero-runtime.js';
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

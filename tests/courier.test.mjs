import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { BASES } from '../src/map-data.js';
import { SECRET_SHOPS } from '../src/inventory.js';

function setup(){const g=new Game({hero:'crystal_maiden'});g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;g.entities=g.entities.filter(e=>e.isPlayer||e.ownerId===g.player.id);const p=g.player;p.gold=10000;Object.assign(p,{x:BASES[0].x+600,y:BASES[0].y-1600});return {g,p};}
test('courier physically collects stash and delivers instances without granting cargo stats',()=>{
 const {g,p}=setup();g.buy('blade');const uid=p.stashMeta[0].uid,damage=p.damage;
 assert.equal(g.courierCommand('deliver').ok,true);g.step(.1);assert.equal(p.inventory.length,0);
 assert.equal(p.damage,damage);assert.ok(g.courier.cargo.includes('blade'));
 g.step(30);assert.ok(p.inventory.includes('blade'));assert.equal(p.inventoryMeta[p.inventory.indexOf('blade')].uid,uid);assert.equal(g.courier.cargo.filter(Boolean).length,0);
});
test('dead courier retains cargo and respawns at the fountain; pause freezes travel',()=>{
 const {g,p}=setup();g.buy('blade');g.courierCommand('deliver');g.step(.1);const c=g.courier,uid=c.cargoMeta[0].uid;
 assert.equal(g.damage(c,999,{kind:'hero',team:1},'magical'),0);
 g.damage(c,999,{kind:'hero',team:1,range:150},'physical',{attack:true});assert.equal(c.dead,true);assert.equal(c.cargoMeta[0].uid,uid);
 g.setPaused(true);const now=g.time;g.step(500);assert.equal(g.time,now);assert.equal(c.dead,true);
 g.setPaused(false);g.step(c.respawnAt-g.time+.1);assert.equal(c.dead,false);assert.ok(Math.hypot(c.x-BASES[0].x,c.y-BASES[0].y)<100);assert.equal(c.cargoMeta[0].uid,uid);
});
test('full hero storage leaves cargo on courier without duplication',()=>{
 const {g,p}=setup();p.inventory=Array(6).fill('blade');p.backpack=Array(3).fill('blade');p.inventoryMeta=[];p.backpackMeta=[];
 g.buy('chainmail');g.courierCommand('deliver');g.step(30);assert.deepEqual(g.courier.cargo.filter(Boolean),['chainmail']);assert.equal(p.stash.filter(Boolean).length,0);
});

test('courier secret-shop purchase spends the owner gold once and carries the owned item',()=>{
 const {g,p}=setup();assert.equal(g.buyWithCourier('relic').ok,false);
 Object.assign(g.courier,SECRET_SHOPS[0]);const before=p.gold;assert.equal(g.buyWithCourier('relic').ok,true);
 assert.equal(p.gold,before-3400);assert.equal(g.courier.cargoMeta[0].ownerId,p.id);assert.equal(p.inventory.length,0);
 assert.equal(g.buyWithCourier('boots').ok,false);
});
test('courier flight, speed burst and shield unlock with level and protect against attacks',()=>{
 const {g,p}=setup(),c=g.courier;assert.equal(g.courierCommand('burst').ok,false);p.level=20;g.step(.1);
 assert.equal(c.flying,true);const speed=c.speed;assert.equal(g.courierCommand('burst').ok,true);g.step(.1);assert.equal(c.speed,speed*1.5);
 assert.equal(g.courierCommand('shield').ok,true);assert.equal(g.damage(c,100,{kind:'hero',range:150,team:1},'physical',{attack:true}),0);
 assert.equal(g.courierCommand('burst').ok,false);
});

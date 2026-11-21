import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import * as Skills from '../src/hero-runtime.js';
import {createIllusions} from '../src/illusions.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import {ensureInventory} from '../src/inventory.js';

const ck=(ranks=[1,1,1,1])=>{const a=arena('chaos_knight',ranks);a.g._random=()=>0;return a;};
test('Chaos Bolt travels before applying inversely related random damage and stun',()=>{
 const {g,p,e}=ck();g._random=()=>0;const mana=p.mana;
 assert.ok(g.cast(0,e).ok);g.step(.41);assert.equal(e.hp,4000);g.step(.2);
 assert.equal(e.hp,3910);assert.ok(g.isStunned(e));assert.ok(e.statuses.chaosBolt.until-g.time>1.6);assert.equal(p.mana,mana-110);
});
test('Chaos Bolt blocks at projectile impact and the highest damage roll gives the shortest stun',()=>{
 const {g,p,e}=ck();g._random=()=>.999999;let blocks=0;g.blockTargetSpell=()=>{blocks++;return false;};
 g.cast(0,e);g.step(.41);assert.equal(blocks,0);g.step(.2);assert.equal(blocks,1);assert.ok(Math.abs(e.hp-3845)<.01);assert.ok(e.statuses.chaosBolt.duration<1.251);
});
test('Reality Rift cannot be cast while rooted and its talent pierces enemy debuff immunity',()=>{
 const {g,p,e}=ck();Skills.applyRoot(g,p,5,e);assert.equal(g.cast(1,e).ok,false);Skills.applyDispel(g,p,true);p.talents=[5];
 Skills.addStatus(g,e,'immune',{duration:5,debuffImmune:true});assert.ok(g.cast(1,e).ok);g.step(.3);assert.equal(g.combatStats(e).armor,-4);
});
test('Phantasm Scepter creates extra Chaos Knight copies and globally owned allied hero illusions',()=>{
 const {g,p,e}=ck([1,1,1,3]);p.hasScepter=true;const ally=g._makeHero('axe',0,2,false,0);ally.x=p.x+6000;ally.y=p.y;
 g.cast(3,p);g.step(1);const copies=g.entities.filter(e=>e.kind==='illusion'&&e.ownerId===p.id&&!e.dead);
 assert.equal(copies.filter(e=>e.heroId==='chaos_knight').length,6);assert.equal(copies.filter(e=>e.heroId==='axe').length,1);assert.ok(copies.every(e=>e.itemPotency===100));
});
test('Reality Rift pulls the enemy and gathers owned illusions with real armor reduction',()=>{
 const {g,p,e}=ck([1,4,1,1]);e.x=p.x+600;const clone=createIllusions(g,p,1,30)[0];clone.x=p.x-1000;
 assert.ok(g.cast(1,e).ok);g.step(.3);assert.ok(e.x<11000);assert.ok(Math.hypot(p.x-e.x,p.y-e.y)<160);
 assert.ok(Math.hypot(clone.x-e.x,clone.y-e.y)<200);assert.equal(g.combatStats(e).armor,-7);
});
test('Chaos Strike crits at the random minimum and heals from actual attack damage',()=>{
 const {g,p,e}=ck([1,1,4,1]);p.attackCooldown=0;p.hp=100;p.damage=100;p.damageMin=p.damageMax=100;
 assert.ok(g._attack(p,e));g.step(.6);assert.equal(e.hp,3880);assert.equal(p.hp,172);
 Skills.addStatus(g,p,'break',{duration:5,break:true});p.attackCooldown=0;g._attack(p,e);g.step(.6);assert.equal(e.hp,3780);assert.equal(p.hp,172);
});
test('Phantasm replaces its previous army with three full-potency expiring illusions',()=>{
 const {g,p}=ck([1,1,1,3]);assert.ok(g.cast(3,p).ok);g.step(1);
 const army=g.entities.filter(e=>e.kind==='illusion'&&!e.dead);assert.equal(army.length,3);
 for(const clone of army){assert.equal(clone.ownerId,p.id);assert.equal(clone.itemPotency,100);assert.equal(clone.illusionOutgoing,1);assert.equal(clone.illusionIncoming,3.5);assert.equal(clone.phantasmOwnerId,p.id);}
 p.cooldowns[3]=0;g.cast(3,p);g.step(1);assert.equal(g.entities.filter(e=>e.kind==='illusion'&&!e.dead).length,3);
});
test('Chaos Bolt shard creates a full-damage illusion with 25 percent item potency',()=>{
 const {g,p,e}=ck([1,1,1,3]);p.hasShard=true;g.cast(0,e);g.step(1);
 const clone=g.entities.find(e=>e.kind==='illusion');assert.ok(clone);assert.equal(clone.itemPotency,25);assert.equal(clone.illusionOutgoing,1);assert.equal(clone.phantasmOwnerId,null);assert.equal(clone.controlTarget,e.id);
});
test('Armageddon builds speed while moving, drains while stationary and clears on attack',()=>{
 const {g,p,e,c}=ck();e.x=c.x=p.x+6000;p.speed=325;p.movementInput={x:1,y:0};g.step(2);
 assert.ok(p.armageddonSpeed>9&&p.armageddonSpeed<=10.1);p.movementInput={x:0,y:0};g.step(.25);assert.ok(p.armageddonSpeed<5.2);
 e.x=p.x+100;p.attackCooldown=0;g._attack(p,e);g.step(.6);assert.equal(p.armageddonSpeed,0);
});
test('Armageddon accumulates speed during an actual attack order chase',()=>{
 const {g,p,e,c}=ck();e.x=p.x+1600;c.x=p.x+6000;const from={x:p.x,y:p.y};g.attackTarget(e.id);g.step(2);
 assert.ok(Math.hypot(p.x-from.x,p.y-from.y)>500);assert.ok(p.armageddonSpeed>8&&p.armageddonSpeed<=10.1);
});
test('Armageddon ignores Blink displacement and Force Staff movement before normal movement resumes',()=>{
 const {g,p,e,c}=ck();e.x=c.x=p.x+6000;p.inventory=['blink','force_staff'];ensureInventory(p);g._refreshHero(p);g.step(.05);
 const start=p.x;assert.ok(g.useItem(0,{x:p.x+600,y:p.y}).ok);g.setMovement(1,0);g.step(.025);
 assert.ok(p.x-start>500);assert.equal(p.armageddonSpeed,0);g.stop();
 assert.ok(g.useItem(1,p).ok);const until=p.forcedMotion.until;g.setMovement(1,0);g.step(until-g.time);
 assert.equal(p.forcedMotion,null);assert.equal(p.armageddonSpeed,0);g.step(.2);assert.ok(p.armageddonSpeed>0);
});
test('Armageddon requires an active Phantasm and charges with gathered illusions, stopping on root',()=>{
 const {g,p,e}=ck([1,1,1,3]);assert.equal(g.castExtra('chaos_knight_armageddon',{x:p.x+1500,y:p.y}).ok,false);
 g.cast(3,p);g.step(1);p.attackCooldown=999;e.x=p.x+450;const start=p.x,army=g.entities.filter(e=>e.kind==='illusion');
 assert.ok(g.castExtra('chaos_knight_armageddon',{x:p.x+1500,y:p.y}).ok);g.step(1.9);
 assert.ok(p.x>start+200);assert.ok(p.chaosCharge);assert.ok(army.every(e=>e.chaosChargeOwnerId===p.id));
 Skills.applyRoot(g,p,2,e);g.step(.1);assert.equal(p.chaosCharge,null);assert.ok(army.every(e=>!e.chaosChargeOwnerId));
});
test('Armageddon stop releases its preparation early and steering preserves the original duration',()=>{
 const {g,p,e,c}=ck([1,1,1,3]);e.x=c.x=p.x+6000;g.cast(3,p);g.step(1);
 g.castExtra('chaos_knight_armageddon',{x:p.x+2000,y:p.y});g.step(.6);assert.equal(p.chaosCharge.phase,'windup');g.stop();
 assert.equal(p.chaosCharge.phase,'charge');assert.ok(p.chaosCharge.prepared<1);const until=p.chaosCharge.until,angle=p.chaosCharge.angle;
 g.setMovement(0,1);g.step(.25);assert.ok(p.chaosCharge);assert.equal(p.chaosCharge.until,until);assert.ok(p.chaosCharge.angle>angle&&p.chaosCharge.angle-angle<.12);
 g.stop();assert.equal(p.chaosCharge,null);assert.ok(g.entities.filter(e=>e.kind==='illusion').every(e=>!e.chaosChargeOwnerId));
});
test('Armageddon real charge attacks damage enemies encountered along its path',()=>{
 const {g,p,e,c}=ck([1,1,0,3]);e.x=p.x+350;c.x=p.x+6000;p.damage=p.damageMin=p.damageMax=100;
 g.cast(3,p);g.step(1);p.attackCooldown=0;for(const clone of g.entities.filter(e=>e.kind==='illusion')){clone.attackCooldown=999;clone.manualControl=true;}
 g.castExtra('chaos_knight_armageddon',{x:p.x+1500,y:p.y});g.step(2);assert.ok(e.hp<=3900);
});
test('Armageddon active button can release the windup and cancel the charge without another mana payment',()=>{
 const {g,p,e,c}=ck([1,1,0,3]);e.x=c.x=p.x+6000;g.cast(3,p);g.step(1);
 g.castExtra('chaos_knight_armageddon',{x:p.x+2000,y:p.y});g.step(.6);const mana=p.mana;
 assert.ok(g.castExtra('chaos_knight_armageddon',p).ok);assert.equal(p.chaosCharge.phase,'charge');assert.equal(p.mana,mana);
 assert.ok(g.castExtra('chaos_knight_armageddon',p).ok);assert.equal(p.chaosCharge,null);assert.equal(p.mana,mana);
});
test('Fear cancels Armageddon preparation and an active charge with its following illusions',()=>{
 for(const delay of [.6,1.8]){
  const {g,p,e,c}=ck([1,1,0,3]);e.x=c.x=p.x+6000;g.cast(3,p);g.step(1);
  g.castExtra('chaos_knight_armageddon',{x:p.x+2000,y:p.y});g.step(delay);assert.ok(p.chaosCharge);
  Skills.addStatus(g,p,'testFear',{duration:2,feared:true});g.step(.1);assert.equal(p.chaosCharge,null);assert.ok(g.entities.filter(e=>e.kind==='illusion').every(e=>!e.chaosChargeOwnerId));
 }
});
test('Chaos Bolt in flight and Armageddon state survive save and restore',()=>{
 const {g,p,e}=ck();e.x=p.x+500;g.cast(0,e);g.step(.41);
 const text=serializeMatch(g),copy=restoreMatch(parseMatch(text));copy.setPaused(false);copy.step(1);
 assert.ok(copy.entities.find(x=>x.id===e.id).hp<4000);
});

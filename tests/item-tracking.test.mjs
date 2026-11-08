import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {tickWorld,tickUnit,useItem} from '../src/item-runtime.js';
import {addStatus} from '../src/hero-runtime.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function equipped(id,hero='kunkka'){
 const result=arena(hero,[0,0,0,3]),{g,p,e}=result;p.inventory=[id];p.inventoryMeta=[];g._refreshHero(p);p.mana=p.maxMana;e.x=p.x+700;return result;
}
const at=(g,time)=>{const dt=time-g.time;g.time=time;tickWorld(g,dt);};
test('Ethereal Blast flies at 1400, applies damage and debuff only on impact, and spends mana/cooldown once',()=>{
 const {g,p,e}=equipped('ethereal_blade');const mana=p.mana,damage=(50+p.strength+p.agility+p.intelligence)*1.3;
 assert.equal(g.useItem(0,e).projectile,true);assert.equal(e.hp,4000);assert.equal(e.statuses.ethereal,undefined);close(p.mana,mana-100);assert.equal(p.inventoryMeta[0].cooldownRemaining,22);
 at(g,.49);assert.equal(e.hp,4000);assert.ok(g.effects.some(f=>f.tracked&&f.itemId==='ethereal_blade'));at(g,.5);close(4000-e.hp,damage);assert.ok(e.statuses.ethereal);assert.equal(g.itemZones.filter(z=>z.type==='itemTracking').length,0);assert.ok(!g.effects.some(f=>f.tracked&&f.itemId==='ethereal_blade'));
});
test('Tracking item follows a moving target beyond cast range and does not lose it merely to invisibility',()=>{
 const {g,p,e}=equipped('ethereal_blade');g.useItem(0,e);at(g,.1);const shot=g.itemZones.find(z=>z.type==='itemTracking');close(shot.x,p.x+140);
 e.y+=700;addStatus(g,e,'invisible',{duration:10,invisible:true,positive:true});at(g,.2);assert.ok(shot.y>p.y);assert.ok(shot.x<p.x+280);
 at(g,2);assert.ok(e.hp<4000);assert.ok(e.statuses.ethereal);
});
test('Blink disjoints ordinary tracking items while Harpoon keeps following its target',()=>{
 for(const id of ['ethereal_blade','nullifier','harpoon']){
  const {g,p,e}=equipped(id);e.x=p.x+600;g.useItem(0,e);e.inventory=['blink'];e.inventoryMeta=[];g._refreshHero(e);const point={x:e.x,y:e.y+300};assert.equal(useItem(g,e,0,point).ok,true);at(g,1);
  if(id==='harpoon'){assert.ok(e.forcedMotion);assert.ok(p.forcedMotion);}else{assert.equal(e.statuses.ethereal,undefined);assert.equal(e.statuses['itemDebuff:nullifier'],undefined);}
  assert.equal(g.itemZones.filter(z=>z.type==='itemTracking').length,0);
 }
});
test('Linken acquired during flight blocks at impact and is not consumed at projectile launch',()=>{
 const {g,p,e}=equipped('ethereal_blade');g.useItem(0,e);e.inventory=['sphere'];e.inventoryMeta=[];g._refreshHero(e);const hp=e.hp;
 assert.equal(e.inventoryMeta[0].cooldownRemaining,0);at(g,.49);assert.equal(e.inventoryMeta[0].cooldownRemaining,0);at(g,.5);assert.equal(e.hp,hp);assert.equal(e.statuses.ethereal,undefined);assert.ok(e.inventoryMeta[0].cooldownRemaining>0);
});
test('Lotus acquired during flight returns one real projectile even when Linken blocks the original, without reflection loops',()=>{
 const {g,p,e}=equipped('ethereal_blade');g.useItem(0,e);e.inventory=['sphere'];e.inventoryMeta=[];g._refreshHero(e);addStatus(g,e,'lotus',{positive:true,spellReflect:true,duration:6});addStatus(g,p,'lotus',{positive:true,spellReflect:true,duration:6});
 at(g,.5);assert.equal(e.statuses.ethereal,undefined);assert.equal(g.itemZones.filter(z=>z.type==='itemTracking').length,1);const reflected=g.itemZones[0];assert.equal(reflected.sourceId,e.id);assert.equal(reflected.targetId,p.id);assert.equal(reflected.reflected,true);
 at(g,1);assert.ok(p.statuses.ethereal);assert.equal(g.itemZones.filter(z=>z.type==='itemTracking').length,0);
});
test('Saved in-flight item preserves position, target and instance metadata; pause freezes flight and impact occurs once',()=>{
 const {g,p,e}=equipped('ethereal_blade');g.useItem(0,e);at(g,.2);const shot=structuredClone(g.itemZones[0]);delete shot.entry.meta.mode;const restored=restoreMatch(parseMatch(serializeMatch(g)));restored.step(1);assert.deepEqual(restored.itemZones[0],shot);
 restored.setPaused(false);const target=restored.entities.find(u=>u.id===e.id);at(restored,.5);const hp=target.hp;assert.ok(hp<4000);at(restored,1);assert.equal(target.hp,hp);
});
test('Ogre multicast launches independent tracking items without additional mana or item cooldowns',()=>{
 const {g,p,e,c}=equipped('ethereal_blade','ogre_magi');c.x=p.x+600;g._random=()=>0;const mana=p.mana;g.useItem(0,e);
 const shots=g.itemZones.filter(z=>z.type==='itemTracking');assert.equal(shots.length,2);assert.equal(new Set(shots.map(s=>s.targetId)).size,2);close(p.mana,mana-100);assert.equal(e.hp,4000);assert.equal(c.hp,4000);at(g,1);assert.ok(e.hp<4000);assert.ok(c.hp<4000);
});
test('Nullifier flies at 1800 and suspends continuous purge during debuff immunity, then resumes without removing its own status',()=>{
 const {g,p,e}=equipped('nullifier');e.x=p.x+720;addStatus(g,e,'bkb',{positive:true,debuffImmune:true,undispellable:true,duration:1});addStatus(g,e,'haste',{positive:true,movePercent:20,duration:10});g.useItem(0,e);
 at(g,.39);assert.equal(e.statuses['itemDebuff:nullifier'],undefined);at(g,.4);assert.ok(e.statuses['itemDebuff:nullifier']);tickUnit(g,e,.1);assert.ok(e.statuses.haste);at(g,1);tickUnit(g,e,.1);assert.equal(e.statuses.haste,undefined);assert.ok(e.statuses['itemDebuff:nullifier']);
});
test('Target death or invulnerability cancels a tracking item without delayed effects on a respawned unit',()=>{
 for(const state of ['death','invulnerable']){
  const {g,p,e}=equipped('ethereal_blade');g.useItem(0,e);if(state==='death'){e.dead=true;e.hp=0;e.deathTime=g.time;}else addStatus(g,e,'invulnerable',{positive:true,invulnerable:true,duration:1});at(g,.1);assert.equal(g.itemZones.length,0);assert.equal(e.statuses.ethereal,undefined);
 }
});

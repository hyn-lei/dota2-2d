import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import { ITEM_BY_ID } from '../src/item-data.js';

function equipped(id,hero='crystal_maiden'){
 const setup=arena(hero,[0,0,0,0]),{g,p}=setup;
 assert.ok(ITEM_BY_ID[id],`catalog contains ${id}`);
 p.inventory=[id];p.inventoryMeta=[];g._refreshHero(p);p.hp=p.maxHp;p.mana=p.maxMana;
 return setup;
}
test('Blink moves to the actual destination, is disabled by hero damage and cannot reset by moving slots',()=>{
 const {g,p,e}=equipped('blink');const x=p.x;
 assert.equal(g.useItem(0,{x:x+800,y:p.y}).ok,true);assert.ok(p.x>x+700);
 assert.equal(g.useItem(0,{x:x+900,y:p.y}).ok,false);
 p.inventoryMeta[0].cooldownRemaining=0;g.damage(p,1,e,'pure');assert.equal(g.useItem(0,{x:x+1000,y:p.y}).ok,false);
 g.moveItem('inventory',0,'backpack',0);g.moveItem('backpack',0,'inventory',0);
 assert.equal(g.useItem(0,{x:x+1000,y:p.y}).ok,false);
});
test('Healing Salve consumes one stack and regeneration stops on enemy hero damage',()=>{
 const {g,p,e}=equipped('flask');p.hp=100;
 assert.equal(g.useItem(0,p).ok,true);assert.equal(p.inventory.filter(Boolean).length,0);
 g.step(1);assert.ok(p.hp>=130);g.damage(p,10,e,'pure');const hp=p.hp;g.step(1);assert.ok(p.hp<hp+5);
});
test('Black King Bar grants debuff immunity and magic resistance without making attacks invulnerable',()=>{
 const {g,p,e}=equipped('black_king_bar');assert.equal(g.useItem(0,p).ok,true);
 assert.ok(Object.values(p.statuses).some(s=>s.debuffImmune));const hp=p.hp;
 g.damage(p,100,e,'magical');assert.ok(hp-p.hp<40);g.damage(p,20,e,'physical');assert.ok(p.hp<hp);
});
test('Dagon respects target validation, spell block and item cooldown',()=>{
 const {g,p,e}=equipped('dagon');assert.equal(g.useItem(0,p).ok,false);
 const hp=e.hp;assert.equal(g.useItem(0,e).ok,true);g.step(.2);assert.ok(e.hp<hp-350);
 assert.equal(g.useItem(0,e).ok,false);
});
test('Power Treads rotates the selected attribute while keeping health and mana fractions',()=>{
 const {g,p}=equipped('power_treads');p.hp=p.maxHp*.3;p.mana=p.maxMana*.4;const strength=p.strength;
 assert.equal(g.useItem(0,p).ok,true);assert.ok(Math.abs(p.hp/p.maxHp-.3)<.001);assert.ok(Math.abs(p.mana/p.maxMana-.4)<.001);
 assert.notEqual(p.strength,strength);assert.equal(g.useItem(0,p).ok,true);assert.equal(g.useItem(0,p).ok,true);assert.equal(p.strength,strength);
});
test('Refresher resets hero and item cooldowns except its own and charges the actual mana',()=>{
 const {g,p}=equipped('refresher');p.maxMana=p.mana=2000;p.cooldowns=[10,11,12,13];const mana=p.mana;
 assert.equal(g.useItem(0,p).ok,true);assert.deepEqual(p.cooldowns,[0,0,0,0]);assert.ok(p.inventoryMeta[0].cooldownRemaining>0);assert.ok(p.mana<mana);
});

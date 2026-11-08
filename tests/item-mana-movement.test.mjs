import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {spendMana,restoreMana,manaState} from '../src/mana-runtime.js';
import {useItem} from '../src/item-runtime.js';
import {refreshInventory} from '../src/inventory.js';
import {tickStatuses,applyDispel} from '../src/hero-runtime.js';
import {statusEffects} from '../src/status-ui.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function equipped(id,hero='crystal_maiden'){
 const result=arena(hero,[4,4,4,3]);const {g,p}=result;p.inventory=[id];p.inventoryMeta=[];g._refreshHero(p);p.mana=p.maxMana;p.hp=p.maxHp;return result;
}
const expire=(g,p)=>{g.time=p.statuses['itemBuff:soul_ring'].until;tickStatuses(g,p,0);};

test('Soul Ring adds all 170 mana, extends only overflow capacity, and removes only unspent temporary mana',()=>{
 for(const missing of [0,100,250]){
  const {g,p}=equipped('soul_ring'),max=p.maxMana;p.mana=max-missing;const normal=p.mana,hp=p.hp;
  assert.equal(g.useItem(0,p).ok,true);close(p.mana,normal+170);close(p.maxMana,max+Math.max(0,170-missing));close(p.hp,hp-170);
  spendMana(p,75);assert.equal(p.statuses['itemBuff:soul_ring'].temporaryMana,95);expire(g,p);close(p.mana,normal);close(p.maxMana,max);
 }
});
test('Skill and item costs spend Soul Ring mana first; expiry does not subtract ordinary mana after it is spent',()=>{
 const {g,p,e}=equipped('soul_ring');p.inventory[1]='glimmer_cape';refreshInventory(g,p);p.mana=p.maxMana;const normal=p.mana;
 assert.equal(g.useItem(0,p).ok,true);assert.equal(g.useItem(1,p).ok,true);assert.equal(manaState(p).temporary,45);
 assert.equal(g.cast(0,e).ok,true);for(let i=0;i<12;i++)g.step(.05);
 assert.equal(manaState(p).temporary,0);const before=p.mana;expire(g,p);close(p.mana,before);assert.ok(p.mana<normal);
});
test('Mana burn and regeneration preserve Soul Ring accounting without refilling its temporary pool',()=>{
 const {g,p,e}=equipped('soul_ring');const normal=p.maxMana;p.mana=normal-100;g.useItem(0,p);spendMana(p,200);close(p.mana,normal-130);assert.equal(manaState(p).temporary,0);
 restoreMana(p,500);close(p.mana,normal);expire(g,p);close(p.mana,normal);
 const other=equipped('diffusal_blade','juggernaut');other.p.attackCooldown=0;Object.assign(e,{team:other.p.team===0?1:0});
 // Burn through the attack hook, rather than manually replacing the victim's mana.
 other.g.entities.push(p);p.team=1;Object.assign(p,{x:other.p.x+100,y:other.p.y,dead:false});p.inventoryMeta[0].cooldownRemaining=0;p.itemCooldowns={};useItem(other.g,p,0,p);
 const temporary=manaState(p).temporary;other.g._attack(other.p,p);assert.ok(manaState(p).temporary<temporary);const after=p.mana,left=manaState(p).temporary;expire(other.g,p);close(p.mana,after-left);
});
test('Inventory changes keep ordinary mana percentage and temporary mana separately, including save/restore and strong illusions',async()=>{
 const {g,p}=equipped('soul_ring');p.mana=p.maxMana*.5;const ratio=.5;g.useItem(0,p);spendMana(p,50);p.inventory[1]='energy';refreshInventory(g,p);
 const state=manaState(p);close(state.normalRatio,ratio);assert.equal(state.temporary,120);
 const restored=restoreMatch(parseMatch(serializeMatch(g)));const q=restored.player;assert.deepEqual(manaState(q),state);expire(restored,q);close(q.mana,q.maxMana*ratio);
 const {createIllusions}=await import('../src/illusions.js');const strong=createIllusions(g,p,1,30,100,100,{type:'strong'})[0];assert.deepEqual(manaState(strong),state);spendMana(strong,80);assert.equal(manaState(p).temporary,120);expire(g,strong);close(strong.mana,strong.maxMana*ratio);
});
test('Soul Ring status is undispellable, repeated use replaces the old pool, and death removes temporary capacity',()=>{
 const {g,p}=equipped('soul_ring'),base=p.maxMana;g.useItem(0,p);spendMana(p,50);applyDispel(g,p,true);assert.equal(manaState(p).temporary,120);
 p.inventoryMeta[0].cooldownRemaining=0;p.itemCooldowns={};assert.equal(g.useItem(0,p).ok,true);close(p.mana,base+170);close(p.maxMana,base+170);
 assert.ok(statusEffects(p,g.time,g).some(s=>s.id==='itemBuff:soul_ring'));g._kill(p,null);close(p.maxMana,base);assert.equal(manaState(p).temporary,0);
});
test('Glimmer gives flat +20 speed after fade, keeps its shield, and expires with the status',()=>{
 const {g,p}=equipped('glimmer_cape'),speed=g.combatStats(p).speed;g.useItem(0,p);close(g.combatStats(p).speed,speed);g.time=.5;close(g.combatStats(p).speed,speed+20);
 assert.equal(p.statuses['itemBarrier:glimmer_cape'].barrier,375);g.time=6;tickStatuses(g,p,0);close(g.combatStats(p).speed,speed);
});
test('Wind Waker permits steering only on self; allied and enemy cyclones remain immobilized',()=>{
 const {g,p,e}=equipped('wind_waker');p.speed=300;g.useItem(0,p);assert.equal(g.isStunned(p),false);close(g.combatStats(p).speed,300);const x=p.x;g._move(p,{x:x+400,y:p.y},.1);close(p.x,x+30);
 const ally=g._makeHero('juggernaut',p.team,1,false,5);Object.assign(ally,{x:p.x+100,y:p.y});p.inventoryMeta[0].cooldownRemaining=0;p.itemCooldowns={};assert.equal(useItem(g,p,0,ally).ok,true);
 for(const unit of [ally,e]){if(unit===e){p.inventoryMeta[0].cooldownRemaining=0;p.itemCooldowns={};assert.equal(useItem(g,p,0,e).ok,true);}assert.equal(g.isStunned(unit),true);const position={x:unit.x,y:unit.y};g._move(unit,{x:unit.x+400,y:unit.y},.1);assert.deepEqual({x:unit.x,y:unit.y},position);}
});

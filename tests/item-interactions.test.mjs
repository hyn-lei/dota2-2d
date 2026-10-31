import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import * as Skills from '../src/hero-runtime.js';
import * as Trees from '../src/item-common.js';
import { Navigator } from '../src/navigation.js';
import { calculateHeroStats } from '../src/hero-stats.js';
const equip=(g,h,items)=>{h.inventory=items;h.inventoryMeta=[];g._refreshHero(h);h.hp=h.maxHp;h.mana=h.maxMana;};

test('reflected Omnislash ends on non-Juggernaut heroes and does not leave their controls locked',()=>{
 const {g,p,e}=arena('juggernaut');Skills.addStatus(g,e,'lotus',{positive:true,spellReflect:true,duration:6});
 assert.equal(g.cast(3,e).ok,true);g.step(.4);g.step(5);assert.ok(!p.omnislash);assert.ok(!e.omnislash);
});
test('Desolator permanently gains damage immediately after a hero kill',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,p,['desolator']);const damage=p.damage;
 g.damage(e,99999,p,'pure');assert.ok(p.inventoryMeta[0].bonusDamage>0);assert.ok(p.damage>damage);
});
test('boots of bearing prevent movement slows while their short immunity lasts',()=>{
 const {g,p}=arena('crystal_maiden');equip(g,p,['boots_of_bearing']);Skills.addStatus(g,p,'testSlow',{duration:10,slowPct:80});
 assert.equal(g.useItem(0,p).ok,true);assert.ok(g.combatStats(p).speed>p.speed);g.step(2);assert.ok(g.combatStats(p).speed<p.speed);
});
test('tree planting and eating opens a blocked tile and grants Tango regeneration',()=>{
 const {g,p}=arena('crystal_maiden');g.navigation=new Navigator({cols:10,rows:10,cellSize:64,origin:{x:10000,y:10000},blocked:'0'.repeat(100)},[]);
 equip(g,p,['branch','tango']);const at={x:10448,y:10400};assert.equal(g.useItem(0,at).ok,true);assert.equal(g.navigation.isWalkable(at),false);
 assert.equal(g.useItem(1,at).ok,true);assert.equal(g.navigation.isWalkable(at),true);assert.ok(p.statuses['itemRegen:tango'].duration>=32);
 Trees.plantTree(g,at);g.step(20.1);assert.equal(g.plantedTrees.length,0);
});
test('evasion combines multiplicatively while Yasha and Kaya family bonuses remain unique',()=>{
 const base=calculateHeroStats('crystal_maiden'),s=calculateHeroStats('crystal_maiden',1,['talisman_of_evasion','talisman_of_evasion','kaya','yasha_and_kaya','yasha','wind_lace','wind_lace']);
 assert.ok(Math.abs(s.evasion-(1-.85**2)*100)<.001);assert.equal(s.spellAmp,12);assert.ok(Math.abs(s.speed-(base.speed+15)*1.12)<.001);
});

test('Bloodstone uses its active total and Satanic adds the current numeric bonus',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,p,['bloodstone']);p.hp=100;p.hpRegen=0;g.useItem(0,p);
 const hp=p.hp;g.damage(e,100,p,'pure');assert.ok(Math.abs(p.hp-hp-60)<.01);
 equip(g,p,['satanic']);p.hp=100;p.attackCooldown=0;e.hp=e.maxHp;e.armor=0;e.x=p.x+100;
 g.useItem(0,p);const before=e.hp;g._attack(p,e);assert.ok(Math.abs(p.hp-100-(before-e.hp)*1.70)<.01);
});

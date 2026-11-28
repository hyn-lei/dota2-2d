import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {tickWorld} from '../src/item-runtime.js';
import {addStatus} from '../src/hero-runtime.js';
import {giveItem} from '../src/inventory.js';
import {tickAttacks} from '../src/attack-projectiles.js';

function harpoonArena(){
 const result=arena('weaver'),{g,p,e}=result;
 assert.equal(giveItem(g,p,'harpoon').ok,true);
 p.mana=p.maxMana;
 e.x=p.x+570;
 return result;
}
function advanceItemWorld(g,time){const elapsed=time-g.time;g.time=time;tickWorld(g,elapsed);}

test('Harpoon independently pulls an enemy when the caster is rooted',()=>{
 const {g,p,e}=harpoonArena();
 addStatus(g,p,'harpoonRoot',{rooted:true,duration:2});
 assert.equal(g.useItem(0,e).projectile,true);
 advanceItemWorld(g,.3);
 assert.equal(p.forcedMotion,undefined);
 assert.ok(e.forcedMotion.to.x<e.x);
});

test('Harpoon can target debuff immunity and only pulls the caster',()=>{
 const {g,p,e}=harpoonArena();
 addStatus(g,e,'harpoonBkb',{debuffImmune:true,duration:2,positive:true});
 assert.equal(g.useItem(0,e).projectile,true);
 advanceItemWorld(g,.3);
 assert.equal(e.forcedMotion,undefined);
 assert.ok(p.forcedMotion.to.x>p.x);
});

test('Defiant Shell crafted with Dormant Curio returns 104 percent of normal attack damage',()=>{
 const {g,p,e}=arena('crystal_maiden');
 Object.assign(p,{neutralTier:1,neutralItem:'dormant_curio',madstone:100});
 p.neutralArtifactOptions[2]=['defiant_shell'];
 g.time=1200;
 const {enchantments}=g.neutralCraftState();
 assert.equal(g.craftNeutral('defiant_shell',enchantments[0]).ok,true);
 const health=e.hp, normalDamage=g.combatStats(p,e).damage;
 e.attackCooldown=0;
 assert.equal(g._attack(e,p),true);
 g.time+=.25;
 tickAttacks(g);
 assert.equal(e.hp,health);
 g.time+=.25;
 tickAttacks(g);
 assert.ok(Math.abs(health-e.hp-normalDamage*1.04)<1e-7,`counter dealt ${health-e.hp}, normal attack deals ${normalDamage}`);
});

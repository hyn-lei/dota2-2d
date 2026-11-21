import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import * as Skills from '../src/hero-runtime.js';
test('Blade Fury fully disarms an unupgraded Juggernaut and ends with only a basic dispel',()=>{
 const {g,p,e}=arena('juggernaut',[1,1,1,1]);g.cast(0,p);g.step(.01);p.attackCooldown=0;assert.equal(g._attack(p,e),false);
 Skills.addStatus(g,p,'unremovedStun',{duration:7,stunned:true});g.step(5.1);assert.ok(g.isStunned(p));
});
test('Blade Fury Scepter attacks while stunned with 75 percent damage and item potency',()=>{
 const {g,p,e}=arena('juggernaut',[1,1,0,1]);p.hasScepter=true;p.damage=100;p.damageMin=p.damageMax=100;g.cast(0,p);g.step(.01);
 Skills.addStatus(g,p,'spinStun',{duration:3,stunned:true});p.attackCooldown=0;const hp=e.hp;g.step(.1);
 assert.ok(hp-e.hp>=75);assert.equal(Skills.attackModifiers(g,p,e,{spinAttack:true}).itemPotency,75);
});
test('Tailwind Break blocks new stacks while preserving existing speed bonuses',()=>{
 const {g,p,e}=arena('windranger',[1,1,1,1]);g.cast(2,p);g.step(.4);const count=p.tailwinds.length,speed=g.combatStats(p).speed;
 Skills.addStatus(g,p,'break',{duration:8,break:true});p.cooldowns[2]=0;g.cast(2,p);g.step(.4);assert.equal(p.tailwinds.length,count);assert.ok(g.combatStats(p).speed>=speed-1);
});
test('A missed attack increments Axe Counter Helix and procs on its threshold',()=>{
 const {g,p,e}=arena('axe',[1,1,1,1]);p.armor=0;e.attackCooldown=0;e.damage=100;
 Skills.addStatus(g,p,'evasion',{duration:5,evasion:100});g._random=()=>0;
 const count=Skills.skillOf(p,2).values.trigger_attacks;for(let i=0;i<count;i++){e.attackCooldown=0;g._attack(e,p);g.step(.3);}
 assert.equal(p.helixCounter,0);assert.ok(e.hp<4000);assert.ok(p.cooldowns[2]>0);
});
test('Ghostship Scepter cannon volleys include two projectiles fired straight forward',()=>{
 const {g,p,e}=arena('kunkka',[1,1,1,1]);p.hasScepter=true;g.cast(3,{x:p.x+900,y:p.y});g.step(1.2);
 const cannon=g.pendingSpells.filter(s=>s.type==='cannon');assert.ok(cannon.some(s=>s.dir.x>.999&&Math.abs(s.dir.y)<.001));
});

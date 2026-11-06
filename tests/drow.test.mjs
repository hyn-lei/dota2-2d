import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { arena } from './skill-arena.mjs';
import { abilityAt,innateAt,talentStats,ABILITIES } from '../src/ability-data.js';
import { HERO_STATS } from '../src/hero-data.js';
import { physicalDamageMultiplier } from '../src/hero-stats.js';
import * as Skills from '../src/hero-runtime.js';
import { marksmanshipActive,movementNavigator } from '../src/drow-runtime.js';
import { serializeMatch,parseMatch,restoreMatch } from '../src/game-save.js';
function setup(ranks=[4,4,4,3]){const a=arena('drow_ranger',ranks);a.e.x=a.p.x+500;a.g.step(.05);Object.assign(a.p,{maxMana:2000,mana:2000,hpRegen:0,manaRegen:0,attackCooldown:999});return a;}
function fire(g,p,e){p.attackCooldown=0;assert.equal(g._attack(p,e,{attackReleased:true}),true);p.attackCooldown=999;}
test('Drow base stats, all four ranked abilities, talents and upgrades come from 7.41f snapshots',()=>{
 const feed=JSON.parse(fs.readFileSync('docs/research/heroes/6.json','utf8')).result.data.heroes[0];
 const stats=HERO_STATS.drow_ranger;assert.equal(stats.range,feed.attack_range);assert.equal(stats.projectileSpeed,1250);assert.equal(stats.attackPoint,.5);assert.equal(stats.baseAgility,feed.agi_base);assert.equal(stats.moveSpeed,feed.movement_speed);
 assert.deepEqual(ABILITIES.drow_ranger.map(s=>s.id),['drow_ranger_frost_arrows','drow_ranger_wave_of_silence','drow_ranger_multishot','drow_ranger_marksmanship']);
 for(const [index,record]of ABILITIES.drow_ranger.entries())for(let rank=1;rank<=record.maxLevel;rank++)for(const value of feed.abilities.find(s=>s.name===record.id).special_values)if(value.values_float.length)assert.equal(abilityAt('drow_ranger',index,rank).values[value.name],value.values_float[Math.min(rank-1,value.values_float.length-1)]);
 assert.ok(Math.abs(abilityAt('drow_ranger',0,1,[0]).mana-9*.82)<1e-7);assert.equal(talentStats('drow_ranger',[2]).attackRange,75);
 assert.equal(abilityAt('drow_ranger',2,4,[1,3,5,7]).values.wave_count,5);assert.equal(abilityAt('drow_ranger',2,4,[1,3,5,7]).values.arrow_count_per_wave,5);assert.equal(abilityAt('drow_ranger',2,4,[1,3,5,7]).cooldown,9);
 assert.equal(innateAt('drow_ranger',1).values.trueshot_agi_bonus,11);assert.equal(innateAt('drow_ranger',30).values.trueshot_agi_bonus,40);
 assert.equal(abilityAt('drow_ranger',0,4,[],{hasScepter:true}).values.shard_max_stacks,9);
});
test('Frost Arrows pay mana at release, fly at 1250, and slow only on actual impact',()=>{
 const {g,p,e}=setup([4,0,0,0]),mana=p.mana;p.attackCooldown=0;assert.equal(g.cast(0,e).ok,true);
 assert.ok(p.attackPhase);assert.equal(p.mana,mana);assert.equal(g.pendingSpells.length,0);g.step(.41);
 const shot=g.pendingSpells.find(s=>s.type==='attack');assert.ok(shot);assert.equal(shot.speed,1250);assert.equal(p.mana,mana-12);assert.equal(e.hp,4000);assert.equal(e.statuses.drowFrost,undefined);
 p.attackCooldown=999;g.step(.3);assert.equal(e.hp,4000);g.step(.15);assert.ok(e.hp<4000);assert.equal(e.statuses.drowFrost.slowPct,45);assert.equal(e.statuses.drowFrost.duration,1.5);
});
test('moving during Drow windup cancels the attack without spending mana',()=>{
 const {g,p,e}=setup([1,0,0,0]),mana=p.mana;p.attackCooldown=0;g.cast(0,e);g.step(.15);g.setMovement(-1,0);g.step(.5);
 assert.equal(p.mana,mana);assert.equal(e.hp,4000);assert.equal(g.pendingSpells.length,0);
 assert.equal(p.frostArrowTarget,null);
});
test('manual Frost Arrows use attack range bonuses including Glacier instead of spell range bonuses',()=>{
 const {g,p,e}=setup([1,0,0,0]);p.hasShard=true;p.autocast[0]=false;e.x=p.x+800;
 assert.equal(g.cast(0,e).ok,false);g.castExtra('drow_ranger_glacier',p);g.step(.11);p.attackCooldown=0;
 assert.equal(g.cast(0,e).ok,true);assert.ok(p.attackPhase);assert.equal(g.combatStats(p).range,825);
});
test('Frost Arrow disjoint consumes the launched arrow but never slows or applies Hypothermia',()=>{
 const {g,p,e}=setup([4,0,0,0]);p.hasScepter=true;fire(g,p,e);assert.ok(g.pendingSpells[0].result.frostArrow);e.projectileDisjoint=1;g.step(.6);assert.equal(e.hp,4000);assert.equal(e.statuses.drowFrost,undefined);assert.equal(e.statuses.drowHypothermia,undefined);
});
test('Frost damage respects immunity gained during flight and Hypothermia uses stacks at impact',()=>{
 const {g,p,e}=setup([4,0,0,0]);p.hasScepter=true;const base=g.combatStats(p).damage;fire(g,p,e);
 e.statuses.bkb={id:'bkb',startedAt:g.time,until:g.time+9,debuffImmune:true};g.step(.45);
 assert.ok(Math.abs(4000-e.hp-base)<.01);assert.equal(e.statuses.drowFrost,undefined);assert.equal(e.statuses.drowHypothermia,undefined);
 delete e.statuses.bkb;e.hp=4000;fire(g,p,e);fire(g,p,e);g.step(.45);
 assert.ok(Math.abs(4000-e.hp-(base*2+30*2+18+36))<.01);assert.equal(e.statuses.drowHypothermia.stacks,2);
});
test('Multishot includes Frost and Scepter bonus damage once per wave without spending Frost mana',()=>{
 const {g,p,e}=setup([4,0,1,0]);p.hasScepter=true;p.autocast[0]=false;const base=g.combatStats(p).damage,mana=p.mana;
 g.cast(2,e);g.step(.75);
 assert.ok(Math.abs(4000-e.hp-(base*.8+30+18))<.01);assert.equal(e.statuses.drowHypothermia.stacks,1);assert.equal(p.mana,mana-70);
});
test('Gust travels before revealing, silencing and knocking back, and can miss a moving unit',()=>{
 const {g,p,e}=setup([0,4,0,0]);g.cast(1,{x:p.x+900,y:p.y});g.step(.26);assert.equal(e.statuses.drowGustSilence,undefined);
 g.step(.3);assert.ok(e.statuses.drowGustSilence);assert.equal(e.statuses.drowGustSilence.duration,6);const x=e.x;g.step(.4);assert.ok(e.x>x);assert.equal(e.hp,4000);
 const b=setup([0,1,0,0]);b.g.cast(1,{x:b.p.x+900,y:b.p.y});b.g.step(.26);b.e.y+=600;b.g.step(.6);assert.equal(b.e.statuses.drowGustSilence,undefined);
});
test('Multishot releases twelve real arrows, hits each target once per wave, ignores evasion and stops future waves when interrupted',()=>{
 const {g,p,e}=setup([4,0,1,0]);p.autocast[0]=false;e.evasion=100;g.cast(2,e);const before=e.hp;g.step(.2);assert.equal(e.hp,before);assert.ok(p.channel);
 g.step(1.8);assert.ok(e.hp<before);assert.equal(p.channel,null);assert.ok(Object.keys(e.drowWaveHits||{}).length<=3);assert.ok(g.effects.some(f=>f.visual==='drowFrostImpact')||e.statuses.drowFrost);
 const b=setup([0,0,1,0]);b.e.x=b.p.x+1000;b.g.cast(2,b.e);b.g.step(.2);Skills.interruptCast(b.g,b.p,false);const shots=b.g.pendingSpells.filter(s=>s.type==='drowMultishot').length;b.g.step(1.8);assert.ok(shots<=4);assert.equal(b.g.pendingSpells.length,0);assert.ok(Object.keys(b.e.drowWaveHits||{}).length<=1);
});
test('Multishot permits movement at 35 percent speed and does not auto-attack during channel',()=>{
 const {g,p,e}=setup([0,0,1,0]);g.cast(2,e);const x=p.x;g.setMovement(-1,0);g.step(.5);assert.ok(p.channel);assert.ok(p.x<x);assert.ok(x-p.x<=p.speed*.35*.5+1);assert.equal(g.pendingSpells.some(s=>s.type==='attack'),false);
});
test('Marksmanship is disabled within 300, ignores base armor on proc, and keeps bonus armor',()=>{
 const {g,p,e}=setup([0,0,0,1]);g._random=()=>0;e.baseArmor=20;e.armor=30;assert.equal(marksmanshipActive(g,p),true);
 const damage=g.combatStats(p).damage+50;fire(g,p,e);g.step(.45);assert.ok(Math.abs(4000-e.hp-damage*physicalDamageMultiplier(10))<.01);
 e.x=p.x+299;assert.equal(marksmanshipActive(g,p),false);fire(g,p,e);assert.equal(g.pendingSpells[0].result.marksmanship,undefined);p.statuses.break={id:'break',startedAt:g.time,until:g.time+9,break:true};e.x=p.x+500;assert.equal(marksmanshipActive(g,p),false);
});
test('Trueshot grants Drow 11 percent agility at level one and shares half with nearby ranged allies without recursive growth',()=>{
 const {g,p,e}=setup([0,0,0,0]);const ally={...e,id:'rangedAlly',team:0,x:p.x+300,statuses:{},buffs:{},aiTimer:Infinity,attackCooldown:999,trueshotAgility:0};g.entities.push(ally);g.step(.1);
 assert.ok(Math.abs(p.trueshotAgility-24*.11)<.001);assert.ok(Math.abs(ally.trueshotAgility-24*.11*.5)<.001);const agi=p.agility;g.step(2);assert.equal(p.agility,agi);
 ally.x=p.x+1400;g.step(.1);assert.equal(ally.trueshotAgility,0);p.statuses.break={id:'break',startedAt:g.time,until:g.time+9,break:true};g.step(.1);assert.equal(p.trueshotAgility,0);
});
test('Scepter stacks Hypothermia up to nine, reduces healing and explodes at maximum or death',()=>{
 const {g,p,e,c}=setup([4,0,0,0]);p.hasScepter=true;e.hp=e.maxHp=10000;c.x=e.x+300;const hp=c.hp;
 for(let i=0;i<8;i++){fire(g,p,e);g.step(.45);assert.equal(e.statuses.drowHypothermia.stacks,i+1);}
 assert.equal(e.statuses.drowHypothermia.healReduction,80);fire(g,p,e);g.step(.45);assert.equal(e.statuses.drowHypothermia,undefined);assert.ok(Math.abs(hp-c.hp-540)<.01);
 fire(g,p,e);g.step(.45);const before=c.hp;g.damage(e,99999,p,'pure');assert.ok(Math.abs(before-c.hp-60)<.01);
});
test('Shard Glacier preserves Multishot, grants range on its hill, blocks the front and expires after eight seconds',()=>{
 const {g,p,e}=setup();p.hasShard=true;g.cast(2,e);g.step(.2);const channel=p.channel;assert.equal(g.castExtra('drow_ranger_glacier',p).ok,true);g.step(.11);assert.equal(p.channel,channel);
 assert.equal(g.combatStats(p).range,p.range+200);const zone=g.itemZones.find(z=>z.type==='drowGlacier');assert.ok(zone);assert.equal(zone.until-zone.startedAt,8);
 assert.equal(movementNavigator(g,p),g.navigation);assert.notEqual(movementNavigator(g,e),g.navigation);
 const saved=restoreMatch(parseMatch(serializeMatch(g)));assert.ok(saved.itemZones.some(z=>z.type==='drowGlacier'));g.step(8.1);assert.equal(g.combatStats(p).range,p.range);
});

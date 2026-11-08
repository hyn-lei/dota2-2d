import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {ITEM_BY_ID} from '../src/item-data.js';
import {physicalDamageMultiplier} from '../src/hero-stats.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const ready=p=>{p.cooldowns[1]=0;p.attackCooldown=0;};

test('legal Tidebringer upgrades immediately increase actual cleave damage at fixed attack damage and target armor',()=>{
 const {g,p,e,c}=arena('kunkka',[0,0,0,0]);p.level=7;p.skillPoints=4;c.armor=10;
 const results=[];
 for(const [rank,bonus,cooldown]of [[1,35,13],[2,70,10],[3,105,7],[4,140,4]]){
  assert.equal(g.learnAbility(1).ok,true);assert.equal(g.skill(1).level,rank);p.damage=100;ready(p);e.hp=c.hp=4000;
  const mana=p.mana;assert.equal(g._attack(p,e),true);close(4000-e.hp,100+bonus);close(4000-c.hp,(100+bonus)*1.5*physicalDamageMultiplier(10));
  assert.equal(p.cooldowns[1],cooldown);assert.equal(p.mana,mana);results.push(4000-c.hp);
 }
 assert.ok(results.every((damage,i)=>i===0||damage>results[i-1]));
});

test('Tidebringer cleaves the critical attack including its rank bonus and emits exactly one critical number',()=>{
 for(const rank of [1,2,3,4]){
  const {g,p,e,c}=arena('kunkka',[0,rank,0,0]);p.inventory=['greater_crit'];p.inventoryMeta=[];g._refreshHero(p);g._random=()=>0;ready(p);
  const attack=(p.damage+rank*35)*ITEM_BY_ID.greater_crit.values.crit_multiplier/100;
  assert.equal(g._attack(p,e),true);close(4000-e.hp,attack);close(4000-c.hp,attack*1.5);
  const numbers=g.effects.filter(f=>f.type==='text'&&f.critical);assert.equal(numbers.length,1);assert.equal(numbers[0].text,`${Math.round(attack)}!`);assert.equal(numbers[0].x,e.x);
 }
});

test('primary-target armor and overkill do not shrink Tidebringer critical cleave; each victim uses its own armor',()=>{
 const {g,p,e,c}=arena('kunkka',[0,4,0,0]);p.inventory=['greater_crit'];p.inventoryMeta=[];g._refreshHero(p);g._random=()=>0;ready(p);e.armor=30;e.hp=1;c.armor=10;
 const attack=(p.damage+140)*2.25;g._attack(p,e);assert.equal(e.dead,true);close(4000-c.hp,attack*1.5*physicalDamageMultiplier(10));
});

test('Tidebringer ignores spell amplification, spell vulnerability/reduction and spell lifesteal',()=>{
 const {g,p,e,c}=arena('kunkka',[0,4,0,0]);p.spellAmp=50;p.spellLifesteal=20;p.hp=100;ready(p);
 c.itemAura={spellVulnerability:50};c.statuses.spellOnly={id:'spellOnly',startedAt:0,until:10,spellVulnerability:50,spellDamageReduction:50};
 const attack=p.damage+140;g._attack(p,e);close(4000-c.hp,attack*1.5);assert.equal(p.hp,100);
});

test('break suppresses Tidebringer without consuming its cooldown and expiry restores the learned rank',()=>{
 const {g,p,e,c}=arena('kunkka',[0,4,0,0]);p.statuses.break={id:'break',startedAt:0,until:10,break:true};ready(p);g._attack(p,e);
 close(4000-e.hp,p.damage);assert.equal(c.hp,4000);assert.equal(p.cooldowns[1],0);
 g.time=10;ready(p);g._attack(p,e);close(4000-c.hp,(p.damage+140)*1.5);assert.equal(p.cooldowns[1],4);
});

test('Tidebringer talents increase damage and pierce armor on both the primary attack and cleave',()=>{
 const {g,p,e,c}=arena('kunkka',[0,4,0,0]);p.level=25;p.talentPoints=3;
 for(const index of [3,5,7])assert.equal(g.learnTalent(index).ok,true);
 e.armor=c.armor=10;ready(p);const attack=p.damage+140+75;g._attack(p,e);
 close(4000-e.hp,attack*physicalDamageMultiplier(7.5));close(4000-c.hp,attack*2.3*physicalDamageMultiplier(7.5));
});

test('Tidebringer range grows by rank and applies area bonuses once',()=>{
 for(const [rank,hit]of [[1,false],[2,false],[3,false],[4,true]]){
  const {g,p,e,c}=arena('kunkka',[0,rank,0,0]);c.x=p.x+1000;ready(p);g._attack(p,e);assert.equal(c.hp<4000,hit);
 }
 const {g,p,e,c}=arena('kunkka',[0,4,0,0]);p.spellAoE=100;c.x=p.x+1100;ready(p);g._attack(p,e);assert.ok(c.hp<4000);
 ready(p);c.hp=4000;c.x=p.x+1150;g._attack(p,e);assert.equal(c.hp,4000);
});

test('a saved upgraded Tidebringer retains damage scaling and does not generate critical text for ordinary hits',()=>{
 const {g,p,e,c}=arena('kunkka',[0,4,0,0]);const restored=restoreMatch(parseMatch(serializeMatch(g)));restored.step(10);assert.equal(restored.time,0);
 restored.setPaused(false);const hero=restored.player,enemy=restored.entities.find(x=>x.id===e.id),victim=restored.entities.find(x=>x.id===c.id);ready(hero);restored._attack(hero,enemy);
 close(4000-victim.hp,(hero.damage+140)*1.5);assert.equal(restored.effects.filter(f=>f.type==='text'&&/!$/.test(f.text||'')).length,0);
});
test('Blade Dance and item criticals use the largest triggered multiplier and one red critical number',()=>{
 const {g,p,e}=arena('juggernaut',[0,0,1,0]);p.inventory=['greater_crit'];p.inventoryMeta=[];g._refreshHero(p);g._random=()=>0;p.attackCooldown=0;const attack=p.damage*2.25;g._attack(p,e);close(4000-e.hp,attack);const numbers=g.effects.filter(f=>f.critical);assert.equal(numbers.length,1);assert.equal(numbers[0].color,'#ff5951');assert.equal(numbers[0].text,`${Math.round(attack)}!`);
});
test('break suppresses hero critical but preserves item criticals',()=>{
 const {g,p,e}=arena('juggernaut',[0,0,4,0]);p.statuses.break={id:'break',startedAt:0,until:30,break:true};g._random=()=>0;p.attackCooldown=0;g._attack(p,e);close(4000-e.hp,p.damage);assert.equal(g.effects.filter(f=>f.critical).length,0);
 p.inventory=['greater_crit'];p.inventoryMeta=[];g._refreshHero(p);e.hp=4000;p.attackCooldown=0;g._attack(p,e);close(4000-e.hp,p.damage*2.25);assert.equal(g.effects.filter(f=>f.critical).length,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { arena } from './skill-arena.mjs';
test('Kunkka draft stays distinct and every hero obeys the same learning system',()=>{
 const g=new Game({hero:'kunkka'});for(const team of [0,1])assert.equal(new Set(g.entities.filter(e=>e.kind==='hero'&&e.team===team).map(e=>e.heroId)).size,5);
 assert.deepEqual(g.player.abilityLevels,[0,0,0,0]);assert.equal(g.player.skillPoints,1);
});
test('Torrent waits for its cast point and delay, pauses, damages occupants and ignores escaped units/buildings',()=>{
 const {g,p,e,c}=arena();const building={...c,id:'test-building',kind:'tower',tier:1,lane:0,x:e.x,statuses:{},buffs:{}};g.entities.push(building);
 assert.equal(g.cast(0,e).ok,true);g.step(.4);c.x=e.x;c.y=e.y;e.x+=600;
 g.setPaused(true);g.step(20);assert.equal(c.hp,4000);g.setPaused(false);g.step(1.5);assert.equal(c.hp,4000);
 g.step(1.6);assert.ok(Math.abs(c.hp-3890)<.01);assert.equal(e.hp,4000);assert.equal(building.hp,4000);
});
test('Torrent preserves longer disables, survives caster death and credits its kill',()=>{
 const {g,p,e,c}=arena();e.hp=80;e.buffs.stunUntil=10;g.cast(0,e);g.step(.4);g.damage(p,99999,c,'pure');
 g.step(2);assert.ok(e.buffs.stunUntil>=10);g.step(1);assert.equal(e.dead,true);assert.equal(p.kills,1);
});
test('Tidebringer is automatic, cleaves forward and excludes allies and units behind the caster',()=>{
 const {g,p,e,c}=arena();const behind={...c,id:'behind',x:p.x-150,statuses:{},buffs:{}},ally={...c,id:'ally',team:0,statuses:{},buffs:{}};g.entities.push(behind,ally);
 p.attackCooldown=0;const hit=p.damage+35;g._attack(p,e);
 assert.ok(Math.abs(e.hp-(4000-hit))<.001);assert.ok(Math.abs(c.hp-(4000-hit*1.5))<.001);assert.equal(behind.hp,4000);assert.equal(ally.hp,4000);
 assert.equal(p.cooldowns[1],13);assert.equal(p.mana,2000);
});
test('Building attacks preserve Tidebringer and autocast can be toggled without cost',()=>{
 const {g,p,e,c}=arena();const tower={...e,id:'tower',kind:'tower',tier:1,lane:0,statuses:{},buffs:{}};g.entities.push(tower);p.attackCooldown=0;
 g._attack(p,tower);assert.equal(p.cooldowns[1],0);g.cast(1);assert.equal(p.autocast[1],false);
 p.attackCooldown=0;g._attack(p,e);assert.equal(p.cooldowns[1],0);g.cast(1);assert.equal(p.autocast[1],true);
});
test('X Mark free early return clears movement, paths and recall even with zero mana',()=>{
 const {g,p,e}=arena();g.cast(2,e);g.step(.4);const start=e.x;
 Object.assign(e,{x:e.x+300,recallTimer:2,destination:{x:12000,y:11000},navPath:[{x:12000,y:11000}]});p.mana=0;
 assert.equal(g.cast(2).ok,true);assert.equal(e.x,start);assert.equal(e.recallTimer,0);assert.equal(e.destination,null);assert.equal(e.navPath,null);assert.equal(p.mana,0);
});
test('X Mark returns enemies after three seconds and pause preserves its deadline',()=>{
 const {g,p,e}=arena();g.cast(2,e);g.step(.4);e.x+=300;g.step(2.9);const x=e.x;
 g.setPaused(true);g.step(10);assert.equal(e.x,x);g.setPaused(false);g.step(.11);assert.equal(e.x,10540);assert.equal(p.xMark,null);
});
test('X Mark rejects creeps, permits allied heroes and cancels when the marked hero dies',()=>{
 const {g,p,e,c}=arena();assert.equal(g.cast(2,c).ok,false);g.cast(2,p);g.step(.4);assert.ok(Math.abs(p.xMark.expiresAt-g.time-6)<.01);
 g._returnMark(p);p.cooldowns[2]=0;g.cast(2,e);g.step(.4);g.damage(e,99999,p,'pure');assert.equal(p.xMark,null);
});
test('Ghostship travels before impact and gives Rum to allied heroes touched by its path',()=>{
 const {g,p,e,c}=arena();assert.equal(g.cast(3,e).ok,true);g.step(3);assert.equal(e.hp,4000);assert.ok(p.statuses.rum);assert.equal(p.statuses.rum.factor,2);
 g.step(.5);assert.equal(e.hp,3650);assert.ok(g.isStunned(e));assert.equal(c.statuses.rum,undefined);
});
test('Rum delays damage and repays it nonlethally after the buff expires',()=>{
 const {g,p,e}=arena();g.entities=[p,e];p.hp=400;p.maxHp=648;
 const hit=g.damage(p,100,e,'pure');assert.ok(Math.abs(hit-82)<.001);assert.equal(p.statuses.rum.debt,18);
 g.entities=[p];g.step(5.1);assert.ok(p.statuses.rumdebt);p.hp=1;g.step(10);assert.equal(p.dead,false);assert.equal(p.hp,1);
});
test('Kunkka AI can chain learned X Mark and Torrent at legal timings',()=>{
 const {g,p,e}=arena();g.entities=[p,e];p.isPlayer=false;p.aiTimer=0;e.isPlayer=true;p.attackCooldown=999;
 g.step(.5);assert.ok(p.xMark);g.step(.8);assert.ok(g.pendingSpells.some(s=>s.type==='torrent'));
 g.step(2.5);assert.ok(e.hp<4000);assert.equal(p.xMark,null);
});

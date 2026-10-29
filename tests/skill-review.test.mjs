import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import { addStatus } from '../src/hero-runtime.js';
import { statusEffects } from '../src/status-ui.js';

test('Call expiration removes its taunt source and restores movement commands',()=>{
 const {g,p,e}=arena('axe',[1,0,0,0]);g.entities=[p,e];
 g.cast(0);g.step(.3);assert.equal(g._tauntSource(e),p);
 g.step(2.2);
 assert.equal(e.statuses.taunt,undefined);assert.equal(e.buffs.tauntSourceId,undefined);
 assert.equal(g._tauntSource(e),null);
 p.isPlayer=false;e.isPlayer=true;
 g.moveTo(11000,11000);assert.ok(e.destination);
});

test('Axe death immediately clears the taunt effect on surviving victims',()=>{
 const {g,p,e}=arena('axe',[1,0,0,0]);g.entities=[p,e];
 g.cast(0);g.step(.3);g.damage(p,99999,e,'pure');
 assert.equal(g._tauntSource(e),null);
 assert.equal(statusEffects(e,g.time).some(s=>s.id==='taunt'),false);
 assert.equal(e.buffs.tauntSourceId,undefined);
});

test('Call ignores invulnerable enemies while still taunting vulnerable enemies',()=>{
 const {g,p,e,c}=arena('axe',[1,0,0,0]);c.x=p.x+200;
 addStatus(g,e,'invulnerable',{positive:true,duration:3});
 g.cast(0);g.step(.3);
 assert.equal(g._tauntSource(e),null);assert.equal(e.statuses.taunt,undefined);
 assert.equal(g._tauntSource(c),p);
});

test('Blade Dance does not multiply normal Blade Fury damage',()=>{
 const {g,p,e}=arena('juggernaut',[1,0,4,0]);g.entities=[p,e];
 g._random=()=>0;g.cast(0);g.step(5);
 assert.equal(e.hp,3575); // Rank-one Fury: 85 magical damage per second for 5 seconds.
});

test('Omnislash hits the chosen unit first, then can bounce to another enemy',()=>{
 const {g,p,e,c}=arena('juggernaut',[0,0,0,1]);g._random=()=>.99;
 g.cast(3,e);g.step(.3);
 assert.ok(e.hp<4000);assert.equal(c.hp,4000);
 g.step(.65);assert.ok(c.hp<4000);
});

test('Tailwind status counts only boosts that have not expired',()=>{
 const {g,p,e}=arena('windranger',[1,0,1,0]);g.entities=[p,e];
 g.cast(2);g.step(.3);g.step(1);g.cast(0,e);g.step(.15);
 assert.equal(statusEffects(p,g.time).find(s=>s.id==='tailwind').stacks,2);
 g.step(1.4);
 assert.equal(statusEffects(p,g.time).find(s=>s.id==='tailwind').stacks,1);
 g.step(1.2);assert.equal(p.tailwinds.length,0);
 p.cooldowns[2]=0;p.mana=2000;g.cast(2);g.step(.3);
 assert.equal(statusEffects(p,g.time).find(s=>s.id==='tailwind').stacks,1);
});

test('Focus Fire kill refund applies during its effect and stops when the effect expires',()=>{
 for(const elapsed of [.3,21]){
  const {g,p,e}=arena('windranger',[0,0,0,1]);g.entities=[p,e];p.talents=[7];
  g.cast(3,e);g.step(elapsed);const before=p.cooldowns[3];
  g.damage(e,99999,p,'pure');
  assert.equal(before-p.cooldowns[3],elapsed<20?16:0);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import * as Visuals from '../src/combat-visuals.js';
import { castExtraAbility, applyDispel, applyStun } from '../src/hero-runtime.js';

for (const [hero, visual] of [['crystal_maiden','frostAttack'],['windranger','arrowAttack']]) {
  for (const team of [0,1]) test(`${hero} team ${team} retains its own attack material`,()=>{
    const {g,p,e}=arena(hero);p.team=team;e.team=1-team;p.attackCooldown=0;
    assert.equal(g._attack(p,e),true);
    const effect=g.effects.findLast(f=>f.type==='projectile');
    assert.equal(effect.visual,visual);
    assert.equal(effect.sourceId,p.id);
    assert.equal(effect.targetId,e.id);
    assert.ok(e.hp<4000,'visual changes retain immediate basic attack damage');
  });
}

test('towers emit distinct Radiant and Dire projectiles',()=>{
  const {g,p,e}=arena();
  for(const team of [0,1]){
    const tower=g._unit('tower',team,p.x,p.y,{range:700,damage:50,attackCooldown:0});
    const target=team?p:e;g.entities.push(tower);g._index();
    assert.equal(g._attack(tower,target),true);
    assert.equal(g.effects.findLast(f=>f.type==='projectile').visual,team?'direTower':'radiantTower');
  }
});

test('Shackleshot has a flight visual before impact and a tether only after latching',()=>{
  const {g,p,e,c}=arena('windranger',[1,0,0,0]);e.x=p.x+500;c.x=p.x+650;
  g.cast(0,e);g.step(.16);
  const shot=g.effects.find(f=>f.visual==='shackleShot');
  assert.ok(shot,'flight starts on release');assert.equal(shot.targetId,e.id);
  assert.equal(g.effects.some(f=>f.visual==='shackleLink'),false);
  g.step(.5);
  assert.ok(g.effects.some(f=>f.visual==='shackleLink'&&f.targetId===e.id));
});

test('Powershot visual keeps the same flight lifetime and direction as its simulated arrow',()=>{
  const {g,p}=arena('windranger',[0,1,0,0]);g.cast(1,{x:p.x+3000,y:p.y});g.step(1.05);
  const spell=g.pendingSpells.find(s=>s.type==='powershot');
  const effect=g.effects.find(f=>f.visual==='powershot');
  assert.ok(effect);assert.ok(Math.abs(effect.maxLife-(spell.landAt-spell.startedAt))<1e-7);
  assert.equal(effect.tx,spell.origin.x+spell.dir.x*spell.skill.values.arrow_range);
});

test('enemy spell events carry their hero identity and team',()=>{
  const {g,p,e}=arena('crystal_maiden',[1,0,0,0]);p.team=1;e.team=0;
  g.cast(0,e);g.step(.4);
  const effect=g.effects.find(f=>f.visual==='frostNova');
  assert.ok(effect);assert.equal(effect.team,1);assert.equal(effect.sourceId,p.id);
});

test('Shackleshot remains visible until its actual arrival time',()=>{
  const {g,p,e}=arena('windranger',[1,0,0,0]);e.x=p.x+500;
  g.cast(0,e);g.step(.16);const spell=g.pendingSpells.find(s=>s.type==='shackle');
  g.step(spell.landAt-g.time-.01);
  assert.ok(g.pendingSpells.includes(spell));
  const fx=g.effects.find(f=>f.visual==='shackleShot');assert.ok(fx,'arrow must survive the last flight tick');
  assert.ok(Visuals.effectPose(fx,g.time,g.entities).progress>.9);
});

test('Crystal Clone disjoint stops the incoming Shackleshot visual',()=>{
  const {g,p,e}=arena('windranger',[1,0,0,0]);e.x=p.x+700;e.hasShard=true;
  g.cast(0,e);g.step(.16);const fx=g.effects.find(f=>f.visual==='shackleShot');assert.ok(fx);
  assert.equal(castExtraAbility(g,e,'crystal_maiden_crystal_clone',{x:e.x+1000,y:e.y}).ok,true);
  g.step(.21);assert.equal(g.pendingSpells.some(s=>s.type==='shackle'),false);
  assert.equal(Visuals.effectIsActive?.(fx,g),false,'disjointed arrow must stop drawing');
});

test('dispelled shackle rope cannot reappear for an unrelated stun',()=>{
  const {g,p,e,c}=arena('windranger',[1,0,0,0]);e.x=p.x+500;c.x=p.x+650;
  g.cast(0,e);g.step(.7);const fx=g.effects.find(f=>f.visual==='shackleLink');assert.ok(fx);
  assert.equal(Visuals.effectIsActive?.(fx,g),true);
  applyDispel(g,e,true);assert.equal(Visuals.effectIsActive?.(fx,g),false);
  applyStun(g,e,1,{id:'another-caster'});assert.equal(Visuals.effectIsActive?.(fx,g),false);
});

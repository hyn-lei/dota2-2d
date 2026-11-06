import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import { serializeMatch,parseMatch,restoreMatch } from '../src/game-save.js';
import { tickAttacks } from '../src/attack-projectiles.js';
import { physicalDamageMultiplier } from '../src/hero-stats.js';

for(const kind of ['tower','fountain','creep','neutral','hero'])test(`${kind} ranged attacks settle only at actual arrival`,()=>{
 const {g,p,e}=arena('windranger',[0,0,0,0]);e.x=p.x+600;
 const source=kind==='hero'?p:g._unit(kind,0,p.x,p.y,{range:700,damage:50,speed:0,attackCooldown:0,campCenter:{x:p.x,y:p.y}});
 source.attackCooldown=0;source.attackInterval=999;g.entities=[source,e,...(source===p?[]:[p])];g._index();
 const before=e.hp;assert.equal(g._attack(source,e),true);source.attackCooldown=999;
 const shot=g.pendingSpells.find(s=>s.type==='attack');assert.ok(shot);
 assert.equal(e.hp,before);assert.equal(g.effects.some(f=>f.visual==='attackImpact'),false);
 g.step(600/shot.speed-.05);assert.equal(e.hp,before);assert.ok(g.effects.some(f=>f.id===shot.visualId));
 g.step(.06);assert.ok(e.hp<before);assert.equal(g.pendingSpells.some(s=>s.type==='attack'),false);
 assert.ok(g.effects.some(f=>f.visual==='attackImpact'));const hp=e.hp;g.step(.1);assert.equal(e.hp,hp);
});
test('homing attack follows a moving target and keeps the rendered position equal to simulation',()=>{
 const {g,p,e}=arena('windranger',[0,0,0,0]);e.x=p.x+600;p.attackCooldown=0;g._attack(p,e);p.attackCooldown=999;g.step(.2);
 const shot=g.pendingSpells[0],hp=e.hp;e.x+=400;e.y+=300;g.step(.25);assert.equal(e.hp,hp);
 const fx=g.effects.find(f=>f.id===shot.visualId);assert.equal(fx.x,shot.x);assert.equal(fx.y,shot.y);assert.equal(fx.tx,e.x);assert.equal(fx.ty,e.y);
 g.step(.8);assert.ok(e.hp<hp);
});
for(const state of ['disjoint','invisible','invulnerable','dead','evasion'])test(`${state} target produces no ranged damage or on-hit effects`,()=>{
 const {g,p,e}=arena('windranger',[0,0,0,0]);e.x=p.x+600;p.inventory=['skadi'];g._refreshHero(p);p.attackCooldown=0;g._attack(p,e);p.attackCooldown=999;
 const hp=e.hp;
 if(state==='disjoint')e.projectileDisjoint=1;
 if(state==='invisible')e.statuses.hide={id:'hide',startedAt:0,until:99,invisible:true};
 if(state==='invulnerable')e.statuses.hide={id:'hide',startedAt:0,until:99,invulnerable:true};
 if(state==='dead')e.dead=true;
 if(state==='evasion'){e.evasion=100;g._random=()=>.5;}
 g.step(1);assert.equal(e.hp,hp);assert.equal(e.statuses['itemSlow:skadi'],undefined);assert.equal(g.effects.some(f=>f.visual==='attackImpact'),false);assert.equal(g.pendingSpells.length,0);
});
test('Skadi slow and lifesteal start at impact and armor is read at that moment',()=>{
 const {g,p,e}=arena('windranger',[0,0,0,0]);e.x=p.x+600;p.inventory=['skadi','lifesteal'];g._refreshHero(p);p.hp=100;p.hpRegen=0;p.attackCooldown=0;g._attack(p,e);p.attackCooldown=999;
 const shot=g.pendingSpells[0],damage=shot.result.damage;e.armor=20;g.step(.2);
 assert.equal(p.hp,100);assert.equal(e.statuses['itemSlow:skadi'],undefined);assert.equal(e.hp,4000);
 g.step(.4);assert.ok(Math.abs(4000-e.hp-damage*physicalDamageMultiplier(20))<.001);assert.ok(p.hp>100);assert.ok(e.statuses['itemSlow:skadi']);
});
test('a launched attack survives the attacker dying and resumes once from a save',()=>{
 const {g,p,e}=arena('windranger',[0,0,0,0]);e.x=p.x+600;p.attackCooldown=0;g._attack(p,e);p.attackCooldown=999;g.step(.2);
 const loaded=restoreMatch(parseMatch(serializeMatch(g))),enemy=loaded.entities.find(h=>h.id===e.id);loaded.setPaused(false);loaded.player.dead=true;loaded.player.respawnTimer=99;
 const before=enemy.hp;loaded.step(.4);assert.ok(enemy.hp<before);const after=enemy.hp;loaded.step(.1);assert.equal(enemy.hp,after);
});
test('two simultaneous shots retain their own proc decisions',()=>{
 const {g,p,e,c}=arena('windranger',[0,0,0,0]);e.x=p.x+500;c.x=p.x+550;p.attackCooldown=0;g._attack(p,e);p.attackCooldown=0;g._attack(p,c);p.attackCooldown=999;
 const first=g.pendingSpells[0],second=g.pendingSpells[1];assert.notEqual(first.result,second.result);assert.equal(e.hp,4000);assert.equal(c.hp,4000);
 g.time+=.6;tickAttacks(g);assert.ok(e.hp<4000&&c.hp<4000);assert.equal(g.pendingSpells.length,0);
});

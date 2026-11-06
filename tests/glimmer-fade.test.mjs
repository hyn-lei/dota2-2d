import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import { unitOpacity,unitVisuals } from '../src/combat-visuals.js';
function setup(){const a=arena('crystal_maiden',[0,0,0,0]);a.p.inventory=['glimmer_cape'];a.g._refreshHero(a.p);a.p.mana=a.p.maxMana;a.p.hpRegen=a.p.manaRegen=0;return a;}
test('Glimmer starts visible, fades over 0.5 seconds, then becomes invisible without adding fade delay twice',()=>{
 const {g,p,e}=setup();assert.equal(g.useItem(0,p).ok,true);const s=p.statuses['itemBuff:glimmer_cape'];assert.equal(s.startedAt,.5);assert.equal(s.until,5.5);assert.equal(unitOpacity(p,g.time),1);assert.equal(g.canSee(e,p),true);
 g.step(.25);assert.ok(Math.abs(unitOpacity(p,g.time)-.62)<.001);assert.equal(g.canSee(e,p),true);assert.ok(unitVisuals(p,g.time).includes('glimmer'));
 g.step(.25);assert.equal(g.canSee(e,p),false);assert.ok(Math.abs(unitOpacity(p,g.time)-.24)<1e-7);g.step(5.1);assert.equal(unitOpacity(p,g.time),1);assert.equal(unitVisuals(p,g.time).includes('glimmer'),false);
});
test('an attack breaks Glimmer visibility and re-fades for 0.5 seconds while its buff is still active',()=>{
 const {g,p,e}=setup();g.useItem(0,p);g.step(.6);assert.equal(g.canSee(e,p),false);p.attackCooldown=0;g._attack(p,e);p.attackCooldown=999;
 assert.equal(g.canSee(e,p),true);const s=p.statuses['itemBuff:glimmer_cape'];assert.ok(s);assert.equal(s.until,5.5);g.step(.25);assert.ok(unitOpacity(p,g.time)<1);g.step(.25);assert.equal(g.canSee(e,p),false);
});

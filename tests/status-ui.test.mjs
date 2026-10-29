import test from 'node:test';
import assert from 'node:assert/strict';
import { statusEffects } from '../src/status-ui.js';

test('status effects use simulation time and expire at their exact end', () => {
  const unit = { statuses: {
    slow: { id:'slow', name:'减速', description:'移动速度降低', startedAt:10, until:14, positive:false, icon:'snow' },
    haste: { id:'haste', name:'加速', startedAt:10, until:20, positive:true, icon:'boots' }
  } };
  const before = statusEffects(unit, 12);
  assert.deepEqual(before.map(effect => [effect.id, effect.remaining, effect.duration]), [
    ['slow', 2, 4], ['haste', 8, 10]
  ]);
  assert.deepEqual(statusEffects(unit, 12), before, 'paused simulation does not consume duration');
  assert.deepEqual(statusEffects(unit, 14).map(effect => effect.id), ['haste']);
  assert.deepEqual(statusEffects(unit, 20), []);
  assert.equal(unit.statuses.slow.until, 14, 'rendering does not mutate combat data');
});

test('explicit combat status overrides duplicate legacy state and keeps stacks', () => {
  const unit = {
    buffs:{stunUntil:18, slowUntil:17, bladeDance:true},
    statuses:{control:{id:'stun', name:'洪流眩晕', description:'无法移动、攻击或施法', startedAt:10, until:13, positive:false, icon:'torrent', stacks:3}}
  };
  const effects = statusEffects(unit, 11);
  assert.equal(effects.length, 2);
  assert.deepEqual(effects.find(effect => effect.id === 'stun'), {
    id:'stun', name:'洪流眩晕', description:'无法移动、攻击或施法', remaining:2,
    duration:3, positive:false, icon:'torrent', stacks:3
  });
  assert.equal(effects.some(effect => effect.id === 'bladeDance'), false);
  assert.equal(statusEffects(unit, 13).some(effect => effect.id === 'stun'), false,
    'expired authoritative status must not resurrect from a stale legacy mirror');
});

test('legacy effects describe actual timed combat flags without inventing passive buffs', () => {
  const effects = statusEffects({buffs:{rootUntil:9, hasteUntil:12, hungerUntil:11, spinUntil:8, bladeDance:true}}, 8);
  assert.deepEqual(effects.map(effect => effect.id), ['root', 'hunger', 'haste']);
  assert.equal(effects.find(effect => effect.id === 'root').positive, false);
  assert.equal(effects.find(effect => effect.id === 'haste').positive, true);
  assert.equal(effects.find(effect => effect.id === 'hunger').remaining, 3);
});

test('active channel, invulnerability and Aegis are visible from actual unit state', () => {
  const effects = statusEffects({
    channel:{id:'freezing_field', name:'极寒领域', startedAt:5, until:10},
    invulnerable:true, aegisUntil:40
  }, 7);
  assert.deepEqual(new Set(effects.map(effect => effect.id)), new Set(['channel', 'invulnerable', 'aegis']));
  assert.equal(effects.find(effect => effect.id === 'channel').remaining, 3);
  assert.equal(effects.find(effect => effect.id === 'channel').name, '极寒领域');
  assert.equal(effects.find(effect => effect.id === 'invulnerable').remaining, null);
  assert.equal(effects.find(effect => effect.id === 'aegis').remaining, 33);
});

test('omnislash and channel aliases do not create duplicate condition icons', () => {
  const effects = statusEffects({
    heroId:'juggernaut', invulnerable:true,
    buffs:{ultUntil:9},
    statuses:{omnislash:{id:'omnislash', name:'无敌斩', startedAt:7, until:9, positive:true, icon:'swords', flags:{invulnerable:true}}}
  }, 8);
  assert.equal(effects.length, 1);
  assert.equal(effects[0].id, 'invulnerable');
  assert.equal(effects[0].name, '无敌斩');
});

test('death replaces active effects, while no unit and a normal unit have no effects', () => {
  assert.deepEqual(statusEffects(null, 10), []);
  assert.deepEqual(statusEffects({buffs:{}}, 10), []);
  const effects = statusEffects({dead:true, respawnTimer:7, buffs:{slowUntil:30}}, 10);
  assert.deepEqual(effects.map(effect => [effect.id, effect.remaining]), [['dead', 7]]);
});

test('recall countdown and persistent explicit effects preserve their time semantics', () => {
  const recall = statusEffects({recallTimer:2.4}, 100)[0];
  assert.equal(recall.id, 'recall');
  assert.ok(Math.abs(recall.remaining-2.4)<1e-10);
  assert.equal(recall.duration, 3);
  const aura = statusEffects({statuses:{aura:{name:'光环', until:Infinity, positive:true, stacks:2}}}, 100)[0];
  assert.equal(aura.remaining, null);
  assert.equal(aura.duration, null);
  assert.equal(aura.stacks, 2);
});

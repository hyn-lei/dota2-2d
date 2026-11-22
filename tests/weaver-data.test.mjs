import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data.js';
import { calculateHeroStats } from '../src/hero-stats.js';
import { ABILITIES, INNATES, abilityAt, innateAt } from '../src/ability-data.js';
import { EXTRA_ABILITIES, applyUpgradeValues } from '../src/upgrade-data.js';
import { ATTACK_PROFILES } from '../src/attack-records.js';
import { BOT_DRAFT_PROFILES, DRAFT_ROLES, draftMatch, appendDraftHistory, validateMatchDraft } from '../src/bot-draft.js';

test('Weaver selection exposes official ranged agility stats and a playable four-skill kit', () => {
  assert.ok(HEROES.weaver, 'Weaver must be selectable');
  const stats = calculateHeroStats('weaver');
  assert.equal(stats.maxHp, 520);
  assert.equal(stats.maxMana, 315);
  assert.equal(stats.damageMin, 54);
  assert.equal(stats.damageMax, 60);
  assert.equal(stats.range, 425);
  assert.equal(stats.baseAttackTime, 1.8);
  assert.equal(stats.attackSpeed, 137);
  assert.equal(ATTACK_PROFILES.weaver.speed, 900);
  assert.equal(ATTACK_PROFILES.weaver.attackPoint, .55);
  assert.deepEqual(ABILITIES.weaver.map(a => a.id), [
    'weaver_the_swarm', 'weaver_shukuchi', 'weaver_geminate_attack', 'weaver_time_lapse',
  ]);
  assert.equal(abilityAt('weaver', 2, 1).kind, 'autocast');
  assert.equal(abilityAt('weaver', 2, 4).values.bonus_potency, 15);
});

test('Weaver rank, innate scaling and talent consumers preserve percentage and subtraction semantics', () => {
  assert.equal(INNATES.weaver.id, 'weaver_threads_of_fate');
  assert.equal(innateAt('weaver', 1).values.established_thread_break_distance, 900);
  assert.equal(innateAt('weaver', 30).values.established_thread_break_distance, 1190);
  assert.equal(innateAt('weaver', 1, [1]).values.damage_per_thread_hero, 15);
  assert.equal(INNATES.weaver.valuePercentages.damage_per_thread_hero, true);
  assert.equal(abilityAt('weaver', 1, 4, [6]).cooldown, 3);
  assert.equal(abilityAt('weaver', 2, 4, [4, 7]).values.bonus_damage, 125);
  assert.equal(abilityAt('weaver', 2, 4, [4, 7]).values.extra_attack, 2);
});

test('Weaver upgrade consumers apply Shard fields and retain the Scepter spell dependency', () => {
  const shukuchi = abilityAt('weaver', 1, 4, [], {shard:true});
  assert.equal(shukuchi.values.geminate_attack_mark_duration, 4.6);
  assert.equal(shukuchi.values.shukuchi_attack_mark_radius, 1200);
  assert.equal(shukuchi.values.shukuchi_attack_delay, .2);
  assert.equal(abilityAt('weaver', 0, 4, [], {shard:true}).values.shard_cooldown_reduction, 2);
  assert.equal(abilityAt('weaver', 2, 4, [], {shard:true}).values.shard_beetle_search_range, 1200);
  assert.equal(abilityAt('weaver', 3, 3, [], {scepter:true}).cooldown, 30);
  const ally = EXTRA_ABILITIES.weaver[0];
  assert.equal(ally.id, 'weaver_time_lapse_ally');
  assert.equal(ally.sourceID, 1915);
  assert.equal(ally.dependentOnAbility, 'weaver_time_lapse');
  assert.equal(ally.sharedCooldownAbility, 'weaver_time_lapse');
  assert.equal(ally.maxLevel, 3);
  assert.deepEqual(ally.manaCosts, [150,75,0]);
  assert.deepEqual(ally.cooldowns, [70,55,40]);
  assert.equal(ally.values.AbilityCastPoint[0], .3);
  const allyValues = {AbilityCooldown:40};
  applyUpgradeValues('weaver', ally.id, allyValues, 3, {scepter:true});
  assert.equal(allyValues.AbilityCooldown, 30);
});

test('Weaver can be human locked or drafted by rotating AI teams without losing balanced roles', () => {
  const locked = draftMatch({humanHeroIds:['weaver'], seed:42});
  validateMatchDraft(locked, ['weaver']);
  assert.equal(locked.allies[0].heroId, 'weaver');
  assert.ok(BOT_DRAFT_PROFILES.weaver.fits[DRAFT_ROLES.indexOf(locked.allies[0].role)] >= 4);
  let history = [], drafted = false;
  for (let round=0; round<12; round++) {
    const draft = draftMatch({humanHeroIds:['juggernaut'], seed:42, history});
    validateMatchDraft(draft, ['juggernaut']);
    const record = {allies:draft.allies.slice(1).map(h=>h.heroId), enemies:draft.enemies.map(h=>h.heroId)};
    drafted ||= [...record.allies,...record.enemies].includes('weaver');
    history = appendDraftHistory(history, record);
  }
  assert.ok(drafted, 'recent history must allow Weaver to enter the AI rotation');
});

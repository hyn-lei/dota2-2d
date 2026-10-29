import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const moduleUrl = new URL('../src/ability-data.js', import.meta.url);
const heroIds = { axe: 2, crystal_maiden: 5, juggernaut: 8, windranger: 21, kunkka: 23 };
const snapshots = Object.fromEntries(Object.entries(heroIds).map(([name, id]) => [name,
  JSON.parse(fs.readFileSync(new URL(`../docs/research/heroes/${id}.json`, import.meta.url), 'utf8')).result.data.heroes[0],
]));
const readModule = async () => {
  assert.ok(fs.existsSync(moduleUrl), 'The official ability data module must exist');
  return import(moduleUrl);
};

test('all twenty normal abilities retain official rank data and learning requirements', async () => {
  const { ABILITIES, abilityAt } = await readModule();
  const fields = { cooldowns: 'cooldowns', manaCosts: 'mana_costs', castRanges: 'cast_ranges', castPoints: 'cast_points', channelTimes: 'channel_times' };
  for (const [heroId, source] of Object.entries(snapshots)) {
    assert.equal(ABILITIES[heroId].length, 4);
    for (const [index, entry] of ABILITIES[heroId].entries()) {
      const original = source.abilities.find(a => a.name === entry.id);
      assert.ok(original && !original.ability_is_innate);
      assert.equal(entry.maxLevel, original.max_level);
      assert.deepEqual(entry.requiredLevels, index === 3 ? [6, 12, 18] : [1, 3, 5, 7]);
      for (const [field, sourceField] of Object.entries(fields)) assert.deepEqual(entry[field], original[sourceField], `${entry.id}.${field}`);
      for (const value of original.special_values) assert.deepEqual(entry.values[value.name], value.values_float, `${entry.id}.${value.name}`);
      for (let rank = 1; rank <= entry.maxLevel; rank++) {
        const result = abilityAt(heroId, index, rank);
        assert.equal(result.level, rank);
        for (const value of original.special_values) {
          const expected = value.values_float[Math.min(rank - 1, value.values_float.length - 1)] ?? 0;
          assert.equal(result.values[value.name], expected, `${entry.id}.${value.name} rank ${rank}`);
        }
      }
    }
  }
});

test('rank zero previews the next rank without granting a learned ability and ranks clamp safely', async () => {
  const { abilityAt } = await readModule();
  assert.equal(abilityAt('axe', 0, 0).level, 0);
  assert.equal(abilityAt('axe', 0, 0).values.bonus_armor, 12);
  assert.equal(abilityAt('axe', 0, -8).level, 0);
  assert.equal(abilityAt('axe', 3, 99).level, 3);
  assert.equal(abilityAt('axe', 3, 99).damage, 475);
  assert.equal(abilityAt('kunkka', 3, 2).damage, 475);
  assert.equal(abilityAt('juggernaut', 1, 3).duration, 22);
  assert.throws(() => abilityAt('unknown', 0, 1), RangeError);
  assert.throws(() => abilityAt('axe', 4, 1), RangeError);
});

test('real passive and autocast skills replace prototype active buttons', async () => {
  const { ABILITIES, abilityAt } = await readModule();
  assert.equal(ABILITIES.juggernaut[2].id, 'juggernaut_blade_dance');
  assert.equal(ABILITIES.juggernaut[2].kind, 'passive');
  assert.equal(ABILITIES.crystal_maiden[2].kind, 'passive');
  assert.equal(ABILITIES.axe[2].kind, 'passive');
  assert.equal(ABILITIES.kunkka[1].kind, 'autocast');
  assert.deepEqual(ABILITIES.windranger.map(a => a.id), ['windrunner_shackleshot', 'windrunner_powershot', 'windrunner_windrun', 'windrunner_focusfire']);
  assert.equal(abilityAt('axe', 1, 1).damageType, 'pure');
  assert.equal(abilityAt('axe', 2, 1).values.trigger_attacks, 7);
  assert.equal(abilityAt('axe', 2, 4).values.trigger_attacks, 4);
  assert.equal(abilityAt('juggernaut', 2, 4).values.blade_dance_crit_mult, 200);
});

test('talent labels and effects resolve from official bonuses without unresolved localization tokens', async () => {
  const { TALENTS, ABILITIES, INNATES } = await readModule();
  for (const [heroId, source] of Object.entries(snapshots)) {
    assert.equal(TALENTS[heroId].length, 8);
    for (const [index, talent] of TALENTS[heroId].entries()) {
      const original = source.talents[index];
      assert.equal(talent.id, original.name);
      assert.equal(talent.sourceID, original.id);
      assert.equal(talent.requiredLevel, [10, 15, 20, 25][Math.floor(index / 2)]);
      assert.doesNotMatch(talent.name, /\{s:|%[a-z_]+%/i);
      assert.ok(talent.effects.length, `${heroId}.${talent.id} must have an effect`);
      for (const effect of talent.effects.filter(e => e.abilityId)) {
        const ability = source.abilities.find(a => a.name === effect.abilityId);
        const special = ability.special_values.find(v => v.name === effect.field);
        const originalEffect = special.bonuses.find(b => b.name === talent.id);
        assert.equal(effect.value, originalEffect.value);
        assert.equal(effect.operation, originalEffect.operation);
      }
    }
    for (const entry of [...ABILITIES[heroId], INNATES[heroId]]) assert.doesNotMatch(entry.description, /\{s:|%[a-z_]+%/i);
  }
});

test('learned talents adjust runtime rank values, including subtraction, percentages, and zero-base bonuses', async () => {
  const { abilityAt, innateAt, talentStats } = await readModule();
  assert.equal(abilityAt('juggernaut', 1, 1, [0]).cooldown, 48);
  assert.equal(abilityAt('crystal_maiden', 1, 1, [2]).range, 700);
  assert.equal(abilityAt('kunkka', 0, 4, [2, 4]).damage, 400);
  assert.equal(abilityAt('kunkka', 0, 4, [2, 4]).values.stun_duration, 1.75);
  assert.equal(abilityAt('kunkka', 0, 4, [2, 4]).cooldown, 6);
  assert.equal(abilityAt('kunkka', 1, 1, [1]).values.movespeed_slow, -60);
  assert.equal(abilityAt('windranger', 3, 3, [5]).values.focusfire_damage_reduction, -15);
  assert.equal(abilityAt('windranger', 1, 4, [6]).values.max_execute_threshold, 16);
  assert.equal(abilityAt('juggernaut', 0, 4, [3, 3]).values.bonus_movespeed, 45, 'duplicate talent indices must not stack');
  assert.equal(innateAt('juggernaut', 10, [1]).values.stack_gain_time, 1);
  assert.deepEqual(talentStats('crystal_maiden', [0, 1]), { maxHp: 200, intelligence: 12 });
  assert.deepEqual(talentStats('axe', [4]), { strength: 15 });
  assert.deepEqual(talentStats('kunkka', [6]), { spellAoE: 100 });
});

test('innate per-hero-level scaling includes level one, as specified by Valve patch notes', async () => {
  const { innateAt } = await readModule();
  assert.equal(innateAt('kunkka', 1).cooldown, 50);
  assert.equal(innateAt('kunkka', 30).cooldown, 35.5);
  assert.equal(innateAt('kunkka', 1).values.movespeed_bonus, 8);
  assert.equal(innateAt('kunkka', 30).values.movespeed_bonus, 15.25);
  assert.equal(innateAt('crystal_maiden', 1).values.mana_multiplier, 32);
  assert.equal(innateAt('crystal_maiden', 20, [4]).values.mana_multiplier, 90);
  assert.equal(innateAt('juggernaut', 1).values.agi_bonus_pct_per_stack, 2.6);
  assert.equal(innateAt('juggernaut', 30).values.agi_bonus_pct_per_stack, 5.5);
  assert.equal(innateAt('axe', 1).values.armor_pct_as_strength, 50);
  assert.equal(innateAt('windranger', 1).values.max_movespeed, 600);
});

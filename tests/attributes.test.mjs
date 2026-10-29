import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HERO_STATS } from '../src/hero-data.js';
import { ITEMS, ITEM_BY_ID } from '../src/item-data.js';
import { calculateHeroStats, physicalDamageMultiplier, magicalDamageMultiplier } from '../src/hero-stats.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} ≈ ${expected}`);

test('all five level-one heroes reproduce official API health/mana/armor/regen', async () => {
  for (const [id, source] of Object.entries(HERO_STATS)) {
    const raw = JSON.parse(await readFile(new URL(`../docs/research/heroes/${source.dotaId}.json`, import.meta.url)));
    const official = raw.result.data.heroes[0];
    const hero = calculateHeroStats(id);
    near(hero.maxHp, official.max_health);
    near(hero.maxMana, official.max_mana);
    near(hero.armor, official.armor);
    near(hero.hpRegen, official.health_regen);
    near(hero.manaRegen, official.mana_regen);
    assert.equal(hero.range, official.attack_range);
    assert.equal(hero.speed, official.movement_speed);
    // Official API excludes universal damage and INT resistance from its display data.
    const universalBonus = id === 'windranger' ? 25.2 : 0;
    near(hero.damageMin, official.damage_min + universalBonus);
    near(hero.damageMax, official.damage_max + universalBonus);
    near(hero.magicResistance, 0.25 + official.int_base * 0.001);
  }
});

test('Kunkka level growth applies each attribute once before derived stats', () => {
  const h = calculateHeroStats('kunkka', 11);
  near(h.strength, 60); near(h.agility, 30); near(h.intelligence, 36);
  near(h.maxHp, 1440); near(h.maxMana, 507);
  near(h.damageMin, 90); near(h.damageMax, 96);
  near(h.armor, 7); near(h.attackSpeed, 130);
  near(h.attackInterval, 1.7 / 1.3);
  assert.deepEqual(h.attributes.strength, { base: 60, bonus: 0, total: 60, gain: 3.6 });
});

test('Universal Windranger gains damage from all three stats with 0.45 coefficient', () => {
  const base = calculateHeroStats('windranger');
  const equipped = calculateHeroStats('windranger', 1, ['circlet', 'gauntlets', 'slippers', 'mantle']);
  assert.equal(base.primaryAttribute, 'universal');
  near(base.damageMin, 49.2); near(base.damageMax, 61.2);
  near(equipped.damage - base.damage, 6.75);
  near(equipped.maxHp - base.maxHp, 110);
  near(equipped.maxMana - base.maxMana, 60);
});

test('items contribute attributes and independent bonuses without mutating inputs', () => {
  const inventory = ['arcane', ITEM_BY_ID.gauntlets, 'vitality', 'armor', 'gloves', 'boots'];
  const before = JSON.stringify(inventory);
  const h = calculateHeroStats('crystal_maiden', 1, inventory);
  near(h.maxHp, 810); near(h.maxMana, 435);
  near(h.damageMin, 58); near(h.armor, 12 + 2 / 3);
  near(h.attackSpeed, 136); near(h.speed, 325);
  near(h.magicResistance, 0.28);
  assert.equal(JSON.stringify(inventory), before);
});

test('Boots movement bonuses do not stack, while ordinary stat bonuses do', () => {
  const h = calculateHeroStats('axe', 1, ['boots', 'boots', 'gauntlets', 'gauntlets']);
  near(h.speed, 360); near(h.strength, 31);
});

test('actual item prices and bonuses match independently fetched official item data', async () => {
  const mapping = { bonus_strength:'strength', bonus_agility:'agility', bonus_intellect:'intelligence', bonus_all_stats:'allAttributes', bonus_damage:'damage', bonus_armor:'armor', bonus_movement_speed:'speed', bonus_attack_speed:'attackSpeed', bonus_speed:'attackSpeed', bonus_health:'maxHp', bonus_mana:'maxMana', bonus_max_mana_percentage:'maxManaPercent', bonus_health_regen:'hpRegen', bonus_mana_regen:'manaRegen' };
  assert.ok(ITEMS.length >= 30);
  for (const item of ITEMS) {
    const raw = JSON.parse(await readFile(new URL(`../docs/research/items/${item.dotaId}.json`, import.meta.url)));
    const official = raw.result.data.items[0];
    assert.equal(item.cost, official.item_cost, item.id);
    const expected = {};
    for (const value of official.special_values) if (mapping[value.name]) expected[mapping[value.name]] = value.values_float[0];
    assert.deepEqual(item.stats, expected, item.id);
  }
});

test('damage multipliers handle positive and negative armor and magic resistance', () => {
  near(physicalDamageMultiplier(0), 1);
  near(physicalDamageMultiplier(10), 0.625);
  near(physicalDamageMultiplier(-10), 1.375);
  near(magicalDamageMultiplier(0.28), 0.72);
  near(magicalDamageMultiplier(-0.2), 1.2);
});

test('hero BAT and base attack speed are distinct, and levels are bounded', () => {
  near(calculateHeroStats('juggernaut').attackInterval, 1.4 / 1.42);
  near(calculateHeroStats('windranger').attackInterval, 1.5 / 1.1);
  assert.equal(calculateHeroStats('axe', 0).level, 1);
  assert.equal(calculateHeroStats('axe', 99).level, 30);
  assert.throws(() => calculateHeroStats('unknown'), /Unknown hero/);
  assert.throws(() => calculateHeroStats('axe', 1, ['unknown']), /Unknown item/);
});

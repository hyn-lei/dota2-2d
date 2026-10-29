import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ITEMS, ITEM_BY_ID } from '../src/item-data.js';

test('current catalog includes all item families while obsolete compatibility entries stay out of the shop', () => {
  assert.ok(ITEMS.length >= 250, 'complete purchasable item and paid recipe catalog');
  for (const id of ['blink','overwhelming_blink','dagon_5','guardian_greaves','ultimate_scepter','ultimate_scepter_2','aghanims_shard','crellas_crozier','essence_distiller','consecrated_wraps','devastator']) {
    assert.ok(ITEMS.includes(ITEM_BY_ID[id]), id);
  }
  assert.equal(ITEM_BY_ID.quarterstaff.dotaId, 10);
  assert.equal(ITEM_BY_ID.quarterstaff.purchasable, false);
  assert.ok(!ITEMS.includes(ITEM_BY_ID.quarterstaff));
  assert.equal(ITEM_BY_ID.ward_dispenser?.purchasable, false);
  assert.ok(!ITEMS.includes(ITEM_BY_ID.ward_dispenser));
  assert.equal(ITEM_BY_ID.staffwizardry, ITEM_BY_ID.arcane);
});

test('recipes contain actual paid scrolls, preserve alternatives, and conserve the full price', () => {
  for (const item of ITEMS) {
    for (const parts of [item.components, ...(item.recipesAlternative || [])].filter(Boolean)) {
      assert.ok(parts.length, item.id);
      assert.ok(parts.every(id => ITEM_BY_ID[id] && id !== item.id), item.id);
      assert.equal(parts.reduce((sum, id) => sum + ITEM_BY_ID[id].cost, 0), item.cost, item.id);
    }
    if (item.recipeOnly) assert.deepEqual(item.stats, {}, item.id);
  }
  assert.ok(ITEM_BY_ID.power_treads?.recipesAlternative?.length >= 2);
  assert.deepEqual(ITEM_BY_ID.dagon_2?.components, ['dagon','recipe_dagon']);
});

test('stock, inventory charges and rechargeable ability charges retain distinct official values', () => {
  assert.equal(ITEM_BY_ID.aghanims_shard?.cost, 1400);
  assert.equal(ITEM_BY_ID.aghanims_shard?.initialStockTime, 990);
  assert.equal(ITEM_BY_ID.aghanims_shard?.initialStock, 0);
  assert.equal(ITEM_BY_ID.ward_observer?.charges, 1);
  assert.equal(ITEM_BY_ID.ward_observer?.initialStock, 2);
  assert.equal(ITEM_BY_ID.ward_observer?.maxStock, 4);
  assert.equal(ITEM_BY_ID.hand_of_midas?.abilityCharges, 2);
  assert.equal(ITEM_BY_ID.hand_of_midas?.chargeRestoreTime, 90);
  assert.equal(ITEM_BY_ID.consecrated_wraps?.abilityCharges, 3);
});

test('item levels select their own values, with level series retained for stateful effects', () => {
  assert.equal(ITEM_BY_ID.dagon_2?.mana, 140);
  assert.equal(ITEM_BY_ID.dagon_2?.cooldown, 24);
  assert.equal(ITEM_BY_ID.dagon_5?.values.damage, 800);
  assert.deepEqual(ITEM_BY_ID.black_king_bar?.valueLevels.duration, [9,8,7]);
  assert.equal(ITEM_BY_ID.blink?.range, 1200);
});

test('temporary effects are not granted as permanent equipment bonuses', () => {
  assert.equal(ITEM_BY_ID.swift_blink?.stats.agility, 25);
  assert.equal(ITEM_BY_ID.swift_blink?.stats.moveSpeedPct, undefined);
  assert.equal(ITEM_BY_ID.black_king_bar?.stats.magicResistance, undefined);
  assert.equal(ITEM_BY_ID.armlet?.stats.strength, undefined);
  assert.equal(ITEM_BY_ID.armlet?.stats.damage, 15);
  assert.equal(ITEM_BY_ID.moon_shard?.stats.attackSpeed, 140);
  assert.equal(ITEM_BY_ID.consecrated_wraps?.stats.magicResistance, 12);
});

test('every purchasable entry has readable Chinese data and a cached valid official icon', async () => {
  for (const item of ITEMS) {
    assert.match(item.name, /[\u4e00-\u9fff]/, item.id);
    assert.ok(Object.isFrozen(item) && Object.isFrozen(item.stats) && Object.isFrozen(item.values), item.id);
    const snapshot = JSON.parse(await readFile(new URL(`../docs/research/items/full/${item.dotaId}-schinese.json`, import.meta.url), 'utf8')).result.data.items[0];
    assert.equal(item.cost, snapshot.item_cost, item.id);
    const png = await readFile(new URL(`../${item.image}`, import.meta.url));
    assert.equal(png.readUInt32BE(0), 0x89504e47, item.id);
  }
});

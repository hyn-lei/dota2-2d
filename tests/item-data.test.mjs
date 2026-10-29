import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ITEMS, ITEM_BY_ID } from '../src/item-data.js';

const source = name => new URL(`../docs/research/items/${name}`, import.meta.url);
const legacyIds = {
  boots:29, blade:3, vitality:61, arcane:23, armor:9, relic:54, branch:16,
  gauntlets:13, slippers:14, mantle:15, circlet:20, belt:17, elvenskin:18,
  robe:19, ogreaxe:21, bladealacrity:22, gloves:25, chainmail:4, protection:12,
  attackblade:2, claymore:5, demonedge:51, quarterstaff:10, mithril:8,
  pointbooster:60, energy:59, regenring:27, sobi:28, healthring:56, voidstone:57, diadem:1122,
};

test('expanded catalog preserves every saved legacy item ID and its official identity', () => {
  for (const [id, dotaId] of Object.entries(legacyIds)) assert.equal(ITEM_BY_ID[id]?.dotaId, dotaId, id);
  assert.equal(ITEM_BY_ID.staffwizardry, ITEM_BY_ID.arcane);
  assert.equal(new Set(ITEMS.map(item => item.id)).size, ITEMS.length);
  assert.equal(new Set(ITEMS.map(item => item.dotaId)).size, ITEMS.length);
  assert.ok(ITEMS.length >= 250);
  for (const item of ITEMS) {
    assert.ok(['attributes','equipment','secret','upgrades','recipes'].includes(item.category), item.id);
    assert.equal(typeof item.secretShop, 'boolean', item.id);
    assert.match(item.name, /[\u4e00-\u9fff]/, item.id);
    assert.ok(Object.isFrozen(item.stats), item.id);
  }
});

test('the six retained early upgrade recipes reproduce the official item list and shipped scroll costs', async () => {
  const list = JSON.parse(await readFile(source('itemlist.json'), 'utf8')).result.data.itemabilities;
  const raw = await readFile(source('items.txt'), 'utf8');
  const upgrades = ['bracer','wraith_band','null_talisman','oblivion_staff','perseverance','soul_booster'].map(id => ITEM_BY_ID[id]);
  assert.equal(upgrades.length, 6);
  for (const item of upgrades) {
    const official = list.find(entry => entry.id === item.dotaId);
    const recipe = list.find(entry => entry.name === official.name.replace('item_', 'item_recipe_'));
    const block = new RegExp(`"${recipe.name}"\\s*\\{([\\s\\S]*?)"ItemRequirements"`).exec(raw)?.[1];
    assert.ok(block, `${item.id}: shipped recipe block`);
    const scrollCost = Number(/"ItemCost"\s*"(\d+)"/.exec(block)?.[1]);
    assert.ok(Number.isFinite(scrollCost), `${item.id}: scroll cost`);
    const components = item.components.map(id => {
      assert.ok(ITEM_BY_ID[id], `${item.id}: component ${id} exists`);
      assert.notEqual(id, item.id);
      return ITEM_BY_ID[id];
    });
    assert.deepEqual(components.filter(part => !part.recipeOnly).map(part => part.dotaId), recipe.recipes[0].items, item.id);
    assert.equal(components.reduce((sum, part) => sum + part.cost, 0), item.cost, `${item.id}: full price`);
    const scrolls = components.filter(part => part.recipeOnly);
    assert.equal(scrolls.length, scrollCost > 0 ? 1 : 0, item.id);
    if (scrollCost > 0) {
      assert.equal(scrolls[0].dotaId, recipe.id);
      assert.equal(scrolls[0].cost, scrollCost);
      assert.deepEqual(scrolls[0].stats, {});
      assert.equal(scrolls[0].category, 'recipes');
    }
    assert.ok(Object.isFrozen(item.components), item.id);
  }
});

test('secret shop access flags match Valve item scripts, including ordinary-quality rings', async () => {
  const raw = (await readFile(source('items.txt'), 'utf8')).replace(/\/\/[^\n]*/g, '');
  const list = JSON.parse(await readFile(source('itemlist.json'), 'utf8')).result.data.itemabilities;
  for (const item of ITEMS) {
    const official = list.find(entry => entry.id === item.dotaId);
    const block = new RegExp(`^\\s*"${official.name}"\\s*\\{([\\s\\S]*?)(?=^\\s*"AbilityValues"|^\\s*"ItemRequirements"|^\\t\\})`, 'm').exec(raw)?.[1];
    assert.ok(block, item.id);
    assert.equal(item.secretShop, /"SecretShop"\s*"1"/.test(block), item.id);
  }
});

test('Null Talisman retains its official percent mana bonus instead of silently dropping it', async () => {
  const official = JSON.parse(await readFile(source('77.json'), 'utf8')).result.data.items[0];
  const percent = official.special_values.find(value => value.name === 'bonus_max_mana_percentage').values_float[0];
  assert.equal(ITEM_BY_ID.null_talisman?.stats.maxManaPercent, percent);
  assert.match(ITEM_BY_ID.null_talisman.description, /3%/);
});

test('every catalog entry has a local official PNG and the obsolete unavailable-active marker is removed', async () => {
  for (const item of ITEMS) {
    assert.match(item.image, /^assets\/items\/[a-z_0-9]+\.png$/, item.id);
    const image = await readFile(new URL(`../${item.image}`, import.meta.url));
    assert.equal(image.readUInt32BE(0), 0x89504e47, item.id);
    assert.ok(image.readUInt32BE(16) >= 80 && image.readUInt32BE(20) >= 60, item.id);
  }
  assert.deepEqual(ITEMS.filter(item => item.unimplementedActive).map(item => item.id), []);
});

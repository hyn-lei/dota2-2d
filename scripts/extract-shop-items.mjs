// Rebuild the supported catalog from retained Valve datafeed + shipped KV snapshots.
// node scripts/extract-shop-items.mjs          (offline, deterministic)
// node scripts/extract-shop-items.mjs --fetch  (refresh selected Chinese responses + official PNGs)
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const retrieved = '2026-10-26';
const sourceRoot = new URL('../docs/research/items/', import.meta.url);
const projectRoot = new URL('../', import.meta.url);
const artRoot = 'https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/items/';
// The first 31 IDs are saved-game compatibility keys from the original catalog.
const definitions = [
  ['boots',29,'boots','#bc9b73'], ['blade',3,'sword','#b6c1c0'],
  ['vitality',61,'heart','#b66058'], ['arcane',23,'staff','#7eb2c4'],
  ['armor',9,'shield','#8d9caa'], ['relic',54,'relic','#d5b16d'],
  ['branch',16,'staff','#a9b780'], ['gauntlets',13,'heart','#b66058'],
  ['slippers',14,'boots','#90b67e'], ['mantle',15,'staff','#7eb2c4'],
  ['circlet',20,'relic','#d1bb81'], ['belt',17,'heart','#b66058'],
  ['elvenskin',18,'boots','#90b67e'], ['robe',19,'staff','#7eb2c4'],
  ['ogreaxe',21,'axe','#b66058'], ['bladealacrity',22,'sword','#90b67e'],
  ['gloves',25,'swords','#bdaa7d'], ['chainmail',4,'shield','#8d9caa'],
  ['protection',12,'shield','#8d9caa'], ['attackblade',2,'sword','#b6c1c0'],
  ['claymore',5,'sword','#b6c1c0'], ['demonedge',51,'sword','#c67870'],
  ['quarterstaff',10,'staff','#c0a079'], ['mithril',8,'axe','#b6c1c0'],
  ['pointbooster',60,'relic','#b696c0'], ['energy',59,'staff','#7eb2c4'],
  ['regenring',27,'heart','#a0b97e'], ['sobi',28,'staff','#7eb2c4'],
  ['healthring',56,'heart','#a0b97e'], ['voidstone',57,'staff','#7eb2c4'],
  ['diadem',1122,'relic','#d1bb81'],
  ['blitz_knuckles',485,'swords','#bdaa7d'], ['hyperstone',55,'swords','#bdaa7d'],
  ['ultimate_orb',24,'relic','#d1bb81'], ['ring_of_tarrasque',279,'heart','#a0b97e'],
  ['bracer',73,'heart','#b66058'], ['wraith_band',75,'boots','#90b67e'],
  ['null_talisman',77,'staff','#7eb2c4'], ['oblivion_staff',67,'staff','#7eb2c4'],
  ['perseverance',69,'relic','#a0b97e'], ['soul_booster',129,'relic','#b696c0'],
  ['recipe_bracer',72,'relic','#d1bb81'], ['recipe_wraith_band',74,'relic','#d1bb81'],
  ['recipe_null_talisman',76,'relic','#d1bb81'],
];
const legacyDotaIds = new Set(definitions.slice(0,31).map(([,id]) => id));
const fields = {
  bonus_strength:'strength', bonus_agility:'agility', bonus_intellect:'intelligence',
  bonus_all_stats:'allAttributes', bonus_damage:'damage', bonus_armor:'armor',
  bonus_movement_speed:'speed', bonus_attack_speed:'attackSpeed', bonus_speed:'attackSpeed',
  bonus_health:'maxHp', bonus_mana:'maxMana', bonus_health_regen:'hpRegen',
  bonus_mana_regen:'manaRegen', bonus_max_mana_percentage:'maxManaPercent',
};
const labels = {
  strength:'力量', agility:'敏捷', intelligence:'智力', allAttributes:'全属性',
  damage:'攻击力', armor:'护甲', speed:'移动速度', attackSpeed:'攻击速度',
  maxHp:'生命值', maxMana:'魔法值', hpRegen:'生命恢复/秒', manaRegen:'魔法恢复/秒',
  maxManaPercent:'最大魔法值',
};
function parseKV(raw) {
  const tokens = [...raw.replace(/\/\/[^\n]*/g,'').matchAll(/"((?:\\.|[^"\\])*)"|([{}])/g)].map(match => match[2] || match[1]);
  let cursor = 0;
  function object() {
    const result = {};
    while (cursor < tokens.length) {
      const key = tokens[cursor++];
      if (key === '}') return result;
      const value = tokens[cursor++];
      result[key] = value === '{' ? object() : value;
    }
    return result;
  }
  return object();
}
const list = JSON.parse(await readFile(new URL('itemlist.json', sourceRoot), 'utf8')).result.data.itemabilities;
const kv = parseKV(await readFile(new URL('items.txt', sourceRoot), 'utf8')).DOTAAbilities;
const snapshotName = id => `${id}${legacyDotaIds.has(id) ? '-schinese' : ''}.json`;
const apiURL = id => `https://www.dota2.com/datafeed/itemdata?language=schinese&item_id=${id}`;

if (process.argv.includes('--fetch')) {
  await Promise.all(definitions.map(async ([,id]) => {
    const response = await fetch(apiURL(id));
    if (!response.ok) throw new Error(`Item ${id}: HTTP ${response.status}`);
    const text = await response.text();
    if (JSON.parse(text).result?.data?.items?.[0]?.id !== id) throw new Error(`Missing item ${id}`);
    await writeFile(new URL(snapshotName(id), sourceRoot), text);
  }));
}

const byDotaId = new Map(definitions.map(([id,dotaId]) => [dotaId,id]));
const byOfficialName = new Map(definitions.map(([id,dotaId]) => [list.find(entry => entry.id === dotaId)?.name,id]));
const records = [];
const scriptRecords = {};
for (const [id,dotaId,icon,color] of definitions) {
  const official = JSON.parse(await readFile(new URL(snapshotName(dotaId), sourceRoot), 'utf8')).result.data.items[0];
  const script = kv[official.name];
  if (!script || script.ItemPurchasable === '0' || script.ItemObsolete === '1') throw new Error(`${id}: unavailable item`);
  if (Number(script.ItemCost) !== official.item_cost) throw new Error(`${id}: API/KV price mismatch`);
  const stats = {};
  for (const value of official.special_values) {
    if (fields[value.name]) stats[fields[value.name]] = value.values_float[0];
    else if (id !== 'branch' && value.name.startsWith('bonus_') && value.values_float.some(Boolean)) {
      throw new Error(`${id}: unsupported bonus ${value.name}`);
    }
  }
  const recipeOnly = script.ItemRecipe === '1';
  const secretShop = script.SecretShop === '1';
  const recipeName = official.name.replace('item_', 'item_recipe_');
  const recipe = list.find(entry => entry.name === recipeName);
  let components;
  if (!recipeOnly && recipe?.recipes.length) {
    components = recipe.recipes[0].items.map(part => {
      const stableId = byDotaId.get(part);
      if (!stableId) throw new Error(`${id}: missing component ${part}`);
      return stableId;
    });
    if (Number(kv[recipeName].ItemCost) > 0) {
      const scrollId = byDotaId.get(recipe.id);
      if (!scrollId) throw new Error(`${id}: missing recipe scroll`);
      components.push(scrollId);
    }
  }
  const category = recipeOnly ? 'recipes' : components ? 'upgrades' : secretShop ? 'secret'
    : Object.keys(stats).some(key => ['strength','agility','intelligence','allAttributes'].includes(key)) ? 'attributes' : 'equipment';
  const statDescription = Object.entries(stats).map(([key,value]) => `${labels[key]} +${value}${key === 'maxManaPercent' ? '%' : ''}`).join(' · ');
  const recipeFor = recipeOnly ? byOfficialName.get(script.ItemResult) : undefined;
  const description = recipeOnly ? `用于合成${records.find(record => record.id === recipeFor)?.name || ''}，不提供属性加成。`
    : `${statDescription}${id === 'boots' ? ' · 多个鞋类物品的移动速度加成不叠加。' : id === 'branch' ? ' · 主动：种树（暂未实装）。' : ''}`;
  records.push({
    id,dotaId,name:official.name_loc,en:list.find(entry => entry.id === dotaId).name_english_loc,
    icon,color,cost:official.item_cost,stats,description,category,secretShop,
    image:`assets/items/${official.name.slice(5)}.png`,
    ...(components ? {components} : {}), ...(recipeOnly ? {recipeOnly:true,recipeFor} : {}),
    ...(id === 'boots' ? {movementGroup:'boots'} : {}),
    ...(id === 'branch' ? {unimplementedActive:'Plant Tree'} : {}),
  });
  scriptRecords[official.name] = Object.fromEntries(['ItemCost','ItemRecipe','ItemResult','ItemRequirements','SecretShop','AbilityBehavior','AbilityValues'].filter(key => script[key] !== undefined).map(key => [key,script[key]]));
  if (components) scriptRecords[recipeName] = kv[recipeName];
}
for (const record of records.filter(item => item.components)) {
  const total = record.components.reduce((sum,id) => sum + records.find(item => item.id === id).cost, 0);
  if (total !== record.cost) throw new Error(`${record.id}: recipe price ${total} != ${record.cost}`);
}
await mkdir(new URL('assets/items/', projectRoot), {recursive:true});
const artManifest = await Promise.all(records.map(async item => {
  // Valve uses the shared scroll art; item-specific recipe PNG URLs return 404.
  const source = `${artRoot}${item.recipeOnly ? 'recipe' : item.image.split('/').at(-1).replace('.png','')}.png`;
  const file = new URL(item.image, projectRoot);
  let exists = true;
  try { await access(file); } catch { exists = false; }
  if (!exists && !process.argv.includes('--fetch')) throw new Error(`Missing ${item.image}; run with --fetch once.`);
  if (!exists) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${item.id} icon: HTTP ${response.status}`);
    const image = Buffer.from(await response.arrayBuffer());
    if (image.readUInt32BE(0) !== 0x89504e47) throw new Error(`${item.id}: invalid PNG`);
    await writeFile(file,image);
  }
  const image = await readFile(file);
  return {id:item.id,file:item.image,source,sha256:createHash('sha256').update(image).digest('hex')};
}));
const meta = {
  patch:'7.41f',retrieved,source:apiURL('{id}'),
  scope:'44 supported shop entries: 35 basic components, 6 upgrades, 3 recipe scrolls. Null Talisman includes maxManaPercent. Iron Branch Plant Tree is not implemented.',
};
const output = `// Generated by scripts/extract-shop-items.mjs from Valve snapshots. See docs/item-shop-sources.md.\n// Legacy prototype IDs remain stable; recipe scrolls have no stats.\nconst definitions = [\n${records.map(record => `  ${JSON.stringify(record)},`).join('\n')}\n];\nexport const ITEM_DATA_META = Object.freeze(${JSON.stringify(meta)});\nexport const ITEMS = Object.freeze(definitions.map(item => Object.freeze({\n  ...item, stats:Object.freeze(item.stats),\n  ...(item.components ? {components:Object.freeze(item.components)} : {}),\n})));\nexport const ITEM_BY_ID = Object.freeze(Object.fromEntries([\n  ...ITEMS.map(item => [item.id,item]),\n  ['staffwizardry',ITEMS.find(item => item.id === 'arcane')],\n]));\n`;
await writeFile(new URL('src/item-data.js', projectRoot), output);
await writeFile(new URL('shop-items-script.json', sourceRoot), JSON.stringify(scriptRecords,null,2)+'\n');
await writeFile(new URL('shop-icons.json', sourceRoot), JSON.stringify({retrieved,items:artManifest},null,2)+'\n');
console.log(`Generated ${records.length} shop entries (${records.filter(item => item.components).length} upgrades), ${artManifest.length} local official icons.`);

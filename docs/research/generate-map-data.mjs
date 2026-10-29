import assert from 'node:assert/strict';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const research = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(research, '../..');
const json = async name => JSON.parse(await readFile(path.join(research, name), 'utf8'));
const text = await readFile(path.join(research, 'extractor-741_data.log'), 'utf8');

function arrays(value) {
  if (value === null || typeof value !== 'object') return value;
  const keys = Object.keys(value);
  if (keys.length && keys.every(key => /^\d+$/.test(key))) {
    return keys.sort((a, b) => +a - +b).map(key => arrays(value[key]));
  }
  return Object.fromEntries(keys.map(key => [key, arrays(value[key])]));
}

// Parse the original extractor's indentation-based Lua table dump.
const sections = {};
let current, filename, stack = [], awaitingFilename = false;
for (const line of text.split(/\r?\n/)) {
  if (line === '[start]') {
    current = {};
    stack = [{ indent: -1, node: current }];
    awaitingFilename = true;
    continue;
  }
  if (awaitingFilename) {
    filename = line;
    awaitingFilename = false;
    continue;
  }
  if (line === '[end]' && current) {
    sections[filename] = arrays(current);
    current = undefined;
    continue;
  }
  if (!current) continue;
  const match = /^(\s*)([^:]+):\s*(.*)$/.exec(line);
  if (!match) continue;
  const indent = match[1].length, key = match[2], value = match[3];
  while (stack.at(-1).indent >= indent) stack.pop();
  const parent = stack.at(-1).node;
  if (value === '') {
    parent[key] = {};
    stack.push({ indent, node: parent[key] });
  } else {
    parent[key] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  }
}

const raw = sections['mapdata.json'].data;
const map = (await json('leamare-mapdata.json')).data;
const camps = (await json('camp_zones.json')).camps;
const sourceWorld = sections['worlddata.json'];
assert.deepEqual(sourceWorld, { worldMinY: -10464, worldMaxX: 10400, worldMaxY: 10400, worldMinX: -10464 });
const point = (x, y) => ({ x: x + 10464, y: 10400 - y });
const laneIds = ['top', 'mid', 'bot'];
const routes = (await json('leamare-path_corner.json')).features;
const spawns = (await json('leamare-npc_dota_spawner.json')).features;
const teamLanes = [[], []], laneSpawns = [[], []];
for (let team = 0; team < 2; team++) {
  for (let lane = 0; lane < 3; lane++) {
    const id = `npc_dota_spawner_${team ? 'bad' : 'good'}_${laneIds[lane]}`;
    const spawn = spawns.find(item => item.id === id);
    const route = routes.find(item => item.id === id);
    assert.ok(spawn && route, `Missing lane ${id}`);
    laneSpawns[team][lane] = point(...spawn.geometry.coordinates);
    teamLanes[team][lane] = [laneSpawns[team][lane], ...route.geometry.coordinates.map(pair => point(...pair))];
  }
}

const types = {
  npc_dota_tower: 'tower', npc_dota_barracks: 'barracks',
  npc_dota_fort: 'ancient', ent_dota_fountain: 'fountain', npc_dota_filler: 'filler'
};
const buildings = [];
for (const [sourceType, kind] of Object.entries(types)) {
  for (const item of raw[sourceType]) {
    const tier = kind === 'tower' ? Number(/tower(\d)/.exec(item.name)[1]) : null;
    const laneTag = /(top|mid|bot)$/.exec(item.name)?.[1] ?? null;
    buildings.push({
      id: item.name, kind, sourceType, team: item.team - 2, sourceTeam: item.team,
      lane: tier === 4 || !laneTag ? null : laneIds.indexOf(laneTag),
      laneId: tier === 4 ? null : laneTag, sourceLaneTag: laneTag, tier,
      barracksType: kind === 'barracks' ? (item.name.includes('_melee_') ? 'melee' : 'ranged') : null,
      ...point(item.x, item.y), sourceX: item.x, sourceY: item.y,
      health: item.health, healthRegen: item.healthRegen ?? 0, armor: item.armor ?? 0,
      bounds: item.bounds, damageMin: item.damageMin ?? 0, damageMax: item.damageMax ?? 0,
      attackInterval: item.bat ?? 0, dayVision: item.dayVision, nightVision: item.nightVision
    });
  }
}
assert.equal(buildings.filter(item => item.kind === 'tower').length, 22);
assert.equal(buildings.filter(item => item.kind === 'barracks').length, 12);
for (const team of [0, 1]) {
  assert.equal(buildings.filter(item => item.team === team && item.kind === 'tower').length, 11);
  assert.equal(buildings.filter(item => item.team === team && item.kind === 'barracks').length, 6);
}
const bases = [0, 1].map(team => {
  const fountain = buildings.find(item => item.team === team && item.kind === 'fountain');
  return { x: fountain.x, y: fountain.y };
});

const campLayout = camps.map(camp => {
  const sourceX = camp.center.x - 16384, sourceY = camp.center.y - 16384;
  const match = map.npc_dota_neutral_spawner.filter(item => item.x === sourceX && item.y === sourceY);
  assert.equal(match.length, 1, `Camp ${camp.id} must match both sources exactly`);
  const source = match[0];
  const trigger = map.trigger_multiple.find(item => item.name === source.triggerName);
  assert.ok(trigger, `Camp ${camp.id} has a real spawn trigger`);
  return {
    id: `camp-${camp.id}`, campId: camp.id, sourceId: source.triggerName, type: camp.type,
    ...point(sourceX, sourceY), sourceX, sourceY,
    ownerTeam: camp.topology.owner_team - 2,
    lane: laneIds.indexOf(camp.topology.lane), laneId: camp.topology.lane,
    area: camp.topology.area, initialTier: Number(source.neutralType),
    spawnBox: trigger.points.map(({ x, y }) => point(x, y)),
    // These ellipses are gem's analysis regions, not Valve's spawn-block boxes.
    analysisZone: camp.zone
  };
});
assert.equal(campLayout.length, 28);
const trees = raw.ent_dota_tree.map(item => ({ ...point(item.x, item.y), z: item.z }));
assert.equal(trees.length, 2475);
const objectives = {};
for (const key of ['npc_dota_watch_tower', 'npc_dota_lantern', 'npc_dota_unit_twin_gate', 'npc_dota_xp_fountain', 'npc_dota_lotus_pool', 'npc_dota_roshan_spawner', 'npc_dota_miniboss_spawner', 'dota_item_rune_spawner_powerup', 'dota_item_rune_spawner_bounty', 'ent_dota_shop']) {
  objectives[key] = map[key].map((item, i) => ({ id: `${key}-${i}`, ...point(item.x, item.y), sourceX: item.x, sourceY: item.y }));
}

const pixelToUnit = 18322 / 8356;
const imageWidth = 8878 * pixelToUnit;
const imageRect = { x: 7487 - 16384 - 261 * pixelToUnit + 10464, y: 10400 - (26015 - 16384), width: imageWidth, height: 18322 };
const emit = (name, value) => `export const ${name} = ${JSON.stringify(value)};\n`;
let module = `/**\n * Data extracted from the Dota 2 7.41 map, with gameplay target 7.41f.\n * One game-world unit equals one Source 2 unit. X is right; Y is down.\n * Sources, licensing, exactness limits: docs/research/map-sources.md.\n * Generated by docs/research/generate-map-data.mjs; no positions are hand-placed.\n */\n`;
module += emit('MAP_VERSION', { gameplay: '7.41f', geometry: '7.41', extractedAt: '2026-04-03', verifiedAt: '2026-10-24', geometryVerifiedAgainstCurrentBinary: false });
module += emit('SOURCE_WORLD', { minX: -10464, maxX: 10400, minY: -10464, maxY: 10400 });
module += emit('WORLD', { width: 20864, height: 20864, unitsPerSourceUnit: 1 });
module += `export const sourceToWorld = (x, y) => ({ x: x + 10464, y: 10400 - y });\nexport const worldToSource = (x, y) => ({ x: x - 10464, y: 10400 - y });\n`;
module += emit('MAP_IMAGE', { url: 'assets/map-7.41.jpg', imageWidth: 8878, imageHeight: 8356, ...imageRect, worldRect: imageRect, unitsPerPixel: pixelToUnit, calibrationMaxErrorWorldUnits: 66, calibrationRmsPixels: 9, squareCropPixels: { x: 261, y: 0, width: 8356, height: 8356 }, source: 'https://github.com/whanyu1212/gem-dota/blob/main/assets/maps/Game_map_7.41.jpg' });
module += emit('LANE_IDS', laneIds);
module += emit('BASES', bases);
module += emit('TEAM_LANES', teamLanes);
module += `export const LANES = TEAM_LANES[0];\n`;
module += emit('LANE_SPAWNS', laneSpawns);
module += emit('BUILDING_LAYOUT', buildings);
module += emit('CAMP_LAYOUT', campLayout);
module += emit('TREES', trees);
module += emit('MAP_OBJECTIVES', objectives);
module += emit('RIVER_OUTLINE', (await json('map_constants.json')).regions.river_outline.map(([x, y]) => point(x - 16384, y - 16384)));
await writeFile(path.join(root, 'src/map-data.js'), module);

const cols = 327, rows = 327, blocked = new Uint8Array(cols * rows);
for (const item of sections['gridnavdata.json'].data) {
  const p = point(item.x, item.y), x = Math.round(p.x / 64), y = Math.round(p.y / 64);
  assert.ok(x >= 0 && x < cols && y >= 0 && y < rows);
  blocked[y * cols + x] = 1;
}
const blockedRows = Array.from({ length: rows }, (_, y) => Array.from(blocked.slice(y * cols, (y + 1) * cols)).join(''));
const blockedCount = blocked.reduce((sum, cell) => sum + cell, 0);
let navModule = `/**\n * 7.41 terrain traversal sample, exported by GridNav:IsTraversable.\n * Contains terrain only: overlay trees, buildings and moving units separately.\n * Row-major, Y down, cells centered on origin + index * 64.\n * blocked[y * cols + x] is '1' for untraversable terrain, '0' for traversable.\n * Original source: leamare/dota-map-coordinates/logs/741_data.log.\n * See docs/research/map-sources.md for 7.41f geometry limitations.\n */\nconst blocked = [\n${blockedRows.map(row => `  '${row}'`).join(',\n')}\n].join('');\n`;
navModule += `export const NAV_GRID = { cellSize: 64, cols: 327, rows: 327, origin: { x: 0, y: 0 }, originX: 0, originY: 0, terrainOnly: true, geometryVersion: '7.41', blockedCount: ${blockedCount}, blocked };\n`;
await writeFile(path.join(root, 'src/nav-data.js'), navModule);
await writeFile(path.join(research, 'buildings-7.41.json'), JSON.stringify(buildings, null, 2));
await writeFile(path.join(research, 'map-validation.json'), JSON.stringify({
  towers: 22, barracks: 12, ancients: 2, fountains: 2, fillerBuildings: 14,
  camps: 28, campsMatchingBothSourcesExactly: 28, trees: trees.length,
  laneRoutes: 6, cols, rows, blockedCount, originalBlockedPoints: sections['gridnavdata.json'].data.length,
  mapImageRect: imageRect
}, null, 2));
await copyFile(path.join(research, 'Game_map_7.41.jpg'), path.join(root, 'assets/map-7.41.jpg'));
console.log(JSON.stringify({ buildings: buildings.length, camps: campLayout.length, trees: trees.length, blockedCount, imageRect }));

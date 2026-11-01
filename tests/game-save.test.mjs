import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { TREES } from '../src/map-data.js';
import { cutTree, plantTree } from '../src/item-common.js';
import { arena } from './skill-arena.mjs';
import { tickBot } from '../src/bot-ai.js';

const saves = await import('../src/game-save.js').catch(() => ({}));
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};

test('saved progress retains economy, skill ranks, item metadata, timers and random seed', () => {
  assert.equal(typeof saves.serializeMatch, 'function', 'single match serialization must exist');
  const { g, p } = arena('ogre_magi', [2, 2, 3, 1]);
  g.time = 123.5; g.seed = 731; g.wave = 5; g.nextWave = 150;
  Object.assign(p, { level: 9, xp: 417, gold: 2345, inventory: ['magic_wand'], inventoryMeta: [{ uid: 'item-321', charges: 13, readyAt: 140 }], itemAttackProcs: new Set(['item-321']) });
  g.shopStocks = { '0:smoke_of_deceit': { available: 1, nextAt: Infinity } };
  // Non-mana units can acquire a NaN placeholder during the existing simulation.
  g.entities.find(e=>e.kind==='creep').mana=NaN;
  g.keyboard = { x: 1, y: 0 }; p.movementInput = { x: 1, y: 0 };
  const record = saves.parseMatch(saves.serializeMatch(g, 123456));
  const resumed = saves.restoreMatch(record);
  assert.equal(record.savedAt, 123456); assert.equal(resumed.time, 123.5); assert.equal(resumed.seed, 731);
  assert.equal(resumed.wave, 5); assert.equal(resumed.nextWave, 150);
  assert.equal(resumed.player.level, 9); assert.equal(resumed.player.xp, 417); assert.equal(resumed.player.gold, 2345);
  assert.deepEqual(resumed.player.abilityLevels, [2, 2, 3, 1]); assert.deepEqual(resumed.player.inventory, ['magic_wand']);
  assert.deepEqual(resumed.player.inventoryMeta, [{ uid: 'item-321', charges: 13, readyAt: 140 }]);
  assert.deepEqual(resumed.player.itemAttackProcs, new Set(['item-321'])); assert.equal(resumed.shopStocks['0:smoke_of_deceit'].nextAt, Infinity);
  assert.equal(Number.isNaN(resumed.entities.find(e=>e.kind==='creep').mana),true);
  assert.equal(resumed.paused, true); resumed.step(10); assert.equal(resumed.time, 123.5);
  assert.deepEqual(resumed.keyboard, { x: 0, y: 0 }); assert.deepEqual(resumed.player.movementInput, { x: 0, y: 0 });
  resumed.player.gold = 0; assert.equal(record.state.entities.find(e => e.isPlayer).gold, 2345);
});

test('Ogre pending multicasts finish with the same damage and one resource payment after restoration', () => {
  const { g, p, e } = arena('ogre_magi', [4, 1, 1, 3]);
  g.seed = 0; assert.equal(g.cast(0, e).ok, true); g.step(.5);
  assert.ok(g.pendingSpells.some(s => s.type === 'ogre:fireblast'));
  const resumed = saves.restoreMatch(saves.parseMatch(saves.serializeMatch(g)));
  resumed.setPaused(false); g.step(1.8); resumed.step(1.8);
  assert.equal(resumed.entities.find(unit => unit.id === e.id).hp, e.hp);
  assert.equal(resumed.player.mana, p.mana); assert.deepEqual(resumed.player.cooldowns, p.cooldowns);
  assert.equal(resumed.pendingSpells.length, g.pendingSpells.length);
});

test('restoration rebuilds real navigation for cut trees, planted trees and destroyed buildings', () => {
  const g = new Game({ hero: 'juggernaut' });
  cutTree(g, { ...TREES[0], treeIndex: 0 }); plantTree(g, { x: 7000, y: 7000 });
  const tower = g.entities.find(e => e.kind === 'tower' && e.team === 1); tower.dead = true; tower.hp = 0;
  g.navigation.updateBuildings(g.entities.filter(e => ['tower', 'barracks', 'ancient', 'fountain', 'filler'].includes(e.kind)));
  const resumed = saves.restoreMatch(saves.parseMatch(saves.serializeMatch(g)));
  assert.deepEqual(resumed.cutTrees, g.cutTrees); assert.deepEqual(resumed.plantedTrees, g.plantedTrees);
  assert.deepEqual(resumed.navigation.blocked, g.navigation.blocked); assert.ok(resumed.grid.size > 0);
  assert.equal(resumed.entities.find(e => e.id === tower.id).dead, true);
});

test('a saved dead hero resumes its existing respawn timer', () => {
  const g = new Game({ hero: 'ogre_magi' }); Object.assign(g.player, { dead: true, hp: 0, respawnTimer: 2 });
  const resumed = saves.restoreMatch(saves.parseMatch(saves.serializeMatch(g)));
  assert.equal(resumed.player.dead, true); assert.equal(resumed.player.respawnTimer, 2);
  resumed.setPaused(false); resumed.step(2.1); assert.equal(resumed.player.dead, false); assert.ok(resumed.player.hp > 0);
});

test('storage failure preserves the last good checkpoint and reports failure', () => {
  const s = storage(), g = new Game(); assert.equal(saves.storeMatch(s, g, 10).ok, true);
  const prior = s.getItem(saves.SAVE_KEY); g.time = 60;
  const denied = { getItem: s.getItem, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(saves.storeMatch(denied, g, 20).ok, false); assert.equal(s.getItem(saves.SAVE_KEY), prior);
  const result = saves.loadMatch(s); assert.equal(result.error, null); assert.equal(result.record.state.time, 0);
});

test('corrupted, incomplete or incompatible saves are rejected without deleting their bytes', () => {
  const g = new Game(), good = JSON.parse(saves.serializeMatch(g));
  for (const raw of ['{broken', JSON.stringify({ ...good, version: 999 }), JSON.stringify({ ...good, state: { ...good.state, entities: [] } }), JSON.stringify({ ...good, state: { ...good.state, nextWave: null } })]) {
    const s = storage(); s.setItem(saves.SAVE_KEY, raw); const result = saves.loadMatch(s);
    assert.equal(result.record, null); assert.ok(result.error); assert.equal(s.getItem(saves.SAVE_KEY), raw);
  }
  assert.equal(saves.loadMatch({ getItem: () => { throw new Error('SecurityError'); } }).record, null);
});

test('network matches and completed matches never overwrite a single-player checkpoint', () => {
  const s = storage(), g = new Game(); saves.storeMatch(s, g); const prior = s.getItem(saves.SAVE_KEY);
  g.isNetwork = true; assert.equal(saves.storeMatch(s, g).ok, false);
  g.isNetwork = false; g.status = 'won'; assert.equal(saves.storeMatch(s, g).ok, false);
  assert.equal(s.getItem(saves.SAVE_KEY), prior);
});

test('missing AI combat fields and malformed effects are rejected before entering a broken match', () => {
  for (const corrupt of [
    record => { delete record.state.entities.find(e => e.kind === 'hero' && !e.isPlayer).cooldowns; },
    record => { record.state.effects = [null]; },
    record => { record.state.pendingSpells = [null]; },
    record => { record.state.pendingSpells = [{type:'torrent',sourceId:record.state.entities.find(e=>e.isPlayer).id,x:1000,y:1000,landAt:0}]; },
    record => { record.state.camps = [null]; },
  ]) {
    const record = JSON.parse(saves.serializeMatch(new Game())); corrupt(record);
    const raw = JSON.stringify(record), s = storage(); s.setItem(saves.SAVE_KEY, raw);
    const loaded = saves.loadMatch(s);
    assert.equal(loaded.record === null, true); assert.ok(loaded.error); assert.equal(s.getItem(saves.SAVE_KEY), raw);
  }
});

test('a restored farming bot damages the real neutral and earns its bounty only once', () => {
  const g = new Game({ hero: 'juggernaut' });
  const bot = g.entities.find(e => e.kind === 'hero' && e.heroId === 'axe' && !e.isPlayer);
  Object.assign(g, { time: 91, nextWave: 200, nextNeutralSpawn: 200, nextBuildingCheck: 200, roshanRespawnAt: Infinity });
  g.entities = [g.player, bot]; Object.assign(g.player, { x: 12000, y: 12000 });
  Object.assign(bot, { x: 5000, y: 5000, level: 3, aiTimer: 10, targetId: null, destination: null, attackCooldown: 0 });
  const neutral = g._unit('neutral', 2, 5030, 5000, { maxHp: 1000, damage: 0, speed: 0, hpRegen: 0, armor: 0, attackCooldown: Infinity, ancient: false, goldMin: 10, goldMax: 10, xpBounty: 20 });
  neutral.hp = 20; g.entities.push(neutral); bot.botState = { mode: 'farm', nextMacroAt: 92.2, goal: neutral, targetId: null }; g._index();
  const resumed = saves.restoreMatch(saves.parseMatch(saves.serializeMatch(g))); resumed.setPaused(false);
  const farmer = resumed.entities.find(e => e.id === bot.id), target = resumed.entities.find(e => e.id === neutral.id);
  tickBot(resumed, farmer, .05);
  assert.equal(target.dead, true); assert.equal(farmer.xp, 20); assert.equal(farmer.lastHits, 1);
  resumed.time = 92.3; farmer.attackCooldown = 0; resumed._index(); tickBot(resumed, farmer, .05);
  assert.equal(farmer.xp, 20); assert.equal(farmer.lastHits, 1);
});

test('a real dropped item can be saved, restored and picked up with its original metadata', () => {
  const g=new Game(); assert.equal(g.buy('branch').ok,true);
  const uid=g.player.inventoryMeta[0].uid;
  assert.equal(g.dropItem('inventory',0,{x:g.player.x+10,y:g.player.y}).ok,true);
  g.step(.05);
  const resumed=saves.restoreMatch(saves.parseMatch(saves.serializeMatch(g)));
  const dropped=resumed.entities.find(e=>e.kind==='droppedItem');assert.ok(dropped);
  resumed.setPaused(false);assert.equal(resumed.pickupItem(dropped.id).ok,true);
  assert.deepEqual(resumed.player.inventory,['branch']);assert.equal(resumed.player.inventoryMeta[0].uid,uid);
});

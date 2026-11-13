import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { CoopGame } from '../server/coop-game.mjs';
import { NetworkGame } from '../src/network-game.js';
import { XP_TO_NEXT } from '../src/hero-stats.js';
import { createIllusions } from '../src/illusions.js';
import { grantTemporaryMana, spendMana, expireTemporaryMana } from '../src/mana-runtime.js';
import { serializeMatch, parseMatch, restoreMatch } from '../src/game-save.js';
import {
  canUseDeveloperMode, developerModeState, enableDeveloperMode, disableDeveloperMode,
  setDeveloperLevel, setDeveloperGold, setDeveloperRecovery,
} from '../src/developer-mode.js';

const off = { enabled: false, health: false, mana: false };
const on = { enabled: true, health: false, mana: false };
const unlock = game => assert.equal(enableDeveloperMode(game, '821027').ok, true);
function quietGame(hero = 'juggernaut') {
  const game = new Game({ hero, seed: 42 });
  game.entities = [game.player];
  game.nextWave = game.nextNeutralSpawn = game.roshanRespawnAt = Infinity;
  Object.assign(game.player, { x: 6000, y: 6000 });
  game._index();
  return game;
}

test('developer controls start locked and rejected passwords cannot mutate a hero', () => {
  const game = new Game(), hero = game.player;
  assert.deepEqual(developerModeState(game), off);
  for (const password of ['', '82102', '8210270', '000000', ' 821027', '821027 ', 821027, null]) {
    assert.equal(enableDeveloperMode(game, password).ok, false);
    assert.deepEqual(developerModeState(game), off);
    assert.equal(hero.gold, 600); assert.equal(hero.level, 1);
  }
  assert.equal(setDeveloperLevel(game, hero.id, 30).ok, false);
  assert.equal(setDeveloperGold(game, hero.id).ok, false);
  assert.equal(setDeveloperRecovery(game, hero.id, 'health', true).ok, false);
});

test('the correct password enables a paused solo match, grants 99999 gold and leaves recovery off', () => {
  const game = new Game(); game.setPaused(true); const before = game.time;
  unlock(game);
  assert.deepEqual(developerModeState(game), on);
  assert.equal(game.player.gold, 99999); assert.equal(game.player.level, 1);
  assert.equal(setDeveloperLevel(game, game.player.id, 10).ok, true);
  assert.equal(game.player.level, 10); assert.equal(game.time, before); assert.equal(game.paused, true);
  for (const difficulty of ['easy', 'normal', 'hard']) assert.equal(canUseDeveloperMode(new Game({ difficulty })), true);
});

test('a chosen level grants the same stats, skill points and talent unlocks as normal experience', () => {
  const game = new Game({ hero: 'ogre_magi' }), normal = new Game({ hero: 'ogre_magi' });
  game.player.xp = normal.player.xp = 117;
  unlock(game); assert.equal(setDeveloperLevel(game, game.player.id, 15).ok, true);
  normal._addXp(normal.player, XP_TO_NEXT.slice(1, 15).reduce((sum, xp) => sum + xp, 0) - 117);
  for (const key of ['level', 'xp', 'xpNext', 'maxHp', 'maxMana', 'damage', 'strength', 'agility', 'intelligence', 'skillPoints', 'talentPoints', 'abilityLevels', 'talents'])
    assert.deepEqual(game.player[key], normal.player[key], key);
  assert.equal(game.player.skillPoints, 15); assert.equal(game.player.talentPoints, 2);
});

test('level 30 is capped, retains independent player skill choices and does not grant duplicate points', () => {
  const game = new Game(); unlock(game);
  assert.equal(setDeveloperLevel(game, game.player.id, 30).ok, true);
  assert.equal(game.player.level, 30); assert.equal(game.player.xpNext, Infinity);
  assert.equal(game.player.skillPoints, 22); assert.equal(game.player.talentPoints, 8);
  assert.deepEqual(game.player.abilityLevels, [0, 0, 0, 0]);
  const before = [game.player.skillPoints, game.player.talentPoints, game.effects.length];
  assert.equal(setDeveloperLevel(game, game.player.id, 30).ok, true);
  assert.deepEqual([game.player.skillPoints, game.player.talentPoints, game.effects.length], before);
});

test('allied and enemy AI heroes can be upgraded independently with their normal automatic builds', () => {
  const game = new Game(), ally = game.entities.find(e => e.kind === 'hero' && e.team === 0 && !e.isPlayer), enemy = game.entities.find(e => e.kind === 'hero' && e.team === 1);
  unlock(game);
  assert.equal(setDeveloperLevel(game, ally.id, 15).ok, true);
  assert.equal(ally.level, 15); assert.equal(enemy.level, 1); assert.equal(game.player.level, 1);
  assert.ok(ally.abilityLevels.some(rank => rank > 1));
  assert.equal(setDeveloperLevel(game, enemy.id, 30).ok, true);
  assert.deepEqual(enemy.abilityLevels, [4, 4, 4, 3]); assert.equal(enemy.talents.length, 8);
  assert.equal(enemy.attributeBonusLevel, 7); assert.equal(enemy.skillPoints, 0);
  assert.equal(ally.level, 15); assert.equal(game.player.level, 1);
});

test('invalid levels and downgrades are rejected atomically, while the current level preserves partial XP', () => {
  const game = new Game(); unlock(game); setDeveloperLevel(game, game.player.id, 10); game.player.xp = 147;
  const before = [game.player.level, game.player.xp, game.player.skillPoints, game.player.talentPoints, game.effects.length];
  for (const level of [0, -1, 31, 100, 10.5, 9, NaN, Infinity, '15', null]) {
    assert.equal(setDeveloperLevel(game, game.player.id, level).ok, false);
    assert.deepEqual([game.player.level, game.player.xp, game.player.skillPoints, game.player.talentPoints, game.effects.length], before);
  }
  assert.equal(setDeveloperLevel(game, game.player.id, 10).ok, true);
  assert.equal(game.player.xp, 147);
});

test('gold is set to 99999 for the chosen real hero without granting it to the other AI', () => {
  const game = new Game(), enemy = game.entities.find(e => e.kind === 'hero' && e.team === 1), other = game.entities.find(e => e.kind === 'hero' && !e.isPlayer && e.id !== enemy.id);
  unlock(game); enemy.gold = 160000;
  assert.equal(setDeveloperGold(game, enemy.id).ok, true);
  assert.equal(enemy.gold, 99999); assert.equal(other.gold, 600);
  game.player.gold = 12; setDeveloperGold(game, game.player.id); assert.equal(game.player.gold, 99999);
});

test('heroes that are dead may be upgraded without changing death or respawn state', () => {
  const game = new Game(), hero = game.entities.find(e => e.kind === 'hero' && !e.isPlayer);
  Object.assign(hero, { dead: true, hp: 0, respawnTimer: 15 }); unlock(game);
  assert.equal(setDeveloperLevel(game, hero.id, 20).ok, true);
  assert.equal(hero.level, 20); assert.equal(hero.dead, true); assert.equal(hero.hp, 0); assert.equal(hero.respawnTimer, 15);
});

test('missing entities, buildings and illusions cannot be used as developer targets', () => {
  const game = new Game(); unlock(game);
  const clone = createIllusions(game, game.player, 1, 60, 33, 300)[0];
  const tower = game.entities.find(e => e.kind === 'tower');
  for (const id of ['missing-hero', tower.id, clone.id]) {
    assert.equal(setDeveloperLevel(game, id, 30).ok, false);
    assert.equal(setDeveloperGold(game, id).ok, false);
    assert.equal(setDeveloperRecovery(game, id, 'health', true).ok, false);
  }
  assert.equal(clone.level, 1); assert.equal(game.player.level, 1);
});

test('health and mana recovery work independently through the real simulation and can each be disabled', () => {
  const game = quietGame(), hero = game.player; unlock(game);
  Object.assign(hero, { hp: 100, mana: 20 });
  setDeveloperRecovery(game, hero.id, 'health', true);
  assert.equal(hero.hp, hero.maxHp); assert.equal(hero.mana, 20);
  Object.assign(hero, { hp: 100, mana: 20 }); game.step(.1);
  assert.equal(hero.hp, hero.maxHp); assert.ok(hero.mana > 20 && hero.mana < hero.maxMana);
  setDeveloperRecovery(game, hero.id, 'health', false); setDeveloperRecovery(game, hero.id, 'mana', true);
  Object.assign(hero, { hp: 100, mana: 20 }); game.step(.1);
  assert.ok(hero.hp > 100 && hero.hp < hero.maxHp); assert.equal(hero.mana, hero.maxMana);
  setDeveloperRecovery(game, hero.id, 'mana', false);
  Object.assign(hero, { hp: 100, mana: 20 }); game.step(.1);
  assert.ok(hero.hp < hero.maxHp); assert.ok(hero.mana < hero.maxMana); assert.deepEqual(developerModeState(game), on);
});

test('recovery flags are independent for each hero and invalid switches leave them unchanged', () => {
  const game = new Game(), ally = game.entities.find(e => e.kind === 'hero' && !e.isPlayer); unlock(game);
  setDeveloperRecovery(game, game.player.id, 'health', true); setDeveloperRecovery(game, ally.id, 'mana', true);
  assert.deepEqual(developerModeState(game), { enabled: true, health: true, mana: false });
  assert.deepEqual(developerModeState(game, ally.id), { enabled: true, health: false, mana: true });
  for (const [resource, enabled] of [['hp', true], ['health', 'false'], ['mana', 0]]) assert.equal(setDeveloperRecovery(game, ally.id, resource, enabled).ok, false);
  assert.deepEqual(developerModeState(game, ally.id), { enabled: true, health: false, mana: true });
});

test('recovery never revives a dead hero or cancels its respawn timer', () => {
  const game = quietGame(), hero = game.player; unlock(game);
  Object.assign(hero, { dead: true, hp: 0, respawnTimer: 10, mana: 10 });
  setDeveloperRecovery(game, hero.id, 'health', true); setDeveloperRecovery(game, hero.id, 'mana', true);
  game.step(.1);
  assert.equal(hero.dead, true); assert.equal(hero.hp, 0); assert.equal(hero.mana, 10);
  assert.ok(hero.respawnTimer > 9.8 && hero.respawnTimer < 10);
});

test('developer mana recovery preserves depleted temporary mana and its original expiry accounting', () => {
  const game = quietGame(), hero = game.player, normalMaximum = hero.maxMana; unlock(game);
  const status = hero.statuses.testMana = { until: 10 };
  grantTemporaryMana(hero, status, 170); spendMana(hero, 200);
  assert.equal(status.temporaryMana, 0);
  setDeveloperRecovery(game, hero.id, 'mana', true);
  assert.equal(hero.mana, normalMaximum); assert.equal(status.temporaryMana, 0); assert.equal(status.until, 10);
  disableDeveloperMode(game); expireTemporaryMana(hero, status); delete hero.statuses.testMana;
  assert.equal(hero.maxMana, normalMaximum); assert.equal(hero.mana, normalMaximum);
});

test('disabling removes every hero recovery flag, retains applied upgrades and requires the password again', () => {
  const game = quietGame(), hero = game.player; unlock(game);
  setDeveloperLevel(game, hero.id, 15); setDeveloperRecovery(game, hero.id, 'health', true); setDeveloperRecovery(game, hero.id, 'mana', true);
  disableDeveloperMode(game); assert.deepEqual(developerModeState(game), off);
  assert.equal(hero.level, 15); assert.equal(hero.gold, 99999);
  Object.assign(hero, { hp: 100, mana: 20 }); game.step(.1);
  assert.ok(hero.hp < hero.maxHp); assert.ok(hero.mana < hero.maxMana);
  assert.equal(setDeveloperLevel(game, hero.id, 30).ok, false);
  assert.equal(enableDeveloperMode(game, '000000').ok, false); unlock(game); assert.deepEqual(developerModeState(game), on);
});

test('saving and restoring retain applied level and gold but never restore developer mode or recovery', () => {
  const game = quietGame(); unlock(game); setDeveloperLevel(game, game.player.id, 20);
  setDeveloperRecovery(game, game.player.id, 'health', true); setDeveloperRecovery(game, game.player.id, 'mana', true);
  const record = parseMatch(serializeMatch(game)), restored = restoreMatch(record);
  assert.equal(restored.player.level, 20); assert.equal(restored.player.gold, 99999);
  assert.deepEqual(developerModeState(restored), off);
  Object.assign(restored.player, { hp: 100, mana: 20 }); restored.setPaused(false); restored.step(.1);
  assert.ok(restored.player.hp < restored.player.maxHp); assert.ok(restored.player.mana < restored.player.maxMana);
  assert.deepEqual(developerModeState(new Game()), off);
});

test('an ended game clears the session even while paused, and sessions never affect another match', () => {
  for (const status of ['won', 'lost']) {
    const game = new Game(); unlock(game); setDeveloperRecovery(game, game.player.id, 'health', true);
    assert.deepEqual(developerModeState(new Game()), off);
    game.status = status; game.setPaused(true); game.step(.05); game.status = 'playing';
    assert.deepEqual(developerModeState(game), off);
  }
});

test('multiplayer server games and clients reject developer controls, including rooms filled with AI', () => {
  assert.equal(canUseDeveloperMode(null), false); assert.equal(enableDeveloperMode(null, '821027').ok, false);
  const heroes = ['juggernaut', 'crystal_maiden', 'windranger', 'axe', 'kunkka'];
  const roster = heroes.map((heroId, index) => ({ heroId, clientId: 'human-' + index, name: 'Human ' + index }));
  for (const game of [new CoopGame(roster), new CoopGame(roster.slice(0, 1), { fillWithAI: true })]) {
    const before = game.player.gold;
    assert.equal(canUseDeveloperMode(game), false); assert.equal(enableDeveloperMode(game, '821027').ok, false);
    assert.equal(setDeveloperLevel(game, game.player.id, 30).ok, false); assert.equal(game.player.gold, before);
    let requests = 0;
    const client = new NetworkGame({ state: { entities: game.entities }, playerId: game.player.id, request: () => { requests++; } });
    assert.equal(enableDeveloperMode(client, '821027').ok, false);
    assert.equal(setDeveloperGold(client, client.player.id).ok, false); assert.equal(requests, 0);
  }
});

test('developer upgrades and recovery never synchronize into existing weak or strong illusions', () => {
  const game = quietGame(), hero = game.player; unlock(game);
  const copies = ['weak', 'strong'].map(type => createIllusions(game, hero, 1, 60, 33, 300, { type })[0]);
  const levels = copies.map(copy => [...copy.abilityLevels]);
  setDeveloperLevel(game, hero.id, 30); setDeveloperGold(game, hero.id); setDeveloperRecovery(game, hero.id, 'health', true);
  for (const copy of copies) copy.hp = 30;
  game.step(.05);
  for (const [index, copy] of copies.entries()) {
    assert.equal(copy.level, 1); assert.deepEqual(copy.abilityLevels, levels[index]);
    assert.ok(copy.hp < copy.maxHp); assert.equal(developerModeState(game, copy.id).health, false);
  }
});

import { Game } from './engine.js';
import { HEROES } from './data.js';
import { ITEM_BY_ID } from './item-data.js';
import { rebuildTrees } from './item-common.js';

export const SAVE_KEY = 'af-single-match-v1';
const VERSION = 1;
const RULESET = '7.41f';
const stateFields = new Set([
  'time', 'status', 'paused', 'winner', 'score', 'entities', 'effects', 'pendingSpells',
  'feed', 'wave', 'nextWave', 'difficulty', 'seed', 'serial', 'keyboard', 'camps',
  'nextNeutralSpawn', 'nextBuildingCheck', 'selectedId', 'heroChoice', 'roshanPit',
  'roshanRespawnAt', 'cutTrees', 'plantedTrees', 'shopStocks', 'itemZones', 'nextItemAuraAt',
]);
const tag = '$singleMatch';
const encode = value => {
  const definitions=value?.state?.entities,entities=new Set(definitions||[]);
  return JSON.stringify(value, function(key, entry) {
  if (key === 'navPath' || key === 'navGoal' || /cache/i.test(key) || typeof entry === 'function') return undefined;
  // Ground items cannot attack; the generic unit tick may set these unused fields to NaN.
  if(this?.kind==='droppedItem'&&['attackCooldown','attackFlash'].includes(key))return undefined;
  if(entities.has(entry)&&this!==definitions)return { [tag]: 'Entity', value: entry.id };
  if (entry instanceof Map) return { [tag]: 'Map', value: [...entry] };
  if (entry instanceof Set) return { [tag]: 'Set', value: [...entry] };
  if (entry === Infinity || entry === -Infinity) return { [tag]: String(entry) };
  if (typeof entry === 'number' && Number.isNaN(entry)) return { [tag]: 'NaN' };
  return entry;
  });
};
const decode = text => {
  const record=JSON.parse(text, (_key, entry) => {
  if (!entry || typeof entry !== 'object' || !(tag in entry)) return entry;
  if (entry[tag] === 'Infinity') return Infinity;
  if (entry[tag] === '-Infinity') return -Infinity;
  if (entry[tag] === 'NaN') return NaN;
  if (entry[tag] === 'Map' && Array.isArray(entry.value)) return new Map(entry.value);
  if (entry[tag] === 'Set' && Array.isArray(entry.value)) return new Set(entry.value);
  if (entry[tag] === 'Entity' && typeof entry.value === 'string') return entry;
  throw new Error('存档数据格式无效');
  });
  const entities=new Map((record?.state?.entities||[]).map(e=>[e?.id,e])),seen=new WeakSet();
  function bind(value){
    if(!value||typeof value!=='object')return value;
    if(value[tag]==='Entity'){
      const entity=entities.get(value.value);if(!entity)throw new Error('存档实体引用无效');return entity;
    }
    if(seen.has(value))return value;seen.add(value);
    if(value instanceof Map){for(const [key,entry]of value)value.set(key,bind(entry));}
    else if(value instanceof Set){const values=[...value].map(bind);value.clear();for(const entry of values)value.add(entry);}
    else for(const key of Object.keys(value))value[key]=bind(value[key]);
    return value;
  }
  return bind(record);
};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const timer=value=>typeof value==='number'&&value>=0;
function validHero(hero){
  return HEROES[hero.heroId]&&Number.isInteger(hero.level)&&hero.level>=1&&hero.level<=30&&
    ['gold','xp','mana'].every(key=>Number.isFinite(hero[key])&&hero[key]>=0)&&
    Array.isArray(hero.inventory)&&Array.isArray(hero.abilityLevels)&&hero.abilityLevels.length===4&&
    hero.abilityLevels.every(rank=>Number.isInteger(rank)&&rank>=0&&rank<=4)&&
    Array.isArray(hero.cooldowns)&&hero.cooldowns.length===4&&hero.cooldowns.every(timer);
}
const skillSpellTypes=new Set(['shackle','torrent','gale','tidal','ship','cannon','powershot','ogre:fireblast','ogre:igniteCast','ogre:ignite']);
function validSpell(spell){
  if(!object(spell)||typeof spell.sourceId!=='string'||!timer(spell.landAt))return false;
  if(spell.type==='ogre:shieldCounter')return typeof spell.targetId==='string'&&Number.isFinite(spell.x)&&Number.isFinite(spell.y)&&Number.isFinite(spell.damage)&&Number.isFinite(spell.speed)&&spell.speed>0;
  return skillSpellTypes.has(spell.type)&&object(spell.skill)&&object(spell.skill.values);
}

function validate(record) {
  if (record?.version !== VERSION || record.ruleset !== RULESET) throw new Error('上次存档与当前版本不兼容，原存档已保留');
  const s = record.state;
  if (!Number.isFinite(record.savedAt) || !s || Object.keys(s).some(key => !stateFields.has(key)) ||
      s.status !== 'playing' || s.winner !== null || typeof s.paused !== 'boolean' ||
      !HEROES[s.heroChoice] || !['easy', 'normal', 'hard', 'nightmare'].includes(s.difficulty) ||
      !Number.isFinite(s.time) || s.time < 0 || !Number.isInteger(s.seed) || s.seed < 0 || s.seed > 0xffffffff ||
      !Number.isInteger(s.serial) || s.serial < 0 || !Number.isInteger(s.wave) || s.wave < 0 ||
      ![1, 2].includes(s.roshanPit) || !Array.isArray(s.score) || s.score.length !== 2 || !s.score.every(Number.isFinite) ||
      !['entities', 'effects', 'pendingSpells', 'feed', 'camps'].every(key => Array.isArray(s[key])) ||
      !['nextWave', 'nextNeutralSpawn', 'nextBuildingCheck', 'roshanRespawnAt'].every(key => typeof s[key] === 'number' && s[key] >= 0) ||
      s.cutTrees !== undefined && !(s.cutTrees instanceof Map)) throw new Error('上次存档已损坏，原存档已保留');
  const ids = new Set();
  for (const unit of s.entities) {
    if (!unit || typeof unit.id !== 'string' || ids.has(unit.id) || !Number.isFinite(unit.x) || !Number.isFinite(unit.y) ||
        !Number.isFinite(unit.hp) || !Number.isFinite(unit.maxHp) || unit.isHuman ||
        (unit.kind==='droppedItem'? !ITEM_BY_ID[unit.itemId]||!object(unit.meta):!object(unit.buffs)||!object(unit.statuses)) ||
        unit.kind==='hero'&&!validHero(unit)) throw new Error('存档单位数据无效');
    ids.add(unit.id);
  }
  const players = s.entities.filter(e => e.isPlayer);
  if (players.length !== 1 || players[0].kind !== 'hero' || players[0].heroId !== s.heroChoice ||
      !validHero(players[0])) throw new Error('存档英雄数据无效');
  if(!s.effects.every(e=>object(e)&&typeof e.type==='string'&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&timer(e.life)&&
      (e.startedAt==null||Number.isFinite(e.startedAt)&&timer(e.maxLife)))||
    !s.pendingSpells.every(validSpell)||
    !s.camps.every(c=>object(c)&&typeof c.id==='string'&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&
      Number.isInteger(c.spawnCount)&&c.spawnCount>=0&&timer(c.nextSpawn))||
    !s.feed.every(e=>object(e)&&typeof e.text==='string'))throw new Error('存档战斗或地图数据无效');
  return record;
}

export function serializeMatch(game, savedAt = Date.now()) {
  if (game.isNetwork || game.status !== 'playing' || game.entities.some(e => e.isHuman)) throw new Error('只能保存正在进行的单机对局');
  const state = Object.fromEntries([...stateFields].filter(key => Object.hasOwn(game, key)).map(key => [key, game[key]]));
  const text = encode({ version: VERSION, ruleset: RULESET, savedAt, state });
  validate(decode(text));
  return text;
}

export function parseMatch(text) { return validate(decode(text)); }

export function restoreMatch(record) {
  const { state } = validate(decode(encode(record)));
  const game = new Game({ hero: state.heroChoice, difficulty: state.difficulty, seed: state.seed });
  Object.assign(game, state);
  game.clearMovement(game.player);
  game.setPaused(true);
  rebuildTrees(game);
  game._index();
  if (!game.entities.some(e => e.id === game.selectedId)) game.selectedId = game.player.id;
  return game;
}

export function loadMatch(storage) {
  let hasSave = false;
  try {
    const text = storage.getItem(SAVE_KEY);
    hasSave = Boolean(text);
    return { record: text ? parseMatch(text) : null, error: null, hasSave };
  } catch (error) { return { record: null, error: error.message || '无法读取浏览器存档', hasSave }; }
}

export function storeMatch(storage, game, savedAt = Date.now()) {
  try {
    const text = serializeMatch(game, savedAt);
    storage.setItem(SAVE_KEY, text);
    return { ok: true, savedAt };
  } catch { return { ok: false, reason: '自动存档失败：浏览器存储不可用或空间不足，之前的存档已保留' }; }
}

export function clearMatch(storage) {
  try { storage.removeItem(SAVE_KEY); return { ok: true }; }
  catch { return { ok: false, reason: '无法清除已结束的对局存档' }; }
}

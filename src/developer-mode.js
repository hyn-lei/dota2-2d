import { XP_TO_NEXT } from './hero-stats.js';
import { restoreMana } from './mana-runtime.js';
import {MAX_MATCH_MINUTES,rebaseMatchTime} from './match-clock.js';
export {MAX_MATCH_MINUTES} from './match-clock.js';

export const DEVELOPER_MAX_LEVEL = 30;
export const DEVELOPER_GOLD = 99999;
const password = '821027';
// Session controls belong to this game instance, never to a hero or a save.
const sessions = new WeakMap();
const fail = reason => ({ ok: false, reason });

export function canUseDeveloperMode(game) {
  return Boolean(game && !game.isNetwork && game.status === 'playing' &&
    Array.isArray(game.entities) && game.entities.some(e => e.kind === 'hero' && e.isPlayer) &&
    !game.entities.some(e => e.kind === 'hero' && e.isHuman));
}

function sessionOf(game) {
  const session = game && sessions.get(game);
  if (session && !canUseDeveloperMode(game)) {
    sessions.delete(game);
    return null;
  }
  return session;
}

export function developerModeState(game, heroId = game?.player?.id) {
  const session = sessionOf(game), recovery = session?.recovery.get(heroId);
  return { enabled: Boolean(session), health: Boolean(recovery?.health), mana: Boolean(recovery?.mana) };
}

export function enableDeveloperMode(game, input) {
  if (!canUseDeveloperMode(game)) return fail('仅能在进行中的单人人机对局开启');
  if (typeof input !== 'string' || input !== password) return fail('密码错误，请输入正确的 6 位数字密码');
  if (!sessionOf(game)) {
    sessions.set(game, { recovery: new Map() });
    game.player.gold = DEVELOPER_GOLD;
  }
  return { ok: true };
}

export function disableDeveloperMode(game) {
  if (game) sessions.delete(game);
  return { ok: true };
}

function targetHero(game, heroId) {
  const session = sessionOf(game);
  if (!session) return fail('请先开启开发者模式');
  const hero = game.entities.find(e => e.id === heroId && e.kind === 'hero');
  return hero ? { ok: true, hero, session } : fail('请选择当前对局中的英雄');
}

export function setDeveloperLevel(game, heroId, level) {
  const target = targetHero(game, heroId);
  if (!target.ok) return target;
  if (!Number.isInteger(level) || level < 1 || level > DEVELOPER_MAX_LEVEL)
    return fail(`请输入 1 至 ${DEVELOPER_MAX_LEVEL} 的整数等级`);
  const hero = target.hero;
  if (level < hero.level) return fail(`目标等级不能低于当前 ${hero.level} 级`);
  if (level > hero.level) {
    let experience = -hero.xp;
    for (let current = hero.level; current < level; current++) experience += XP_TO_NEXT[current];
    game._addXp(hero, experience);
  }
  return { ok: true, heroId, level: hero.level };
}

export function setDeveloperGold(game, heroId) {
  const target = targetHero(game, heroId);
  if (!target.ok) return target;
  target.hero.gold = DEVELOPER_GOLD;
  return { ok: true, heroId, gold: DEVELOPER_GOLD };
}

export function setDeveloperTime(game,minutes){
  if(!sessionOf(game))return fail('请先开启开发者模式');
  if(!Number.isFinite(minutes)||minutes<0||minutes>MAX_MATCH_MINUTES)return fail(`请输入 0 至 ${MAX_MATCH_MINUTES} 分钟的有效时间`);
  rebaseMatchTime(game,minutes*60);
  return {ok:true,minutes,time:game.time};
}

function recoverHero(hero, recovery) {
  if (hero.dead || hero.hp <= 0) return;
  if (recovery.health) hero.hp = hero.maxHp;
  // Preserve the existing temporary-mana pool and its expiry rules.
  if (recovery.mana) restoreMana(hero, hero.maxMana);
}

export function setDeveloperRecovery(game, heroId, resource, enabled) {
  const target = targetHero(game, heroId);
  if (!target.ok) return target;
  if (!['health', 'mana'].includes(resource) || typeof enabled !== 'boolean')
    return fail('回复开关无效');
  const recovery = { health: false, mana: false, ...target.session.recovery.get(heroId), [resource]: enabled };
  if (recovery.health || recovery.mana) target.session.recovery.set(heroId, recovery);
  else target.session.recovery.delete(heroId);
  if (enabled) recoverHero(target.hero, { [resource]: true });
  return { ok: true };
}

export function tickDeveloperMode(game) {
  const session = sessionOf(game);
  if (!session || !session.recovery.size) return;
  for (const hero of game.entities) {
    const recovery = hero.kind === 'hero' && session.recovery.get(hero.id);
    if (recovery) recoverHero(hero, recovery);
  }
}

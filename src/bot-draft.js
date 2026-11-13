import { HEROES } from './data.js';

export const DRAFT_HISTORY_LIMIT = 6;
export const DRAFT_ROLES = Object.freeze(['carry', 'mid', 'offlane', 'roamer', 'support']);

// Local AI heuristics, not Valve hero ratings. Fits follow the implemented kits.
export const BOT_DRAFT_PROFILES = Object.freeze({
  juggernaut:     { fits:[10,6,4,2,1], frontline:1, control:0, physical:3, spell:1, support:1 },
  crystal_maiden:{ fits:[1,4,1,9,10], frontline:0, control:2, physical:0, spell:3, support:3 },
  windranger:    { fits:[8,10,5,8,6], frontline:0, control:2, physical:3, spell:2, support:1 },
  axe:           { fits:[3,4,10,7,3], frontline:3, control:3, physical:1, spell:2, support:0 },
  ogre_magi:     { fits:[3,5,8,9,10], frontline:2, control:3, physical:1, spell:3, support:3 },
  kunkka:        { fits:[7,10,9,7,5], frontline:3, control:3, physical:2, spell:2, support:1 },
  drow_ranger:   { fits:[10,7,2,2,1], frontline:0, control:1, physical:3, spell:0, support:0 },
});

function profile(id) {
  if (BOT_DRAFT_PROFILES[id]) return BOT_DRAFT_PROFILES[id];
  // Newly playable heroes enter the pool immediately; explicit profiles refine fit.
  const hero = HEROES[id], ranged = hero.range > 200;
  const tank = hero.primaryAttribute === 'strength', support = /辅助|法师/.test(hero.role);
  return { fits:[support?4:8,ranged?8:6,tank?8:4,ranged?7:6,support?9:4], frontline:tank?2:0,
    control:1, physical:support?1:3, spell:support?3:1, support:support?3:1 };
}

const signature = ids => [...ids].sort().join(',');
const validIds = ids => Array.isArray(ids) && ids.every(id => Object.hasOwn(HEROES,id)) && new Set(ids).size === ids.length;

export function normalizeDraftHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter(record => record && validIds(record.allies) && record.allies.length <= 4 &&
    validIds(record.enemies) && record.enemies.length === 5)
    .slice(-DRAFT_HISTORY_LIMIT).map(record => ({allies:[...record.allies], enemies:[...record.enemies]}));
}

export function draftRecord(game) {
  const bots = game.entities.filter(hero => hero.kind === 'hero' && !hero.isPlayer && !hero.isHuman);
  return {allies:bots.filter(hero => hero.team === 0).map(hero => hero.heroId),
    enemies:bots.filter(hero => hero.team === 1).map(hero => hero.heroId)};
}

export function appendDraftHistory(history, record) {
  return normalizeDraftHistory([...normalizeDraftHistory(history), record]);
}

function randomSource(seed) {
  let state = seed >>> 0;
  // A separate stream keeps drafting from consuming combat's saved random seed.
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function combinations(pool, count) {
  const result = [];
  function visit(start, selected) {
    if (selected.length === count) { result.push([...selected]); return; }
    for (let index=start; index<=pool.length-(count-selected.length); index++) {
      selected.push(pool[index]); visit(index+1, selected); selected.pop();
    }
  }
  visit(0, []);
  return result;
}

function roleAssignments(ids, minimumFit = 4) {
  let best = -Infinity, assignments = [];
  function assign(index, used, roles, score) {
    if (index === ids.length) {
      if (score > best) { best = score; assignments = []; }
      if (score === best) assignments.push([...roles]);
      return;
    }
    for (let role=0; role<DRAFT_ROLES.length; role++) {
      const fit = profile(ids[index]).fits[role];
      if ((used & (1 << role)) || fit < minimumFit) continue;
      roles.push(role); assign(index+1, used | 1 << role, roles, score+fit); roles.pop();
    }
  }
  assign(0, 0, [], 0);
  return assignments.length ? {score:best, assignments} : roleAssignments(ids, 0);
}

function capabilities(ids) {
  const totals = {frontline:0, control:0, physical:0, spell:0, support:0, ranged:0};
  for (const id of ids) {
    const ratings = profile(id);
    for (const key of ['frontline','control','physical','spell','support']) totals[key] += ratings[key];
    totals.ranged += HEROES[id].range > 200 ? 1 : 0;
  }
  return totals;
}

function compositionScore(ids, roles, opponents) {
  const c = capabilities(ids);
  let score = roles.score + 2*Math.min(c.frontline,3) + 1.5*Math.min(c.control,4) +
    1.5*Math.min(c.physical,4) + 1.5*Math.min(c.spell,4) + 2*Math.min(c.support,3) + (c.ranged?2:0);
  if (c.frontline < 2) score -= 10;
  if (c.control < 3) score -= 8;
  if (c.physical < 3 || c.spell < 2 || c.support < 1) score -= 8;
  if (ids.includes('ogre_magi')) score += Math.min(c.physical,6)*.25;
  if (ids.includes('drow_ranger')) score += Math.min(c.ranged-1,2)*.75 + Math.min(c.frontline,3)*.25;
  if (ids.includes('crystal_maiden')) score += Math.min(c.spell,6)*.2;
  // Modest matchup preferences retain variety instead of fixing one counter-pick.
  if (opponents.length) {
    const enemy = capabilities(opponents);
    score += Math.min(enemy.ranged,2)*Math.min(c.frontline,3)*.2;
    score += Math.min(enemy.frontline,3)*Math.min(c.physical,6)*.1;
  }
  return score;
}

function laneFor(role, team) {
  if (role === 'mid') return 1;
  return ['carry','support'].includes(role) ? (team?0:2) : (team?2:0);
}

function draftTeam({locked, team, seed, history, opponents = []}) {
  const random = randomSource(seed), pool = Object.keys(HEROES).filter(id => !locked.includes(id));
  const recent = history.map(record => record[team?'enemies':'allies']);
  let candidates = combinations(pool, 5-locked.length).map(bots => {
    const ids = [...locked, ...bots], roles = roleAssignments(ids);
    return {ids, bots, roles, signature:signature(bots), score:compositionScore(ids,roles,opponents)};
  });
  if (team && opponents.length) {
    const distinct = candidates.filter(candidate => signature(candidate.ids) !== signature(opponents));
    if (distinct.length) candidates = distinct;
  }
  // Compare hero sets, not ordering. If all recent sets exhaust a small pool,
  // relax older history first and still exclude the immediately preceding set.
  for (let start=0; start<recent.length; start++) {
    const blocked = new Set(recent.slice(start).map(signature));
    const fresh = candidates.filter(candidate => !blocked.has(candidate.signature));
    if (fresh.length) { candidates = fresh; break; }
  }
  const best = Math.max(...candidates.map(candidate => candidate.score));
  candidates = candidates.filter(candidate => candidate.score >= best-12);
  const usage = new Map();
  recent.forEach((ids,index) => ids.forEach(id => usage.set(id,(usage.get(id)||0)+(index+1)/recent.length)));
  const weights = candidates.map(candidate => Math.exp((candidate.score-best)/5) /
    (1+candidate.bots.reduce((total,id) => total+(usage.get(id)||0),0)*.25));
  let roll = random()*weights.reduce((total,weight) => total+weight,0), chosen = candidates.at(-1);
  for (let index=0; index<candidates.length; index++) {
    roll -= weights[index];
    if (roll < 0) { chosen = candidates[index]; break; }
  }
  const roles = chosen.roles.assignments[Math.floor(random()*chosen.roles.assignments.length)];
  const entries = chosen.ids.map((heroId,index) => {
    const role = DRAFT_ROLES[roles[index]];
    return {heroId, role, lane:laneFor(role,team)};
  });
  return [...entries.slice(0,locked.length), ...entries.slice(locked.length).sort((a,b) =>
    DRAFT_ROLES.indexOf(a.role)-DRAFT_ROLES.indexOf(b.role))];
}

export function draftMatch({humanHeroIds = ['juggernaut'], seed = 42, history = []} = {}) {
  if (!validIds(humanHeroIds) || !humanHeroIds.length || humanHeroIds.length > 5 || Object.keys(HEROES).length < 5)
    throw new Error('AI 阵容需要一至五名选择不同英雄的真人');
  const recent = normalizeDraftHistory(history);
  const allies = draftTeam({locked:humanHeroIds,team:0,seed:seed^0x9e3779b9,history:recent});
  const enemies = draftTeam({locked:[],team:1,seed:seed^0x85ebca6b,history:recent,opponents:allies.map(hero => hero.heroId)});
  return {allies, enemies};
}

export function validateMatchDraft(draft, humanHeroIds) {
  for (const [team,key] of ['allies','enemies'].entries()) {
    const entries = draft?.[key];
    if (!Array.isArray(entries) || entries.length !== 5 || !validIds(entries.map(hero => hero?.heroId)) ||
      new Set(entries.map(hero => hero.role)).size !== 5 || entries.some(hero => !DRAFT_ROLES.includes(hero.role) || hero.lane !== laneFor(hero.role,team)))
      throw new Error('无效的 AI 阵容');
  }
  if (humanHeroIds.some((id,index) => draft.allies[index].heroId !== id)) throw new Error('AI 阵容不能替换真人选择的英雄');
}

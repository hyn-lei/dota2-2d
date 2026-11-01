// Keep the public simulation projection separate from engine state. Recursion
// retains nested status/item records while dropping navigation and AI internals.
const excluded = new Set([
  'navPath','navGoal','skillCache','innateCache','botState','botShop','botPlan',
  'navigation','grid','token','socket','session','sessions','controlledHeroId',
]);

function project(value, seen = new WeakSet()) {
  if(value === null || typeof value !== 'object') return typeof value === 'function' ? undefined : value;
  if(value instanceof Map || value instanceof Set || seen.has(value)) return undefined;
  seen.add(value);
  const result = Array.isArray(value) ? [] : {};
  for(const [key,entry] of Object.entries(value)) {
    if(excluded.has(key) || /(?:cache|botplan)/i.test(key)) continue;
    const projected = project(entry,seen);
    if(projected !== undefined) result[key] = projected;
  }
  seen.delete(value);
  return result;
}

const spellFields = ['type','sourceId','targetId','x','y','origin','start','dir','landAt','startedAt','traveled','fraction','effectStarted'];

export function snapshotState(game) {
  return {
    time:game.time,status:game.status,paused:game.paused,winner:game.winner,
    score:project(game.score),entities:project(game.entities),effects:project(game.effects),
    feed:project(game.feed),wave:game.wave,camps:project(game.camps),
    pendingSpells:game.pendingSpells.map(spell => project(Object.fromEntries(spellFields.filter(key=>key in spell).map(key=>[key,spell[key]])))),
    cutTrees:project([...(game.cutTrees || [])]),plantedTrees:project(game.plantedTrees || []),
    shopStocks:project(game.shopStocks || {}),
  };
}

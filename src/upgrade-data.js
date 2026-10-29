import { UPGRADE_EFFECTS, EXTRA_ABILITIES } from './upgrade-records.js';
export { UPGRADE_EFFECTS, EXTRA_ABILITIES };
export function applyUpgradeValues(heroId,abilityId,values,rank,flags={}){
 const record=UPGRADE_EFFECTS[heroId]?.[abilityId];if(!record)return values;
 for(const type of ['scepter','shard'])if(flags[type]||flags[type==='scepter'?'hasScepter':'hasShard']){
  for(const effect of record[type]){const value=effect.values[Math.min(Math.max(rank-1,0),effect.values.length-1)]||0;values[effect.field]=effect.operation==='set'?value:(values[effect.field]||0)+value;}
 }
 return values;
}
export function upgradeDescriptions(heroId,type){
 return Object.values(UPGRADE_EFFECTS[heroId]||{}).map(r=>r[`${type}Description`]).filter(Boolean).concat((EXTRA_ABILITIES[heroId]||[]).filter(s=>s.upgrade===type).map(s=>`${s.name}：${s.description}`));
}

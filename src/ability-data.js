import { ABILITIES, INNATES, TALENTS } from './ability-records.js';
import { applyUpgradeValues, EXTRA_ABILITIES } from './upgrade-data.js';
export { ABILITIES, INNATES, TALENTS };
const rankValue=(values,rank)=>(values||[])[Math.min(Math.max(0,rank-1),(values||[]).length-1)]??0;
function resolve(record,rank,talents,heroId,heroLevel=0,upgrades={}){
 const values=Object.fromEntries(Object.entries(record.values).map(([key,array])=>[key,rankValue(array,rank)]));
 for(const [key,gain]of Object.entries(record.scaling||{}))values[key]=(values[key]||0)+gain*heroLevel;
 for(const index of new Set(talents||[]))for(const effect of TALENTS[heroId]?.[index]?.effects||[]){
  if(effect.abilityId!==record.id)continue;
  const old=values[effect.field]||0,v=effect.value;
  values[effect.field]=effect.operation===2?old-v:effect.operation===3?old*(1+v/100):effect.operation===5?v:old+v;
 }
 applyUpgradeValues(heroId,record.id,values,rank,upgrades);
 const get=(key,field)=>values[key]??rankValue(record[field],rank);
 return {...record,level:rank,values,cooldown:get('AbilityCooldown','cooldowns'),mana:get('AbilityManaCost','manaCosts'),range:get('AbilityCastRange','castRanges'),castPoint:get('AbilityCastPoint','castPoints'),channelTime:get('AbilityChannelTime','channelTimes'),duration:values.duration??get('AbilityDuration','durations'),damage:values.damage??values.torrent_damage??values.nova_damage??values.powershot_damage??get('AbilityDamage','damages')};
}
export function abilityAt(heroId,index,rank=0,talents=[],upgrades={}){
 const record=ABILITIES[heroId]?.[index];if(!record)throw new RangeError(`Unknown ability ${heroId}:${index}`);
 return resolve(record,Math.max(0,Math.min(record.maxLevel,Math.floor(rank)||0)),talents,heroId,0,upgrades);
}
export function innateAt(heroId,heroLevel=1,talents=[],upgrades={}){
 const record=INNATES[heroId];if(!record)throw new RangeError(`Unknown innate ${heroId}`);
 return resolve(record,1,talents,heroId,Math.max(1,Math.min(30,heroLevel)),upgrades);
}
export function extraAbilityAt(heroId,id,talents=[],upgrades={}){
 const record=EXTRA_ABILITIES[heroId]?.find(s=>s.id===id);if(!record)return null;
 const available=upgrades[record.upgrade]||upgrades[record.upgrade==='scepter'?'hasScepter':'hasShard'];
 return available?resolve(record,1,talents,heroId,0,upgrades):null;
}
export function talentStats(heroId,talents=[]){
 const out={};for(const index of new Set(talents))for(const effect of TALENTS[heroId]?.[index]?.effects||[])if(effect.stat)out[effect.stat]=(out[effect.stat]||0)+effect.value;
 return out;
}

import fs from 'node:fs';
const heroes={axe:[2,'axe'],crystal_maiden:[5,'crystal_maiden'],juggernaut:[8,'juggernaut'],windranger:[21,'windrunner'],kunkka:[23,'kunkka'],ogre_magi:[84,'ogre_magi'],drow_ranger:[6,'drow_ranger'],chen:[66,'chen'],chaos_knight:[81,'chaos_knight'],weaver:[63,'weaver']};
function parse(raw){
 const tokens=[...raw.replace(/\/\/[^\n]*/g,'').matchAll(/"((?:\\.|[^"\\])*)"|([{}])/g)].map(m=>m[2]||m[1]);let i=0;
 function object(){const out={};while(i<tokens.length){const key=tokens[i++];if(key==='}')return out;const value=tokens[i++];out[key]=value==='{'?object():value;}return out;}return object();
}
const upgrades={},extras={};
for(const [heroId,[id,prefix]]of Object.entries(heroes)){
 const feed=JSON.parse(fs.readFileSync(`docs/research/abilities/${id}-schinese.json`,'utf8')).result.data.heroes[0];
 const kv=parse(fs.readFileSync(`docs/research/heroes/npc_dota_hero_${prefix}.txt`,'utf8')).DOTAHeroes[`npc_dota_hero_${prefix}`].AbilityDefinitions;
 upgrades[heroId]={};extras[heroId]=[];
 // The live feed defines the active lineup; KV also contains obsolete, unused abilities.
 for(const a of feed.abilities){
  const raw=kv[a.name]||{},effects={scepter:[],shard:[]};
  for(const [field,definition]of Object.entries(raw.AbilityValues||{})){
   if(typeof definition!=='object')continue;
   for(const type of ['scepter','shard']){const value=definition[`special_bonus_${type}`];if(value===undefined)continue;
    effects[type].push({field,operation:/^[+-]/.test(value)?'add':'set',values:String(value).split(/\s+/).map(v=>Number(v.replace(/^=/,'')))});
   }
  }
  const baseValues=Object.fromEntries(a.special_values.map(v=>[v.name,v.values_float]));
  function upgradeDescription(text,type){
   const values={...baseValues};
   for(const effect of effects[type]){
    const original=values[effect.field]||[0];
    values[effect.field]=effect.values.map((v,i)=>effect.operation==='set'?v:(original[Math.min(i,original.length-1)]||0)+v);
    values[`bonus_${effect.field}`]=effect.values.map(Math.abs);
   }
   return (text||'').replace(/<[^>]*>/g,'').replace(/%(\w+)%/g,(_,key)=>{
    const field=Object.keys(values).find(k=>k.toLowerCase()===key.toLowerCase());
    if(!field)throw Error(`Unresolved ${heroId} ${a.name} ${type} description token ${key}`);
    return values[field].join('/');
   }).replace(/%%/g,'%');
  }
  if(effects.scepter.length||effects.shard.length)upgrades[heroId][a.name]={...effects,scepterDescription:upgradeDescription(a.scepter_loc,'scepter'),shardDescription:upgradeDescription(a.shard_loc,'shard')};
  const upgrade=a.ability_is_granted_by_scepter?'scepter':a.ability_is_granted_by_shard?'shard':null;
  if(!upgrade)continue;
  const values=Object.fromEntries(a.special_values.map(v=>[v.name,v.values_float]));
  // Valve's allied Time Lapse reads these costs/timing from its dependent R in code;
  // the datafeed therefore reports zero arrays for D rather than effective values.
  const dependentOnAbility=raw.DependentOnAbility;
  const dependent=dependentOnAbility&&feed.abilities.find(s=>s.name===dependentOnAbility);
  if(dependent)for(const field of ['AbilityCastPoint','AbilityManaCost','AbilityCooldown']){
   const special=dependent.special_values.find(v=>v.name===field);
   if(special)values[field]=special.values_float;
  }
  let description=a.desc_loc.replace(/<[^>]*>/g,'').replace(/%(\w+)%/g,(_,key)=>values[key]?.join('/')??'0').replace(/%%/g,'%');
  if(a.name==='kunkka_tidal_wave')description=description.replace('造成点伤害',`造成 ${values.damage[0]} 点伤害`).replace('拖拽距离',`拖拽 ${values.knockback_distance[0]} 距离`);
  extras[heroId].push({id:a.name,sourceID:a.id,name:a.name_loc,key:extras[heroId].length?'T':'D',image:`assets/abilities/${a.name}.png`,icon:heroId==='crystal_maiden'?'crystal':heroId==='juggernaut'?'swords':heroId==='windranger'?'wind':heroId==='weaver'?'xmark':'torrent',color:'#a6ced4',kind:'active',maxLevel:dependent?a.max_level:1,requiredLevels:[],upgrade,cooldowns:dependent?.cooldowns||a.cooldowns,manaCosts:dependent?.mana_costs||a.mana_costs,castRanges:a.cast_ranges,castPoints:dependent?.cast_points||a.cast_points,channelTimes:a.channel_times,durations:a.durations,damages:a.damages,values,description,damageType:raw.AbilityUnitDamageType?.replace('DAMAGE_TYPE_','').toLowerCase()||'magical',...(dependent?{dependentOnAbility,sharedCooldownAbility:raw.AbilitySharedCooldown,targetTeam:raw.AbilityUnitTargetTeam,targetType:raw.AbilityUnitTargetType,targetFlags:raw.AbilityUnitTargetFlags||'',notes:a.notes_loc||[]}: {})});
 }
 // Dependent extras may precede their parent in the live feed (Weaver D before R).
 for(const extra of extras[heroId])if(extra.dependentOnAbility&&upgrades[heroId][extra.dependentOnAbility]){
  upgrades[heroId][extra.id]={...upgrades[heroId][extra.dependentOnAbility],scepterDescription:'',shardDescription:''};
 }
}
fs.writeFileSync('src/upgrade-records.js',`// Generated from Valve 7.42 feed and shipped hero KV; see docs/hero-upgrades-sources.md.\nexport const UPGRADE_EFFECTS=${JSON.stringify(upgrades,null,2)};\nexport const EXTRA_ABILITIES=${JSON.stringify(extras,null,2)};\n`);
console.log(`Extracted upgrades for ${Object.keys(upgrades).length} heroes and ${Object.values(extras).flat().length} extra abilities.`);

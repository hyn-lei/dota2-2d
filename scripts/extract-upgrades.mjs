import fs from 'node:fs';
const heroes={axe:[2,'axe'],crystal_maiden:[5,'crystal_maiden'],juggernaut:[8,'juggernaut'],windranger:[21,'windrunner'],kunkka:[23,'kunkka'],ogre_magi:[84,'ogre_magi']};
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
    effects[type].push({field,operation:/^[+-]/.test(value)?'add':'set',values:String(value).split(/\s+/).map(Number)});
   }
  }
  if(effects.scepter.length||effects.shard.length)upgrades[heroId][a.name]={...effects,scepterDescription:a.scepter_loc||'',shardDescription:a.shard_loc||''};
  const upgrade=a.ability_is_granted_by_scepter?'scepter':a.ability_is_granted_by_shard?'shard':null;
  if(!upgrade)continue;
  const values=Object.fromEntries(a.special_values.map(v=>[v.name,v.values_float]));
  let description=a.desc_loc.replace(/<[^>]*>/g,'').replace(/%(\w+)%/g,(_,key)=>values[key]?.join('/')??'0').replace(/%%/g,'%');
  if(a.name==='kunkka_tidal_wave')description=description.replace('造成点伤害',`造成 ${values.damage[0]} 点伤害`).replace('拖拽距离',`拖拽 ${values.knockback_distance[0]} 距离`);
  extras[heroId].push({id:a.name,sourceID:a.id,name:a.name_loc,key:extras[heroId].length?'T':'D',icon:heroId==='crystal_maiden'?'crystal':heroId==='juggernaut'?'swords':heroId==='windranger'?'wind':'torrent',color:'#a6ced4',kind:'active',maxLevel:1,requiredLevels:[],upgrade,cooldowns:a.cooldowns,manaCosts:a.mana_costs,castRanges:a.cast_ranges,castPoints:a.cast_points,channelTimes:a.channel_times,durations:a.durations,damages:a.damages,values,description,damageType:raw.AbilityUnitDamageType?.replace('DAMAGE_TYPE_','').toLowerCase()||'magical'});
 }
}
fs.writeFileSync('src/upgrade-records.js',`// Generated from Valve 7.41f feed and shipped hero KV; see docs/hero-upgrades-sources.md.\nexport const UPGRADE_EFFECTS=${JSON.stringify(upgrades,null,2)};\nexport const EXTRA_ABILITIES=${JSON.stringify(extras,null,2)};\n`);
console.log(`Extracted upgrades for ${Object.keys(upgrades).length} heroes and ${Object.values(extras).flat().length} extra abilities.`);

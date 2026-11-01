import fs from 'node:fs';
const heroes={axe:[2,'axe'],crystal_maiden:[5,'crystal_maiden'],juggernaut:[8,'juggernaut'],windranger:[21,'windrunner'],kunkka:[23,'kunkka'],ogre_magi:[84,'ogre_magi']};
const lineups={axe:['berserkers_call','battle_hunger','counter_helix','culling_blade'],crystal_maiden:['crystal_nova','frostbite','brilliance_aura','freezing_field'],juggernaut:['blade_fury','healing_ward','blade_dance','omni_slash'],windranger:['shackleshot','powershot','windrun','focusfire'],kunkka:['torrent','tidebringer','x_marks_the_spot','ghostship'],ogre_magi:['fireblast','ignite','bloodlust','multicast']};
const icons={axe:['roar','hunger','helix','axe'],crystal_maiden:['snow','crystal','aura','storm'],juggernaut:['spin','heal','swords','swords'],windranger:['target','arrow','wind','target'],kunkka:['torrent','tide','xmark','ship'],ogre_magi:['fire','fire','roar','aura']};
const passive=new Set(['axe_counter_helix','crystal_maiden_brilliance_aura','juggernaut_blade_dance','ogre_magi_multicast']);
function parse(raw){const tokens=[...raw.replace(/\/\/[^\n]*/g,'').matchAll(/"((?:\\.|[^"\\])*)"|([{}])/g)].map(m=>m[2]||m[1]);let i=0;function object(){const result={};while(i<tokens.length){const key=tokens[i++];if(key==='}')return result;const value=tokens[i++];result[key]=value==='{'?object():value;}return result;}return object();}
const ABILITIES={},TALENTS={},INNATES={};
for(const [heroId,[id,prefix]]of Object.entries(heroes)){
 const original=JSON.parse(fs.readFileSync(`docs/research/heroes/${id}.json`,'utf8')).result.data.heroes[0];
 const chinese=JSON.parse(fs.readFileSync(`docs/research/abilities/${id}-schinese.json`,'utf8')).result.data.heroes[0];
 const kv=parse(fs.readFileSync(`docs/research/heroes/npc_dota_hero_${prefix}.txt`,'utf8')).DOTAHeroes[`npc_dota_hero_${prefix}`].AbilityDefinitions;
 function resolve(text,values,effects=[]){return (text||'').replace(/<[^>]*>/g,'').replace(/\{s:(?:bonus_)?(\w+)\}/g,(_,key)=>String(effects.find(e=>e.field===key)?.value??values[key]?.[0]??0)).replace(/%(\w+)%/g,(_,key)=>(values[key]||values[Object.keys(values).find(k=>k.toLowerCase()===key)])?.join('/')??'0').replace(/%%/g,'%');}
 function record(a,index){
  const loc=chinese.abilities.find(x=>x.name===a.name)||a;
  const values=Object.fromEntries(a.special_values.map(v=>[v.name,v.values_float]));
  const raw=kv?.[a.name]||{};
  const scaling={};for(const [key,v]of Object.entries(raw.AbilityValues||{}))if(v&&typeof v==='object'&&v.hero_levelup)scaling[key]=Number(v.hero_levelup);
  return {id:a.name,sourceID:a.id,name:loc.name_loc,key:'QWER'[index]||'',icon:icons[heroId][index]||'aura',color:['#9dc0be','#99bda0','#d1b47e','#8ebcca'][index]||'#b9c19a',kind:passive.has(a.name)?'passive':['kunkka_tidebringer','ogre_magi_bloodlust'].includes(a.name)?'autocast':a.ability_is_innate?'innate':'active',maxLevel:a.max_level,requiredLevels:index===3?[6,12,18]:[1,3,5,7],cooldowns:a.cooldowns,manaCosts:a.mana_costs,castRanges:a.cast_ranges,castPoints:a.cast_points,channelTimes:a.channel_times,durations:a.durations,damages:a.damages,values,scaling,description:resolve(loc.desc_loc,values),damageType:raw.AbilityUnitDamageType?.replace('DAMAGE_TYPE_','').toLowerCase()||({1:'physical',2:'magical',4:'pure'}[a.damage])||'magical',...(heroId==='ogre_magi'?{targetTeam:raw.AbilityUnitTargetTeam,targetType:raw.AbilityUnitTargetType,targetFlags:raw.AbilityUnitTargetFlags||'',notes:loc.notes_loc||[]}: {})};
 }
 ABILITIES[heroId]=lineups[heroId].map((suffix,index)=>record(original.abilities.find(a=>a.name===`${prefix}_${suffix}`),index));
 const innate=original.abilities.find(a=>a.ability_is_innate);INNATES[heroId]=record(innate,-1);
 TALENTS[heroId]=original.talents.map((t,index)=>{
  const effects=original.abilities.flatMap(a=>a.special_values.flatMap(v=>v.bonuses.filter(b=>b.name===t.name).map(b=>({abilityId:a.name,field:v.name,value:b.value,operation:b.operation}))));
  if(!effects.length){const value=t.special_values.find(v=>v.name==='value')?.values_float[0]||0;const stat=t.name.includes('intelligence')?'intelligence':t.name.includes('strength')?'strength':t.name.includes('spell_aoe')?'spellAoE':t.name.includes('attack_damage')?'damage':'maxHp';effects.push({stat,value,operation:0});}
  return {id:t.name,sourceID:t.id,index,requiredLevel:[10,15,20,25][Math.floor(index/2)],name:resolve(chinese.talents[index].name_loc,Object.fromEntries(t.special_values.map(v=>[v.name,v.values_float])),effects),effects};
 });
}
fs.writeFileSync('src/ability-records.js',`// Generated from Valve 7.41f datafeed + shipped hero KV. See docs/research/abilities-sources.md.\nexport const ABILITIES=${JSON.stringify(ABILITIES,null,2)};\nexport const INNATES=${JSON.stringify(INNATES,null,2)};\nexport const TALENTS=${JSON.stringify(TALENTS,null,2)};\n`);
console.log(`Extracted ${Object.values(ABILITIES).flat().length} abilities, ${Object.keys(INNATES).length} innates, ${Object.values(TALENTS).flat().length} talents.`);

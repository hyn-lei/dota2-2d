import fs from 'node:fs';
import {NEUTRAL_ABILITIES} from '../src/unit-data.js';
const snapshot=JSON.parse(fs.readFileSync('docs/research/units/client-ability-tokens.json','utf8'));
const tokens=Object.fromEntries(Object.entries(snapshot.localization['resource/localization/abilities_schinese.txt'].tokens).map(([k,v])=>[k.toLowerCase(),v]));
const skills={};
const supplemental=JSON.parse(fs.readFileSync('docs/research/units/supplemental-ability-datafeed.json','utf8'));
const details=Object.fromEntries(supplemental.records.map(r=>[r.name,r.response.result.data.abilities.find(a=>a.name===r.name)]));
for(const id of [...Object.keys(NEUTRAL_ABILITIES),...Object.keys(details),'courier_return_to_base','courier_transfer_items','courier_go_to_secretshop','courier_burst','courier_shield','juggernaut_healing_ward']){
 const prefix='dota_tooltip_ability_'+id;
 const labels=Object.fromEntries(Object.entries(tokens).filter(([k])=>k.startsWith(prefix+'_')&&!/_(description|note\d*|lore)$/.test(k)).map(([k,v])=>[k.slice(prefix.length+1),v]));
 const notes=Object.entries(tokens).filter(([k])=>k.startsWith(prefix+'_note')).map(([,v])=>v);
 const fallback=id==='neutral_upgrade'?{description:'野怪每%increase_time%秒成长一次，最多%max_level%次。',labels:{max_level:'最多成长次数',increase_time:'成长间隔 / 秒',increase_damage:'每次攻击力',increase_aspd:'每次攻击速度',increase_health:'每次生命',increase_armor:'每次护甲',increase_gold:'每次金币奖励',increase_xp:'每次经验奖励'}}:{};
 skills[id]={name:tokens[prefix]||({neutral_upgrade:'野怪成长',roshan_inherent_buffs:'肉山固有属性'}[id])||id,description:tokens[prefix+'_description']||fallback.description||'',notes,labels:{...fallback.labels,...labels},image:snapshot.textures[id]?`assets/abilities/${id}.png`:null};
 if(details[id]){
  const d=details[id],join=a=>a.join(' ');
  skills[id].definition={passive:false,manaCost:join(d.mana_costs),cooldown:join(d.cooldowns),castRange:join(d.cast_ranges),castPoint:join(d.cast_points),values:Object.fromEntries(d.special_values.filter(v=>!v.name.startsWith('Ability')).map(v=>[v.name,join(v.values_float)]))};
  for(const v of d.special_values)if(v.heading_loc&&!skills[id].labels[v.name])skills[id].labels[v.name]=(v.is_percentage?'%':'')+v.heading_loc;
 }
}
fs.writeFileSync('src/unit-skill-data.js','// Generated from Valve client localization; run node scripts/generate-unit-skill-ui.mjs.\nexport const UNIT_SKILL_UI = '+JSON.stringify(skills,null,2)+';\n');
console.log(`Generated ${Object.keys(skills).length} unit skill presentations`);

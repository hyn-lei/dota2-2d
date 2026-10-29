import fs from 'node:fs';
const raw=fs.readFileSync('docs/research/units/npc_units.txt','utf8').replace(/\/\/[^\n]*/g,'');
const ts=[...raw.matchAll(/"((?:\\.|[^"\\])*)"|([{}])/g)].map(m=>m[2]||m[1]);let i=0;
function obj(){let o={};while(i<ts.length){let k=ts[i++];if(k==='}')return o;let v=ts[i++];o[k]=v==='{'?obj():v;}return o;}
const units=obj().DOTAUnits;fs.writeFileSync('docs/research/units/parsed-units.json',JSON.stringify(units,null,2));
const base=units.npc_dota_units_base;
for(const [k,v] of Object.entries(units)){if(/npc_dota_neutral_|npc_dota_goodguys_tower[1234](_mid)?$|npc_dota_goodguys_(melee_rax_mid|range_rax_mid|fort)$|fountain|npc_dota_creep_goodguys_(melee|ranged)|npc_dota_goodguys_siege|npc_dota_roshan$/.test(k)){console.log(k,JSON.stringify(Object.fromEntries(Object.entries({...base,...v}).filter(([f])=>/^(StatusHealth|StatusHealthRegen|ArmorPhysical|MagicalResistance|AttackDamageMin|AttackDamageMax|AttackRate|AttackRange|MovementSpeed|BountyXP|BountyGoldMin|BountyGoldMax|BoundsHullName|BaseAttackSpeed|IsAncient|Ability\d|BaseClass)$/.test(f)))));}}

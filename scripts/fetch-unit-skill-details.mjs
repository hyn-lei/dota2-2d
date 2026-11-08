import fs from 'node:fs';
import {NEUTRAL_ABILITIES,NEUTRAL_UNITS,BUILDING_STATS,LANE_CREEPS,ROSHAN} from '../src/unit-data.js';
const ids=new Set([...Object.values(NEUTRAL_UNITS),...Object.values(BUILDING_STATS),...Object.values(LANE_CREEPS),ROSHAN].flatMap(u=>u.abilities||[]));
const list=await fetch('https://www.dota2.com/datafeed/abilitylist?language=english').then(r=>{if(!r.ok)throw new Error(r.status);return r.json();});
const records=[];
for(const name of [...ids].filter(id=>!NEUTRAL_ABILITIES[id])){
 const ability=list.result.data.itemabilities.find(a=>a.name===name);if(!ability)throw new Error(`No official ability ID for ${name}`);
 const url=`https://www.dota2.com/datafeed/abilitydata?ability_id=${ability.id}&language=schinese`;
 const response=await fetch(url).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();});
 if(!response.result.data.abilities.some(a=>a.name===name))throw new Error(`No official detail for ${name}`);
 records.push({name,url,response});
}
fs.writeFileSync('docs/research/units/supplemental-ability-datafeed.json',JSON.stringify({source:'Valve Dota 2 datafeed',referencePatch:'7.41f',retrieved:'2026-11-08',records},null,2)+'\n');
console.log(`Fetched ${records.length} unit abilities absent from the KV snapshot`);

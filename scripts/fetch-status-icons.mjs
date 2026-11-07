import { mkdir,writeFile } from 'node:fs/promises';
import { INNATES } from '../src/ability-data.js';
import { EXTRA_ABILITIES } from '../src/upgrade-data.js';
import { STATUS_ABILITY_IDS } from '../src/status-catalog.js';
const ids=[...new Set([...Object.values(STATUS_ABILITY_IDS),...Object.values(INNATES).map(s=>s.id),...Object.values(EXTRA_ABILITIES).flat().map(s=>s.id)])];
// Valve's web CDN does not expose every current innate; use a related Valve icon,
// explicitly recorded below, until a licensed current client asset is available.
const alternatives={axe_one_man_army:['axe_coat_of_blood','axe_berserkers_call'],crystal_maiden_glacial_guard:['crystal_maiden_frozen_heart','crystal_maiden_frostbite'],juggernaut_bladeform:['juggernaut_blade_dance'],windrunner_tailwind:['windrunner_easy_breezy','windrunner_windrun'],kunkka_admirals_rum:['kunkka_ghostship'],ogre_magi_dumb_luck:['ogre_magi_multicast']};
const sources=[];
await mkdir('assets/abilities',{recursive:true});
for(const id of ids){
 const path=`assets/abilities/${id}.png`;
 let saved=false;
 for(const candidate of [id,...(alternatives[id]||[])]){
  const url=`https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/abilities/${candidate}.png`;
  const response=await fetch(url);if(!response.ok)continue;
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.readUInt32BE(0)!==0x89504e47)throw Error(`${id}: expected PNG`);
  await writeFile(path,bytes);sources.push({id,url,fallback:candidate!==id});console.log(`Saved ${id}${candidate!==id?' from '+candidate:''}`);saved=true;break;
 }
 if(!saved)throw Error(`No documented Valve icon for ${id}`);
}
await mkdir('docs/research/hud',{recursive:true});
await writeFile('docs/research/hud/icon-sources.json',JSON.stringify(sources,null,2)+'\n');

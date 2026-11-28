import {readFile,writeFile} from 'node:fs/promises';
import {ITEMS} from '../src/item-data.js';
import {ACTIVE_ITEM_HANDLERS} from '../src/item-actives.js';

const source=new URL('../docs/research/item-builds-742/opendota-professional.json',import.meta.url);
const workshopSource=new URL('../docs/research/item-builds-742/workshop-guides.json',import.meta.url);
const output=new URL('../src/current-hero-item-builds.js',import.meta.url);
const {currentPatch,currentPatchFrom,endTime,matches}=JSON.parse(await readFile(source,'utf8'));
const heroIds={2:'axe',5:'crystal_maiden',6:'drow_ranger',8:'juggernaut',21:'windranger',23:'kunkka',63:'weaver',66:'chen',81:'chaos_knight',84:'ogre_magi'};
// These effects have been checked in item-runtime.js, item-actives.js and hero-stats.js.
const implemented=new Set([
  'boots','power_treads','phase_boots','tranquil_boots','arcane_boots','magic_wand','falcon_blade','soul_ring',
  'armlet','orchid','bloodthorn','black_king_bar','manta','skadi','heart','blink','blade_mail','desolator','greater_crit',
  'maelstrom','mjollnir','dragon_lance','hurricane_pike','urn_of_shadows','essence_distiller','consecrated_wraps',
  'force_staff','glimmer_cape','mekansm','guardian_greaves','pipe','assault','lotus_orb',
]);
const itemsByName=new Map(ITEMS.filter(i=>implemented.has(i.id)).map(i=>[i.dotaName.slice(5),i]));

function roleFor(lane,roaming,lastHits){
  if(lastHits===null)return null;
  if(lastHits<=24){
    if(lane===1)return 'support';
    if(lane===3||lane===4&&roaming)return 'roamer';
  }
  if(lastHits<35||roaming)return null;
  return {1:'carry',2:'mid',3:'offlane'}[lane]??null;
}

const cohorts=new Map(),seenMatches=new Set();
for(const [matchId,startTime,,radiant,dire,,players] of matches){
  if(seenMatches.has(matchId)||players.length!==10)throw Error(`Invalid match ${matchId}`);
  seenMatches.add(matchId);
  if(startTime<currentPatchFrom||startTime>=endTime)continue;
  for(const [slot,heroId,lane,roaming,lastHits,purchases] of players){
    const hero=heroIds[heroId],role=roleFor(lane,roaming,lastHits);
    if(!hero||!role||!purchases?.length)continue;
    const first=new Map();
    for(const [time,key] of purchases){
      const id=itemsByName.get(key)?.id;
      if(id&&Number.isFinite(time)&&(!first.has(id)||first.get(id)>time))first.set(id,time);
    }
    const key=`${hero}:${role}`;
    if(!cohorts.has(key))cohorts.set(key,[]);
    cohorts.get(key).push({team:slot<128?radiant:dire,first});
  }
}

const builds={};
for(const [key,players] of [...cohorts].sort(([a],[b])=>a.localeCompare(b,'en'))){
  if(players.length<5)continue;
  const early=[],core=[];
  for(const {id,cost} of itemsByName.values()){
    const purchases=players.filter(p=>p.first.has(id));
    const teams=new Set(purchases.map(p=>p.team));
    if(purchases.length<players.length*.6||teams.size<3)continue;
    const times=purchases.map(p=>p.first.get(id)).sort((a,b)=>a-b);
    const medianSeconds=Math.round((times[Math.floor((times.length-1)/2)]+times[Math.floor(times.length/2)])/2);
    const stage=medianSeconds<=(cost<=900?720:600)?early:core;
    stage.push({id,medianSeconds,purchaseCount:purchases.length,teamCount:teams.size});
  }
  if(!early.length&&!core.length)continue;
  const compare=(a,b)=>a.medianSeconds-b.medianSeconds||b.purchaseCount-a.purchaseCount||a.id.localeCompare(b.id,'en');
  builds[key]={sampleCount:players.length,early:early.sort(compare),core:core.sort(compare)};
}

const workshop=JSON.parse(await readFile(workshopSource,'utf8'));
const guides={};
const stages=new Map([
  ['#DOTA_Item_Build_Starting_Items','early'],['Starting Items','early'],['#DOTA_Item_Build_Early_Game','early'],
  ['#DOTA_Item_Build_Core_Items','core'],['#DOTA_Item_Build_Luxury','situational'],
]);
const shopItems=new Map(ITEMS.filter(item=>!item.recipeOnly).map(item=>[item.dotaName,item]));
const specialPassive=new Set(['aghanims_shard','orb_of_venom','orb_of_frost','blight_stone']);
const skipped=new Set();
for(const guide of workshop.itemBuilds){
  if(guide.patch!==currentPatch)continue;
  const hero=guide.hero==='windrunner'?'windranger':guide.hero;
  if(!Object.values(heroIds).includes(hero))throw Error(`Unknown Workshop guide hero ${hero}`);
  const items={early:new Map(),core:new Map(),situational:new Map()};
  for(const [group,names] of guide.groups){
    const stage=items[stages.get(group)];
    if(!stage)throw Error(`Unknown Workshop guide item group ${group}`);
    for(const name of names){
      const item=shopItems.get(name);
      if(!item||!(ACTIVE_ITEM_HANDLERS[item.id]||Object.keys(item.stats).length||specialPassive.has(item.id))){
        skipped.add(name);continue;
      }
      const quantity=item.stackable||items.early===stage?(stage.get(item.id)||0)+1:1;
      stage.set(item.id,quantity);
    }
  }
  for(const role of guide.roles){
    const key=`${hero}:${role}`;
    if(guides[key])throw Error(`Multiple Workshop guides for ${key}`);
    guides[key]={workshopId:guide.id,...Object.fromEntries(Object.entries(items).map(([stage,entries])=>[stage,[...entries]]))};
  }
}

const content='// Generated from local OpenDota and Steam Workshop evidence. See docs/hero-item-build-sources.md.\n'+
  `export const PROFESSIONAL_ITEM_BUILDS = ${JSON.stringify({patch:currentPatch,builds},null,2)};\n`+
  `export const WORKSHOP_ITEM_BUILDS = ${JSON.stringify({patch:currentPatch,author:workshop.author,builds:guides},null,2)};\n`;
if(process.argv.includes('--check')){
  if(content!==await readFile(output,'utf8'))throw Error('The local professional item builds need regeneration');
}else{
  await writeFile(output,content);
}
console.log(`${currentPatch}: ${Object.keys(builds).length} professional and ${Object.keys(guides).length} Workshop build contexts`);
if(skipped.size)console.log(`Filtered Workshop items: ${[...skipped].sort().join(', ')}`);

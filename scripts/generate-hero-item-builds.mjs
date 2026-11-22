import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {ITEMS,ITEM_BY_ID} from '../src/item-data.js';

const patch='7.42';
const sourceCommit='76ab89451c1384c2e106b676258c6e9f72787e11';
const sourceRoot=`https://github.com/SteamTracking/GameTracking-Dota2/blob/${sourceCommit}/game/dota/itembuilds`;
const snapshots=new URL('../docs/research/item-builds-742/',import.meta.url);
const heroes=[
  ['axe','axe'],
  ['chaos_knight','chaos_knight'],
  ['chen','chen'],
  ['crystal_maiden','crystal_maiden'],
  ['drow_ranger','drow_ranger'],
  ['juggernaut','juggernaut'],
  ['kunkka','kunkka'],
  ['ogre_magi','ogre_magi'],
  ['weaver','weaver'],
  ['windranger','windrunner'],
];
const stages=[
  ['starting','#DOTA_Item_Build_Starting_Items'],
  ['early','#DOTA_Item_Build_Early_Game'],
  ['mid','#DOTA_Item_Build_Mid_Items'],
  ['late','#DOTA_Item_Build_Late_Items'],
  ['situational','#DOTA_Item_Build_Other_Items'],
];
// Older Valve default guides use these names for items still sold today.
// Keep the snapshot unchanged and record each conversion in the manifest.
const legacyNames=new Map([
  ['item_travel_boots_1','item_travel_boots'],
  ['item_shadow_blade','item_invis_sword'],
]);
const purchasableByName=new Map(ITEMS.map(item=>[item.dotaName,item]));
const allByName=new Map(Object.values(ITEM_BY_ID).map(item=>[item.dotaName,item]));

// Ordered pairs retain repeated "item" keys, unlike a plain KV object.
function parseKeyValues(source,file){
  const tokens=[];
  const pattern=/\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|[{}]|[^\s{}"]+/gy;
  let match;
  while(pattern.lastIndex<source.length){
    const offset=pattern.lastIndex;
    match=pattern.exec(source);
    if(!match)throw Error(`${file}: invalid KeyValues token at ${offset}`);
    const token=match[0];
    if(/^\s|^\/\//.test(token)||token.startsWith('/*'))continue;
    if(token==='{'||token==='}')tokens.push({kind:token});
    else tokens.push({kind:'value',value:token.startsWith('"')?JSON.parse(token):token});
  }
  let cursor=0;
  function pairs(nested=false){
    const entries=[];
    while(cursor<tokens.length){
      if(tokens[cursor].kind==='}'){
        if(!nested)throw Error(`${file}: unexpected closing brace`);
        cursor++;return entries;
      }
      const key=tokens[cursor++];
      if(key.kind!=='value')throw Error(`${file}: expected a KeyValues key`);
      const next=tokens[cursor++];
      if(next?.kind==='{')entries.push([key.value,pairs(true)]);
      else if(next?.kind==='value')entries.push([key.value,next.value]);
      else throw Error(`${file}: missing value for ${key.value}`);
    }
    if(nested)throw Error(`${file}: unclosed KeyValues block`);
    return entries;
  }
  return pairs();
}

function uniqueValue(entries,key,file){
  const matches=entries.filter(([name])=>name===key);
  if(matches.length!==1)throw Error(`${file}: expected one ${key}, found ${matches.length}`);
  return matches[0][1];
}

function countRecord(records,key,record){
  const existing=records.get(key);
  if(existing)existing.quantity++;
  else records.set(key,{...record,quantity:1});
}

const builds={};
const manifest={
  patch,
  sourceCommit,
  sourceRoot,
  generator:'scripts/generate-hero-item-builds.mjs',
  scope:'Valve-authored default client item guides for the current playable roster; the 7.42 snapshot does not establish that every guide was retuned for 7.42.',
  files:[],
};
for(const [hero,sourceHero] of heroes){
  const file=`default_${sourceHero}.txt`;
  const bytes=await readFile(new URL(file,snapshots));
  const root=uniqueValue(parseKeyValues(bytes.toString('utf8'),file),'itembuilds',file);
  if(!Array.isArray(root))throw Error(`${file}: itembuilds is not a block`);
  const author=uniqueValue(root,'author',file);
  if(author!=='Valve')throw Error(`${file}: expected author Valve, found ${author}`);
  if(uniqueValue(root,'hero',file)!==`npc_dota_hero_${sourceHero}`)throw Error(`${file}: unexpected source hero`);
  const items=uniqueValue(root,'Items',file);
  if(!Array.isArray(items))throw Error(`${file}: Items is not a block`);
  const unknownStages=items.filter(([key])=>!stages.some(([,sourceKey])=>sourceKey===key));
  if(unknownStages.length)throw Error(`${file}: unsupported item stages ${unknownStages.map(([key])=>key).join(', ')}`);
  const skipped=new Map(),aliases=new Map();
  builds[hero]={};
  for(const [stage,sourceKey] of stages){
    const sourceItems=uniqueValue(items,sourceKey,file);
    if(!Array.isArray(sourceItems))throw Error(`${file}: ${sourceKey} is not a block`);
    const selected=new Map();
    for(const [key,sourceName] of sourceItems){
      if(key!=='item'||typeof sourceName!=='string')throw Error(`${file}: invalid item in ${sourceKey}`);
      const normalizedName=sourceName.toLowerCase();
      const dotaName=legacyNames.get(normalizedName)||normalizedName;
      const item=purchasableByName.get(dotaName);
      if(!item){
        const definition=allByName.get(dotaName);
        countRecord(skipped,`${stage}:${sourceName}`,{
          stage,dotaName:sourceName,
          reason:definition?'not-purchasable':'not-in-current-item-data',
          ...(definition?{id:definition.id}:{}),
        });
        continue;
      }
      if(dotaName!==sourceName)countRecord(aliases,`${stage}:${sourceName}`,{stage,sourceName,dotaName,id:item.id});
      countRecord(selected,item.id,{id:item.id});
    }
    builds[hero][stage]=[...selected.values()];
  }
  manifest.files.push({
    hero,
    sourceHero,
    file,
    url:`${sourceRoot}/${file}`,
    sha256:createHash('sha256').update(bytes).digest('hex'),
    author,
    title:uniqueValue(root,'Title',file),
    aliases:[...aliases.values()],
    skippedItems:[...skipped.values()],
  });
}

await writeFile(new URL('../src/hero-item-builds.js',import.meta.url),
  '// Generated from Valve default client item guides; node scripts/generate-hero-item-builds.mjs\n'+
  '// Snapshot and mapping details: docs/hero-item-build-sources.md\n'+
  'export const HERO_ITEM_BUILDS = '+JSON.stringify(builds,null,2)+';\n');
await writeFile(new URL('manifest.json',snapshots),JSON.stringify(manifest,null,2)+'\n');
const itemCount=Object.values(builds).reduce((sum,build)=>sum+Object.values(build).reduce((count,items)=>count+items.reduce((n,item)=>n+item.quantity,0),0),0);
const skippedCount=manifest.files.reduce((sum,file)=>sum+file.skippedItems.reduce((n,item)=>n+item.quantity,0),0);
console.log(`Generated ${heroes.length} Valve default builds: ${itemCount} item recommendations, ${skippedCount} skipped occurrences`);

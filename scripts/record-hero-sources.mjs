import fs from 'node:fs';
import {createHash} from 'node:crypto';
const trackingCommit='76ab89451c1384c2e106b676258c6e9f72787e11',checkedAt='2026-11-21';
const roster={axe:2,crystal_maiden:5,drow_ranger:6,juggernaut:8,windranger:21,kunkka:23,chen:66,chaos_knight:81,ogre_magi:84};
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest=[];
for(const [hero,id]of Object.entries(roster)){
 const prefix=hero==='windranger'?'windrunner':hero;
 for(const [file,url]of [[`docs/research/heroes/${id}.json`,`https://www.dota2.com/datafeed/herodata?language=english&hero_id=${id}`],[`docs/research/abilities/${id}-schinese.json`,`https://www.dota2.com/datafeed/herodata?language=schinese&hero_id=${id}`],[`docs/research/heroes/npc_dota_hero_${prefix}.txt`,`https://raw.githubusercontent.com/SteamTracking/GameTracking-Dota2/${trackingCommit}/game/dota/pak01_dir/scripts/npc/heroes/npc_dota_hero_${prefix}.txt`]])manifest.push({file,url,sha256:hash(file)});
}
const derivedAssets=[{file:'assets/chaos_knight.png',sha256:hash('assets/chaos_knight.png'),sourceUrl:'https://cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/chaos_knight.webm',sourceSha256:hash('docs/research/heroes/chaos_knight.webm'),method:'PNG still at 0.8 seconds, retaining original transparency; scripts/extract-hero-render.mjs.'}];
for(const id of ['chaos_bolt','reality_rift','chaos_strike','phantasm','armageddon']){
 const file=`assets/abilities/chaos_knight_${id}.png`,texture=id==='armageddon'?'armageddons_flank':id;
 manifest.push({file,url:`https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/abilities/chaos_knight_${texture}.png`,sha256:hash(file)});
}
manifest.push({file:'assets/chaos_knight_portrait.png',url:'https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/heroes/chaos_knight.png',sha256:hash('assets/chaos_knight_portrait.png')});
fs.writeFileSync('docs/research/heroes/sources-7.42.json',JSON.stringify({patch:'7.42',checkedAt,trackingCommit,roster,manifest,derivedAssets},null,2)+'\n');
// Keep the older Chen manifest truthful after its shared source snapshots have been refreshed.
const file='docs/research/chen/sources.json',chen=JSON.parse(fs.readFileSync(file,'utf8'));
chen.patch='7.42';chen.checkedAt=checkedAt;chen.trackingCommit=trackingCommit;
for(const source of chen.manifest){source.sha256=hash(source.file);if(source.url.includes('GameTracking-Dota2'))source.url=source.url.replace(/GameTracking-Dota2\/[a-f0-9]+\//,`GameTracking-Dota2/${trackingCommit}/`);}
fs.writeFileSync(file,JSON.stringify(chen,null,2)+'\n');
console.log('Recorded current hero sources and derived asset hashes.');

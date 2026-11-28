import {TREES} from '../src/map-data.js';
import {captureTeamVision,teamCanSeePoint} from '../src/vision.js';
import {alive,building} from '../src/item-common.js';

// Keep the public simulation projection separate from engine state. Recursion
// retains nested status/item records while dropping navigation and AI internals.
const excluded = new Set([
  'navPath','navGoal','skillCache','innateCache','botState','botShop','botPlan',
  'navigation','grid','token','socket','session','sessions','controlledHeroId',
  'weaverTimeLapseHistory','weaverNextHistoryAt','weaverDeathRewindAnchor',
  'swarmSkill','swarmDir','weaverGeminateQueue','weaverManualGeminateTarget',
]);

function referencesHidden(value,hiddenIds){
  return hiddenIds?.has(value)||value.includes(':')&&value.split(':').some(part=>hiddenIds?.has(part));
}

function project(value, seen = new WeakSet(), visibility=null, topLevel=true) {
  if(typeof value==='string'&&visibility&&referencesHidden(value,visibility.hiddenIds))return undefined;
  if(value === null || typeof value !== 'object') return typeof value === 'function' ? undefined : value;
  if(value instanceof Map || value instanceof Set || seen.has(value)) return undefined;
  if(!topLevel&&visibility?.checkPoint&&!pointsVisible(value,visibility.checkPoint))return undefined;
  seen.add(value);
  const result = Array.isArray(value) ? [] : {};
  for(const [key,entry] of Object.entries(value)) {
    if(excluded.has(key) || visibility&&referencesHidden(key,visibility.hiddenIds) || /(?:cache|botplan)/i.test(key)) continue;
    const projected = project(entry,seen,visibility,false);
    if(projected !== undefined){
      if(visibility&&Array.isArray(value))result.push(projected);else result[key]=projected;
    }
  }
  seen.delete(value);
  return result;
}

const spellFields = ['type','sourceId','targetId','x','y','origin','start','dir','landAt','startedAt','traveled','fraction','effectStarted'];
const locationFields=[['x','y'],['tx','ty'],['x1','y1'],['x2','y2']];
const nestedLocations=['point','origin','start','from','to','destination'];
const actionFields=['destination','movementInput','neutralCast','neutralChannel','order','worldInteraction','itemChannel',
 'attackPhase','castPhase','channel','xMark','itemWindup','forcedMotion','creatureMotion','cloneHop','omnislash','chaosCharge','weaverTimeLapsePreview'];

function pointsVisible(record,canSee){
  return locationFields.every(([x,y])=>!Number.isFinite(record[x])||!Number.isFinite(record[y])||canSee({x:record[x],y:record[y]}));
}
function visibleEvent(record,canSee,hiddenIds){
  if(hiddenIds.has(record.sourceId)||hiddenIds.has(record.targetId)||!pointsVisible(record,canSee))return false;
  return nestedLocations.every(key=>!record[key]||pointsVisible(record[key],canSee));
}

export function snapshotState(game,team) {
  const fog=team===undefined?null:captureTeamVision(game,team);
  const visibleEntities=fog?game.entities.filter(entity=>fog.visibleIds.has(entity.id)):game.entities;
  const hiddenIds=fog?new Set(game.entities.filter(entity=>!fog.visibleIds.has(entity.id)).map(entity=>entity.id)):null;
  const pointCache=new Map();
  const canSee=point=>{
    const key=`${point.x}:${point.y}`;
    if(!pointCache.has(key))pointCache.set(key,teamCanSeePoint(game,team,point));
    return pointCache.get(key);
  };
  const visibility=fog?{hiddenIds}:null,checkPositions=fog?{hiddenIds,checkPoint:canSee}:null;
  const effects=fog?game.effects.filter(effect=>visibleEvent(effect,canSee,hiddenIds)).map(effect=>{
    if(effect.team===team||!effect.path||effect.path.every(canSee))return effect;
    const {path,...visible}=effect;
    return visible;
  }):game.effects;
  const spells=fog?game.pendingSpells.filter(spell=>visibleEvent(spell,canSee,hiddenIds)):game.pendingSpells;
  const entities=fog?visibleEntities.map(entity=>{
    // Flying, invisible or recently damaged entities can still have private nested points.
    const result=project(entity,undefined,entity.team===team?visibility:checkPositions);
    if(entity.team!==team)for(const key of actionFields)delete result[key];
    if(building(entity))result.protected=game.isProtected(entity);
    return result;
  }):project(visibleEntities);
  const cuts=[...(game.cutTrees||[])],planted=game.plantedTrees||[];
  const camps=fog?game.camps.map(camp=>{
    if(canSee(camp))return camp;
    const {blocked,spawnCount,nextSpawn,...location}=camp;
    return location;
  }):game.camps;
  const objectives=fog?game.worldObjectives?.map(objective=>{
    if(canSee(objective))return objective;
    const {rune,collectedPeriod,...location}=objective;
    return location.objectiveType==='outpost'&&location.team!==team?{...location,team:2}:location;
  }):game.worldObjectives;
  const buildingsRemaining=fog?[{tower:0,barracks:0},{tower:0,barracks:0}]:null;
  if(buildingsRemaining)for(const entity of game.entities){
    const count=buildingsRemaining[entity.team];
    if(count&&Object.hasOwn(count,entity.kind)&&alive(entity))count[entity.kind]++;
  }
  return {
    time:game.time,status:game.status,paused:game.paused,winner:game.winner,
    score:project(game.score),entities,effects:project(effects,undefined,visibility),
    feed:project(game.feed),wave:game.wave,camps:project(camps),
    pendingSpells:spells.map(spell=>project(Object.fromEntries(spellFields.filter(key=>key in spell).map(key=>[key,spell[key]])),undefined,visibility)),
    cutTrees:project(fog?cuts.filter(([index])=>TREES[index]&&canSee(TREES[index])):cuts),
    plantedTrees:project(fog?planted.filter(canSee):planted),
    shopStocks:project(fog?Object.fromEntries(Object.entries(game.shopStocks||{}).filter(([key])=>key.startsWith(`${team}:`))):game.shopStocks||{}),
    glyphStates:project(fog?game.glyphStates?.map((value,index)=>index===team?value:null):game.glyphStates),
    worldObjectives:project(objectives),madstoneDrops:project(fog?game.madstoneDrops?.filter(canSee):game.madstoneDrops),
    tormentorDeaths:game.tormentorDeaths,roshanDeaths:game.roshanDeaths,
    ...(!fog?{tormentorRespawnAt:game.tormentorRespawnAt}:{}),
    ...(fog?{
      roster:game.entities.filter(entity=>entity.kind==='hero').map(({id,kind,heroId,team,name,controller})=>({id,kind,heroId,team,name,controller})),
      buildingsRemaining,
      lastSeen:fog.lastSeen,
    }:{}),
  };
}

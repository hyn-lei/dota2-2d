import {ITEM_BY_ID} from './item-data.js';
import {TREES} from './map-data.js';
import {NAV_GRID} from './nav-data.js';
import {terrainHeightAt} from './terrain-height.js';
import {hasStatusFlag} from './hero-runtime.js';
import {alive} from './item-common.js';

const {cols,rows,cellSize}=NAV_GRID;
const cellCount=cols*rows,cliffRise=64,treeBlockRise=192,rayCacheLimit=8192,memorySeconds=15;
const states=new WeakMap();
const networkEntityIds=new WeakMap();
const teamVisionRanges={creep:[750,750],neutral:[800,800],summon:[800,800],barracks:[900,600],ancient:[2600,2600],
 fountain:[1800,1800],filler:[0,0],healingWard:[600,600]};
const defaultUnitRange=575;
const isTeam=team=>team===0||team===1;
const cellOf=position=>{
 const x=Math.round(position.x/cellSize),y=Math.round(position.y/cellSize);
 return x>=0&&x<cols&&y>=0&&y<rows?y*cols+x:-1;
};
const cellPoint=index=>({x:index%cols*cellSize,y:Math.floor(index/cols)*cellSize});
const squaredDistance=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;

function stateFor(g){
 let state=states.get(g);
 if(!state){
  state={rays:new Map(),memory:[new Map(),new Map()]};
  states.set(g,state);
 }
 if(state.treeLayer!==g.navigation?.terrainBlocked||state.cuts!==g.cutTrees||state.cutCount!==(g.cutTrees?.size||0)||
     state.planted!==g.plantedTrees||state.plantedCount!==(g.plantedTrees?.length||0)||g.time>=state.treeExpiry||g.time<state.treeTime){
  const blockers=new Uint8Array(cellCount);
  const mark=(tree,radius)=>{
   const cell=cellOf(tree);
   if(cell<0)return;
   const col=cell%cols,row=Math.floor(cell/cols);
   for(let y=Math.max(0,row-1);y<=Math.min(rows-1,row+1);y++)for(let x=Math.max(0,col-1);x<=Math.min(cols-1,col+1);x++)
    if(squaredDistance(tree,{x:x*cellSize,y:y*cellSize})<=radius**2)blockers[y*cols+x]=1;
  };
  for(let index=0;index<TREES.length;index++)if(!g.cutTrees?.has(index))mark(TREES[index],64);
  let expiry=Infinity;
  for(const tree of g.plantedTrees||[])if(tree.until>g.time){expiry=Math.min(expiry,tree.until);mark(tree,48);}
  Object.assign(state,{blockers,treeLayer:g.navigation?.terrainBlocked,cuts:g.cutTrees,cutCount:g.cutTrees?.size||0,
   planted:g.plantedTrees,plantedCount:g.plantedTrees?.length||0,treeExpiry:expiry,treeTime:g.time});
  state.rays.clear();
 }
 if(state.entityList!==g.entities||state.entityCount!==g.entities.length||state.sourceTime!==g.time){
  state.sources=[[],[]];
  for(const unit of g.entities)if(isTeam(unit.team)&&unit.kind!=='droppedItem')state.sources[unit.team].push(unit);
  Object.assign(state,{entityList:g.entities,entityCount:g.entities.length,sourceTime:g.time});
 }
 return state;
}

function groundLineClear(state,source,target){
 const from=cellOf(source),to=cellOf(target);
 if(from===to)return from>=0;
 if(from<0||to<0)return false;
 const key=from*cellCount+to,cached=state.rays.get(key);
 if(cached!==undefined)return cached;
 const first=cellPoint(from),last=cellPoint(to);
 const level=terrainHeightAt(first),endLevel=terrainHeightAt(last);
 let visible=level!==null&&endLevel!==null&&endLevel-level<cliffRise;
 const steps=Math.max(Math.abs(first.x-last.x),Math.abs(first.y-last.y))/cellSize;
 for(let i=1;visible&&i<steps;i++){
  const cell=cellOf({x:first.x+(last.x-first.x)*i/steps,y:first.y+(last.y-first.y)*i/steps});
  const height=terrainHeightAt(cellPoint(cell));
  visible=height!==null&&height-level<cliffRise&&(!state.blockers[cell]||level-height>=treeBlockRise);
 }
 if(state.rays.size>=rayCacheLimit)state.rays.delete(state.rays.keys().next().value);
 state.rays.set(key,visible);
 return visible;
}

export function unitVisionRange(g,unit){
 if(unit.kind==='ward'&&unit.wardType==='sentry'){
  const wardAge=g.time+ITEM_BY_ID.ward_sentry.values.lifetime-unit.expiresAt;
  return wardAge>=0&&wardAge<12?150:0;
 }
 if(unit.providesVision)return unit.visionRange??0;
 const night=g.time%600>=300;
 const explicit=night?unit.visionNight??unit.nightVision:unit.visionDay??unit.dayVision;
 if(Number.isFinite(explicit))return explicit;
 if(unit.kind==='ward'&&unit.wardType==='observer')return ITEM_BY_ID.ward_observer.values.vision_range_tooltip;
 if(unit.kind==='tower')return night?(unit.tier===1?800:1100):1900;
 return teamVisionRanges[unit.kind]?.[Number(night)]??defaultUnitRange;
}

const available=(g,source)=>alive(source)&&!(source.expiresAt>0&&source.expiresAt<=g.time);

function sourceSeesPoint(g,state,source,point){
 if(!available(g,source))return false;
 const range=unitVisionRange(g,source);
 if(range<=0||squaredDistance(source,point)>range*range)return false;
 return !!(source.flying||source.kind==='weaverBeetle'&&source.providesVision||
  source.kind==='ward'&&source.wardType==='sentry'||
  source.neutralItem==='giants_ring'||hasStatusFlag(g,source,'flying')||groundLineClear(state,source,point));
}

function teamSeesPoint(g,state,team,point){
 return !!state.sources[team]?.some(source=>source.team===team&&sourceSeesPoint(g,state,source,point));
}

export function teamCanSeePoint(g,team,point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||!isTeam(team))return false;
 return teamSeesPoint(g,stateFor(g),team,point);
}

function grantsTrueSight(g,source,point){
 if(!available(g,source))return false;
 const distance=squaredDistance(source,point);
 if(source.trueSight>0&&distance<=source.trueSight**2)return true;
 return source.kind==='hero'&&distance<=ITEM_BY_ID.gem.values.radius**2&&source.inventory?.some((id,index)=>{
  if(id!=='gem')return false;
  const item=source.inventoryMeta?.[index];
  return !item||(item.readyAt||0)<=g.time;
 });
}

function revealedBy(g,team,target,itemId){
 return Object.values(target.statuses||{}).some(status=>status.revealed&&status.revealedTeam===team&&
  (!itemId||status.itemId===itemId)&&status.startedAt<=g.time&&status.until>g.time);
}

function seesInvisible(g,state,team,target){
 if(revealedBy(g,team,target))return true;
 return !!state.sources[team]?.some(source=>source.team===team&&grantsTrueSight(g,source,target));
}

/** Detection is independent of ordinary vision. Both are required to see an invisible unit. */
export function hasTeamTrueSight(g,team,target){
 return !!target&&isTeam(team)&&(revealedBy(g,team,target,'gem')||
  !hasStatusFlag(g,target,'smoked')&&seesInvisible(g,stateFor(g),team,target));
}

function targetVisible(g,state,viewer,target){
 const team=viewer.team;
 if((isTeam(team)&&team===target.team)||viewer===target)return true;
 if(isTeam(team)&&revealedBy(g,team,target,'gem'))return true;
 if(hasStatusFlag(g,target,'smoked'))return false;
 const visible=isTeam(team)?teamSeesPoint(g,state,team,target):sourceSeesPoint(g,state,viewer,target);
 return visible&&(!hasStatusFlag(g,target,'invisible')||
  (isTeam(team)?seesInvisible(g,state,team,target):grantsTrueSight(g,viewer,target)));
}

export function canSeeEntity(g,viewer,target){
 if(!viewer||!target)return false;
 if(g.isNetwork){
  if(viewer.team===target.team)return true;
  let ids=networkEntityIds.get(g.entities);
  if(!ids){ids=new Set(g.entities.map(unit=>unit.id));networkEntityIds.set(g.entities,ids);}
  return ids.has(target.id);
 }
 return targetVisible(g,stateFor(g),viewer,target);
}

/** Capture visible IDs and a short, bounded memory of previously observed heroes. */
export function captureTeamVision(g,team){
 const state=stateFor(g),memory=state.memory[team],visibleIds=new Set();
 if(!memory)return {visibleIds,lastSeen:[]};
 for(const entity of g.entities){
  if(!targetVisible(g,state,{team},entity))continue;
  visibleIds.add(entity.id);
  if(entity.kind==='hero'&&entity.team!==team){
   if(alive(entity))memory.set(entity.id,{id:entity.id,heroId:entity.heroId,team:entity.team,x:entity.x,y:entity.y,seenAt:g.time});
   else memory.delete(entity.id);
  }
 }
 for(const [id,seen] of memory)if(g.time<seen.seenAt||g.time-seen.seenAt>=memorySeconds)memory.delete(id);
 return {visibleIds,lastSeen:[...memory.values()].filter(seen=>!visibleIds.has(seen.id))};
}

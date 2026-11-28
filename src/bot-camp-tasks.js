import {TEAM_LANES} from './map-data.js';
import {isLaneCreep} from './deny-runtime.js';
import {campSpawnBounds,insideCampSpawnBounds} from './world-runtime.js';
import {botProfile} from './bot-difficulty.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=unit=>unit&&!unit.dead&&unit.hp>0;
const support=hero=>['support','roamer'].includes(hero.draftRole);
const campRoutes=new WeakMap();
export const isCampTask=plan=>['pull-camp','stack-camp'].includes(plan?.mode);
const campStillUsable=(g,h,plan)=>plan.targets.some(unit=>
 !g.canSee(h,unit)||alive(unit)&&unit.team===2&&unit.campId===plan.objectiveId);

function campRoute(g,team){
 let routes=campRoutes.get(g.camps);
 if(!routes){routes=new Map();campRoutes.set(g.camps,routes);}
 if(routes.has(team))return routes.get(team);
 const lane=team===0?2:0;
 const camp=g.camps.find(c=>c.ownerTeam===team&&c.lane===lane&&c.type==='small'&&c.area==='jungle');
 if(!camp){routes.set(team,null);return null;}
 let meeting=null;
 for(const [index,end] of TEAM_LANES[team][lane].entries()){
  const start=TEAM_LANES[team][lane][index-1];if(!start)continue;
  const dx=end.x-start.x,dy=end.y-start.y;
  const t=Math.min(1,Math.max(0,((camp.x-start.x)*dx+(camp.y-start.y)*dy)/(dx*dx+dy*dy)));
  const point={x:start.x+t*dx,y:start.y+t*dy};
  if(!meeting||distance(point,camp)<distance(meeting,camp))meeting=point;
 }
 if(!meeting){routes.set(team,null);return null;}
 const bounds=campSpawnBounds(camp);
 let exit=null,shortest=Infinity;
 for(let degrees=0;degrees<360;degrees+=30){
  const angle=degrees*Math.PI/180;
  const point=g.navigation.nearestWalkable({x:camp.x+Math.cos(angle)*1150,y:camp.y+Math.sin(angle)*1150});
  if(insideCampSpawnBounds(point,bounds)||distance(camp,point)>1500)continue;
  const path=g.navigation.findPath(camp,point);if(!path.length)continue;
  const cost=path.reduce((total,node,i)=>total+distance(node,path[i-1]||camp),0);
  if(cost<shortest){shortest=cost;exit=point;}
 }
 const route={camp,lane,meeting,bounds,exit};routes.set(team,route);return route;
}

export function assignCampTask(g,world,team,available,plans,previous){
 if(g.time<65||g.time>720||!available.size)return;
 const route=campRoute(g,team);if(!route)return;
 const {camp,lane,meeting,bounds}=route,view=world.teams[team];
 if(view.visibleHeroes.some(e=>distance(e,camp)<1300||distance(e,meeting)<1000))return;
 const wave=view.units.filter(e=>isLaneCreep(e)&&e.lane===lane&&distance(e,meeting)<1450);
 if(wave.some(e=>insideCampSpawnBounds(e,bounds)))return;
 for(const h of available){
  if(!support(h)||h.lane!==lane||botProfile(g,h).tier<3||h.hp/h.maxHp<.55||h.retreating||h.itemChannel||h.channel||h.castPhase||h.botState?.campSuppressedUntil>g.time)continue;
  const old=previous.get(h.id);
  if(isCampTask(old)&&old.expiresAt>g.time&&campStillUsable(g,h,old)){plans.set(h.id,old);return;}
 }
 const observer=available.values().next().value;
 const neutrals=(world.neutralsByCamp.get(camp.id)||[]).filter(e=>g.canSee(observer,e)&&alive(e));
 if(!neutrals.length)return;
 const untilSpawn=g.nextNeutralSpawn-g.time;
 const approaching=wave.some(e=>{
  const waypoint=TEAM_LANES[team][lane][e.pathIndex??0];
  return waypoint&&(meeting.x-e.x)*(waypoint.x-e.x)+(meeting.y-e.y)*(waypoint.y-e.y)>0;
 });
 const mode=untilSpawn>=4&&untilSpawn<=7&&route.exit?'stack-camp':approaching&&untilSpawn>10?'pull-camp':null;
 if(!mode||!neutrals.some(e=>insideCampSpawnBounds(e,bounds)))return;
 const candidates=[...available].filter(h=>support(h)&&h.lane===lane&&botProfile(g,h).tier>=3&&
  h.hp/h.maxHp>=.55&&!h.retreating&&!h.channel&&!h.castPhase&&!h.itemChannel&&!(h.botState?.campSuppressedUntil>g.time)&&distance(h,camp)<(mode==='stack-camp'?730:1200)&&
  neutrals.some(e=>g.canSee(h,e)));
 candidates.sort((a,b)=>distance(a,camp)-distance(b,camp)||a.id.localeCompare(b.id));
 const h=candidates[0];if(!h)return;
 plans.set(h.id,{key:`${mode}:${camp.id}`,mode,objectiveId:camp.id,goal:camp,route,targets:neutrals,
  expiresAt:mode==='stack-camp'?g.nextNeutralSpawn+.25:g.time+10});
}

export function advanceCampTask(g,h,plan,world,dt){
 const {camp,meeting,exit,bounds,lane}=plan.route,state=h.botState;
 const neutrals=(world.neutralsByCamp.get(camp.id)||[]).filter(e=>g.canSee(h,e)&&alive(e));
 if(g.time>=plan.expiresAt||!neutrals.length&&!campStillUsable(g,h,plan))return false;
 if(state.campKey!==plan.key||state.campExpiresAt!==plan.expiresAt){
  state.campKey=plan.key;state.campExpiresAt=plan.expiresAt;state.campAggro=false;state.campTurning=false;state.campTargets=plan.targets.map(e=>e.id);
 }
 state.campAggro||=neutrals.some(e=>e.targetId===h.id);
 if(!state.campAggro){
  const target=neutrals.filter(e=>!e.returning).sort((a,b)=>distance(h,a)-distance(h,b))[0];
  if(!target)return false;
  if(!g._attack(h,target))g._move(h,target,dt,Math.max(35,h.range+target.radius-12));
  return true;
 }
 h.targetId=null;
 if(plan.mode==='stack-camp'){g._move(h,exit,dt,23);return true;}
 const wave=world.teams[h.team].units.filter(e=>isLaneCreep(e)&&e.lane===lane&&distance(e,camp)<1650);
 state.campTurning||=wave.some(e=>state.campTargets.includes(e.targetId));
 if(wave.some(e=>insideCampSpawnBounds(e,bounds)))return false;
 g._move(h,state.campTurning?camp:meeting,dt,30);return true;
}

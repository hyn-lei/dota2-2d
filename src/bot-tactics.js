import {BASES} from './map-data.js';
import * as Items from './item-runtime.js';
import * as Skills from './hero-runtime.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=e=>e&&!e.dead&&e.hp>0;
const fighter=kind=>['hero','creep','neutral','illusion','summon'].includes(kind);
const building=kind=>['tower','barracks','ancient','fountain','filler'].includes(kind);
const automated=h=>!h.isPlayer&&!h.isHuman&&h.aiTimer!==Infinity;
const worlds=new WeakMap();

export function fightingPower(g,h){
  const s=g.combatStats(h);
  return (s.damage/Math.max(.25,s.attackInterval)+(h.level||1)*5)*(h.hp/h.maxHp+.25);
}
function sight(g,e){
  const night=g.time%600>=300;
  return night?(e.visionNight??e.nightVision??800):(e.visionDay??e.dayVision??1800);
}
function teleportEntry(g,h){
  const index=h.tp?.indexOf('tpscroll')??-1;
  if(index<0)return null;
  const e=Items.itemState(g,h,index,'tp');
  return e.active&&e.cooldown<=0&&e.ready<=0&&h.mana>=e.item.mana?e:null;
}
function landingTargets(g,h,world,goal){
  const boots=Items.statItems(g,h).find(e=>e.id.startsWith('travel_boots'));
  return [...world.teams[h.team].buildings,...(boots?world.teams[h.team].units.filter(e=>e!==h&&(boots.id==='travel_boots_2'||e.kind!=='hero')):[])]
    .filter(e=>alive(e)&&distance(e,goal)<2400&&e.hp/e.maxHp>.22)
    .sort((a,b)=>distance(a,goal)-distance(b,goal));
}
function routeCost(g,h,world,goal){
  const speed=Math.max(100,g.combatStats(h).speed),walk=distance(h,goal)/speed;
  if(!teleportEntry(g,h))return walk;
  const target=landingTargets(g,h,world,goal)[0];
  return target?Math.min(walk,3+distance(target,goal)/speed):walk;
}
function defensePoint(t){
  const base=BASES[t.team],d=distance(t,base)||1;
  return {x:t.x+(base.x-t.x)/d*260,y:t.y+(base.y-t.y)/d*260};
}
function requests(g,world,team){
  const view=world.teams[team],enemies=view.visibleFighters,enemyHeroes=view.visibleHeroes,objectives=[];
  for(const t of view.buildings)if(['tower','barracks','ancient'].includes(t.kind)){
    const threats=enemies.filter(e=>distance(e,t)<Math.max(800,(t.range||0)+180));
    const heroes=threats.filter(e=>e.kind==='hero');
    if(!heroes.length&&threats.length<3)continue;
    const base=t.kind==='ancient'||t.kind==='barracks'||t.tier>=3;
    objectives.push({key:`defend:${t.id}`,mode:'defend',objectiveId:t.id,lane:t.lane,goal:defensePoint(t),
      score:(base?8500:5000)+heroes.length*300+(1-t.hp/t.maxHp)*650+threats.length*35,
      demand:base?Math.min(5,Math.max(3,heroes.length+1)):Math.min(4,Math.max(1,heroes.length+1)),
      critical:base,threats});
  }
  const engaged=new Set();
  for(const ally of view.heroes){
    const enemy=enemyHeroes.find(e=>distance(e,ally)<1400&&
      (ally.targetId===e.id||e.targetId===ally.id||(ally.lastDamageAt??-Infinity)>g.time-3&&distance(e,ally)<900));
    if(!enemy||engaged.has(enemy.id))continue;
    engaged.add(enemy.id);
    const opponents=enemyHeroes.filter(e=>distance(e,enemy)<1500);
    const participants=view.heroes.filter(h=>distance(h,enemy)<1600&&h.hp/h.maxHp>.3);
    // Support real or forming fights, but do not drag a team into the enemy fountain.
    if(world.teams[1-team].buildings.some(t=>t.kind==='fountain'&&distance(t,enemy)<1200))continue;
    objectives.push({key:`assist:${enemy.id}`,mode:'assist',objectiveId:enemy.id,goal:{x:enemy.x,y:enemy.y},
      score:3500+opponents.length*170+(1-ally.hp/ally.maxHp)*250,
      demand:Math.min(5,Math.max(2,opponents.length+1,participants.length)),critical:false,threats:opponents});
  }
  if(g.time>120)for(const t of world.teams[1-team].buildings)if(['tower','barracks','ancient'].includes(t.kind)&&!g.isProtected(t)&&
    view.units.some(c=>c.kind==='creep'&&distance(c,t)<850)){
    objectives.push({key:`push:${t.id}`,mode:'push',objectiveId:t.id,lane:t.lane,goal:{x:t.x,y:t.y},
      score:1600+(1-t.hp/t.maxHp)*250-(t.tier||0)*80,demand:3,critical:false,threats:[]});
  }
  return objectives.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
}
function allocate(g,world,team,previous){
  const view=world.teams[team],available=new Set(view.bots),plans=new Map();
  for(const request of requests(g,world,team)){
    const participants=view.heroes.filter(h=>h.hp/h.maxHp>.3&&!h.retreating&&
      (distance(h,request.goal)<1500||h.botState?.supportArrival?.key===request.key&&h.botState.supportArrival.until>g.time));
    // Heroes already at the objective help together; only the missing support is recruited remotely.
    for(const h of participants)if(available.has(h)&&!h.retreating){plans.set(h.id,request);available.delete(h);}
    let needed=Math.max(0,request.demand-participants.length);
    const candidates=[...available].filter(h=>!h.retreating&&h.hp/h.maxHp>.42&&!h.itemChannel&&!h.channel&&!h.castPhase&&
      (request.mode!=='push'||distance(h,request.goal)<4800)&&
      (request.critical||!view.visibleHeroes.some(e=>e.targetId===h.id&&distance(h,e)<900)))
      .map(h=>{const eta=routeCost(g,h,world,request.goal);return {h,eta,cost:eta-
        (previous.get(h.id)?.key===request.key?3:0)+(h.botShop?.needsShop?4:0)};})
      .filter(c=>c.eta<(request.critical?38:request.mode==='assist'?20:28))
      .sort((a,b)=>a.cost-b.cost||a.h.id.localeCompare(b.h.id));
    for(const {h} of candidates){if(needed--<=0)break;plans.set(h.id,request);available.delete(h);}
  }
  return plans;
}

// One shared observation/assignment pass for both teams every 200 ms. No full-map
// enemy hero knowledge: strategic requests need an allied unit's actual sight.
export function tacticalWorld(g){
  let world=worlds.get(g);
  if(world&&g.time>=world.at&&g.time<world.nextAt)return world;
  const previous=world;
  world={at:g.time,nextAt:g.time+.2,entities:new Map(),fighters:[],structures:[],teams:[0,1].map(()=>({heroes:[],bots:[],units:[],buildings:[]}))};
  for(const e of g.entities)if(alive(e)){
    world.entities.set(e.id,e);const kind=e.kind,view=world.teams[e.team];
    if(fighter(kind)){world.fighters.push(e);if(view)view.units.push(e);}
    if(building(kind)){world.structures.push(e);if(view)view.buildings.push(e);}
    if(kind==='hero'&&view){view.heroes.push(e);if(automated(e))view.bots.push(e);}
  }
  for(const team of [0,1]){
    const view=world.teams[team],observers=[...view.units,...view.buildings];
    view.visibleFighters=world.teams[1-team].units.filter(e=>observers.some(a=>distance(a,e)<=sight(g,a)&&g.canSee(a,e)));
    view.visibleHeroes=view.visibleFighters.filter(e=>e.kind==='hero'&&!Skills.isInvulnerable(g,e));
    view.plans=allocate(g,world,team,previous?.teams[team].plans||new Map());
  }
  worlds.set(g,world);return world;
}

export function tacticalPlan(g,h){return tacticalWorld(g).teams[h.team].plans.get(h.id);}

export function trySupportTeleport(g,h,plan,ctx){
  if(!plan||!['defend','assist'].includes(plan.mode)||distance(h,plan.goal)<1800||
    Skills.isStunned(g,h)||Skills.isRooted(g,h)||ctx.enemyHeroes.some(e=>distance(e,h)<1100)||
    (h.lastDamageAt??-Infinity)>g.time-2||g.time<(h.botState.nextSupportTpAt||0))return false;
  const entry=teleportEntry(g,h);if(!entry)return false;
  h.botState.nextSupportTpAt=g.time+.8;
  const world=tacticalWorld(g),speed=Math.max(100,g.combatStats(h).speed),walk=distance(h,plan.goal)/speed;
  for(const target of landingTargets(g,h,world,plan.goal)){
    const landing=target.kind==='fountain'?target:{x:target.x+100,y:target.y+100};
    const duration=h.inventory.includes('travel_boots_2')?2:3;
    if(duration+distance(landing,plan.goal)/speed+3>=walk)continue;
    const enemies=world.teams[h.team].visibleHeroes.filter(e=>distance(e,landing)<1000);
    const allies=world.teams[h.team].heroes.filter(a=>distance(a,landing)<1500||
      a.itemChannel?.kind==='teleport'&&distance(a.itemChannel.point,landing)<1000);
    const alliedPower=allies.reduce((n,a)=>n+fightingPower(g,a),fightingPower(g,h));
    if(enemies.some(e=>distance(e,landing)<500)&&enemies.reduce((n,e)=>n+fightingPower(g,e),0)>alliedPower*1.4)continue;
    if(Items.useItem(g,h,entry.index,target,'tp').ok){
      h.botState.supportArrival={key:plan.key,objectiveId:plan.objectiveId,until:g.time+duration+5};
      h.botState.mode=plan.mode;h.targetId=null;h.botState.targetId=null;return true;
    }
  }
  return false;
}

export function safeStandPoint(g,h,threat,padding=240){
  const radius=(threat.kind==='hero'?Math.max(850,threat.range+500):threat.range+padding)+(h.radius||24);
  let dx=h.x-threat.x,dy=h.y-threat.y;
  if(Math.hypot(dx,dy)<1){dx=BASES[h.team].x-threat.x;dy=BASES[h.team].y-threat.y;}
  const angle=Math.atan2(dy,dx),navigator=Skills.movementNavigator(g,h);
  let best=null,score=Infinity;
  for(const offset of [0,.35,-.35,.7,-.7,1.2,-1.2,Math.PI]){
    const p=navigator.nearestWalkable({x:threat.x+Math.cos(angle+offset)*radius,y:threat.y+Math.sin(angle+offset)*radius});
    if(distance(p,threat)<radius-60)continue;
    const cost=distance(h,p)+distance(p,BASES[h.team])*.08;
    if(cost<score){score=cost;best=p;}
  }
  return best||navigator.nearestWalkable(BASES[h.team]);
}

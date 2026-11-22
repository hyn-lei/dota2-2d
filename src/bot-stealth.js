import * as Inventory from './inventory.js';
import * as Items from './item-runtime.js';
import * as Skills from './hero-runtime.js';
import {ITEM_BY_ID} from './item-data.js';
import {botProfile} from './bot-difficulty.js';
import {tacticalWorld} from './bot-tactics.js';

const states=new WeakMap(),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const stealthItems=new Set(['glimmer_cape','invis_sword','silver_edge','shadow_amulet']);
const detectionItems=new Set(['dust','ward_sentry','gem']);
const alive=h=>h&&!h.dead&&h.hp>0;
function teamState(g,team){
  let state=states.get(g);if(!state){state=[0,1].map(()=>({seen:new Map(),risk:new Map(),jobs:new Map(),publicDeaths:new Map(),nextSupplyAt:0}));states.set(g,state);}return state[team];
}
export function resetBotStealth(g){states.delete(g);}
function clearPublicDeaths(state){
  // Only the public death flag is read through this reference. Search geometry,
  // gear and motion always come from copied observations of visible enemies.
  for(const [id,unit] of state.publicDeaths)if(unit.dead){state.seen.delete(id);state.jobs.delete(id);state.risk.delete(id);state.publicDeaths.delete(id);}
}
const role=h=>h.draftRole==='support'?0:h.draftRole==='roamer'?.25:['chen','crystal_maiden','ogre_magi'].includes(h.heroId)?.5:1;
function readyDetection(g,h,dustOnly=false){
  return Inventory.itemEntries(h,['inventory']).some(e=>{
    if(dustOnly?e.id!=='dust':!detectionItems.has(e.id))return false;const item=Items.itemState(g,h,e.index);return item.cooldown<=0&&item.ready<=0;
  });
}
function responders(g,h,point,radius=900){
  return tacticalWorld(g).teams[h.team].bots.filter(b=>alive(b)&&distance(b,point)<=radius&&
      (!b.retreating&&b.hp/b.maxHp>.4||b.retreating&&b.hp/b.maxHp>.2&&readyDetection(g,b,true)))
    .map(b=>({bot:b,score:(readyDetection(g,b)?-3:0)+role(b)+distance(b,point)/1500}))
    .sort((a,b)=>a.score-b.score||a.bot.id.localeCompare(b.bot.id)).map(e=>e.bot);
}
export function observeBotStealth(g,h,ctx){
  const state=teamState(g,h.team),visible=new Set();clearPublicDeaths(state);
  // These are local currently visible entities, never stale enemy snapshots.
  for(const enemy of (ctx.enemies||ctx.enemyHeroes).filter(e=>e.kind==='hero')){
    if(enemy.dead)continue;
    visible.add(enemy.id);
    state.publicDeaths.set(enemy.id,enemy);
    const statuses=Object.values(enemy.statuses||{}),capable=enemy.heroId==='weaver'||enemy.inventory?.some(id=>stealthItems.has(id))||
      statuses.some(s=>s.invisible&&s.until>g.time);
    const old=state.seen.get(enemy.id);
    state.seen.set(enemy.id,{id:enemy.id,x:enemy.x,y:enemy.y,at:g.time,capable:capable||old?.capable,
      close:distance(h,enemy)<900,smoke:enemy.inventory?.includes('smoke_of_deceit')&&!capable});
    if(capable){const risk=state.risk.get(enemy.id)||{events:0};state.risk.set(enemy.id,{...risk,id:enemy.id,x:enemy.x,y:enemy.y,until:g.time+120,smoke:false});}
    state.jobs.delete(enemy.id);
  }
  for(const [id,last] of state.seen){
    if(g.time-last.at>12){state.seen.delete(id);if(!state.risk.has(id))state.publicDeaths.delete(id);continue;}
    if(visible.has(id)||g.time-last.at<.06||g.time-last.at>5||distance(h,last)>Math.min(900,botProfile(g,h).awareness-150))continue;
    if(!last.capable&&(!last.close||botProfile(g,h).tier<3)||state.jobs.has(id))continue;
    const risk=state.risk.get(id)||{events:0};risk.events++;risk.id=id;risk.x=last.x;risk.y=last.y;risk.until=g.time+120;risk.smoke=last.smoke;state.risk.set(id,risk);
    state.jobs.set(id,{id,x:last.x,y:last.y,until:last.at+5,tried:false,smoke:last.smoke,responderId:null});
  }
  for(const [id,job] of state.jobs)if(job.until<=g.time)state.jobs.delete(id);
  for(const [id,risk] of state.risk)if(risk.until<=g.time){state.risk.delete(id);if(!state.seen.has(id))state.publicDeaths.delete(id);}
  prepareBotDetectionSlot(g,h);
}
export function botDetectionNeeded(g,h){
  return botProfile(g,h).tier>=2&&[...teamState(g,h.team).risk.values()].some(r=>r.until>g.time&&!r.smoke&&distance(h,r)<=3500);
}
export function botDetectionReserved(g,h){return botDetectionNeeded(g,h)&&!!h.botState?.detectionReserved;}
export function prepareBotDetectionSlot(g,h){
  if(!botDetectionNeeded(g,h)||h.isPlayer||h.isHuman||h.aiTimer===Infinity)return false;
  const inventory=Inventory.itemEntries(h,['inventory']),carried=Inventory.itemEntries(h,['backpack']).find(e=>detectionItems.has(e.id));
  if(inventory.some(e=>detectionItems.has(e.id))){if(h.botState)h.botState.detectionReserved=false;return false;}
  const risk=[...teamState(g,h.team).risk.values()].find(r=>r.until>g.time&&distance(h,r)<=3500);
  if(!carried&&(role(h)>.5||responders(g,h,risk,3500)[0]?.id!==h.id))return false;
  const replace=inventory.filter(e=>!detectionItems.has(e.id)&&e.id!=='black_king_bar'&&!e.id.includes('blink')&&ITEM_BY_ID[e.id].movementGroup!=='boots')
    .sort((a,b)=>ITEM_BY_ID[a.id].cost-ITEM_BY_ID[b.id].cost)[0];
  const empty=Array.from({length:6},(_,i)=>i).find(i=>!h.inventory[i]);
  if(carried){
    const index=empty??replace?.index;if(index==null)return false;
    return Inventory.moveItem(g,h,'backpack',carried.index,'inventory',index).ok;
  }
  if(empty!=null||!replace)return false;
  const area=h.backpack.filter(Boolean).length<3?'backpack':Inventory.shopAccess(h).base&&h.stash.filter(Boolean).length<6?'stash':null;
  if(!area)return false;const index=Array.from({length:area==='backpack'?3:6},(_,i)=>i).find(i=>!h[area][i]);
  const ok=Inventory.moveItem(g,h,'inventory',replace.index,area,index).ok;
  if(ok&&h.botState)h.botState.detectionReserved=true;return ok;
}
function jobFor(g,h){
  const state=teamState(g,h.team);clearPublicDeaths(state);
  const jobs=[...state.jobs.values()].filter(j=>j.until>g.time&&distance(h,j)<=900).sort((a,b)=>distance(h,a)-distance(h,b));
  for(const job of jobs){
    const nearby=responders(g,h,job),assigned=nearby.find(b=>b.id===job.responderId)||nearby[0];
    job.responderId=assigned?.id||null;if(job.responderId===h.id)return job;
  }
  return null;
}
function covered(g,h,point){
  return (g.itemZones||[]).some(z=>z.type==='reveal'&&z.team===h.team&&z.until>g.time&&distance(z,point)<z.radius-80)||
    g._near(h,2200).some(w=>alive(w)&&w.team===h.team&&w.kind==='ward'&&w.trueSight>0&&distance(w,point)<w.trueSight-80);
}
export function tryBotDetection(g,h,ctx,defensive=false){
  const job=jobFor(g,h);if(!job||job.tried||job.smoke||covered(g,h,job))return false;
  for(const id of defensive?['dust']:['dust','ward_sentry','gem']){
    const entry=Inventory.itemEntries(h,['inventory']).find(e=>e.id===id);if(!entry)continue;
    const item=Items.itemState(g,h,entry.index);if(!item.active||item.cooldown>0||item.ready>0)continue;
    const d=distance(h,job),range=item.item.range;
    if(id==='gem'&&d>range+(item.item.values.active_radius||300)-30)continue;
    const point=id==='dust'?h:{x:h.x+(job.x-h.x)*Math.min(1,range/Math.max(1,d)),y:h.y+(job.y-h.y)*Math.min(1,range/Math.max(1,d))};
    if(Items.useItem(g,h,entry.index,point).ok){
      job.tried=true;teamState(g,h.team).nextSupplyAt=g.time+30;
      for(const other of teamState(g,h.team).jobs.values())if(distance(other,job)<700)other.tried=true;
      return true;
    }
  }
  return false;
}
export function searchBotStealth(g,h,ctx,dt,plan,defensive=false){
  if(defensive||['defend','assist'].includes(plan?.mode)||plan?.critical||ctx.enemyHeroes.length)return false;
  const job=jobFor(g,h);if(!job||job.smoke)return false;
  if(ctx.unsupported.some(t=>distance(t,job)<t.range+300))return false;
  h.targetId=null;h.botState.targetId=null;h.botState.mode='search';h.botState.goal={x:job.x,y:job.y};h.botState.searchUntil=job.until;
  const navigator=Skills.movementNavigator(g,h),point=navigator.nearestWalkable(job);
  if(distance(h,point)>100)g._move(h,point,dt,100);
  return true;
}
export function botDetectionSupply(g,h,courier){
  if(botProfile(g,h).tier<2||h.retreating||!alive(h)||courier.dead)return null;
  const state=teamState(g,h.team);clearPublicDeaths(state);if(g.time<state.nextSupplyAt)return null;
  const risks=[...state.risk.values()].filter(r=>r.until>g.time&&!r.smoke).sort((a,b)=>b.events-a.events||distance(h,a)-distance(h,b));
  for(const risk of risks){
    const nearby=responders(g,h,risk,3500);if(nearby[0]?.id!==h.id)continue;
    prepareBotDetectionSlot(g,h);
    const supplied=nearby.some(b=>{
      const c=b.id===h.id?courier:g.entities.find(e=>e.kind==='courier'&&e.ownerId===b.id);
      return [...Inventory.itemEntries(b),...(c?Inventory.itemEntries(c):[])].some(e=>detectionItems.has(e.id)&&e.meta.ownerId===b.id);
    });
    if(supplied||h.inventory.filter(Boolean).length>=6)return null;
    const advanced=botProfile(g,h).tier>=3,gem=advanced&&role(h)<=.5&&risk.events>=3&&g.time>=600&&h.gold>=1500&&h.hp/h.maxHp>.65;
    const ids=[...(gem?['gem']:[]),...(advanced&&risk.events>=2?['ward_sentry']:[]),'dust'];
    return ids.find(id=>h.gold>=ITEM_BY_ID[id].cost&&Inventory.purchaseQuote(g,h,id).ok)||null;
  }
  return null;
}

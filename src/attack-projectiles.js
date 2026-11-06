import { ATTACK_PROFILES } from './attack-records.js';
import { attackVisualFields } from './combat-visuals.js';
import * as Skills from './hero-runtime.js';
const alive=e=>e&&!e.dead&&e.hp>0;
export const attackProfile=e=>ATTACK_PROFILES[e.heroId||e.sourceId]||{speed:e.kind==='tower'?750:e.kind==='fountain'?1400:900,attackPoint:0};
export const isRangedAttack=e=>e.heroId?attackProfile(e).speed>0:e.range>200;

/** The simulation owns the projectile; rendering reads this same moving position. */
export function launchAttack(g,source,target,result,fields={}){
 const profile=attackProfile(source),visual=attackVisualFields(source,target);
 g._effect('projectile',source.x,source.y,{...visual,...fields,visual:result.frostArrow?'drowFrostArrow':visual.visual,tracked:true,life:60});
 const effect=g.effects.at(-1);
 const shot={type:'attack',sourceId:source.id,targetId:target.id,result,x:source.x,y:source.y,origin:{x:source.x,y:source.y},
  speed:source.projectileSpeed||profile.speed||900,disjoint:target.projectileDisjoint||0,targetLife:target.deathTime??null,
  visualId:effect.id,startedAt:g.time,lastTick:g.time,landAt:Infinity};
 g.pendingSpells.push(shot);return shot;
}
export function tickAttacks(g){
 const ready=[];
 for(const shot of g.pendingSpells)if(shot.type==='attack'){
  const target=g.entities.find(e=>e.id===shot.targetId),source=g.entities.find(e=>e.id===shot.sourceId);
  if(!target||!source||!alive(target)||Skills.isInvulnerable(g,target)||(target.projectileDisjoint||0)!==shot.disjoint||
    (target.deathTime??null)!==shot.targetLife||!g.canSee(source,target))shot.cancelled=true;
  if(!shot.cancelled){
   const dx=target.x-shot.x,dy=target.y-shot.y,d=Math.hypot(dx,dy),travel=shot.speed*Math.max(0,g.time-shot.lastTick);
   shot.lastTick=g.time;const angle=Math.atan2(dy,dx);
   if(d<=travel+1e-7){shot.x=target.x;shot.y=target.y;shot.arrived=true;}
   else{shot.x+=dx/d*travel;shot.y+=dy/d*travel;}
   const effect=g.effects.find(f=>f.id===shot.visualId);
   if(effect){const total=Math.hypot(target.x-shot.origin.x,target.y-shot.origin.y)||1,progress=Math.min(1,Math.hypot(shot.x-shot.origin.x,shot.y-shot.origin.y)/total);
    Object.assign(effect,{x:shot.x,y:shot.y,tx:target.x,ty:target.y,angle,lift:(source.kind==='tower'?135:source.kind==='hero'?42:24)*(1-progress)+(target.kind==='hero'?35:20)*progress});}
  }
  if(shot.arrived||shot.cancelled)ready.push(shot);
 }
 g.pendingSpells=g.pendingSpells.filter(s=>!ready.includes(s));
 for(const shot of ready){
  g.effects=g.effects.filter(f=>f.id!==shot.visualId);
  if(!shot.cancelled){const source=g.entities.find(e=>e.id===shot.sourceId),target=g.entities.find(e=>e.id===shot.targetId);
   if(alive(target))g._hitAttack(source,target,shot.result);}
 }
}

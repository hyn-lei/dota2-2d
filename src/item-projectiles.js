import * as C from './item-common.js';
const value=C.value;
export function queueTargetItem(g,h,entry,target,options={}){
 g.itemZones||=[];const colors={nullifier:'#cba366',ethereal_blade:'#7ddfba',harpoon:'#b6c4db'};
 g._effect('projectile',h.x,h.y,{tx:target.x,ty:target.y,sourceId:h.id,targetId:target.id,itemId:entry.id,tracked:true,life:60,color:colors[entry.id],visual:entry.id});
 g.itemZones.push({type:'itemTracking',itemId:entry.id,sourceId:h.id,targetId:target.id,team:h.team,x:h.x,y:h.y,origin:{x:h.x,y:h.y},speed:value(entry.item,'projectile_speed'),lastTick:g.time,startedAt:g.time,until:g.time+60,disjoint:target.projectileDisjoint||0,targetLife:target.deathTime??null,disjointable:entry.id!=='harpoon',visualId:g.effects.at(-1).id,entry:{id:entry.id,area:entry.area,index:entry.index,meta:structuredClone(entry.meta)},reflected:!!options.reflected});
}
export function resolveHarpoon(g,h,item,target){
 if(!C.alive(h)||!C.alive(target)||C.invulnerable(g,target))return;
 const d=C.distance(h,target)||1,dx=(target.x-h.x)/d,dy=(target.y-h.y)/d;
 const minGap=Math.min(d,h.range<=300?Math.max(value(item,'min_distance'),h.range):value(item,'min_distance'));
 const pull=Math.min(d*value(item,'pull_distance_pct')/100,Math.max(0,(d-minGap)/2)),targetPull=h.range<=300?Math.max(pull,d-pull-minGap):pull;
 C.forceMove(g,target,{x:target.x-dx*targetPull,y:target.y-dy*targetPull},value(item,'pull_duration'));
 C.forceMove(g,h,{x:h.x+dx*pull,y:h.y+dy*pull},value(item,'pull_duration'));
}
const nextTarget=(g,h,point,radius,hit)=>C.enemies(g,h,point,radius).filter(e=>!hit.includes(e.id)&&g.canSee(h,e)).reduce((best,e)=>!best||C.distance(e,point)<C.distance(best,point)?e:best,null);
function chainHit(g,h,item,state,target){
 state.hit.push(target.id);state.remaining--;
 if(C.alive(target))g.damage(target,value(item,'chain_damage'),h,'magical',{itemProc:true});
 g._effect('beam',state.x,state.y,{tx:target.x,ty:target.y,life:.25,color:'#a2cfe8',itemId:item.id});
 state.x=target.x;state.y=target.y;
 const next=state.remaining>0?nextTarget(g,h,state,value(item,'chain_radius'),state.hit):null;
 state.targetId=next?.id||null;state.nextAt+=value(item,'chain_delay',.25);
 if(!next)state.until=g.time;
}
export function startItemChain(g,h,item,target){
 const state={type:'itemChain',itemId:item.id,sourceId:h.id,team:h.team,x:h.x,y:h.y,hit:[],remaining:value(item,'chain_strikes'),targetId:target.id,nextAt:g.time,until:g.time+value(item,'chain_strikes')*value(item,'chain_delay',.25)+1};
 chainHit(g,h,item,state,target);
 if(state.targetId){g.itemZones||=[];g.itemZones.push(state);}
}
export function queueMeteor(g,h,item,channel){
 g.itemZones||=[];const impactAt=channel.until+value(item,'land_time',.5);
 g.itemZones.push({type:'itemMeteor',itemId:item.id,sourceId:h.id,team:h.team,x:channel.point.x,y:channel.point.y,impactAt,until:impactAt+1});
}
export function queueHarpoon(g,h,item,target){
 g.itemZones||=[];const impactAt=g.time+C.distance(h,target)/value(item,'projectile_speed',2000);
 g.itemZones.push({type:'itemHarpoon',itemId:item.id,sourceId:h.id,targetId:C.fighter(target)?target.id:null,tree:C.fighter(target)?null:{x:target.x,y:target.y},impactAt,until:impactAt+1});
 g._effect('beam',h.x,h.y,{tx:target.x,ty:target.y,life:impactAt-g.time,color:'#b6c4cb',itemId:item.id});
}
export function startShiva(g,h,item){
 g.itemZones||=[];const radius=value(item,'blast_radius')+(h.spellAoE||0),speed=value(item,'blast_speed');
 g.itemZones.push({type:'itemShiva',itemId:item.id,sourceId:h.id,startedAt:g.time,radius,speed,hit:[],until:g.time+radius/speed+.05});
}
export function tickItemProjectiles(g,zone,h,item,deliver){
 if(zone.type==='itemTracking'){
  const target=g.entities.find(e=>e.id===zone.targetId),effect=g.effects.find(e=>e.id===zone.visualId);
  const cancel=!C.alive(target)||(target.deathTime??null)!==zone.targetLife||C.invulnerable(g,target)||(zone.disjointable&&(target.projectileDisjoint||0)!==zone.disjoint);
  let arrived=false;
  if(!cancel){
   const dx=target.x-zone.x,dy=target.y-zone.y,d=Math.hypot(dx,dy),travel=zone.speed*Math.max(0,g.time-zone.lastTick);zone.lastTick=g.time;
   if(d<=travel+1e-7){zone.x=target.x;zone.y=target.y;arrived=true;}else{zone.x+=dx/d*travel;zone.y+=dy/d*travel;}
   if(effect)Object.assign(effect,{x:zone.x,y:zone.y,tx:target.x,ty:target.y,angle:Math.atan2(dy,dx),lift:35});
  }
  if(arrived||cancel){zone.until=g.time;g.effects=g.effects.filter(e=>e.id!==zone.visualId);if(arrived)deliver(g,h,{...zone.entry,item},target,target,{impact:true,reflected:zone.reflected});}
 }else if(zone.type==='itemChain'){
  while(zone.targetId&&zone.nextAt<=g.time+1e-7){
   let target=g.entities.find(e=>e.id===zone.targetId&&C.alive(e));
   if(!target||!g.canSee(h,target)||C.invulnerable(g,target))target=nextTarget(g,h,zone,value(item,'chain_radius'),zone.hit);
   if(!target){zone.until=g.time;break;}
   chainHit(g,h,item,zone,target);
  }
 }else if(zone.type==='itemShiva'){
  const radius=Math.min(zone.radius,(g.time-zone.startedAt)*zone.speed);
  for(const enemy of C.enemies(g,h,h,radius))if(!zone.hit.includes(enemy.id)){
   zone.hit.push(enemy.id);g.damage(enemy,value(item,'blast_damage'),h,'magical');C.slow(g,enemy,item,value(item,'blast_debuff_duration'),value(item,'blast_movement_speed'),h);
  }
  g._effect('ring',h.x,h.y,{radius,life:.1,color:'#a2d6ee',itemId:item.id});
 }else if(zone.type==='itemHarpoon'&&zone.impactAt<=g.time+1e-7){
  const target=g.entities.find(e=>e.id===zone.targetId&&C.alive(e));
  if(C.alive(h)&&zone.tree)C.forceMove(g,h,zone.tree,value(item,'pull_duration'));
  else resolveHarpoon(g,h,item,target);
  zone.until=g.time;
 }else if(zone.type==='itemMeteor'&&zone.impactAt<=g.time+1e-7){
  for(const enemy of C.enemies(g,h,zone,value(item,'impact_radius',400),true)){
   const building=C.building(enemy),interval=value(item,'burn_interval',1),dps=value(item,building?'burn_dps_buildings':'burn_dps_units'),duration=value(item,'burn_duration');
   g.damage(enemy,value(item,building?'impact_damage_buildings':'impact_damage_units'),h,'magical');C.stun(g,enemy,value(item,'stun_duration'),h);
   C.dot(g,enemy,item,duration,dps,h,'magical',{tickInterval:interval,tickDamage:dps*interval,nextTick:g.time+interval});
   if(!building)C.slow(g,enemy,item,duration,value(item,'burn_slow'),h);
  }
  g._effect('burst',zone.x,zone.y,{radius:value(item,'impact_radius'),life:.7,color:'#d9a366',itemId:item.id});zone.until=g.time;
 }
}

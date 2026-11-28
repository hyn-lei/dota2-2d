import {innateAt} from './ability-data.js';
import {HERO_STATS} from './hero-data.js';
import * as Skills from './hero-runtime.js';
import {weakIllusion} from './illusions.js';
const alive=e=>e&&!e.dead&&e.hp>0;
const realHero=e=>e?.kind==='hero'||e?.kind==='illusion';
const fighter=e=>['hero','creep','neutral','summon','illusion'].includes(e?.kind);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const swarmId=h=>'weaverSwarm:'+h.id;
const markId=h=>'weaverShukuchiMark:'+h.id;
const effect=(g,h,visual,x=h.x,y=h.y,fields={})=>g._effect('burst',x,y,{sourceId:h.id,heroId:'weaver',team:h.team,visual,...fields});
const SAMPLE_INTERVAL=.1,HISTORY_SECONDS=6.2,HISTORY_LIMIT=64;

export function initializeHistory(g,h){
 if(g.isNetwork||!realHero(h))return;
 h.weaverTimeLapseHistory=[{time:g.time,x:h.x,y:h.y,hp:h.hp,mana:h.mana,dead:!!h.dead}];
 h.weaverNextHistoryAt=g.time+SAMPLE_INTERVAL;
 delete h.weaverDeathRewindAnchor;
 h.weaverTimeLapsePreview={...h.weaverTimeLapseHistory[0]};
}
export function timeLapsePreview(g,h){
 const history=h?.weaverTimeLapseHistory;
 if(!history?.length)return h?.weaverTimeLapsePreview??null;
 const time=g.time-5;
 let sample=null;
 for(const entry of history){if(entry.time>time+1e-7)break;if(!entry.dead)sample=entry;}
 if(!sample)sample=history[0].time>time?history.find(entry=>!entry.dead)||h.weaverDeathRewindAnchor:h.weaverDeathRewindAnchor||history.find(entry=>!entry.dead);
 return sample?{time:sample.time,x:sample.x,y:sample.y,hp:Math.max(1,sample.hp),mana:sample.mana}:null;
}
export function recordHistories(g){
 if(g.isNetwork)return;
 for(const h of g.entities)if(realHero(h)){
  if(!h.weaverTimeLapseHistory)initializeHistory(g,h);
  if(g.time+1e-7>=h.weaverNextHistoryAt){
   const history=h.weaverTimeLapseHistory;
   history.push({time:g.time,x:h.x,y:h.y,hp:h.hp,mana:h.mana,dead:!!h.dead});
   while(history.length>HISTORY_LIMIT||history.length>1&&history[1].time<g.time-HISTORY_SECONDS)history.shift();
   h.weaverNextHistoryAt=g.time+SAMPLE_INTERVAL;
  }
  h.weaverTimeLapsePreview=timeLapsePreview(g,h);
 }
}

export function releaseWeaver(g,h,phase){
 const s=phase.skill,v=s.values;
 if(s.id==='weaver_time_lapse'||s.id==='weaver_time_lapse_ally'){
  const cooldown=s.cooldown*(1-(h.cooldownReduction||0)/100)*(1-(g._creatureCooldownReduction?.(h)||0)/100);
  h.cooldowns[3]=cooldown;h.extraCooldowns||={};h.extraCooldowns.weaver_time_lapse_ally=cooldown;h.extraCooldownTick=g.time;
  rewindHero(g,h,phase.targetId?g.entities.find(e=>e.id===phase.targetId):h);return;
 }
 if(s.id==='weaver_the_swarm'){
  const angle=Math.atan2(phase.point.y-h.y,phase.point.x-h.x),dir={x:Math.cos(angle),y:Math.sin(angle)},spread=v.spawn_radius+(h.spellAoE||0);
  for(let i=0;i<v.count;i++){
   const spawnAngle=g._random()*Math.PI*2,offset=Math.sqrt(g._random())*spread;
   const bug=g._unit('weaverBeetle',h.team,h.x+Math.cos(spawnAngle)*offset,h.y+Math.sin(spawnAngle)*offset,{name:'虫群',ownerId:h.id,
    maxHp:v.destroy_attacks,hp:v.destroy_attacks,hitsRemaining:v.destroy_attacks,pipHealth:true,
    radius:16,selectionRadius:20,noCollision:true,spellImmune:true,visionRange:321,providesVision:true,
    speed:v.speed,damage:0,range:0,attackCooldown:Infinity,attackInterval:Infinity,hpRegen:0,attackImmune:true,goldMin:32,goldMax:34,xpBounty:20,
    angle,swarmTargetId:null,startedAt:g.time,expiresAt:g.time+s.range/v.speed,travelDistance:0,
    swarmSkill:s,swarmDir:dir});
   g.entities.push(bug);
  }
  effect(g,h,'weaverSwarm',h.x,h.y,{angle,radius:spread,life:.55});
 }else if(s.id==='weaver_shukuchi'){
  if(!g.hasTrueSight?.({team:1-h.team},h))disjointHero(g,h);
  h.weaverShukuchi={startedAt:g.time,until:g.time+v.duration,fadeAt:g.time+v.fade_time,broken:false,hitIds:[],skill:s,lastPosition:{x:h.x,y:h.y}};
  Skills.addStatus(g,h,'weaverShukuchi',{name:'缩地',description:'立即提高移速并穿过单位，对接触的敌人造成一次伤害。',positive:true,undispellable:true,duration:v.duration,phased:true,icon:'wind'});
  Skills.addStatus(g,h,'weaverShukuchiInvisible',{name:'缩地隐身',positive:true,undispellable:true,invisible:true,fadeStartedAt:g.time,fadeDuration:v.fade_time,startedAt:g.time+v.fade_time,until:g.time+v.duration,icon:'wind'});
  effect(g,h,'weaverShukuchi',h.x,h.y,{life:.45,radius:90});
 }
}

export function rewindHero(g,caster,target){
 if(!alive(target))return false;
 const sample=timeLapsePreview(g,target);if(!sample)return false;
 const from={x:target.x,y:target.y},path=(target.weaverTimeLapseHistory||[]).filter(s=>s.time>=sample.time).map(s=>({x:s.x,y:s.y,time:s.time}));
 Skills.applyDispel(g,target,true);
 if(caster===target){Skills.interruptCast(g,target,false);target.recallTimer=0;target.explicitTarget=null;target.targetId=null;target.destination=null;if(target.isPlayer)g.clearMovement(target);}
 target.x=sample.x;target.y=sample.y;target.hp=Math.max(1,Math.min(target.maxHp,sample.hp));target.mana=Math.max(0,Math.min(target.maxMana,sample.mana));
 disjointHero(g,target);
 target.navPath=null;
 g.collisions?.update(target);
 effect(g,caster,'weaverTimeLapse',target.x,target.y,{from,to:{x:target.x,y:target.y},path,targetId:target.id,life:1.1,radius:130});return true;
}
function disjointHero(g,target){
 target.projectileDisjoint=(target.projectileDisjoint||0)+1;
 const cancelled=g.pendingSpells.filter(s=>s.targetId===target.id&&(s.type==='shackle'||Number.isFinite(s.disjoint)));
 const removed=new Set(cancelled);g.pendingSpells=g.pendingSpells.filter(s=>!removed.has(s));
 const ids=new Set(cancelled.map(s=>s.visualId).filter(Boolean));g.effects=g.effects.filter(f=>!ids.has(f.id));
}

function killBeetle(g,bug){
 const target=g.entities.find(e=>e.id===bug.swarmTargetId),status=target?.statuses?.['weaverSwarm:'+bug.ownerId];
 if(status?.beetleId===bug.id)delete target.statuses[status.id];
 if(!bug.dead)g._kill(bug,null);
}
function beetleAttack(g,bug,target,owner){
 const s=bug.swarmSkill,v=s.values,status=target.statuses[swarmId(owner)];
 if(!status)return;
 if(!Skills.isInvulnerable(g,target)){
  if(!Skills.debuffImmune(g,target)){status.stacks++;status.armor=-status.stacks*v.armor_reduction;}else status.armor=0;
  g.damage(target,v.damage,owner,'physical',{weaverSwarm:true});
  if(alive(target))effect(g,owner,'weaverBeetleAttack',target.x,target.y,{radius:35,life:.2,beetleId:bug.id});
 }
 bug.nextAttackAt+=v.attack_rate;
}
export function tickWeaverWorld(g,dt){
 for(const bug of g.entities)if(bug.kind==='weaverBeetle'&&!bug.dead){
  const owner=g.entities.find(e=>e.id===bug.ownerId),target=g.entities.find(e=>e.id===bug.swarmTargetId);
  if(!owner||g.time>=bug.expiresAt-1e-7||bug.swarmTargetId&&(!alive(target)||Skills.isInvulnerable(g,target)||!g.canSee(owner,target))){killBeetle(g,bug);continue;}
  if(target){
   bug.x=target.x;bug.y=target.y-64;
   const status=target.statuses?.[swarmId(owner)];
   if(!status||status.beetleId!==bug.id){killBeetle(g,bug);continue;}
   status.armor=Skills.debuffImmune(g,target)?0:-status.stacks*bug.swarmSkill.values.armor_reduction;
   while(!bug.dead&&alive(target)&&bug.nextAttackAt<=g.time+1e-7&&bug.nextAttackAt<bug.expiresAt-1e-7)beetleAttack(g,bug,target,owner);
  }else{
   const from={x:bug.x,y:bug.y},travel=bug.speed*dt;bug.x+=bug.swarmDir.x*travel;bug.y+=bug.swarmDir.y*travel;bug.travelDistance+=travel;
   const v=bug.swarmSkill.values,radius=v.radius+(owner.spellAoE||0);
   const victim=g.entities.find(e=>alive(e)&&fighter(e)&&e.team!==bug.team&&!Skills.isInvulnerable(g,e)&&g.canSee(owner,e)&&!Object.keys(e.statuses||{}).some(id=>id.startsWith('weaverSwarm:'))&&segmentDistance(e,from,bug)<=radius+(e.radius||0));
   if(victim){
    bug.swarmTargetId=victim.id;bug.attachStartedAt=g.time;bug.expiresAt=g.time+v.duration;bug.nextAttackAt=g.time;bug.attackImmune=false;bug.x=victim.x;bug.y=victim.y-64;
    Skills.addStatus(g,victim,swarmId(owner),{name:'虫群附着',description:'虫群持续物理攻击并叠加护甲削减，攻击甲虫可移除。',sourceId:owner.id,
     undispellable:true,beetleId:bug.id,stacks:0,armor:0,duration:v.duration,providesVision:true,icon:'weaverSwarm'});
    beetleAttack(g,bug,victim,owner);
   }
  }
 }
 for(const h of g.entities)if(h.heroId==='weaver'){
  if(h.extraCooldowns?.weaver_time_lapse_ally!==undefined)h.extraCooldowns.weaver_time_lapse_ally=h.cooldowns[3];
  // Movement completes after the hero tick; damage uses the whole swept path.
  if(alive(h))tickShukuchi(g,h,dt);
 }
}
function segmentDistance(point,a,b){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)):0;return Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t);}
export function breakShukuchiInvisibility(g,h){
 const state=h.weaverShukuchi;if(!state||g.time+1e-7<state.fadeAt)return;
 state.broken=true;endShukuchi(g,h,g.time);
}
function endShukuchi(g,h,endedAt){
 const state=h.weaverShukuchi;if(!state)return;
 h.weaverShukuchi=null;delete h.statuses.weaverShukuchi;delete h.statuses.weaverShukuchiInvisible;
 if(h.hasShard){
  const s=Skills.skillOf(h,2),v=state.skill.values,radius=v.shukuchi_attack_mark_radius+(h.spellAoE||0);
  if(s.level){
   h.weaverGeminateQueue||=[];
   h.weaverGeminateQueue.push({executeAt:endedAt+v.shukuchi_attack_delay,skill:s,shukuchi:true,radius});
  }
 }
}
function tickShukuchi(g,h,dt){
 const state=h.weaverShukuchi;if(!state)return;
 const v=state.skill.values;
 const remaining=state.until-(g.time-dt);
 if(remaining>1e-7){
  const from=state.lastPosition,fraction=Math.min(1,remaining/dt);
  const end={x:from.x+(h.x-from.x)*fraction,y:from.y+(h.y-from.y)*fraction};
  for(const enemy of g.entities)if(alive(enemy)&&fighter(enemy)&&enemy.team!==h.team&&!state.hitIds.includes(enemy.id)&&!Skills.debuffImmune(g,enemy)&&!Skills.isInvulnerable(g,enemy)&&segmentDistance(enemy,from,end)<=v.radius+(h.spellAoE||0)+(enemy.radius||0)){
   state.hitIds.push(enemy.id);g.damage(enemy,v.damage,h,'magical',{weaverShukuchi:true});
   if(h.hasShard&&alive(enemy)&&Skills.skillOf(h,2).level)Skills.addStatus(g,enemy,markId(h),{name:'缩地连击标记',duration:v.geminate_attack_mark_duration,sourceId:h.id,sourceTeam:h.team,icon:'weaverGeminate',weaverShukuchiMark:true});
  }
  state.lastPosition={x:h.x,y:h.y};
 }
 if(g.time>=state.until-1e-7)endShukuchi(g,h,state.until);
}
export function triggerGeminate(g,h,target,options,result){
 if(h.heroId!=='weaver'||weakIllusion(h)||options.weaverGeminate||!alive(target))return;
 const s=Skills.skillOf(h,2),manual=options.manualGeminate||h.weaverManualGeminateTarget===target.id;
 if(!s.level||Skills.hasStatusFlag(g,h,'break')||(h.cooldowns[2]||0)>1e-7||!manual&&h.autocast?.[2]===false)return;
 h.weaverManualGeminateTarget=null;h.cooldowns[2]=s.cooldown*(1-(h.cooldownReduction||0)/100);
 h.weaverGeminateQueue||=[];
 for(let i=1;i<=s.values.extra_attack;i++)h.weaverGeminateQueue.push({targetId:target.id,executeAt:g.time+s.values.delay*i,skill:s,targetLife:target.deathTime??null});
}
function fireGeminate(g,h,target,s){
 const before=h.attackCooldown,phase=h.attackPhase,angle=h.angle,targetId=h.targetId;
 const fired=g._attack(h,target,{weaverGeminate:true,attackReleased:true,bonusDamage:s.values.bonus_damage,itemPotencyBonus:s.values.bonus_potency});
 h.attackCooldown=before;h.attackPhase=phase;h.angle=angle;h.targetId=targetId;
 if(fired)effect(g,h,'weaverGeminate',h.x,h.y,{targetId:target.id,radius:45,life:.25});return fired;
}
export function tickWeaverHero(g,h){
 if(h.heroId!=='weaver')return;
 tickThreads(g,h);
 const queue=h.weaverGeminateQueue||[];h.weaverGeminateQueue=queue.filter(q=>q.executeAt>g.time+1e-7);
 for(const q of queue)if(q.executeAt<=g.time+1e-7){
  if(!alive(h))continue;
  if(q.shukuchi&&!q.targetId){
   for(const enemy of g.entities)if(alive(enemy)&&enemy.team!==h.team&&distance(h,enemy)<=q.radius&&
     Object.values(enemy.statuses||{}).some(mark=>mark.weaverShukuchiMark&&mark.until>g.time&&
       (mark.sourceId===h.id||(mark.sourceTeam??g.entities.find(source=>source.id===mark.sourceId)?.team)===h.team)))fireGeminate(g,h,enemy,q.skill);
   continue;
  }
  const target=g.entities.find(e=>e.id===q.targetId);if(!target||alive(target)&&(target.deathTime??null)!==q.targetLife)continue;
  fireGeminate(g,h,target,q.skill);
  if(!q.shukuchi&&h.hasShard){
   const radius=q.skill.values.shard_beetle_search_range+(h.spellAoE||0);
   for(const enemy of g.entities)if(enemy!==target&&alive(enemy)&&enemy.team!==h.team&&Object.values(enemy.statuses||{}).some(status=>status.beetleId&&status.until>g.time)&&distance(target,enemy)<=radius)fireGeminate(g,h,enemy,q.skill);
  }
 }
}
export function weaverAttackModifiers(h,options,result){
 if(options.weaverGeminate){result.weaverGeminate=true;result.itemPotency+=(options.itemPotencyBonus||0);}
 return result;
}
export function weaverCombatStats(g,h,result){
 if(h.heroId!=='weaver')return result;
 if(!Skills.hasStatusFlag(g,h,'break')){
  const count=(h.weaverThreads||[]).filter(t=>t.phase==='established'||t.phase==='linger'&&t.until>g.time).length;
  const hero=HERO_STATS.weaver,main=(hero.baseDamageMin+hero.baseDamageMax)/2+(h.attributes?.agility?.total??h.agility??0);
  if(count)result.damage+=main*count*innateAt('weaver',h.level,h.talents||[],h).values.damage_per_thread_hero/100;
 }
 return result;
}
export function weaverMovementStats(g,h,result){
 if(h.weaverShukuchi?.until>g.time){
  const minimum=h.weaverShukuchi.skill.values.min_movespeed_override;
  result.speed=Math.max(minimum,result.speed);
 }
 return result;
}
export function weaverDamage(g,target,dealt,source,type,options){
 if(!dealt||source?.heroId!=='weaver'||!['hero','illusion'].includes(source.kind)||!alive(source)||target.kind!=='hero'||source.team===target.team||options.itemProc||options.reflected||!(options.attack||options.weaverSwarm||options.weaverShukuchi)||Skills.hasStatusFlag(g,source,'break'))return;
 source.weaverThreads||=[];
 if(source.weaverThreads.some(t=>t.targetId===target.id)||distance(source,target)>700)return;
 const thread={targetId:target.id,phase:'setup',startedAt:g.time};
 if(g.canSee(source,target))Object.assign(thread,{x:target.x,y:target.y});
 source.weaverThreads.push(thread);
 Skills.addStatus(g,target,'weaverThread:'+source.id,{name:'命运之线连接',description:'保持连接，为编织者提供主攻击力加成。',duration:Infinity,sourceId:source.id,weaverThread:true,icon:'weaverThreads'});
}
function threadSlow(g,h,target,v){
 if(Skills.debuffImmune(g,target)||Skills.isInvulnerable(g,target))return;
 Skills.addStatus(g,target,'weaverThreadSlow:'+h.id,{name:'命运之线',description:'命运之线短暂减速。',duration:v.slow_duration*(1-Skills.statusResistance(g,target)),slowPct:v.slow_percent,sourceId:h.id,icon:'weaverThreads'});
}
function tickThreads(g,h){
 h.weaverThreads||=[];
 if(!alive(h)||Skills.hasStatusFlag(g,h,'break')){clearThreads(g,h);return;}
 const v=innateAt('weaver',h.level,h.talents||[],h).values;
 h.weaverThreads=h.weaverThreads.filter(thread=>{
  const target=g.entities.find(e=>e.id===thread.targetId);
  if(thread.phase==='linger')return thread.until>g.time+1e-7;
  if(!target)return false;
  if(g.canSee(h,target)){thread.x=target.x;thread.y=target.y;}
  if(!alive(target)){
   if(thread.phase==='setup')return false;
   thread.phase='linger';thread.until=(target.deathTime??g.time)+v.death_linger_duration;return thread.until>g.time;
  }
  if(!target.statuses?.['weaverThread:'+h.id])return false;
  if(distance(h,target)>(thread.phase==='setup'?v.thread_setup_distance:v.established_thread_break_distance)){delete target.statuses['weaverThread:'+h.id];return false;}
  if(thread.phase==='setup'&&g.time+1e-7>=thread.startedAt+v.thread_setup_time){thread.phase='established';thread.establishedAt=g.time;thread.nextPulseAt=g.time+v.established_thread_duration;threadSlow(g,h,target,v);}
  else if(thread.phase==='established'&&thread.nextPulseAt<=g.time+1e-7){threadSlow(g,h,target,v);thread.nextPulseAt+=v.established_thread_duration;}
  return true;
 });
}
export function onWeaverStatusExpired(g,unit,status){
 if(status.weaverThread){const owner=g.entities.find(e=>e.id===status.sourceId);if(owner)owner.weaverThreads=(owner.weaverThreads||[]).filter(t=>t.targetId!==unit.id);}
}
function clearThreads(g,h){
 for(const t of h.weaverThreads||[]){const target=g.entities.find(e=>e.id===t.targetId);if(target?.statuses)delete target.statuses['weaverThread:'+h.id];}
 h.weaverThreads=[];
}
export function onWeaverDeath(g,target){
 if(realHero(target))target.weaverDeathRewindAnchor=[...(target.weaverTimeLapseHistory||[])].reverse().find(entry=>!entry.dead)||target.weaverDeathRewindAnchor;
 if(target.kind==='weaverBeetle')killBeetle(g,target);
 if(target.heroId==='weaver'){clearThreads(g,target);target.weaverGeminateQueue=[];target.weaverManualGeminateTarget=null;target.weaverShukuchi=null;}
 for(const bug of g.entities)if(bug.kind==='weaverBeetle'&&bug.swarmTargetId===target.id&&!bug.dead)killBeetle(g,bug);
}

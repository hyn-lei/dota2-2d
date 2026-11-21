import * as Skills from './hero-runtime.js';
import {innateAt} from './ability-data.js';
import {createIllusions,ownsIllusion} from './illusions.js';
import {heal,allTrees,cutTree} from './item-common.js';

const alive=e=>e&&!e.dead&&e.hp>0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fighter=e=>['hero','illusion','creep','neutral','summon'].includes(e?.kind);
const innate=h=>innateAt('chaos_knight',h.level,h.talents||[],h);
const army=(g,h)=>g.entities.filter(e=>alive(e)&&ownsIllusion(h,e));
const blocked=(g,h)=>Skills.isStunned(g,h)||Skills.isRooted(g,h)||Skills.hasStatusFlag(g,h,'hex')||Skills.hasStatusFlag(g,h,'feared')||!!g._tauntSource(h);
const effect=(g,h,type,at,fields={})=>g._effect(type,at.x,at.y,{heroId:'chaos_knight',sourceId:h.id,team:h.team,color:'#ed854b',...fields});
export function chargeSkill(g,h){return {...innate(h),kind:'active',key:'D',range:999999,icon:'dash',available:army(g,h).some(e=>e.phantasmOwnerId===h.id)};}
export function canCharge(g,h){return !blocked(g,h)&&army(g,h).some(e=>e.phantasmOwnerId===h.id);}
function place(g,unit,point){Object.assign(unit,g.navigation.nearestWalkable(point),{navPath:null,destination:null,attackPhase:null});g.collisions.place(unit,unit,g.navigation);g.collisions.update(unit);}

function bolt(g,h,target,skill,reflected=false){
 const v=skill.values,roll=g._random();
 effect(g,h,'projectile',h,{visual:'chaosBolt',tracked:true,angle:Math.atan2(target.y-h.y,target.x-h.x),lift:20,life:30});
 g.pendingSpells.push({type:'chaos:bolt',sourceId:h.id,targetId:target.id,skill,x:h.x,y:h.y,speed:v.chaos_bolt_speed,lastTick:g.time,landAt:Infinity,disjoint:target.projectileDisjoint||0,damage:v.damage_min+roll*(v.damage_max-v.damage_min),stun:v.stun_max-roll*(v.stun_max-v.stun_min),reflected,visualId:g.effects.at(-1).id});
}
function rift(g,h,target,skill){
 const v=skill.values;if(Skills.debuffImmune(g,target)&&!v.pierces_immunity)return;
 const old={x:h.x,y:h.y},d=distance(h,target),dir={x:(target.x-h.x)/(d||1),y:(target.y-h.y)/(d||1)},pull=Math.min(d,v.pull_distance);
 const point={x:target.x-dir.x*pull,y:target.y-dir.y*pull};place(g,target,point);place(g,h,{x:point.x-dir.x*70,y:point.y-dir.y*70});
 for(const [i,clone]of army(g,h).entries()){
  place(g,clone,{x:point.x-dir.x*70-dir.y*((i%3)-1)*70,y:point.y-dir.y*70+dir.x*((i%3)-1)*70});clone.explicitTarget=target.id;clone.controlTarget=target.id;
 }
 h.explicitTarget=target.id;h.targetId=target.id;target.projectileDisjoint=(target.projectileDisjoint||0)+1;
 h.angle=Math.atan2(target.y-h.y,target.x-h.x);target.angle=Math.atan2(h.y-target.y,h.x-target.x);
 Skills.addStatus(g,target,'chaosRift',{name:'实相裂隙',description:`护甲降低 ${v.armor_reduction}。`,icon:'xmark',sourceId:h.id,duration:v.duration*(1-Skills.statusResistance(g,target)),armor:-v.armor_reduction,suppressedByDebuffImmunity:!v.pierces_immunity});
 effect(g,h,'burst',old,{visual:'chaosRift',tx:point.x,ty:point.y,radius:110,life:.45});
}
function phantasm(g,h,skill){
 for(const clone of army(g,h))if(clone.phantasmOwnerId===h.id)g._kill(clone,null);
 Skills.applyDispel(g,h);h.projectileDisjoint=(h.projectileDisjoint||0)+1;
 Skills.addStatus(g,h,'invulnerable',{name:'混沌之军',positive:true,icon:'swords',duration:skill.values.invuln_duration,invulnerable:true});
 g.pendingSpells.push({type:'chaos:phantasm',sourceId:h.id,skill,landAt:g.time+skill.values.invuln_duration});
 effect(g,h,'ring',h,{visual:'chaosPhantasm',radius:140,life:skill.values.invuln_duration});
}
function createArmy(g,h,skill){
 const v=skill.values,options={itemPotency:v.illusion_effectiveness,phantasmOwnerId:h.id};
 createIllusions(g,h,v.images_count,v.illusion_duration,v.outgoing_damage_tooltip,v.incoming_damage_tooltip,options);
 if(h.hasScepter)for(const ally of g.entities.filter(e=>alive(e)&&e.kind==='hero'&&e.team===h.team&&e!==h)){
  const clone=createIllusions(g,ally,1,v.illusion_duration,v.outgoing_damage_tooltip,v.incoming_damage_tooltip,{...options,skipChaosScepter:true})[0];clone.ownerId=h.id;clone.controller='manual';
 }
}
export function releaseChaos(g,h,phase){
 const target=g.entities.find(e=>e.id===phase.targetId);
 if(phase.extraId==='chaos_knight_armageddon'){
  if(!canCharge(g,h))return;
  h.chaosCharge={phase:'windup',point:phase.point,startedAt:g.time,lastTick:g.time,skill:phase.skill};
  Skills.addStatus(g,h,'chaosCharge',{name:'天劫前进：准备',description:'准备后带领幻象跨越地形冲锋；停止指令可提前出发。',positive:true,icon:'dash',duration:phase.skill.values.max_charge_time});return;
 }
 if(phase.index===0&&alive(target))bolt(g,h,target,phase.skill);
 else if(phase.index===1&&alive(target))rift(g,h,target,phase.skill);
 else if(phase.index===3)phantasm(g,h,phase.skill);
}

function startCharge(g,h){
 const charge=h.chaosCharge;if(!charge||charge.phase!=='windup')return;
 const v=charge.skill.values,prepared=Math.min(1,Math.max(0,(g.time-charge.startedAt)/v.max_charge_time));
 const maximum=Skills.combatStats(g,{...h,armageddonSpeed:v.max_bonus_speed}).speed;
 const speed=maximum*(1+(v.charge_speed_multiplier-1)*prepared),d=distance(h,charge.point),angle=Math.atan2(charge.point.y-h.y,charge.point.x-h.x);
 Object.assign(charge,{phase:'charge',startedAt:g.time,lastTick:g.time,until:g.time+d/Math.max(1,speed)+.5*(speed-maximum)/Math.max(1,speed)*v.charge_accel_time,speed,baseSpeed:maximum,angle,prepared});
 h.armageddonSpeed=v.max_bonus_speed;h.movementInput={x:0,y:0};
 charge.illusions=army(g,h).filter(e=>distance(h,e)<=v.illusion_radius).map((clone,i)=>{
  clone.chaosChargeOwnerId=h.id;clone.chaosChargeOffset={x:-Math.floor(i/3)*v.formation_spacing,y:((i%3)-1)*v.formation_width};
  Object.assign(clone,{x:h.x+Math.cos(angle)*clone.chaosChargeOffset.x-Math.sin(angle)*clone.chaosChargeOffset.y,y:h.y+Math.sin(angle)*clone.chaosChargeOffset.x+Math.cos(angle)*clone.chaosChargeOffset.y,navPath:null,destination:null,attackPhase:null});return clone.id;
 });
 Skills.addStatus(g,h,'chaosCharge',{name:'天劫前进：冲锋',description:'跨越地形并攻击沿途单位；控制、停止指令或施放其他技能会中止。',positive:true,icon:'dash',duration:Math.max(.01,charge.until-g.time),keepLonger:false});
}
export function stopCharge(g,h){
 const c=h.chaosCharge;if(!c)return;h.chaosCharge=null;delete h.statuses?.chaosCharge;
 for(const id of c.illusions||[]){const clone=g.entities.find(e=>e.id===id);if(clone){delete clone.chaosChargeOwnerId;delete clone.chaosChargeOffset;place(g,clone,clone);}}
 if(c.phase==='charge'){place(g,h,h);h.armageddonSpeed=0;Skills.addStatus(g,h,'armageddonMomentum',{name:'天劫余势',positive:true,icon:'dash',duration:c.skill.values.charge_decel_time,flatSpeed:Math.max(0,c.speed-(h.speed||0))});}
}
export function interruptCharge(g,h,releasePartial){
 if(!h.chaosCharge)return;
 if(h.chaosCharge.phase==='windup'&&!releasePartial&&!blocked(g,h))startCharge(g,h);else stopCharge(g,h);
}
function chargeTick(g,h){
 const c=h.chaosCharge;if(!c)return;if(!alive(h)||blocked(g,h)){stopCharge(g,h);return;}
 if(c.phase==='windup'){if(g.time-c.startedAt>=c.skill.values.max_charge_time-1e-7)startCharge(g,h);return;}
 if(g.time>=c.until-1e-7){stopCharge(g,h);return;}
 const dt=Math.max(0,g.time-c.lastTick);c.lastTick=g.time;const v=c.skill.values;
 const input=h.movementInput||{},desired=input.x||input.y?Math.atan2(input.y,input.x):c.steerPoint?Math.atan2(c.steerPoint.y-h.y,c.steerPoint.x-h.x):c.angle;
 const delta=Math.atan2(Math.sin(desired-c.angle),Math.cos(desired-c.angle)),limit=v.turn_rate*Math.PI/180*dt;c.angle+=Math.max(-limit,Math.min(limit,delta));h.angle=c.angle;
 const accel=Math.min(1,(g.time-c.startedAt)/v.charge_accel_time),speed=c.baseSpeed+(c.speed-c.baseSpeed)*accel,old={x:h.x,y:h.y};
 h.x+=Math.cos(c.angle)*speed*dt;h.y+=Math.sin(c.angle)*speed*dt;h.moving=true;g.collisions.update(h);
 const chargers=[h];for(const id of c.illusions){const clone=g.entities.find(e=>e.id===id);if(!alive(clone))continue;const o=clone.chaosChargeOffset;Object.assign(clone,{x:h.x+Math.cos(c.angle)*o.x-Math.sin(c.angle)*o.y,y:h.y+Math.sin(c.angle)*o.x+Math.cos(c.angle)*o.y,angle:c.angle,moving:true});g.collisions.update(clone);chargers.push(clone);}
 // The short tick segment catches units between frames; terrain is deliberately ignored until landing.
 for(const unit of chargers){const nearby=g.entities.filter(e=>alive(e)&&e.team!==h.team&&fighter(e)&&!Skills.isInvulnerable(g,e)&&distance(unit,e)<=v.hit_radius+(h.spellAoE||0)+(e.radius||0)).sort((a,b)=>distance(unit,a)-distance(unit,b));if(nearby[0])g._attack(unit,nearby[0],{chaosCharge:true});}
 if(g.time>=(h.nextChargeTreeAt||0)){h.nextChargeTreeAt=g.time+.1;for(const tree of allTrees(g))if(distance(tree,h)<v.hit_radius+50||distance(tree,old)<v.hit_radius+50)cutTree(g,tree);}
}
export function tickChaosWorld(g){
 for(const h of g.entities)if(h.heroId==='chaos_knight'&&h.kind==='hero')chargeTick(g,h);
 const complete=[];
 for(const shot of g.pendingSpells){
  if(shot.type==='chaos:phantasm'&&shot.landAt<=g.time+1e-7){const h=g.entities.find(e=>e.id===shot.sourceId);if(alive(h))createArmy(g,h,shot.skill);complete.push(shot);}
  if(shot.type!=='chaos:bolt')continue;
  const h=g.entities.find(e=>e.id===shot.sourceId),target=g.entities.find(e=>e.id===shot.targetId);
  if(!h||!alive(target)||Skills.isInvulnerable(g,target)||(target.projectileDisjoint||0)!==shot.disjoint){complete.push(shot);continue;}
  const d=distance(shot,target),step=shot.speed*Math.max(0,g.time-shot.lastTick);shot.lastTick=g.time;
  if(d<=step+1e-7){
   if(!g.blockTargetSpell?.(h,target,shot.skill)){
    if(!shot.reflected&&Skills.hasStatusFlag(g,target,'spellReflect')&&alive(h))bolt(g,target,h,shot.skill,true);
    g.damage(target,shot.damage,h,'magical');
    Skills.addStatus(g,target,'chaosBolt',{name:'混乱之箭',icon:'fire',sourceId:h.id,duration:shot.stun*(1-Skills.statusResistance(g,target)),stunned:true,suppressedByDebuffImmunity:true});if(!Skills.debuffImmune(g,target))Skills.interruptCast(g,target,false);
    if(h.hasShard&&alive(target)){const ult=Skills.skillOf(h,3),clone=createIllusions(g,h,1,shot.skill.values.illusion_duration,100,ult.values.incoming_damage_tooltip||350,{itemPotency:shot.skill.values.illusion_effectiveness,phantasmOwnerId:null})[0];place(g,clone,{x:target.x-60,y:target.y});clone.controlTarget=target.id;clone.explicitTarget=target.id;}
    effect(g,h,'burst',target,{visual:'chaosBoltHit',radius:90,life:.4});
   }complete.push(shot);
  }else{shot.x+=(target.x-shot.x)/d*step;shot.y+=(target.y-shot.y)/d*step;const visual=g.effects.find(e=>e.id===shot.visualId);if(visual)Object.assign(visual,{x:shot.x,y:shot.y,angle:Math.atan2(target.y-shot.y,target.x-shot.x)});}
 }
 if(complete.length){g.pendingSpells=g.pendingSpells.filter(s=>!complete.includes(s));g.effects=g.effects.filter(e=>!complete.some(s=>s.visualId===e.id));}
}
export function tickArmageddon(g,h,dt){
 if(h.heroId!=='chaos_knight')return;
 if(h.chaosCharge||h.chaosChargeOwnerId)return;
 const v=innate(h).values,last=h.armageddonPosition,input=h.movementInput||{},disjoint=h.projectileDisjoint||0;
 const elapsed=last?g.time-(last.time??g.time-dt):0,moved=last?distance(last,h):0;
 const continuous=last&&elapsed>0&&elapsed<=dt+1e-6&&(last.disjoint??disjoint)===disjoint;
 // A chase is self movement too. Teleports and gaps while forced motion skips hero ticks are not.
 const intendsMovement=!h.isPlayer||!!h.destination||!!input.x||!!input.y||!!h.explicitTarget;
 const moving=continuous&&intendsMovement&&!h.forcedMotion&&!h.cloneHop&&moved>.01&&moved<=550*elapsed+1;
 h.armageddonPosition={x:h.x,y:h.y,time:g.time,disjoint};
 if(!Skills.hasStatusFlag(g,h,'break'))h.armageddonSpeed=Math.max(0,Math.min(v.max_bonus_speed,(h.armageddonSpeed||0)+(moving?v.speed_per_second:-v.speed_per_second*v.drain_rate_multiplier)*dt));
 else h.armageddonSpeed=0;
}
export function chaosAttack(g,h,target,result){
 if(h.heroId!=='chaos_knight')return result;h.armageddonSpeed=0;
 const s=Skills.skillOf(h,2);if(!s.level||Skills.hasStatusFlag(g,h,'break')||!fighter(target)||g._random()*100>=s.values.chance)return result;
 const crit=(s.values.crit_min+g._random()*(s.values.crit_max-s.values.crit_min))/100;
 return {...result,damage:result.damage*crit,critical:true,criticalMultiplier:crit,chaosLifesteal:s.values.lifesteal*(target.kind==='creep'||target.kind==='neutral'?s.values.creep_multiplier:1)};
}
export function afterChaosAttack(g,h,result,dealt){if(result.chaosLifesteal>0)heal(g,h,dealt*result.chaosLifesteal/100,h);}

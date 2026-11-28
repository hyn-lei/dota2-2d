import {attackProfile,isRangedAttack,normalAttackWindup} from './attack-projectiles.js';
import {isLaneCreep} from './deny-runtime.js';
import {physicalDamageMultiplier} from './hero-stats.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const projectileWindows=new WeakMap();

function attackTravel(source,target){
 return isRangedAttack(source)?distance(source,target)/(source.projectileSpeed||attackProfile(source).speed||900):0;
}

function attackDamage(source,target,amount,armor,result){
 const reducedArmor=(armor-(result?.marksmanship?(target.baseArmor??target.armor??0):0))*(1-(result?.cleave?.values.pierces_armor||0)/100);
 const laneMultiplier=source.attackType==='pierce'&&!target.siege?1.5:1;
 return amount*physicalDamageMultiplier(reducedArmor)*laneMultiplier;
}

function attacksByTarget(g){
 const cached=projectileWindows.get(g),queue=g.pendingSpells;
 if(cached?.queue===queue&&cached.count===queue.length)return cached.shots;
 const shots=new Map();
 for(const shot of queue)if(shot.type==='attack'&&!shot.cancelled){
  if(!shots.has(shot.targetId))shots.set(shot.targetId,[]);
  shots.get(shot.targetId).push(shot);
 }
 projectileWindows.set(g,{queue,count:queue.length,shots});
 return shots;
}

export function laneAttackChoice(g,h,units,safe){
 const creeps=units.filter(e=>isLaneCreep(e)&&!e.attackImmune&&safe(e));
 const unavailable=new Set();
 if(!creeps.length||h.attackCooldown>.55)return {target:null,unavailable};
 const visible=new Map([...units,h].map(unit=>[unit.id,unit]));
 const shots=attacksByTarget(g);
 let target=null,best=Infinity;
 for(const creep of creeps){
  const deny=creep.team===h.team;
  if(deny&&!g.canDenyTarget(h,creep)||g.isProtected(creep))continue;
  const stats=g.combatStats(h,creep),dist=distance(h,creep);
  const approach=Math.max(0,dist-(stats.range||h.range)-creep.radius)/Math.max(100,stats.speed);
  if(approach>.65)continue;
  const windup=normalAttackWindup(h,stats.attackSpeed);
  const arrives=Math.max(approach,h.attackCooldown)+windup+attackTravel(h,creep);
  const armor=g.combatStats(creep).armor;
  let hp=creep.hp;
  for(const shot of shots.get(creep.id)||[]){
   const ally=visible.get(shot.sourceId);
   if(!ally||shot.speed<=0||distance(shot,creep)/shot.speed>arrives||
      (creep.projectileDisjoint||0)!==shot.disjoint||(creep.deathTime??null)!==shot.targetLife||
      (shot.result.deny?!g.canDenyTarget(ally,creep,shot.result.laneAttackReleased):ally.team===creep.team))continue;
   hp-=attackDamage(ally,creep,shot.result.damage,armor,shot.result);
  }
  for(const source of units){
   const phase=source.attackPhase;
   if(source===h||phase?.targetId!==creep.id||source.team===creep.team&&!g.canDenyTarget(source,creep))continue;
   if(Math.max(0,phase.executeAt-g.time)+attackTravel(source,creep)>arrives)continue;
   hp-=attackDamage(source,creep,g.combatStats(source,creep).damageMin??source.damage,armor);
  }
  if(hp<=0){unavailable.add(creep.id);continue;}
  if(hp>attackDamage(h,creep,stats.damageMin??stats.damage,armor))continue;
  const score=arrives+(deny?.25:0)+dist*.00015;
  if(score<best){best=score;target=creep;}
 }
 return {target,unavailable};
}

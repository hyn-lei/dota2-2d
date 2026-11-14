import * as Skills from './hero-runtime.js';
import {innateAt} from './ability-data.js';
import {ZEALOT,MARTYRDOM,CREATURE_LEVELS} from './chen-data.js';
import {ownsControlledUnit,ownedUnits,setCreatureOrder} from './controlled-units.js';
import {heal} from './item-common.js';
import {restoreMana} from './mana-runtime.js';
import {ZEALOT_GROWTH_ID,zealotGrowthAt} from './zealot-growth.js';

const alive=e=>!!e&&!e.dead&&e.hp>0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fighter=e=>['hero','illusion','creep','neutral','summon'].includes(e?.kind);
const innate=h=>innateAt('chen',h.level,h.talents||[],h);
const ability=(h,i)=>Skills.skillOf(h,i);
const glow=(g,h,unit,radius=70)=>g._effect('ring',unit.x,unit.y,{sourceId:h.id,heroId:'chen',team:h.team,color:'#f6dea0',radius,life:.6});

export function chenTarget(g,h,index,point){
 const self=point?.id===h.id||point?.self;
 const candidates=g.entities.filter(e=>alive(e)&&fighter(e)&&!Skills.isInvulnerable(g,e)&&g.canSee(h,e)&&
  (self?e===h:point&&distance(e,point)<=Math.max(45,e.radius||0))&&
  (index===0?e.team!==h.team:index===2?e.team===h.team:e.team!==h.team&&['creep','neutral','summon'].includes(e.kind)||e.chenPersuadedBy===h.id));
 const target=candidates.sort((a,b)=>distance(a,point||h)-distance(b,point||h))[0];
 if(!target)return {ok:false,reason:index===1?'请选择可劝化的小兵或野怪，或自己的劝化单位':index===2?'请选择友方英雄或单位':'请选择敌方单位'};
 const skill=Skills.castingStats(h,ability(h,index)),own=index===1&&target.chenPersuadedBy===h.id;
 if(index===2&&Skills.debuffImmune(g,target))return {ok:false,reason:'不能对减益免疫友军施放神力恩泽'};
 if(!own&&distance(h,target)>skill.range+(target.radius||0))return {ok:false,reason:`目标超过 ${skill.range} 施法距离`};
 if(index===1){
  if(own){if(g.time-(target.lastDamageAt??-Infinity)<skill.values.unsummon_time)return {ok:false,reason:`单位受伤后 ${skill.values.unsummon_time} 秒内不能取消劝化`};}
  else if(target.isRoshan||target.crystalClone||target.zealot||target.kind==='illusion')return {ok:false,reason:'此单位不能被劝化'};
  else if(target.ancient){
   const max=ability(h,3).level&&h.hasShard?ability(h,3).values.ancient_creeps_scepter:0;
   if(!max)return {ok:false,reason:'控制远古需要阿哈利姆魔晶和上帝之手'};
  }else if((target.level||CREATURE_LEVELS[target.sourceId]||1)>skill.values.level_req)return {ok:false,reason:`只能劝化 ${skill.values.level_req} 级及以下的生物`};
 }
 return {ok:true,target};
}

export function recallTarget(g,h,point){
 if(point?.id===h.id||point?.self)return {ok:true,target:h};
 const target=g.entities.filter(e=>alive(e)&&(e===h||ownsControlledUnit(h,e))&&point&&distance(e,point)<=Math.max(45,e.radius||0)).sort((a,b)=>distance(a,point)-distance(b,point))[0];
 return target?{ok:true,target}:{ok:false,reason:'狂热者召回只能选择陈或自己控制的单位'};
}

function applyPersuasion(g,h,unit,skill,{zealot=false}={}){
 if(zealot&&!skill.level)skill={...skill,values:{...skill.values,health_min:0,movement_speed_bonus:0,damage_bonus:0,creep_ability_level:0}};
 const hpRatio=unit.hp/unit.maxHp,base={damage:unit.damage,damageMin:unit.damageMin??unit.damage,damageMax:unit.damageMax??unit.damage,speed:unit.speed,maxHp:unit.maxHp};
 Object.assign(unit,{nativeKind:unit.nativeKind||unit.kind,kind:'summon',team:h.team,ownerId:h.id,controller:'manual',manualControl:false,
  chenPersuadedBy:zealot?null:h.id,convertedAt:g.time,originalPersuasionStats:base,campId:null,dominatedBy:null,dominatedItemUid:null,
  targetId:null,explicitTarget:null,destination:null,movementInput:{x:0,y:0},navPath:null,navGoal:null,returning:false,neutralCast:null,neutralChannel:null});
 unit.maxHp=Math.max(base.maxHp,skill.values.health_min);unit.hp=Math.max(1,Math.min(unit.maxHp,unit.maxHp*hpRatio));
 const bonus=skill.values.damage_bonus/100;
 unit.damage=base.damage*(1+bonus);unit.damageMin=base.damageMin*(1+bonus);unit.damageMax=base.damageMax*(1+bonus);unit.speed=base.speed+skill.values.movement_speed_bonus;
 unit.abilityLevelBonus=skill.values.creep_ability_level>0?Math.max(0,skill.values.creep_ability_level-1):0;
 unit.manualControl=!!(h.isPlayer||h.isHuman);
 restoreMana(unit,unit.maxMana||0);
 Skills.addStatus(g,unit,'chenPersuasion',{name:zealot?'狂热者':'神圣劝化',description:`移动速度 +${skill.values.movement_speed_bonus}，攻击伤害 +${skill.values.damage_bonus}%。`,positive:true,undispellable:true,icon:'aura',sourceId:h.id,until:Infinity,duration:Infinity});
}

function persuade(g,h,target,skill){
 if(target.chenPersuadedBy===h.id){
  if(g.time-(target.lastDamageAt??-Infinity)<skill.values.unsummon_time)return;
  g._kill(target,null);h.cooldowns[1]=Math.max(0,h.cooldowns[1]-skill.values.unsummon_cooldown_reduction);return;
 }
 const units=ownedUnits(g,h).filter(e=>e.chenPersuadedBy===h.id).sort((a,b)=>a.convertedAt-b.convertedAt);
 if(target.ancient){const limit=ability(h,3).values.ancient_creeps_scepter,ancients=units.filter(e=>e.ancient);if(ancients.length>=limit)g._kill(ancients[0],null);}
 const remaining=units.filter(alive);if(remaining.length>=skill.values.max_units)g._kill(remaining[0],null);
 const gold=Math.floor(((target.goldMin||0)+g._random()*((target.goldMax??target.goldMin??0)-(target.goldMin||0)+1))*skill.values.gold_pct/100);
 h.gold+=gold;applyPersuasion(g,h,target,skill);glow(g,h,target);
 if(h.isPlayer&&gold)g._effect('text',target.x,target.y-60,{text:`+${gold}`,color:'#eed28d',life:.8});
}

function projectile(g,source,target,fields){
 g._effect('projectile',source.x,source.y,{sourceId:source.id,team:source.team,color:'#ffe4a5',tracked:true,tx:target.x,ty:target.y,life:30});
 const visualId=g.effects.at(-1).id;
 g.pendingSpells.push({type:'chenProjectile',sourceId:source.id,ownerId:source.ownerId||source.id,targetId:target.id,team:source.team,
  x:source.x,y:source.y,lastTick:g.time,landAt:Infinity,disjoint:target.projectileDisjoint||0,visualId,...fields});
}

function favor(g,h,target,skill){
 const receivers=target===h?[h,...ownedUnits(g,h)]:[target];
 for(const unit of receivers){Skills.addStatus(g,unit,'chenDivineFavor',{name:'神力恩泽',description:`护甲 +${skill.values.bonus_armor}，治疗与生命恢复增强 ${skill.values.heal_amp}%。`,duration:skill.values.duration,positive:true,undispellable:true,icon:'heal',sourceId:h.id,armor:skill.values.bonus_armor,healReceivedAmp:skill.values.heal_amp});glow(g,h,unit);}
}

function handOfGod(g,h,skill){
 const receivers=g.entities.filter(e=>alive(e)&&e.team===h.team&&(e.kind==='hero'||ownsControlledUnit(h,e)));
 for(const unit of receivers){
  if(skill.values.does_purge)Skills.applyDispel(g,unit,true);
  const full=skill.values.full_heal_on_chen_and_creeps&&(unit===h||ownsControlledUnit(h,unit));
  heal(g,unit,full?Math.max(0,unit.maxHp-unit.hp):skill.values.heal_amount,h);
  Skills.addStatus(g,unit,'chenHandOfGod',{name:'上帝之手',description:`每秒治疗 ${skill.values.heal_per_second} 生命。`,duration:skill.values.hot_duration,positive:true,icon:'heal',sourceId:h.id,chenHealPerSec:skill.values.heal_per_second});
  glow(g,h,unit,100);
 }
 if(h.hasScepter&&skill.channelTime>0){
  h.channel={kind:'chenHandOfGod',index:3,skill,startedAt:g.time,until:g.time+skill.channelTime};
  Skills.addStatus(g,h,'channel',{name:'持续施放上帝之手',description:'附近其他友军获得减益免疫与治疗增强，移动会中断。',duration:skill.channelTime,positive:true,icon:'heal'});
 }
}

function recall(g,h,target,skill){
 const receivers=target===h?ownedUnits(g,h):[target];
 for(const unit of receivers)Skills.addStatus(g,unit,'chenRecall',{name:'狂热者召回',description:'受到敌方英雄或其单位伤害会中止传送。',duration:skill.values.teleport_delay,positive:true,icon:'aura',sourceId:h.id,chenRecall:true});
}

export function releaseChen(g,h,phase){
 const skill=phase.skill,target=g.entities.find(e=>e.id===phase.targetId);
 if(phase.extraId==='chen_zealot'){recall(g,h,target,skill);return;}
 if(phase.index<3){const check=chenTarget(g,h,phase.index,target);if(!check.ok||check.target!==target)return;}
 if(phase.index===0)projectile(g,h,target,{kind:'penitence',speed:skill.values.speed,skill});
 else if(phase.index===1)persuade(g,h,target,skill);
 else if(phase.index===2)favor(g,h,target,skill);
 else if(phase.index===3)handOfGod(g,h,skill);
}

export function castMartyrdom(g,unit,point){
 const allowed=g._canAct(unit);if(!allowed.ok)return allowed;
 if(!unit.zealot||unit.neutralCast||g.isStunned(unit)||Skills.hasStatusFlag(g,unit,'silenced')||g._tauntSource(unit))return {ok:false,reason:'当前无法使用殉道'};
 const target=point?.id===unit.id?unit:g.entities.filter(e=>alive(e)&&fighter(e)&&point&&distance(e,point)<=Math.max(45,e.radius||0)).sort((a,b)=>distance(a,point)-distance(b,point))[0];
 if(!target||target===unit||!g.canSee(unit,target))return {ok:false,reason:'请选择其他友方或敌方单位'};
 if(distance(unit,target)>MARTYRDOM.range+(target.radius||0))return {ok:false,reason:`目标超过 ${MARTYRDOM.range} 施法距离`};
 unit.neutralCast={kind:'martyrdom',targetId:target.id,executeAt:g.time+MARTYRDOM.castPoint};unit.movementInput={x:0,y:0};unit.destination=null;
 return {ok:true};
}

export function spawnZealot(g,h){
 if(h.heroId!=='chen'||h.kind!=='hero'||!alive(h))return;
 for(const old of ownedUnits(g,h))if(old.zealot)g._kill(old,null);
 const skill=ability(h,1),a=innate(h),upgrades=Math.min(30,Math.floor(g.time/450));
 const damageMin=(ZEALOT.damageMin+upgrades)*(1+(a.values.bonus_hp||0)/100)+a.values.damage;
 const damageMax=(ZEALOT.damageMax+upgrades)*(1+(a.values.bonus_hp||0)/100)+a.values.damage;
 const maxHp=(ZEALOT.maxHp+12*upgrades)*(1+(a.values.bonus_hp||0)/100);
 const position=g.navigation.nearestWalkable({x:h.x+70,y:h.y+30});
 const unit=g._unit('summon',h.team,position.x,position.y,{...ZEALOT,damageMin,damageMax,damage:(damageMin+damageMax)/2,maxHp,zealot:true,creatureOrder:'follow',ownerId:h.id,unitId:'chen_zealot',nativeKind:'creep',ranged:false,siege:false,upgrade:'mega',movementInput:{x:0,y:0},abilityCooldowns:{}});
 g.entities.push(unit);applyPersuasion(g,h,unit,skill,{zealot:true});updateZealotGrowth(g,h);g.collisions.place(unit,position,g.navigation);h.zealotRespawnAt=Infinity;h.zealotId=unit.id;glow(g,h,unit);
}

export function updateZealotGrowth(g,h){
 if(h.heroId!=='chen'||h.kind!=='hero')return;
 for(const unit of ownedUnits(g,h))if(unit.zealot){
  if(!unit.abilities?.includes(ZEALOT_GROWTH_ID))unit.abilities=[...(unit.abilities||[]),ZEALOT_GROWTH_ID];
  const level=Math.max(h.level||1,unit.zealotGrowth?.level||1);
  const growth=zealotGrowthAt(level);
  if(Object.entries(growth).every(([key,value])=>unit.zealotGrowth?.[key]===value)&&unit.statuses?.zealotGrowth)continue;
  unit.zealotGrowth=growth;
  Skills.addStatus(g,unit,'zealotGrowth',{name:'成长',description:`累计攻击伤害 +${growth.damage}，护甲 +${growth.armor}，魔抗 +${growth.magicResistancePct}%，攻速 +${growth.attackSpeed}。`,positive:true,undispellable:true,icon:'aura',sourceId:h.id,stacks:growth.stacks,duration:Infinity});
 }
}

export function chenDamage(g,target,amount,source){
 if(!(amount>0))return;target.lastDamageAt=g.time;
 const owner=source?.ownerId?g.entities.find(e=>e.id===source.ownerId):source;
 if(target.statuses?.chenRecall&&owner?.kind==='hero'&&owner.team!==target.team)delete target.statuses.chenRecall;
}

export function chenDeath(g,unit){
 if(unit.zealot){const h=g.entities.find(e=>e.id===unit.ownerId&&e.heroId==='chen');if(h)h.zealotRespawnAt=g.time+Math.max(0,innate(h).values.zealot_respawn_time);}
}

export function chenCombatStats(g,unit,stats,target){
 const penitence=target?.statuses?.chenPenitence;
 if(penitence&&penitence.until>g.time&&target.team!==unit.team&&!Skills.debuffImmune(g,target)){
  stats.attackSpeed=Math.min(700,stats.attackSpeed+penitence.bonusAttackSpeed);if(unit.baseAttackTime)stats.attackInterval=unit.baseAttackTime*100/stats.attackSpeed;
 }
 for(const s of Object.values(unit.statuses||{}))if(s.chenImmunity&&s.until>g.time)stats.magicResistance=1-(1-stats.magicResistance)*(1-s.magicResistance/100);
 if(unit.heroId==='chen'&&penitence&&penitence.sourceId===unit.id)stats.range=(stats.range||unit.range)+(ability(unit,0).values.self_attack_range_bonus||0);
 return stats;
}

export function chenRegen(g,unit){
 let regen=0;for(const s of Object.values(unit.statuses||{}))if(s.until>g.time)regen+=s.chenAuraRegen||0;
 return regen;
}

export function tickChenWorld(g){
 const dt=g._chenTickAt==null?0:Math.max(0,g.time-g._chenTickAt);g._chenTickAt=g.time;
 const heroes=g.entities.filter(h=>h.heroId==='chen'&&h.kind==='hero');
 for(const h of heroes){
  if(alive(h)&&h.zealotRespawnAt<=g.time+1e-7&&!ownedUnits(g,h).some(e=>e.zealot))spawnZealot(g,h);
  updateZealotGrowth(g,h);
  const s=ability(h,2),active=alive(h)&&s.level>0&&!Skills.hasStatusFlag(g,h,'break'),channel=h.channel?.kind==='chenHandOfGod'?h.channel:null;
  for(const unit of g.entities){
   if(!alive(unit)||unit.team!==h.team||!fighter(unit))continue;
   const id='chenAura:'+h.id;
   if(active&&distance(h,unit)<=s.values.aura_radius+(h.spellAoE||0))Skills.addStatus(g,unit,id,{name:'神力恩泽光环',description:`生命恢复 +${s.values.heal_rate}/秒。`,positive:true,icon:'heal',sourceId:h.id,chenAuraRegen:s.values.heal_rate,duration:.1});
   else delete unit.statuses?.[id];
   const immuneId='chenImmunity:'+h.id;
   if(channel&&g.time<channel.until&&unit!==h&&distance(h,unit)<=channel.skill.values.debuff_immune_radius+(h.spellAoE||0))Skills.addStatus(g,unit,immuneId,{name:'上帝之手减益免疫',description:'持续施法期间获得减益免疫与魔法抗性。',positive:true,undispellable:true,icon:'heal',sourceId:h.id,chenImmunity:true,debuffImmune:true,magicResistance:channel.skill.values.debuff_immune_resist,duration:.1});
   else delete unit.statuses?.[immuneId];
  }
 }
 for(const unit of g.entities){
  if(!alive(unit))continue;
  const recall=unit.statuses?.chenRecall;
  if(recall&&recall.until<=g.time+1e-7){
   const h=g.entities.find(e=>e.id===recall.sourceId);delete unit.statuses.chenRecall;
   if(h&&ownsControlledUnit(h,unit)){const point=g.navigation.nearestWalkable({x:h.x+65,y:h.y+25});Object.assign(unit,{...point,navPath:null,destination:null,explicitTarget:null,targetId:null,movementInput:{x:0,y:0}});setCreatureOrder(unit,'follow');g.collisions.place(unit,point,g.navigation);unit.projectileDisjoint=(unit.projectileDisjoint||0)+1;glow(g,h,unit);}
  }
  if(unit.neutralCast?.kind==='martyrdom'&&unit.neutralCast.executeAt<=g.time+1e-7){
   const target=g.entities.find(e=>e.id===unit.neutralCast.targetId);unit.neutralCast=null;
   if(alive(target)&&!g.isStunned(unit)&&!Skills.hasStatusFlag(g,unit,'silenced')){
    const amount=MARTYRDOM.values.base_value+unit.hp*MARTYRDOM.values.current_hp_pct/100;
    projectile(g,unit,target,{kind:'martyrdom',speed:MARTYRDOM.values.speed,amount,friendly:target.team===unit.team});g._kill(unit,null);
   }
  }
  const hot=unit.statuses?.chenHandOfGod;
  if(hot&&dt>0){const h=g.entities.find(e=>e.id===hot.sourceId),duration=Math.max(0,Math.min(g.time,hot.until)-Math.max(g.time-dt,hot.startedAt)),channel=h?.channel?.kind==='chenHandOfGod'?h.channel:null;
   const boost=channel&&unit!==h&&g.time<=channel.until&&distance(h,unit)<=channel.skill.values.debuff_immune_radius+(h.spellAoE||0)?1+channel.skill.values.nearby_hot_boost/100:1;
   heal(g,unit,hot.chenHealPerSec*duration*boost,h);
  }
 }
 const complete=[];
 for(const shot of g.pendingSpells)if(shot.type==='chenProjectile'){
  const target=g.entities.find(e=>e.id===shot.targetId),source=g.entities.find(e=>e.id===shot.sourceId),owner=g.entities.find(e=>e.id===shot.ownerId)||source;
  if(!alive(target)||!source||(target.projectileDisjoint||0)!==shot.disjoint||!shot.friendly&&(Skills.isInvulnerable(g,target)||!g.canSee(source,target))){complete.push(shot);continue;}
  const d=distance(shot,target),travel=shot.speed*Math.max(0,g.time-shot.lastTick);shot.lastTick=g.time;
  if(d<=travel+1e-7){
   if(shot.kind==='penitence'&&!Skills.debuffImmune(g,target)){
    if(!shot.reflected&&Skills.hasStatusFlag(g,target,'spellReflect'))projectile(g,target,source,{kind:'penitence',speed:shot.speed,skill:shot.skill,reflected:true});
    if(g.blockTargetSpell?.(source,target,shot.skill)){complete.push(shot);continue;}
    g.damage(target,shot.skill.damage,source,'pure');
    if(alive(target))Skills.addStatus(g,target,'chenPenitence',{name:'赎罪',description:'移动速度降低，攻击此目标的友军获得额外攻速。',sourceId:source.id,duration:shot.skill.values.duration*(1-Skills.statusResistance(g,target)),slowPct:Math.abs(shot.skill.values.bonus_movement_speed),bonusAttackSpeed:shot.skill.values.bonus_attack_speed,icon:'target'});
   }else if(shot.kind==='martyrdom'){if(shot.friendly)heal(g,target,shot.amount*MARTYRDOM.values.heal_factor/100,owner);else if(!Skills.debuffImmune(g,target))g.damage(target,shot.amount,source,'pure');}
   complete.push(shot);glow(g,owner||source,target);
  }else{shot.x+=(target.x-shot.x)/d*travel;shot.y+=(target.y-shot.y)/d*travel;const visual=g.effects.find(e=>e.id===shot.visualId);if(visual)Object.assign(visual,{x:shot.x,y:shot.y,tx:target.x,ty:target.y});}
 }
 g.pendingSpells=g.pendingSpells.filter(s=>!complete.includes(s));g.effects=g.effects.filter(e=>!complete.some(s=>s.visualId===e.id));
}

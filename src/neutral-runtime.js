import {NEUTRAL_ABILITIES} from './unit-data.js';
import {UNIT_SKILL_UI} from './unit-skill-data.js';
import {CREATURE_RULES,CREATURE_SUMMONS,MARTYRDOM} from './chen-data.js';
import * as Skills from './hero-runtime.js';
import {castMartyrdom,castAnoint} from './chen-runtime.js';
import {heal,healInArea,areaHealingRecipients,alive,fighter,building,distance,forceMove} from './item-common.js';
import {spendMana,restoreMana} from './mana-runtime.js';

const rank=(unit,raw,fallback=0)=>{
 const values=String((typeof raw==='object'?raw?.value:raw)??fallback).trim().split(/\s+/).map(Number);
 return values[Math.min(unit.abilityLevelBonus||0,values.length-1)]??fallback;
};
export const creatureRank=rank;
const definition=id=>NEUTRAL_ABILITIES[id]||UNIT_SKILL_UI[id]?.definition;
export const creatureActiveIds=unit=>(unit.abilities||[]).filter(id=>id==='chen_martyrdom'||id==='chen_anoint'||definition(id)&&!definition(id).passive&&!definition(id).behavior?.includes('HIDDEN'));
export function creatureSkill(unit,index){
 const id=creatureActiveIds(unit)[index];
 if(id==='chen_martyrdom')return {...MARTYRDOM,kind:'active',level:1};
 if(id==='chen_anoint')return {id,name:'祝圣',kind:'active',level:1,mana:0,cooldown:0,range:0,castPoint:0,values:{}};
 const data=definition(id),ui=UNIT_SKILL_UI[id];
 if(!data)return {id:'none',name:'无可用技能',kind:'passive',level:0,values:{},mana:0,cooldown:0,range:0};
 return {id,name:ui?.name||id,description:ui?.description||'',kind:'active',level:1+(unit.abilityLevelBonus||0),icon:'aura',
  values:Object.fromEntries(Object.entries(data.values||{}).map(([k,v])=>[k,rank(unit,v)])),mana:rank(unit,data.manaCost),cooldown:rank(unit,data.cooldown),range:rank(unit,data.castRange),castPoint:rank(unit,data.castPoint),damage:rank(unit,data.damage),
  damageType:data.damageType?.replace('DAMAGE_TYPE_','').toLowerCase()||'magical',behavior:data.behavior||'DOTA_ABILITY_BEHAVIOR_UNIT_TARGET',targetTeam:data.targetTeam,targetType:data.targetType,targetFlags:data.targetFlags,...CREATURE_RULES[id],
  ...(unit.ownerId&&data.values?.player_cast_point?{castPoint:rank(unit,data.values.player_cast_point)}:{}),
  ...(unit.ownerId&&id==='ogre_bruiser_ogre_smash'?{castPoint:1.4}:{})};
}
const noTargets=new Set(['centaur_khan_war_stomp','polar_furbolg_ursa_warrior_thunder_clap','giant_wolf_intimidate','spawnlord_master_stomp','big_thunder_lizard_slam','dark_troll_warlord_raise_dead','harpy_scout_take_off','frogmen_congregation_of_the_deep','ogre_seal_flop']);
const points=new Set(['ogre_bruiser_ogre_smash','enraged_wildkin_tornado','satyr_hellcaller_shockwave','black_dragon_fireball','frogmen_arm_of_the_deep','frogmen_tendrils_of_the_deep','kobold_disarm','mud_golem_hurl_big_boulder','eimermole_miners_slam','radigull_eggstremism']);
const friendly=new Set(['ogre_magi_frost_armor','forest_troll_high_priest_heal','big_thunder_lizard_frenzy','frogmen_water_bubble_small','frogmen_water_bubble_medium','frogmen_water_bubble_large']);
function targetFor(g,unit,skill,point){
 if(noTargets.has(skill.id)||points.has(skill.id))return null;
 const team=skill.targetTeam|| (friendly.has(skill.id)?'DOTA_UNIT_TARGET_TEAM_FRIENDLY':'DOTA_UNIT_TARGET_TEAM_ENEMY');
 const target=g.entities.filter(e=>alive(e)&&(fighter(e)||skill.targetType?.includes('BUILDING')&&building(e))&&!Skills.isInvulnerable(g,e)&&g.canSee(unit,e)&&
  (team.endsWith('BOTH')||team.endsWith('FRIENDLY')?team.endsWith('BOTH')||e.team===unit.team:e.team!==unit.team)&&
  (point?.self||point?.id===unit.id?e===unit:point&&distance(e,point)<=Math.max(45,e.radius||0))).sort((a,b)=>distance(a,point||unit)-distance(b,point||unit))[0];
 return target;
}
export function castCreature(g,unit,index,point){
 const allowed=g._canAct(unit);if(!allowed.ok)return allowed;
 const skill=creatureSkill(unit,index),fail=reason=>({ok:false,reason});
 if(!skill.level)return fail('此单位没有对应的主动技能');
 if(skill.id==='chen_martyrdom')return castMartyrdom(g,unit,point);
 if(skill.id==='chen_anoint')return castAnoint(g,unit);
 if(g.isStunned(unit)||g._tauntSource(unit)||Skills.hasStatusFlag(g,unit,'silenced'))return fail('当前控制状态下无法施法');
 if(unit.neutralCast)return fail('正在施法');
 if(skill.id==='harpy_scout_take_off'&&unit.creatureFlying){delete unit.creatureFlying;delete unit.statuses.creatureFlight;unit.flying=false;return {ok:true};}
 if((unit.abilityCooldowns?.[skill.id]||0)>g.time+1e-7)return fail('技能尚未冷却');
 if((unit.mana||0)<skill.mana)return fail('魔法不足');
 if(skill.id==='enraged_wildkin_hurricane'&&g.isRooted(unit))return fail('缠绕期间无法使用飓风');
 if(skill.behavior.includes('ROOT_DISABLES')&&g.isRooted(unit))return fail('缠绕期间无法使用');
 const aim=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)?point:{x:unit.x+Math.cos(unit.angle||0)*100,y:unit.y+Math.sin(unit.angle||0)*100};
 const target=targetFor(g,unit,skill,aim);
 if(!noTargets.has(skill.id)&&!points.has(skill.id)&&!target)return fail('请选择有效的技能目标');
 if(target&&distance(unit,target)>skill.range+(target.radius||0))return fail(`目标超过 ${skill.range} 施法距离`);
 if(target?.team===unit.team&&skill.targetFlags?.includes('NOT_MAGIC_IMMUNE_ALLIES')&&Skills.debuffImmune(g,target))return fail('不能对减益免疫友军使用');
 if(points.has(skill.id)&&skill.range>0&&distance(unit,aim)>skill.range+1)return fail(`目标超过 ${skill.range} 施法距离`);
 Skills.interruptCast(g,unit,false);unit.destination=null;unit.movementInput={x:0,y:0};unit.navPath=null;
 unit.neutralCast={skill,targetId:target?.id,point:{...aim},executeAt:g.time+skill.castPoint};
 if(skill.castPoint>0)Skills.addStatus(g,unit,'casting',{name:`施放${skill.name}`,positive:true,icon:'aura',duration:skill.castPoint});
 else releaseCreature(g,unit);
 return {ok:true};
}
export function toggleCreatureAutocast(g,unit,index){
 const skill=creatureSkill(unit,index);if(!skill.behavior?.includes('AUTOCAST')&&skill.id!=='ogre_magi_frost_armor')return {ok:false,reason:'此技能不能切换自动施放'};
 unit.creatureAutocast||={};unit.creatureAutocast[skill.id]=unit.creatureAutocast[skill.id]===false;return {ok:true,autocast:unit.creatureAutocast[skill.id]};
}
const effect=(g,unit,point,radius=90)=>g._effect('ring',point.x,point.y,{sourceId:unit.id,team:unit.team,radius,color:'#cfdbc3',life:.55});
const debuff=(g,target,source,skill,fields={},duration=skill.values.duration)=>{
 if(!alive(target)||Skills.isInvulnerable(g,target)||Skills.debuffImmune(g,target)&&!skill.targetFlags?.includes('MAGIC_IMMUNE_ENEMIES'))return;
 return Skills.addStatus(g,target,skill.id,{name:skill.name,description:skill.description,icon:'aura',sourceId:source.id,duration:duration*(1-Skills.statusResistance(g,target)),...fields});
};
const enemies=(g,unit,point,radius)=>g.entities.filter(e=>alive(e)&&fighter(e)&&e.team!==unit.team&&!Skills.isInvulnerable(g,e)&&distance(e,point)<=radius+(e.radius||0));
function missile(g,unit,target,skill,kind,speed,fields={}){
 g.pendingSpells.push({type:'creatureMissile',kind,sourceId:unit.id,targetId:target.id,team:unit.team,x:unit.x,y:unit.y,lastTick:g.time,landAt:Infinity,speed,skill,disjoint:target.projectileDisjoint||0,...fields});
}
function line(g,unit,skill,point,angleOffset=0){
 const angle=Math.atan2(point.y-unit.y,point.x-unit.x)+angleOffset;
 g.pendingSpells.push({type:'creatureLine',sourceId:unit.id,team:unit.team,skill,x:unit.x,y:unit.y,origin:{x:unit.x,y:unit.y},dir:{x:Math.cos(angle),y:Math.sin(angle)},traveled:0,lastTick:g.time,landAt:Infinity,hits:[]});
}
function bubble(g,unit,target,skill){
 Skills.addStatus(g,target,skill.id,{name:skill.name,description:skill.description,positive:true,sourceId:unit.id,icon:'shield',duration:skill.values.duration,creatureBubble:true,barrier:skill.values.damage_absorb,originalBarrier:skill.values.damage_absorb,healPct:skill.values.heal_pct||0,healRadius:skill.values.radius||0});effect(g,unit,target);
}
function burstBubble(g,target,status){
 delete target.statuses[status.id];const source=g.entities.find(e=>e.id===status.sourceId)||target;
 if(!status.healPct||!alive(target))return;
 const amount=status.originalBarrier*status.healPct/100;
 if(!status.healRadius){heal(g,target,amount,source);return;}
 for(const unit of areaHealingRecipients(g,target,status.healRadius))healInArea(g,unit,amount,source);
}
function releaseCreature(g,unit){
 const phase=unit.neutralCast;if(!phase?.skill)return;const {skill,point}=phase,v=skill.values,target=g.entities.find(e=>e.id===phase.targetId);
 unit.neutralCast=null;delete unit.statuses.casting;
 if(!alive(unit)||g.isStunned(unit)||Skills.hasStatusFlag(g,unit,'silenced')||phase.targetId&&!alive(target))return;
 if((unit.mana||0)<skill.mana)return;
 spendMana(unit,skill.mana);unit.abilityCooldowns||={};unit.abilityCooldowns[skill.id]=g.time+skill.cooldown*(1-creatureCooldownReduction(g,unit)/100);
 if(target&&target.team!==unit.team&&g.blockTargetSpell?.(unit,target,skill))return;
 const hit=(enemy,amount,type=skill.damageType)=>g.damage(enemy,amount,unit,type);
 switch(skill.id){
  case 'centaur_khan_war_stomp':case 'polar_furbolg_ursa_warrior_thunder_clap':case 'spawnlord_master_stomp':case 'big_thunder_lizard_slam':case 'giant_wolf_intimidate':
   for(const enemy of enemies(g,unit,unit,v.radius)){
    if(skill.id==='centaur_khan_war_stomp'){hit(enemy,skill.damage);Skills.applyStun(g,enemy,enemy.kind==='hero'?v.hero_stun_duration:v.non_hero_stun_duration,unit);}
    else if(skill.id==='giant_wolf_intimidate')debuff(g,enemy,unit,skill,{creatureDamageReduction:v.damage_reduction});
    else if(skill.id==='spawnlord_master_stomp'){hit(enemy,v.damage);debuff(g,enemy,unit,skill,{creatureArmorReduction:v.armor_reduction_pct});}
    else{hit(enemy,skill.damage);debuff(g,enemy,unit,skill,{slowPct:Math.abs(v.movespeed_slow),attackSlow:Math.abs(v.attackspeed_slow||v.attack_slow_tooltip||0)},v.duration||(enemy.kind==='hero'?v.hero_duration:v.non_hero_duration));}
   }effect(g,unit,unit,v.radius);break;
  case 'ogre_bruiser_ogre_smash':{
   const angle=Math.atan2(point.y-unit.y,point.x-unit.x),center={x:unit.x+Math.cos(angle)*v.radius,y:unit.y+Math.sin(angle)*v.radius};
   for(const enemy of enemies(g,unit,center,v.radius)){hit(enemy,v.damage+enemy.hp*v.damage_pct/100);Skills.applyStun(g,enemy,v.hero_stun_duration,unit);}effect(g,unit,center,v.radius);break;
  }
  case 'fel_beast_haunt':missile(g,unit,target,skill,'silence',v.projectile_speed);break;
  case 'mud_golem_hurl_boulder':missile(g,unit,target,skill,'boulder',v.speed);break;
  case 'dark_troll_warlord_ensnare':missile(g,unit,target,skill,'ensnare',v.net_speed);break;
  case 'warpine_raider_seed_shot':case 'harpy_storm_chain_lightning':{
   const seed=skill.id==='warpine_raider_seed_shot';
    g.pendingSpells.push({type:'creatureChain',sourceId:unit.id,targetId:target.id,team:unit.team,skill,landAt:g.time,damage:seed?v.damage:v.initial_damage,remaining:seed?v.bounces:v.max_targets,hits:[],snowball:seed&&unit.unitId==='odobenus_frostmage'});break;
  }
  case 'satyr_soulstealer_mana_burn':hit(target,spendMana(target,v.burn_amount+v.int_multiplier*(target.intelligence||0)));effect(g,unit,target);break;
  case 'necronomicon_archer_mana_burn':hit(target,spendMana(target,v.burn_amount));effect(g,unit,target);break;
  case 'necronomicon_archer_purge':for(const [id,status]of Object.entries(target.statuses||{}))if(status.positive&&!status.undispellable)delete target.statuses[id];debuff(g,target,unit,skill,{slowPct:100,decayingSlow:true,decayRate:v.purge_rate});break;
  case 'satyr_trickster_purge':
   if(target.team===unit.team)Skills.applyDispel(g,target,false);
   else{for(const [id,s]of Object.entries(target.statuses||{}))if(s.positive&&!s.undispellable)delete target.statuses[id];debuff(g,target,unit,skill,{slowPct:80,decayingSlow:true,decayRate:v.purge_rate});if(target.ownerId)hit(target,v.summon_damage);}
   effect(g,unit,target);break;
  case 'ogre_magi_frost_armor':Skills.addStatus(g,target,skill.id,{name:skill.name,positive:true,sourceId:unit.id,icon:'snow',duration:v.duration,armor:v.armor_bonus,creatureFrostArmor:true,slowPctOnAttack:Math.abs(v.movespeed_slow),attackSlowOnAttack:Math.abs(v.attackspeed_slow),slowDuration:v.slow_duration});effect(g,unit,target);break;
  case 'big_thunder_lizard_frenzy':Skills.addStatus(g,target,skill.id,{name:skill.name,positive:true,sourceId:unit.id,icon:'aura',duration:v.duration,attackSpeed:v.attackspeed_bonus});effect(g,unit,target);break;
  case 'forest_troll_high_priest_heal':heal(g,target,v.health,unit);effect(g,unit,target);break;
  case 'ice_shaman_incendiary_bomb':debuff(g,target,unit,skill,{tickDamage:v.burn_damage*(building(target)?v.building_damage_pct/100:1),tickInterval:1,nextTick:g.time+1,damageType:'magical',endTickInclusive:true,fullDamageTicks:true});effect(g,unit,target);break;
  case 'frogmen_water_bubble_small':case 'frogmen_water_bubble_medium':case 'frogmen_water_bubble_large':bubble(g,unit,target,skill);break;
  case 'spawnlord_master_freeze':Skills.applyRoot(g,target,v.duration,unit,true,{sourceId:unit.id,tickDamage:v.damage*v.tick_interval,tickInterval:v.tick_interval,nextTick:g.time+v.tick_interval,damageType:'physical'});break;
  case 'satyr_hellcaller_shockwave':case 'frogmen_arm_of_the_deep':line(g,unit,skill,point);break;
  case 'frogmen_tendrils_of_the_deep':for(const angle of [-1,0,1])line(g,unit,skill,point,angle*v.yaw_offset*Math.PI/180);break;
  case 'frogmen_congregation_of_the_deep':for(let i=0;i<v.projectile_count;i++)line(g,unit,skill,{x:unit.x+100,y:unit.y},i*Math.PI*2/v.projectile_count);break;
  case 'black_dragon_fireball':{
   const angle=Math.atan2(point.y-unit.y,point.x-unit.x);unit.creatureMotion={kind:'swoop',origin:{x:unit.x,y:unit.y},angle,start:g.time,duration:v.dive_duration,skill,nextFire:g.time};unit.neutralChannel={until:g.time+v.dive_duration};break;
  }
  case 'kobold_disarm':line(g,unit,{...skill,damage:v.base_damage,values:{...v,distance:500,projectile_width:v.radius}},point);break;
  case 'mud_golem_hurl_big_boulder':{
   const d=distance(unit,point),duration=v.min_travel_time+(v.max_travel_time-v.min_travel_time)*Math.min(1,d/skill.range);
   g.pendingSpells.push({type:'creatureBigBoulder',sourceId:unit.id,team:unit.team,skill,x:point.x,y:point.y,landAt:g.time+duration});effect(g,unit,point,v.impact_radius);break;
  }
  case 'radigull_eggstremism':{
   const angle=Math.atan2(point.y-unit.y,point.x-unit.x);
   for(const side of [-1,1]){const egg=g._unit('summon',unit.team,point.x+Math.cos(angle+Math.PI/2)*90*side,point.y+Math.sin(angle+Math.PI/2)*90*side,{name:'狂海鸥爆裂蛋',sourceId:'npc_dota_radigull_egg',radigullEgg:true,pipHealth:true,maxHp:1,range:0,damage:0,speed:0,attackCooldown:Infinity,radius:16,abilities:[],expiresAt:g.time+v.fuse_duration,eggSourceId:unit.id});g.entities.push(egg);g.pendingSpells.push({type:'creatureEgg',sourceId:unit.id,eggId:egg.id,team:unit.team,skill,landAt:egg.expiresAt});}break;
  }
  case 'eimermole_miners_slam':{
   const angle=Math.atan2(point.y-unit.y,point.x-unit.x);g.pendingSpells.push({type:'creatureSlam',sourceId:unit.id,team:unit.team,skill,x:unit.x+Math.cos(angle)*150,y:unit.y+Math.sin(angle)*150,landAt:g.time,pulses:0});break;
  }
  case 'ogre_seal_flop':{
   const angle=Math.atan2(point.y-unit.y,point.x-unit.x);unit.creatureMotion={kind:'flop',origin:{x:unit.x,y:unit.y},angle,start:g.time,duration:v.leap_distance/v.leap_speed*v.max_bounces,skill,landed:0};unit.neutralChannel={until:g.time+unit.creatureMotion.duration};break;
  }
  case 'enraged_wildkin_hurricane':{
   const dir=point.direction||{x:Math.cos(unit.angle||0),y:Math.sin(unit.angle||0)},length=Math.hypot(dir.x,dir.y)||1;
   forceMove(g,target,{x:target.x+dir.x/length*v.distance,y:target.y+dir.y/length*v.distance},.4,unit);break;
  }
  case 'harpy_scout_take_off':unit.flying=true;unit.creatureFlying={cost:v.cost_per_second};Skills.addStatus(g,unit,'creatureFlight',{name:skill.name,positive:true,icon:'wind',undispellable:true,duration:Infinity,movePercent:-v.move_speed_penalty});break;
  case 'dark_troll_warlord_raise_dead':{
   const base=CREATURE_SUMMONS.npc_dota_dark_troll_warlord_skeleton_warrior;
   for(let n=0;n<v.skeletons_created;n++)spawnCreature(g,unit,{...base,name:'骷髅战士',nativeKind:'creep',maxHp:v.skeletons_health,damage:v.skeletons_damage,damageMin:v.skeletons_damage,damageMax:v.skeletons_damage,expiresAt:g.time+v.duration,abilities:[]},n);break;
  }
  case 'enraged_wildkin_tornado':{
   const tornado=spawnCreature(g,unit,{...CREATURE_SUMMONS.npc_dota_enraged_wildkin_tornado,name:'飓风',speed:v.tornado_base_movespeed,flying:true,creatureTornado:true,channelSourceId:unit.id,destination:point,expiresAt:g.time+v.duration,abilities:[]},0);
   Skills.addStatus(g,tornado,'invulnerable',{name:'飓风',positive:true,invulnerable:true,canMoveInvulnerable:true,undispellable:true,duration:Infinity});unit.neutralChannel={until:g.time+skill.channelTime,tornadoId:tornado.id,linger:v.linger_duration};break;
  }
 }
}
function spawnCreature(g,parent,stats,index){
 const point=g.navigation.nearestWalkable({x:parent.x+65+index*40,y:parent.y+45}),owner=g.entities.find(e=>e.id===(parent.ownerId||parent.id));
 const unit=g._unit('summon',parent.team,point.x,point.y,{...stats,ownerId:parent.ownerId||parent.id,abilityLevelBonus:parent.abilityLevelBonus||0,movementInput:{x:0,y:0},manualControl:!!(owner?.isPlayer||owner?.isHuman),abilityCooldowns:{}});g.entities.push(unit);return unit;
}
export function autoCastCreature(g,unit,target){
 if(unit.neutralCast||unit.neutralChannel)return false;
 const owner=g.entities.find(e=>e.id===unit.ownerId),manual=!!unit.manualControl&&(owner?.isPlayer||owner?.isHuman);
 for(const [index,id]of creatureActiveIds(unit).entries()){
  if(manual&&!['forest_troll_high_priest_heal','ogre_magi_frost_armor','spawnlord_master_freeze'].includes(id)||unit.creatureAutocast?.[id]===false)continue;
  const s=creatureSkill(unit,index);if((unit.abilityCooldowns?.[id]||0)>g.time||(unit.mana||0)<s.mana)continue;
  if(!unit.ownerId){unit.neutralCastAttempts||={};if((unit.neutralCastAttempts[id]||0)>g.time)continue;unit.neutralCastAttempts[id]=g.time+(s.values.neutral_cast_attempt_cooldown||1);if(g._random()*100>(s.values.neutral_chance_to_cast||100))continue;}
  let aim=target;
  if(friendly.has(id))aim=g.entities.filter(e=>alive(e)&&fighter(e)&&e.team===unit.team&&distance(e,unit)<=s.range&&(id==='forest_troll_high_priest_heal'?e.hp<e.maxHp-40:!e.statuses?.[id])).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(noTargets.has(id)&&id!=='dark_troll_warlord_raise_dead'&&(!target||distance(unit,target)>(id==='ogre_seal_flop'?800:(s.values.radius||300))))continue;
  if(id==='chen_martyrdom'&&unit.hp/unit.maxHp>.35)continue;
  if(aim&&castCreature(g,unit,index,aim).ok)return true;
 }
 return false;
}

// Controlled neutral auras keep their original, independently ranked effects.
const auraFields={
 kobold_taskmaster_speed_aura:{movePercent:'bonus_movement_speed'},mudgolem_cloak_aura:{creatureMagicResistance:'bonus_magical_armor'},centaur_khan_endurance_aura:{attackSpeed:'bonus_attack_speed'},
 alpha_wolf_command_aura:{creatureDamagePct:'bonus_damage_pct'},enraged_wildkin_toughness_aura:{armor:'bonus_armor'},satyr_hellcaller_unholy_aura:{creatureRegen:'health_regen'},forest_troll_high_priest_mana_aura:{creatureManaRegen:'mana_regen'},
 spawnlord_aura:{creatureRegen:'hp_regen',creatureLifesteal:'lifesteal'},ancient_rock_golem_weakening_aura:{armor:'armor_reduction'},granite_golem_hp_aura:{creatureHpPct:'bonus_hp'},
 frostbitten_golem_time_warp_aura:{creatureCdr:'bonus_cdr'},big_thunder_lizard_wardrums_aura:{flatSpeed:'speed_bonus',creatureAccuracy:'accuracy'},forest_troll_high_priest_heal_amp_aura:{creatureHealAmp:'heal_amp'},
 black_drake_magic_amplification_aura:{creatureSpellAmp:'spell_amp'},black_dragon_dragonhide_aura:{armor:'bonus_armor'},frogmen_riverborn_aura:{movePercent:'bonus_movement_speed',creatureDamagePct:'bonus_outgoing_damage'},kobold_tunneler_prospecting:{creatureGpm:'gpm_aura'},
 eimermole_miners_aura:{healReduction:'restoration_reduction'},ogre_seal_pup_disapproval_aura:{slowPct:'movespeed_slow'},
};
function tickAuras(g){
 const sources=g.entities.filter(e=>alive(e)&&(e.ownerId||['eimermole','ogre_seal_pup'].includes(e.unitId))&&e.abilities?.some(id=>auraFields[id])&&!Skills.hasStatusFlag(g,e,'break'));
 if(!sources.length&&!g._hadCreatureAuras)return;g._hadCreatureAuras=!!sources.length;
 for(const unit of g.entities){
  const structure=building(unit);
  if(!alive(unit)||!fighter(unit)&&!structure)continue;
  const buffs=new Map();
  for(const source of sources)for(const id of source.abilities||[]){
   const fields=auraFields[id],a=definition(id);if(!fields||!a||structure&&!fields.creatureRegen)continue;
   const enemy=['ancient_rock_golem_weakening_aura','eimermole_miners_aura','ogre_seal_pup_disapproval_aura'].includes(id);if(enemy?unit.team===source.team:unit.team!==source.team)continue;
   if(enemy&&Skills.debuffImmune(g,unit))continue;
   if(id==='kobold_tunneler_prospecting'&&unit.kind!=='hero')continue;
   if(distance(source,unit)>rank(source,a.values.radius))continue;
   const data={sourceId:source.id};for(const [field,key]of Object.entries(fields)){
    if(structure&&field!=='creatureRegen')continue;
    data[field]=rank(source,a.values[id==='mudgolem_cloak_aura'&&unit.kind!=='hero'?'bonus_magical_armor_creeps':key])*(enemy&&field==='armor'?-1:1);
   }
   const previous=buffs.get(id);if(!previous||Object.entries(data).some(([key,n])=>key!=='sourceId'&&Math.abs(n)>Math.abs(previous[key]||0)))buffs.set(id,data);
  }
  for(const [id,data]of buffs)Skills.addStatus(g,unit,'creatureAura:'+id,{name:UNIT_SKILL_UI[id]?.name||id,icon:'aura',positive:!['ancient_rock_golem_weakening_aura','eimermole_miners_aura','ogre_seal_pup_disapproval_aura'].includes(id),hidden:structure,duration:.1,creatureAura:true,...data});
  for(const [id,status]of Object.entries(unit.statuses||{}))if(status.creatureAura&&!buffs.has(id.slice('creatureAura:'.length)))delete unit.statuses[id];
  if(structure)continue;
  const hpPct=Math.max(0,...[...buffs.values()].map(s=>s.creatureHpPct||0)),base=unit.maxHp-(unit.creatureHpBonus||0),bonus=base*hpPct/100;
  unit.creatureHpPct=hpPct;
  if(Math.abs(bonus-(unit.creatureHpBonus||0))>1e-6){const ratio=unit.hp/unit.maxHp;unit.creatureHpBonus=bonus;unit.maxHp=base+bonus;unit.hp=unit.maxHp*ratio;}
 }
}
const liveStatuses=(g,unit)=>Object.values(unit.statuses||{}).filter(s=>s.until>g.time);
export const creatureRegen=(g,unit)=>liveStatuses(g,unit).reduce((n,s)=>n+(s.creatureRegen||0),0);
export const creatureCooldownReduction=(g,unit)=>Math.max(0,...liveStatuses(g,unit).map(s=>s.creatureCdr||0));
export function creatureCombatStats(g,unit,stats){
 for(const s of liveStatuses(g,unit)){
  stats.damage*=1+(s.creatureDamagePct||0)/100;stats.damage*=1-(s.creatureDamageReduction||0)/100;
  stats.armor*=1-(s.creatureArmorReduction||0)/100;
  stats.magicResistance=1-(1-stats.magicResistance)*(1-(s.creatureMagicResistance||0)/100);
 }return stats;
}
export function creatureOutgoingDamage(g,unit,amount,options){
 if(!unit||options.attack||options.attackDamage)return amount;
 for(const s of liveStatuses(g,unit))amount*=1+(s.creatureSpellAmp||0)/100;return amount;
}
export function creatureIncomingDamage(g,target,amount,type){
 if(type==='magical')for(const s of liveStatuses(g,target))if(s.creatureBubble){const absorbed=Math.min(amount,s.barrier);s.barrier-=absorbed;amount-=absorbed;if(s.barrier<=0)burstBubble(g,target,s);}
 return amount;
}
export function creatureAttackModifiers(g,unit,target,result){
 // ItemRuntime has already scaled the hit to the full combat stats, including creature auras.
 if(unit.ownerId&&unit.abilities?.includes('alpha_wolf_critical_strike')&&!Skills.hasStatusFlag(g,unit,'break')){
  const a=definition('alpha_wolf_critical_strike');if(g._random()*100<rank(unit,a.values.crit_chance)){const multiplier=rank(unit,a.values.crit_mult)/100;result.damage*=multiplier;result.critical=true;result.criticalMultiplier=multiplier;}
 }
}
export function creatureAfterAttack(g,unit,target,result,dealt){
 const statuses=liveStatuses(g,unit),lifesteal=statuses.reduce((n,s)=>n+(s.creatureLifesteal||0),0);
 if(dealt>0&&lifesteal)heal(g,unit,dealt*lifesteal/100,unit);
 for(const s of liveStatuses(g,target))if(s.creatureFrostArmor)debuff(g,unit,target,{id:'creatureFrostSlow',name:'寒冰盔甲减速',description:'寒冰盔甲降低攻击者移动与攻击速度。',values:{}},{slowPct:s.slowPctOnAttack,attackSlow:s.attackSlowOnAttack},s.slowDuration);
 if(Skills.hasStatusFlag(g,unit,'break'))return;
 for(const id of unit.abilities||[]){
  const a=definition(id);if(!a)continue;const v=Object.fromEntries(Object.entries(a.values||{}).map(([k,n])=>[k,rank(unit,n)])),skill={id,name:UNIT_SKILL_UI[id]?.name||id,description:UNIT_SKILL_UI[id]?.description||'',values:v};
  if(id==='ghost_frost_attack')debuff(g,target,unit,skill,{slowPct:Math.abs(v.movespeed_slow),attackSlow:Math.abs(v.attackspeed_slow)});
  if(id==='gnoll_assassin_envenomed_weapon')debuff(g,target,unit,skill,{healReduction:v.regen_reduction,tickDamage:v.damage_per_second,tickInterval:1,nextTick:g.time+1,damageType:'magical'},target.kind==='hero'?v.hero_duration:v.non_hero_duration);
  if(id==='berserker_troll_break'&&(unit.abilityCooldowns?.[id]||0)<=g.time){debuff(g,target,unit,skill,{break:true});unit.abilityCooldowns[id]=g.time+rank(unit,a.cooldown);}
  if(id==='odobenus_blight')debuff(g,target,unit,skill,{armor:-v.armor_reduction},v.armor_reduction_duration);
  if(id==='necronomicon_warrior_mana_burn'){const burned=spendMana(target,v.burn_amount);g.damage(target,burned*v.burn_damage_conversion/100,unit,'physical',{attackDamage:true});}
  if(id==='black_dragon_splash_attack')for(const other of enemies(g,unit,target,v.range))if(other!==target)g.damage(other,result.damage*v.damage_percent/100,unit,'physical',{attackDamage:true});
 }
}
export function creatureDeath(g,unit,killer){
 if(!unit.ownerId)return;
 if(unit.abilities?.includes('necronomicon_warrior_last_will')&&alive(killer)&&!Skills.hasStatusFlag(g,unit,'break'))g.damage(killer,rank(unit,definition('necronomicon_warrior_last_will').values.explosion),unit,'magical');
 for(const id of ['furbolg_enrage_attack_speed','furbolg_enrage_damage'])if(unit.abilities?.includes(id)){
  const a=definition(id),v=Object.fromEntries(Object.entries(a.values).map(([k,n])=>[k,rank(unit,n)]));
  for(const ally of g.entities)if(alive(ally)&&ally.team===unit.team&&fighter(ally)&&distance(ally,unit)<=v.radius)Skills.addStatus(g,ally,id,{name:UNIT_SKILL_UI[id]?.name,positive:true,icon:'aura',duration:v.duration,attackSpeed:v.bonus_aspd||0,creatureDamagePct:v.bonus_dmg_pct||0});
 }
 if(unit.unitId==='mud_golem'){
  const a=definition('mud_golem_rock_destroy'),v=Object.fromEntries(Object.entries(a.values).map(([k,n])=>[k,rank(unit,n)]));
  for(let n=0;n<v.shard_amount;n++)spawnCreature(g,unit,{name:'泥土傀儡碎片',sourceId:'npc_dota_neutral_mud_golem_split',nativeKind:'neutral',unitId:'mud_golem_split',maxHp:v.shard_health,damage:v.shard_damage,damageMin:v.shard_damage,damageMax:v.shard_damage,speed:350,range:100,baseAttackTime:1.6,attackSpeed:100,armor:0,expiresAt:g.time+v.shard_duration,abilities:['mud_golem_hurl_boulder']},n);
 }
}
export function tickCreatureWorld(g){
 const dt=Math.max(0,g.time-(g._creatureTickAt??g.time));g._creatureTickAt=g.time;
 if(g.time>=(g._nextCreatureAuraAt||0)){tickAuras(g);g._nextCreatureAuraAt=g.time+.05;}
 for(const unit of g.entities){
  if(!alive(unit))continue;
  if(unit.kind==='neutral'&&!unit.isRoshan&&!unit.isTormentor&&unit.neutralGrowth!=null){
   const growth=Math.min(30,Math.floor((g.time+1e-7)/450)),delta=growth-unit.neutralGrowth,minutes=Math.floor((g.time+1e-7)/60),old=unit.neutralBountyMinutes||0;
   if(delta>0){unit.maxHp+=30*delta;unit.hp+=30*delta;unit.damage+=3*delta;unit.damageMin+=3*delta;unit.damageMax+=3*delta;unit.armor+=.5*delta;unit.xpBounty+=4*delta;unit.attackSpeed+=5*delta;unit.attackInterval=unit.baseAttackTime*100/unit.attackSpeed;unit.neutralGrowth=growth;}
   if(minutes>old){unit.goldMin+=Math.ceil(minutes/2)-Math.ceil(old/2);unit.goldMax+=Math.floor(minutes/2)-Math.floor(old/2);unit.neutralBountyMinutes=minutes;}
  }
  if(unit.abilities?.includes('necronomicon_warrior_sight'))unit.trueSight=rank(unit,definition('necronomicon_warrior_sight').values.radius);
  if(unit.creatureMotion){
   const motion=unit.creatureMotion,v=motion.skill.values;
   if(g.isStunned(unit)||g.isRooted(unit)||Skills.hasStatusFlag(g,unit,'hexed')){unit.creatureMotion=null;unit.neutralChannel=null;unit.flying=false;continue;}
   const progress=Math.min(1,(g.time-motion.start)/motion.duration),cos=Math.cos(motion.angle),sin=Math.sin(motion.angle);
   if(motion.kind==='swoop'){
    const along=Math.sin(progress*Math.PI)*v.dive_length,across=Math.sin(progress*Math.PI*2)*v.dive_width/2;
    unit.flying=true;unit.x=motion.origin.x+cos*along-sin*across;unit.y=motion.origin.y+sin*along+cos*across;
    if(g.time>=motion.nextFire){motion.nextFire=g.time+.15;g.pendingSpells.push({type:'creatureFireball',sourceId:unit.id,team:unit.team,skill:motion.skill,x:unit.x,y:unit.y,nextTick:g.time+v.burn_interval,landAt:Infinity,until:g.time+v.duration});effect(g,unit,unit,v.radius);}
   }else{
    const traveled=progress*v.leap_distance*v.max_bounces;unit.x=motion.origin.x+cos*traveled;unit.y=motion.origin.y+sin*traveled;
    while(motion.landed<Math.floor(progress*v.max_bounces+1e-7)){motion.landed++;const landing={x:motion.origin.x+cos*v.leap_distance*motion.landed,y:motion.origin.y+sin*v.leap_distance*motion.landed};for(const enemy of enemies(g,unit,landing,250)){g.damage(enemy,v.flop_damage,unit,'magical');debuff(g,enemy,unit,motion.skill,{slowPct:Math.abs(v.slow)},v.slow_duration);}effect(g,unit,landing,250);}
   }
   unit.moving=true;unit.navPath=null;
   if(progress>=1){unit.creatureMotion=null;unit.neutralChannel=null;unit.flying=false;}
  }
  for(const s of Object.values(unit.statuses||{}))if(s.creatureBubble&&s.until<=g.time+1e-7)burstBubble(g,unit,s);
  const regen=liveStatuses(g,unit).reduce((n,s)=>n+(s.creatureManaRegen||0),0);if(regen)restoreMana(unit,regen*dt);
  const gpm=liveStatuses(g,unit).reduce((n,s)=>n+(s.creatureGpm||0),0);if(gpm)unit.gold+=gpm/60*dt;
  if(unit.creatureFlying){const cost=unit.creatureFlying.cost*dt;spendMana(unit,cost);if(!unit.mana){unit.flying=false;delete unit.creatureFlying;delete unit.statuses.creatureFlight;}}
  if(unit.neutralChannel&&unit.neutralChannel.until<=g.time)unit.neutralChannel=null;
  if(unit.creatureTornado){const parent=g.entities.find(e=>e.id===unit.channelSourceId);if(!parent?.neutralChannel&&!unit.tornadoReleasedAt){unit.tornadoReleasedAt=g.time;unit.expiresAt=Math.min(unit.expiresAt,g.time+5);}
   if(!unit.nextTornadoTick||g.time>=unit.nextTornadoTick){unit.nextTornadoTick=g.time+.25;for(const enemy of enemies(g,unit,unit,600)){g.damage(enemy,(distance(unit,enemy)<=150?45:15)*.25,unit,'magical');debuff(g,enemy,unit,{id:'tornado_tempest',name:'飓风',values:{}},{slowPct:15,attackSlow:15},.3);}}
  }
  if(unit.neutralCast?.skill&&unit.neutralCast.executeAt<=g.time+1e-7)releaseCreature(g,unit);
 }
 const complete=new Set();
 for(const spell of g.pendingSpells){
  if(!spell.type.startsWith('creature'))continue;
  const source=g.entities.find(e=>e.id===spell.sourceId),target=g.entities.find(e=>e.id===spell.targetId),s=spell.skill,v=s.values;
  if(!source){complete.add(spell);continue;}
  if(spell.type==='creatureMissile'){
   if(!alive(target)||(target.projectileDisjoint||0)!==spell.disjoint){complete.add(spell);continue;}
   const travel=spell.speed*Math.max(0,g.time-spell.lastTick),d=distance(spell,target);spell.lastTick=g.time;
   if(d<=travel+1e-7){
    if(spell.kind==='silence')debuff(g,target,source,s,{silenced:true});
    else if(spell.kind==='ensnare')Skills.applyRoot(g,target,v.duration,source);
    else{g.damage(target,target.kind==='hero'?v.damage:v.damage_creeps,source,'magical');Skills.applyStun(g,target,v.duration,source);}effect(g,source,target);complete.add(spell);
   }else{spell.x+=(target.x-spell.x)/d*travel;spell.y+=(target.y-spell.y)/d*travel;g._effect('projectile',spell.x,spell.y,{tx:target.x,ty:target.y,tracked:true,color:'#c1d4bc',radius:18,life:.06});}
  }else if(spell.type==='creatureChain'&&spell.landAt<=g.time+1e-7){
   if(!alive(target)){complete.add(spell);continue;}if(spell.snowball&&target.team===source.team)heal(g,target,spell.damage,source);else{g.damage(target,spell.damage,source,'magical');if(s.id==='warpine_raider_seed_shot')debuff(g,target,source,s,{slowPct:v.slow});}effect(g,source,target);
   const seed=s.id==='warpine_raider_seed_shot';spell.hits.push(target.id);spell.remaining--;
   const candidates=spell.snowball?g.entities.filter(e=>alive(e)&&fighter(e)&&e!==target&&distance(e,target)<=v.bounce_range&&!Skills.isInvulnerable(g,e)):enemies(g,source,target,seed?v.bounce_range:v.jump_range);
   const next=candidates.filter(e=>!spell.hits.includes(e.id)).sort((a,b)=>distance(a,target)-distance(b,target))[0]||(spell.snowball?candidates.sort((a,b)=>distance(a,target)-distance(b,target))[0]:null);
   if(!next||spell.remaining<=0)complete.add(spell);else{spell.targetId=next.id;spell.landAt=g.time+(seed?v.bounce_delay:v.jump_delay);if(!seed)spell.damage*=1-v.damage_percent_loss/100;}
  }else if(spell.type==='creatureLine'){
   const speed=v.speed||900,travel=Math.min(speed*Math.max(0,g.time-spell.lastTick),(v.distance||v.range)-spell.traveled);spell.lastTick=g.time;
   const start={x:spell.x,y:spell.y};spell.x+=spell.dir.x*travel;spell.y+=spell.dir.y*travel;spell.traveled+=travel;
   for(const enemy of g.entities)if(alive(enemy)&&fighter(enemy)&&enemy.team!==source.team&&!spell.hits.includes(enemy.id)){
    const dx=enemy.x-start.x,dy=enemy.y-start.y,along=Math.max(0,Math.min(travel,dx*spell.dir.x+dy*spell.dir.y)),width=v.projectile_width||v.radius_end;
    if(Math.hypot(dx-spell.dir.x*along,dy-spell.dir.y*along)<=width+(enemy.radius||0)){spell.hits.push(enemy.id);g.damage(enemy,s.damage||v.damage,source,'magical');if(s.id==='kobold_disarm')debuff(g,enemy,source,s,{break:true},Math.min(4.5,v.break_duration));else if(v.duration)Skills.applyStun(g,enemy,v.duration,source);}
   }g._effect('beam',start.x,start.y,{tx:spell.x,ty:spell.y,color:'#b2d5bd',life:.1});if(spell.traveled>=(v.distance||v.range)-1e-7)complete.add(spell);
  }else if(spell.type==='creatureEgg'&&spell.landAt<=g.time+1e-7){
   const egg=g.entities.find(e=>e.id===spell.eggId);if(alive(egg)){for(const enemy of enemies(g,source,egg,v.radius)){g.damage(enemy,v.damage,source,'magical');debuff(g,enemy,source,s,{silenced:true},2);}g._kill(egg,null);effect(g,source,egg,v.radius);}complete.add(spell);
  }else if(spell.type==='creatureBigBoulder'&&spell.landAt<=g.time+1e-7){
   for(const enemy of enemies(g,source,spell,v.impact_radius)){g.damage(enemy,v.base_damage,source,'physical');Skills.applyStun(g,enemy,v.stun_duration,source);}effect(g,source,spell,v.impact_radius);complete.add(spell);
  }else if(spell.type==='creatureSlam'&&spell.landAt<=g.time+1e-7){
   for(const enemy of enemies(g,source,spell,v.radius)){g.damage(enemy,v.damage,source,'magical');debuff(g,enemy,source,s,{slowPct:v.slow_pct},v.slow_duration);}effect(g,source,spell,v.radius);spell.pulses++;spell.landAt+=v.pulse_interval;if(spell.pulses>=v.pulse_count)complete.add(spell);
  }else if(spell.type==='creatureFireball'){
   while(spell.nextTick<=Math.min(g.time,spell.until)+1e-7){for(const enemy of enemies(g,source,spell,v.radius)){enemy.creatureFireTicks||={};if(g.time>=(enemy.creatureFireTicks[source.id]||0)){g.damage(enemy,v.damage*v.burn_interval,source,'magical');enemy.creatureFireTicks[source.id]=g.time+v.burn_interval;}}spell.nextTick+=v.burn_interval;effect(g,source,spell,v.radius);}
   if(spell.until<=g.time)complete.add(spell);
  }
 }if(complete.size)g.pendingSpells=g.pendingSpells.filter(s=>!complete.has(s));
}

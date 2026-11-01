import * as Skills from './hero-runtime.js';
import * as Inventory from './inventory.js';
import { ITEM_BY_ID } from './item-data.js';
import { BASES } from './map-data.js';
import * as C from './item-common.js';
const {alive,distance,value:v,status,active,immune,invulnerable,heal,regen,allies,enemies,slow,dot,stun,dispel,forceMove,teleport,consume,refresh}=C;
const handlers={};
function define(ids,target,run,validate){for(const id of ids.split(' '))handlers[id]={target,run,validate};}
const reject=reason=>({ok:false,reason});
const pulse=(g,h,item,radius=300)=>g._effect('burst',h.x,h.y,{radius,color:item.color||'#a9ceac',life:.6});
const barrier=(g,e,item,amount,duration,type='all')=>status(g,e,'itemBarrier:'+item.id,item,{positive:true,duration,barrier:amount,barrierType:type,stacks:Math.ceil(amount)});
const buff=(g,e,item,duration,fields)=>status(g,e,'itemBuff:'+item.id,item,{positive:true,duration,...fields});
const disable=(g,e,item,duration,fields,h)=>{if(immune(g,e)||invulnerable(g,e))return;Skills.interruptCast(g,e,false);return status(g,e,'itemDebuff:'+item.id,item,{duration,sourceId:h.id,...fields});};

define('blink overwhelming_blink swift_blink arcane_blink','point',(g,h,e,p)=>{
 const item=e.item,range=v(item,'blink_range',1200),d=distance(h,p)||1,length=Math.min(d,d>range?v(item,'blink_range_clamp',range):range);
 const old={x:h.x,y:h.y};teleport(g,h,{x:h.x+(p.x-h.x)/d*length,y:h.y+(p.y-h.y)/d*length});h.projectileDisjoint=(h.projectileDisjoint||0)+1;
 g._effect('beam',old.x,old.y,{tx:h.x,ty:h.y,life:.25,color:'#a4c8e0'});
 if(item.id==='overwhelming_blink')for(const target of enemies(g,h,h,v(item,'radius'))){g.damage(target,v(item,'damage_base')+h.strength*v(item,'damage_pct_instant')/100,h,'magical');dot(g,target,item,v(item,'duration'),h.strength*v(item,'damage_pct_over_time')/100/v(item,'duration'),h);slow(g,target,item,v(item,'duration'),v(item,'movement_slow'),h,{attackSlow:v(item,'attack_slow')});}
 if(item.id==='swift_blink'){buff(g,h,item,v(item,'duration'),{movePercent:v(item,'bonus_movement'),bonusAgility:v(item,'bonus_agi_active'),phased:true});refresh(g,h);}
 if(item.id==='arcane_blink'){heal(g,h,v(item,'heal_amount'),h);h.mana=Math.min(h.maxMana,h.mana+v(item,'mana_amount'));}
},(g,h,e)=>g.isRooted(h)?reject('定身期间无法闪烁'):(h.lastHeroDamageAt??-Infinity)+v(e.item,'blink_damage_cooldown',3)>g.time?reject('受到英雄伤害后暂时无法闪烁'):null);

define('faerie_fire enchanted_mango','allyOptional',(g,h,e,p,target)=>{if(e.id==='faerie_fire')heal(g,h,v(e.item,'hp_restore'),h);else target.mana=Math.min(target.maxMana||0,(target.mana||0)+v(e.item,'replenish_amount'));consume(g,h,e);});
define('flask clarity bottle','allyOptional',(g,h,e,p,target)=>{
 const i=e.item;if(e.id==='flask')regen(g,target,i,v(i,'buff_duration'),v(i,'health_regen')*(target===h?1:.5),0,h,true);
 if(e.id==='clarity')regen(g,target,i,v(i,'buff_duration'),0,v(i,'mana_regen'),h,true);
 if(e.id==='bottle'){const duration=v(i,'restore_time');regen(g,target,i,duration,v(i,'health_restore')/duration,v(i,'mana_restore')/duration,h,true);e.meta.charges--;}
 else consume(g,h,e);
},(g,h,e)=>e.id==='bottle'&&!(e.meta.charges>0)?reject('魔瓶为空，回泉水补满'):null);
define('magic_stick magic_wand holy_locket','allyOptional',(g,h,e,p,target)=>{
 const count=e.meta.charges||0,i=e.item,health=v(i,['health_restore_per_charge','restore_per_charge']),mana=v(i,['mana_restore_per_charge','restore_per_charge']);
 heal(g,e.id==='holy_locket'?target:h,count*health,h);const recipient=e.id==='holy_locket'?target:h;recipient.mana=Math.min(recipient.maxMana,recipient.mana+count*mana);e.meta.charges=0;
 if(e.id==='holy_locket')buff(g,target,i,v(i,'active_buff_duration'),{healReceivedAmp:v(i,'incoming_heal_increase_active')});
},(g,h,e)=>!(e.meta.charges>0)?reject('尚未积累能量'):null);
define('tango quelling_blade bfury','tree',(g,h,e,p,tree)=>{C.cutTree(g,tree);if(e.id==='tango'){regen(g,h,e.item,v(e.item,'buff_duration')*(tree.treeIndex===undefined?2:1),v(e.item,'health_regen'),0,h);consume(g,h,e);}});
define('branch','point',(g,h,e,p)=>{C.plantTree(g,p);consume(g,h,e);});
define('blood_grenade','point',(g,h,e,p)=>{for(const target of enemies(g,h,p,v(e.item,'radius'))){g.damage(target,v(e.item,'impact_damage'),h,'magical');dot(g,target,e.item,v(e.item,'debuff_duration'),v(e.item,'damage_over_time'),h);slow(g,target,e.item,v(e.item,'debuff_duration'),v(e.item,'movespeed_slow'),h);}consume(g,h,e);g._effect('burst',p.x,p.y,{radius:v(e.item,'radius'),life:.7,color:'#bd614f'});});
define('ward_observer ward_sentry ward_dispenser','point',(g,h,e,p)=>{
 const mode=e.id==='ward_dispenser'?e.meta.mode:e.id==='ward_sentry'?'sentry':'observer',data=ITEM_BY_ID['ward_'+mode];
 const ward=g._unit('ward',h.team,p.x,p.y,{name:mode==='sentry'?'岗哨守卫':'侦查守卫',ownerId:h.id,wardType:mode,range:0,speed:0,maxHp:2,hitsRemaining:2,radius:16,visionDay:v(data,'vision_range',mode==='observer'?1600:0),visionNight:v(data,'vision_range',mode==='observer'?1600:0),trueSight:mode==='sentry'?v(data,'true_sight_range',1000):0,expiresAt:g.time+v(data,'duration',mode==='observer'?360:420),statuses:{}});status(g,ward,'wardHidden',data,{positive:true,invisible:true,undispellable:true,duration:ward.expiresAt-g.time});g.entities.push(ward);consume(g,h,e);
});
define('dust gem','pointOptional',(g,h,e,p)=>{
 const i=e.item,center=e.id==='dust'?h:p,radius=v(i,['radius','active_radius','reveal_radius'],1050),duration=v(i,['duration','active_duration'],12);
 g.itemZones||=[];g.itemZones.push({id:g._id('reveal'),type:'reveal',sourceId:h.id,team:h.team,x:center.x,y:center.y,radius,until:g.time+duration,itemId:i.id});
 for(const target of enemies(g,h,center,radius)){const invisible=C.hasFlag(g,target,'invisible');status(g,target,'revealed',i,{duration:duration+v(i,'linger_duration'),revealed:true,slowPct:invisible?Math.abs(v(i,'movespeed')):0});if(invisible)g.damage(target,v(i,'damage'),h,'magical');}
 if(e.id==='dust')consume(g,h,e);pulse(g,center,i,radius);
});
define('smoke_of_deceit','self',(g,h,e)=>{for(const ally of allies(g,h,v(e.item,'application_radius'),true))buff(g,ally,e.item,v(e.item,'duration'),{invisible:true,smoked:true,movePercent:v(e.item,'bonus_movement_speed'),breakRadius:v(e.item,'visibility_radius')});consume(g,h,e);});
define('moon_shard','allyHero',(g,h,e,p,target)=>{target.moonShard=true;refresh(g,target);Inventory.consumeItem(g,h,e.area,e.index);},(g,h,e,p,target)=>target?.moonShard?reject('目标已经吞服银月之晶'):null);
define('power_treads','self',(g,h,e)=>{const modes=['strength','agility','intelligence'];e.meta.mode=modes[(modes.indexOf(e.meta.mode||'strength')+1)%3];refresh(g,h);});
define('phase_boots','self',(g,h,e)=>buff(g,h,e.item,v(e.item,'phase_duration'),{movePercent:v(e.item,h.range>300?'phase_movement_speed_range':'phase_movement_speed'),phased:true}));
define('armlet radiance rapier','self',(g,h,e)=>{e.meta.mode=e.id==='rapier'?(e.meta.mode==='spell'?'attack':'spell'):(e.meta.mode==='off'?'on':e.meta.mode==='on'?'off':e.id==='armlet'?'on':'off');refresh(g,h);});
define('soul_ring','self',(g,h,e)=>{const amount=v(e.item,'mana_gain');h.hp=Math.max(1,h.hp-(e.item.healthCost||170));h.mana=Math.min(h.maxMana,h.mana+amount);buff(g,h,e.item,v(e.item,'duration'),{temporaryMana:amount,startedMana:h.mana});},(g,h,e)=>h.hp<=(e.item.healthCost||170)?reject('生命不足以使用灵魂之戒'):null);
define('mekansm guardian_greaves arcane_boots','self',(g,h,e)=>{
 const i=e.item,radius=v(i,['replenish_radius','heal_radius'],1200),hp=v(i,['replenish_health','heal_amount']),mana=v(i,['replenish_mana','replenish_amount']);
 if(e.id==='guardian_greaves')dispel(g,h);
 for(const ally of allies(g,h,radius)){if(hp&&!active(g,ally,'mendLock')){heal(g,ally,hp,h);status(g,ally,'mendLock',i,{positive:true,duration:e.id==='mekansm'?50:40,hidden:true});}if(mana)ally.mana=Math.min(ally.maxMana||0,(ally.mana||0)+mana);}
 pulse(g,h,i,radius);
});
define('pipe crimson_guard','self',(g,h,e)=>{
 const i=e.item;for(const ally of allies(g,h,v(i,['barrier_radius','bonus_aoe_radius'],1200))){
  if(e.id==='pipe')barrier(g,ally,i,v(i,'barrier_block'),v(i,'barrier_duration'),'magical');
  else buff(g,ally,i,v(i,'duration'),{damageBlock:v(i,'block_damage_active')+h.maxHp*v(i,'max_hp_pct')/100,blockChance:100});
 }pulse(g,h,i,1200);
});
define('pavise solar_crest','allyHero',(g,h,e,p,target)=>{
 const i=e.item;barrier(g,target,i,v(i,'absorb_amount'),v(i,'duration'),'physical');
 if(e.id==='solar_crest'&&target!==h)buff(g,target,i,v(i,'duration'),{armor:v(i,'target_armor'),movePercent:v(i,'target_movement_speed'),attackSpeed:v(i,'target_attack_speed')});
});
define('ancient_janggo boots_of_bearing','self',(g,h,e)=>{
 const i=e.item;for(const ally of allies(g,h,v(i,'radius'))){buff(g,ally,i,v(i,'duration'),{movePercent:v(i,'bonus_movement_speed_pct'),attackSpeed:v(i,'bonus_attack_speed_pct')});if(e.id==='boots_of_bearing')status(g,ally,'bearingHaste',i,{positive:true,duration:v(i,'bonus_ms_duration'),slowImmune:true});}
 if(e.id==='ancient_janggo')e.meta.charges--;
},(g,h,e)=>e.id==='ancient_janggo'&&!(e.meta.charges>0)?reject('战鼓没有剩余次数'):null);
define('urn_of_shadows spirit_vessel essence_distiller','unitOrPoint',(g,h,e,p,target)=>{
 const i=e.item,duration=v(i,'duration');e.meta.charges--;
 if(!target){g.itemZones||=[];g.itemZones.push({type:'distiller',id:g._id('soul'),sourceId:h.id,team:h.team,x:p.x,y:p.y,radius:v(i,'latch_range'),until:g.time+v(i,'ground_duration'),itemId:i.id});return;}
 if(target.team===h.team)regen(g,target,i,duration,v(i,'soul_heal_amount'),0,h,true);
 else{dot(g,target,i,duration,v(i,'soul_damage_amount'),h,'magical',{healthPercentDps:v(i,'enemy_hp_drain'),healReduction:v(i,'restoration_reduction_enemy')});}
},(g,h,e,p,target)=>!(e.meta.charges>0)?reject('需要收集灵魂能量'):!target&&e.id!=='essence_distiller'?reject('请选择英雄目标'):null);
define('hand_of_midas','enemyCreep',(g,h,e,p,target)=>{
 const experience=target.xpBounty||0,before=h.gold;g._kill(target,null);h.gold=before+v(e.item,'bonus_gold');g._addXp(h,experience*2.1);g._effect('text',target.x,target.y-50,{text:'+'+v(e.item,'bonus_gold'),color:'#e2bf78',life:1});
},(g,h,e,p,target)=>target?.ancient||target?.isRoshan?reject('无法转化远古生物或肉山'):null);
define('sheepstick','enemyUnit',(g,h,e,p,target)=>{dispel(g,target);disable(g,target,e.item,v(e.item,'sheep_duration'),{hex:true,silenced:true,muted:true,disarmed:true,speedOverride:v(e.item,'sheep_movement_speed')},h);});
define('orchid bloodthorn','enemyUnit',(g,h,e,p,target)=>disable(g,target,e.item,v(e.item,'silence_duration'),{silenced:true,accumulatedDamage:0,burstPct:v(e.item,'silence_damage_percent'),trueStrike:e.id==='bloodthorn',attackProcDamage:e.id==='bloodthorn'?v(e.item,'proc_damage_heroes'):0},h));
define('cyclone wind_waker','anyUnit',(g,h,e,p,target)=>{
 const i=e.item;if(target.team===h.team)dispel(g,target);else if(immune(g,target))return;
 status(g,target,'cyclone',i,{positive:target.team===h.team,duration:v(i,'cyclone_duration'),invulnerable:true,stunned:e.id==='cyclone'||target.team!==h.team,disarmed:true,silenced:true,sourceId:h.id,dropDamage:target.team!==h.team?v(i,'tooltip_drop_damage'):0,canMoveInvulnerable:e.id==='wind_waker'&&target.team===h.team,moveOverride:e.id==='wind_waker'&&target.team===h.team?v(i,'tornado_speed'):0});Skills.interruptCast(g,target,false);
},(g,h,e,p,target)=>e.id==='cyclone'&&target?.team===h.team&&target!==h?reject('Eul 只能对自己或敌方使用'):null);
define('force_staff hurricane_pike','anyUnit',(g,h,e,p,target)=>{
 const i=e.item;if(e.id==='hurricane_pike'&&target.team!==h.team){const d=distance(h,target)||1,dx=(target.x-h.x)/d,dy=(target.y-h.y)/d,n=v(i,'enemy_length');forceMove(g,target,{x:target.x+dx*n,y:target.y+dy*n},v(i,'push_time'));forceMove(g,h,{x:h.x-dx*n,y:h.y-dy*n},v(i,'push_time'));buff(g,h,i,v(i,'range_duration'),{pikeTarget:target.id,attacksLeft:v(i,'max_attacks'),attackSpeed:v(i,'bonus_attack_speed')});h.explicitTarget=target.id;}
 else forceMove(g,target,{x:target.x+Math.cos(target.angle)*v(i,'push_length'),y:target.y+Math.sin(target.angle)*v(i,'push_length')},v(i,'push_time'));
});
define('dagon dagon_2 dagon_3 dagon_4 dagon_5','enemyUnit',(g,h,e,p,target)=>{g.damage(target,v(e.item,'damage'),h,'magical');g._effect('beam',h.x,h.y,{tx:target.x,ty:target.y,life:.35,color:'#e6796a'});});
define('refresher','self',(g,h,e)=>{h.cooldowns=h.cooldowns.map(()=>0);for(const id of Object.keys(h.extraCooldowns||{}))h.extraCooldowns[id]=0;for(const other of C.equipped(g,h))if(other.id!=='refresher')other.meta.cooldownRemaining=0;for(const id of Object.keys(h.itemCooldowns||{}))if(id!=='refresher')h.itemCooldowns[id]=0;pulse(g,h,e.item);});
define('black_king_bar','self',(g,h,e)=>{const i=e.item,levels=i.valueLevels?.duration||[v(i,'duration')],duration=levels[Math.min(e.meta.uses||0,levels.length-1)];dispel(g,h);buff(g,h,i,duration,{debuffImmune:true,magicResistancePct:v(i,'spell_reduce'),undispellable:true});});
define('ghost','self',(g,h,e)=>buff(g,h,e.item,v(e.item,'duration',4),{ethereal:true,disarmed:true,magicVulnerability:Math.abs(v(e.item,'extra_spell_damage_percent',-40))}));
define('ethereal_blade','anyUnit',(g,h,e,p,target)=>{
 const i=e.item,enemy=target.team!==h.team;if(enemy&&immune(g,target))return;
 status(g,target,'ethereal',i,{positive:!enemy,duration:v(i,enemy?'duration':'duration_ally'),ethereal:true,disarmed:true,magicVulnerability:Math.abs(v(i,'ethereal_damage_bonus')),slowPct:enemy?Math.abs(v(i,'blast_movement_slow')):0});
 if(enemy)g.damage(target,v(i,'blast_damage_base')+(h.strength+h.agility+h.intelligence)*v(i,'blast_stat_multiplier'),h,'magical');
});
define('shivas_guard veil_of_discord','self',(g,h,e)=>{
 const i=e.item,radius=v(i,['blast_radius','debuff_radius']);for(const target of enemies(g,h,h,radius)){
  if(e.id==='shivas_guard'){g.damage(target,v(i,'blast_damage'),h,'magical');slow(g,target,i,v(i,'blast_debuff_duration'),v(i,'blast_movement_speed'),h);}
  else disable(g,target,i,v(i,'resist_debuff_duration'),{spellVulnerability:v(i,'spell_amp')},h);
 }pulse(g,h,i,radius);
});
define('bloodstone satanic','self',(g,h,e)=>{dispel(g,h);buff(g,h,e.item,v(e.item,['buff_duration','unholy_duration']),e.id==='satanic'?{lifesteal:v(e.item,'unholy_lifesteal_percent')}:{spellLifesteal:v(e.item,'spell_lifesteal_while_active')-(e.item.stats.spellLifesteal||0)});});
define('sphere lotus_orb','allyHero',(g,h,e,p,target)=>{if(e.id==='lotus_orb')dispel(g,target);buff(g,target,e.item,v(e.item,['active_duration','upgrade_absorb_duration'],14),e.id==='sphere'?{spellBlock:true}:{spellReflect:true});});
define('nullifier','enemyUnit',(g,h,e,p,target)=>{for(const [id,s]of Object.entries(target.statuses||{}))if(s.positive&&!s.undispellable)delete target.statuses[id];disable(g,target,e.item,v(e.item,'mute_duration'),{purged:true,slowPct:v(e.item,'slow_pct')},h);});
define('blade_mail','self',(g,h,e)=>buff(g,h,e.item,v(e.item,'duration'),{reflectPct:v(e.item,'active_reflection_pct')}));
define('mask_of_madness','self',(g,h,e)=>buff(g,h,e.item,v(e.item,'berserk_duration'),{silenced:true,attackSpeed:v(e.item,'berserk_bonus_attack_speed'),movePercent:v(e.item,h.range>300?'berserk_bonus_movement_speed':'berserk_bonus_movement_speed_melee'),armor:-v(e.item,'berserk_armor_reduction')}));
define('manta','self',(g,h,e)=>{dispel(g,h);buff(g,h,e.item,v(e.item,'invuln_duration'),{invulnerable:true});h.projectileDisjoint=(h.projectileDisjoint||0)+1;C.illusion(g,h,v(e.item,'images_count'),v(e.item,'illusion_duration'),v(e.item,h.range>300?'tooltip_damage_outgoing_ranged':'tooltip_damage_outgoing_melee'),v(e.item,'tooltip_damage_incoming_total_pct'));});
define('invis_sword silver_edge shadow_amulet glimmer_cape','allyOptional',(g,h,e,p,target)=>{
 const i=e.item,recipient=['invis_sword','silver_edge'].includes(e.id)?h:target,duration=v(i,['windwalk_duration','fade_duration','duration'],5),delay=v(i,['windwalk_fade_time','fade_time','initial_fade_delay']);
 buff(g,recipient,i,duration+delay,{startedAt:g.time+delay,invisible:true,movePercent:v(i,['windwalk_movement_speed','active_movement_speed'])-v(i,'movement_speed_reduction'),attackBonus:v(i,'windwalk_bonus_damage'),breakDuration:e.id==='silver_edge'?v(i,'backstab_duration'):0});
 if(e.id==='glimmer_cape')barrier(g,target,i,v(i,'barrier_block'),duration,'magical');
});
define('mjollnir','allyUnit',(g,h,e,p,target)=>buff(g,target,e.item,v(e.item,'static_duration'),{staticShield:true,sourceId:h.id,nextProc:0}));
define('helm_of_the_dominator helm_of_the_overlord','enemyCreep',(g,h,e,p,target)=>{
 const i=e.item;for(const old of g.entities)if(old.dominatedBy===h.id&&!old.dead)g._kill(old,null);
 Object.assign(target,{team:h.team,kind:'summon',dominatedBy:h.id,ownerId:h.id,campId:null,targetId:null,returning:false,name:target.name+' · 支配',speed:v(i,'speed_base'),maxHp:Math.max(target.maxHp,v(i,'health_min')),damage:target.damage+v(i,'creep_bonus_damage'),armor:target.armor+v(i,'creep_bonus_armor'),hpRegen:v(i,'creep_bonus_hp_regen'),manaRegen:v(i,'creep_bonus_mp_regen')});target.hp=target.maxHp;
},(g,h,e,p,target)=>target?.isRoshan||(target?.ancient&&e.id!=='helm_of_the_overlord')?reject('此物品无法支配该目标'):null);
define('gungir','point',(g,h,e,p)=>{for(const target of enemies(g,h,p,v(e.item,'radius')+(h.spellAoE||0))){if(!immune(g,target)){status(g,target,'itemRoot:'+e.id,e.item,{duration:v(e.item,'duration'),rooted:true,sourceId:h.id});}}pulse(g,p,e.item,v(e.item,'radius'));});
define('rod_of_atos','enemyUnit',(g,h,e,p,target)=>disable(g,target,e.item,v(e.item,'duration'),{rooted:true},h));
define('abyssal_blade','enemyUnit',(g,h,e,p,target)=>stun(g,target,v(e.item,'stun_duration'),h,true));
define('heavens_halberd','enemyUnit',(g,h,e,p,target)=>disable(g,target,e.item,v(e.item,target.range>300?'disarm_range':'disarm_melee'),{disarmed:true,undispellable:true},h));
define('diffusal_blade disperser','anyUnit',(g,h,e,p,target)=>{
 const i=e.item;if(target.team===h.team){if(e.id==='disperser'){dispel(g,target);buff(g,target,i,v(i,'ally_effect_duration'),{movePercent:v(i,'phase_movement_speed'),slowImmune:true,phased:true});}}
 else{disable(g,target,i,v(i,['enemy_effect_duration','purge_slow_duration']),{slowPct:100,decayingSlow:true},h);}
},(g,h,e,p,target)=>e.id==='diffusal_blade'&&target?.team===h.team?reject('净魂之刃只能对敌军使用'):null);
define('harpoon','enemyUnit',(g,h,e,p,target)=>{const d=distance(h,target)||1,dx=(target.x-h.x)/d,dy=(target.y-h.y)/d,n=Math.max(0,(d-v(e.item,'min_distance'))*v(e.item,'pull_distance_pct')/100);forceMove(g,target,{x:target.x-dx*n,y:target.y-dy*n},v(e.item,'pull_duration'));forceMove(g,h,{x:h.x+dx*n,y:h.y+dy*n},v(e.item,'pull_duration'));slow(g,target,e.item,v(e.item,'slow_duration'),v(e.item,'movement_slow'),h);});
define('crellas_crozier','self',(g,h,e)=>{buff(g,h,e.item,v(e.item,'duration'),{crozierActive:true,ethereal:true,disarmed:true,magicResistancePct:Math.abs(v(e.item,'extra_spell_damage_percent'))});g.nextItemAuraAt=0;});
define('meteor_hammer','point',(g,h,e,p)=>{
 h.itemChannel={kind:'meteor',itemId:e.id,uid:e.meta.uid,startedAt:g.time,until:g.time+(e.item.channelTime||v(e.item,'max_duration')),point:{...p},origin:{x:h.x,y:h.y}};
 status(g,h,'itemChannel',e.item,{positive:true,duration:e.item.channelTime||v(e.item,'max_duration'),channeling:true});h.destination=null;h.explicitTarget=null;g.clearMovement(h);
});
define('tpscroll','point',(g,h,e,p,target)=>{
 const boots=C.equipped(g,h).filter(x=>['travel_boots','travel_boots_2'].includes(x.id)).sort((a,b)=>b.id.length-a.id.length)[0];const duration=v(boots?.item,'tp_channel_time',e.item.channelTime||3);
 h.itemChannel={kind:'teleport',itemId:e.id,uid:e.meta.uid,startedAt:g.time,until:g.time+duration,targetId:target.id,point:{x:target.x,y:target.y},origin:{x:h.x,y:h.y}};
 status(g,h,'itemChannel',e.item,{positive:true,duration,channeling:true});h.destination=null;h.explicitTarget=null;g.clearMovement(h);
 h.recallTimer=duration;h.recallDuration=duration;g._effect('recall',h.x,h.y,{radius:65,life:duration,color:'#8adbe9',team:h.team});
 if(!boots)consume(g,h,e);
},(g,h,e,p,target)=>!target?reject('传送需要指向友方建筑或旅行靴允许的友军'):g.isRooted(h)?reject('定身期间无法传送'):null);

export const ACTIVE_ITEM_HANDLERS=Object.freeze(handlers);
export function findItemTarget(g,h,entry,point){
 const handler=handlers[entry.id],type=handler?.target;
 if(!handler)return {ok:false,reason:'这是被动物品，无需施放'};
 const range=(entry.item.range||0)+(h.castRangeBonus||0),p=point||h;let target;
 if(type==='tree')target=C.treeAt(g,p);
 else if(entry.id==='tpscroll'){
  const boots=C.equipped(g,h).find(e=>e.id.startsWith('travel_boots'));
  target=g.entities.filter(e=>alive(e)&&e.team===h.team&&e!==h&&(C.building(e)||(boots&&C.fighter(e)&&(boots.id==='travel_boots_2'||e.kind!=='hero')))&&distance(e,p)<=800).sort((a,b)=>distance(a,p)-distance(b,p))[0];
 }else if(['allyOptional','allyHero','allyUnit','anyUnit','enemyUnit','enemyCreep','unitOrPoint'].includes(type)){
  const team=type.startsWith('ally')?'ally':type.startsWith('enemy')?'enemy':'both';
  target=C.targetAt(g,h,p,team,type==='allyHero'?['hero']:type==='enemyCreep'?['creep','neutral','summon']:undefined,range||Infinity);
  if(!target&&type==='allyOptional')target=h;
 }
 if(['allyHero','allyUnit','anyUnit','enemyUnit','enemyCreep','tree'].includes(type)&&!target)return reject(type==='tree'?'请指向附近的树木':'请指向距离内的有效目标');
 if(type==='point'&&entry.id!=='tpscroll'&&!entry.id.includes('blink')&&range>0&&distance(h,p)>range)return reject('目标超过物品施法距离');
 if(type==='tree'&&distance(h,target)>(range||350))return reject('树木距离过远');
 const invalid=handler.validate?.(g,h,entry,p,target);if(invalid)return invalid;
 return {ok:true,handler,point:p,target};
}

import { ITEM_BY_ID } from './item-data.js';
import * as Inventory from './inventory.js';
import * as Skills from './hero-runtime.js';
import { ACTIVE_ITEM_HANDLERS, findItemTarget } from './item-actives.js';
import * as C from './item-common.js';
const {alive,distance,value:v,equipped,active,hasFlag,status,heal,enemies,slow,dot,stun}=C;
const reject=reason=>({ok:false,reason});
const statuses=(g,h)=>Object.values(h.statuses||{}).filter(s=>s.startedAt<=g.time&&s.until>g.time);
const owner=(g,e)=>e?.ownerId?g.entities.find(h=>h.id===e.ownerId)||e:e;
const passive=(g,h)=>hasFlag(g,h,'muted')?[]:equipped(g,h).filter(e=>e.area==='inventory'&&(e.meta.ownerId===h.id||e.meta.freeRapier));

export function statItems(g,h){
 const entries=Inventory.itemEntries(h,['inventory']).filter(e=>(e.meta.readyAt||0)<=g.time&&(e.meta.ownerId===h.id||e.meta.freeRapier));
 const key=entries.map(e=>e.id).join('|')+`:${!!h.consumedScepter}:${!!h.consumedShard}`;
 if(h.upgradeEquipmentKey!==key){h.hasScepter=!!h.consumedScepter||entries.some(e=>e.id==='ultimate_scepter');h.hasShard=!!h.consumedShard;h.upgradeEquipmentKey=key;}
 const items=entries.map(e=>{
  const item=ITEM_BY_ID[e.id],stats={...item.stats},ranged=h.range>300;
  if(e.id==='power_treads')stats[e.meta.mode||'strength']=v(item,'bonus_stat');
  if(item.movementGroup==='boots')stats.speed=v(item,ranged?'bonus_movement_speed_ranged':'bonus_movement_speed_melee',stats.speed||0);
  if(e.id==='armlet'&&e.meta.mode==='on'){stats.strength=v(item,'unholy_bonus_strength');stats.damage+=v(item,'unholy_bonus_damage');stats.armor=(stats.armor||0)+v(item,'unholy_bonus_armor');}
  if(e.id==='rapier'){if(e.meta.mode==='spell')stats.spellAmp=v(item,'bonus_spell_amp');else stats.damage+=v(item,'bonus_damage');}
  if(e.id==='desolator')stats.damage+=(e.meta.bonusDamage||0);
  if(e.id==='holy_locket')stats.healAmp=v(item,'heal_increase_passive');
  if(e.id==='tranquil_boots'&&(e.meta.brokenUntil||0)>g.time){stats.hpRegen=0;stats.speed=v(item,'broken_movement_speed');}
  if(e.id==='monkey_king_bar'&&!ranged)stats.attackRange=v(item,'melee_attack_range');
  if(['dragon_lance','hurricane_pike','hydras_breath'].includes(e.id))stats.attackRange=ranged?v(item,'base_attack_range'):0;
  return {...item,stats};
 });
 if(h.moonShard)items.push({stats:{attackSpeed:v(ITEM_BY_ID.moon_shard,'consumed_bonus',60)}});
 const agility=statuses(g,h).reduce((n,s)=>n+(s.bonusAgility||0),0);if(agility)items.push({stats:{agility}});
 return items;
}
export function itemState(g,h,index,area='inventory'){
 Inventory.ensureInventory(h);const id=h[area]?.[index],meta=h[area+'Meta']?.[index],item=ITEM_BY_ID[id];
 const group=item?(item.sharedCooldown||item.id):area==='tp'?'teleport':null;
 return {id,meta,item,area,index,active:!!ACTIVE_ITEM_HANDLERS[id],cooldown:Math.max(meta?.cooldownRemaining||0,h.itemCooldowns?.[group]||0),ready:Math.max(0,(meta?.readyAt||0)-g.time)};
}
export function useItem(g,h,index,point,area='inventory',options={}){
 const allowed=g._canAct(h);if(!allowed.ok)return allowed;
 if(!['inventory','tp'].includes(area))return reject('背包、储藏处或信使中的物品不能使用');
 const entry=itemState(g,h,index,area),{item,meta}=entry;
 if(!item)return reject('该物品栏为空');
 if(!entry.active)return reject('这是被动物品，无需施放');
 if(meta.ownerId!==h.id&&item.shareable!=='ITEM_FULLY_SHAREABLE'&&!meta.freeRapier)return reject('不能使用其他英雄的装备');
 if(Skills.isStunned(g,h)||g._tauntSource(h)||hasFlag(g,h,'muted')||h.omnislash)return reject('当前状态无法使用物品');
 if(entry.ready>0)return reject('从背包换入后尚未生效');
 if(entry.cooldown>1e-7)return reject('物品尚未冷却');
 if(item.abilityCharges&&meta.charges<=0)return reject('物品充能不足');
 const multicastMeta={...meta};
 const manaCost=item.mana*(1-(h.manaCostReduction||0)/100);
 if(h.mana<manaCost)return reject('魔法不足');
 if(point&&(!Number.isFinite(point.x)||!Number.isFinite(point.y)))return reject('无效目标位置');
 const selection=findItemTarget(g,h,entry,point);if(!selection.ok)return selection;
 const {handler,target}=selection;
 if(target?.team!==h.team&&target&&C.immune(g,target)&&!['abyssal_blade','nullifier'].includes(item.id))return reject('目标处于减益免疫状态');
 Skills.interruptCast(g,h,true);h.itemChannel=null;delete h.statuses.itemChannel;
 h.mana-=manaCost;meta.used=true;
 const travel=item.id==='tpscroll'&&passive(g,h).find(e=>e.id.startsWith('travel_boots'));
 const cooldown=(travel?v(travel.item,'tp_cooldown'):item.id==='holy_locket'?v(item,'use_cooldown'):item.cooldown)*(1-(h.cooldownReduction||0)/100);
 meta.cooldownRemaining=cooldown;h.itemCooldowns||={};h.itemCooldowns[item.sharedCooldown||item.id]=cooldown;
 if(item.abilityCharges&&item.id!=='holy_locket'){meta.charges--;meta.rechargeRemaining||=item.chargeRestoreTime*(1-(h.cooldownReduction||0)/100);}
 const blocked=target&&target.team!==h.team&&!options.reflected&&blockTargetSpell(g,h,target,{itemId:item.id});
 if(target&&target.team!==h.team&&!options.reflected&&hasFlag(g,target,'spellReflect')&&alive(target)&&alive(h))handler.run(g,target,{...entry,meta:{...meta}},h,h);
 if(!blocked)handler.run(g,h,entry,selection.point,target);
 if(!options.reflected)Skills.ogreMulticastItem(g,h,entry,target,multicastMeta);
 meta.uses=(meta.uses||0)+1;return {ok:true,blocked:!!blocked};
}
export function blockTargetSpell(g,caster,target,spell){
 if(!target||target.team===caster.team)return false;
 const transfer=statuses(g,target).find(s=>s.spellBlock);
 if(transfer){delete target.statuses[transfer.id];g._effect('burst',target.x,target.y,{radius:70,life:.5,color:'#92c8df'});return true;}
 const sphere=passive(g,target).find(e=>e.id==='sphere'&&(e.meta.cooldownRemaining||0)<=0);
 if(sphere){sphere.meta.cooldownRemaining=v(sphere.item,'block_cooldown');g._effect('text',target.x,target.y-40,{text:'法术抵挡',life:.8,color:'#92c8df'});return true;}
 return false;
}
export function onSpellCast(g,h,skill){
 for(const e of g.entities)if(alive(e)&&e.team!==h.team&&e.kind==='hero'&&distance(e,h)<=1200&&g.canSee(e,h))for(const entry of passive(g,e))if(['magic_stick','magic_wand','holy_locket'].includes(entry.id))entry.meta.charges=Math.min(v(entry.item,'max_charges',20),(entry.meta.charges||0)+1);
}
export function onSpellTarget(g,h,target,skill){
 const e=passive(g,h).find(e=>['phylactery','angels_demise'].includes(e.id)&&(e.meta.cooldownRemaining||0)<=0);
 if(e&&alive(target)){e.meta.cooldownRemaining=e.item.cooldown;g.damage(target,v(e.item,'bonus_spell_damage'),h,'magical',{itemProc:true});slow(g,target,e.item,v(e.item,'slow_duration'),v(e.item,'slow'),h);}
}
export function combatStats(g,h,base,target){
 const result={...base,evasion:Math.max(base.evasion||0,h.evasion||0)};
 for(const s of statuses(g,h)){
  if(s.magicResistancePct)result.magicResistance=1-(1-result.magicResistance)*(1-s.magicResistancePct/100);
  if(s.magicResistanceReduction)result.magicResistance-=s.magicResistanceReduction/100;
  if(s.speedOverride)result.speed=s.speedOverride;
  if(s.moveOverride)result.speed=s.moveOverride;
  if(s.pikeTarget===target?.id&&s.attacksLeft>0)result.range=25000;
 }
 const a=h.itemAura||{};result.armor+=a.armor||0;result.speed=Math.min(550,result.speed+(a.speed||0));result.attackSpeed=Math.max(20,Math.min(700,result.attackSpeed+(a.attackSpeed||0)));
 result.damage*=1+(a.damagePct||0)/100;
 if(a.magicResistance)result.magicResistance=1-(1-result.magicResistance)*(1-a.magicResistance/100);
 const butterfly=passive(g,h).find(e=>e.id==='butterfly');if(butterfly)result.attackSpeed=Math.min(700,result.attackSpeed*(1+v(butterfly.item,'bonus_attack_speed_pct')/100));
 if(h.baseAttackTime)result.attackInterval=h.baseAttackTime*100/result.attackSpeed;
 result.range??=h.range;return result;
}
export function attackModifiers(g,h,target,result){
 const entries=passive(g,h),base=g.combatStats(h,target);result.interval=base.attackInterval;result.damage*=base.damage/(Skills.combatStats(g,h,target).damage||1);
 let critical=1;for(const e of entries){const i=e.item;
  if(v(i,'crit_chance')&&g._random()*100<v(i,'crit_chance'))critical=Math.max(critical,v(i,'crit_multiplier')/100);
  if(v(i,'quelling_bonus')&&target.kind!=='hero'&&C.fighter(target))result.damage+=v(i,h.range>300?'quelling_bonus_ranged':'quelling_bonus');
 }
 if(critical>1&&!result.critical){result.damage*=critical;result.itemCritical=true;}
 for(const s of statuses(g,h))if(s.invisible){result.damage+=s.attackBonus||0;if(s.breakDuration)status(g,target,'itemBreak',ITEM_BY_ID.silver_edge,{duration:s.breakDuration,break:true});delete h.statuses[s.id];}
 if(h.kind==='illusion')result.damage*=h.illusionOutgoing||0;
 return result;
}
export function trueStrike(g,h,target){h.itemAttackProcs=new Set();for(const e of passive(g,h))if((v(e.item,'bonus_chance')&&g._random()*100<v(e.item,'bonus_chance'))||(['witch_blade','devastator'].includes(e.id)&&(e.meta.procReadyAt||0)<=g.time))h.itemAttackProcs.add(e.meta.uid);return statuses(g,target).some(s=>s.trueStrike)||h.itemAttackProcs.size>0;}
export function afterAttack(g,h,target,result,dealt){
 if(!C.fighter(target))return;
 const entries=passive(g,h);let lifesteal=(h.lifesteal||0)+(h.itemAura?.lifesteal||0);
 for(const s of statuses(g,h)){lifesteal+=s.lifesteal||0;if(s.pikeTarget===target.id&&s.attacksLeft>0)s.attacksLeft--;}
 if(dealt>0&&h.kind!=='illusion')heal(g,h,dealt*lifesteal/100*(target.kind==='hero'?1:.6),h);
 let bashed=false,chained=false;for(const entry of entries){const i=entry.item;
  if(!alive(target))break;
  if(!bashed&&v(i,'bash_chance_melee')&&(entry.meta.bashReadyAt||0)<=g.time&&g._random()*100<v(i,h.range>300?'bash_chance_ranged':'bash_chance_melee')){bashed=true;entry.meta.bashReadyAt=g.time+v(i,'bash_cooldown');stun(g,target,v(i,'bash_duration'),h,true);g.damage(target,v(i,'bonus_chance_damage'),h,'physical',{itemProc:true});}
  if(v(i,'bonus_chance')&&h.itemAttackProcs?.has(entry.meta.uid))g.damage(target,v(i,'bonus_chance_damage'),h,'magical',{itemProc:true});
  if(entry.id==='revenants_brooch'&&g._random()*100<v(i,'crit_chance'))g.damage(target,result.damage*v(i,'crit_multiplier')/100,h,'magical',{itemProc:true});
  if(['witch_blade','devastator'].includes(entry.id)&&(entry.meta.procReadyAt||0)<=g.time){entry.meta.procReadyAt=g.time+v(i,'passive_cooldown',i.cooldown);dot(g,target,i,v(i,'slow_duration'),h.intelligence*v(i,'int_damage_multiplier'),h);slow(g,target,i,v(i,'slow_duration'),v(i,'slow'),h);}
  if(entry.id==='devastator')status(g,target,'devastatorCorrosion',i,{duration:v(i,'slow_duration'),magicResistanceReduction:v(i,'active_mres_reduction')});
  if(['orb_of_frost','orb_of_corrosion'].includes(entry.id))slow(g,target,i,v(i,'duration'),Math.abs(v(i,h.range>300?'slow_ranged':'slow_melee')),h,{healReduction:v(i,'heal_reduction')});
  if(entry.id==='hydras_breath')dot(g,target,i,v(i,'poison_duration'),target.maxHp*v(i,'poison_damage_per_second')/100,h);
  if(['specialists_array','hydras_breath'].includes(entry.id)&&h.range>300&&g._random()*100<v(i,'proc_chance')){
   g.damage(target,v(i,'base_proc_dmg'),h,'physical',{attack:true,itemProc:true});
   const candidates=enemies(g,h,h,h.range+v(i,'secondary_target_range_bonus')).filter(e=>e!==target&&Math.cos(h.angle)*(e.x-h.x)+Math.sin(h.angle)*(e.y-h.y)>=distance(h,e)*Math.cos(v(i,'secondary_target_angle')/2*Math.PI/180));
   for(const enemy of candidates.slice(0,v(i,'count'))){g.damage(enemy,v(i,'base_proc_dmg')+result.damage*v(i,'proc_dmg_pct')/100,h,'physical',{attack:true,itemProc:true});if(entry.id==='hydras_breath')dot(g,enemy,i,v(i,'poison_duration'),enemy.maxHp*v(i,'poison_damage_per_second')/100,h);g._effect('projectile',h.x,h.y,{tx:enemy.x,ty:enemy.y,life:.25,radius:5,color:'#8dcba7'});}
  }
  if(['echo_sabre','harpoon'].includes(entry.id)&&h.range<=300&&(entry.meta.echoReadyAt||0)<=g.time){entry.meta.echoReadyAt=g.time+v(i,'echo_sabre_cooldown',entry.id==='echo_sabre'?i.cooldown:5);h.attackCooldown=Math.min(h.attackCooldown,.2);slow(g,target,i,v(i,'slow_duration'),v(i,'movement_slow'),h);}
  if(entry.id==='tranquil_boots'&&target.kind==='hero'){entry.meta.brokenUntil=g.time+v(i,'break_time');C.refresh(g,h);}
  if(!chained&&v(i,'chain_chance')&&(entry.meta.chainReadyAt||0)<=g.time&&g._random()*100<v(i,'chain_chance')){
   chained=true;entry.meta.chainReadyAt=g.time+v(i,'chain_cooldown');const hit=new Set();let next=target;
   for(let n=0;n<v(i,'chain_strikes')&&next;n++){hit.add(next.id);g.damage(next,v(i,'chain_damage'),h,'magical',{itemProc:true});g._effect('beam',h.x,h.y,{tx:next.x,ty:next.y,life:.25,color:'#a2cfe8'});const at=next;next=enemies(g,h,at,v(i,'chain_radius')).find(e=>!hit.has(e.id));}
  }
  if(v(i,'feedback_mana_burn')){const burn=Math.min(target.mana||0,v(i,'feedback_mana_burn'));target.mana-=burn;g.damage(target,burn*v(i,'damage_per_burn',1),h,'physical',{itemProc:true});}
  if(v(i,'corruption_armor'))status(g,target,'corruption',i,{duration:v(i,'corruption_duration'),armor:v(i,'corruption_armor'),sourceId:h.id});
  if(entry.id==='mage_slayer'){dot(g,target,i,v(i,'duration'),v(i,'dps'),h);status(g,target,'mageSlayer',i,{duration:v(i,'duration'),outgoingSpellReduction:v(i,'spell_amp_debuff')});}
  if(entry.id==='skadi')slow(g,target,i,v(i,'cold_duration'),Math.abs(v(i,target.range>300?'cold_slow_ranged':'cold_slow_melee')),h,{attackSlow:Math.abs(v(i,target.range>300?'cold_attack_slow_ranged':'cold_attack_slow_melee')),healReduction:v(i,'restoration_reduction')});
  if(entry.id==='orb_of_venom'&&(entry.meta.procReadyAt||0)<=g.time){entry.meta.procReadyAt=g.time+i.cooldown;dot(g,target,i,v(i,'poison_duration'),v(i,'damage'),h);}
  if(v(i,'cleave_damage_percent')&&h.range<=300){const dir={x:Math.cos(h.angle),y:Math.sin(h.angle)},length=v(i,'cleave_distance');for(const enemy of enemies(g,h,h,length))if(enemy!==target){const x=enemy.x-h.x,y=enemy.y-h.y,along=x*dir.x+y*dir.y,width=v(i,'cleave_starting_width')+(v(i,'cleave_ending_width')-v(i,'cleave_starting_width'))*along/length;if(along>0&&along<length&&Math.abs(x*dir.y-y*dir.x)<width)g.damage(enemy,result.damage*v(i,enemy.kind==='hero'?'cleave_damage_percent':'cleave_damage_percent_creep')/100,h,'physical',{itemProc:true});}}
 }
 for(const s of statuses(g,target))if(s.attackProcDamage)g.damage(target,s.attackProcDamage,h,'magical',{itemProc:true});
}
export function outgoingDamage(g,source,amount,type,options){
 if(source&&hasFlag(g,source,'damageImmunity'))return 0;
 if(!source||options.reflected)return amount;
 if(!options.attack&&!options.itemProc){amount*=1+(source.spellAmp||0)/100;for(const s of statuses(g,source))amount*=1-(s.outgoingSpellReduction||0)/100;}
 return amount;
}
export function incomingDamage(g,target,amount,source,type,options){
 if(C.invulnerable(g,target)||(type==='physical'&&hasFlag(g,target,'ethereal')))return 0;
 if(hasFlag(g,target,'damageImmunity')||(options.reflected&&C.immune(g,target)))return 0;
 const entries=passive(g,target),heroDamage=owner(g,source)?.kind==='hero'||source?.isRoshan;
 const disk=entries.find(e=>e.id==='aeon_disk'&&(e.meta.cooldownRemaining||0)<=0);
 if(disk&&target.hp-amount<=target.maxHp*v(disk.item,'health_threshold_pct')/100){
  Skills.applyDispel(g,target,true);status(g,target,'aeonDisk',disk.item,{positive:true,duration:v(disk.item,'buff_duration'),damageImmunity:true,statusResistance:v(disk.item,'status_resistance'),undispellable:true});
  const levels=disk.item.valueLevels.cooldown_duration||[v(disk.item,'cooldown_duration')];disk.meta.cooldownRemaining=levels[Math.min(disk.meta.uses||0,levels.length-1)];disk.meta.uses=(disk.meta.uses||0)+1;return Math.max(0,target.hp-target.maxHp*v(disk.item,'health_threshold_pct')/100);
 }
 for(const e of entries){
  if(e.id==='consecrated_wraps'&&heroDamage){const m=e.meta;m.rechargeRemaining=e.item.chargeRestoreTime;
   if(m.charges>0){const n=m.charges;m.charges=0;status(g,target,'itemBarrier:consecrated_wraps',e.item,{positive:true,duration:v(e.item,'duration'),barrier:n*v(e.item,'barrier_per_stack'),barrierType:'all'});}
  }
  if(e.id==='infused_raindrop'&&type==='magical'&&amount>=v(e.item,'min_damage')&&(e.meta.cooldownRemaining||0)<=0&&e.meta.charges>0){e.meta.cooldownRemaining=e.item.cooldown;amount=Math.max(0,amount-v(e.item,'magic_damage_block'));Inventory.consumeItemCharge(g,target,e.area,e.index);}
 }
 if(target.kind==='illusion')amount*=target.illusionIncoming||1;
 amount*=1+(!options.attack?(target.itemAura?.spellVulnerability||0)/100:0);
 for(const s of statuses(g,target)){
  if(type==='magical')amount*=1+(s.magicVulnerability||0)/100;
  if(!options.attack)amount*=1+(s.spellVulnerability||0)/100;
  if(!options.attack)amount*=1-(s.spellDamageReduction||0)/100;
  if(type==='physical'&&options.attack&&s.damageBlock&&g._random()*100<(s.blockChance||100))amount=Math.max(0,amount-s.damageBlock);
  if(s.barrier&&s.itemId&&(s.barrierType==='all'||s.barrierType===type)){const n=Math.min(amount,s.barrier);s.barrier-=n;s.stacks=Math.ceil(s.barrier);amount-=n;}
 }
 for(const e of passive(g,target))if(type==='physical'&&options.attack&&v(e.item,'block_chance')&&g._random()*100<v(e.item,'block_chance')){amount=Math.max(0,amount-v(e.item,target.range>300?'block_damage_ranged':'block_damage_melee',v(e.item,'block_damage')));break;}
 return Math.max(0,amount);
}
export function afterDamage(g,target,dealt,source,type,options){
 if(dealt<=0)return;
 const attacker=owner(g,source),heroDamage=attacker?.kind==='hero'||source?.isRoshan;
 if(heroDamage)target.lastHeroDamageAt=g.time;
 if(options.attack)for(const e of passive(g,target))if(e.id==='tranquil_boots'){e.meta.brokenUntil=g.time+v(e.item,'break_time');C.refresh(g,target);}
 for(const s of statuses(g,target)){
  if(s.breakOnDamage&&heroDamage)delete target.statuses[s.id];
  if(s.burstPct&&!options.burst)s.accumulatedDamage+=dealt;
  if(s.reflectPct&&source&&alive(source)&&!options.reflected)g.damage(source,dealt*s.reflectPct/100,target,type,{reflected:true});
  if(s.staticShield&&source&&(s.nextProc||0)<=g.time){const i=ITEM_BY_ID.mjollnir;if(g._random()*100<v(i,'static_chance')){s.nextProc=g.time+v(i,'static_cooldown');for(const enemy of enemies(g,target,target,v(i,'static_radius')).slice(0,v(i,'static_strikes')))g.damage(enemy,v(i,'static_damage'),target,'magical',{itemProc:true,reflected:true});}}
 }
 if(source&&!options.reflected&&options.attack){const blade=passive(g,target).find(e=>e.id==='blade_mail');if(blade)g.damage(source,v(blade.item,'passive_reflection_constant')+dealt*v(blade.item,'passive_reflection_pct')/100,target,type,{reflected:true});}
 if(source&&alive(source)&&!options.attack&&!options.reflected&&!options.itemProc){const amount=(source.spellLifesteal||0)+statuses(g,source).reduce((n,s)=>n+(s.spellLifesteal||0),0);heal(g,source,dealt*amount/100*(target.kind==='hero'?1:.2),source);}
}
export function expiredStatus(g,h,s){
 const source=g.entities.find(e=>e.id===s.sourceId);
 if(s.burstPct&&source&&alive(h))g.damage(h,(s.accumulatedDamage||0)*s.burstPct/100,source,'magical',{burst:true});
 if(s.dropDamage&&source&&alive(h))g.damage(h,s.dropDamage,source,'magical');
 if(s.temporaryMana)h.mana=Math.max(0,h.mana-s.temporaryMana);
 if(s.bonusAgility)C.refresh(g,h);
}
export function tickUnit(g,h,dt){
 if(h.kind==='hero'||h.kind==='courier'){
  for(const e of Inventory.itemEntries(h)){
   const i=ITEM_BY_ID[e.id],m=e.meta;m.cooldownRemaining=Math.max(0,(m.cooldownRemaining||0)-dt*(e.area==='backpack'?.5:1));
   if(i.abilityCharges&&m.charges<i.abilityCharges){m.rechargeRemaining=(m.rechargeRemaining||i.chargeRestoreTime)-dt;if(m.rechargeRemaining<=0){m.charges++;m.rechargeRemaining=m.charges<i.abilityCharges?i.chargeRestoreTime:0;if(e.id==='consecrated_wraps'&&e.area==='inventory'&&alive(h))status(g,h,'wrapsHaste',i,{positive:true,duration:v(i,'duration'),movePercent:v(i,'movement_speed_pct_on_stack_gain')});}}
   if(m.brokenUntil&&g.time>=m.brokenUntil){m.brokenUntil=0;C.refresh(g,h);}
   if(e.id==='bottle'&&alive(h)&&C.baseNearby(h))m.charges=v(i,'max_charges',3);
  }
  for(const key of Object.keys(h.itemCooldowns||{}))h.itemCooldowns[key]=Math.max(0,h.itemCooldowns[key]-dt);
 }
 if(!alive(h))return;
 for(const s of Object.values(h.statuses||{})){
  const duration=Math.max(0,Math.min(g.time,s.until)-Math.max(g.time-dt,s.startedAt));
  if(s.hpPerSec)heal(g,h,s.hpPerSec*duration,g.entities.find(e=>e.id===s.sourceId),true);
  if(s.manaPerSec)h.mana=Math.min(h.maxMana,h.mana+s.manaPerSec*duration);
  if(s.healthPercentDps&&duration)g.damage(h,h.maxHp*s.healthPercentDps/100*duration,g.entities.find(e=>e.id===s.sourceId),'magical');
  if(s.smoked&&g.entities.some(e=>alive(e)&&e.team!==h.team&&(e.kind==='hero'||e.kind==='tower')&&distance(e,h)<=s.breakRadius))delete h.statuses[s.id];
  if(s.purged)for(const [id,b]of Object.entries(h.statuses))if(b.positive&&!b.undispellable)delete h.statuses[id];
 }
 for(const e of passive(g,h)){
  if(e.id==='heart')heal(g,h,(h.maxHp*v(e.item,'hp_regen')+(h.maxHp-h.hp)*v(e.item,'missing_health_regen'))/100*dt,h,true);
  if(e.id==='armlet'&&e.meta.mode==='on')h.hp=Math.max(1,h.hp-v(e.item,'unholy_health_drain_per_second')*dt);
 }
 const aura=h.itemAura||{};if(aura.hpRegen)heal(g,h,aura.hpRegen*dt,h,true);if(aura.manaRegen)h.mana=Math.min(h.maxMana,h.mana+aura.manaRegen*dt);
 if(h.forcedMotion){const m=h.forcedMotion,t=Math.min(1,(g.time-m.startedAt)/(m.until-m.startedAt));Object.assign(h,{x:m.from.x+(m.to.x-m.from.x)*t,y:m.from.y+(m.to.y-m.from.y)*t});h.moving=true;if(t>=1)h.forcedMotion=null;}
 if(h.itemChannel){
  const channel=h.itemChannel,target=g.entities.find(e=>e.id===channel.targetId),i=ITEM_BY_ID[channel.itemId];
  if(channel.kind==='teleport')h.recallTimer=Math.max(0,channel.until-g.time);
  if(Skills.isStunned(g,h)||(channel.kind==='teleport'&&Skills.isRooted(g,h))||hasFlag(g,h,'muted')||distance(h,channel.origin)>5||(channel.kind==='teleport'&&!alive(target))){h.itemChannel=null;h.recallTimer=0;delete h.statuses.itemChannel;}
  else if(g.time>=channel.until){h.itemChannel=null;delete h.statuses.itemChannel;
   if(channel.kind==='teleport')C.teleport(g,h,target.kind==='fountain'?target:{x:target.x+100,y:target.y+100});
   else if(channel.kind==='meteor')for(const enemy of enemies(g,h,channel.point,v(i,'impact_radius',400),true)){g.damage(enemy,v(i,C.building(enemy)?'impact_damage_buildings':'impact_damage_units'),h,'magical');stun(g,enemy,v(i,'stun_duration'),h);dot(g,enemy,i,v(i,'burn_duration'),v(i,C.building(enemy)?'burn_dps_buildings':'burn_dps_units'),h);}
  }
 }
 if(['illusion','summon'].includes(h.kind)){
  if(h.expiresAt&&g.time>=h.expiresAt){g._kill(h,null);return;}
  if(Skills.isStunned(g,h)||h.forcedMotion)return;
  const master=g.entities.find(e=>e.id===h.ownerId),target=g.entities.find(e=>e.id===(master?.explicitTarget||h.controlTarget)&&alive(e))||g._chooseTarget(h,700);
  if(target){if(!g._attack(h,target))g._move(h,target,dt,h.range+target.radius-3);}else if(master&&distance(h,master)>180)g._move(h,master,dt,130);
 }
}
export function tickWorld(g,dt){
 let treesChanged=false;
 for(const [id,until]of g.cutTrees||[])if(until<=g.time){g.cutTrees.delete(id);treesChanged=true;}
 if(g.plantedTrees?.some(t=>t.until<=g.time)){g.plantedTrees=g.plantedTrees.filter(t=>t.until>g.time);treesChanged=true;}
 if(treesChanged)C.rebuildTrees(g);
 if(g.time>=(g.nextItemAuraAt||0)){
  g.nextItemAuraAt=g.time+.25;for(const unit of g.entities)unit.itemAura={};const sources=g.entities.filter(e=>alive(e)&&e.kind==='hero');
  for(const h of sources)for(const e of passive(g,h)){const i=e.item,radius=i.id==='crellas_crozier'?v(i,'radius'):v(i,['aura_radius','bonus_aoe_radius'],v(i,'aura_movement_speed')?v(i,'radius'):0);if(!radius)continue;
   for(const target of g.entities)if(alive(target)&&distance(h,target)<=radius){const a=target.itemAura;
    if(target.team===h.team){a.armor=Math.max(a.armor||0,v(i,['armor_aura','aura_positive_armor','bonus_aoe_armor']));a.attackSpeed=Math.max(a.attackSpeed||0,v(i,'aura_attack_speed'));a.damagePct=Math.max(a.damagePct||0,v(i,'damage_aura'));a.lifesteal=Math.max(a.lifesteal||0,v(i,'lifesteal_aura'));a.hpRegen=Math.max(a.hpRegen||0,v(i,'aura_health_regen'));if(i.id==='guardian_greaves'&&target===h&&h.hp/h.maxHp<v(i,'aura_bonus_threshold')/100)a.hpRegen=Math.max(a.hpRegen,v(i,'aura_health_regen_bonus'));a.manaRegen=Math.max(a.manaRegen||0,v(i,['mana_regen_aura','aura_mana_regen']));a.magicResistance=Math.max(a.magicResistance||0,v(i,['aura_magic_resistance','magic_resistance_aura']));a.speed=Math.max(a.speed||0,v(i,'aura_movement_speed'));}
    else if(C.fighter(target)||C.building(target)){if(v(i,'aura_negative_armor'))a.armor=Math.min(a.armor||0,v(i,'aura_negative_armor'));if(i.id==='shivas_guard')a.attackSpeed=Math.min(a.attackSpeed||0,v(i,'aura_attack_speed'));
     a.spellVulnerability=Math.max(a.spellVulnerability||0,v(i,'aura_spell_vulnerability'));
     if(i.id==='crellas_crozier'&&target.kind==='hero'){const enabled=hasFlag(g,h,'crozierActive'),percent=v(i,enabled?'active_health_steal':'health_steal');if(percent>(a.regenTheft?.percent||0))a.regenTheft={sourceId:h.id,percent,active:enabled};}
    }
   }
  }
 }
 for(const h of g.entities)if(alive(h)&&hasFlag(g,h,'crozierActive')&&g.time>=(h.nextCrozierSteal||0)){
  const i=ITEM_BY_ID.crellas_crozier;h.nextCrozierSteal=g.time+v(i,'interval');const targets=enemies(g,h,h,v(i,'active_radius')).filter(e=>e.kind==='hero');
  for(const target of targets)status(g,target,`crozierSlow:${h.id}:${g.time}`,i,{duration:v(i,'stack_duration'),movePercent:-v(i,'movespeed_steal_pct'),sourceId:h.id});
  if(targets.length)status(g,h,`crozierSpeed:${g.time}`,i,{positive:true,duration:v(i,'stack_duration'),movePercent:v(i,'movespeed_steal_pct')*targets.length});
 }
 for(const h of g.entities)if(alive(h)&&h.kind==='hero')for(const e of passive(g,h))if(e.id==='radiance'&&e.meta.mode!=='off')for(const target of enemies(g,h,h,v(e.item,'aura_radius')))g.damage(target,v(e.item,'aura_damage')*dt,h,'magical',{itemProc:true});
 for(const zone of g.itemZones||[]){const h=g.entities.find(e=>e.id===zone.sourceId),i=ITEM_BY_ID[zone.itemId];if(!h||zone.until<=g.time)continue;
  if(zone.type==='reveal')for(const target of enemies(g,h,zone,zone.radius))status(g,target,'revealed',i,{duration:1,revealed:true});
  if(zone.type==='distiller'){const target=enemies(g,h,zone,zone.radius).find(e=>e.kind==='hero');if(target){dot(g,target,i,v(i,'duration'),v(i,'soul_damage_amount'),h);zone.until=g.time;}}
 }
 g.itemZones=(g.itemZones||[]).filter(z=>z.until>g.time);
}
export function regenerate(g,h,amount){return heal(g,h,amount,h,true);}
export function onDeath(g,h,killer){
 if(h.kind==='hero'){
  h.itemChannel=null;h.forcedMotion=null;
  for(const e of Inventory.itemEntries(h,['inventory','backpack']))if(ITEM_BY_ID[e.id].killDrop)Inventory.dropItem(g,h,e.area,e.index,h,true);
  for(const ally of g.entities)if(alive(ally)&&ally.kind==='hero'&&ally.team!==h.team&&distance(ally,h)<=1400){
   const urn=passive(g,ally).find(e=>['urn_of_shadows','spirit_vessel','essence_distiller'].includes(e.id));if(urn)urn.meta.charges+=(urn.meta.charges?1:2);
   for(const e of passive(g,ally))if(e.id==='desolator'){e.meta.bonusDamage=Math.min(v(e.item,'max_damage'),(e.meta.bonusDamage||0)+v(e.item,ally===killer?'bonus_damage_per_kill':'bonus_damage_per_assist'));C.refresh(g,ally);}
  }
 }
}

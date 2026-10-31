import { abilityAt, innateAt, talentStats, extraAbilityAt } from './ability-data.js';
import { EXTRA_ABILITIES } from './upgrade-data.js';
import { TREES } from './map-data.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=e=>e&&!e.dead&&e.hp>0;
const fighter=e=>['hero','creep','neutral','illusion','summon'].includes(e?.kind);
const structure=e=>['tower','barracks','ancient','filler','fountain'].includes(e?.kind);
const active=(g,e,id)=>{const s=e?.statuses?.[id];return s&&s.startedAt<=g.time+1e-7&&s.until>g.time+1e-7?s:null;};
export function skillOf(h,i){
 const key=`${h.heroId}:${h.abilityLevels?.join(',')}:${h.talents?.join(',')}:${!!h.hasScepter}:${!!h.hasShard}`;
 if(h.skillCacheKey!==key){h.skillCacheKey=key;h.skillCache=[];}
 return h.skillCache[i]??=(abilityAt(h.heroId,i,h.abilityLevels?.[i]||0,h.talents||[],h));
}
function innate(h){const key=`${h.heroId}:${h.level}:${h.talents?.join(',')}:${!!h.hasScepter}:${!!h.hasShard}`;if(h.innateCacheKey!==key){h.innateCacheKey=key;h.innateCache=innateAt(h.heroId,h.level,h.talents||[],h);}return h.innateCache;}
export function extraSkillOf(h,id){
 const extra=extraAbilityAt(h.heroId,id,h.talents||[],h);if(!extra)return null;
 if(id==='juggernaut_swift_slash'){const omni=skillOf(h,3);extra.values={...omni.values,...extra.values};extra.level=omni.level?1:0;}
 return extra;
}
export function extraAbilities(h){return (EXTRA_ABILITIES[h.heroId]||[]).map(s=>extraSkillOf(h,s.id)).filter(Boolean);}
export const castingStats=(h,s)=>s&&({...s,range:s.range+(h.castRangeBonus||0),mana:s.mana*(1-(h.manaCostReduction||0)/100),castPoint:s.castPoint*(1-(h.castSpeed||0)/100)});
const targets=(g,h,center,radius)=>g.entities.filter(e=>alive(e)&&fighter(e)&&e.team!==h.team&&distance(e,center)<=radius+e.radius);
const areaBonus=h=>(talentStats(h.heroId,h.talents||[]).spellAoE||0)+(h.spellAoE||0);
export function hasStatusFlag(g,e,flag){
 const aliases={stunned:'stun',rooted:'root',silenced:'silence',disarmed:'disarm',muted:'mute',break:'break',hex:'hex',invulnerable:'invulnerable',debuffImmune:'spin'};
 return Object.values(e?.statuses||{}).some(s=>s.startedAt<=g.time+1e-7&&s.until>g.time+1e-7&&(s[flag]||s.id===aliases[flag]||(flag==='disarmed'&&s.disarm)||(['silenced','muted','disarmed'].includes(flag)&&(s.hex||s.id==='hex'))));
}
export const isStunned=(g,e)=>hasStatusFlag(g,e,'stunned')||(e.buffs?.stunUntil||0)>g.time;
export const isRooted=(g,e)=>hasStatusFlag(g,e,'rooted')||(e.buffs?.rootUntil||0)>g.time;
export const isInvulnerable=(g,e)=>hasStatusFlag(g,e,'invulnerable');
export const debuffImmune=(g,e)=>hasStatusFlag(g,e,'debuffImmune');
export const statusResistance=(g,e)=>1-(1-(e.statusResistance||0)/100)*Object.values(e.statuses||{}).filter(s=>s.until>g.time).reduce((n,s)=>n*(1-(s.statusResistance||0)/100),1);

export function addStatus(g,e,id,fields){
 e.statuses||={};const old=e.statuses[id],duration=fields.duration??0,startedAt=fields.startedAt??g.time;
 const until=fields.until??startedAt+duration;
 if(old&&old.until>until&&fields.keepLonger!==false)return old;
 const status={id,name:id,description:'',positive:false,icon:'aura',...fields,startedAt,until,duration:until-startedAt};
 e.statuses[id]=status;return status;
}
function removeStatus(e,id){
 if(e.statuses)delete e.statuses[id];
 if(e.buffs){delete e.buffs[id+'Until'];if(id==='taunt')delete e.buffs.tauntSourceId;}
 if(id==='focus')e.focusTargetId=null;
}
export function applyStun(g,e,duration,source,pierces=false){
 if(!alive(e)||isInvulnerable(g,e)||(!pierces&&debuffImmune(g,e)))return;
 e.buffs||={};
  duration=Math.max(duration*(1-statusResistance(g,e)),(e.buffs.stunUntil||0)-g.time);
 addStatus(g,e,'stun',{name:'眩晕',description:'无法移动、攻击或施法。',duration,icon:'snow',sourceId:source?.id});
 e.buffs.stunUntil=Math.max(e.buffs.stunUntil||0,g.time+duration);e.recallTimer=0;interruptCast(g,e,false);
}
const stun=applyStun;
export function applyRoot(g,e,duration,source,pierces=false,fields={}){
 if(!alive(e)||isInvulnerable(g,e)||(!pierces&&debuffImmune(g,e)))return;
 const status=addStatus(g,e,'root',{name:'缠绕',description:'无法移动。',duration:duration*(1-statusResistance(g,e)),sourceId:source?.id,icon:'crystal',rooted:true,...fields});e.recallTimer=0;return status;
}
function slow(g,e,duration,amount,source,attackSlow=0,id='slow',start=g.time){
 if(debuffImmune(g,e)||isInvulnerable(g,e))return;
 addStatus(g,e,id,{name:id==='nova'?'冰霜新星':id==='powershot'?'强力击减速':'减速',description:`移动速度降低 ${Math.abs(amount)}%${attackSlow?`，攻击速度降低 ${Math.abs(attackSlow)}`:''}。`,duration,startedAt:start,slowPct:Math.abs(amount),attackSlow:Math.abs(attackSlow),sourceId:source?.id,icon:'snow'});
}
function dot(g,e,id,h,duration,damage,interval,damageType,name){
 if(debuffImmune(g,e)||isInvulnerable(g,e))return;
 return addStatus(g,e,id,{name,description:`持续受到${damageType==='pure'?'纯粹':'魔法'}伤害。`,duration,sourceId:h.id,tickDamage:damage,tickInterval:interval,nextTick:g.time,damageType,icon:id==='hunger'?'hunger':'torrent'});
}
function dispel(e,strong=false){
 for(const [id,s]of Object.entries(e.statuses||{}))if(!s.positive&&(strong||!(['stun','taunt'].includes(id)||s.stunned))&&!s.undispellable)removeStatus(e,id);
 if(strong&&e.buffs){delete e.buffs.stunUntil;delete e.buffs.tauntUntil;delete e.buffs.tauntSourceId;delete e.buffs.rootUntil;}
}
export function applyDispel(g,e,strong=false){dispel(e,strong);}

export function combatStats(g,h,target=null){
 let armor=h.armor||0,speed=h.speed||0,attackSpeed=h.attackSpeed||h.baseAttackSpeed||100,damage=h.damage||0,magicResistance=h.magicResistance||0,evasion=0;
 let slowPct=0,movePercent=0,flatSpeed=0;
 for(const s of Object.values(h.statuses||{}))if(s.startedAt<=g.time&&s.until>g.time){
  armor+=s.armor||0;attackSpeed-=s.attackSlow||0;attackSpeed+=s.attackSpeed||0;flatSpeed+=s.flatSpeed||0;movePercent+=s.movePercent||0;evasion=Math.max(evasion,s.evasion||0);
  if(s.slowPct){
   let applies=true;if(s.hunger||s.id==='hunger'){const source=g.entities.find(e=>e.id===s.sourceId);if(source)applies=Math.cos(h.angle||0)*(source.x-h.x)+Math.sin(h.angle||0)*(source.y-h.y)<0;}
   if(applies&&!debuffImmune(g,h))slowPct=Math.max(slowPct,s.slowPct);
  }
 }
 if(h.heroId==='juggernaut'){
  const form=innate(h),stacks=h.bladeformStacks||0;movePercent+=form.values.movement_speed_pct_per_stack*stacks;
 }
 if(h.heroId==='axe'){
  const cull=skillOf(h,3);armor+=(h.cullingStacks||0)*(cull.values.armor_per_stack||0);
  const hunger=skillOf(h,1);if(hunger.values.speed_bonus)movePercent+=hunger.values.speed_bonus*g.entities.filter(e=>alive(e)&&Object.values(e.statuses||{}).some(s=>s.hunger&&s.sourceId===h.id&&s.until>g.time)).length;
 }
 if(active(g,h,'spin'))magicResistance=1-(1-magicResistance)*(1-skillOf(h,0).values.immunity_resist/100);
 if(active(g,h,'focus')&&(target?.id??h.targetId)===h.focusTargetId){const s=h.focusSkill||skillOf(h,3);attackSpeed+=s.values.bonus_attack_speed;damage*=1+s.values.focusfire_damage_reduction/100;}
 if(h.heroId==='windranger')for(const t of h.tailwinds||[]){const remaining=t.until-g.time;if(remaining>0)flatSpeed+=t.bonus*Math.min(1,remaining/(t.duration/2));}
 if((h.buffs?.slowUntil||0)>g.time&&!slowPct)slowPct=45;
 if((h.buffs?.hasteUntil||0)>g.time&&!movePercent)movePercent=65;
 attackSpeed=Math.max(20,Math.min(700,attackSpeed));
 const maxSpeed=h.heroId==='windranger'?innate(h).values.max_movespeed:550;
 slowPct=hasStatusFlag(g,h,'slowImmune')?0:slowPct*(1-(h.slowResistance||0)/100);
 speed=speed===0?0:Math.max(100,Math.min(maxSpeed,(speed+flatSpeed)*(1+movePercent/100)*(1-slowPct/100)));
 return {armor,speed,attackSpeed,attackInterval:h.baseAttackTime?h.baseAttackTime*100/attackSpeed:h.attackInterval,damage,magicResistance,evasion};
}

export function castAbility(g,h,index,point){
 const allowed=g._canAct(h);if(!allowed.ok)return allowed;
 if(!Number.isInteger(index)||index<0||index>3)return {ok:false,reason:'无效技能'};
 const s=castingStats(h,skillOf(h,index));
 if(!s.level)return {ok:false,reason:'尚未学习此技能，先分配技能点'};
 if(isStunned(g,h)||g._tauntSource(h)||hasStatusFlag(g,h,'silenced'))return {ok:false,reason:'当前控制状态下无法施法'};
 if(s.kind==='passive')return {ok:false,reason:'这是被动技能，无需主动施放'};
 if(h.heroId==='kunkka'&&index===2&&h.xMark){interruptCast(g,h,false);return returnMark(g,h);}
 if(h.heroId==='kunkka'&&index===1){h.autocast||={};h.autocast[1]=h.autocast[1]===false;return {ok:true,autocast:h.autocast[1]};}
 if(h.channel?.index===index){interruptCast(g,h,true);return {ok:true};}
 if(h.freezingField&&h.heroId==='crystal_maiden'&&index===3){stopFreezingField(h);return {ok:true};}
 if(h.cooldowns[index]>1e-7)return {ok:false,reason:'技能尚未冷却'};
 if(h.mana<s.mana)return {ok:false,reason:'魔法不足'};
 if(h.castPhase)return {ok:false,reason:'正在施法'};
 if(active(g,h,'spin')&&index===3)return {ok:false,reason:'剑刃风暴期间无法使用无敌斩'};
 const aim=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)?{x:point.x,y:point.y}:{x:h.x+Math.cos(h.angle)*100,y:h.y+Math.sin(h.angle)*100};
 const unitTarget=(h.heroId==='axe'&&(index===1||index===3))||(h.heroId==='crystal_maiden'&&index===1)||(h.heroId==='juggernaut'&&index===3)||(h.heroId==='windranger'&&(index===0||index===3))||(h.heroId==='kunkka'&&index===2);
 let target;
 if(unitTarget){
  target=g.entities.filter(e=>alive(e)&&!isInvulnerable(g,e)&&g.canSee(h,e)&&distance(e,aim)<=Math.max(e.radius||24,90)&&
   (h.heroId==='kunkka'?e.kind==='hero':e.team!==h.team&&(fighter(e)||(h.heroId==='windranger'&&index===3&&structure(e))))).sort((a,b)=>distance(a,aim)-distance(b,aim))[0];
  if(!target)return {ok:false,reason:h.heroId==='kunkka'?'请指向友方或敌方英雄':'请指向有效敌方目标'};
  if(distance(h,target)>s.range+target.radius)return {ok:false,reason:`目标超过 ${s.range} 施法距离`};
 }
 const pointTarget=(h.heroId==='kunkka'&&(index===0||index===3))||(h.heroId==='crystal_maiden'&&index===0)||(h.heroId==='juggernaut'&&index===1);
 if(pointTarget&&distance(h,aim)>s.range+1)return {ok:false,reason:`目标超过 ${s.range} 施法距离`};
 interruptCast(g,h,true);h.recallTimer=0;h.destination=null;h.navPath=null;
 if(h.isPlayer)g.keyboard={x:0,y:0};
 const phase={index,skill:s,point:aim,targetId:target?.id,executeAt:g.time+s.castPoint};
 h.castPhase=phase;
 if(s.castPoint>0)addStatus(g,h,'casting',{name:`施放${s.name}`,description:'移动或被控制会取消施法。',positive:true,icon:s.icon,duration:s.castPoint});
 else releaseCast(g,h,phase);
 return {ok:true};
}
export function castExtraAbility(g,h,id,point){
 const allowed=g._canAct(h);if(!allowed.ok)return allowed;
 const s=castingStats(h,extraSkillOf(h,id));if(!s)return {ok:false,reason:'尚未获得对应的阿哈利姆升级'};
 if(!s.level)return {ok:false,reason:'需要先学习无敌斩'};
 if(isStunned(g,h)||g._tauntSource(h)||hasStatusFlag(g,h,'silenced'))return {ok:false,reason:'当前控制状态下无法施法'};
 if(h.castPhase||h.omnislash||h.cloneHop)return {ok:false,reason:'正在施法'};
 if((h.extraCooldowns?.[id]||0)>1e-7)return {ok:false,reason:'技能尚未冷却'};
 if(h.mana<s.mana)return {ok:false,reason:'魔法不足'};
 if((id==='crystal_maiden_crystal_clone'||id==='juggernaut_swift_slash')&&isRooted(g,h))return {ok:false,reason:'缠绕期间无法使用位移技能'};
 if(id==='juggernaut_swift_slash'&&active(g,h,'spin'))return {ok:false,reason:'剑刃风暴期间无法使用迅风斩'};
 const aim=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)?{x:point.x,y:point.y,direction:point.direction}:{x:h.x+Math.cos(h.angle||0)*100,y:h.y+Math.sin(h.angle||0)*100};
 let target;
 if(id==='juggernaut_swift_slash'){
  target=g.entities.filter(e=>alive(e)&&fighter(e)&&e.team!==h.team&&!isInvulnerable(g,e)&&g.canSee(h,e)&&distance(e,aim)<=Math.max(e.radius||24,90)).sort((a,b)=>distance(a,aim)-distance(b,aim))[0];
  if(!target)return {ok:false,reason:'请指向有效敌方目标'};
  if(distance(h,target)>s.range+(target.radius||0))return {ok:false,reason:`目标超过 ${s.range} 施法距离`};
 }else if(id!=='crystal_maiden_crystal_clone'&&distance(h,aim)>s.range+1)return {ok:false,reason:`目标超过 ${s.range} 施法距离`};
 // Crystal Clone is explicitly usable without cancelling Freezing Field.
 if(id!=='crystal_maiden_crystal_clone')interruptCast(g,h,true);
 h.recallTimer=0;h.destination=null;h.navPath=null;if(h.isPlayer)g.keyboard={x:0,y:0};
 const phase={extraId:id,skill:s,point:aim,targetId:target?.id,executeAt:g.time+s.castPoint};h.castPhase=phase;
 if(s.castPoint>0)addStatus(g,h,'casting',{name:`施放${s.name}`,description:'移动或被控制会取消施法。',positive:true,icon:s.icon,duration:s.castPoint});
 else releaseCast(g,h,phase);return {ok:true};
}
export function interruptCast(g,h,releasePartial=true){
 if(h.itemChannel){h.itemChannel=null;h.recallTimer=0;removeStatus(h,'itemChannel');}
 h.castPhase=null;removeStatus(h,'casting');
 if(!releasePartial&&h.freezingField)stopFreezingField(h);
 if(h.channel){const channel=h.channel;h.channel=null;removeStatus(h,'channel');delete h.buffs.ultUntil;
  if(channel.kind==='powershot'&&releasePartial&&alive(h))firePowershot(g,h,channel,Math.min(1,(g.time-channel.startedAt)/channel.skill.channelTime));
 }
}
function releaseCast(g,h,phase){
 if(h.castPhase!==phase)return;h.castPhase=null;removeStatus(h,'casting');
 if(!alive(h)||isStunned(g,h)||g._tauntSource(h)||hasStatusFlag(g,h,'silenced'))return;
 const s=phase.skill,v=s.values,point=phase.point,index=phase.index,target=phase.targetId&&g.entities.find(e=>e.id===phase.targetId);
 if(phase.targetId&&!alive(target))return;
 if(target&&isInvulnerable(g,target))return;
 if(phase.extraId&&!extraSkillOf(h,phase.extraId))return;
 if(h.mana<s.mana)return;
 h.mana-=s.mana;const cooldown=s.cooldown*(1-(h.cooldownReduction||0)/100);if(phase.extraId){h.extraCooldowns||={};h.extraCooldowns[phase.extraId]=cooldown;h.extraCooldownTick=g.time;}else h.cooldowns[index]=cooldown;h.angle=Math.atan2(point.y-h.y,point.x-h.x);
 if(h.heroId==='crystal_maiden'&&s.mana>0){const a=innate(h);const shield=addStatus(g,h,'barrier',{name:'冰川护体',description:'抵挡物理伤害；由消耗的魔法转化。',positive:true,icon:'shield',duration:a.values.barrier_duration,barrier:(active(g,h,'barrier')?.barrier||0)+s.mana*a.values.mana_multiplier/100});shield.stacks=Math.ceil(shield.barrier);}
 if(h.heroId==='windranger')grantTailwind(g,h);
 g.onSpellCast?.(h,s,target);
 if(target&&target.team!==h.team&&hasStatusFlag(g,target,'spellReflect'))applyAbilityEffect(g,target,{...phase,targetId:h.id,point:{x:h.x,y:h.y},reflected:true},h.heroId);
 if(target?.team!==h.team&&target&&g.blockTargetSpell?.(h,target,s))return;
 if(target&&target.team!==h.team)g.onSpellTarget?.(h,target,s);
 applyAbilityEffect(g,h,phase,h.heroId);
}
function applyAbilityEffect(g,h,phase,heroId){
 const s=phase.skill,v=s.values,point=phase.point,index=phase.index,target=phase.targetId&&g.entities.find(e=>e.id===phase.targetId);
 if(phase.extraId){releaseExtraAbility(g,h,s,point,target);return;}
 if(heroId==='axe'){
  if(index===0){
   addStatus(g,h,'call',{name:'狂战士之吼',description:`护甲增加 ${v.bonus_armor}。`,duration:v.duration,positive:true,icon:'roar',armor:v.bonus_armor});h.buffs.callUntil=g.time+v.duration;
   for(const e of targets(g,h,h,v.radius+areaBonus(h)).filter(e=>!isInvulnerable(g,e))){
    addStatus(g,e,'taunt',{name:'嘲讽',description:'被迫攻击斧王。',duration:v.duration,icon:'roar',sourceId:h.id});Object.assign(e.buffs,{tauntUntil:g.time+v.duration,tauntSourceId:h.id});interruptCast(g,e,false);e.recallTimer=0;e.destination=null;e.explicitTarget=null;if(e.isPlayer)g.keyboard={x:0,y:0};
    if(v.applies_battle_hunger)applyHunger(g,h,e);
   }g._effect('burst',h.x,h.y,{radius:v.radius,life:.6,color:'#e8a16e'});
  }else if(index===1)applyHunger(g,h,target,s);
  else if(index===3){
   const wasHero=target.kind==='hero';g.damage(target,s.damage,h,'pure');
   if(target.dead&&wasHero&&!target.reincarnating){if(!phase.reflected)h.cooldowns[3]=0;h.cullingStacks=(h.cullingStacks||0)+1;
    for(const ally of g.entities)if(alive(ally)&&ally.team===h.team&&fighter(ally)&&distance(ally,h)<=v.speed_aoe)addStatus(g,ally,'culling',{name:'淘汰之刃',description:`移动速度 +${v.speed_bonus}%，护甲 +${v.armor_bonus}。`,duration:v.speed_duration,positive:true,icon:'axe',armor:v.armor_bonus,movePercent:v.speed_bonus});
    g._effect('text',target.x,target.y-55,{text:'淘汰！',life:1,color:'#f3c88c'});
   }g._effect('slash',target.x,target.y,{radius:90,life:.5,color:'#e8aa73'});
  }
 }else if(heroId==='crystal_maiden'){
  if(index===0){for(const e of targets(g,h,point,v.radius+areaBonus(h))){g.damage(e,s.damage,h,'magical');slow(g,e,v.duration,v.movespeed_slow,h,v.attackspeed_slow,'nova');}damageOwnClones(g,h,point,v.radius+areaBonus(h),s.damage);g._effect('burst',point.x,point.y,{radius:v.radius,life:.7,color:'#9ad9ef'});}
  else if(index===1){applyFrostbite(g,h,target,s);g._effect('ring',target.x,target.y,{radius:65,life:.7,color:'#b4e6f1'});}
  else if(index===3){const field={kind:'freezing',index,skill:s,startedAt:g.time,until:g.time+s.channelTime,nextExplosion:g.time,dwell:{},frostbitten:[]};h.buffs.ultUntil=field.until;
   if(v.can_move){h.freezingField=field;addStatus(g,h,'freezingField',{name:'极寒领域',description:'可以移动、攻击与施法；敌方控制仍会打断领域。',duration:s.channelTime,positive:true,undispellable:true,movePercent:v.shard_self_movement_speed_slow_pct,icon:'storm'});}
   else{h.channel=field;addStatus(g,h,'channel',{name:'极寒领域',description:'持续施法；移动、停止或被控制会中断。',duration:s.channelTime,positive:true,icon:'storm'});}
  }
 }else if(heroId==='juggernaut'){
  if(index===0){dispel(h);addStatus(g,h,'spin',{name:'剑刃风暴',description:`减益免疫、额外魔抗 ${v.immunity_resist}%；每秒 ${v.blade_fury_damage} 魔法伤害。`,duration:v.duration,positive:true,icon:'spin',flatSpeed:v.bonus_movespeed||0,nextTick:g.time});h.buffs.spinUntil=g.time+v.duration;}
  else if(index===1){
   for(const ward of g.entities)if(ward.kind==='ward'&&ward.ownerId===h.id&&!ward.dead)g._kill(ward,null);
   const position=g.navigation.nearestWalkable(point);const ward=g._unit('ward',h.team,position.x,position.y,{name:'治疗守卫',ownerId:h.id,maxHp:1+v.healing_ward_bonus_health,hitsRemaining:v.healing_ward_hits_to_kill_tooltip,radius:18,speed:v.healing_ward_movespeed_tooltip,range:0,damage:0,expiresAt:g.time+s.duration,healPct:v.healing_ward_heal_amount,healRadius:v.healing_ward_aura_radius+areaBonus(h),statuses:{}});g.entities.push(ward);
  }else if(index===3){dispel(h);addStatus(g,h,'invulnerable',{name:'无敌斩',description:'无敌，跳跃攻击附近敌人。',duration:v.duration,positive:true,icon:'swords'});h.omnislash={skill:s,targetId:target.id,firstSlash:true,nextSlash:g.time,until:g.time+v.duration};h.destination=null;h.explicitTarget=null;h.navPath=null;}
 }else if(heroId==='windranger'){
  if(index===0)g.pendingSpells.push({type:'shackle',sourceId:h.id,targetId:target.id,skill:s,origin:{x:h.x,y:h.y},landAt:g.time+distance(h,target)/v.arrow_speed});
  else if(index===1){h.channel={kind:'powershot',index,skill:s,startedAt:g.time,until:g.time+s.channelTime,point};addStatus(g,h,'channel',{name:'强力击蓄力',description:'蓄力最多 1 秒；提前停止按蓄力比例造成伤害。',positive:true,duration:s.channelTime,icon:'arrow'});}
  else if(index===2)addStatus(g,h,'windrun',{name:'风行',description:`移动速度 +${v.movespeed_bonus_pct}%，闪避普通攻击。`,positive:true,duration:s.duration,movePercent:v.movespeed_bonus_pct,evasion:100,icon:'wind'});
  else {h.focusTargetId=target.id;h.focusSkill=s;addStatus(g,h,'focus',{name:'集中火力',description:`对指定目标攻击速度 +${v.bonus_attack_speed}，攻击伤害降低 ${Math.abs(v.focusfire_damage_reduction)}%。`,positive:true,duration:s.duration,icon:'target',targetId:target.id});h.explicitTarget=target.id;}
 }else if(heroId==='kunkka'){
  if(index===0){g.pendingSpells.push({type:'torrent',sourceId:h.id,...point,skill:s,landAt:g.time+v.delay});g._effect('torrentWarning',point.x,point.y,{radius:v.radius,life:v.delay,team:h.team,color:'#8bc9da'});}
  else if(index===2){const duration=target.team===h.team?v.allied_duration:v.duration;h.xMark={targetId:target.id,x:target.x,y:target.y,expiresAt:g.time+duration};addStatus(g,target,'xmark',{name:'X 标记',description:'标记结束或昆卡提前返回时，被带回标记位置。',duration,sourceId:h.id,icon:'xmark',positive:target.team===h.team});}
  else if(index===3)summonGhostships(g,h,s,point);
 }
}

function grantTailwind(g,h){
 const v=innate(h).values;h.tailwinds||=[];h.tailwinds=h.tailwinds.filter(t=>t.until>g.time);
 h.tailwinds.push({until:g.time+v.duration,duration:v.duration,bonus:v.movespeed_bonus,undispellable:!!v.undispellable});
 addStatus(g,h,'tailwind',{name:'顺风而行',description:'叠加移动速度，持续时间后半段逐渐衰减。',duration:v.duration,positive:true,icon:'wind',undispellable:!!v.undispellable,stacks:h.tailwinds.length});
}
function applyHunger(g,h,target,s=skillOf(h,1)){
 if(!s.level)return;const v=s.values;
 const id=v.should_stack?`hunger:${h.id}:${h.hungerSerial=(h.hungerSerial||0)+1}`:'hunger';
 const status=dot(g,target,id,h,v.duration,v.damage_per_second,1,'pure','战斗饥渴');
 if(status)Object.assign(status,{hunger:true,icon:'hunger',slowPct:v.slow,description:`每秒 ${v.damage_per_second} 纯粹伤害；背对斧王时减速 ${v.slow}%，击杀单位可解除。`});
}
function applyFrostbite(g,h,target,s=skillOf(h,1)){
 if(!s.level||debuffImmune(g,target)||isInvulnerable(g,target))return;
 const v=s.values;applyRoot(g,target,v.duration,h,false,{name:'冰封禁制',description:'无法移动或攻击，但仍可施放技能。',disarm:true,disarmed:true});
 dot(g,target,'frostbite',h,v.duration,v.damage_per_second*v.tick_interval*(target.kind!=='hero'&&!target.ancient?v.creep_multiplier:1),v.tick_interval,'magical','冰封伤害');
}
function stopFreezingField(h){h.freezingField=null;removeStatus(h,'freezingField');if(h.buffs)delete h.buffs.ultUntil;}
function damageOwnClones(g,h,at,radius,damage){
 for(const clone of g.entities)if(clone.crystalClone&&clone.ownerId===h.id&&alive(clone)&&distance(clone,at)<=radius+clone.radius){clone.hp=Math.max(0,clone.hp-damage);if(!clone.hp)g._kill(clone,null);}
}
function detonateClone(g,clone){
 if(clone.cloneExploded)return;clone.cloneExploded=true;const h=g.entities.find(e=>e.id===clone.ownerId);if(!h)return;
 for(const e of targets(g,h,clone,clone.frostbiteRadius))applyFrostbite(g,h,e);
 g._effect('burst',clone.x,clone.y,{radius:clone.frostbiteRadius,life:.7,color:'#b4e6f1'});
}
function releaseExtraAbility(g,h,s,point,target){
 const v=s.values,d=distance(h,point),dir=d>1e-6?{x:(point.x-h.x)/d,y:(point.y-h.y)/d}:{x:Math.cos(h.angle||0),y:Math.sin(h.angle||0)};
 if(s.id==='juggernaut_swift_slash'){
  dispel(h);addStatus(g,h,'invulnerable',{name:'迅风斩',description:'短时间无敌，跳跃攻击附近敌人。',duration:v.duration,positive:true,icon:'swords'});
  h.omnislash={skill:s,targetId:target.id,firstSlash:true,nextSlash:g.time,until:g.time+v.duration};h.explicitTarget=null;
 }else if(s.id==='crystal_maiden_crystal_clone'){
  const clone=g._unit('creep',h.team,h.x,h.y,{name:'冰晶克隆',heroId:h.heroId,crystalClone:true,ownerId:h.id,maxHp:v.clone_health,speed:0,range:0,damage:0,attackCooldown:Infinity,goldMin:0,goldMax:0,xpBounty:0,radius:24,expiresAt:g.time+v.clone_duration,frostbiteRadius:v.frostbite_radius+areaBonus(h)});g.entities.push(clone);
  addStatus(g,clone,'cloneBody',{duration:v.clone_duration,positive:true,undispellable:true,stunned:true});
  const to=g.navigation.nearestWalkable({x:h.x+dir.x*v.hop_distance,y:h.y+dir.y*v.hop_distance});
  h.cloneHop={from:{x:h.x,y:h.y},to,startedAt:g.time,until:g.time+v.hop_duration};
  g.pendingSpells=g.pendingSpells.filter(spell=>!(spell.targetId===h.id&&spell.type==='shackle'));
  g._effect('ring',clone.x,clone.y,{radius:60,life:v.clone_duration,color:'#b4e6f1'});
 }else if(s.id==='windrunner_gale_force'){
  const vector=point.direction,vd=vector&&Math.hypot(vector.x,vector.y);const windDir=vd?{x:vector.x/vd,y:vector.y/vd}:dir;
  g.pendingSpells.push({type:'gale',sourceId:h.id,skill:s,x:point.x,y:point.y,dir:windDir,lastTick:g.time,startedAt:g.time,landAt:g.time+v.duration});
  g._effect('ring',point.x,point.y,{radius:v.radius,life:v.duration,color:'#bfd69d'});
 }else if(s.id==='kunkka_tidal_wave'){
  const origin={x:h.x-dir.x*v.radius,y:h.y-dir.y*v.radius},travel=v.wave_distance_tooltip;
  g.pendingSpells.push({type:'tidal',sourceId:h.id,skill:s,origin,dir,traveled:0,hits:[],startedAt:g.time,landAt:g.time+travel/v.speed});
  g._effect('beam',origin.x,origin.y,{tx:origin.x+dir.x*travel,ty:origin.y+dir.y*travel,radius:50,life:travel/v.speed,color:'#99d9df'});
 }
}
function summonGhostships(g,h,s,point){
 const v=s.values,length=v.ghostship_distance,d=distance(h,point),dir=d>1e-6?{x:(point.x-h.x)/d,y:(point.y-h.y)/d}:{x:Math.cos(h.angle||0),y:Math.sin(h.angle||0)},start={x:point.x-dir.x*length,y:point.y-dir.y*length},delay=length/v.ghostship_speed;
 for(let i=0;i<Math.max(1,v.fleet_count||0);i++){
  const startedAt=g.time+i*(v.fleet_interval||0);g.pendingSpells.push({type:'ship',sourceId:h.id,...point,start:{...start},dir,startedAt,landAt:startedAt+delay,skill:s,touched:[],cannonVolleys:v.fire_cannons?v.num_cannon_volleys:0,volleysFired:0,nextCannonAt:startedAt+v.cannon_fire_interval,effectStarted:false});
 }
}
function fireCannons(g,h,ship,at){
 const v=ship.skill.values;
 for(const side of [-1,1])for(let i=0;i<v.cannon_count;i++){
  const offset=v.initial_cannon_offset+i*v.distance_between_cannons,origin={x:at.x+ship.dir.x*offset,y:at.y+ship.dir.y*offset};
  const angle=Math.atan2(ship.dir.y,ship.dir.x)+side*(90+v.base_cannon_rotation+i*v.rotation_per_cannon)*Math.PI/180,dir={x:Math.cos(angle),y:Math.sin(angle)};
  g.pendingSpells.push({type:'cannon',sourceId:h.id,skill:ship.skill,origin,dir,traveled:0,hits:[],startedAt:g.time,landAt:g.time+v.cannon_ball_distance/v.cannon_ball_speed});
  g._effect('beam',origin.x,origin.y,{tx:origin.x+dir.x*v.cannon_ball_distance,ty:origin.y+dir.y*v.cannon_ball_distance,life:v.cannon_ball_distance/v.cannon_ball_speed,color:'#adcbc4'});
 }
}

function firePowershot(g,h,channel,fraction){
 const s=channel.skill,v=s.values,d=distance(h,channel.point)||1,dir={x:(channel.point.x-h.x)/d,y:(channel.point.y-h.y)/d};
 g.pendingSpells.push({type:'powershot',sourceId:h.id,skill:s,origin:{x:h.x,y:h.y},dir,fraction,hits:[],traveled:0,startedAt:g.time,landAt:g.time+v.arrow_range/v.arrow_speed});
 g._effect('beam',h.x,h.y,{tx:h.x+dir.x*v.arrow_range,ty:h.y+dir.y*v.arrow_range,color:'#d3e8a0',life:v.arrow_range/v.arrow_speed});
}
function giveRum(g,target,source,factor){
 const a=innate(source),v=a.values,old=active(g,target,'rum');if(old&&old.factor>factor)return;
 const s=addStatus(g,target,'rum',{name:factor>1?'幽灵船朗姆酒':'海军上将的朗姆酒',description:`延迟承受 ${v.ghostship_absorb*factor}% 伤害，移动速度 +${v.movespeed_bonus*factor}%。`,positive:true,duration:v.buff_duration*factor,icon:'ship',factor,absorb:v.ghostship_absorb*factor/100,movePercent:v.movespeed_bonus*factor,debt:old?.debt||0,sourceId:source.id});
 return s;
}
export function returnMark(g,h){
 const mark=h.xMark;h.xMark=null;const target=mark&&g.entities.find(e=>e.id===mark.targetId&&alive(e));
 if(!target)return {ok:false,reason:'标记已失效'};removeStatus(target,'xmark');
 if(isInvulnerable(g,target)||debuffImmune(g,target))return {ok:false,reason:'目标当前免疫返回效果'};
 interruptCast(g,target,true);Object.assign(target,{x:mark.x,y:mark.y,destination:null,targetId:null,explicitTarget:null,recallTimer:0,navPath:null});
 if(target.isPlayer)g.keyboard={x:0,y:0};g._effect('burst',mark.x,mark.y,{radius:48,life:.5,color:'#c4d9d1'});return {ok:true};
}
export function tickWorldAbilities(g){
 for(const h of g.entities)if(h.kind==='hero'){
  if(h.extraCooldowns){const elapsed=Math.max(0,g.time-(h.extraCooldownTick??g.time));for(const id of Object.keys(h.extraCooldowns))h.extraCooldowns[id]=Math.max(0,h.extraCooldowns[id]-elapsed);h.extraCooldownTick=g.time;}
  if(h.castPhase&&h.castPhase.executeAt<=g.time+1e-7)releaseCast(g,h,h.castPhase);
  if(h.xMark&&h.xMark.expiresAt<=g.time+1e-7)returnMark(g,h);
 }
 for(const clone of g.entities)if(clone.crystalClone&&alive(clone)&&clone.expiresAt<=g.time+1e-7)g._kill(clone,null);
 for(const spell of g.pendingSpells)if(['gale','tidal','cannon'].includes(spell.type)){
  const h=g.entities.find(e=>e.id===spell.sourceId);if(!h)continue;const v=spell.skill.values;
  if(spell.type==='gale'){
   const elapsed=Math.max(0,Math.min(g.time,spell.landAt)-spell.lastTick);spell.lastTick=g.time;
   for(const e of targets(g,h,spell,v.radius+areaBonus(h)))if(!debuffImmune(g,e)&&!isInvulnerable(g,e))forceMove(g,e,spell.dir,v.wind_strength*elapsed);
  }else{
   const cannon=spell.type==='cannon',speed=cannon?v.cannon_ball_speed:v.speed,length=cannon?v.cannon_ball_distance:v.wave_distance_tooltip,radius=(cannon?v.cannon_ball_radius:v.radius)+areaBonus(h),end=Math.min(length,Math.max(0,g.time-spell.startedAt)*speed);
   for(const e of g.entities)if(alive(e)&&fighter(e)&&e.team!==h.team&&!isInvulnerable(g,e)&&!spell.hits.includes(e.id)){
    const x=e.x-spell.origin.x,y=e.y-spell.origin.y,along=x*spell.dir.x+y*spell.dir.y,across=Math.abs(x*spell.dir.y-y*spell.dir.x);
    if(along<spell.traveled-e.radius||along>end+e.radius||across>radius+e.radius)continue;spell.hits.push(e.id);
    g.damage(e,cannon?spell.skill.damage*v.cannon_ball_damage_pct/100:v.damage,h,'magical');
    if(!cannon&&!debuffImmune(g,e)&&alive(e)){
     addStatus(g,e,'tidalWave',{name:'潮汐波',description:'被潮汐波拖拽，无法移动或攻击。',duration:v.duration,sourceId:h.id,icon:'torrent',rooted:true,disarmed:true,forcedDirection:spell.dir,forcedSpeed:v.knockback_distance/v.duration});e.recallTimer=0;
    }
   }
   spell.traveled=end;
  }
 }
 for(const spell of g.pendingSpells)if(spell.type==='powershot'){
  const source=g.entities.find(e=>e.id===spell.sourceId);if(!source)continue;
  const v=spell.skill.values,end=Math.min(v.arrow_range,(g.time-spell.startedAt)*v.arrow_speed);
  const candidates=g.entities.filter(e=>alive(e)&&fighter(e)&&e.team!==source.team&&!isInvulnerable(g,e)&&!spell.hits.includes(e.id)).map(e=>({e,along:(e.x-spell.origin.x)*spell.dir.x+(e.y-spell.origin.y)*spell.dir.y,across:Math.abs((e.x-spell.origin.x)*spell.dir.y-(e.y-spell.origin.y)*spell.dir.x)})).filter(({e,along,across})=>along>=spell.traveled-e.radius&&along<=end+e.radius&&across<=v.arrow_width+e.radius).sort((a,b)=>a.along-b.along);
  for(const {e}of candidates){
   const decay=(1-v.damage_reduction/100)**spell.hits.length,execute=(v.min_execute_threshold||0)+((v.max_execute_threshold||0)-(v.min_execute_threshold||0))*spell.fraction;
   spell.hits.push(e.id);g.damage(e,v.powershot_damage*spell.fraction*decay,source,'magical');slow(g,e,v.slow_duration,v.slow*spell.fraction*decay,source,0,'powershot');
   if(e.kind==='hero'&&alive(e)&&execute&&e.hp/e.maxHp<=execute/100)g.damage(e,e.hp+1,source,'pure');
  }
  spell.traveled=end;
 }
 for(const spell of g.pendingSpells)if(spell.type==='ship'){
  const source=g.entities.find(e=>e.id===spell.sourceId);if(!source||g.time<spell.startedAt)continue;
  const progress=Math.min(1,(g.time-spell.startedAt)/(spell.landAt-spell.startedAt)),at={x:spell.start.x+(spell.x-spell.start.x)*progress,y:spell.start.y+(spell.y-spell.start.y)*progress};
  if(!spell.effectStarted){spell.effectStarted=true;g._effect('ship',spell.start.x,spell.start.y,{tx:spell.x,ty:spell.y,radius:spell.skill.values.ghostship_width,life:spell.landAt-spell.startedAt,team:source.team,color:'#8fcec5'});}
  while(spell.volleysFired<spell.cannonVolleys&&spell.nextCannonAt<=g.time+1e-7&&spell.nextCannonAt<spell.landAt){fireCannons(g,source,spell,at);spell.volleysFired++;spell.nextCannonAt+=spell.skill.values.cannon_fire_interval;}
  for(const ally of g.entities)if(alive(ally)&&ally.kind==='hero'&&ally.team===source.team&&!spell.touched.includes(ally.id)&&distance(at,ally)<=spell.skill.values.ghostship_width){giveRum(g,ally,source,spell.skill.values.rum_factor);spell.touched.push(ally.id);}
 }
 const ready=g.pendingSpells.filter(s=>s.landAt<=g.time+1e-7);g.pendingSpells=g.pendingSpells.filter(s=>s.landAt>g.time+1e-7);
 for(const spell of ready){const h=g.entities.find(e=>e.id===spell.sourceId);if(!h)continue;const s=spell.skill,v=s?.values;
  if(spell.type==='torrent'||spell.type==='ship'){
   const radius=(spell.type==='torrent'?v.radius:v.ghostship_width)+areaBonus(h);
   for(const e of targets(g,h,spell,radius)){
    if(spell.type==='torrent'){stun(g,e,v.stun_duration,h);dot(g,e,'torrent',h,v.stun_duration,s.damage*v.damage_tick_interval/v.stun_duration,v.damage_tick_interval,'magical','洪流');slow(g,e,v.slow_duration,v.movespeed_bonus,h,0,'slow',g.time+v.stun_duration);}
    else{g.damage(e,s.damage,h,'magical');stun(g,e,v.stun_duration,h);}
   }g._effect(spell.type==='torrent'?'torrent':'shipImpact',spell.x,spell.y,{radius,life:.85,team:h.team,color:'#99d9df'});
  }else if(spell.type==='shackle'){
   const target=g.entities.find(e=>e.id===spell.targetId&&alive(e));if(!target)continue;
   const d=distance(spell.origin,target)||1,dir={x:(target.x-spell.origin.x)/d,y:(target.y-spell.origin.y)/d};
   const trees=TREES.filter((_,i)=>!g.cutTrees?.has(i)).concat((g.plantedTrees||[]).filter(t=>t.until>g.time));
   const candidates=[...g.entities.filter(e=>alive(e)&&fighter(e)&&e.team===target.team&&e!==target),...trees];
   const anchor=candidates.filter(e=>{const r=distance(e,target);return r>1&&r<=v.shackle_distance&&((e.x-target.x)*dir.x+(e.y-target.y)*dir.y)/r>=Math.cos(v.shackle_angle*Math.PI/180);}).sort((a,b)=>distance(a,target)-distance(b,target))[0];
   stun(g,target,anchor?v.stun_duration:v.fail_stun_duration,h);if(anchor?.kind)stun(g,anchor,v.stun_duration,h);
   g._effect('beam',h.x,h.y,{tx:target.x,ty:target.y,life:.4,color:'#c9d799'});
  }
 }
}

function forceMove(g,e,dir,amount){
 if(amount<=0)return;
 Object.assign(e,g.navigation.nearestWalkable({x:e.x+dir.x*amount,y:e.y+dir.y*amount}));e.navPath=null;e.moving=true;
}

export function tickStatuses(g,e,dt){
 for(const [id,s]of Object.entries(e.statuses||{})){
  if(s.forcedDirection&&alive(e)&&!debuffImmune(g,e)&&!isInvulnerable(g,e))forceMove(g,e,s.forcedDirection,s.forcedSpeed*Math.max(0,Math.min(dt,s.until-(g.time-dt))));
  if(s.tickInterval&&alive(e)){const source=g.entities.find(h=>h.id===s.sourceId);while(s.nextTick<=g.time+1e-7&&s.nextTick<s.until-1e-7){if(source)g.damage(e,s.tickDamage*Math.min(s.tickInterval,s.until-s.nextTick)/s.tickInterval,source,s.damageType);s.nextTick+=s.tickInterval;}}
  if(s.until<=g.time+1e-7){
   removeStatus(e,id);g.onStatusExpired?.(e,s);if(id==='spin')dispel(e,true);
   if(id==='rum'&&s.debt>0)addStatus(g,e,'rumdebt',{name:'朗姆酒延迟伤害',description:'逐渐偿还延迟承受的伤害，不会因此死亡。',duration:10,icon:'ship',debtPerSecond:s.debt/10});
  }else if(id==='rumdebt')e.hp=Math.max(1,e.hp-s.debtPerSecond*dt);
 }
}
export function tickHeroAbilities(g,h,dt){
 if(h.cloneHop){const hop=h.cloneHop,t=Math.max(0,Math.min(1,(g.time-hop.startedAt)/(hop.until-hop.startedAt)));Object.assign(h,{x:hop.from.x+(hop.to.x-hop.from.x)*t,y:hop.from.y+(hop.to.y-hop.from.y)*t});if(t===1)h.cloneHop=null;}
 if(h.heroId==='windranger'&&h.tailwinds?.length){
  h.tailwinds=h.tailwinds.filter(t=>t.until>g.time+1e-7);
  const tailwind=active(g,h,'tailwind');if(tailwind)tailwind.stacks=h.tailwinds.length;
 }
 if(h.heroId==='juggernaut'){
  const a=innate(h).values;
  if(h.lastDamageAt!==undefined&&g.time-h.lastDamageAt<a.linger_duration)h.nextBladeformAt=g.time+a.stack_gain_time;
  else if(h.lastDamageAt!==undefined&&h.bladeformDamaged){h.bladeformStacks=0;h.bladeformDamaged=false;removeStatus(h,'bladeform');}
  if(g.time>=(h.nextBladeformAt??a.stack_gain_time)){h.bladeformStacks=Math.min(a.max_stacks,(h.bladeformStacks||0)+1);h.nextBladeformAt=g.time+a.stack_gain_time;}
  if(h.bladeformStacks)addStatus(g,h,'bladeform',{name:'剑术姿态',description:`每层增加 ${a.agi_bonus_pct_per_stack.toFixed(1)}% 基础敏捷与 ${a.movement_speed_pct_per_stack}% 移动速度。`,duration:Infinity,positive:true,icon:'swords',stacks:h.bladeformStacks});
  const agility=(h.attributes?.agility?.base||0)*a.agi_bonus_pct_per_stack/100*(h.bladeformStacks||0);
  if(Math.abs((h.innateAgility||0)-agility)>.001){h.innateAgility=agility;g._refreshHero(h);}
  const spin=active(g,h,'spin');if(spin){const s=skillOf(h,0),v=s.values;while(spin.nextTick<=g.time+1e-7&&spin.nextTick<spin.until){
   const amount=v.blade_fury_damage*v.blade_fury_damage_tick;
   for(const e of targets(g,h,h,v.blade_fury_radius+areaBonus(h)))g.damage(e,amount,h,'magical');spin.nextTick+=v.blade_fury_damage_tick;
  }}
 }
  if(h.omnislash){const omni=h.omnislash,v=omni.skill.values;
   if(g.time>=omni.until){h.omnislash=null;removeStatus(h,'invulnerable');}
   else if(g.time>=omni.nextSlash){
    let victim=omni.firstSlash?g.entities.find(e=>e.id===omni.targetId&&alive(e)&&!isInvulnerable(g,e)&&distance(h,e)<=v.omni_slash_radius+50):null;
    const nearby=targets(g,h,h,v.omni_slash_radius).filter(e=>!isInvulnerable(g,e));if(!victim&&nearby.length)victim=nearby[Math.floor(g._random()*nearby.length)];
    if(!victim){h.omnislash=null;removeStatus(h,'invulnerable');}else{
     omni.firstSlash=false;
     const old={x:h.x,y:h.y};Object.assign(h,g.navigation.nearestWalkable({x:victim.x-30,y:victim.y}));h.navPath=null;
     const before=h.attackCooldown;h.attackCooldown=0;g._attack(h,victim,{omni:true,bonusDamage:v.bonus_damage});h.attackCooldown=before;
     const stats=g.combatStats?.(h)||combatStats(g,h);omni.nextSlash=g.time+h.baseAttackTime*100/Math.min(700,stats.attackSpeed+v.bonus_attack_speed)/v.attack_rate_multiplier;
     g._effect('slash',old.x,old.y,{tx:victim.x,ty:victim.y,radius:65,life:.2,color:'#ffdfb1'});
    }
   }
  }
 if(h.heroId==='axe'){
  const a=innate(h).values,alone=!g.entities.some(e=>e!==h&&e.kind==='hero'&&alive(e)&&e.team===h.team&&distance(e,h)<=a.radius);
  if(alone)h.lastAloneAt=g.time;
  const factor=alone?1:Math.max(0,1-(g.time-(h.lastAloneAt??-Infinity))/a.bonus_linger_duration),strength=Math.max(0,combatStats(g,h).armor)*a.armor_pct_as_strength/100*factor;
  if(factor)addStatus(g,h,'oneManArmy',{name:'一人成军',description:`根据护甲获得 ${strength.toFixed(1)} 额外力量，接近队友后逐渐消退。`,positive:true,duration:a.bonus_linger_duration,icon:'shield',bonusStrength:strength});
  else removeStatus(h,'oneManArmy');
  if(Math.abs((h.innateStrength||0)-strength)>.001){h.innateStrength=strength;g._refreshHero(h);}
 }
 if(h.freezingField){
  if(isStunned(g,h)||g._tauntSource(h)||hasStatusFlag(g,h,'silenced'))interruptCast(g,h,false);
  else{tickFreezingField(g,h,h.freezingField);if(g.time>=h.freezingField.until)stopFreezingField(h);}
 }
 if(h.channel){
  if(isStunned(g,h)||g._tauntSource(h)||hasStatusFlag(g,h,'silenced'))interruptCast(g,h,false);
  else if(h.channel.kind==='freezing'){
   const channel=h.channel;tickFreezingField(g,h,channel);
   if(g.time>=channel.until)interruptCast(g,h,false);
  }else if(g.time>=h.channel.until)interruptCast(g,h,true);
 }
 return !!h.castPhase||!!h.channel||!!h.omnislash||!!h.cloneHop;
}
function tickFreezingField(g,h,field){
 const v=field.skill.values,nearby=targets(g,h,h,v.radius+areaBonus(h));
 for(const e of nearby){
  slow(g,e,v.slow_duration,v.movespeed_slow,h,v.attack_slow,'freezingSlow');
  if(v.frostbite_delay>=0&&!field.frostbitten.includes(e.id)){
   field.dwell[e.id]??=g.time;
   if(g.time-field.dwell[e.id]>=v.frostbite_delay-1e-7&&!debuffImmune(g,e)&&!isInvulnerable(g,e)){applyFrostbite(g,h,e);field.frostbitten.push(e.id);}
  }
 }
 for(const id of Object.keys(field.dwell))if(!nearby.some(e=>String(e.id)===id))delete field.dwell[id];
 const interval=v.explosion_interval_tooltip/(1+(v.shard_bonus_explosion||0)/100);
 while(field.nextExplosion<=g.time+1e-7&&field.nextExplosion<field.until-1e-7){
  const angle=g._random()*Math.PI*2,r=v.explosion_min_dist+g._random()*(v.explosion_max_dist-v.explosion_min_dist),at={x:h.x+Math.cos(angle)*r,y:h.y+Math.sin(angle)*r};
  for(const e of targets(g,h,at,v.explosion_radius+areaBonus(h)))g.damage(e,v.damage,h,'magical');damageOwnClones(g,h,at,v.explosion_radius+areaBonus(h),v.damage);
  g._effect('burst',at.x,at.y,{radius:v.explosion_radius,life:.35,color:'#aee4f2'});field.nextExplosion+=interval;
 }
}
export function auraManaRegen(g,h){
 let extra=0,amp=0;
 for(const maiden of g.entities)if(alive(maiden)&&maiden.heroId==='crystal_maiden'&&maiden.team===h.team){const s=skillOf(maiden,2);if(!s.level)continue;const value=s.values.base_mana_regen*(distance(h,maiden)<=s.values.proximity_bonus_radius?s.values.proximity_bonus_factor:1);extra=Math.max(extra,value);if(h===maiden)amp=s.values.mana_regen_amp;}
 return (h.manaRegen+extra)*(1+amp/100);
}
export function tickWard(g,ward,dt){
 if(g.time>=ward.expiresAt){g._kill(ward,null);return;}
 if(ward.wardType)return;
 const owner=g.entities.find(e=>e.id===ward.ownerId&&alive(e));if(owner&&distance(ward,owner)>150)g._move(ward,owner,dt,110);
 for(const ally of g.entities)if(alive(ally)&&ally.team===ward.team&&fighter(ally)&&distance(ally,ward)<=ward.healRadius)ally.hp=Math.min(ally.maxHp,ally.hp+ally.maxHp*ward.healPct/100*dt);
}
export function incomingDamage(g,target,value,source,type){
 if(isInvulnerable(g,target))return 0;
 if(target.heroId==='kunkka'&&source&&(source.kind==='hero'||structure(source)||source.isRoshan)&&!active(g,target,'rum')&&(target.rumReadyAt||0)<=g.time&&target.hp-value<target.maxHp*innate(target).values.damage_threshold/100){giveRum(g,target,target,1);target.rumReadyAt=g.time+innate(target).cooldown;}
 const barrier=active(g,target,'barrier');if(type==='physical'&&barrier){const blocked=Math.min(value,barrier.barrier);barrier.barrier-=blocked;barrier.stacks=Math.ceil(barrier.barrier);value-=blocked;if(barrier.barrier<=0)removeStatus(target,'barrier');}
 const rum=active(g,target,'rum');if(rum){const defer=value*rum.absorb;rum.debt+=defer;value-=defer;}
 if(value>0){target.lastDamageAt=g.time;target.bladeformDamaged=true;}
 return value;
}
export function attackModifiers(g,h,target,options={}){
 const stats=combatStats(g,h,target);let damage=stats.damage+(options.bonusDamage||0),critical=false,cleave=null;
 if(h.heroId==='juggernaut'){
  const s=skillOf(h,2);if(s.level&&g._random()*100<s.values.blade_dance_crit_chance){damage*=s.values.blade_dance_crit_mult/100;critical=true;}
  if(active(g,h,'spin')&&!options.omni&&fighter(target))damage=0;
 }
 if(h.heroId==='kunkka'&&fighter(target)&&h.autocast?.[1]!==false&&(h.cooldowns[1]||0)<=0){const s=skillOf(h,1);if(s.level){damage+=s.values.damage_bonus;cleave=s;h.cooldowns[1]=s.cooldown;}}
 for(const s of Object.values(h.statuses||{}))if(s.until>g.time&&s.helixReduction&&s.sourceId===target.id)damage*=1-s.helixReduction*s.stacks/100;
 return {damage,critical,cleave,interval:stats.attackInterval};
}
export function afterAttack(g,h,target,result,dealt){
 if(result.cleave){const v=result.cleave.values,dir={x:Math.cos(h.angle),y:Math.sin(h.angle)};
  for(const e of g.entities)if(e!==target&&alive(e)&&fighter(e)&&e.team!==h.team){const x=e.x-h.x,y=e.y-h.y,along=x*dir.x+y*dir.y,across=Math.abs(x*dir.y-y*dir.x);const width=v.cleave_starting_width+(v.cleave_ending_width-v.cleave_starting_width)*along/v.cleave_distance;if(along>=0&&along<=v.cleave_distance&&across<=width){g.damage(e,result.damage*v.cleave_damage/100,h,'physical',{armorIgnorePct:v.pierces_armor||0});if(v.movespeed_slow)slow(g,e,v.movespeed_slow_duration,v.movespeed_slow,h);}}
  if(v.movespeed_slow)slow(g,target,v.movespeed_slow_duration,v.movespeed_slow,h);
  g._effect('cleave',h.x,h.y,{tx:h.x+dir.x*v.cleave_distance,ty:h.y+dir.y*v.cleave_distance,radius:v.cleave_ending_width,life:.45,color:'#b2e1dc'});
 }
 if(result.critical){g._effect('text',target.x,target.y-45,{text:`${Math.round(result.damage)}!`,life:.7,color:'#e6ac71'});const s=skillOf(h,2);h.hp=Math.min(h.maxHp,h.hp+dealt*(s.values.blade_dance_lifesteal||0)/100);}
 if(alive(target)&&target.heroId==='axe')countHelix(g,target);
 if(h.heroId==='axe'&&h.hasScepter&&fighter(target))countHelix(g,h);
 if(h.heroId==='windranger'&&h.hasScepter)grantTailwind(g,h);
}
function countHelix(g,h){
 const s=skillOf(h,2);if(!s.level||hasStatusFlag(g,h,'break'))return;h.helixCounter=(h.helixCounter||0)+1;
 if(h.helixCounter<s.values.trigger_attacks||(h.cooldowns[2]||0)>0)return;
 h.helixCounter=0;h.cooldowns[2]=s.cooldown;
 for(const e of targets(g,h,h,s.values.radius+areaBonus(h))){g.damage(e,s.values.damage,h,'pure');if(s.values.damage_reduction){const id='helix:'+h.id;addStatus(g,e,id,{name:'反击螺旋削弱',icon:'spin',duration:s.values.debuff_duration,sourceId:h.id,helixReduction:s.values.damage_reduction,stacks:Math.min(s.values.max_stacks||5,(active(g,e,id)?.stacks||0)+1)});}}
 h.buffs.helixUntil=g.time+.55;g._effect('slash',h.x,h.y,{radius:s.values.radius,life:.55,color:'#e1b782'});
}
export function onUnitKilled(g,target,source){
 if(target.crystalClone)detonateClone(g,target);
 if(source){for(const [id,s]of Object.entries(source.statuses||{}))if(s.hunger||id==='hunger')removeStatus(source,id);if(source.heroId==='windranger'&&active(g,source,'focus')&&source.focusTargetId===target.id&&target.kind==='hero'){const s=skillOf(source,3);source.cooldowns[3]=Math.max(0,source.cooldowns[3]-(s.values.cooldown_reduction_per_kill||0));}}
 interruptCast(g,target,false);target.statuses={};target.omnislash=null;target.bladeformStacks=0;target.tailwinds=[];target.focusTargetId=null;
 if(target.kind==='hero'&&(target.innateStrength||target.innateAgility)){target.innateStrength=0;target.innateAgility=0;g._refreshHero(target);}
 for(const e of g.entities){
  if(e.statuses?.taunt?.sourceId===target.id||e.buffs?.tauntSourceId===target.id)removeStatus(e,'taunt');
  if(e.xMark?.targetId===target.id)e.xMark=null;
  if(e.xMark&&e===target){const victim=g.entities.find(t=>t.id===e.xMark.targetId);if(victim)removeStatus(victim,'xmark');e.xMark=null;}
 }
}

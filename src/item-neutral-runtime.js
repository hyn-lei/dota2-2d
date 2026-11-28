import {ITEM_BY_ID,NEUTRAL_HERO_ADJECTIVES} from './item-data.js';
import * as C from './item-common.js';
import * as Skills from './hero-runtime.js';
import {restoreMana} from './mana-runtime.js';
import {launchAttack} from './attack-projectiles.js';
import {giveItem,itemEntries} from './inventory.js';
const {value:v,alive,distance,status,heal,slow,dot,allies,enemies,dispel}=C;
export const ENCHANTMENT_TIERS=Object.freeze({vital:[1,2],alert:[1,2,3],brawny:[1,2,3],mystical:[1,2,3],quickened:[1,2,3],tough:[1,2,3],crude:[2,3],greedy:[3],keen_eyed:[2,3],nimble:[2,3],titanic:[2,3],evolved:[4],timeless:[4],audacious:[4],feverish:[4],fleetfooted:[4],hulking:[4],manic:[4],vampiric:[4]});
export function enchantmentStats(g,h,item,meta={}){
 const id=item.id.replace('enhancement_',''),tiers=ENCHANTMENT_TIERS[id]||[1],tier=meta.tier||h.neutralTier||1,index=Math.max(0,tiers.indexOf(tier)),n=key=>item.valueLevels[key]?.[index]??v(item,key),stats={};
 const fields={movement_speed:'speed',movespeed:'speed',max_mana:'maxMana',bonus_mana:'maxMana',evasion:'evasion',mana_regen:'manaRegen',bonus_mana_regen:'manaRegen',magic_res:'magicResistance',manacost_reduction:'manaCostReduction',bonus_attack_speed:'attackSpeed',attack_speed:'attackSpeed',bonus_night_vision:'nightVision',health_bonus:'maxHp',health_regen:'hpRegen',bonus_damage:'damage',armor:'armor',knockback_resist:'knockbackResistance',health_restoration:'healthRegenAmp',bat_reduce:'baseAttackTimeReduction',bonus_gpm:'gpm',mana_reduction_pct:'maxManaPercent',movespeed_pct:'moveSpeedPct',hp_regen_reduce:'hpRegenPenalty',base_attack_damage:'baseDamagePct',status_resistance:'statusResistance',bonus_potency:'itemPotencyBonus',debuff_amp:'debuffAmp',spell_amp:'spellAmp',cooldown_reduction:'cooldownReduction',lifesteal:'lifesteal',attack_lifesteal:'lifesteal',spell_lifesteal:'spellLifesteal',incoming_damage:'incomingDamagePct',vision_reduce:'visionReduction',cast_speed:'castSpeed'};
 for(const [key,field]of Object.entries(fields))if(item.values[key]!==undefined)stats[field]=n(key);
 if(item.values.mana_reduction_pct!==undefined)stats.maxManaPercent=-n('mana_reduction_pct');
 if(id==='feverish'){stats.maxManaPercent=n('max_mana');delete stats.maxMana;}
 if(id==='alert')stats.attackRange=n(h.range>300?'bonus_attack_range':'bonus_attack_range_melee');
 if(id==='keen_eyed')stats.castRange=n('cast_range_bonus');
 if(id==='evolved'){if(h.primaryAttribute==='universal')stats.allAttributes=n('primary_stat_universal');else stats[h.primaryAttribute||'strength']=n('primary_stat');}
 if(id==='hulking'){stats.maxHpPercent=n('max_health');stats.maxHealthRegenPct=n('max_health_regen');}
 if(id==='crude')stats.intelligencePct=n('intelligence_pct');
 const bauble=h.neutralItem==='enchanters_bauble'&&h.neutralItemMeta;
 if(bauble){const item=C.effectiveItem(g,h,ITEM_BY_ID.enchanters_bauble,bauble),boost=1+(v(item,'enchantment_bonus_base')+(bauble.recrafts||0)*v(item,'enchantment_bonus_growth'))/100;for(const key of Object.keys(stats))stats[key]*=boost;}
 return stats;
}
const handlers={};
const define=(ids,target,run,validate)=>{for(const id of ids.split(' '))handlers[id]={target,run,validate};};
const buff=(g,h,i,duration,fields)=>status(g,h,'itemBuff:'+i.id,i,{positive:true,duration,...fields});
define('ash_legion_shield','self',(g,h,e)=>{const i=e.item;buff(g,h,i,v(i,'duration'),{flatSpeed:-v(i,'slow')});for(const target of allies(g,h,v(i,'block_radius')).filter(t=>t.kind==='hero'||t.ownerId))status(g,target,'itemBarrier:'+i.id,i,{positive:true,duration:v(i,'duration'),barrier:v(i,'block_amount'),barrierType:'physical'});});
define('kobold_cup','self',(g,h,e)=>{for(const target of allies(g,h,v(e.item,'buff_radius')))buff(g,target,e.item,v(e.item,'buff_duration'),{movePercent:v(e.item,'movespeed_pct')});});
define('polliwog_charm','allyUnit',(g,h,e,p,t)=>C.regen(g,t,e.item,v(e.item,'duration'),v(e.item,'regen_boost'),0,h,false,{waterMovePercent:v(e.item,'water_movespeed')}));
define('seeds_of_serenity','point',(g,h,e,p)=>{g.itemZones||=[];g.itemZones.push({type:'neutralRegen',itemId:e.id,sourceId:h.id,x:p.x,y:p.y,radius:v(e.item,'radius'),until:g.time+v(e.item,'duration')});});
define('stonefeather_satchel','self',(g,h,e)=>{e.meta.mode=e.meta.mode==='rocks'?'feathers':'rocks';C.refresh(g,h);});
define('pogo_stick','self',(g,h,e)=>C.forceMove(g,h,{x:h.x+Math.cos(h.angle)*v(e.item,'leap_distance'),y:h.y+Math.sin(h.angle)*v(e.item,'leap_distance')},v(e.item,'leap_distance')/v(e.item,'leap_speed')),(g,h)=>Skills.isRooted(g,h)?{ok:false,reason:'定身期间无法跳跃'}:null);
define('metamorphic_mandible','self',(g,h,e)=>buff(g,h,e.item,v(e.item,'duration'),{magicResistancePct:v(e.item,'bonus_magic_resistance'),movePercent:v(e.item,'bonus_movespeed'),armor:-h.armor*v(e.item,'armor_decrease')/100}));
define('idol_of_screeauk','self',(g,h,e)=>buff(g,h,e.item,v(e.item,'duration'),{evasion:v(e.item,'evasion'),slowResistance:v(e.item,'slow_resist'),flying:true,phased:true}));
define('psychic_headband','enemyUnit',(g,h,e,p,t)=>{const d=distance(h,t)||1;C.forceMove(g,t,{x:t.x+(t.x-h.x)/d*v(e.item,'push_length'),y:t.y+(t.y-h.y)/d*v(e.item,'push_length')},v(e.item,'push_duration'));});
define('brick crippling_crossbow','enemyUnit',(g,h,e,p,t)=>{const impactAt=g.time+distance(h,t)/v(e.item,'projectile_speed',1400);g.itemZones||=[];g.itemZones.push({type:'neutralProjectile',sourceId:h.id,itemId:e.id,targetId:t.id,x:h.x,y:h.y,speed:v(e.item,'projectile_speed',1400),lastTick:g.time,until:g.time+10,item:e.item});g._effect('projectile',h.x,h.y,{tx:t.x,ty:t.y,life:impactAt-g.time,color:e.id==='brick'?'#ad7d65':'#a6b897'});});
define('jidi_pollen_bag','self',(g,h,e)=>{const i=e.item;for(const t of enemies(g,h,h,v(i,'debuff_radius')))dot(g,t,i,v(i,'debuff_duration'),t.maxHp*v(i,'hp_damage')/100/v(i,'debuff_duration'),h,'magical',{healReduction:v(i,'health_regen_loss'),tickInterval:1,tickDamage:t.maxHp*v(i,'hp_damage')/100/v(i,'debuff_duration'),nextTick:g.time+1});});
define('mana_draught','allyOptional',(g,h,e,p,t)=>{const amount=v(e.item,'mana_restore')+t.maxMana*v(e.item,'mana_restore_pct')/100;C.regen(g,t,e.item,v(e.item,'heal_duration'),0,amount/v(e.item,'heal_duration'),h,false,{waterManaAcceleration:v(e.item,'water_acceleration')});});
define('flicker','self',(g,h,e)=>{dispel(g,h);h.projectileDisjoint=(h.projectileDisjoint||0)+1;if((h.lastHeroDamageAt??-Infinity)+3>g.time)return;const angle=h.angle+(g._random()-.5)*Math.PI,d=v(e.item,'min_range')+g._random()*(v(e.item,'max_range')-v(e.item,'min_range'));C.teleport(g,h,{x:h.x+Math.cos(angle)*d,y:h.y+Math.sin(angle)*d});});
define('minotaur_horn','self',(g,h,e)=>{dispel(g,h);buff(g,h,e.item,v(e.item,'duration'),{debuffImmune:true,magicResistancePct:v(e.item,'magic_resist'),undispellable:true});});
define('heavy_blade','point',(g,h,e,p)=>{for(const t of g.entities)if(alive(t)&&distance(p,t)<=v(e.item,'radius')){if(t.team===h.team)dispel(g,t);else if(!C.immune(g,t))for(const [id,s]of Object.entries(t.statuses||{}))if(s.positive&&!s.undispellable)delete t.statuses[id];}});
define('riftshadow_prism','self',(g,h,e)=>{h.hp=Math.max(1,h.hp*(1-v(e.item,'health_cost')/100));for(const clone of C.illusion(g,h,1,v(e.item,'duration'),v(e.item,'outgoing_damage'),v(e.item,'incoming_damage'),{type:'strong'})){clone.itemPotency=v(e.item,'illusion_effectiveness');clone.illusionOutgoing=v(e.item,'outgoing_damage')/100;clone.illusionIncoming=v(e.item,'incoming_damage')/100;clone.hp=clone.maxHp;}});
define('fallen_sky','point',(g,h,e,p)=>{g.itemZones||=[];g.itemZones.push({type:'neutralFallenSky',sourceId:h.id,itemId:e.id,x:p.x,y:p.y,impactAt:g.time+v(e.item,'land_time'),until:g.time+v(e.item,'land_time')+1,item:e.item});buff(g,h,e.item,v(e.item,'land_time'),{invulnerable:true,disarmed:true,stunned:true});},(g,h)=>Skills.isRooted(g,h)?{ok:false,reason:'定身期间无法跃迁'}:(h.lastHeroDamageAt??-Infinity)+3>g.time?{ok:false,reason:'受到英雄伤害后暂时无法使用'}:null);
define('demonicon','self',(g,h,e)=>g._summonNeutralDemons?.(h,v(e.item,'summon_duration')));
const adjectiveLabels={Wings:'有翼',Horns:'有角',Legs:'有腿',Steed:'骑乘',Nose:'有鼻',Fuzzy:'毛茸茸',Bearded:'有胡须',Female:'女性',BadTeeth:'坏牙齿',Cape:'披风',NicePecs:'胸肌发达',Potbelly:'大肚子',Parent:'为人父母',Arachnophobic:'害怕蜘蛛',Undead:'不死',Aquatic:'水生',Demon:'恶魔',Spirit:'灵体',Flying:'飞行',Cute:'可爱',Fiery:'火焰',Icy:'冰霜',Blue:'蓝色',Green:'绿色',Red:'红色',Purple:'紫色',Yellow:'黄色',Mask:'面具'};
export function ledgerTargets(g,h,e){
 const foes=[...new Map(g.entities.filter(t=>t.kind==='hero'&&t.team!==h.team&&!t.temporaryHero).map(t=>[t.id,t])).values()],networth=t=>(t.gold||0)+itemEntries(t).filter(x=>x.meta.ownerId===t.id).reduce((sum,x)=>sum+(ITEM_BY_ID[x.id]?.cost||0),0),candidates=[];
 for(const [id,name,field]of [['Beefy','壮硕','strength'],['Deft','灵巧','agility'],['Savvy','聪慧','intelligence'],['Wealthy','富裕','networth']])candidates.push({id,name,heroes:[...foes].sort((a,b)=>(field==='networth'?networth(b)-networth(a):(b[field]||0)-(a[field]||0))).slice(0,3)});
 const adjectives=new Set(foes.flatMap(t=>Object.keys(NEUTRAL_HERO_ADJECTIVES[t.heroId]||{})));
 for(const adjective of [...adjectives].sort()){const heroes=foes.filter(t=>(NEUTRAL_HERO_ADJECTIVES[t.heroId]?.[adjective]||0)>0);if(heroes.length>=2&&heroes.length<=5)candidates.push({id:adjective,name:adjectiveLabels[adjective]||adjective,heroes});}
 const eligible=candidates.filter(t=>t.heroes.length>=Math.min(2,foes.length)&&t.heroes.length<=5),chosen=eligible[Math.floor(g._random()*eligible.length)];
 for(const t of g.entities)delete t.statuses?.['redLedgerWanted:'+h.id];e.meta.hitList=chosen?.heroes.map(t=>t.id)||[];e.meta.closed=[];e.meta.trait=chosen?{id:chosen.id,name:chosen.name}:null;
 for(const t of chosen?.heroes||[])status(g,t,'redLedgerWanted:'+h.id,e.item,{duration:1e9,name:'悬红：'+chosen.name,sourceId:h.id,bountyTarget:true,bountyGold:v(e.item,'base_gold')+Math.max(0,t.level-h.level)*v(e.item,'gold_per_level_difference'),undispellable:true});
}
define('red_ledger','self',ledgerTargets);
define('foragers_mana','allyOptional',(g,h,e,p,t)=>{restoreMana(t,v(e.item,'replenish_amount')+t.maxMana*v(e.item,'mana_pct')/100);C.consume(g,h,e);});
define('foragers_health','allyHero',(g,h,e,p,t)=>{C.regen(g,t,e.item,v(e.item,'buff_duration'),t.maxHp*v(e.item,'health_regen_pct')/100,0,h,true,{breakOnlyOnAttack:true});C.consume(g,h,e);});
define('foragers_stats','allyOptional',(g,h,e,p,t)=>{t.foragersConsumedStats||={};const attribute=t.primaryAttribute||'strength';if(attribute==='universal')for(const key of ['strength','agility','intelligence'])t.foragersConsumedStats[key]=(t.foragersConsumedStats[key]||0)+v(e.item,'bonus_stat_uni');else t.foragersConsumedStats[attribute]=(t.foragersConsumedStats[attribute]||0)+v(e.item,'bonus_stat');C.consume(g,h,e);C.refresh(g,t);});
export const NEUTRAL_ACTIVE_HANDLERS=Object.freeze(handlers);
export function neutralAttackModifiers(g,h,target,result,entries){
 for(const e of entries){const i=e.item;
  if(e.id==='imp_claw'&&(e.meta.procReadyAt||0)<=g.time){const crit=v(i,'crit_multiplier')/100;if(crit>(result.criticalMultiplier||1)){result.damage*=crit/(result.criticalMultiplier||1);result.criticalMultiplier=crit;result.itemCritical=true;}e.meta.procReadyAt=g.time+i.cooldown;}
  if(e.id==='weighted_dice'&&target.kind!=='hero'){const span=(h.damageMax||h.damage)-(h.damageMin||h.damage);result.damage+=Math.max(g._random(),g._random())*span-span/2;}
  if(e.id==='gunpowder_gauntlets'&&(e.meta.procReadyAt||0)<=g.time)result.damage+=v(i,'bonus_damage');
 }
}
export function neutralAfterAttack(g,h,target,result,dealt,entries){
 for(const e of entries){const i=C.attackItem(g,h,e.item,result),m=e.meta;
  if(e.id==='possessed_mask'&&dealt>0)heal(g,h,v(i,'lifesteal'),h);
  if(e.id==='enhancement_audacious')g.damage(target,v(i,'magic_damage'),h,'magical',{itemProc:true});
  if(e.id==='serrated_shiv'&&(m.procReadyAt||0)<=g.time&&g._random()*100<v(i,'proc_chance')){m.procReadyAt=g.time+i.cooldown;g.damage(target,target.isRoshan?v(i,'hp_dmg_rosh'):target.hp*v(i,'hp_dmg')/100,h,'physical',{itemProc:true,attackDamage:true});}
  if(e.id==='mind_breaker'&&(m.procReadyAt||0)<=g.time&&!C.immune(g,target)){m.procReadyAt=g.time+i.cooldown;status(g,target,'mindBreaker',i,{duration:v(i,'duration'),silenced:true,sourceId:h.id});}
  if(e.id==='vile_phial'){const old=C.active(g,target,'vilePhialStacks'),stacks=(old?.stacks||0)+1;status(g,target,'vilePhialStacks',i,{duration:v(i,'counter_duration'),stacks,sourceId:h.id});if(stacks>=v(i,'required_hits')){delete target.statuses.vilePhialStacks;dot(g,target,i,v(i,'poison_duration'),v(i,'damage_per_second'),h,'magical',{healReduction:v(i,'heal_reduce'),itemPotency:C.itemPotency(h,result)});}}
  if(e.id==='heavy_blade')g.damage(target,target.maxMana*v(i,'damage')/100,h,'physical',{itemProc:true,attackDamage:true});
  if(e.id==='gunpowder_gauntlets'&&(m.procReadyAt||0)<=g.time){m.procReadyAt=g.time+i.cooldown;for(const t of enemies(g,h,target,v(i,'splash_radius')))if(t!==target)g.damage(t,result.damage*v(i,'splash_pct')/100,h,'physical',{itemProc:true,attackDamage:true});}
 }
}
export function neutralIncomingDamage(g,h,amount,source,type,options,entries){
 for(const e of entries){const i=e.item,m=e.meta;
  if(e.id==='dandelion_amulet'&&type==='magical'&&amount>=v(i,'min_damage')&&(m.procReadyAt||0)<=g.time){m.procReadyAt=g.time+i.cooldown;amount=Math.max(0,amount-v(i,'magic_block'));}
  if(e.id==='safety_bubble'){const s=C.active(g,h,'safetyBubble');if(s){const blocked=Math.min(amount,s.barrier);s.barrier-=blocked;amount-=blocked;}m.lastDamageAt=g.time;}
  if(e.id==='prophets_pendulum'&&!options.delayed&&amount>0){const delayed=amount*v(i,'delay_pct')/100;amount-=delayed;status(g,h,'pendulum:'+g._id('debt'),i,{duration:v(i,'delay_time'),sourceId:source?.id,debtPerSecond:delayed/v(i,'delay_time'),pendulumDebt:true,undispellable:true});}
 }
 return amount;
}
export function neutralAfterDamage(g,h,dealt,source,type,options,entries){
 if(options.reflected)return;
 for(const e of entries){const i=e.item,m=e.meta;
  if(e.id==='chipped_vest'&&options.attack&&alive(source))g.damage(source,v(i,source.kind==='hero'?'damage_return_hero':'damage_return_creep'),h,type,{reflected:true});
  if(e.id==='defiant_shell'&&options.attack&&alive(source)&&distance(h,source)<=h.range&&(m.procReadyAt||0)<=g.time){m.procReadyAt=g.time+i.cooldown;launchAttack(g,h,source,{damage:g.combatStats(h,source).damage*v(i,'counter_damage')/100,secondary:true,trueStrike:false});}
  if(e.id==='rattlecage'){if((m.damageAt??-Infinity)+v(i,'damage_reset_interval')<g.time)m.damage=0;m.damageAt=g.time;m.damage=(m.damage||0)+dealt;if(m.damage>=v(i,'damage_threshold')){m.damage-=v(i,'damage_threshold');for(const t of enemies(g,h,h,v(i,'radius')).sort((a,b)=>distance(a,h)-distance(b,h)).slice(0,v(i,'target_count'))){g.damage(t,v(i,'projectile_damage'),h,'magical',{itemProc:true});slow(g,t,i,v(i,'slow_duration'),v(i,'slow'),h);}}}
 }
}
export function neutralOutgoingDamage(g,h,target,amount,type,options,entries){
 for(const e of entries){const i=e.item;if(e.id==='divine_regalia'&&!e.meta.broken)amount*=1+v(i,'outgoing_damage')/100;if(e.id==='partisans_brand'&&!options.attack&&!options.attackDamage&&(target?.kind==='hero'||target?.ownerId))amount*=1+v(i,'bonus_damage_pct')/100;}
 return amount;
}
export function neutralSpellCast(g,h,skill,entries){
 for(const e of entries){const i=e.item;if(e.id==='spellslinger')C.regen(g,h,i,v(i,'duration'),0,(skill?.mana||0)*v(i,'mana_pct')/100/v(i,'duration'),h);if(e.id==='dezun_bloodrite')h.hp=Math.max(1,h.hp-(skill?.mana||0)*v(i,'health_pct')/100);}
}
export function neutralSpellDamage(g,h,target,dealt,options,entries){
 if(options.itemProc||options.reflected||options.attack||options.attackDamage)return;
 for(const e of entries)if(e.id==='conjurers_catalyst'&&dealt>=v(e.item,'damage_threshold')&&(e.meta.procReadyAt||0)<=g.time){e.meta.procReadyAt=g.time+v(e.item,'cooldown');for(const t of enemies(g,h,target,v(e.item,'damage_aoe')))if(t!==target)g.damage(t,v(e.item,target.kind==='hero'?'damage':'damage_creep'),h,'magical',{itemProc:true});}
}
export function tickNeutralUnit(g,h,dt,entries){
 for(const e of entries){const i=e.item,m=e.meta;
  if(e.id==='harmonizer'){const key=(h.cooldowns||[]).map(t=>t>0?1:0).join('');if(m.statSignature!==key){m.statSignature=key;C.refresh(g,h);}}
  if(e.id==='helm_of_the_hivemind'){const count=new Set(g.entities.filter(t=>t.kind==='hero'&&t.neutralItem===e.id).map(t=>t.id)).size;if(m.hiveCount!==count){m.hiveCount=count;C.refresh(g,h);}}
  if(e.id==='safety_bubble'&&((m.lastDamageAt??-Infinity)+v(i,'restore_time')<=g.time)&&(!C.active(g,h,'safetyBubble')||C.active(g,h,'safetyBubble').barrier<v(i,'shield')))status(g,h,'safetyBubble',i,{positive:true,duration:1e9,barrier:v(i,'shield'),barrierType:'neutralBubble',undispellable:true});
  if(e.id==='stormcrafter'&&(m.procReadyAt||0)<=g.time){const targets=enemies(g,h,h,v(i,'range')).slice(0,v(i,'max_targets'));if(targets.length){m.procReadyAt=g.time+i.cooldown;for(const t of targets){g.damage(t,v(i,'damage'),h,'magical',{itemProc:true});slow(g,t,i,v(i,'slow_duration'),v(i,'slow'),h);}}}
  if(e.id==='giants_ring')for(const t of enemies(g,h,h,v(i,'damage_radius')))g.damage(t,h.strength*v(i,'pct_str_damage_per_second')/100*dt,h,'magical',{itemProc:true});
  if(e.id==='red_ledger'&&!m.hitList)ledgerTargets(g,h,e);
  if(e.id==='foragers_kit'&&(m.procReadyAt||0)<=g.time){
   const trees=C.allTrees(g),treeKey=t=>t.treeIndex??t.id;m.forageTrees=(m.forageTrees||[]).filter(t=>distance(h,t)<=v(i,'old_destroy_radius')&&trees.some(tree=>treeKey(tree)===treeKey(t)));
   if(g.time>=(m.nextTreeAt||0)){m.nextTreeAt=g.time+v(i,'tree_creation_interval');const available=trees.filter(t=>distance(h,t)<=v(i,'radius')&&!m.forageTrees.some(old=>treeKey(old)===treeKey(t)));while(m.forageTrees.length<v(i,'max_trees')&&available.length)m.forageTrees.push(available.splice(Math.floor(g._random()*available.length),1)[0]);for(const tree of m.forageTrees)g._effect('ring',tree.x,tree.y,{radius:45,life:v(i,'tree_creation_interval'),color:'#b7cc81'});}
   const tree=m.forageTrees.find(t=>distance(h,t)<=v(i,'tree_radius'));
   if(tree){if(!m.forageOrigin||distance(h,m.forageOrigin)>5){m.forageStart=g.time;m.forageOrigin={x:h.x,y:h.y};}if(g.time-m.forageStart>=(i.channelTime||.75)){
    const reward=['foragers_stats','foragers_mana','foragers_health','gold'][Math.floor(g._random()*4)];const received=reward==='gold'?{ok:true}:giveItem(g,h,reward);if(received.ok){if(reward==='gold')h.gold+=v(i,'gold_amount');m.procReadyAt=g.time+i.cooldown;m.forageOrigin=null;m.forageStart=null;m.forageTrees=m.forageTrees.filter(t=>treeKey(t)!==treeKey(tree));g._effect('text',h.x,h.y-40,{text:reward==='gold'?'+'+v(i,'gold_amount'):ITEM_BY_ID[reward].name,life:1,color:'#dbb56d'});}
   }}else {m.forageStart=null;m.forageOrigin=null;}
  }
 }
}
export function tickNeutralWorld(g,zone,h,item,dt){
 if(zone.type==='neutralRegen'){
  for(const target of C.areaHealingRecipients(g,{x:zone.x,y:zone.y,team:h.team},zone.radius)){
   const amount=v(item,'aura_health_regen')+(target.hpRegen||0)*v(item,'aura_health_regen_pct')/100;
   C.healInArea(g,target,amount*dt,h,true);
  }
 }
 if(zone.type==='neutralProjectile'){const t=g.entities.find(t=>t.id===zone.targetId);if(!alive(t)||C.invulnerable(g,t)){zone.until=g.time;return;}const d=distance(zone,t),travel=zone.speed*(g.time-zone.lastTick);zone.lastTick=g.time;if(d>travel){zone.x+=(t.x-zone.x)/d*travel;zone.y+=(t.y-zone.y)/d*travel;return;}zone.until=g.time;const i=zone.item||item;if(i.id==='brick'){let remaining=v(i,'barrier_damage');for(const type of ['magical','physical','all'])for(const s of Object.values(t.statuses||{}))if(s.barrier&&s.barrierType===type){const amount=Math.min(remaining,s.barrier);s.barrier-=amount;remaining-=amount;}g.damage(t,v(i,'damage'),h,'physical',{itemProc:true});}else{g.damage(t,v(i,'damage'),h,'physical',{itemProc:true});slow(g,t,i,v(i,'duration'),v(i,'slow_pct'),h,{healReduction:v(i,'heal_reduce')});}}
 if(zone.type==='neutralFallenSky'&&zone.impactAt<=g.time){const i=zone.item||item;C.teleport(g,h,zone);for(const t of enemies(g,h,zone,v(i,'impact_radius'),true)){const building=C.building(t);g.damage(t,v(i,building?'impact_damage_buildings':'impact_damage_units'),h,'magical',{itemProc:true});if(!building)C.stun(g,t,v(i,'stun_duration'),h);dot(g,t,i,v(i,'burn_duration'),v(i,building?'burn_dps_buildings':'burn_dps_units'),h);}zone.until=g.time;}
}
export function neutralOnDeath(g,h,killer,allEntries){
 if(h.neutralItem==='divine_regalia'){h.neutralItemMeta.broken=true;h.neutralEnchantment=null;h.neutralEnchantmentMeta=null;}
 for(const [ally,entries]of allEntries)if(ally.team!==h.team)for(const e of entries)if(e.id==='red_ledger'&&e.meta.hitList?.includes(h.id)&&!e.meta.closed?.includes(h.id)&&(killer===ally||distance(ally,h)<=1400)){
  const gold=v(e.item,'base_gold')+Math.max(0,h.level-ally.level)*v(e.item,'gold_per_level_difference');ally.gold+=Math.floor(gold*(killer===ally?1:v(e.item,'assist_gold_pct')/100));e.meta.closed||=[];e.meta.closed.push(h.id);delete h.statuses?.['redLedgerWanted:'+ally.id];if(e.meta.closed.length===e.meta.hitList.length)ledgerTargets(g,ally,e);
 }
}

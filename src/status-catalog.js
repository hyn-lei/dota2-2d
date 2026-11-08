import { abilityAt } from './ability-data.js';
import { auraManaSources, hasStatusFlag, isInvulnerable } from './hero-runtime.js';
import { marksmanshipActive } from './drow-runtime.js';
import { ITEM_BY_ID } from './item-data.js';
import { BASES } from './map-data.js';
import {flagbearerAura} from './unit-auras.js';

// Display metadata is separate from combat modifiers: these records never grant stats.
export const STATUS_ABILITY_IDS={
 call:'axe_berserkers_call',taunt:'axe_berserkers_call',hunger:'axe_battle_hunger',helix:'axe_counter_helix',helixReduction:'axe_counter_helix',culling:'axe_culling_blade',cullingArmor:'axe_culling_blade',oneManArmy:'axe_one_man_army',
 nova:'crystal_maiden_crystal_nova',frostbite:'crystal_maiden_frostbite',barrier:'crystal_maiden_glacial_guard',freezingSlow:'crystal_maiden_freezing_field',freezingField:'crystal_maiden_freezing_field',arcaneAura:'crystal_maiden_brilliance_aura',
 spin:'juggernaut_blade_fury',bladeform:'juggernaut_bladeform',healingWard:'juggernaut_healing_ward',
 windrun:'windrunner_windrun',focus:'windrunner_focusfire',powershot:'windrunner_powershot',tailwind:'windrunner_tailwind',
 torrent:'kunkka_torrent',torrentSlow:'kunkka_torrent',xmark:'kunkka_x_marks_the_spot',rum:'kunkka_ghostship',rumdebt:'kunkka_ghostship',tide:'kunkka_tidebringer',
 ogreIgnite:'ogre_magi_ignite',ogreBloodlust:'ogre_magi_bloodlust',bloodlust:'ogre_magi_bloodlust',ogreFireShield:'ogre_magi_smash',
 drowFrost:'drow_ranger_frost_arrows',drowHypothermia:'drow_ranger_frost_arrows',hypothermiaBurst:'drow_ranger_frost_arrows',drowGustSilence:'drow_ranger_wave_of_silence',drowGustKnockback:'drow_ranger_wave_of_silence',gustSpeed:'drow_ranger_wave_of_silence',glacierKnockback:'drow_ranger_glacier',glacier:'drow_ranger_glacier',trueshot:'drow_ranger_trueshot',marksmanship:'drow_ranger_marksmanship',flagbearerAura:'flagbearer_creep_aura_effect',backdoorProtection:'backdoor_protection',courierBurst:'courier_burst',courierShield:'courier_shield'
};
const alive=e=>e&&!e.dead&&e.hp>0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const num=n=>Number((n||0).toFixed(1));
const persistent=(id,name,description,fields={})=>({id,name,description,positive:true,until:Infinity,...fields});

/** Effects computed outside unit.statuses, using the same state as the simulation. */
export function derivedStatusEffects(g,h){
 if(!g||!alive(h))return [];
 const effects=[];
 const flagAura=flagbearerAura(g,h);
 if(flagAura)effects.push(persistent('flagbearerAura','鼓舞光环',`生命恢复 +${flagAura.hpRegen}/秒，魔法抗性 +${num(flagAura.magicResistance*100)}%。`,{sourceId:flagAura.sourceId}));
 for(const [index,id]of (h.inventory||[]).entries())if(id==='armlet'){
  const meta=h.inventoryMeta?.[index],item=ITEM_BY_ID.armlet;
  if(meta?.mode==='on'&&meta.ownerId===h.id&&(meta.readyAt||0)<=g.time)effects.push(persistent('armletUnholy','邪恶之力',`力量 +${num(meta.armletStrength??item.values.unholy_bonus_strength)}，攻击力 +${item.values.unholy_bonus_damage}，护甲 +${item.values.unholy_bonus_armor}。每秒失去 ${item.values.unholy_health_drain_per_second} 生命。`,{itemId:id}));
 }
 if(h.kind==='hero'){
  const mana=auraManaSources(g,h);
  if(mana.length)effects.push(persistent('arcaneAura','奥术光环',`魔法恢复 +${num(Math.max(...mana.map(s=>s.value)))}/秒。${mana.some(s=>s.amp)?`自身魔法恢复增强 ${num(Math.max(...mana.map(s=>s.amp)))}%。`:''}`));
  if(h.trueshotAgility>0)effects.push(persistent('trueshot','精准光环',`敏捷 +${num(h.trueshotAgility)}。来自卓尔游侠的精准光环。`));
  if(h.heroId==='axe'&&h.cullingStacks>0){const s=abilityAt(h.heroId,3,h.abilityLevels?.[3]||0,h.talents||[],h);effects.push(persistent('cullingArmor','淘汰之刃永久护甲',`永久护甲 +${num(h.cullingStacks*s.values.armor_per_stack)}。`,{stacks:h.cullingStacks}));}
  if(h.heroId==='drow_ranger'){
   const s=abilityAt(h.heroId,3,h.abilityLevels?.[3]||0,h.talents||[],h);
   if(marksmanshipActive(g,h,s))effects.push(persistent('marksmanship','射手天赋',`${s.values.chance}% 概率触发精准攻击，额外伤害 ${s.values.bonus_damage}。${s.values.disable_range} 范围内有可见敌方英雄时失效；冰川上保持生效。`));
  }
  const base=BASES[h.team];
  if(base&&distance(h,base)<1200)effects.push(persistent('fountainRegen','泉水恢复','每秒恢复 5% 最大生命、6% 最大魔法和 14 点魔法。',{icon:'home'}));
  for(const [flag,itemId,name]of [['consumedScepter','ultimate_scepter_2','阿哈利姆福佑'],['consumedShard','aghanims_shard','阿哈利姆魔晶'],['moonShard','moon_shard','月之碎片']])if(h[flag])effects.push(persistent('consumed:'+itemId,name,ITEM_BY_ID[itemId]?.description||'已永久获得该物品效果。',{itemId}));
  for(const [index,itemId]of (h.inventory||[]).entries()){
   const meta=h.inventoryMeta?.[index];if(!meta||meta.ownerId!==h.id||(meta.readyAt||0)>g.time)continue;
   if(itemId==='sphere'&&!(meta.cooldownRemaining>0))effects.push(persistent('spellBlock','林肯法球','抵挡下一次敌方指向性法术。',{itemId}));
   if(itemId==='armlet'&&meta.mode==='on')effects.push(persistent('armlet','邪恶之力',ITEM_BY_ID.armlet.description,{itemId}));
   if(itemId==='tranquil_boots'&&meta.brokenUntil>g.time)effects.push({id:'tranquilBroken',name:'静谧之鞋失效',description:'暂时失去生命恢复与部分移动速度加成。',positive:false,until:meta.brokenUntil,duration:ITEM_BY_ID[itemId].values.break_time,itemId});
  }
 }
 for(const record of h.itemAura?.displayEffects||[]){const item=ITEM_BY_ID[record.itemId];if(item)effects.push(persistent(`itemAura:${item.id}:${record.positive?'ally':'enemy'}`,`${item.name}光环`,item.description,{itemId:item.id,positive:record.positive}));}
 if(h.itemAura?.radiance&&!isInvulnerable(g,h))effects.push(persistent('radianceBurn','辉耀灼烧',`每秒受到 ${h.itemAura.radiance.dps} 魔法伤害。`,{itemId:'radiance',positive:false}));
 for(const ward of g.entities)if(alive(ward)&&ward.kind==='ward'&&!ward.wardType&&ward.team===h.team&&ward.expiresAt>g.time&&ward.healRadius&&['hero','creep','neutral','illusion','summon'].includes(h.kind)&&distance(h,ward)<=ward.healRadius)effects.push(persistent('healingWard','治疗守卫',`每秒恢复 ${ward.healPct}% 最大生命。`));
 for(const z of g.itemZones||[])if(z.type==='drowGlacier'&&z.team===h.team&&z.until>g.time&&h.range>200&&distance(h,z)<=z.radius)effects.push({id:'glacier',name:'冰川',description:`攻击距离 +${z.skill.values.attack_range_bonus}。卓尔游侠的射手天赋保持生效。`,positive:true,startedAt:z.startedAt,until:z.until});
 if(g.isProtected(h))effects.push(persistent('structureProtection','建筑保护','前置建筑尚存，当前建筑处于无敌状态。',{icon:'shield'}));
 if(h.backdoorActive)effects.push(persistent('backdoorProtection','偷塔保护','受到的伤害减少 50%，并每秒修复 90 点生命。敌方兵线进入后失效。',{icon:'shield'}));
 if(h.forcedMotion?.until>g.time)effects.push({id:'forcedMotion',name:'强制位移',description:'当前正在被推送或牵引。',positive:false,startedAt:h.forcedMotion.startedAt,until:h.forcedMotion.until,icon:'wind'});
 if(h.kind==='courier'&&h.burstUntil>g.time)effects.push({id:'courierBurst',name:'信使加速',description:'移动速度提升 50%。',positive:true,until:h.burstUntil,duration:6,icon:'boots'});
 if(h.kind==='courier'&&h.shieldUntil>g.time)effects.push({id:'courierShield',name:'信使护盾',description:'暂时免疫伤害。',positive:true,until:h.shieldUntil,duration:2,icon:'shield'});
 return effects;
}

export function statusImage(id,raw,unit,g){
 if(raw.image)return raw.image;
 if(raw.itemId&&ITEM_BY_ID[raw.itemId])return ITEM_BY_ID[raw.itemId].image;
 let ability=STATUS_ABILITY_IDS[id]||STATUS_ABILITY_IDS[id.split(':')[0]];
 if(raw.hunger)ability='axe_battle_hunger';
 if(raw.helixReduction)ability='axe_counter_helix';
 const source=g?.entities.find(e=>e.id===raw.sourceId);
 if(id==='invulnerable'&&unit?.heroId==='juggernaut')ability='juggernaut_omni_slash';
 if(id==='channel'||id==='casting')ability=unit?.channel?.skill?.id||unit?.castPhase?.skill?.id||(unit?.heroId==='crystal_maiden'?'crystal_maiden_freezing_field':unit?.heroId==='drow_ranger'?'drow_ranger_multishot':null);
 if(id==='stun')ability=source?.heroId==='ogre_magi'?'ogre_magi_fireblast':source?.heroId==='kunkka'?'kunkka_torrent':source?.heroId==='windranger'?'windrunner_shackleshot':null;
 if(id==='root'&&source?.heroId==='crystal_maiden')ability='crystal_maiden_frostbite';
 return ability?`assets/abilities/${ability}.png`:null;
}

export function statusDescription(raw){
 if(raw.description)return raw.description;
 const details=[];
 for(const [key,label,suffix]of [['slowPct','移动速度降低','%'],['attackSlow','攻击速度降低',''],['healReduction','生命恢复降低','%'],['attackSpeed','攻击速度增加',''],['armor','护甲调整',''],['movePercent','移动速度调整','%']])if(raw[key])details.push(`${label} ${num(raw[key])}${suffix}。`);
 if(raw.silenced)details.push('无法施放技能。');if(raw.rooted)details.push('无法移动。');if(raw.disarmed)details.push('无法攻击。');if(raw.muted)details.push('无法使用物品。');if(raw.break)details.push('被动技能失效。');
 if(raw.barrier>0)details.push(`剩余屏障 ${num(raw.barrier)}。`);
 return details.join('');
}

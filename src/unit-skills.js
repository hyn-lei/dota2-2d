import {NEUTRAL_ABILITIES} from './unit-data.js';
import {UNIT_SKILL_UI} from './unit-skill-data.js';
import {ITEM_BY_ID} from './item-data.js';
import {MARTYRDOM} from './chen-data.js';
import {creatureActiveIds,creatureSkill,creatureRank} from './neutral-runtime.js';
import {ZEALOT_GROWTH_ID,ZEALOT_GROWTH_DESCRIPTION,zealotGrowthAt} from './zealot-growth.js';

import {flagbearerMagicResistance} from './unit-auras.js';
const value=v=>typeof v==='object'?v?.value:v;
const numeric=v=>Number(String(value(v)??0).split(' ')[0])||0;
const commonLabels={damage:'伤害',radius:'作用范围',duration:'持续时间',range:'作用距离',bonus_gold:'额外金币',bonus_xp:'额外经验',bonus_magic_resistance_per_interval:'每次成长魔抗 %',maximum_intervals:'最多成长次数',incoming_controlled_unit_penalty:'受控制单位攻击伤害调整 %'};
const text=s=>String(s??'').replace(/\\n|<br\s*\/?>/gi,'\n').replace(/\\"/g,'"').replace(/<[^>]*>/g,'');
export function unitSkillIds(unit){
 if(unit.kind==='courier')return ['courier_return_to_base','courier_transfer_items','courier_go_to_secretshop','courier_burst','courier_shield'];
 if(unit.kind==='ward')return [unit.wardType?`item_${unit.wardType==='sentry'?'ward_sentry':'ward_observer'}`:'juggernaut_healing_ward'];
 const ids=(unit.abilities||[]).filter(id=>!NEUTRAL_ABILITIES[id]?.behavior.includes('HIDDEN'));
 return unit.zealot&&!ids.includes(ZEALOT_GROWTH_ID)?[...ids,ZEALOT_GROWTH_ID]:ids;
}
export function unitSkill(g,unit,id){
 if(id===ZEALOT_GROWTH_ID){
  const owner=g.entities.find(e=>e.id===unit.ownerId),growth=unit.zealotGrowth||zealotGrowthAt(owner?.level),level=owner?.level||growth.level;
  return {id,name:'成长',description:ZEALOT_GROWTH_DESCRIPTION,icon:'aura',passive:true,activeIndex:-1,mana:0,cooldown:0,remaining:0,range:0,
   rows:[['陈当前等级',level],['累计成长次数',growth.stacks],['累计攻击伤害',`+${growth.damage}（无上限）`],['累计护甲',`+${growth.armor}（上限 50）`],['累计魔法抗性',`+${growth.magicResistancePct}%（上限 60%）`],['累计攻击速度',`+${growth.attackSpeed}（上限 400）`]],
   notes:['加成从陈第一次升级（升到 2 级）开始累加。','魔法抗性和攻击速度的实际值受战斗上限约束，可点击头像查看。']};
 }
 if(id==='chen_martyrdom')return {...MARTYRDOM,activeIndex:0,remaining:0,castPoint:MARTYRDOM.castPoint,rows:[['基础伤害 / 治疗',MARTYRDOM.values.base_value],['当前生命转化 %',MARTYRDOM.values.current_hp_pct],['友军治疗倍率 %',MARTYRDOM.values.heal_factor],['弹道速度',MARTYRDOM.values.speed]],notes:['施放成功后狂热者牺牲；不会在施法前摇时提前扣血。']};
 if(id.startsWith('item_')){
  const item=ITEM_BY_ID[id.slice(5)];return {id,name:unit.name,description:item.description,image:item.image,passive:true,cooldown:0,remaining:0,mana:0,range:0,rows:[['持续时间 / 秒',Math.max(0,unit.expiresAt-g.time).toFixed(1)],['白天视野',unit.visionDay||0],['夜间视野',unit.visionNight||0],...(unit.trueSight?[['真实视域',unit.trueSight]]:[])],notes:[]};
 }
 const ui=UNIT_SKILL_UI[id]||{name:id,description:'',labels:{},notes:[]},data=NEUTRAL_ABILITIES[id]||ui.definition||{},values=Object.fromEntries(Object.entries(data.values||{}).map(([k,v])=>[k,creatureRank(unit,v)]));
 let passive=!!data.passive,mana=creatureRank(unit,data.manaCost),cooldown=creatureRank(unit,data.cooldown),remaining=Math.max(0,(unit.abilityCooldowns?.[id]||0)-g.time),locked=false;
 if(id==='flagbearer_creep_aura_effect')values.total_magic_resistance=flagbearerMagicResistance(g.time);
 if(id==='juggernaut_healing_ward'){passive=true;values.healing_ward_heal_amount=unit.healPct;values.healing_ward_aura_radius=unit.healRadius;values.duration=Math.max(0,unit.expiresAt-g.time).toFixed(1);}
 if(unit.kind==='courier'){
  const command=id==='courier_burst'?'burst':id==='courier_shield'?'shield':null;
  if(command){cooldown=command==='burst'?120:200;remaining=Math.max(0,(unit[command+'ReadyAt']||0)-g.time);locked=(unit.level||1)<(command==='burst'?10:20);values.duration=command==='burst'?6:2;if(command==='burst')values.movement_speed=50;}
 }
 const substitute=s=>text(s).replace(/%([\w]+)%/g,(_,key)=>values[key]==null?'—':String(values[key]).split(' ')[0]).replace(/%%/g,'%');
 const rows=Object.entries(values).flatMap(([k,v])=>{
  const label=ui.labels?.[k]||commonLabels[k];if(!label||v==null||typeof v==='object')return [];
  return [[text(label).replace(/^%/,'').replace(/：$/,'')+(String(ui.labels?.[k]||'').startsWith('%')?' %':''),String(v).trim().replace(/\s+/g,' / ')]];
 });
 if(data.damage&&numeric(data.damage)&&!rows.some(([label])=>label==='伤害'))rows.unshift(['伤害',creatureRank(unit,data.damage)]);
 const activeIndex=creatureActiveIds(unit).indexOf(id);
 return {id,name:text(ui.name),description:substitute(ui.description),notes:(ui.notes||[]).map(substitute),image:ui.image,passive,mana,cooldown,remaining,range:creatureRank(unit,data.castRange),castPoint:creatureRank(unit,data.castPoint),rows,locked,activeIndex,active:id.startsWith('backdoor_protection')?!!unit.backdoorActive:null};
}


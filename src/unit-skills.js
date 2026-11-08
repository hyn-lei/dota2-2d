import {NEUTRAL_ABILITIES} from './unit-data.js';
import {UNIT_SKILL_UI} from './unit-skill-data.js';
import {ITEM_BY_ID} from './item-data.js';

import {flagbearerMagicResistance} from './unit-auras.js';
const value=v=>typeof v==='object'?v?.value:v;
const numeric=v=>Number(String(value(v)??0).split(' ')[0])||0;
const commonLabels={damage:'伤害',radius:'作用范围',duration:'持续时间',range:'作用距离',bonus_gold:'额外金币',bonus_xp:'额外经验',bonus_magic_resistance_per_interval:'每次成长魔抗 %',maximum_intervals:'最多成长次数',incoming_controlled_unit_penalty:'受控制单位攻击伤害调整 %'};
const text=s=>String(s??'').replace(/\\n|<br\s*\/?>/gi,'\n').replace(/\\"/g,'"').replace(/<[^>]*>/g,'');
export function unitSkillIds(unit){
 if(unit.kind==='courier')return ['courier_return_to_base','courier_transfer_items','courier_go_to_secretshop','courier_burst','courier_shield'];
 if(unit.kind==='ward')return [unit.wardType?`item_${unit.wardType==='sentry'?'ward_sentry':'ward_observer'}`:'juggernaut_healing_ward'];
 return (unit.abilities||[]).filter(id=>!NEUTRAL_ABILITIES[id]?.behavior.includes('HIDDEN'));
}
export function unitSkill(g,unit,id){
 if(id.startsWith('item_')){
  const item=ITEM_BY_ID[id.slice(5)];return {id,name:unit.name,description:item.description,image:item.image,passive:true,cooldown:0,remaining:0,mana:0,range:0,rows:[['持续时间 / 秒',Math.max(0,unit.expiresAt-g.time).toFixed(1)],['白天视野',unit.visionDay||0],['夜间视野',unit.visionNight||0],...(unit.trueSight?[['真实视域',unit.trueSight]]:[])],notes:[]};
 }
 const ui=UNIT_SKILL_UI[id]||{name:id,description:'',labels:{},notes:[]},data=NEUTRAL_ABILITIES[id]||ui.definition||{},values=Object.fromEntries(Object.entries(data.values||{}).map(([k,v])=>[k,value(v)]));
 let passive=!!data.passive,mana=numeric(data.manaCost),cooldown=numeric(data.cooldown),remaining=Math.max(0,(unit.abilityCooldowns?.[id]||0)-g.time),locked=false;
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
 if(data.damage&&numeric(data.damage)&&!rows.some(([label])=>label==='伤害'))rows.unshift(['伤害',data.damage]);
 return {id,name:text(ui.name),description:substitute(ui.description),notes:(ui.notes||[]).map(substitute),image:ui.image,passive,mana,cooldown,remaining,range:numeric(data.castRange),castPoint:numeric(data.castPoint),rows,locked,active:id.startsWith('backdoor_protection')?!!unit.backdoorActive:null};
}


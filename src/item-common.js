import { ITEM_BY_ID } from './item-data.js';
import * as Inventory from './inventory.js';
import * as Skills from './hero-runtime.js';
import { TREES, BASES } from './map-data.js';

export const alive=e=>!!e&&!e.dead&&e.hp>0;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const fighter=e=>['hero','creep','neutral','illusion','summon'].includes(e?.kind);
export const building=e=>['tower','barracks','ancient','fountain','filler'].includes(e?.kind);
export const value=(item,names,fallback=0)=>{for(const name of (Array.isArray(names)?names:[names]))if(Number.isFinite(item?.values?.[name]))return item.values[name];return fallback;};
export const active=(g,e,id)=>{const s=e?.statuses?.[id];return s&&s.startedAt<=g.time&&s.until>g.time?s:null;};
export const hasFlag=(g,e,flag)=>Object.values(e?.statuses||{}).some(s=>s.startedAt<=g.time&&s.until>g.time&&s[flag]);
export const immune=(g,e)=>Skills.debuffImmune?.(g,e)||hasFlag(g,e,'debuffImmune');
export const invulnerable=(g,e)=>Skills.isInvulnerable(g,e)||hasFlag(g,e,'invulnerable');
export const status=(g,e,id,item,fields={})=>Skills.addStatus(g,e,id,{name:item.name,description:item.description||'',icon:item.icon||'relic',duration:value(item,'duration',6),itemId:item.id,...fields});
export function dispel(g,e,strong=false){
 if(Skills.applyDispel)return Skills.applyDispel(g,e,strong);
 for(const [id,s]of Object.entries(e.statuses||{}))if(!s.positive&&!s.undispellable&&(strong||!s.stunned))delete e.statuses[id];
}
export function stun(g,e,duration,h,pierces=false){
 if(Skills.applyStun)return Skills.applyStun(g,e,duration,h,pierces);
 if(immune(g,e)&&!pierces||invulnerable(g,e))return;
 status(g,e,'stun',{id:'stun',name:'眩晕'},{duration,stunned:true,sourceId:h.id});e.buffs.stunUntil=g.time+duration;Skills.interruptCast(g,e,false);
}
export function slow(g,e,item,duration,amount,source,extra={}){
 if(invulnerable(g,e)||immune(g,e))return;
 return status(g,e,'itemSlow:'+item.id,item,{duration,slowPct:Math.abs(amount),sourceId:source?.id,...extra});
}
export function dot(g,e,item,duration,dps,source,type='magical',extra={}){
 if(invulnerable(g,e))return;
 return status(g,e,'itemDot:'+item.id,item,{duration,sourceId:source.id,tickDamage:dps*.25,tickInterval:.25,nextTick:g.time+.25,damageType:type,...extra});
}
export function heal(g,e,amount,source){
 const reduction=Object.values(e.statuses||{}).filter(s=>s.until>g.time).reduce((a,s)=>Math.max(a,s.healReduction||0),0);
 const received=Object.values(e.statuses||{}).filter(s=>s.until>g.time).reduce((a,s)=>a+(s.healReceivedAmp||0),0);
 const amp=1+(source?.healAmp||0)/100;
 const result=Math.max(0,amount*amp*(1-reduction/100)*(1+received/100));
 const before=e.hp;e.hp=Math.min(e.maxHp,e.hp+result);return e.hp-before;
}
export function regen(g,e,item,duration,hpPerSec,manaPerSec,source,breakOnDamage=false,extra={}){
 return status(g,e,'itemRegen:'+item.id,item,{positive:true,duration,hpPerSec,manaPerSec,breakOnDamage,sourceId:source.id,...extra});
}
export function allies(g,h,radius,heroesOnly=false){return g.entities.filter(e=>alive(e)&&e.team===h.team&&(heroesOnly?e.kind==='hero':fighter(e))&&distance(e,h)<=radius);}
export function enemies(g,h,point,radius,structures=false){return g.entities.filter(e=>alive(e)&&e.team!==h.team&&(fighter(e)||(structures&&building(e)))&&!invulnerable(g,e)&&distance(e,point)<=radius+(e.radius||0));}
export function equipped(g,h){
 if(h.kind!=='hero')return [];
 return Inventory.itemEntries(h,['inventory','tp']).filter(e=>(e.meta.readyAt||0)<=g.time).map(e=>({...e,item:ITEM_BY_ID[e.id]})).filter(e=>e.item);
}
export function refresh(g,h){
 const hp=h.hp/h.maxHp,mana=h.maxMana?h.mana/h.maxMana:0;g._refreshHero(h);
 h.hp=h.dead?0:Math.max(Number.EPSILON,Math.min(h.maxHp,hp*h.maxHp));h.mana=Math.max(0,Math.min(h.maxMana,mana*h.maxMana));
}
export function consume(g,h,entry,count=1){
 if(Inventory.consumeItemCharge)return Inventory.consumeItemCharge(g,h,entry.area,entry.index,count);
 entry.meta.charges=(entry.meta.charges||1)-count;
 if(entry.meta.charges<=0){h[entry.area][entry.index]=null;h[entry.area+'Meta'][entry.index]=null;}
 refresh(g,h);return {ok:true};
}
export function targetAt(g,h,point,team='enemy',types=['hero','creep','neutral','illusion','summon'],range=Infinity){
 const candidates=g.entities.filter(e=>alive(e)&&types.includes(e.kind)&&!invulnerable(g,e)&&
  (team==='both'||(team==='ally'?e.team===h.team:e.team!==h.team))&&distance(e,point)<=Math.max(e.radius||24,90)&&distance(e,h)<=range+(e.radius||24)&&g.canSee?.(h,e)!==false);
 return candidates.sort((a,b)=>distance(a,point)-distance(b,point))[0];
}
export function forceMove(g,e,to,duration=.5){
 e.forcedMotion={from:{x:e.x,y:e.y},to:g.navigation.nearestWalkable(to),startedAt:g.time,until:g.time+duration};
 e.destination=null;e.navPath=null;e.recallTimer=0;Skills.interruptCast(g,e,false);
}
export function teleport(g,h,point){Object.assign(h,g.navigation.nearestWalkable(g._point(point.x,point.y)));h.navPath=null;h.destination=null;h.targetId=null;h.explicitTarget=null;h.recallTimer=0;}
export function allTrees(g){return [...TREES.filter((_,index)=>!g.cutTrees?.has(index)).map((t,index)=>({...t,treeIndex:TREES.indexOf(t)})),...(g.plantedTrees||[]).filter(t=>t.until>g.time)];}
export function treeAt(g,point,radius=120){return allTrees(g).filter(t=>distance(t,point)<=radius).sort((a,b)=>distance(a,point)-distance(b,point))[0];}
export function rebuildTrees(g){
 g.navigation.updateTrees?.(allTrees(g),g.entities.filter(building));
 for(const e of g.entities)e.navPath=null;
}
export function cutTree(g,tree){
 if(tree.treeIndex!==undefined){g.cutTrees||=new Map();g.cutTrees.set(tree.treeIndex,g.time+180);}
 else g.plantedTrees=(g.plantedTrees||[]).filter(t=>t.id!==tree.id);
 rebuildTrees(g);g._effect('burst',tree.x,tree.y,{radius:45,color:'#a1b873',life:.4});
}
export function plantTree(g,point){g.plantedTrees||=[];g.plantedTrees.push({id:g._id('tree'),x:point.x,y:point.y,until:g.time+20});rebuildTrees(g);}
export function illusion(g,h,count,duration,outgoing,incoming){
 const results=[];
 for(let i=0;i<count;i++){
  const clone=g._unit('illusion',h.team,h.x+(i?50:-50),h.y+35,{...g.combatStats(h),heroId:h.heroId,name:h.name+'幻象',ownerId:h.id,maxHp:h.maxHp,hp:h.hp,maxMana:0,mana:0,radius:24,range:h.range,baseAttackTime:h.baseAttackTime,baseAttackSpeed:h.baseAttackSpeed,attackSpeed:h.attackSpeed,armor:h.armor,magicResistance:h.magicResistance,damage:h.damage,level:h.level,expiresAt:g.time+duration,illusionOutgoing:outgoing/100,illusionIncoming:incoming/100,controlTarget:h.explicitTarget,statuses:{},buffs:{},inventory:[],cooldowns:[]});
  clone.hp=h.hp;g.entities.push(clone);results.push(clone);
 }
 return results;
}
export function baseNearby(h){return distance(h,BASES[h.team])<1200;}

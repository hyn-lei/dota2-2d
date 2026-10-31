import { BASES } from './map-data.js';
import { ITEM_BY_ID } from './item-data.js';
import * as Inventory from './inventory.js';
import { addStatus } from './hero-runtime.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function ensureCourier(g,h){
 let c=g.entities.find(e=>e.kind==='courier'&&e.ownerId===h.id);if(c)return c;
 const base=BASES[h.team];c=g._unit('courier',h.team,base.x,base.y,{name:h.name+'的信使',ownerId:h.id,level:h.level,maxHp:6,hp:6,armor:0,magicResistance:1,speed:290,range:0,damage:0,attackCooldown:Infinity,radius:20,visionDay:200,visionNight:200,command:'idle',cargo:[],cargoMeta:[],burstReadyAt:0,shieldReadyAt:0});
 Inventory.ensureInventory(c);h.courierId=c.id;g.entities.push(c);return c;
}
export function courierCommand(g,h,command){
 if(g.paused||g.status!=='playing')return {ok:false,reason:'当前无法指挥信使'};
 const c=ensureCourier(g,h);if(c.dead)return {ok:false,reason:`信使将在 ${Math.ceil(c.respawnAt-g.time)} 秒后复活`};
 if(!['deliver','return','secret','burst','shield','stop'].includes(command))return {ok:false,reason:'无效信使命令'};
 if(command==='burst'||command==='shield'){
  const level=command==='burst'?10:20;if(h.level<level)return {ok:false,reason:`英雄 ${level} 级解锁此技能`};
  const key=command+'ReadyAt';if(c[key]>g.time)return {ok:false,reason:'信使技能尚未冷却'};
  c[key]=g.time+(command==='burst'?120:200);
  if(command==='burst')c.burstUntil=g.time+6;else addStatus(g,c,'courierShield',{name:'信使护盾',positive:true,invulnerable:true,duration:2,icon:'shield'});
  return {ok:true};
 }
 c.command=command==='stop'?'idle':command==='deliver'?(c.cargo.some(Boolean)?'deliver':'collect'):command;
 if(command==='deliver'&&!c.cargo.some(Boolean)&&!h.stash.some(Boolean))c.command='return';
 c.navPath=null;return {ok:true};
}
export function buyWithCourier(g,h,id){
 const c=ensureCourier(g,h),item=ITEM_BY_ID[id];
 if(!item?.secretShop)return {ok:false,reason:'此入口用于购买神秘商店组件'};
 if(c.dead||!Inventory.shopAccess(c).secret)return {ok:false,reason:'先将信使送到神秘商店'};
 const proxy={...h,x:c.x,y:c.y,dead:false,inventory:[...c.cargo],inventoryMeta:structuredClone(c.cargoMeta),backpack:[],backpackMeta:[],stash:[],stashMeta:[],tp:[],tpMeta:[],quickbuy:[]};
 const quote=Inventory.purchaseQuote(g,proxy,id);if(!quote.ok)return quote;if(quote.slot.area!=='inventory')return {ok:false,reason:'信使物品栏已满'};
 const result=Inventory.buyItem(g,proxy,id);if(!result.ok)return result;
 h.gold=proxy.gold;h.itemSerial=proxy.itemSerial;c.cargo=proxy.inventory;c.cargoMeta=proxy.inventoryMeta;return {ok:true,area:'cargo',itemId:id,cost:result.cost};
}
export function courierDied(g,c,killer){
 const h=g.entities.find(e=>e.id===c.ownerId);c.dead=true;c.hp=0;c.deathTime=g.time;c.respawnAt=g.time+45+5*(h?.level||c.level||1);c.command='idle';c.navPath=null;
 if(killer?.team!==undefined&&killer.team!==c.team)for(const hero of g.entities)if(hero.kind==='hero'&&hero.team===killer.team)hero.gold+=25+5*(h?.level||1);
 g._feed(`${c.name}阵亡，运输物品保留`,1-c.team);
}
export function tickCouriers(g,dt){
 for(const c of g.entities.filter(e=>e.kind==='courier')){
  const h=g.entities.find(e=>e.id===c.ownerId);if(!h)continue;
  c.level=h.level;c.flying=h.level>=4;c.speed=(290+10*(h.level-1))*(c.burstUntil>g.time?1.5:1);
  const base=BASES[c.team];
  if(c.dead){if(g.time>=c.respawnAt){Object.assign(c,{...base,hp:6,dead:false,command:'idle',statuses:{},buffs:{}});}continue;}
  if(distance(c,base)<250)c.hp=6;
  if(!h.isPlayer&&c.command==='idle'&&h.stash.some(Boolean))c.command='collect';
  let goal;
  if(c.command==='collect'||c.command==='return'){
   goal=base;if(distance(c,base)<180){
    if(c.command==='collect'){
     for(const entry of Inventory.itemEntries(h,['stash'])){if(!Inventory.transferItem(g,h,'stash',entry.index,c,['cargo'],true).ok)break;}
     c.command=c.cargo.some(Boolean)?'deliver':'idle';
    }else{for(const entry of Inventory.itemEntries(c,['cargo']))Inventory.transferItem(g,c,'cargo',entry.index,h,['stash'],true);c.command='idle';}
    goal=null;
   }
  }else if(c.command==='deliver'){
   if(h.dead){c.command='return';continue;}goal=h;
   if(distance(c,h)<220){for(const entry of Inventory.itemEntries(c,['cargo']))Inventory.transferItem(g,c,'cargo',entry.index,h,entry.id==='tpscroll'?['tp']:['inventory','backpack'],true);if(!c.cargo.some(Boolean))c.command='return';goal=null;}
  }else if(c.command==='secret'){
   goal=[...Inventory.SECRET_SHOPS].sort((a,b)=>distance(a,base)-distance(b,base))[0];if(distance(c,goal)<200){c.command='shopping';goal=null;}
  }
  if(goal){
   if(c.flying){const d=distance(c,goal),n=Math.min(d,c.speed*dt);c.angle=Math.atan2(goal.y-c.y,goal.x-c.x);c.x+=Math.cos(c.angle)*n;c.y+=Math.sin(c.angle)*n;c.moving=true;}
   else g._move(c,goal,dt,100);
  }
 }
}

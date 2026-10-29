import { ITEMS, ITEM_BY_ID } from './item-data.js';
import { BASES, MAP_OBJECTIVES } from './map-data.js';

export const SLOT_COUNTS = Object.freeze({inventory:6,backpack:3,stash:6});
const areas=Object.keys(SLOT_COUNTS);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const SECRET_SHOPS=(MAP_OBJECTIVES.ent_dota_shop||[]).slice(2);
const validSlot=(area,index)=>areas.includes(area)&&Number.isInteger(index)&&index>=0&&index<SLOT_COUNTS[area];
const gate=g=>g.paused?{ok:false,reason:'游戏已暂停'}:g.status!=='playing'?{ok:false,reason:'对局已经结束'}:{ok:true};

export function ensureInventory(h){
 for(const area of areas){
  h[area]||=[];h[area+'Meta']||=[];
  for(let i=0;i<h[area].length;i++){
   const id=h[area][i];
   if(!id)h[area+'Meta'][i]=null;
   else if(h[area+'Meta'][i]?.itemId!==id)h[area+'Meta'][i]={itemId:id,purchasedAt:-Infinity,readyAt:0};
  }
 }
 h.quickbuy||=[];
}
export function shopAccess(h){
 const base=!h.dead&&distance(h,BASES[h.team])<=1200;
 const secret=!h.dead&&SECRET_SHOPS.some(s=>distance(s,h)<=600);
 return {base,secret,shop:base||secret};
}
export function itemEntries(h,selectedAreas=areas){
 ensureInventory(h);
 return selectedAreas.flatMap(area=>h[area].flatMap((id,index)=>id?[{id,area,index,meta:h[area+'Meta'][index]}]:[]));
}
export function activeEquipment(g,h){
 ensureInventory(h);return h.inventory.filter((id,i)=>id&&(h.inventoryMeta[i]?.readyAt||0)<=g.time+1e-7);
}
function take(h,entry){h[entry.area][entry.index]=null;h[entry.area+'Meta'][entry.index]=null;}
function put(h,area,index,id,meta){h[area][index]=id;h[area+'Meta'][index]={...meta,itemId:id};}
function trim(h){for(const area of areas){while(h[area].length&&!h[area].at(-1))h[area].pop();h[area+'Meta'].length=h[area].length;}}
function emptySlot(h,choices,removed=[]){
 for(const area of choices)for(let index=0;index<SLOT_COUNTS[area];index++)if(!h[area][index]||removed.some(e=>e.area===area&&e.index===index))return {area,index};
 return null;
}
function recipeParts(id,pool,consumed,missing,root=false){
 const owned=!root&&pool.find(e=>e.id===id&&!consumed.includes(e));
 if(owned){consumed.push(owned);return;}
 const item=ITEM_BY_ID[id];
 if(item.components?.length)for(const part of item.components)recipeParts(part,pool,consumed,missing);
 else missing.push(id);
}
export function purchaseQuote(g,h,id){
 ensureInventory(h);const item=ITEM_BY_ID[id];
 if(!item)return {ok:false,reason:'装备不存在',cost:0,missing:[],consumed:[]};
 const access=shopAccess(h),secretSupply=item.secretShop||(item.components||[]).some(id=>ITEM_BY_ID[id].secretShop);
 const storage=access.base?areas:access.secret&&secretSupply?['inventory','backpack']:['stash'];
 const consumed=[],missing=[];recipeParts(id,itemEntries(h,storage),consumed,missing,true);
 const cost=missing.reduce((sum,part)=>sum+ITEM_BY_ID[part].cost,0);
 let slot=emptySlot(h,storage,consumed),resultItem=item;
 // A final component can immediately combine; it does not need a spare slot.
 if(!slot&&!item.components?.length){
  const pool=itemEntries(h,storage);
  for(const upgrade of ITEMS.filter(i=>i.components?.includes(item.id))){
   const parts=[];let usedPurchase=false,complete=true;
   for(const id of upgrade.components){
    if(id===item.id&&!usedPurchase){usedPurchase=true;continue;}
    const part=pool.find(e=>e.id===id&&!parts.includes(e));if(part)parts.push(part);else{complete=false;break;}
   }
   if(complete){slot=emptySlot(h,storage,parts);if(slot){consumed.push(...parts);resultItem=upgrade;break;}}
  }
 }
 let reason=!gate(g).ok?gate(g).reason:missing.some(part=>ITEM_BY_ID[part].secretShop)&&!access.secret?'需要前往神秘商店购买缺少的组件':h.gold<cost?'金币不足':!slot?'可用物品栏已满':null;
 return {ok:!reason,reason,item,resultItem,cost,missing,consumed,slot,access};
}
function removeCompletedQueue(h,completed){if(completed.length)h.quickbuy=h.quickbuy.filter(id=>{const index=completed.indexOf(id);if(index<0)return true;completed.splice(index,1);return false;});}
function assemble(g,h){
 const access=shopAccess(h),groups=access.base?[areas]:[['inventory','backpack'],['stash']],completed=[];
 for(const group of groups){
  let changed=true;
  while(changed){
   changed=false;
   for(const item of ITEMS.filter(i=>i.components?.length)){
    const pool=itemEntries(h,group),parts=[];
    for(const id of item.components){const part=pool.find(e=>e.id===id&&!parts.includes(e));if(part)parts.push(part);}
    if(parts.length!==item.components.length)continue;
    const preferred=parts.some(e=>e.area==='inventory')?'inventory':parts.some(e=>e.area==='backpack')?'backpack':'stash';
    const slot=emptySlot(h,[preferred],parts);if(!slot)continue;
    const meta={purchasedAt:Math.min(...parts.map(e=>e.meta.purchasedAt)),readyAt:Math.max(...parts.map(e=>e.meta.readyAt||0))};
    for(const part of parts)take(h,part);put(h,slot.area,slot.index,item.id,meta);completed.push(item.id);changed=true;break;
   }
  }
 }
 trim(h);removeCompletedQueue(h,[...completed]);return completed;
}
function refresh(g,h){
 const healthRatio=h.maxHp?h.hp/h.maxHp:1,manaRatio=h.maxMana?h.mana/h.maxMana:0;
 trim(h);g._refreshHero(h);
 h.hp=h.dead?0:Math.min(h.maxHp,Math.max(Number.EPSILON,healthRatio*h.maxHp));h.mana=Math.min(h.maxMana,Math.max(0,manaRatio*h.maxMana));
 h.equipmentSignature=activeEquipment(g,h).join('|');
}
export function buyItem(g,h,id){
 const quote=purchaseQuote(g,h,id);if(!quote.ok)return quote;
 const meta={purchasedAt:Math.min(g.time,...quote.consumed.map(e=>e.meta.purchasedAt)),readyAt:Math.max(0,...quote.consumed.map(e=>e.meta.readyAt||0))};
 h.gold-=quote.cost;for(const part of quote.consumed)take(h,part);
 put(h,quote.slot.area,quote.slot.index,quote.resultItem.id,meta);
 const completed=assemble(g,h);removeCompletedQueue(h,[quote.item.id,...(quote.resultItem!==quote.item?[quote.resultItem.id]:[])]);refresh(g,h);
 return {ok:true,itemId:quote.item.id,cost:quote.cost,area:quote.slot.area,completed};
}
export function moveItem(g,h,from,index,to,targetIndex){
 const allowed=gate(g);if(!allowed.ok)return allowed;ensureInventory(h);
 if(!validSlot(from,index)||!validSlot(to,targetIndex))return {ok:false,reason:'无效物品栏'};
 if(!h[from][index])return {ok:false,reason:'该物品栏为空'};
 if((from==='stash'||to==='stash')&&from!==to&&!shopAccess(h).base)return {ok:false,reason:'回到泉水附近才能取放储藏物品'};
 if(from===to&&index===targetIndex)return {ok:true};
 const first={id:h[from][index],meta:h[from+'Meta'][index]},second={id:h[to][targetIndex],meta:h[to+'Meta'][targetIndex]};
 const metaFor=(entry,origin,destination)=>{
  if(!entry.id)return null;const meta={...entry.meta};
  if(destination==='inventory'&&origin==='backpack'&&!shopAccess(h).shop)meta.readyAt=Math.max(meta.readyAt||0,g.time+6);
  else if(destination==='inventory'&&shopAccess(h).shop)meta.readyAt=0;
  return meta;
 };
 put(h,to,targetIndex,first.id,metaFor(first,from,to));
 if(second.id)put(h,from,index,second.id,metaFor(second,to,from));else take(h,{area:from,index});
 assemble(g,h);refresh(g,h);return {ok:true};
}
export function sellValue(g,h,area,index){
 ensureInventory(h);const item=ITEM_BY_ID[h[area]?.[index]],meta=h[area+'Meta']?.[index];
 return item?Math.floor(item.cost*(g.time<(meta?.purchasedAt??-Infinity)+10?1:.5)):0;
}
export function sellItem(g,h,area,index){
 const allowed=gate(g);if(!allowed.ok)return allowed;ensureInventory(h);
 if(!validSlot(area,index)||!h[area][index])return {ok:false,reason:'该物品栏为空'};
 if(area!=='stash'&&!shopAccess(h).shop)return {ok:false,reason:'需要靠近商店才能出售随身物品'};
 const gold=sellValue(g,h,area,index);take(h,{area,index});h.gold+=gold;refresh(g,h);return {ok:true,gold};
}
export function collectStash(g,h){
 const allowed=gate(g);if(!allowed.ok)return allowed;ensureInventory(h);
 if(!shopAccess(h).base)return {ok:false,reason:'回到泉水附近才能取出储藏物品'};
 assemble(g,h);let count=0;
 for(const entry of itemEntries(h,['stash'])){const slot=emptySlot(h,['inventory','backpack']);if(!slot)break;take(h,entry);put(h,slot.area,slot.index,entry.id,{...entry.meta,readyAt:0});count++;assemble(g,h);}
 refresh(g,h);return {ok:true,count};
}
export function tickInventory(g,h){
 ensureInventory(h);
 const atBase=shopAccess(h).base,stashKey=h.stash.join('|');
 if(atBase&&h.stash.some(Boolean)&&(!h.wasAtBaseShop||h.lastStashKey!==stashKey||emptySlot(h,['inventory','backpack'])))collectStash(g,h);
 h.wasAtBaseShop=atBase;h.lastStashKey=h.stash.join('|');
 const signature=activeEquipment(g,h).join('|');
 if(h.equipmentSignature!==undefined&&h.equipmentSignature!==signature)refresh(g,h);
 h.equipmentSignature=signature;
}
export function queueItem(g,h,id,append=false){
 const allowed=gate(g);if(!allowed.ok)return allowed;ensureInventory(h);
 if(!ITEM_BY_ID[id])return {ok:false,reason:'装备不存在'};
 if(!append)h.quickbuy=[];if(h.quickbuy.length>=8)return {ok:false,reason:'快捷购买最多排队 8 件装备'};
 h.quickbuy.push(id);return {ok:true};
}
export function buyQuick(g,h){
 ensureInventory(h);if(!h.quickbuy.length)return {ok:false,reason:'先将物品加入快捷购买'};
 const target=h.quickbuy[0],quote=purchaseQuote(g,h,target);
 if(quote.ok)return buyItem(g,h,target);
 for(const id of quote.missing||[])if(purchaseQuote(g,h,id).ok)return buyItem(g,h,id);
 return {ok:false,reason:quote.reason};
}

import { ITEMS, ITEM_BY_ID } from './item-data.js';
import { BASES, MAP_OBJECTIVES } from './map-data.js';

export const SLOT_COUNTS = Object.freeze({inventory:6,backpack:3,stash:6,tp:1,cargo:6});
const areas=['inventory','backpack','stash'];
const storageAreas=h=>h.kind==='courier'?['cargo']:[...areas,'tp'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const SECRET_SHOPS=(MAP_OBJECTIVES.ent_dota_shop||[]).slice(2);
const validSlot=(area,index)=>area in SLOT_COUNTS&&Number.isInteger(index)&&index>=0&&index<SLOT_COUNTS[area];
const gate=g=>g.paused?{ok:false,reason:'游戏已暂停'}:g.status!=='playing'?{ok:false,reason:'对局已经结束'}:{ok:true};

export function ensureInventory(h){
 for(const area of storageAreas(h)){
  h[area]||=[];h[area+'Meta']||=[];
  for(let i=0;i<h[area].length;i++){
   const id=h[area][i];
   if(!id)h[area+'Meta'][i]=null;
   else if(h[area+'Meta'][i]?.itemId!==id)h[area+'Meta'][i]=createMeta(h,id);
   else if(!h[area+'Meta'][i].uid)h[area+'Meta'][i]=createMeta(h,id,h[area+'Meta'][i]);
  }
 }
 h.quickbuy||=[];
}
export function createMeta(h,id,fields={}){
 const item=ITEM_BY_ID[id];h.itemSerial=(h.itemSerial||0)+1;
 return {itemId:id,uid:`${h.id}:item:${h.itemSerial}`,ownerId:h.id,ownerTeam:h.team,purchasedAt:-Infinity,readyAt:0,cooldownRemaining:0,
  charges:id==='ancient_janggo'?8:id==='holy_locket'?(item.charges||0):item?.abilityCharges||item?.charges||0,combineLocked:false,mode:id==='power_treads'?'strength':undefined,...fields};
}
export function shopAccess(h){
 const base=!h.dead&&distance(h,BASES[h.team])<=1200;
 const secret=!h.dead&&SECRET_SHOPS.some(s=>distance(s,h)<=600);
 return {base,secret,shop:base||secret};
}
export function itemEntries(h,selectedAreas=storageAreas(h)){
 ensureInventory(h);
 return selectedAreas.flatMap(area=>(h[area]||[]).flatMap((id,index)=>id?[{id,area,index,meta:h[area+'Meta'][index]}]:[]));
}
export function activeEquipment(g,h){
 ensureInventory(h);return (h.inventory||[]).filter((id,i)=>id&&(h.inventoryMeta[i]?.readyAt||0)<=g.time+1e-7&&(h.inventoryMeta[i].ownerId===h.id||h.inventoryMeta[i].freeRapier));
}
function take(h,entry){h[entry.area][entry.index]=null;h[entry.area+'Meta'][entry.index]=null;}
function put(h,area,index,id,meta){h[area][index]=id;h[area+'Meta'][index]={...meta,itemId:id};}
function trim(h){for(const area of storageAreas(h)){while(h[area].length&&!h[area].at(-1))h[area].pop();h[area+'Meta'].length=h[area].length;}}
function emptySlot(h,choices,removed=[]){
 for(const area of choices)for(let index=0;index<SLOT_COUNTS[area];index++)if(!h[area][index]||removed.some(e=>e.area===area&&e.index===index))return {area,index};
 return null;
}
function recipeParts(id,pool,consumed,missing,root=false){
 const owned=!root&&pool.find(e=>e.id===id&&!e.meta.combineLocked&&!consumed.includes(e));
 if(owned){consumed.push(owned);return;}
 const item=ITEM_BY_ID[id];
 if(item.components?.length){
  const recipes=[item.components,...(item.recipesAlternative||[])];
  const best=recipes.map(parts=>{const used=[...consumed],need=[];for(const part of parts)recipeParts(part,pool,used,need);return {used,need,cost:need.reduce((n,id)=>n+ITEM_BY_ID[id].cost,0)};}).sort((a,b)=>a.cost-b.cost)[0];
  consumed.splice(0,consumed.length,...best.used);missing.push(...best.need);
 }
 else missing.push(id);
}
export function purchaseQuote(g,h,id){
 ensureInventory(h);const item=ITEM_BY_ID[id];
 if(!item||!item.purchasable)return {ok:false,reason:'该物品不可购买',cost:0,missing:[],consumed:[]};
 const access=shopAccess(h),secretSupply=item.secretShop||(item.components||[]).some(id=>ITEM_BY_ID[id].secretShop);
 const storage=item.id==='tpscroll'&&access.base?['tp']:access.base?areas:access.secret&&secretSupply?['inventory','backpack']:['stash'];
 const consumed=[],missing=[];recipeParts(id,itemEntries(h,storage).filter(e=>e.meta.ownerId===h.id),consumed,missing,true);
 const cost=missing.reduce((sum,part)=>sum+ITEM_BY_ID[part].cost,0);
 const stack=item.stackable?itemEntries(h,storage).find(e=>e.id===id&&(!item.stackableMax||(e.meta.charges||0)+item.charges<=item.stackableMax)):null;
 let slot=stack||emptySlot(h,storage,consumed),resultItem=item;
 // A final component can immediately combine; it does not need a spare slot.
 if(!slot&&!item.components?.length){
  const pool=itemEntries(h,storage).filter(e=>e.meta.ownerId===h.id);
  for(const upgrade of ITEMS.filter(i=>i.components?.includes(item.id))){
   const parts=[];let usedPurchase=false,complete=true;
   for(const id of upgrade.components){
    if(id===item.id&&!usedPurchase){usedPurchase=true;continue;}
    const part=pool.find(e=>e.id===id&&!e.meta.combineLocked&&!parts.includes(e));if(part)parts.push(part);else{complete=false;break;}
   }
   if(complete){slot=emptySlot(h,storage,parts);if(slot){consumed.push(...parts);resultItem=upgrade;break;}}
  }
 }
 const unavailable=missing.find(id=>stockStatus(g,h,id).available<missing.filter(x=>x===id).length);
 let reason=!gate(g).ok?gate(g).reason:item.id==='aghanims_shard'&&h.consumedShard?'已经拥有阿哈利姆魔晶':item.id==='ultimate_scepter_2'&&h.consumedScepter?'已经拥有阿哈利姆福佑':unavailable?`${ITEM_BY_ID[unavailable].name}尚未补货（${Math.ceil(stockStatus(g,h,unavailable).remaining)}秒）`:missing.some(part=>ITEM_BY_ID[part].secretShop)&&!access.secret?'需要前往神秘商店购买缺少的组件':h.gold<cost?'金币不足':!slot?'可用物品栏已满':null;
 return {ok:!reason,reason,item,resultItem,cost,missing,consumed,slot,stack,access};
}
export function stockStatus(g,h,id){
 const item=ITEM_BY_ID[id];if(!item?.maxStock)return {available:Infinity,remaining:0};
 g.shopStocks||={};const key=`${h.team}:${id}`,start=item.initialStockTime||0;
 const stock=g.shopStocks[key]||=( {available:item.initialStock||0,nextAt:start||((item.initialStock||0)<item.maxStock?(item.stockTime||1):Infinity)} );
 if(start&&g.time>=start&&stock.nextAt===start){stock.available=Math.min(item.maxStock,Math.max(1,stock.available));stock.nextAt=stock.available<item.maxStock?start+(item.stockTime||1):Infinity;}
 if(!start&&stock.available<item.maxStock&&!Number.isFinite(stock.nextAt))stock.nextAt=g.time+(item.stockTime||1);
 while(g.time>=stock.nextAt&&stock.available<item.maxStock){stock.available++;stock.nextAt=stock.available<item.maxStock?stock.nextAt+(item.stockTime||1):Infinity;}
 return {...stock,remaining:Math.max(0,stock.nextAt-g.time)};
}
function spendStock(g,h,id){const item=ITEM_BY_ID[id];if(!item?.maxStock)return;stockStatus(g,h,id);const s=g.shopStocks[`${h.team}:${id}`];s.available--;if(!Number.isFinite(s.nextAt))s.nextAt=g.time+(item.stockTime||1);}
function combinationMeta(h,id,parts,purchasedAt=Infinity){
 return createMeta(h,id,{purchasedAt:Math.min(purchasedAt,...parts.map(p=>p.meta.purchasedAt)),readyAt:Math.max(0,...parts.map(p=>p.meta.readyAt||0)),cooldownRemaining:Math.max(0,...parts.map(p=>p.meta.cooldownRemaining||0)),components:parts.map(p=>({id:p.id,meta:structuredClone(p.meta)}))});
}
function removeCompletedQueue(h,completed){if(completed.length)h.quickbuy=h.quickbuy.filter(id=>{const index=completed.indexOf(id);if(index<0)return true;completed.splice(index,1);return false;});}
function assemble(g,h){
 const access=shopAccess(h),groups=access.base?[areas]:[['inventory','backpack'],['stash']],completed=[];
 for(const group of groups){
  let changed=true;
  while(changed){
   changed=false;
   for(const item of ITEMS.filter(i=>i.components?.length))for(const recipe of [item.components,...(item.recipesAlternative||[])]){
    const pool=itemEntries(h,group),parts=[];
    for(const id of recipe){const part=pool.find(e=>e.id===id&&!e.meta.combineLocked&&e.meta.ownerId===h.id&&!parts.includes(e));if(part)parts.push(part);}
    if(parts.length!==recipe.length)continue;
    const preferred=parts.some(e=>e.area==='inventory')?'inventory':parts.some(e=>e.area==='backpack')?'backpack':'stash';
    const slot=emptySlot(h,[preferred],parts);if(!slot)continue;
    const meta=combinationMeta(h,item.id,parts);
    for(const part of parts)take(h,part);put(h,slot.area,slot.index,item.id,meta);completed.push(item.id);changed=true;break;
   }
  }
 }
 trim(h);removeCompletedQueue(h,[...completed]);return completed;
}
export function refreshInventory(g,h){
 const healthRatio=h.maxHp?h.hp/h.maxHp:1,manaRatio=h.maxMana?h.mana/h.maxMana:0;
 trim(h);if(h.kind==='courier')return;consumeUpgrades(g,h);g._refreshHero(h);
 h.hp=h.dead?0:Math.min(h.maxHp,Math.max(Number.EPSILON,healthRatio*h.maxHp));h.mana=Math.min(h.maxMana,Math.max(0,manaRatio*h.maxMana));
 h.equipmentSignature=activeEquipment(g,h).join('|')+`:${!!h.consumedScepter}:${!!h.consumedShard}`;
}
const refresh=refreshInventory;
function consumeUpgrades(g,h){for(const e of itemEntries(h,['inventory']))if((e.meta.readyAt||0)<=g.time&&e.meta.ownerId===h.id&&['aghanims_shard','ultimate_scepter_2'].includes(e.id)){h[e.id==='aghanims_shard'?'consumedShard':'consumedScepter']=true;take(h,e);}}
export function buyItem(g,h,id){
 const quote=purchaseQuote(g,h,id);if(!quote.ok)return quote;
 const meta=combinationMeta(h,quote.resultItem.id,quote.consumed,g.time);
 h.gold-=quote.cost;for(const part of quote.consumed)take(h,part);
 for(const id of quote.missing)spendStock(g,h,id);
 if(quote.stack){quote.stack.meta.charges+=quote.item.charges||1;quote.stack.meta.purchasedAt=Math.min(quote.stack.meta.purchasedAt,g.time);}
 else put(h,quote.slot.area,quote.slot.index,quote.resultItem.id,meta);
 const completed=assemble(g,h);removeCompletedQueue(h,[quote.item.id,...(quote.resultItem!==quote.item?[quote.resultItem.id]:[])]);refresh(g,h);
 return {ok:true,itemId:quote.item.id,cost:quote.cost,area:quote.slot.area,completed};
}
export function moveItem(g,h,from,index,to,targetIndex){
 const allowed=gate(g);if(!allowed.ok)return allowed;ensureInventory(h);
 if(!validSlot(from,index)||!validSlot(to,targetIndex))return {ok:false,reason:'无效物品栏'};
 if(!h[from][index])return {ok:false,reason:'该物品栏为空'};
 if(from==='cargo'||to==='cargo')return {ok:false,reason:'通过信使运输物品'};
 const legal=(id,area)=>!id||area==='tp'?(!id||id==='tpscroll'):area!=='backpack'||ITEM_BY_ID[id].backpackAllowed;
 if(!legal(h[from][index],to)||!legal(h[to][targetIndex],from))return {ok:false,reason:'该物品不能放入此栏位'};
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
 return item?Math.floor(item.cost*(item.stackable?(meta.charges||0)/(item.charges||1):1)*(g.time<(meta?.purchasedAt??-Infinity)+10&&!meta.used?1:.5)):0;
}
export function sellItem(g,h,area,index){
 const allowed=gate(g);if(!allowed.ok)return allowed;ensureInventory(h);
 if(!validSlot(area,index)||!h[area][index])return {ok:false,reason:'该物品栏为空'};
 if(!ITEM_BY_ID[h[area][index]].sellable||h[area+'Meta'][index].ownerId!==h.id)return {ok:false,reason:'该物品不能出售'};
 if(area!=='stash'&&!shopAccess(h).shop)return {ok:false,reason:'需要靠近商店才能出售随身物品'};
 const gold=sellValue(g,h,area,index);take(h,{area,index});h.gold+=gold;refresh(g,h);return {ok:true,gold};
}
export function collectStash(g,h){
 const allowed=gate(g);if(!allowed.ok)return allowed;ensureInventory(h);
 if(!shopAccess(h).base)return {ok:false,reason:'回到泉水附近才能取出储藏物品'};
 assemble(g,h);let count=0;
 for(const entry of itemEntries(h,['stash'])){const result=transferItem(g,h,'stash',entry.index,h,entry.id==='tpscroll'?['tp']:['inventory','backpack'],true);if(!result.ok)continue;count++;assemble(g,h);}
 refresh(g,h);return {ok:true,count};
}
export function tickInventory(g,h){
 ensureInventory(h);
 const atBase=shopAccess(h).base,stashKey=h.stash.join('|');
 if(atBase&&h.stash.some(Boolean)&&(!h.wasAtBaseShop||h.lastStashKey!==stashKey||emptySlot(h,['inventory','backpack'])))collectStash(g,h);
 h.wasAtBaseShop=atBase;h.lastStashKey=h.stash.join('|');
 consumeUpgrades(g,h);const signature=activeEquipment(g,h).join('|')+`:${!!h.consumedScepter}:${!!h.consumedShard}`;
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

export function setCombineLock(g,h,area,index,locked){
 const check=gate(g);if(!check.ok)return check;ensureInventory(h);
 if(!validSlot(area,index)||!h[area]?.[index])return {ok:false,reason:'该物品栏为空'};
 const meta=h[area+'Meta'][index];meta.combineLocked=locked??!meta.combineLocked;
 if(!meta.combineLocked)assemble(g,h);refresh(g,h);return {ok:true};
}
export function disassembleItem(g,h,area,index){
 const check=gate(g);if(!check.ok)return check;ensureInventory(h);
 const id=h[area]?.[index],item=ITEM_BY_ID[id],meta=h[area+'Meta']?.[index];
 if(!item?.components?.length||!String(item.disassemble).endsWith('_ALWAYS'))return {ok:false,reason:'此装备不能拆分'};
 if(meta.ownerId!==h.id)return {ok:false,reason:'只能拆分自己的装备'};
 const parts=meta.components?.length===item.components.length?meta.components:item.components.map(id=>({id,meta:createMeta(h,id,{purchasedAt:meta.purchasedAt})}));
 const choices=area==='stash'?['stash']:['inventory','backpack'],slots=[];
 for(const destination of choices)for(let i=0;i<SLOT_COUNTS[destination];i++)if(!h[destination][i]||(destination===area&&i===index))slots.push({area:destination,index:i});
 if(slots.length<parts.length)return {ok:false,reason:'空位不足，无法拆分'};
 take(h,{area,index});parts.forEach((part,i)=>put(h,slots[i].area,slots[i].index,part.id,{...part.meta,combineLocked:true,used:meta.used||part.meta.used,readyAt:Math.max(meta.readyAt||0,part.meta.readyAt||0),cooldownRemaining:Math.max(meta.cooldownRemaining||0,part.meta.cooldownRemaining||0)}));
 refresh(g,h);return {ok:true};
}
export function transferItem(g,source,from,index,destination,choices=['inventory','backpack'],internal=false){
 const check=gate(g);if(!check.ok)return check;ensureInventory(source);ensureInventory(destination);
 const id=source[from]?.[index],meta=source[from+'Meta']?.[index],item=ITEM_BY_ID[id];
 if(!item||!validSlot(from,index)||!choices.every(a=>storageAreas(destination).includes(a)))return {ok:false,reason:'无效物品转移'};
 if(!internal&&source!==destination&&distance(source,destination)>250)return {ok:false,reason:'目标距离过远'};
 choices=choices.filter(a=>(a!=='tp'||id==='tpscroll')&&(a!=='backpack'||item.backpackAllowed));
 const stack=item.stackable?itemEntries(destination,choices).find(e=>e.id===id&&e.meta.uid!==meta.uid&&e.meta.ownerId===meta.ownerId&&(!item.stackableMax||e.meta.charges+meta.charges<=item.stackableMax)):null;
 const slot=stack||emptySlot(destination,choices);if(!slot)return {ok:false,reason:'目标物品栏已满'};
 take(source,{area:from,index});
 if(stack){stack.meta.charges+=meta.charges;stack.meta.cooldownRemaining=Math.max(stack.meta.cooldownRemaining||0,meta.cooldownRemaining||0);stack.meta.purchasedAt=Math.min(stack.meta.purchasedAt,meta.purchasedAt);stack.meta.used||=meta.used;}
 else put(destination,slot.area,slot.index,id,{...meta,readyAt:Math.max(meta.readyAt||0,from==='backpack'&&slot.area==='inventory'&&!shopAccess(destination).shop?g.time+6:0)});
 refresh(g,source);if(destination!==source)refresh(g,destination);return {ok:true};
}
export function dropItem(g,h,area,index,point=h,forced=false){
 const check=gate(g);if(!check.ok&&!forced)return check;ensureInventory(h);
 const id=h[area]?.[index],meta=h[area+'Meta']?.[index],item=ITEM_BY_ID[id];
 if(!item||!item.droppable||area==='stash'||area==='cargo'||(!forced&&h.dead))return {ok:false,reason:'无法丢弃此物品'};
 if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||distance(h,point)>250)return {ok:false,reason:'只能丢在附近'};
 const entity={id:g._id('droppedItem'),kind:'droppedItem',name:item.name,team:2,x:point.x,y:point.y,radius:20,hp:1,maxHp:1,dead:false,itemId:id,meta:structuredClone(meta)};
 take(h,{area,index});g.entities.push(entity);refresh(g,h);return {ok:true,entity};
}
export function pickupItem(g,h,entityOrId){
 const check=gate(g);if(!check.ok)return check;ensureInventory(h);
 const entity=g.entities.find(e=>e.kind==='droppedItem'&&!e.dead&&e.id===(typeof entityOrId==='string'?entityOrId:entityOrId?.id));
 if(!entity||h.dead)return {ok:false,reason:'该物品已被拾取'};
 if(distance(h,entity)>250)return {ok:false,reason:'请先靠近地上的物品'};
 const item=ITEM_BY_ID[entity.itemId],choices=item.id==='tpscroll'?['tp']:item.backpackAllowed?['inventory','backpack']:['inventory'];
 const slot=emptySlot(h,choices);if(!slot)return {ok:false,reason:'物品栏已满'};
 const meta={...entity.meta};if(item.id==='rapier'&&meta.ownerTeam!==h.team)meta.freeRapier=true;
 put(h,slot.area,slot.index,item.id,meta);entity.dead=true;entity.deathTime=g.time;assemble(g,h);refresh(g,h);return {ok:true};
}
export function consumeItemCharge(g,h,area,index,amount=1){
 ensureInventory(h);const meta=h[area+'Meta']?.[index],item=ITEM_BY_ID[h[area]?.[index]];
 if(!meta||!Number.isFinite(amount)||amount<=0||meta.charges<amount)return {ok:false,reason:'物品充能不足'};
 meta.charges-=amount;meta.used=true;
 if(meta.charges<=0&&!item.permanent){take(h,{area,index});refresh(g,h);}
 return {ok:true};
}
export function consumeItem(g,h,area,index){
 ensureInventory(h);if(!h[area]?.[index])return {ok:false,reason:'该物品栏为空'};
 take(h,{area,index});refresh(g,h);return {ok:true};
}

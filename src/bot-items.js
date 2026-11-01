import { ITEM_BY_ID } from './item-data.js';
import * as Inventory from './inventory.js';
import * as Courier from './courier.js';

// Milestones survive assembly and sale: slot count is never a purchase limit.
export const BOT_BUILDS=Object.freeze({
  juggernaut:['boots','wraith_band','magic_wand','phase_boots','bfury','manta','black_king_bar','aghanims_shard','carry_counter','satanic','ultimate_scepter','ultimate_scepter_2','moon_shard'],
  crystal_maiden:['boots','null_talisman','magic_wand','tranquil_boots','glimmer_cape','force_staff','aghanims_shard','black_king_bar','ultimate_scepter','aether_lens','support_counter','ultimate_scepter_2','wind_waker'],
  windranger:['boots','null_talisman','magic_wand','power_treads','maelstrom','black_king_bar','aghanims_shard','ultimate_scepter','carry_counter','greater_crit','mjollnir','ultimate_scepter_2','satanic','moon_shard'],
  axe:['boots','bracer','magic_wand','phase_boots','blink','blade_mail','black_king_bar','aghanims_shard','heart','tank_counter','ultimate_scepter','ultimate_scepter_2','overwhelming_blink'],
  kunkka:['boots','bracer','magic_wand','phase_boots','blade_mail','blink','black_king_bar','aghanims_shard','ultimate_scepter','heart','greater_crit','ultimate_scepter_2','assault','overwhelming_blink'],
  ogre_magi:['boots','bracer','magic_wand','arcane_boots','hand_of_midas','glimmer_cape','force_staff','aghanims_shard','ultimate_scepter','black_king_bar','heart','sheepstick','ultimate_scepter_2','refresher']
});
const starterItems=new Set(['bracer','wraith_band','null_talisman','magic_stick','magic_wand','diadem','chainmail','blade']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function resolveGoal(g,h,id){
  const enemies=g.entities.filter(e=>e.kind==='hero'&&e.team!==h.team);
  if(id==='carry_counter')return enemies.some(e=>e.heroId==='windranger'||e.inventory?.includes('butterfly'))?'monkey_king_bar':h.heroId==='windranger'?'satanic':'butterfly';
  if(id==='support_counter')return h.deaths>=5?'aeon_disk':'sheepstick';
  if(id==='tank_counter')return enemies.filter(e=>['crystal_maiden','kunkka'].includes(e.heroId)).length>=3?'pipe':'assault';
  return id;
}
function owns(h,c,id){
  if(id==='aghanims_shard'&&h.consumedShard||['ultimate_scepter','ultimate_scepter_2'].includes(id)&&h.consumedScepter||id==='moon_shard'&&h.moonShard)return true;
  const entries=[...Inventory.itemEntries(h),...Inventory.itemEntries(c)];
  if(id==='boots'&&entries.some(e=>ITEM_BY_ID[e.id]?.movementGroup==='boots'))return true;
  return entries.some(e=>e.id===id&&e.meta.ownerId===h.id);
}
export function botMaterialNeeds(id,entries){
  function expand(id,used,root=false){
    const found=!root&&entries.find(e=>e.id===id&&!e.meta.combineLocked&&!used.includes(e));
    if(found){used.push(found);return [];}
    const item=ITEM_BY_ID[id];if(!item)return [];
    if(!item.components?.length)return [id];
    const options=[item.components,...(item.recipesAlternative||[])].map(recipe=>{
      const taken=[...used],missing=recipe.flatMap(part=>expand(part,taken));return {taken,missing,cost:missing.reduce((sum,part)=>sum+ITEM_BY_ID[part].cost,0)};
    }).sort((a,b)=>a.cost-b.cost);
    used.splice(0,used.length,...options[0].taken);return options[0].missing;
  }
  return expand(id,[],true);
}
function materialIds(id,out=new Set()){
  out.add(id);for(const part of ITEM_BY_ID[id]?.components||[])materialIds(part,out);return out;
}
function equipmentValue(entry,entries){
  const item=ITEM_BY_ID[entry.id],stats=item.stats||{};
  const isBoot=item.movementGroup==='boots',otherBoot=entries.some(e=>e!==entry&&ITEM_BY_ID[e.id].movementGroup==='boots'&&ITEM_BY_ID[e.id].cost>item.cost);
  if(isBoot&&otherBoot)return 50;
  if(['aghanims_shard','ultimate_scepter_2','moon_shard'].includes(entry.id))return 50000;
  return item.cost+(isBoot?12000:0)+(entry.id.includes('blink')?1200:0)+(entry.id==='black_king_bar'?1600:0)+
    (stats.damage||0)*8+(stats.armor||0)*40+(entry.id==='magic_wand'?(entry.meta.charges||0)*35:0)-(item.category==='recipes'?item.cost*.8:0);
}
export function organizeBotInventory(g,h,goal){
  let entries=Inventory.itemEntries(h,['inventory','backpack']);
  const access=Inventory.shopAccess(h),protectedParts=goal?materialIds(goal):new Set();
  // Sell obsolete early items before the backpack fills and blocks later components.
  if(access.shop&&entries.length>=6){
    const obsolete=entries.filter(e=>starterItems.has(e.id)&&!protectedParts.has(e.id)).sort((a,b)=>equipmentValue(a,entries)-equipmentValue(b,entries))[0]||
      (goal&&entries.length>=9?entries.filter(e=>!protectedParts.has(e.id)&&ITEM_BY_ID[e.id].movementGroup!=='boots').sort((a,b)=>equipmentValue(a,entries)-equipmentValue(b,entries))[0]:null);
    if(obsolete)Inventory.sellItem(g,h,obsolete.area,obsolete.index);
  }
  entries=Inventory.itemEntries(h,['inventory','backpack']);
  for(const carried of entries.filter(e=>e.area==='backpack').sort((a,b)=>equipmentValue(b,entries)-equipmentValue(a,entries))){
    const inv=Inventory.itemEntries(h,['inventory']),empty=Array.from({length:6},(_,i)=>i).find(i=>!h.inventory[i]);
    if(empty!==undefined){Inventory.moveItem(g,h,'backpack',carried.index,'inventory',empty);continue;}
    const worst=inv.sort((a,b)=>equipmentValue(a,entries)-equipmentValue(b,entries))[0];
    if(worst&&equipmentValue(carried,entries)>equipmentValue(worst,entries)+200)Inventory.moveItem(g,h,'backpack',carried.index,'inventory',worst.index);
  }
  return Inventory.itemEntries(h,['inventory','backpack']).length>=9&&!access.shop;
}

export function tickBotShopping(g,h){
  if(h.isPlayer||g.paused||g.status!=='playing')return;
  const state=h.botShop||=( {completed:[],targets:{},nextAt:0,purchases:0,spent:0,needsShop:false} );
  if(g.time<state.nextAt)return;state.nextAt=g.time+.45;
  const c=Courier.ensureCourier(g,h),assemblyKey=h.inventory.join('|')+':'+h.backpack.join('|')+':'+h.stash.join('|')+':'+Inventory.shopAccess(h).base;
  if(state.assemblyKey!==assemblyKey){Inventory.combineItems(g,h);state.assemblyKey=h.inventory.join('|')+':'+h.backpack.join('|')+':'+h.stash.join('|')+':'+Inventory.shopAccess(h).base;}
  if(!owns(h,c,'tpscroll')&&h.gold>=ITEM_BY_ID.tpscroll.cost){
    const supply=Inventory.buyItem(g,h,'tpscroll');if(supply.ok){state.purchases++;state.spent+=supply.cost;}
  }
  const plan=BOT_BUILDS[h.heroId];if(!plan)return;
  let index=-1,goal;
  for(let i=0;i<plan.length;i++){
    if(state.completed.includes(i))continue;
    const id=state.targets[i]||resolveGoal(g,h,plan[i]);
    if(owns(h,c,id)){state.completed.push(i);continue;}
    if(id==='aghanims_shard'&&g.time<(ITEM_BY_ID[id].initialStockTime||990))continue;
    index=i;goal=id;state.targets[i]=id;break;
  }
  state.goal=goal||null;state.needsShop=organizeBotInventory(g,h,goal);
  if(c.dead)return;
  const pool=()=>[...Inventory.itemEntries(h),...Inventory.itemEntries(c)].filter(e=>e.meta.ownerId===h.id);
  const remaining=()=>goal&&!owns(h,c,goal)?botMaterialNeeds(goal,pool()):[];
  let missing=remaining();
  const record=result=>{if(result.ok){state.purchases++;state.spent+=result.cost||0;}return result.ok;};
  if(c.command==='shopping'){
    // Purchase all affordable secret components for this goal in one visit.
    for(let i=0;i<3;i++){
      const secret=missing.find(id=>ITEM_BY_ID[id].secretShop&&ITEM_BY_ID[id].cost<=h.gold);
      if(!secret||!record(Courier.buyWithCourier(g,h,secret)))break;
      missing=remaining();
    }
    if(c.cargo.some(Boolean))Courier.courierCommand(g,h,'deliver');
    else if(!missing.some(id=>ITEM_BY_ID[id].secretShop))Courier.courierCommand(g,h,'return');
  }
  if(goal&&index>=0&&!owns(h,c,goal)){
    const access=Inventory.shopAccess(h),quote=Inventory.purchaseQuote(g,h,goal);
    // Base quotes can reuse inventory/backpack/stash parts. Remote buying uses
    // individual missing parts, so carried and in-transit parts aren't repurchased.
    const plannedCost=missing.reduce((sum,id)=>sum+ITEM_BY_ID[id].cost,0);
    if(access.base&&quote.ok&&quote.cost<=plannedCost)record(Inventory.buyItem(g,h,goal));
    else{
      const affordable=missing.filter(id=>!ITEM_BY_ID[id].secretShop).sort((a,b)=>ITEM_BY_ID[a].cost-ITEM_BY_ID[b].cost).find(id=>Inventory.purchaseQuote(g,h,id).ok);
      if(affordable)record(Inventory.buyItem(g,h,affordable));
    }
    missing=remaining();
    const secret=missing.find(id=>ITEM_BY_ID[id].secretShop&&ITEM_BY_ID[id].cost<=h.gold);
    if(secret&&!['secret','shopping','collect','deliver'].includes(c.command)&&!c.cargo.some(Boolean))Courier.courierCommand(g,h,'secret');
  }
  if(c.command==='idle'&&(c.cargo.some(Boolean)||h.stash.some(Boolean)))Courier.courierCommand(g,h,'deliver');
  if(c.command==='deliver'&&h.level>=10&&distance(c,h)>1500)Courier.courierCommand(g,h,'burst');
}

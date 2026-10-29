import { ITEMS, ITEM_BY_ID } from './item-data.js';
import { SLOT_COUNTS, shopAccess, sellValue, SECRET_SHOPS } from './inventory.js';
import { icon } from './icons.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const areaNames={inventory:'装备栏',backpack:'背包',stash:'储藏处'};
export const itemArt=item=>`<img src="/${item.image}" alt="" draggable="false" />`;
const setHTML=(element,html)=>{if(element.renderedContent!==html){element.innerHTML=html;element.renderedContent=html;}};

export function mountShop(panel,inventory,game,actions){
 const state={selected:'boots',category:'all',query:'',slot:null};
 panel.innerHTML=`<div class="panel-heading"><div><span class="eyebrow">DOTA 2 · 7.41f</span><h2>装备商店</h2></div><button class="icon-button" id="close-shop" aria-label="关闭商店">${icon('close')}</button></div><div class="shop-location"></div><label class="shop-search">${icon('search')}<input id="item-search" type="search" placeholder="搜索物品、属性或英文名称" aria-label="搜索商店物品" autocomplete="off" /></label><nav class="shop-categories" aria-label="物品分类">${Object.entries({all:'全部',attributes:'属性',equipment:'装备',secret:'神秘',upgrades:'合成',recipes:'卷轴'}).map(([id,label])=>`<button data-category="${id}">${label}</button>`).join('')}</nav><div class="shop-content"><div class="shop-catalog" aria-label="可购买物品"></div><section class="item-detail" aria-label="物品详情"></section></div><section class="stash-section"><div><h3>储藏处 <span id="stash-used"></span></h3><button id="collect-stash">取出全部</button></div><div class="stash-slots"></div></section><section class="quickbuy-section"><div><h3>快捷购买 <small>Shift + 单击物品添加</small></h3><button id="clear-quickbuy" aria-label="清空快捷购买">清空</button></div><div class="quickbuy-items"></div><button id="buy-quick">购买队列物品 <kbd>G</kbd></button></section><p class="shop-foot"><span id="slots-used"></span><small>双击 / 右键购买 · 单击查看详情</small></p>`;
 const notify=result=>{if(result.ok){actions.changed();}else actions.notify(result.reason||'无法操作');update();return result;};
 const buy=id=>{const result=notify(game.buy(id));if(result.ok)actions.notify(`已购买 ${ITEM_BY_ID[id].name}${result.area==='stash'?'，放入储藏处':result.area==='backpack'?'，放入背包':''}`);};
 function select(id){state.selected=id;state.slot=null;update();}
 function inspect(area,index){
  const id=game.player[area]?.[index];if(!id)return;
  state.selected=id;state.slot={area,index};actions.open();update();
 }
 const slotHTML=(area,index)=>{
  const p=game.player,id=p[area][index],item=ITEM_BY_ID[id],ready=p[area+'Meta'][index]?.readyAt||0,remaining=area==='inventory'?Math.max(0,Math.ceil(ready-game.time)):0;
  return `<button class="inventory-slot ${item?'filled':''} ${state.slot?.area===area&&state.slot.index===index?'selected-slot':''} ${remaining?'item-inactive':''}" data-slot-area="${area}" data-slot-index="${index}" draggable="${!!item}" title="${escape(item?item.name+' · '+item.description:areaNames[area]+'空位')}" aria-label="${areaNames[area]} ${index+1}：${escape(item?.name||'空位')}">${item?itemArt(item):'<span>·</span>'}${remaining?`<b class="item-reactivation">${remaining}</b>`:''}</button>`;
 };
 function handleSlot(e){
  const button=e.target.closest('[data-slot-area]');if(!button)return;
  const area=button.dataset.slotArea,index=+button.dataset.slotIndex;
  if(state.slot&&state.slot.area===area&&state.slot.index===index){state.slot=null;update();return;}
  if(state.slot&&!game.player[area][index]){const from=state.slot;state.slot=null;notify(game.moveItem(from.area,from.index,area,index));return;}
  inspect(area,index);
 }
 for(const container of [panel,inventory]){
  container.addEventListener('click',handleSlot);
  container.addEventListener('dragstart',e=>{const b=e.target.closest('[data-slot-area]');if(b&&game.player[b.dataset.slotArea][+b.dataset.slotIndex])e.dataTransfer.setData('application/x-dota-item',JSON.stringify({area:b.dataset.slotArea,index:+b.dataset.slotIndex}));});
  container.addEventListener('dragover',e=>{if(e.target.closest('[data-slot-area]'))e.preventDefault();});
  container.addEventListener('drop',e=>{const b=e.target.closest('[data-slot-area]');if(!b)return;e.preventDefault();try{const from=JSON.parse(e.dataTransfer.getData('application/x-dota-item'));state.slot=null;notify(game.moveItem(from.area,from.index,b.dataset.slotArea,+b.dataset.slotIndex));}catch{}});
 }
 panel.addEventListener('click',e=>{
  const category=e.target.closest('[data-category]');if(category){state.category=category.dataset.category;update();return;}
  const item=e.target.closest('[data-item]');if(item){if(e.shiftKey)notify(game.queueItem(item.dataset.item,true));else select(item.dataset.item);return;}
  const transfer=e.target.closest('[data-transfer]');
  if(transfer&&state.slot){const to=transfer.dataset.transfer,p=game.player,index=Array.from({length:SLOT_COUNTS[to]},(_,i)=>i).find(i=>!p[to][i]);if(index===undefined){actions.notify(`${areaNames[to]}已满，可拖动物品交换位置`);return;}const from=state.slot;state.slot=null;notify(game.moveItem(from.area,from.index,to,index));}
  if(e.target.closest('#buy-selected'))buy(state.selected);
  if(e.target.closest('#queue-selected'))notify(game.queueItem(state.selected,e.shiftKey));
  if(e.target.closest('#sell-selected')&&state.slot){const {area,index}=state.slot;state.slot=null;const result=notify(game.sellItem(area,index));if(result.ok)actions.notify(`已出售，获得 ${result.gold} 金币`);}
 });
 panel.addEventListener('dblclick',e=>{const b=e.target.closest('[data-item]');if(b&&!e.shiftKey)buy(b.dataset.item);});
 panel.addEventListener('contextmenu',e=>{const b=e.target.closest('[data-item]');if(b){e.preventDefault();buy(b.dataset.item);}});
 panel.querySelector('#close-shop').onclick=actions.close;
 panel.querySelector('#item-search').oninput=e=>{state.query=e.target.value.trim().toLocaleLowerCase();update();};
 panel.querySelector('#collect-stash').onclick=()=>notify(game.collectStash());
 panel.querySelector('#buy-quick').onclick=()=>notify(game.buyQuick());
 panel.querySelector('#clear-quickbuy').onclick=()=>{game.player.quickbuy=[];update();};
 function update(){
  const p=game.player,access=shopAccess(p);
  setHTML(inventory,`<div class="equipped-slots">${Array.from({length:6},(_,i)=>slotHTML('inventory',i)).join('')}</div><div class="backpack-label">背包 <span>物品不提供属性</span></div><div class="backpack-slots">${Array.from({length:3},(_,i)=>slotHTML('backpack',i)).join('')}</div>`);
  if(panel.hidden)return;
  setHTML(panel.querySelector('.shop-location'),`<span class="${access.shop?'at-shop':''}">${p.dead?'阵亡中 · 购买放入储藏处':access.base?'泉水商店 · 可取放储藏物品':access.secret?'神秘商店 · 可购买专属组件':'远离商店 · 普通物品放入储藏处'}</span><button id="locate-secret">定位神秘商店</button>`);
  panel.querySelector('#locate-secret').onclick=()=>{const nearest=[...SECRET_SHOPS].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];actions.locate(nearest);};
  panel.querySelectorAll('[data-category]').forEach(b=>{const selected=b.dataset.category===state.category;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  const visible=ITEMS.filter(i=>(state.category==='all'||i.category===state.category)&&`${i.name} ${i.en} ${i.description} ${i.id}`.toLocaleLowerCase().includes(state.query));
  setHTML(panel.querySelector('.shop-catalog'),visible.length?visible.map(i=>`<button class="shop-item ${i.id===state.selected?'selected':''} ${p.gold<i.cost?'unaffordable':''}" data-item="${i.id}" title="${escape(i.name+' · '+i.description)}" aria-label="查看${escape(i.name)}，${i.cost}金币"><span class="item-art">${itemArt(i)}</span><strong>${i.name}</strong><span class="item-price">${i.cost}</span></button>`).join(''):'<p class="shop-empty">没有匹配的物品</p>');
  const item=ITEM_BY_ID[state.selected],quote=game.purchaseQuote(item.id),slot=state.slot;
  if(slot&&p[slot.area][slot.index]!==item.id)state.slot=null;
  const owned=slot&&state.slot,upgrades=ITEMS.filter(i=>i.components?.includes(item.id));
  const componentHTML=(item.components||[]).map(id=>{const part=ITEM_BY_ID[id],have=quote.consumed.some(c=>c.id===id);return `<button data-item="${id}" class="recipe-part ${have?'owned':''}">${itemArt(part)}<span>${part.name}</span><small>${have?'已有':part.cost}</small></button>`;}).join('');
  setHTML(panel.querySelector('.item-detail'),`<div class="detail-heading">${itemArt(item)}<div><h3>${item.name}</h3><span>${item.en}</span><b>${item.cost} 金币</b></div></div><p class="item-description">${item.description.split(' · ').map(escape).join('<br>')}</p>${owned?`<p class="item-owned-location">${areaNames[slot.area]} · 第 ${slot.index+1} 格${slot.area!=='inventory'?' · 不提供属性':''}</p><div class="item-actions">${Object.keys(SLOT_COUNTS).filter(area=>area!==slot.area).map(area=>`<button data-transfer="${area}">${area==='inventory'?'装备':area==='backpack'?'放入背包':'存入储藏处'}</button>`).join('')}<button id="sell-selected">出售 · ${sellValue(game,p,slot.area,slot.index)} 金币</button></div>`:''}${componentHTML?`<h4>合成需要</h4><div class="recipe-components">${componentHTML}</div>`:item.recipeOnly?'<p class="item-note">卷轴本身不提供属性，组件齐全时自动合成。</p>':''}${upgrades.length?`<h4>可合成为</h4><div class="item-upgrades">${upgrades.map(i=>`<button data-item="${i.id}" title="${i.name}">${itemArt(i)}<span>${i.name}</span></button>`).join('')}</div>`:''}<div class="purchase-summary"><span>${quote.consumed.length?'购买剩余组件':'购买物品'}</span><strong>${quote.cost} 金币</strong></div><button id="buy-selected" ${quote.ok?'':'disabled'}>${quote.ok?'购买'+(quote.consumed.length?'并合成':''):escape(quote.reason)}</button><button id="queue-selected">加入快捷购买</button>`);
  panel.querySelector('#stash-used').textContent=`${p.stash.filter(Boolean).length} / 6`;
  setHTML(panel.querySelector('.stash-slots'),Array.from({length:6},(_,i)=>slotHTML('stash',i)).join(''));
  panel.querySelector('#collect-stash').disabled=!access.base||!p.stash.some(Boolean)||game.paused;
  setHTML(panel.querySelector('.quickbuy-items'),p.quickbuy.length?p.quickbuy.map(id=>`<button data-item="${id}" title="${ITEM_BY_ID[id].name}">${itemArt(ITEM_BY_ID[id])}<span>${ITEM_BY_ID[id].name}</span></button>`).join(''):'<span class="quickbuy-empty">将下一件装备加入队列，按 G 购买买得起的组件。</span>');
  panel.querySelector('#buy-quick').disabled=!p.quickbuy.length||game.paused||game.status!=='playing';
  panel.querySelector('#slots-used').textContent=`装备 ${p.inventory.filter(Boolean).length}/6 · 背包 ${p.backpack.filter(Boolean).length}/3`;
 }
 update();return {update,inspect,buyQuick:()=>notify(game.buyQuick())};
}

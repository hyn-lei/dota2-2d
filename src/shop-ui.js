import { ITEMS, ITEM_BY_ID } from './item-data.js';
import { SLOT_COUNTS, shopAccess, sellValue, SECRET_SHOPS, stockStatus } from './inventory.js';
import { icon } from './icons.js';
import { itemState } from './item-runtime.js';
import { SHOP_GROUPS } from './shop-layout.js';
import {itemKey} from './keybindings.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const areaNames={inventory:'装备栏',backpack:'背包',stash:'储藏处',tp:'回城卷轴',cargo:'信使'};
export const itemArt=item=>`<img src="/${item.image}" alt="" draggable="false" />`;
const setHTML=(element,html)=>{if(element.renderedContent!==html){element.innerHTML=html;element.renderedContent=html;}};
function effectDescription(item){
 const full=String(item.description||'').trim(),abilities=String(item.activeDescription||'').trim();
 const bonuses=abilities&&full.endsWith(abilities)?full.slice(0,-abilities.length).trim():abilities?'':full;
 const effects=[];
 for(const paragraph of abilities.split(/\n\s*\n|\n(?=(?:主动切换|主动|被动|光环|切换|开关|消耗|使用|升级)[：:])/).filter(Boolean)){
  const heading=paragraph.match(/^(主动切换|主动|被动|光环|切换|开关|消耗|使用|升级)[：:]\s*([^：:\n]+)[：:]\s*([\s\S]*)$/);
  if(heading)effects.push({type:heading[1],name:heading[2],paragraphs:heading[3]?[heading[3]]:[]});
  else if(effects.length)effects.at(-1).paragraphs.push(paragraph);
  else effects.push({type:'',name:item.recipeOnly?'合成说明':'装备效果',paragraphs:[paragraph]});
 }
 return `<div class="item-description">${bonuses?`<div class="item-bonuses" aria-label="装备属性">${bonuses.split(' · ').map(bonus=>`<span>${escape(bonus)}</span>`).join('')}</div>`:''}${effects.length?`<div class="item-effects" aria-label="装备效果">${effects.map(effect=>`<section class="item-effect"><h4>${effect.type?`<span>${escape(effect.type)}</span>`:''}${escape(effect.name)}</h4>${effect.paragraphs.map(paragraph=>`<p>${escape(paragraph)}</p>`).join('')}</section>`).join('')}</div>`:''}${item.notes?.length?`<details class="item-effect-notes"><summary>效果细节</summary><ul>${item.notes.map(note=>`<li>${escape(note)}</li>`).join('')}</ul></details>`:''}</div>`;
}

export function mountShop(panel,inventory,game,actions){
 const state={selected:'boots',category:'all',query:'',slot:null,displayedId:null};
 panel.innerHTML=`<div class="panel-heading"><div><span class="eyebrow">DOTA 2 · 7.41f</span><h2>装备商店</h2></div><button class="icon-button" id="close-shop" aria-label="关闭商店">${icon('close')}</button></div><div class="shop-location"></div><label class="shop-search">${icon('search')}<input id="item-search" type="search" placeholder="搜索物品、属性或英文名称" aria-label="搜索商店物品" autocomplete="off" /></label><nav class="shop-categories" aria-label="物品分类">${Object.entries({all:'基础与升级',basic:'基础',upgrades:'升级',secret:'神秘商店',recipes:'卷轴'}).map(([id,label])=>`<button data-category="${id}">${label}</button>`).join('')}</nav><div class="shop-content"><div class="shop-catalog" aria-label="可购买物品"></div><section class="item-detail" aria-label="物品详情"></section></div><section class="stash-section"><div><h3>储藏处 <span id="stash-used"></span></h3><button id="collect-stash">取出全部</button></div><div class="stash-slots"></div></section><section class="quickbuy-section"><div><h3>快捷购买 <small>Shift + 单击物品添加</small></h3><button id="clear-quickbuy" aria-label="清空快捷购买">清空</button></div><div class="quickbuy-items"></div><button id="buy-quick">购买队列物品 <kbd>G</kbd></button></section><p class="shop-foot"><span id="slots-used"></span><small>双击 / 右键购买 · 单击查看详情</small></p>`;
 panel.insertAdjacentHTML('beforeend','<div class="shop-item-tooltip" role="tooltip" hidden></div>');
 const itemTooltip=panel.querySelector('.shop-item-tooltip');
 const showItemTip=button=>{const item=ITEM_BY_ID[button?.dataset.item];if(!item)return;itemTooltip.innerHTML=`<div class="detail-heading">${itemArt(item)}<div><h3>${escape(item.name)}</h3><span>${escape(item.en)}</span><b>${item.cost} 金币</b></div></div>${effectDescription(item)}`;itemTooltip.hidden=false;const r=button.getBoundingClientRect();itemTooltip.style.left=`${Math.max(8,Math.min(innerWidth-308,r.left-300))}px`;itemTooltip.style.top=`${Math.max(8,Math.min(innerHeight-itemTooltip.offsetHeight-8,r.top))}px`;};
 panel.addEventListener('pointerover',e=>{const b=e.target.closest('[data-item]');if(b)showItemTip(b);});
 panel.addEventListener('pointerout',e=>{if(e.target.closest('[data-item]'))itemTooltip.hidden=true;});
 panel.addEventListener('focusin',e=>{const b=e.target.closest('[data-item]');if(b)showItemTip(b);});
 panel.addEventListener('focusout',()=>itemTooltip.hidden=true);
 const ownSlot=b=>b?.dataset.slotOwner===game.player.id;
 const notify=async result=>{result=await result;if(result.ok){actions.changed();}else actions.notify(result.reason||'无法操作');update();return result;};
 const courierPanel=document.createElement('section');courierPanel.className='courier-section';panel.querySelector('.quickbuy-section').before(courierPanel);
 panel.addEventListener('click',async e=>{
  const command=e.target.closest('[data-courier]');if(command){notify(game.courierCommand(command.dataset.courier));return;}
  if(e.target.closest('#courier-buy')){notify(game.buyWithCourier(state.selected));return;}
  if(!state.slot)return;const {area,index}=state.slot;
  if(e.target.closest('#use-selected'))actions.useItem(index,area);
  if(e.target.closest('#lock-selected'))notify(game.setCombineLock(area,index));
  if(e.target.closest('#disassemble-selected')){state.slot=null;notify(game.disassembleItem(area,index));}
  if(e.target.closest('#drop-selected')){state.slot=null;notify(game.dropItem(area,index));}
 });
 const buy=async id=>{const result=await notify(game.buy(id));if(result.ok)actions.notify(`已购买 ${ITEM_BY_ID[id].name}${result.area==='stash'?'，放入储藏处':result.area==='backpack'?'，放入背包':''}`);};
 let itemClick=null;
 const sameItemClick=e=>itemClick&&e.timeStamp-itemClick.time<1000&&Math.hypot(e.clientX-itemClick.x,e.clientY-itemClick.y)<=4;
 // Detail updates can move the catalog between the two clicks. Keep the first
 // click's item, and prevent the second click from activating a shifted control.
 panel.addEventListener('click',e=>{
  if(e.detail===1){const item=e.target.closest('[data-item]');itemClick=item&&!e.shiftKey?{id:item.dataset.item,x:e.clientX,y:e.clientY,time:e.timeStamp}:null;}
  else if(e.detail===2&&!e.shiftKey&&sameItemClick(e)){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 function revealDetails(){panel.querySelector('.item-detail').scrollIntoView({block:'start',inline:'nearest'});}
 function select(id){const changed=state.selected!==id;state.selected=id;state.slot=null;update();if(changed)panel.querySelector('.item-description').scrollTop=0;revealDetails();}
 function inspect(area,index){
  const id=game.player[area]?.[index];if(!id)return;
  state.selected=id;state.slot={area,index};actions.open();update();revealDetails();
 }
 const slotHTML=(area,index,p=game.player)=>{
  const id=p[area]?.[index],item=ITEM_BY_ID[id],meta=p[area+'Meta']?.[index],info=['hero','illusion'].includes(p.kind)?itemState(game,p,index,area):{ready:0,cooldown:0},remaining=Math.ceil(Math.max(info.ready,info.cooldown));
  return `<button class="inventory-slot ${item?'filled':''} ${remaining?'item-inactive':''}" data-slot-area="${area}" data-slot-index="${index}" data-slot-owner="${p.id}" draggable="${!!item&&p.id===game.player.id}" aria-readonly="${p.id!==game.player.id}" title="${escape(item?item.name+' · '+item.description:areaNames[area]+'空位')}" aria-label="${areaNames[area]} ${index+1}：${escape(item?.name||'空位')}">${item?itemArt(item):'<span>·</span>'}${area==='inventory'?`<kbd>${itemKey(index)}</kbd>`:area==='tp'?'<kbd>B</kbd>':''}${item&&(item.charges||item.abilityCharges||item.displayCharges||item.requiresCharges)?`<em class="item-charges">${meta?.charges||0}</em>`:''}${meta?.combineLocked?'<span class="item-lock">锁</span>':''}${remaining?`<b class="item-reactivation">${remaining}</b>`:''}</button>`;
 };
 function handleSlot(e){
  const button=e.target.closest('[data-slot-area]');if(!button)return;
  if(!ownSlot(button))return;
  const area=button.dataset.slotArea,index=+button.dataset.slotIndex;
  if(state.slot&&state.slot.area===area&&state.slot.index===index){state.slot=null;update();return;}
  if(state.slot&&!game.player[area][index]){const from=state.slot;state.slot=null;notify(game.moveItem(from.area,from.index,area,index));return;}
  inspect(area,index);
 }
 for(const container of [panel,inventory]){
  container.addEventListener('click',handleSlot);
  container.addEventListener('dblclick',e=>{const b=e.target.closest('[data-slot-area]');if((ownSlot(b)||game.controlledUnit?.kind==='illusion'&&b?.dataset.slotOwner===game.controlledUnit.id)&&(['inventory','tp'].includes(b.dataset.slotArea)||(b.dataset.slotArea==='backpack'&&game.player.backpack[+b.dataset.slotIndex]==='smoke_of_deceit')))actions.useItem(+b.dataset.slotIndex,b.dataset.slotArea);});
  container.addEventListener('dragstart',e=>{const b=e.target.closest('[data-slot-area]');if(ownSlot(b)&&game.player[b.dataset.slotArea][+b.dataset.slotIndex])e.dataTransfer.setData('application/x-dota-item',JSON.stringify({area:b.dataset.slotArea,index:+b.dataset.slotIndex,ownerId:game.player.id}));});
  container.addEventListener('dragover',e=>{if(ownSlot(e.target.closest('[data-slot-area]')))e.preventDefault();});
  container.addEventListener('drop',e=>{const b=e.target.closest('[data-slot-area]');if(!ownSlot(b))return;e.preventDefault();try{const from=JSON.parse(e.dataTransfer.getData('application/x-dota-item'));if(from.ownerId!==game.player.id)return;state.slot=null;notify(game.moveItem(from.area,from.index,b.dataset.slotArea,+b.dataset.slotIndex));}catch{}});
 }
 panel.addEventListener('click',async e=>{
  const category=e.target.closest('[data-category]');if(category){state.category=category.dataset.category;update();return;}
  const item=e.target.closest('[data-item]');if(item){if(e.shiftKey)notify(game.queueItem(item.dataset.item,true));else select(item.dataset.item);return;}
  const transfer=e.target.closest('[data-transfer]');
  if(transfer&&state.slot){const to=transfer.dataset.transfer,p=game.player,index=Array.from({length:SLOT_COUNTS[to]},(_,i)=>i).find(i=>!p[to][i]);if(index===undefined){actions.notify(`${areaNames[to]}已满，可拖动物品交换位置`);return;}const from=state.slot;state.slot=null;notify(game.moveItem(from.area,from.index,to,index));}
  if(e.target.closest('#buy-selected'))buy(state.selected);
  if(e.target.closest('#queue-selected'))notify(game.queueItem(state.selected,e.shiftKey));
  if(e.target.closest('#sell-selected')&&state.slot){const {area,index}=state.slot;state.slot=null;const result=await notify(game.sellItem(area,index));if(result.ok)actions.notify(`已出售，获得 ${result.gold} 金币`);}
 });
 panel.addEventListener('dblclick',e=>{const id=sameItemClick(e)?itemClick.id:e.target.closest('[data-item]')?.dataset.item;itemClick=null;if(id&&!e.shiftKey)buy(id);});
 panel.addEventListener('contextmenu',e=>{const b=e.target.closest('[data-item]');if(b){e.preventDefault();buy(b.dataset.item);}});
 panel.querySelector('#close-shop').onclick=()=>{itemTooltip.hidden=true;actions.close();};
 panel.querySelector('#item-search').oninput=e=>{state.query=e.target.value.trim().toLocaleLowerCase();update();};
 panel.querySelector('#collect-stash').onclick=()=>notify(game.collectStash());
 panel.querySelector('#buy-quick').onclick=()=>notify(game.buyQuick());
 panel.querySelector('#clear-quickbuy').onclick=()=>notify(game.clearQuickbuy());
 function update(){
  const p=game.player,shown=game.selected,access=shopAccess(p);
  if(state.displayedId!==shown.id){state.displayedId=shown.id;state.slot=null;itemTooltip.hidden=true;}
  setHTML(inventory,`<div class="equipped-slots">${Array.from({length:6},(_,i)=>slotHTML('inventory',i,shown)).join('')}</div><div class="backpack-label">背包 <span>${Array.from({length:6},(_,i)=>itemKey(i)).join(' ')} 使用装备 · 双击选择目标</span></div><div class="backpack-slots">${Array.from({length:3},(_,i)=>slotHTML('backpack',i,shown)).join('')}</div><div class="tp-slot">${slotHTML('tp',0,shown)}</div>`);
  inventory.querySelectorAll('[data-slot-area]').forEach(b=>b.classList.toggle('selected-slot',state.slot?.area===b.dataset.slotArea&&state.slot.index===+b.dataset.slotIndex));
  if(panel.hidden)return;
  setHTML(panel.querySelector('.shop-location'),`<span class="${access.shop?'at-shop':''}">${p.dead?'阵亡中 · 购买放入储藏处':access.base?'泉水商店 · 可取放储藏物品':access.secret?'神秘商店 · 可购买专属组件':'远离商店 · 普通物品放入储藏处'}</span><button id="locate-secret">定位神秘商店</button>`);
  panel.querySelector('#locate-secret').onclick=()=>{const nearest=[...SECRET_SHOPS].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];actions.locate(nearest);};
  panel.querySelectorAll('[data-category]').forEach(b=>{const selected=b.dataset.category===state.category;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  const matches=i=>`${i.name} ${i.en} ${i.description} ${i.id}`.toLocaleLowerCase().includes(state.query);
  const card=i=>`<button class="shop-item ${i.id===state.selected?'selected':''} ${p.gold<i.cost?'unaffordable':''} ${i.secretShop?'secret-item':''}" data-item="${i.id}" aria-label="查看${escape(i.name)}，${i.cost}金币"><span class="item-art">${itemArt(i)}</span><strong>${escape(i.name)}</strong><span class="item-price">${i.cost}</span></button>`;
  const groups=SHOP_GROUPS.filter(g=>g.id!=='variants'&&(state.category==='all'?g.column!=='recipes':state.category==='secret'?g.id==='secretshop':g.column===state.category));
  const catalog=panel.querySelector('.shop-catalog');catalog.classList.toggle('search-results',!!state.query);catalog.classList.toggle('single-column',state.category!=='all');
  const visible=state.query?ITEMS.filter(matches):groups.flatMap(g=>g.items.map(id=>ITEM_BY_ID[id]));
  const columns=['basic','upgrades','recipes'].map(column=>{const sections=groups.filter(g=>g.column===column);return sections.length?`<section class="shop-column" data-shop-column="${column}"><h3>${{basic:'基础物品',upgrades:'升级物品',recipes:'合成卷轴'}[column]}</h3><div class="shop-groups">${sections.map(group=>`<section class="shop-group" data-shop-group="${group.id}"><h4>${group.label}</h4><div class="shop-group-items">${group.items.map(id=>card(ITEM_BY_ID[id])).join('')}</div></section>`).join('')}</div></section>`:'';}).join('');
  setHTML(catalog,visible.length?(state.query?`<div class="shop-search-grid">${visible.map(card).join('')}</div>`:columns):'<p class="shop-empty">没有匹配的物品</p>');
  const item=ITEM_BY_ID[state.selected],quote=game.purchaseQuote(item.id),slot=state.slot;
  if(slot&&p[slot.area][slot.index]!==item.id)state.slot=null;
  const owned=slot&&state.slot,upgrades=ITEMS.filter(i=>i.components?.includes(item.id));
  const componentHTML=(item.components||[]).map(id=>{const part=ITEM_BY_ID[id],have=quote.consumed.some(c=>c.id===id);return `<button data-item="${id}" class="recipe-part ${have?'owned':''}">${itemArt(part)}<span>${part.name}</span><small>${have?'已有':part.cost}</small></button>`;}).join('');
  setHTML(panel.querySelector('.item-detail'),`<div class="detail-heading">${itemArt(item)}<div><h3>${item.name}</h3><span>${item.en}</span><b>${item.cost} 金币</b></div></div>${effectDescription(item)}${owned?`<p class="item-owned-location">${areaNames[slot.area]} · 第 ${slot.index+1} 格${slot.area!=='inventory'?' · 不提供属性':''}</p><div class="item-actions">${Object.keys(SLOT_COUNTS).filter(area=>area!==slot.area).map(area=>`<button data-transfer="${area}">${area==='inventory'?'装备':area==='backpack'?'放入背包':'存入储藏处'}</button>`).join('')}<button id="sell-selected">出售 · ${sellValue(game,p,slot.area,slot.index)} 金币</button></div>`:''}${componentHTML?`<h4>合成需要</h4><div class="recipe-components">${componentHTML}</div>`:item.recipeOnly?'<p class="item-note">卷轴本身不提供属性，组件齐全时自动合成。</p>':''}${upgrades.length?`<h4>可合成为</h4><div class="item-upgrades">${upgrades.map(i=>`<button data-item="${i.id}" title="${i.name}">${itemArt(i)}<span>${i.name}</span></button>`).join('')}</div>`:''}<div class="purchase-summary"><span>${quote.consumed.length?'购买剩余组件':'购买物品'}</span><strong>${quote.cost} 金币</strong></div><button id="buy-selected" ${quote.ok?'':'disabled'}>${quote.ok?'购买'+(quote.consumed.length?'并合成':''):escape(quote.reason)}</button><button id="queue-selected">加入快捷购买</button>`);
  panel.querySelector('#stash-used').textContent=`${p.stash.filter(Boolean).length} / 6`;
  setHTML(panel.querySelector('.stash-slots'),Array.from({length:6},(_,i)=>slotHTML('stash',i)).join(''));
  panel.querySelector('#collect-stash').disabled=!access.base||!p.stash.some(Boolean)||game.paused;
  setHTML(panel.querySelector('.quickbuy-items'),p.quickbuy.length?p.quickbuy.map(id=>`<button data-item="${id}" title="${ITEM_BY_ID[id].name}">${itemArt(ITEM_BY_ID[id])}<span>${ITEM_BY_ID[id].name}</span></button>`).join(''):'<span class="quickbuy-empty">将下一件装备加入队列，按 G 购买买得起的组件。</span>');
  panel.querySelector('#buy-quick').disabled=!p.quickbuy.length||game.paused||game.status!=='playing';
  panel.querySelector('#slots-used').textContent=`装备 ${p.inventory.filter(Boolean).length}/6 · 背包 ${p.backpack.filter(Boolean).length}/3`;
  // Owned-item controls stay separate from the purchase/recipe view.
  const detail=panel.querySelector('.item-detail'),old=detail.querySelector('.owned-commands');if(!owned)old?.remove();
  if(owned){const meta=p[slot.area+'Meta'][slot.index],info=game.itemState(slot.index,slot.area);const commands=old||document.createElement('div');commands.className='owned-commands';setHTML(commands,`<p>${meta?.mode?`模式：${escape({strength:'力量',agility:'敏捷',intelligence:'智力',on:'开启',off:'关闭',attack:'攻击',spell:'技能'}[meta.mode]||meta.mode)} · `:''}${info.cooldown>0?`冷却 ${Math.ceil(info.cooldown)} 秒`:info.active?'主动效果就绪':'被动装备'}</p><button id="use-selected" ${info.active&&(['inventory','tp'].includes(slot.area)||(slot.area==='backpack'&&item.id==='smoke_of_deceit'))&&!info.ready&&!info.cooldown?'':'disabled'}>使用物品</button><button id="lock-selected">${meta.combineLocked?'允许合成':'锁定合成'}</button><button id="disassemble-selected" ${String(item.disassemble).endsWith('_ALWAYS')?'':'disabled'}>拆分</button><button id="drop-selected" ${item.droppable&&slot.area!=='stash'?'':'disabled'}>丢在脚下</button>`);if(!old)detail.prepend(commands);}
  detail.querySelectorAll('[data-transfer="cargo"],[data-transfer="tp"]').forEach(b=>{if(b.dataset.transfer==='cargo'||item.id!=='tpscroll')b.remove();});
  let supply=detail.querySelector('.item-supply');if(!supply){supply=document.createElement('p');supply.className='item-supply';detail.append(supply);}const stock=stockStatus(game,p,item.id);supply.textContent=Number.isFinite(stock.available)?`库存 ${stock.available} / ${item.maxStock}${stock.remaining>0&&Number.isFinite(stock.remaining)?` · ${Math.ceil(stock.remaining)} 秒后补货`:''}`:'';
  const c=game.courier,names={idle:'待命',collect:'返回取货',deliver:'正在送达',return:'返航',secret:'前往神秘商店',shopping:'神秘商店待命'};
  setHTML(courierPanel,`<div class="courier-heading"><h3>信使 · ${c.dead?`${Math.ceil(c.respawnAt-game.time)} 秒后复活`:names[c.command]||'待命'}</h3><small>${c.flying?'飞行':'地面'} · Lv.${p.level} · ${c.cargo.filter(Boolean).length}/6</small></div><div class="courier-cargo">${Array.from({length:6},(_,i)=>{const item=ITEM_BY_ID[c.cargo[i]];return `<span title="${escape(item?.name||'信使空位')}">${item?itemArt(item):'·'}</span>`;}).join('')}</div><div class="courier-controls">${[['deliver','运送 F3'],['return','返航'],['secret','神秘商店'],['burst','加速 10级'],['shield','护盾 20级']].map(([id,label])=>`<button data-courier="${id}" ${c.dead||game.paused||(id==='burst'&&(p.level<10||c.burstReadyAt>game.time))||(id==='shield'&&(p.level<20||c.shieldReadyAt>game.time))?'disabled':''}>${label}</button>`).join('')}<button id="courier-buy" ${item.secretShop&&!c.dead&&shopAccess(c).secret?'':'disabled'}>信使购买所选组件</button></div>`);
 }
 update();return {update,inspect,buyQuick:()=>notify(game.buyQuick())};
}

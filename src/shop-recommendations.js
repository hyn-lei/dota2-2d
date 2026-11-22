import {HEROES} from './data.js';
import {ITEM_BY_ID} from './item-data.js';
import {itemEntries,shopAccess} from './inventory.js';
import {heroItemRecommendations} from './hero-item-recommendations.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountShopRecommendations(element,game,{itemArt}){
 let stage='core',lastKey='';
 element.setAttribute('aria-label','英雄推荐装备');
 element.addEventListener('click',e=>{const button=e.target.closest('[data-recommendation-stage]');if(button){stage=button.dataset.recommendationStage;lastKey='';update();}});
 function update(selected){
  const p=game.player,hero=HEROES[p.heroId];if(!hero)return;
  const courier=game.courier,entries=[...itemEntries(p),...itemEntries(courier,['cargo'])].filter(e=>e.meta.ownerId===p.id);
  const access=shopAccess(p),key=JSON.stringify([p.heroId,stage,selected,Math.floor(p.gold),Math.floor(game.time),game.paused,access.base,access.secret,p.hasShard,p.hasScepter,p.moonShard,
   entries.map(e=>[e.id,e.area,e.meta.uid,e.meta.combineLocked,e.meta.charges])]);
  if(key===lastKey)return;lastKey=key;
  const groups=heroItemRecommendations(p.heroId),group=groups.find(g=>g.id===stage)||groups[0];
  const card=entry=>{
   const item=ITEM_BY_ID[entry.id],owned=entries.filter(e=>e.id===entry.id).reduce((n,e)=>n+(item.stackable?(e.meta.charges||0)/Math.max(1,item.charges||1):1),0),
    permanent=entry.id==='aghanims_shard'&&p.hasShard||entry.id==='ultimate_scepter'&&p.hasScepter||entry.id==='moon_shard'&&p.moonShard,
    present=owned>=entry.quantity||permanent,transit=entries.some(e=>e.id===entry.id&&e.area==='cargo'),quote=game.purchaseQuote(entry.id);
   return `<button class="recommendation-item ${present?'owned':''} ${selected===entry.id?'selected':''} ${!present&&p.gold<quote.cost?'unaffordable':''}" data-recommended-item="${entry.id}" aria-label="查看推荐装备${escape(item.name)}"><span class="recommendation-art">${itemArt(item)}</span><span class="recommendation-name">${escape(item.name)}${entry.quantity>1?` <small>×${entry.quantity}</small>`:''}</span><span class="recommendation-price">${present?(transit?'运送中':'已拥有'):`${quote.cost} 金`}</span><span class="recommendation-reason">${escape(entry.reason)}</span></button>`;
  };
  const html=`<div class="recommendation-heading"><img src="/${hero.portrait}" alt=""/><div><h3>推荐装备</h3><strong>${escape(hero.name)}</strong></div></div><nav class="recommendation-stages" aria-label="推荐装备阶段">${groups.map(g=>`<button data-recommendation-stage="${g.id}" aria-pressed="${g.id===group.id}">${g.label}</button>`).join('')}</nav><p class="recommendation-hint">单击查看 · 双击 / 右键购买<br/>Shift + 单击加入快捷购买</p><div class="recommendation-items">${group.items.map(card).join('')}</div>`;
  if(element.renderedContent!==html){element.innerHTML=html;element.renderedContent=html;}
 }
 return {update};
}

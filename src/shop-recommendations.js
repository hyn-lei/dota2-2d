import {HEROES} from './data.js';
import {ITEM_BY_ID} from './item-data.js';
import {itemEntries,shopAccess} from './inventory.js';
import {heroItemRecommendations,recommendationPhase,shopRecommendationContext} from './hero-item-recommendations.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function recommendationStock(player,entries){
 const stock=new Map();
 for(const {id,area,meta} of entries){
  const item=ITEM_BY_ID[id];
  const amount=item.stackable?(meta.charges||0)/Math.max(1,item.charges||1):1;
  const count=stock.get(id)||{local:0,cargo:0};
  if(area==='cargo')count.cargo+=amount;
  else count.local+=amount;
  stock.set(id,count);
 }
 for(const [id,owned] of [['aghanims_shard',player.hasShard],['ultimate_scepter',player.hasScepter],['moon_shard',player.moonShard]]){
  if(owned)stock.set(id,{local:1,cargo:0});
 }
 return stock;
}

export function mountShopRecommendations(element,game,{itemArt}){
 let stage='core',lastKey='',lastSelected,playerKey='',lineup=[],planKey='',groups=[];
 element.setAttribute('aria-label','英雄推荐装备');
 element.addEventListener('click',e=>{const button=e.target.closest('[data-recommendation-stage]');if(button){stage=button.dataset.recommendationStage;update();}});
 function update(selected=lastSelected){
  lastSelected=selected;
  const p=game.player,hero=HEROES[p.heroId];if(!hero)return;
  const courier=game.courier,entries=[...itemEntries(p),...itemEntries(courier,['cargo'])].filter(e=>e.meta.ownerId===p.id);
  const owner=JSON.stringify([p.id,p.heroId,p.team,p.draftRole]);
  if(owner!==playerKey){
   playerKey=owner;
   lineup=(game.roster||game.entities).filter(e=>e.kind==='hero').map(({kind,team,heroId})=>({kind,team,heroId}));
  }
  const access=shopAccess(p),nextPlanKey=JSON.stringify([owner,recommendationPhase(game.time),p.hasShard,p.hasScepter,p.moonShard,
   entries.map(e=>[e.id,e.area,e.meta.uid,e.meta.combineLocked,e.meta.charges])]);
  const key=JSON.stringify([nextPlanKey,stage,selected,Math.floor(p.gold),Math.floor(game.time),game.paused,access.base,access.secret]);
  if(key===lastKey)return;lastKey=key;
  const stock=recommendationStock(p,entries);
  if(nextPlanKey!==planKey){
   planKey=nextPlanKey;
   const context=shopRecommendationContext(p,lineup,game.time,(id,quantity)=>{
    const count=stock.get(id);return !!count&&count.local+count.cargo>=quantity;
   });
   groups=heroItemRecommendations(p.heroId,context);
  }
  const group=groups.find(g=>g.id===stage)||groups[0];
  const card=entry=>{
   const item=ITEM_BY_ID[entry.id],{local=0,cargo=0}=stock.get(entry.id)||{};
   const present=local+cargo>=entry.quantity,transit=present&&local<entry.quantity,quote=present?null:game.purchaseQuote(entry.id);
   const evidence=entry.evidence;
   const source=evidence?.sampleCount?`${evidence.patch} 职业赛中 ${evidence.purchaseCount}/${evidence.sampleCount} 场购买。`:
    evidence?.author?`${evidence.patch} ${evidence.author} 指南。`:'';
   return `<button class="recommendation-item ${present?'owned':''} ${selected===entry.id?'selected':''} ${!present&&p.gold<quote.cost?'unaffordable':''}" data-recommended-item="${entry.id}" aria-label="查看推荐装备${escape(item.name)}"><span class="recommendation-art">${itemArt(item)}</span><span class="recommendation-name">${escape(item.name)}${entry.quantity>1?` <small>×${entry.quantity}</small>`:''}</span><span class="recommendation-price">${present?(transit?'运送中':'已拥有'):`${quote.cost} 金`}</span><span class="recommendation-reason">${escape(entry.reason+source)}</span></button>`;
  };
  const html=`<div class="recommendation-heading"><img src="/${hero.portrait}" alt=""/><div><h3>推荐装备</h3><strong>${escape(hero.name)}</strong></div></div><nav class="recommendation-stages" aria-label="推荐装备阶段">${groups.map(g=>`<button data-recommendation-stage="${g.id}" aria-pressed="${g.id===group.id}">${g.label}</button>`).join('')}</nav><p class="recommendation-hint">单击查看 · 双击 / 右键购买<br/>Shift + 单击加入快捷购买</p><div class="recommendation-items">${group.items.map(card).join('')}</div>`;
  if(element.renderedContent!==html){element.innerHTML=html;element.renderedContent=html;}
 }
 return {update};
}

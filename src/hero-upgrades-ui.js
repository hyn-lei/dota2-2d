import {upgradeDescriptions} from './upgrade-data.js';
import {ITEM_BY_ID} from './item-data.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={scepter:{name:'阿哈利姆神杖',short:'神杖',item:'ultimate_scepter'},shard:{name:'阿哈利姆魔晶',short:'魔晶',item:'aghanims_shard'}};
function stateOf(unit,type){
 const config=types[type];
 if(unit[type==='scepter'?'hasScepter':'hasShard'])return {id:'active',label:'已生效',detail:unit[type==='scepter'?'consumedScepter':'consumedShard']?'已永久获得升级':'装备中的神杖提供升级'};
 const area=['inventory','backpack','stash'].find(area=>unit[area]?.includes(config.item));
 return area?{id:'inactive',label:'未生效',detail:area==='backpack'?'神杖在背包中，不提供升级':area==='stash'?'物品在储藏处，尚未送达':'装备尚未生效'}:{id:'missing',label:'未获得',detail:'获得后解锁以下英雄升级'};
}

export function mountHeroUpgrades(container,game){
 container.innerHTML=Object.entries(types).map(([type,config])=>`<button class="hero-upgrade" data-hero-upgrade="${type}" aria-label="${config.name}"><img src="/${ITEM_BY_ID[config.item].image}" alt="" draggable="false"><span>${config.short}</span><i aria-hidden="true"></i></button>`).join('')+'<div class="hero-upgrade-tooltip" role="tooltip" hidden></div>';
 const tip=container.querySelector('.hero-upgrade-tooltip');
 let shown=null,pinned=false,signature='';
 function position(){
  if(!shown||tip.hidden)return;
  const bounds=shown.getBoundingClientRect(),margin=8;
  tip.style.left=`${Math.max(margin,Math.min(innerWidth-tip.offsetWidth-margin,bounds.left-tip.offsetWidth/2+bounds.width/2))}px`;
  tip.style.top=`${Math.max(margin,Math.min(innerHeight-tip.offsetHeight-margin,bounds.top-tip.offsetHeight-10))}px`;
 }
 function describe(button){
  const unit=game.selected,type=button.dataset.heroUpgrade,config=types[type],state=stateOf(unit,type);
  const effects=[...new Set(upgradeDescriptions(unit.heroId,type))];
  tip.innerHTML=`<small>${escape(unit.name)} · 7.42</small><h3>${config.name}</h3><p class="hero-upgrade-state ${state.id}">${state.label} · ${state.detail}</p><div class="hero-upgrade-effects">${effects.map(text=>`<p>${escape(text)}</p>`).join('')}</div>`;
  tip.dataset.pinned=String(pinned);tip.hidden=false;button.setAttribute('aria-expanded','true');position();
 }
 function hide(){tip.hidden=true;shown?.setAttribute('aria-expanded','false');shown=null;pinned=false;}
 function show(button,lock=false){
  if(!button||container.hidden)return;
  shown?.setAttribute('aria-expanded','false');shown=button;pinned=lock;describe(button);
 }
 container.addEventListener('pointerover',e=>{const button=e.target.closest('[data-hero-upgrade]');if(button&&!pinned)show(button);});
 container.addEventListener('pointerout',e=>{const button=e.target.closest('[data-hero-upgrade]');if(!pinned&&button&&!button.contains(e.relatedTarget))hide();});
 container.addEventListener('focusin',e=>{const button=e.target.closest('[data-hero-upgrade]');if(button)show(button);});
 container.addEventListener('focusout',()=>{if(!pinned)hide();});
 container.addEventListener('click',e=>{const button=e.target.closest('[data-hero-upgrade]');if(button){if(shown===button&&pinned)hide();else show(button,true);}});
 container.closest('.match').addEventListener('keydown',e=>{if(e.key==='Escape'&&!tip.hidden){hide();e.stopPropagation();}},true);
 return {update(unit){
  container.hidden=!['hero','illusion'].includes(unit.kind);
  if(container.hidden){hide();signature='';return;}
  const next=[unit.id,unit.heroId,...Object.keys(types).flatMap(type=>{const state=stateOf(unit,type);return [state.id,state.detail];})].join('|');
  if(next!==signature){
   signature=next;
   for(const [type,config]of Object.entries(types)){
    const button=container.querySelector(`[data-hero-upgrade="${type}"]`),state=stateOf(unit,type);
    button.dataset.upgradeState=state.id;button.dataset.heroId=unit.heroId;
    button.setAttribute('aria-label',`${unit.name} · ${config.name} · ${state.label}`);
   }
   if(shown)describe(shown);
  }
  if(shown)position();
 }};
}

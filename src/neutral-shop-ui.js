import {ITEM_BY_ID} from './item-data.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const times=[0,0,900,1800,3000];
const clock=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
const setHTML=(e,html)=>{if(e.renderedContent!==html){e.innerHTML=html;e.renderedContent=html;}};

export function mountNeutralShop(catalog,detail,game,actions){
 let previewTier=0,artifact=null,enchantment=null;
 catalog.addEventListener('click',async e=>{
  const tier=e.target.closest('[data-neutral-tier]'),item=e.target.closest('[data-neutral-artifact]'),enhancement=e.target.closest('[data-neutral-enchantment]');
  if(tier){previewTier=Number(tier.dataset.neutralTier);artifact=null;}
  if(item)artifact=item.dataset.neutralArtifact;
  if(enhancement)enchantment=enhancement.dataset.neutralEnchantment;
  if(e.target.closest('[data-neutral-keep]'))artifact='keep';
  if(e.target.closest('[data-craft-neutral]')){
   const result=await game.craftNeutral(artifact,enchantment);
   if(result.ok){previewTier=0;artifact=enchantment=null;actions.changed();}else actions.notify(result.reason);
  }
  if(tier||item||enhancement||e.target.closest('[data-neutral-keep]')||e.target.closest('[data-craft-neutral]'))update();
 });
 function update(){
  const h=game.player,craft=game.neutralCraftState(h),tier=previewTier||craft.tier,choices=h.neutralArtifactOptions?.[tier]||[],current=tier===craft.tier;
  if(artifact!=='keep'&&!choices.includes(artifact))artifact=choices[0];
  if(!craft.enchantments.includes(enchantment))enchantment=craft.enchantments[0];
  const chosen=ITEM_BY_ID[artifact==='keep'?h.neutralItem:artifact];
  const availableAt=times[tier],ready=game.time>=availableAt;
  const status=!current?`第 ${tier} 级开放时间 ${clock(availableAt)} · 先完成第 ${craft.tier} 级打造`:!ready?`第 ${tier} 级于 ${clock(availableAt)} 开放`:craft.canCraft?'选择珍品与附魔后即可打造':`需要 ${craft.cost} 块狂石 · 当前 ${Math.floor(craft.madstone)} 块`;
  const itemButton=(id,attribute,selected)=>{const item=ITEM_BY_ID[id];return `<button ${attribute}="${escape(id)}" aria-pressed="${id===selected}" class="neutral-choice ${id===selected?'selected':''}"><img src="/${item.image}" alt="" draggable="false"><span>${escape(item.name)}</span></button>`;};
  setHTML(catalog,`<section class="neutral-crafting"><div class="neutral-craft-heading"><h3>中立珍品与附魔</h3><strong>狂石 ${Math.floor(craft.madstone)} <small>本阶段累计上限 ${Number.isFinite(craft.cap)?craft.cap:'无限'}</small></strong></div><nav class="neutral-tier-tabs" aria-label="查看本局中立珍品选项">${[1,2,3,4].map(t=>`<button data-neutral-tier="${t}" aria-pressed="${t===tier}">第 ${t} 级 <small>${clock(times[t])}</small></button>`).join('')}</nav><p class="neutral-craft-status">${status}</p><p class="neutral-pool-note">每个宝物池开局固定抽取一项。本局各级选项可提前查看；65:00 后狂石不再有累计上限。</p><h4>选择一件珍品</h4><div class="neutral-artifact-choices">${choices.map(id=>itemButton(id,'data-neutral-artifact',artifact)).join('')}</div>${h.neutralItem&&current?`<button class="neutral-keep" data-neutral-keep aria-pressed="${artifact==='keep'}">保留 ${escape(ITEM_BY_ID[h.neutralItem].name)}</button>`:''}${current?`<h4>选择一种附魔</h4><div class="neutral-enchantment-choices">${craft.enchantments.map(id=>itemButton(id,'data-neutral-enchantment',enchantment)).join('')}</div><button class="neutral-craft-button" data-craft-neutral ${craft.canCraft&&!game.paused&&artifact&&enchantment?'':'disabled'}>打造第 ${tier} 级 · ${craft.cost} 块狂石</button>`:'<p>达到该级打造阶段后选择附魔。</p>'}</section>`);
  if(chosen)setHTML(detail,`<div class="detail-heading"><img src="/${chosen.image}" alt=""><div><h3>${escape(chosen.name)}</h3><span>${escape(chosen.en)}</span><b>第 ${tier} 级中立珍品</b></div></div>${actions.describe(chosen)}${current&&ITEM_BY_ID[enchantment]?`<div class="neutral-enchantment-detail"><h4>${escape(ITEM_BY_ID[enchantment].name)}</h4>${actions.describe(ITEM_BY_ID[enchantment])}</div>`:''}`);
 }
 return {update,open(){previewTier=0;artifact=enchantment=null;update();}};
}

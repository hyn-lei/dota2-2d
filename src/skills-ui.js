import { ABILITIES, INNATES, TALENTS, abilityAt, innateAt } from './ability-data.js';
import { canLearnTalent, canLearnAttributes, canLearnAbility } from './progression.js';
import { icon } from './icons.js';
import { castingStats } from './hero-runtime.js';
import { marksmanshipActive } from './drow-runtime.js';
import { itemState } from './item-runtime.js';
import {unitSkillIds,unitSkill} from './unit-skills.js';
import {skillKey,getBindings,extraKey} from './keybindings.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number.isFinite(n)?Number(n.toFixed(2)).toString():'—';
const labels={fireblast_damage:'火焰爆轰伤害',bonus_cast_speed:'施法速度加成 %',burn_damage:'燃烧伤害 / 秒',slow_movement_speed_pct:'移动速度调整 %',projectile_speed:'弹道速度',multicast_delay:'多重施法间隔 / 秒',bonus_movement_speed:'移动速度加成 %',self_bonus:'自身额外攻速',mana_per_str:'每点力量提供魔法',mana_regen_per_str:'每点力量回蓝 / 秒',multicast_2_times:'两重施法概率 %',multicast_3_times:'三重施法概率 %',multicast_4_times:'四重施法概率 %',strength_for_one_pct:'每增加 1% 概率所需力量',scepter_mana:'当前魔法消耗 %',damage_absorb_pct:'攻击伤害吸收 %',attacks:'抵挡攻击次数',radius:'作用范围',duration:'持续时间',bonus_armor:'额外护甲',damage_per_second:'每秒伤害',slow:'移动减速 %',trigger_attacks:'触发攻击次数',damage:'伤害',speed_bonus:'移动速度加成 %',armor_bonus:'护甲加成',armor_per_stack:'每次斩杀永久护甲',base_mana_regen:'全图回蓝 / 秒',proximity_mana_regen_tooltip:'近处回蓝 / 秒',mana_regen_amp:'自身回蓝增强 %',nova_damage:'伤害',movespeed_slow:'移动减速 %',attackspeed_slow:'攻速降低',creep_multiplier:'非远古小兵伤害倍率',blade_fury_damage:'每秒伤害',blade_fury_radius:'作用范围',immunity_resist:'额外魔抗 %',healing_ward_heal_amount:'每秒最大生命恢复 %',healing_ward_aura_radius:'治疗范围',blade_dance_crit_chance:'暴击概率 %',blade_dance_crit_mult:'暴击伤害 %',bonus_damage:'额外攻击伤害',bonus_attack_speed:'额外攻击速度',attack_rate_multiplier:'攻击频率倍率',stun_duration:'眩晕时间',fail_stun_duration:'未束缚时眩晕',powershot_damage:'满蓄力伤害',damage_reduction:'每个目标伤害递减 %',movespeed_bonus_pct:'移动速度加成 %',focusfire_damage_reduction:'攻击伤害调整 %',torrent_damage:'总伤害',delay:'生效延迟',slow_duration:'减速时间',damage_bonus:'强化攻击伤害',cleave_damage:'分裂伤害 %',cleave_distance:'分裂距离',allied_duration:'友方持续时间',ghostship_speed:'幽灵船速度',ghostship_width:'碰撞范围',rum_factor:'朗姆酒强化倍率',mana_multiplier:'魔法转护盾 %',barrier_duration:'护盾时间',armor_pct_as_strength:'护甲转力量 %',stack_gain_time:'获得一层间隔',max_stacks:'最高层数',agi_bonus_pct_per_stack:'每层基础敏捷 %',movement_speed_pct_per_stack:'每层移动速度 %',movespeed_bonus:'额外移动速度',ghostship_absorb:'延迟伤害 %',damage_threshold:'触发生命阈值 %',buff_duration:'增益时间',max_movespeed:'移动速度上限'};
const contexts=new WeakMap();
Object.assign(labels,{frost_arrows_movement_speed:'冰箭移动减速 %',chance:'射手天赋概率 %',disable_range:'近身失效距离',wave_speed:'狂风弹速',wave_width:'狂风宽度',wave_length:'狂风距离',silence_duration:'沉默时间',knockback_distance_max:'最大击退距离',arrow_count_per_wave:'每波箭数',wave_count:'波数',arrow_damage_pct:'攻击伤害 %',arrow_speed:'箭速',arrow_width:'箭碰撞半径',arrow_range_base:'额外射程',multishot_movespeed:'引导期间移速 %',trueshot_agi_bonus:'精准光环敏捷 %',trueshot_agi_bonus_allies_pct:'友军分享 %',shard_max_stacks:'低温最大层数',shard_bonus_damage_per_stack:'每层低温攻击伤害',shard_regen_reduction_pct_per_stack:'每层生命恢复降低 %',shard_burst_damage_per_stack:'每层爆发伤害'});
function art(skill){return `<img src="/assets/abilities/${skill.id}.png" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"/><span hidden>${icon(skill.icon)}</span>`;}
export function mountSkills(container,game,actions,unit=game.selected){
 const h=unit,abilities=ABILITIES[h.heroId];
 const previous=contexts.get(container);clearTimeout(previous?.hideTimer);
 container.classList.toggle('unit-abilities',h.kind!=='hero');
 if(!abilities||h.kind!=='hero')return mountUnitSkills(container,game,actions,h);
 container.innerHTML=`<div class="skill-point-summary"><span id="skill-point-label">技能点 <b>1</b></span><small>Ctrl + ${getBindings().skills.map(k=>k.toUpperCase()).join(' / ')} 加点</small></div><div class="skill-buttons"><div class="talent-slot"><button class="learn-talent" id="learn-talent" aria-label="学习天赋" title="有可用天赋点">+</button><button class="talent-button" id="talent-button" aria-label="天赋树与属性加点" title="U · 天赋树与属性加点">${icon('talent')}<span>天赋 U</span></button><div class="talent-tier-pips">${[25,20,15,10].map(t=>`<i data-tier="${t}"></i>`).join('')}</div></div>${abilities.map((s,i)=>`<div class="ability-wrap"><button class="learn-ability" data-learn="${i}" aria-label="升级${s.name}">+</button><button class="ability" id="ability-${i}" data-ability="${i}" style="--skill-color:${s.color}" aria-label="${s.name}"><span class="ability-art">${art(s)}</span><kbd>${skillKey(i)}</kbd><span class="ability-cost"></span><span class="cooldown" id="cooldown-${i}"></span><span class="skill-unlearned">未学习</span><span class="ability-name">${s.name}</span></button><span class="skill-ranks" aria-label="技能等级">${Array.from({length:s.maxLevel},()=>'<i></i>').join('')}</span></div>`).join('')}<div class="skill-aux"><button class="innate-button" aria-label="先天能力：${INNATES[h.heroId].name}">${art(INNATES[h.heroId])}<span>先天</span></button></div><button class="recall-button" id="recall-button" title="B · 传送回泉水（3 秒）">${icon('home')}<kbd>B</kbd><span>回城</span></button></div><div class="skill-tooltip" role="tooltip" hidden></div><div class="talent-panel" hidden><div class="talent-heading"><div><small>${escape(h.name)}</small><h2>天赋树</h2></div><button class="talent-close" aria-label="关闭天赋树">×</button></div><p class="talent-points"></p><div class="talent-rows">${[3,2,1,0].map(t=>`<div class="talent-row"><button data-talent="${t*2}">${escape(TALENTS[h.heroId][t*2].name)}</button><b>${[10,15,20,25][t]}</b><button data-talent="${t*2+1}">${escape(TALENTS[h.heroId][t*2+1].name)}</button></div>`).join('')}</div><button class="attribute-upgrade" data-attributes="true"><strong>+2 全属性</strong><span>力量、敏捷、智力各 +2</span><small></small></button><p class="talent-note">技能和全属性消耗技能点，天赋消耗独立天赋点。每层天赋先选一侧；27 / 28 / 29 / 30 级依次获得另一侧天赋。</p></div>`;
 const state={container,game,actions,unit:h,heroId:h.heroId,hover:null,tooltip:container.querySelector('.skill-tooltip'),talents:container.querySelector('.talent-panel')};contexts.set(container,state);
 container.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>state.unit.id===game.player.id&&actions.learn(Number(b.dataset.learn)));
 container.querySelectorAll('[data-ability]').forEach(b=>{b.onclick=()=>{if(state.unit.id===game.player.id)actions.cast(Number(b.dataset.ability));};b.oncontextmenu=e=>{e.preventDefault();if(state.unit.id!==game.player.id)return;if(abilities[+b.dataset.ability].kind==='autocast')(actions.autocast||actions.cast)(+b.dataset.ability);};b.ondblclick=()=>{if(state.unit.id===game.player.id&&h.heroId==='ogre_magi'&&+b.dataset.ability===2)actions.castSelf?.(2);};});
 const hideTip=()=>{clearTimeout(state.hideTimer);state.hideTimer=setTimeout(()=>{state.hover=null;state.tooltip.hidden=true;},180);};
 const bindTip=(button,index)=>{button.addEventListener('pointerenter',()=>{clearTimeout(state.hideTimer);showTip(state,index,button);});button.addEventListener('focus',()=>showTip(state,index,button));button.addEventListener('pointerleave',hideTip);button.addEventListener('blur',hideTip);};
 state.tooltip.addEventListener('pointerenter',()=>clearTimeout(state.hideTimer));state.tooltip.addEventListener('pointerleave',hideTip);
 container.querySelectorAll('[data-ability]').forEach(b=>bindTip(b,+b.dataset.ability));bindTip(container.querySelector('.innate-button'),-1);
 container.querySelector('.talent-button').onclick=()=>toggleTalents(container);
 container.querySelector('#learn-talent').onclick=()=>toggleTalents(container);
 container.querySelector('.talent-close').onclick=()=>state.talents.hidden=true;
 container.querySelectorAll('[data-talent]').forEach(b=>b.onclick=()=>state.unit.id===game.player.id&&actions.talent(Number(b.dataset.talent)));
 container.querySelector('[data-attributes]').onclick=()=>{if(state.unit.id===game.player.id)actions.attributes();};container.querySelector('#recall-button').onclick=()=>{if(state.unit.id===game.player.id)actions.recall();};
 state.talents.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();state.talents.hidden=true;}});
 updateSkills(container,game,h);return container;
}
export function toggleTalents(container){const state=contexts.get(container);if(!state?.talents)return;state.talents.hidden=!state.talents.hidden;state.tooltip.hidden=true;updateSkills(container,state.game);}
function tipHTML(h,index,game){
 const innate=index<0,adjust=s=>{const result=castingStats(h,s);if(result){result.cooldown*=1-(h.cooldownReduction||0)/100;if(s.id==='ogre_magi_multicast'){result.values={...s.values};for(const n of [2,3,4]){const key=`multicast_${n}_times`;if(result.values[key]>0)result.values[key]=Math.min(100,result.values[key]+h.strength/result.values.strength_for_one_pct);}}}return result;},s=innate?innateAt(h.heroId,h.level,h.talents,h):adjust(abilityAt(h.heroId,index,h.abilityLevels[index],h.talents,h)),next=innate||s.level>=s.maxLevel?null:adjust(abilityAt(h.heroId,index,s.level+1,h.talents,h));
 const row=(name,a,b)=>`<tr><th>${name}</th><td>${number(a)}</td><td>${b===undefined?'—':number(b)}</td></tr>`;
 const values=[...Object.keys(s.values)].filter(k=>labels[k]&&(s.values[k]!==0||next?.values[k])).slice(0,12);
 if(s.id==='drow_ranger_frost_arrows'){s.range=game.combatStats(h).range;if(next)next.range=s.range;}
 const autocastHint=s.kind!=='autocast'?'':h.heroId==='ogre_magi'?` · 右键图标切换自动施放 · Alt + ${skillKey(index)} 对自己施放`:h.heroId==='drow_ranger'?` · 按 ${skillKey(index)} 指定一次冰箭攻击 · 右键图标切换自动施放`:` · 按 ${skillKey(index)} 或右键图标切换自动施放`;
 return `<div class="skill-tip-heading">${icon(s.icon)}<div><strong>${escape(s.name)}</strong><span>${innate?'先天能力 · 自动生效':`${s.kind==='passive'?'被动技能':s.kind==='autocast'?'自动施放':'主动技能'} · ${s.level} / ${s.maxLevel} 级`}</span></div></div><p>${escape(s.description)}</p><table><thead><tr><th>技能数值</th><td>${innate?'当前':s.level?'当前':'学习后'}</td><td>${next&&s.level?'下一级':'—'}</td></tr></thead><tbody>${s.kind!=='passive'?row('魔法消耗',s.mana,next&&s.level?next.mana:undefined)+row('冷却 / 秒',s.cooldown,next&&s.level?next.cooldown:undefined)+row('施法前摇 / 秒',s.castPoint,next&&s.level?next.castPoint:undefined):''}${s.range>0?row('施法距离',s.range,next&&s.level?next.range:undefined):''}${values.map(k=>row(labels[k],s.values[k],next&&s.level?next.values[k]:undefined)).join('')}</tbody></table>${!innate?`<small class="skill-tip-unlock">${next?`下一等级需要英雄 ${s.requiredLevels[s.level]} 级及 1 技能点`:'技能已满级'}${autocastHint}</small>`:''}`;
}
function showTip(state,index,button){state.hover={index,button};state.tipContent=tipHTML(state.unit,index,state.game);state.tooltip.innerHTML=state.tipContent;state.tooltip.hidden=false;const rect=button.getBoundingClientRect();state.tooltip.style.left=`${Math.max(10,Math.min(innerWidth-350,rect.left-120))}px`;state.tooltip.style.bottom=`${Math.max(12,innerHeight-rect.top+15)}px`;}
export function updateSkills(container,game,unit=game.selected){
 let state=contexts.get(container);if(!state)return;
 const heroId=unit.kind==='hero'?unit.heroId:null;
 if(state.heroId!==heroId||state.unit.id!==unit.id){mountSkills(container,game,state.actions,unit);return;}
 state.game=game;state.unit=unit;const h=unit,own=h.id===game.player.id;
 if(!heroId){updateUnitSkills(state);return;}
 container.querySelector('.skill-point-summary small').textContent='Ctrl + '+getBindings().skills.map(k=>k.toUpperCase()).join(' / ')+' 加点';
 for(const button of container.querySelectorAll('[data-ability]'))button.querySelector('kbd').textContent=skillKey(+button.dataset.ability);
 const tp=itemState(game,h,0,'tp'),recall=container.querySelector('#recall-button');
 recall.disabled=!own||h.dead||game.paused||!tp.item||tp.cooldown>0;
 recall.title=`B · 传送回泉水 · ${tp.meta?.charges||0} 张卷轴${tp.cooldown>0?' · 冷却 '+Math.ceil(tp.cooldown)+' 秒':''}`;
 recall.querySelector('span').textContent=tp.cooldown>0?`${Math.ceil(tp.cooldown)} 秒`:'回城';
 let extras=container.querySelector('.extra-skills');if(!extras){extras=document.createElement('div');extras.className='extra-skills';container.querySelector('.skill-aux').before(extras);}
 const extraHTML=game.extraAbilities(h).map(s=>{const cooldown=h.extraCooldowns?.[s.id]||0;return `<button class="extra-ability ${cooldown?'on-cooldown':''}" data-extra="${s.id}" ${!own||!s.level||h.dead||game.paused?'disabled':''} title="${escape(s.name+'：'+s.description)}" aria-label="${escape(s.name)}"><span>${art(s)}</span><kbd>${extraKey(s.key)}</kbd><strong>${escape(s.name)}</strong><small>${cooldown?Math.ceil(cooldown)+' 秒':s.mana+' 魔法'}</small></button>`;}).join('');
 if(extras.renderedContent!==extraHTML){extras.innerHTML=extraHTML;extras.renderedContent=extraHTML;}extras.hidden=!extraHTML;
 container.querySelector('#skill-point-label').innerHTML=`技能点 <b>${h.skillPoints}</b> · 天赋点 <b>${h.talentPoints||0}</b>`;container.classList.toggle('has-skill-points',h.skillPoints>0||h.talentPoints>0);
 ABILITIES[h.heroId].forEach((_,i)=>{
  const s=castingStats(h,game.skill(i,h)),button=container.querySelector(`#ability-${i}`),learn=container.querySelector(`[data-learn="${i}"]`),eligible=canLearnAbility(h,i),cooldown=h.cooldowns[i]||0,recast=h.heroId==='kunkka'&&i===2&&!!h.xMark;
  learn.disabled=!own||!eligible.ok||game.paused||game.status!=='playing';learn.title=eligible.ok?`学习 ${s.name} ${s.level+1} 级（Ctrl + ${skillKey(i)}）`:eligible.reason;learn.hidden=!own||h.skillPoints<=0;
  button.setAttribute('aria-readonly',String(!own));button.classList.toggle('unlearned',!s.level);button.classList.toggle('passive-skill',s.kind==='passive');button.classList.toggle('on-cooldown',!recast&&cooldown>.05);button.classList.toggle('no-mana',!recast&&h.mana<s.mana);button.classList.toggle('recast-ready',recast);button.classList.toggle('autocast-on',s.kind==='autocast'&&h.autocast?.[i]!==false&&s.level>0);
  button.classList.toggle('passive-disabled',h.heroId==='drow_ranger'&&i===3&&s.level>0&&!marksmanshipActive(game,h,s));
  button.style.setProperty('--cooldown-progress',`${Math.max(0,Math.min(1,1-cooldown/(s.cooldown*(1-(h.cooldownReduction||0)/100)||1)))*360}deg`);
  button.querySelector('.skill-unlearned').hidden=!!s.level;button.querySelector('.ability-name').textContent=recast?'标记返回':s.name;button.querySelector('.ability-cost').textContent=s.kind==='passive'?'被动':recast?'0':s.mana;
  button.querySelector('.cooldown').textContent=!recast&&cooldown>.05?Math.ceil(cooldown):'';button.disabled=h.dead||game.status!=='playing';button.setAttribute('aria-label',`${s.name}，${s.level} 级${!s.level?'，未学习':''}`);
  button.parentElement.querySelectorAll('.skill-ranks i').forEach((pip,rank)=>pip.classList.toggle('learned',rank<s.level));
 });
 const talentReady=own&&TALENTS[h.heroId].some((_,i)=>canLearnTalent(h,i).ok);
 const plus=container.querySelector('#learn-talent');plus.hidden=!talentReady;plus.disabled=game.paused;
 container.querySelector('.talent-button').classList.toggle('talent-available',talentReady);
 container.querySelectorAll('[data-tier]').forEach(pip=>{const tier=[10,15,20,25].indexOf(+pip.dataset.tier);pip.classList.toggle('left-learned',h.talents.includes(tier*2));pip.classList.toggle('right-learned',h.talents.includes(tier*2+1));});
 state.talents.querySelector('.talent-points').textContent=`英雄等级 ${h.level} · 可用技能点 ${h.skillPoints} · 可用天赋点 ${h.talentPoints||0}`;
 state.talents.querySelectorAll('[data-talent]').forEach(b=>{const i=+b.dataset.talent,check=canLearnTalent(h,i);b.disabled=!own||!check.ok||game.paused;b.classList.toggle('learned',h.talents.includes(i));b.title=h.talents.includes(i)?'已学习':check.ok?'消耗 1 天赋点学习':check.reason;});
 const statButton=state.talents.querySelector('[data-attributes]'),statCheck=canLearnAttributes(h);statButton.disabled=!own||!statCheck.ok||game.paused;statButton.title=statCheck.ok?'消耗 1 点，三维属性各 +2':statCheck.reason;statButton.querySelector('small').textContent=`${h.attributeBonusLevel} / 7`;
 if(state.hover&&!state.tooltip.hidden){const html=tipHTML(h,state.hover.index,game);if(state.tipContent!==html){state.tooltip.innerHTML=html;state.tipContent=html;}}
}

function unitTipHTML(state,id){
 const s=unitSkill(state.game,state.unit,id),row=(k,v)=>`<tr><th>${escape(k)}</th><td>${escape(v)}</td></tr>`;
 return `<div class="skill-tip-heading"><strong>${escape(s.name)}</strong><span>${s.passive?'被动技能':'主动技能'}${s.locked?' · 尚未解锁':''}${s.active===false?' · 暂时失效':''}</span></div><p>${escape(s.description)}</p><table><tbody>${!s.passive?row('魔法消耗',s.mana)+row('冷却 / 秒',s.cooldown)+row('剩余冷却 / 秒',number(s.remaining))+row('施法前摇 / 秒',s.castPoint||0):''}${s.range?row('施法距离',s.range):''}${s.rows.map(([k,v])=>row(k,v)).join('')}</tbody></table>${s.notes.map(n=>`<p class="unit-skill-note">${escape(n)}</p>`).join('')}`;
}
function mountUnitSkills(container,game,actions,unit){
 const ids=unitSkillIds(unit);
 container.innerHTML=`<div class="skill-point-summary"><span>${escape(unit.name||'所选单位')}</span><small>${unit.team===2?'中立单位':unit.team===game.player.team?'友方单位':'敌方单位'}</small></div><div class="skill-buttons unit-skill-buttons">${ids.map(id=>{const s=unitSkill(game,unit,id);return `<div class="ability-wrap"><button class="ability unit-ability" data-unit-ability="${escape(id)}" aria-readonly="true" aria-label="${escape(s.name)}"><span class="ability-art">${s.image?`<img src="/${s.image}" alt="">`:`<span>${icon(s.passive?'shield':'aura')}</span>`}</span><span class="ability-cost"></span><span class="cooldown"></span><span class="ability-name">${escape(s.name)}</span></button></div>`;}).join('')||'<div class="unit-no-skills">无技能</div>'}</div><div class="skill-tooltip" role="tooltip" hidden></div>`;
 const state={container,game,actions,unit,heroId:null,ids:ids.join('|'),tooltip:container.querySelector('.skill-tooltip'),buttons:[...container.querySelectorAll('[data-unit-ability]')]};contexts.set(container,state);
 const hide=()=>{clearTimeout(state.hideTimer);state.hideTimer=setTimeout(()=>{state.hover=null;state.tooltip.hidden=true;},180);};
 for(const button of state.buttons){
  const show=()=>{clearTimeout(state.hideTimer);state.hover={id:button.dataset.unitAbility,button};state.tipContent=unitTipHTML(state,state.hover.id);state.tooltip.innerHTML=state.tipContent;state.tooltip.hidden=false;const r=button.getBoundingClientRect();state.tooltip.style.left=`${Math.max(10,Math.min(innerWidth-Math.min(350,innerWidth-20),r.left-120))}px`;state.tooltip.style.bottom=`${Math.max(12,innerHeight-r.top+15)}px`;};
  button.onpointerenter=button.onfocus=show;button.onpointerleave=button.onblur=hide;
 }
 state.tooltip.onpointerenter=()=>clearTimeout(state.hideTimer);state.tooltip.onpointerleave=hide;
 updateUnitSkills(state);return container;
}
function updateUnitSkills(state){
 const {container,game,unit}=state;
 if(unitSkillIds(unit).join('|')!==state.ids){mountUnitSkills(container,game,state.actions,unit);return;}
 for(const button of state.buttons){
  const s=unitSkill(game,unit,button.dataset.unitAbility);
  button.classList.toggle('passive-skill',s.passive);button.classList.toggle('passive-disabled',s.active===false||s.locked||unit.dead);button.classList.toggle('on-cooldown',s.remaining>.05);
  button.style.setProperty('--cooldown-progress',`${Math.max(0,1-s.remaining/(s.cooldown||1))*360}deg`);
  button.querySelector('.cooldown').textContent=s.remaining>.05?Math.ceil(s.remaining):'';
  button.querySelector('.ability-cost').textContent=s.locked?'未解锁':s.passive?'被动':s.mana||'';
 }
 if(state.hover&&!state.tooltip.hidden){const html=unitTipHTML(state,state.hover.id);if(state.tipContent!==html){state.tooltip.innerHTML=html;state.tipContent=html;}}
}

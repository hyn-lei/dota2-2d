import { Game } from './engine.js';
import { Renderer } from './renderer.js';
import { HEROES, ITEMS, WORLD } from './data.js';
import { ITEM_BY_ID } from './item-data.js';
import { physicalDamageMultiplier } from './hero-stats.js';
import { mountStatusBar, updateStatusBar } from './status-ui.js';
import { mountSkills, updateSkills, toggleTalents } from './skills-ui.js';
import { icon, mark } from './icons.js';
import { mountShop, itemArt } from './shop-ui.js';
import { mountCoop, exitCoopMatch } from './coop-ui.js';
import { loadMatch, storeMatch, restoreMatch, clearMatch } from './game-save.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
let preferences={sound:true,difficulty:'normal',hero:'juggernaut'};
let history={matches:0,wins:0,bestKills:0};
try{preferences={...preferences,...JSON.parse(localStorage.getItem('af-preferences')||'{}')};history={...history,...JSON.parse(localStorage.getItem('af-history')||'{}')};}catch{}
if(!HEROES[preferences.hero])preferences.hero='juggernaut';
let chosen=preferences.hero,view='lobby',game=null,renderer=null,modal=null,shopOpen=false,inspectionOpen=false,keys=new Set(),pointer={x:0,y:0},hudAt=0,lastFrame=0,lastStatus='playing',toastTimer,returnFocus;
let audioContext,shopUI;
let checkpointAt=0,checkpointError=false;
const save=()=>{try{localStorage.setItem('af-preferences',JSON.stringify(preferences));localStorage.setItem('af-history',JSON.stringify(history));}catch{}};
function browserStorage(){try{return localStorage;}catch{return null;}}
function checkpointMatch(){
  if(!game||game.isNetwork||game.status!=='playing')return;
  const result=storeMatch(browserStorage(),game);checkpointAt=performance.now();
  const label=$('#match-mode');
  if(label){label.textContent=result.ok?'单机 · 已自动存档':'单机 · 存档失败';label.title=result.ok?`本地保存于 ${new Date(result.savedAt).toLocaleTimeString()}，关闭网页后可在大厅继续`:result.reason;label.classList.toggle('save-failed',!result.ok);}
  if(!result.ok&&!checkpointError)toast(result.reason);
  checkpointError=!result.ok;
}
function resumeMatch(){
  const saved=loadMatch(browserStorage());
  if(!saved.record){toast(saved.error||'没有可继续的单机存档');return;}
  try{startGame(restoreMatch(saved.record),true);}catch{toast('存档暂时无法恢复，原存档已保留');}
}
const clock=(seconds)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
function sound(type='click'){
  if(!preferences.sound)return;
  try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type==='cast'?'triangle':'sine';o.frequency.setValueAtTime(type==='cast'?520:type==='start'?180:350,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(type==='start'?540:160,audioContext.currentTime+.14);g.gain.setValueAtTime(.045,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.22);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.23);}catch{}
}
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2600);}
function setupRenderer(){renderer?.destroy();renderer=new Renderer($('#battlefield'));}
function portrait(h,cls=''){return `<img class="${cls}" src="/${h.portrait}" alt="${h.name}" draggable="false" />`;}
function renderLobby(){
  if(game?.isNetwork){exitCoopMatch();return;}
  if(game?.status==='playing'){game.clearMovement(game.player);game.setPaused(true);checkpointMatch();}
  cancelItemUse();
  view='lobby';game=null;modal=null;shopOpen=false;keys.clear();
  const saved=loadMatch(browserStorage()),resume=saved.record;
  app.innerHTML=`<main class="lobby">
    <canvas id="battlefield" class="lobby-canvas" aria-label="远古战场的动态森林背景"></canvas>
    <header class="masthead">
      <a class="brand" href="#" aria-label="Ancient Front 首页"><span class="brand-mark">${mark()}</span><span class="brand-name">DOTA <span>2D</span><small>ANCIENT FRONT</small></span></a>
      <nav class="main-nav" aria-label="主导航"><button class="nav-item active" data-nav="battle">战场<span>BATTLEFIELD</span></button><button class="nav-item" data-nav="heroes">英雄档案<span>HEROES</span></button><button class="nav-item" data-nav="guide">作战指南<span>HOW TO PLAY</span></button></nav>
      <div class="header-tools"><span class="online-label"><i></i> 本地战场已就绪</span><button class="icon-button sound-toggle" aria-label="切换音效" title="切换音效">${icon(preferences.sound?'volume':'mute')}</button><button class="icon-button settings-button" aria-label="游戏设置" title="游戏设置">${icon('settings')}</button></div>
    </header>
    <section class="hero-stage" aria-label="选择你的英雄">
      <div class="hero-stage-copy"><div class="eyebrow"><span></span> THE ANCIENT AWAITS</div><h1>远古战场</h1><p class="main-subtitle">每一条兵线，都通往胜利。</p>
        <div class="selected-info" id="selected-info"></div>
        <div class="lobby-skills" id="lobby-skills"></div>
        <button class="text-button hero-detail">查看英雄技能 ${icon('chevron')}</button>
      </div>
      <div class="hero-art"><div class="hero-aura"></div><span class="hero-ghost-name" id="hero-ghost"></span><img id="hero-render" draggable="false" /><div class="hero-ground"></div></div>
      <div class="hero-side-label"><span id="hero-index">01</span><i></i><span>CHOOSE YOUR<br/>LEGEND</span></div>
      <div class="battle-note"><span class="tiny-diamond"></span><div>熟悉的战场，全新的视角。<small>三路争锋 · 英雄成长 · 远古之战</small></div></div>
    </section>
    <section class="selection-dock" aria-label="英雄与对局选项"><div class="roster-label"><span class="eyebrow">YOUR HERO</span><strong>选择英雄</strong><small>01 — ${String(Object.keys(HEROES).length).padStart(2,'0')}</small></div><div class="hero-roster" style="--hero-count:${Object.keys(HEROES).length}">${Object.values(HEROES).map((h,i)=>`<button class="hero-option ${h.id===chosen?'selected':''}" data-hero="${h.id}" aria-pressed="${h.id===chosen}"><span class="roster-art">${portrait(h)}<span class="hero-check">${icon('check')}</span></span><span class="roster-text"><strong>${h.name}</strong><small>${h.role}</small></span><span class="roster-number">0${i+1}</span></button>`).join('')}</div>
      <div class="launch-area"><div class="match-settings"><span><i></i> 单人人机 <b>5 V 5</b></span><label class="difficulty-label" for="difficulty">难度 <select id="difficulty" aria-label="对局难度"><option value="easy">休闲</option><option value="normal">标准</option><option value="hard">挑战</option></select></label></div>${resume?`<button id="resume-game" class="resume-game"><strong>继续上次对局</strong><small>${HEROES[resume.state.heroChoice].name} · ${clock(resume.state.time)} · 等级 ${resume.state.entities.find(e=>e.isPlayer).level}</small></button>`:''}${saved.error?`<p class="save-warning" role="status">${escapeHtml(saved.error)}</p>`:''}<button id="start-game" class="primary-button"><span>${resume?'开始新对局':'进入战场'}<small>ENTER THE BATTLE</small></span>${icon('arrow')}</button></div>
    </section>
    <footer class="lobby-footer"><span>2D MOBA EXPERIENCE <i> / </i> 非官方同人原型</span><button class="history-button">${icon('flag')} 战绩 <strong>${history.wins}</strong> 胜 <span>·</span> ${history.matches} 场</button><span class="footer-version">LOCAL PLAY <i></i> V 1.0</span></footer>
    <div id="toast" role="status"></div><div id="modal-root"></div>
  </main>`;
  setupRenderer();selectHero(chosen,false);$('#difficulty').value=preferences.difficulty;
  document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>selectHero(b.dataset.hero));
  $('#start-game').onclick=startGame;
  $('#resume-game')?.addEventListener('click',resumeMatch);
  $('#difficulty').onchange=e=>{preferences.difficulty=e.target.value;save();};
  $('.hero-detail').onclick=()=>openModal('hero');
  $('.history-button').onclick=()=>openModal('history');
  $('.brand').onclick=e=>{e.preventDefault();sound();};
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{if(b.dataset.nav!=='battle')openModal(b.dataset.nav==='heroes'?'hero':'guide');});
  bindShared();
  mountCoop({get heroId(){return chosen;},start:startGame,notify:toast,end:message=>{game=null;renderLobby();toast(message);}});
  window.scrollTo(0,0);
}
function selectHero(id,playSound=true){
  chosen=id;preferences.hero=id;save();const h=HEROES[id];if(playSound)sound();
  document.querySelectorAll('[data-hero]').forEach(b=>{b.classList.toggle('selected',b.dataset.hero===id);b.setAttribute('aria-pressed',String(b.dataset.hero===id));});
  $('#selected-info').innerHTML=`<div class="hero-attribute"><span>${icon(h.attribute==='智力'?'crystal':h.attribute==='力量'?'shield':'swords')} ${h.attribute}</span><i></i>${h.role}</div><h2>${h.name}<span>${h.en}</span></h2><p>${h.description}</p>`;
  $('#lobby-skills').innerHTML=h.skills.map(s=>`<button class="lobby-skill" style="--skill-color:${s.color}" aria-label="${s.name}：${s.description}" title="${s.key} · ${s.name} — ${s.description}">${icon(s.icon)}<kbd>${s.key}</kbd></button>`).join('');
  document.querySelectorAll('.lobby-skill').forEach(b=>b.onclick=()=>openModal('hero'));
  const img=$('#hero-render');img.src='/'+h.render;img.alt=h.name+'英雄立绘';img.classList.remove('arrive');void img.offsetWidth;img.classList.add('arrive');
  $('#hero-ghost').textContent=h.en;$('#hero-index').textContent='0'+(Object.keys(HEROES).indexOf(id)+1);document.documentElement.style.setProperty('--hero-color',h.color);
}
function bindShared(){
  $('.sound-toggle').onclick=()=>{preferences.sound=!preferences.sound;save();$('.sound-toggle').innerHTML=icon(preferences.sound?'volume':'mute');toast(preferences.sound?'音效已开启':'音效已关闭');};
  $('.settings-button')?.addEventListener('click',()=>openModal('settings'));
}
function startGame(providedGame=null,resume=false){
  if(game?.isNetwork&&!providedGame?.isNetwork){exitCoopMatch();return;}
  if(!providedGame?.isNetwork&&!resume){
    checkpointMatch();const saved=loadMatch(browserStorage());
    if(saved.hasSave&&!window.confirm('开始新对局将替换上次的单机存档，无法再继续原对局。确定开始吗？'))return;
  }
  if(providedGame instanceof Game)chosen=providedGame.player.heroId;
  cancelItemUse();
  sound('start');view='match';modal=null;shopOpen=false;inspectionOpen=false;keys.clear();game=providedGame instanceof Game?providedGame:new Game({hero:chosen,difficulty:preferences.difficulty,seed:Math.floor(Math.random()*100000)});lastStatus='playing';checkpointAt=0;checkpointError=false;
  const h=HEROES[chosen];
  app.innerHTML=`<main class="match"><canvas id="battlefield" aria-label="2D 对战战场，左键查看单位，右键移动与攻击，Q W E R 释放技能" tabindex="0"></canvas>
    <header class="match-header"><button class="match-brand" aria-label="暂停与菜单">${mark()}<span>ANCIENT<br/>FRONT</span></button><div class="scoreboard"><div class="team-name radiant">天辉 <span>RADIANT</span></div><strong id="radiant-score">0</strong><div class="match-clock">${icon('sun')}<b id="match-time">00:00</b><small id="match-mode">5V5 · 人机对战</small></div><strong id="dire-score">0</strong><div class="team-name dire">夜魇 <span>DIRE</span></div></div><div class="match-tools"><button class="icon-button" id="guide-button" aria-label="作战指南" title="作战指南 H">${icon('help')}</button><button class="icon-button sound-toggle" aria-label="切换音效">${icon(preferences.sound?'volume':'mute')}</button><button class="icon-button" id="pause-button" aria-label="暂停游戏" title="暂停 Esc">${icon('pause')}</button></div></header>
    <aside class="objective"><span class="objective-icon">${icon('tower')}</span><div><span class="eyebrow">当前目标</span><strong id="objective-text">跟随兵线，攻破敌方防御塔</strong><small id="tower-count">敌方防御塔 11 / 11 · 兵营 6 / 6</small></div></aside><div id="event-feed" class="event-feed" aria-live="polite"></div>
    <div id="death-overlay" class="death-overlay" hidden><span>你已阵亡</span><strong id="respawn-count">10</strong><small>即将于泉水重生</small></div><div class="recall-progress" id="recall-progress" hidden><span>正在传送回泉水</span><div><i id="recall-fill"></i></div><small>移动、施法或受到伤害会打断回城</small></div>
    <div class="control-hint" id="control-hint"><span><b>左键</b> 属性 / 装备</span><span><b>右键</b> 移动 / 攻击</span><span><b>Q W E R</b> 技能</span><span><b>滚轮</b> 缩放</span><span><b>空格</b> 回到英雄</span><button aria-label="隐藏操作提示">${icon('close')}</button></div>
    <div class="map-tools"><span>7.41f <i>标准地图</i></span><button id="map-overview" title="M · 查看全图">全图 M</button><button id="map-center" title="空格 · 返回英雄">跟随英雄</button><button id="camp-bounds" title="Alt · 显示野怪刷新范围">营地范围</button></div>
    <aside id="selection-panel" class="selection-panel" aria-label="所选单位属性与装备" hidden><div class="inspection-heading"><span>单位详情</span><button class="icon-button" id="close-inspection" aria-label="关闭单位详情">${icon('close')}</button></div><div id="inspection-body"></div></aside>
    <footer class="game-hud"><div class="minimap-wrap"><canvas id="minimap" width="240" height="240" aria-label="小地图，单击查看区域，右键移动"></canvas><span>DOTA 2 · 7.41f</span></div>
      <section class="hero-hud" aria-label="英雄状态"><div class="hud-portrait">${portrait(h)}<span id="hero-level">1</span></div><div class="hud-vitals"><div class="hud-hero-title"><strong>${h.name}</strong><small id="kda">0 / 0 / 0</small></div><div class="vital-bar health"><i id="hp-fill"></i><span id="hp-label"></span></div><div class="vital-bar mana"><i id="mana-fill"></i><span id="mana-label"></span></div><div class="xp-bar" title="经验值"><i id="xp-fill"></i></div><div class="hero-stats"><span title="攻击力">${icon('sword')}<b id="stat-damage">${h.damage}</b></span><span title="护甲">${icon('shield')}<b id="stat-armor">${h.armor}</b></span><span title="移动速度">${icon('boots')}<b id="stat-speed">${h.speed}</b></span><span title="补刀">LH <b id="last-hits">0</b></span></div></div></section>
      <section class="abilities" aria-label="英雄技能"></section>
      <section class="inventory-section" aria-label="装备与商店"><div id="inventory" class="inventory"></div><button id="shop-button" class="shop-button">${icon('coin')}<strong id="gold">600</strong><span>装备商店</span>${icon('bag')}</button></section>
    </footer><aside id="shop" class="shop-panel" hidden></aside><div id="toast" role="status"></div><div id="modal-root"></div></main>`;
  setupRenderer();renderer.center(game.player);bindShared();
  shopUI=mountShop($('#shop'),$('#inventory'),game,{close:toggleShop,open:()=>{if(!shopOpen)toggleShop();},notify:toast,useItem:beginItemUse,changed:()=>{sound();updateHud();},locate:point=>{renderer.zoom=.4;renderer.lookAt(point.x,point.y);toast('已定位神秘商店，右键前往金色标记处');}});
  mountSkills($('.abilities'),game,{cast,castSelf:i=>cast(i,true),autocast:async i=>{const activeGame=game,result=await activeGame.toggleAutocast(i);if(game!==activeGame)return;if(!result.ok)toast(result.reason);updateHud();},learn:i=>learn('learnAbility',i),talent:i=>learn('learnTalent',i),attributes:()=>learn('learnAttributes'),recall});
  if(game.isNetwork)document.querySelector('.match-clock small').textContent='五真人 · 噩梦 AI';
  $('.abilities').addEventListener('click',e=>{const b=e.target.closest('[data-extra]');if(b)castExtra(b.dataset.extra);});
  mountStatusBar($('.hud-vitals'));
  $('#inspection-body').insertAdjacentHTML('beforebegin','<div id="inspection-status"></div>');
  mountStatusBar($('#inspection-status'));updateHud();
  $('.match-header').insertAdjacentHTML('afterend',`<div class="match-roster" aria-label="点击英雄头像查看属性与装备">${[0,1].map(team=>`<div class="roster-team ${team?'dire':'radiant'}"><span>${team?'夜魇':'天辉'}</span>${game.entities.filter(e=>e.kind==='hero'&&e.team===team).map(e=>`<button data-inspect-hero="${e.id}" title="查看${e.name}的属性和装备" aria-label="查看${team?'敌方':'友方'}${e.name}">${portrait(HEROES[e.heroId])}</button>`).join('')}</div>`).join('')}</div>`);
  document.querySelectorAll('[data-inspect-hero]').forEach(b=>b.onclick=()=>{game.selectEntity(b.dataset.inspectHero);inspectionOpen=true;updateInspection();});
  $('.hero-hud').insertAdjacentHTML('beforeend','<button id="hero-details" class="hero-details" title="查看自己的完整属性">详细属性 <span id="attribute-summary"></span></button>');
  $('#hero-details').onclick=()=>{game.selectEntity(game.player.id);inspectionOpen=!inspectionOpen;updateInspection();};
  $('#close-inspection').onclick=()=>{inspectionOpen=false;$('#selection-panel').hidden=true;};
  $('#map-overview').onclick=()=>{renderer.zoom=Math.max(.01,Math.min(renderer.w-40,renderer.h-360)/WORLD.width);renderer.lookAt(WORLD.width/2,WORLD.height/2);};
  $('#map-center').onclick=()=>{renderer.zoom=Math.max(.3,Math.min(.5,renderer.w/3200));renderer.center(game.player);};
  $('#camp-bounds').onclick=()=>{renderer.showCampBounds=!renderer.showCampBounds;$('#camp-bounds').classList.toggle('active',renderer.showCampBounds);};
  const canvas=$('#battlefield');canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const hitTest=(p,itemsFirst=false)=>game.entities.filter(u=>!u.dead&&game.canSee(game.player,u)&&Math.hypot(u.x-p.x,u.y-p.y)<Math.max(u.radius||24,18/renderer.zoom)).sort((a,b)=>(itemsFirst?Number(b.kind==='droppedItem')-Number(a.kind==='droppedItem'):0)||Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  let dragging=null;
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};if(dragging){renderer.pan(dragging.x-e.clientX,dragging.y-e.clientY);dragging={x:e.clientX,y:e.clientY};}renderer.hoverId=hitTest(renderer.screenToWorld(pointer.x,pointer.y))?.id;});
  canvas.addEventListener('pointerup',()=>dragging=null);
  canvas.addEventListener('pointercancel',()=>dragging=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();renderer.setZoom(e.deltaY<0?1.12:1/1.12,{x:e.offsetX,y:e.offsetY});},{passive:false});
  canvas.addEventListener('pointerdown',async e=>{
    if(game.status!=='playing')return;e.preventDefault();canvas.focus();const rect=canvas.getBoundingClientRect(),p=renderer.screenToWorld(e.clientX-rect.left,e.clientY-rect.top);pointer={x:e.clientX-rect.left,y:e.clientY-rect.top};
    if(e.button===1){dragging={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    const target=hitTest(p,e.button===2);
    if(pendingItem){if(e.button===2){cancelItemUse();return;}if(e.button===0){const {index,area,uid}=pendingItem;if(game.itemState(index,area).meta?.uid!==uid){cancelItemUse();toast('物品位置已改变');return;}useItem(index,area,p);return;}}
    if(target?.kind==='droppedItem'&&e.button===2){const result=await game.pickupOrApproach(target.id);if(result.approaching)toast('靠近后拾取物品');else if(!result.ok)toast(result.reason);updateHud();return;}
    if(e.button===0){game.selectEntity(target?.id||game.player.id);inspectionOpen=!!target;updateInspection();return;}
    if(e.button!==2||game.paused||game.player.dead)return;
    if(target&&target.team!==game.player.team){game.attackTarget(target.id);renderer.mark(target.x,target.y);}else{game.moveTo(p.x,p.y);renderer.mark(p.x,p.y);}
  });
  $('#pause-button').onclick=()=>openModal('pause');$('.match-brand').onclick=()=>openModal('pause');$('#guide-button').onclick=()=>openModal('guide');
  $('#shop-button').onclick=toggleShop;$('#recall-button').onclick=recall;
  document.querySelectorAll('[data-ability]').forEach(b=>b.onclick=()=>cast(Number(b.dataset.ability)));
  $('#control-hint button').onclick=()=>$('#control-hint').remove();
  const mini=$('#minimap');mini.oncontextmenu=e=>e.preventDefault();mini.onpointerdown=e=>{e.preventDefault();const r=mini.getBoundingClientRect(),p=renderer.minimapToWorld(mini,e.clientX-r.left,e.clientY-r.top);if(!p)return;if(e.button===2){game.moveTo(p.x,p.y);renderer.mark(p.x,p.y);}else{if(renderer.zoom<.15)renderer.zoom=Math.max(.3,Math.min(.5,renderer.w/3200));renderer.lookAt(p.x,p.y);}};
  toast('你已加入天辉。带领兵线，摧毁夜魇的远古遗迹。');
  checkpointMatch();
  if(resume)openModal('restored');
  window.scrollTo(0,0);
}
async function cast(i,self=false){if(!game||modal)return;const activeGame=game,target=self?game.player:renderer.screenToWorld(pointer.x||renderer.w/2,pointer.y||renderer.h/2);const r=await activeGame.cast(i,target);if(game!==activeGame)return;if(r.ok){if(game.skill(i).kind==='active'||game.player.heroId==='ogre_magi')keys.clear();sound('cast');updateHud();}else toast(r.reason||'暂时无法施放技能');}
let pendingItem=null;
function cancelItemUse(){pendingItem=null;$('#battlefield')?.classList.remove('item-targeting');$('#item-target-prompt')?.remove();}
function beginItemUse(index,area='inventory'){
 if(!game||modal)return;const info=game.itemState(index,area);if(!info.active){toast('这是被动物品');return;}
 if(info.cooldown||info.ready){toast('物品尚未就绪');return;}
 if(shopOpen)toggleShop();
 const noTarget=info.item.behaviors.some(b=>b.endsWith('_NO_TARGET')||b.endsWith('_TOGGLE'));
 if(noTarget){useItem(index,area,game.player);return;}
 cancelItemUse();pendingItem={index,area,uid:info.meta.uid};$('#battlefield').classList.add('item-targeting');
 $('.match').insertAdjacentHTML('beforeend',`<div id="item-target-prompt" role="status">${escapeHtml(info.item.name)} · 左键选择目标 · 右键 / Esc 取消</div>`);
}
async function useItem(index,area='inventory',point){if(!game||modal)return;const activeGame=game,aim=point||renderer.screenToWorld(pointer.x||renderer.w/2,pointer.y||renderer.h/2),result=await activeGame.useItem(index,aim,area);if(game!==activeGame)return;if(result.ok){cancelItemUse();sound('cast');updateHud();}else toast(result.reason);}
async function castExtra(id,self=false){if(!game||modal)return;const activeGame=game,target=self?game.player:renderer.screenToWorld(pointer.x||renderer.w/2,pointer.y||renderer.h/2),result=await activeGame.castExtra(id,target);if(game!==activeGame)return;if(result.ok){keys.clear();sound('cast');updateHud();}else toast(result.reason);}
async function learn(method,index){if(!game||modal)return;const activeGame=game,result=await activeGame[method](index);if(game!==activeGame)return;if(result.ok){sound();updateHud();}else toast(result.reason);}
async function recall(){if(!game)return;const activeGame=game,r=await activeGame.recall();if(game!==activeGame)return;if(!r.ok)toast(r.reason||'暂时无法回城');else sound();}
let previousFeed='';
function updateHud(){
  if(!game||view!=='match')return;const p=game.player,h=HEROES[p.heroId];
  $('#match-time').textContent=clock(game.time);$('#radiant-score').textContent=game.score[0];$('#dire-score').textContent=game.score[1];
  $('#hero-level').textContent=p.level;$('#hp-label').textContent=`${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;$('#mana-label').textContent=`${Math.floor(p.mana)} / ${Math.floor(p.maxMana)}`;
  $('#hp-fill').style.transform=`scaleX(${Math.max(0,p.hp/p.maxHp)})`;$('#mana-fill').style.transform=`scaleX(${Math.max(0,p.mana/p.maxMana)})`;$('#xp-fill').style.transform=`scaleX(${Math.min(1,p.xp/p.xpNext)})`;
  $('#gold').textContent=Math.floor(p.gold).toLocaleString();$('#kda').textContent=`${p.kills} / ${p.deaths} / ${p.assists}`;
  $('#stat-damage').textContent=Math.round(p.damage);$('#stat-armor').textContent=Math.round(p.armor||0);$('#stat-speed').textContent=Math.round(p.speed);$('#last-hits').textContent=p.lastHits;
  if($('#attribute-summary'))$('#attribute-summary').innerHTML=`<b class="strength">力 ${Math.floor(p.strength)}</b><b class="agility">敏 ${Math.floor(p.agility)}</b><b class="intelligence">智 ${Math.floor(p.intelligence)}</b>`;
  updateSkills($('.abilities'),game);
  updateStatusBar(mountStatusBar($('.hud-vitals')),p,game.time);
  const combat=game.combatStats(p);
  $('#stat-damage').textContent=Math.round(combat.damage);$('#stat-armor').textContent=Number(combat.armor.toFixed(1));$('#stat-speed').textContent=Math.round(combat.speed);
  $('.xp-bar').title=p.level===30?'Level 30':Math.floor(p.xp)+' / '+p.xpNext+' XP';
  if(p.level===30)$('#xp-fill').style.transform='scaleX(1)';
  const count=game.entities.filter(e=>e.team===1&&e.kind==='tower'&&!e.dead).length,barracks=game.entities.filter(e=>e.team===1&&e.kind==='barracks'&&!e.dead).length;$('#tower-count').textContent=`敌方防御塔 ${count} / 11 · 兵营 ${barracks} / 6`;
  const ancient=game.entities.find(e=>e.team===1&&e.kind==='ancient');$('#objective-text').textContent=ancient&&!game.isProtected(ancient)?'远古遗迹已暴露，发起最后进攻！':'跟随兵线，攻破敌方防御塔';
  $('#death-overlay').hidden=!p.dead;$('#respawn-count').textContent=Math.ceil(p.respawnTimer);$('#recall-progress').hidden=!(p.recallTimer>0);$('#recall-fill').style.transform=`scaleX(${1-p.recallTimer/(p.recallDuration||3)})`;
  const feed=game.feed.map(e=>`${e.text}`).join('|');if(previousFeed!==feed){previousFeed=feed;$('#event-feed').innerHTML=game.feed.slice(0,4).map(e=>`<div class="feed-entry ${e.team===0?'radiant':'dire'}">${icon('swords')}<span>${escapeHtml(e.text)}</span></div>`).join('');}
  shopUI?.update();
  if(shopOpen)updateShop();updateInspection();renderer.minimap($('#minimap'),game);
}
const attributeLabels={strength:'力量',agility:'敏捷',intelligence:'智力',universal:'全才'};
const unitLabels={ward:'守卫',hero:'英雄',creep:'兵线单位',neutral:'野怪',tower:'防御塔',barracks:'兵营',fountain:'泉水',ancient:'远古遗迹',filler:'基地建筑',courier:'信使',droppedItem:'地面物品',illusion:'幻象',summon:'召唤物'};
function updateInspection(){
  const panel=$('#selection-panel');if(!panel||!game)return;panel.hidden=!inspectionOpen;
  if(!inspectionOpen)return;
  const selected=game.selected,combat=game.combatStats(selected),delta= combat.damage-selected.damage;
  const e={...selected,...combat,damageMin:(selected.damageMin??selected.damage)+delta,damageMax:(selected.damageMax??selected.damage)+delta},h=HEROES[e.heroId],hero=e.kind==='hero',neutral=e.kind==='neutral';
  const n=v=>Number.isFinite(v)?Number(v.toFixed(1)).toString():'—';
  const percent=v=>`${n(v*100)}%`;
  const pair=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const faction=e.team===0?'天辉':e.team===1?'夜魇':'中立',type=hero?attributeLabels[e.primaryAttribute]:(e.isRoshan?'肉山':e.ancient&&neutral?'远古野怪':unitLabels[e.kind]);
  const html=`<div class="inspected-unit team-${e.team}">${hero?portrait(h):`<div class="unit-symbol">${icon(e.kind==='tower'?'tower':neutral?'swords':'shield')}</div>`}<div><span>${faction} · ${type}${hero?` · 等级 ${e.level}`:''}</span><h2>${escapeHtml(e.name||unitLabels[e.kind])}</h2><small>${e.dead?'已阵亡':game.isProtected(e)?'无敌 · 前置建筑仍存活':e.isPlayer?'你的英雄':'已选中 · 右键下达攻击指令'}</small></div></div>
    <div class="inspection-vitals"><span>生命 <b>${n(e.hp)} / ${n(e.maxHp)}</b><em>+${n(e.hpRegen)}/秒</em></span><i><b style="width:${Math.max(0,e.hp/e.maxHp*100)}%"></b></i>${e.maxMana?`<span>魔法 <b>${n(e.mana||0)} / ${n(e.maxMana)}</b><em>+${n(e.manaRegen)}/秒</em></span><i class="blue"><b style="width:${Math.max(0,(e.mana||0)/e.maxMana*100)}%"></b></i>`:''}</div>
    ${hero?`<div class="attribute-trio">${['strength','agility','intelligence'].map(key=>{const a=e.attributes[key];return `<div class="${key} ${e.primaryAttribute===key?'primary-attribute':''}"><span>${attributeLabels[key]}</span><strong>${n(a.total)}</strong><small>${n(a.base)}${a.bonus?` + ${n(a.bonus)}`:''}</small><em>每级 +${n(a.gain)}</em></div>`;}).join('')}</div><p class="attribute-explainer">${e.primaryAttribute==='universal'?'全才：每点力量、敏捷、智力提供 0.45 攻击力。':`${type}主属性：每点${type}额外提供 1 攻击力。`}</p>`:''}
    <dl class="inspection-stats">${pair('攻击力',`${n(e.damageMin??e.damage)} – ${n(e.damageMax??e.damage)}`)}${pair('攻击距离',n(e.range))}${pair('护甲',n(e.armor))}${pair('物理抗性',percent(1-physicalDamageMultiplier(e.armor||0)))}${pair('攻击速度',n(e.attackSpeed??e.baseAttackSpeed??0))}${pair('攻击间隔',`${n(e.attackInterval)} 秒`)}${pair('移动速度',n(e.speed))}${pair('魔法抗性',percent(e.magicResistance||0))}${pair('白天视野',n(e.visionDay??e.dayVision))}${pair('夜晚视野',n(e.visionNight??e.nightVision))}${hero?pair('补刀 / KDA',`${e.lastHits} · ${e.kills}/${e.deaths}/${e.assists}`):neutral?pair('击杀奖励',`${e.goldMin}–${e.goldMax} 金 · ${e.xpBounty} 经验`):''}</dl>
    ${hero?`<dl class="inspection-stats">${pair('闪避',n(e.evasion)+'%')}${pair('攻击吸血',n(e.lifesteal)+'%')}${pair('技能吸血',n(e.spellLifesteal)+'%')}${pair('技能增强',n(e.spellAmp)+'%')}${pair('额外施法距离',n(e.castRangeBonus))}${pair('冷却缩减',n(e.cooldownReduction)+'%')}${pair('状态抗性',n(e.statusResistance)+'%')}${pair('减速抗性',n(e.slowResistance)+'%')}${pair('魔法消耗降低',n(e.manaCostReduction)+'%')}${pair('额外技能范围',n(e.spellAoE))}</dl><p class="inspection-note">神杖：${e.hasScepter?'已生效':'未获得'} · 魔晶：${e.hasShard?'已生效':'未获得'}${e.moonShard?' · 已吞服银月之晶':''}</p><div class="inspection-equipment"><h3>装备 <span>${e.inventory.filter(Boolean).length} / 6</span></h3><div class="inspected-inventory">${Array.from({length:6},(_,i)=>{const item=ITEM_BY_ID[e.inventory[i]];return `<div class="inspected-slot ${item?'filled':''}" title="${item?item.name+'：'+item.description:'空装备栏'}" aria-label="${item?item.name+'，'+item.description:'空装备栏'}">${item?`<span style="color:${item.color}">${itemArt(item)}</span><b>${item.name}</b><small>${item.description}</small>`:'<span>+</span><b>空装备栏</b>'}</div>`;}).join('')}</div></div>`:''}
    ${e.aegisUntil>game.time?`<p class="inspection-note">不朽之守护 · 剩余 ${clock(e.aegisUntil-game.time)}</p>`:''}
    ${neutral?'<p class="inspection-note">营地于每分钟检查刷新；范围内有单位时不会刷新。按 Alt 查看营地边界。</p>':''}`;
  const body=$('#inspection-body');
  if(body.renderedContent!==html){
    body.innerHTML=html;body.renderedContent=html;
    const equipment=body.querySelector('.inspection-equipment'),attributes=body.querySelector('.attribute-trio');
    if(equipment&&attributes)body.insertBefore(equipment,attributes);
  }
  updateStatusBar(mountStatusBar($('#inspection-status')),game.selected,game.time);
  panel.dataset.unitId=e.id;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toggleShop(){if(!game||modal)return;shopOpen=!shopOpen;$('#shop').hidden=!shopOpen;if(shopOpen)shopUI.update();else $('#battlefield').focus();}
function updateShop(){shopUI?.update();}
function openModal(type){
  if(!$('#modal-root'))return;returnFocus=document.activeElement;modal=type;keys.clear();if(game){game.setMovement(0,0);game.setPaused(true);}sound();
  checkpointMatch();
  let title='',eyebrow='',body='',footer='';
  if(type==='guide'){
    title='从第一刀，到最后一座遗迹。';eyebrow='FIELD MANUAL';
    body=`<div class="guide-goal">${icon('flag')}<div><strong>摧毁夜魇的远古遗迹，赢得对局。</strong><p>每路依次推进一塔、二塔、高地三塔。摧毁近战 / 远程兵营会升级对应兵种；摧毁两座基地四塔后才能攻击遗迹。</p></div></div><div class="guide-controls"><div><kbd>左键 / 顶部头像</kbd><span>选择英雄、建筑或野怪，查看属性与装备</span></div><div><kbd>鼠标右键</kbd><span>移动自己的英雄，点击敌人或野怪持续攻击</span></div><div><kbd>↑ ↓ ← →</kbd><span>直接移动英雄</span></div><div><kbd>Q W E R</kbd><span>朝鼠标位置释放已学习技能</span></div><div><kbd>Ctrl + Q W E R / U</kbd><span>技能加点 / 天赋与全属性；一级拥有 1 技能点</span></div><div><kbd>F / Tab / G</kbd><span>打开商店 / 快捷购买队列物品；拖动物品换装</span></div><div><kbd>滚轮 / 中键拖动</kbd><span>缩放 / 平移地图；M 查看全图，空格回到英雄</span></div><div><kbd>Alt / B</kbd><span>营地边界 / 3 秒回城</span></div><div><kbd>P / Esc</kbd><span>暂停，打开菜单</span></div></div><div class="guide-tip"><strong>7.41f 标准节奏</strong><p>每 30 秒一波兵。野怪从 1:00 开始每分钟检查刷新，营地内有单位会阻挡刷新。三维属性随等级与装备增长；全才从三项属性获取攻击力。左右阵营共 22 塔、12 兵营，野区有 28 营地与肉山。</p></div>`;
    body=body.replace('营地边界 / 3 秒回城','营地边界 / 使用卷轴传送回泉水').replace('<div><kbd>滚轮 / 中键拖动</kbd>','<div><kbd>1–6 / Alt + 1–6</kbd><span>使用装备 / 对自己使用；双击装备选择目标</span></div><div><kbd>D / F3</kbd><span>神杖或魔晶新增技能 / 信使运送储藏物品</span></div><div><kbd>滚轮 / 中键拖动</kbd>');
    footer='<button class="primary-button modal-primary" data-close>准备好了</button>';
  }else if(type==='hero'){
    const h=HEROES[chosen];title=h.name;eyebrow=h.en;
    body=`<div class="hero-modal-intro">${portrait(h)}<div><strong>${h.title}</strong><p>${h.description}</p></div></div><div class="skill-details">${h.skills.map(s=>`<div class="skill-detail"><span class="item-art" style="--item-color:${s.color}">${icon(s.icon)}<kbd>${s.key}</kbd></span><div><strong>${s.name}</strong><p>${s.description}</p><small>${s.mana} 魔法 · ${s.cooldown} 秒冷却</small></div></div>`).join('')}</div>`;footer='<button class="primary-button modal-primary" data-close>了解，准备出战</button>';
  }else if(type==='settings'){
    title='游戏设置';eyebrow='YOUR BATTLE, YOUR WAY';body=`<div class="setting-row"><div><strong>战斗音效</strong><p>技能、购买与界面交互音效</p></div><button id="sound-setting" class="toggle ${preferences.sound?'on':''}" aria-pressed="${preferences.sound}" aria-label="开启或关闭音效"><i></i></button></div><div class="setting-row"><div><strong>对局难度</strong><p>修改将在下一局生效</p></div><select id="setting-difficulty"><option value="easy">休闲</option><option value="normal">标准</option><option value="hard">挑战</option></select></div><div class="guide-tip"><strong>轻量运行，无需下载客户端。</strong><p>游戏与美术资源均在本地运行。偏好和历史战绩保存在当前浏览器中。</p></div>`;footer='<button class="primary-button modal-primary" data-close>保存并返回</button>';
  }else if(type==='history'){
    title='你的远古征途';eyebrow='BATTLE RECORD';body=`<div class="record-stats"><div><strong>${history.matches}</strong><span>累计对局</span></div><div><strong>${history.wins}</strong><span>天辉胜利</span></div><div><strong>${history.bestKills}</strong><span>单局最高击杀</span></div></div><p class="record-caption">${history.matches?'每一场战斗，都是新的故事。':'战场尚未留下你的名字。选择一位英雄，开始第一场对局。'}</p>`;footer='<button class="primary-button modal-primary" data-close>返回战场</button>';
  }else if(type==='pause'||type==='restored'){
    title='稍作休整';eyebrow='BATTLE PAUSED';body=`<p class="pause-copy">兵线与战斗已暂停。准备好后，继续你的征程。</p><div class="pause-summary"><span>对局时间<strong>${clock(game.time)}</strong></span><span>英雄等级<strong>${game.player.level}</strong></span><span>击杀 / 阵亡<strong>${game.player.kills} / ${game.player.deaths}</strong></span></div>`;footer='<button class="primary-button modal-primary" data-close>继续战斗</button><div class="modal-secondary"><button id="restart-match">重新开始</button><button id="back-lobby">返回大厅</button></div>';
    if(game.isNetwork){body=body.replace('兵线与战斗已暂停。准备好后，继续你的征程。','联机比赛仍在继续，菜单只停止你的操作。离开会结束本次对局，不会使用 AI 补位。');footer='<button class="primary-button modal-primary" data-close>返回战场</button><div class="modal-secondary"><button id="back-lobby">离开联机对局</button></div>';}
    if(type==='restored'){title='已恢复上次对局';eyebrow='BATTLE RESTORED';body=body.replace('兵线与战斗已暂停。准备好后，继续你的征程。','英雄、装备和战斗进度已从本地存档恢复。比赛保持暂停，点击继续战斗后开始。');}
  }else if(type==='result'){
    const won=game.status==='won';title=won?'天辉，赢得胜利。':'遗迹陨落，战意未熄。';eyebrow=won?'RADIANT VICTORY':'THE ANCIENT HAS FALLEN';
    body=`<div class="result-emblem ${won?'victory':''}">${icon(won?'flag':'shield')}</div><p class="record-caption">${won?'敌方远古遗迹已被摧毁，这片战场属于你。':'天辉的远古遗迹已被摧毁。下一次，让我们重新改写战局。'}</p><div class="record-stats"><div><strong>${game.player.kills} / ${game.player.deaths}</strong><span>击杀 / 阵亡</span></div><div><strong>${game.player.lastHits}</strong><span>补刀</span></div><div><strong>${clock(game.time)}</strong><span>对局时长</span></div></div>`;footer='<button id="play-again" class="primary-button modal-primary">再战一局</button><div class="modal-secondary"><button id="back-lobby">返回大厅</button></div>';
  }
  $('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${type==='hero'?'hero-modal':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-button modal-close" data-close aria-label="关闭">${icon('close')}</button><span class="eyebrow">${eyebrow}</span><h2 id="modal-title">${title}</h2><div class="modal-body">${body}</div><div class="modal-footer">${footer}</div></section></div>`;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
  $('.modal-backdrop').onclick=e=>{if(e.target===e.currentTarget&&type!=='result')closeModal();};
  $('#restart-match')?.addEventListener('click',startGame);$('#play-again')?.addEventListener('click',startGame);$('#back-lobby')?.addEventListener('click',renderLobby);
  if(type==='settings'){$('#setting-difficulty').value=preferences.difficulty;$('#setting-difficulty').onchange=e=>{preferences.difficulty=e.target.value;save();if($('#difficulty'))$('#difficulty').value=preferences.difficulty;};$('#sound-setting').onclick=()=>{preferences.sound=!preferences.sound;save();$('#sound-setting').classList.toggle('on',preferences.sound);$('#sound-setting').setAttribute('aria-pressed',String(preferences.sound));$('.sound-toggle').innerHTML=icon(preferences.sound?'volume':'mute');};}
  $('.modal [data-close]')?.focus();
}
function closeModal(){if(modal==='result'){renderLobby();return;}$('#modal-root').innerHTML='';modal=null;if(game)game.setPaused(false);returnFocus?.focus();}

window.addEventListener('keydown',async e=>{
  if(modal){
    if(e.key==='Escape'){e.preventDefault();closeModal();return;}
    if(e.key==='Tab'){const focusable=[...document.querySelectorAll('.modal button:not(:disabled),.modal select')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;
  }
  if(view!=='match'||!game)return;
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  const key=e.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright','escape','tab'].includes(key))e.preventDefault();
  if(e.repeat){if(['arrowup','arrowdown','arrowleft','arrowright','a','s'].includes(key))keys.add(key);return;}
  if(key==='escape'&&pendingItem){e.preventDefault();cancelItemUse();return;}
  if(/^[1-6]$/.test(key)){e.preventDefault();useItem(Number(key)-1,'inventory',e.altKey?game.player:undefined);return;}
  if(key==='d'||key==='t'){const skill=game.extraAbilities().find(s=>s.key.toLowerCase()===key);if(skill){e.preventDefault();castExtra(skill.id,e.altKey);}return;}
  if(key==='f3'){e.preventDefault();const activeGame=game,result=await activeGame.courierCommand('deliver');if(game!==activeGame)return;toast(result.ok?'信使已收到运输指令':result.reason||'信使操作未完成');return;}
  if(key==='escape'||key==='p'){if(shopOpen)toggleShop();else openModal('pause');return;}
  if(key==='alt'){renderer.showCampBounds=true;return;}
  if(key==='m'){$('#map-overview').click();return;}
  if(key==='u'){toggleTalents($('.abilities'));return;}
  if(key==='g'){shopUI.buyQuick();return;}
  if(key==='h'){openModal('guide');return;}if(key===' '){$('#map-center').click();return;}if(key==='b'){recall();return;}if(key==='f'||key==='tab'){toggleShop();return;}
  if(['q','w','e','r'].includes(key)){e.preventDefault();const index=['q','w','e','r'].indexOf(key);if(e.ctrlKey)learn('learnAbility',index);else cast(index,e.altKey);return;}
  keys.add(key);
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key==='Alt'&&renderer)renderer.showCampBounds=$('#camp-bounds')?.classList.contains('active')||false;});
window.addEventListener('blur',()=>{keys.clear();if(game&&!modal&&game.status==='playing')openModal('pause');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&!modal&&game.status==='playing')openModal('pause');});
window.addEventListener('pagehide',checkpointMatch);
window.addEventListener('beforeunload',event=>{
  if(view!=='match'||!game||game.isNetwork||game.status!=='playing')return;
  checkpointMatch();event.preventDefault();event.returnValue='';
});
function tick(ms){
  const dt=Math.min((ms-lastFrame)/1000||0,1/20);lastFrame=ms;
  if(game&&view==='match'){
    const x=(keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('arrowup')?1:0);
    game.setMovement(x,y);game.step(dt);
    if(!game.isNetwork&&game.status==='playing'&&ms-checkpointAt>=2000)checkpointMatch();
    if(ms-hudAt>100){updateHud();hudAt=ms;}
    if(game.status!=='playing'&&lastStatus==='playing'){lastStatus=game.status;history.matches++;if(game.status==='won')history.wins++;history.bestKills=Math.max(history.bestKills,game.player.kills);save();if(!game.isNetwork){const cleared=clearMatch(browserStorage());if(!cleared.ok)toast(cleared.reason);}updateHud();openModal('result');}
  }
  renderer?.render(game,ms/1000);requestAnimationFrame(tick);
}
renderLobby();requestAnimationFrame(tick);




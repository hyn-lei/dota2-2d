import { HEROES } from './data.js';
import { CoopConnection } from './coop-connection.js';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let connection,dialog,startedGame,callbacks,countdown;
let matchmakingWanted=false,matchingCancelWanted=false;
let matchingRequest=null,matchingRequestId=0,matchingRetryTimer,matchingRetries=0;
function clearMatchingRequest(){clearTimeout(matchingRetryTimer);matchingRequest=null;matchingRetries=0;}
const heroOptions=(selected,taken=[])=>Object.values(HEROES).map(h=>`<option value="${h.id}" ${h.id===selected?'selected':''} ${taken.includes(h.id)&&h.id!==selected?'disabled':''}>${h.name}${taken.includes(h.id)&&h.id!==selected?' · 已选择':''}</option>`).join('');

export function mountCoop(options){
  callbacks=options;
  const launch=document.querySelector('.launch-area');
  if(launch&&!document.querySelector('#open-coop')){
    const button=document.createElement('button');button.id='open-coop';button.className='coop-open';button.textContent='五真人联机 · 对战噩梦 AI';button.onclick=()=>openRoom('friends');launch.append(button);
  }
  if(launch&&!document.querySelector('#open-matchmaking')){
    const button=document.createElement('button');button.id='open-matchmaking';button.className='coop-open';button.textContent='五人随机匹配 · 自动组队';button.onclick=()=>openRoom('random');launch.append(button);
  }
}
function openRoom(mode='friends'){
  if(dialog?.isConnected){dialog.showModal();return;}
  connection?.close();clearMatchingRequest();matchingRequestId=0;startedGame=null;matchmakingWanted=false;matchingCancelWanted=false;connection=new CoopConnection();const currentConnection=connection,random=mode==='random';
  const reconnectMatching=()=>{
    const socket=connection.socket;connection.close();
    const resume=()=>{if(currentConnection===connection&&(matchmakingWanted||matchingCancelWanted))connection.connect();};
    if(socket&&socket.readyState!==WebSocket.CLOSED)socket.addEventListener('close',resume,{once:true});else resume();
  };
  dialog=document.createElement('dialog');dialog.id='coop-dialog';dialog.className='coop-dialog';
  let name='';try{name=localStorage.getItem('af-coop-name')||'';}catch{}
  const code=new URL(location.href).searchParams.get('room')||'';
  dialog.innerHTML=`<button id="coop-close" class="coop-close" aria-label="关闭联机房间">×</button><small class="coop-eyebrow">COOPERATIVE · 5 HUMAN PLAYERS</small><h2>一起进入远古战场</h2><p class="coop-intro">五名真人共同对战五名噩梦 AI。人数不足会等待，全程不使用 AI 补位。</p><p id="coop-connection" role="status">正在连接服务器…</p><div id="coop-join-form"><label>你的名字<input id="coop-name" maxlength="24" autocomplete="nickname" value="${escape(name)}" placeholder="让队友认出你" /></label><label>选择英雄<select id="coop-join-hero">${heroOptions(callbacks.heroId)}</select></label><button id="coop-create" class="coop-primary">创建房间</button><div class="coop-join-code"><label>好友的房间码<input id="coop-code" maxlength="6" value="${escape(code)}" placeholder="6 位房间码" autocomplete="off" /></label><button id="coop-join">加入房间</button></div></div><section id="coop-room" hidden></section><p id="coop-error" role="alert"></p>`;
  document.body.append(dialog);dialog.showModal();
  if(random){
    dialog.querySelector('h2').textContent='五人随机匹配';
    dialog.querySelector('.coop-intro').textContent='点击匹配，自动寻找四名真人队友。凑齐五人就进入噩梦 AI 对局，人数不足时继续等待。';
    dialog.querySelector('#coop-name').placeholder='可选，留空自动生成玩家名';
    dialog.querySelector('#coop-create').remove();dialog.querySelector('.coop-join-code').remove();
    dialog.querySelector('#coop-join-form').insertAdjacentHTML('beforeend','<p class="coop-match-hint">优先使用你选择的英雄；队友英雄重复时，自动分配其他英雄。</p><button id="coop-match-start" class="coop-primary" disabled>开始匹配</button>');
    dialog.insertAdjacentHTML('beforeend','<section id="coop-matchmaking" class="coop-matchmaking" hidden><h3 id="coop-match-title">正在寻找队友</h3><strong id="coop-match-count" role="status">真人 0/5</strong><p id="coop-match-hint">不足五人继续等待，不会使用 AI 补位。</p><button id="coop-match-cancel">取消匹配</button></section>');
  }
  dialog.querySelector('#coop-close').onclick=leaveRoom;
  dialog.addEventListener('cancel',e=>{e.preventDefault();leaveRoom();});
  const identity=()=>{let name=dialog.querySelector('#coop-name').value.trim();if(random&&!name){name=`玩家 ${Math.floor(Math.random()*9000)+1000}`;dialog.querySelector('#coop-name').value=name;}try{localStorage.setItem('af-coop-name',name);}catch{}return {name,heroId:dialog.querySelector('#coop-join-hero').value};};
  dialog.querySelector('#coop-create')?.addEventListener('click',()=>connection.send({type:'create',...identity()}));
  dialog.querySelector('#coop-join')?.addEventListener('click',()=>connection.send({type:'join',code:dialog.querySelector('#coop-code').value.trim().toUpperCase(),...identity()}));
  dialog.querySelector('#coop-match-start')?.addEventListener('click',()=>{
    matchmakingWanted=true;matchingCancelWanted=false;dialog.querySelector('#coop-error').textContent='';
    clearMatchingRequest();matchingRequest={type:'matchmake',...identity(),requestId:++matchingRequestId};
    if(connection.send(matchingRequest))updateMatchmaking({status:'queued',players:0});else{matchmakingWanted=false;clearMatchingRequest();}
  });
  dialog.querySelector('#coop-match-cancel')?.addEventListener('click',()=>{
    matchmakingWanted=false;matchingCancelWanted=true;dialog.querySelector('#coop-match-cancel').disabled=true;dialog.querySelector('#coop-match-title').textContent='正在取消匹配';
    clearMatchingRequest();matchingRequest={type:'cancelMatchmaking',requestId:++matchingRequestId};
    if(connection.ready)connection.send(matchingRequest);else reconnectMatching();
  });
  connection.addEventListener('welcome',e=>{
    if(currentConnection!==connection||!random)return;
    if(matchingCancelWanted){
      if(e.detail.roomCode){matchingCancelWanted=false;clearMatchingRequest();callbacks.notify('比赛已经匹配成功，正在恢复你的席位');}
      else{clearMatchingRequest();matchingRequest={type:'cancelMatchmaking',requestId:++matchingRequestId};connection.send(matchingRequest);}
    }else if(matchmakingWanted&&!e.detail.roomCode){clearMatchingRequest();matchingRequest={type:'matchmake',...identity(),requestId:++matchingRequestId};connection.send(matchingRequest);}
  });
  connection.addEventListener('matchmaking',e=>{if(currentConnection===connection)updateMatchmaking(e.detail);});
  connection.addEventListener('connection',e=>{
    if(currentConnection!==connection)return;
    const status=e.detail.status;const text=status==='connected'?'已连接 · 只接受真实玩家操作':status==='connecting'?'正在连接服务器…':'连接断开，正在尝试重连…';
    if(dialog?.isConnected)dialog.querySelector('#coop-connection').textContent=text;
    const matchButton=dialog?.querySelector('#coop-match-start');if(matchButton)matchButton.disabled=status!=='connected'||matchmakingWanted||matchingCancelWanted;
    if(startedGame){startedGame.lastMovement=null;showConnection(status);}
  });
  connection.addEventListener('error',e=>{
    if(currentConnection!==connection)return;
    if(e.detail.requestId!==undefined&&e.detail.requestId!==matchingRequestId)return;
    if(random&&e.detail.code==='RATE_LIMIT'&&matchingRequest&&!startedGame){
      clearTimeout(matchingRetryTimer);const requestId=matchingRequest.requestId;
      if(++matchingRetries<=3)matchingRetryTimer=setTimeout(()=>{
        if(currentConnection===connection&&!startedGame&&matchingRequest?.requestId===requestId&&connection.ready)connection.send(matchingRequest);
      },750);
      else{matchingRetries=0;reconnectMatching();}
    }
    const message=e.detail.message||'无法完成联机操作';
    if(random&&['INVALID_MATCHMAKING','ALREADY_IN_ROOM','SERVER_FULL'].includes(e.detail.code)&&!startedGame)updateMatchmaking({status:'canceled'});
    if(dialog?.isConnected&&dialog.open)dialog.querySelector('#coop-error').textContent=message;else callbacks.notify(message);
  });
  connection.addEventListener('room',e=>{if(currentConnection!==connection||!e.detail)return;updateRoom(e.detail);if(startedGame)updateMatchStatus(e.detail);});
  connection.addEventListener('snapshot',e=>{
    if(currentConnection!==connection)return;
    matchmakingWanted=false;matchingCancelWanted=false;clearMatchingRequest();
    if(startedGame!==e.detail.game){startedGame=e.detail.game;if(dialog.open)dialog.close();callbacks.start(startedGame);}
    if(connection.room)updateMatchStatus(connection.room);
  });
  connection.addEventListener('end',e=>{
    if(currentConnection!==connection)return;
    matchmakingWanted=false;matchingCancelWanted=false;clearMatchingRequest();if(random)updateMatchmaking({status:'canceled'});
    clearInterval(countdown);countdown=null;document.querySelector('#coop-match-status')?.remove();document.querySelector('#coop-reconnecting')?.remove();
    const reasons={reconnect_timeout:'队友未及时重连，本次对局已结束。真人席位没有使用 AI 替补。',player_left:'有玩家离开，本次对局已结束。真人席位没有使用 AI 替补。',lobby_expired:'房间等待超时，请重新创建房间。',simulation_error:'本次对局暂时无法继续，请重新创建房间。',server_restart:'服务器已更新或重启，本次对局已结束。请重新创建房间。'};
    connection.send({type:'leave'});
    if(!startedGame){connection.game=null;connection.room=null;if(dialog?.isConnected){dialog.querySelector('#coop-room').hidden=true;dialog.querySelector('#coop-join-form').hidden=false;dialog.querySelector('#coop-error').textContent=reasons[e.detail.reason]||'上一局已结束，可以创建新房间。';}return;}
    connection.close();dialog?.close();dialog?.remove();dialog=null;startedGame=null;callbacks.end(reasons[e.detail.reason]||'对局已结束');
  });
  connection.connect();
}
function updateRoom(room){
  if(!dialog?.isConnected)return;
  if(room.matchmade){dialog.querySelector('#coop-room').hidden=true;return;}
  dialog.querySelector('#coop-error').textContent='';dialog.querySelector('#coop-join-form').hidden=true;
  const own=room.members.find(m=>m.clientId===connection.clientId),online=room.members.filter(m=>m.connected).length;
  const canStart=room.members.length===5&&online===5&&room.members.every(m=>m.ready);
  const area=dialog.querySelector('#coop-room');area.hidden=false;
  area.innerHTML=`<div class="coop-room-heading"><div><span>房间码</span><strong id="coop-room-code">${escape(room.code)}</strong></div><button id="coop-copy">复制邀请链接</button></div><p class="coop-room-count">真人 ${online} / 5 · ${room.members.length<5?`还需 ${5-room.members.length} 名真人`:'等待全部准备'} · AI 不会补位</p><div class="coop-members">${Array.from({length:5},(_,i)=>{const m=room.members[i];return m?`<div class="coop-member ${m.clientId===connection.clientId?'coop-self':''}"><img src="/${HEROES[m.heroId].portrait}" alt=""/><div><strong>${escape(m.name)}${m.clientId===room.hostId?' · 房主':''}${m.clientId===connection.clientId?' · 你':''}</strong><span>${escape(HEROES[m.heroId].name)}</span></div><b>${m.connected?m.ready?'已准备':'未准备':'已断线'}</b></div>`:'<div class="coop-member coop-empty"><span class="coop-slot-number">'+(i+1)+'</span><span>等待真人加入</span></div>';}).join('')}</div>${own?`<label class="coop-own-hero">你的英雄<select id="coop-hero-choice">${heroOptions(own.heroId,room.members.filter(m=>m!==own).map(m=>m.heroId))}</select></label>`:''}<div class="coop-room-actions"><button id="coop-ready" ${!own?'disabled':''}>${own?.ready?'取消准备':'我已准备'}</button>${room.hostId===connection.clientId?`<button id="coop-start" class="coop-primary" ${!canStart?'disabled':''}>五人出发</button>`:'<span>由房主在五人准备后开始</span>'}<button id="coop-leave">离开房间</button></div>`;
  area.querySelector('#coop-copy').onclick=async()=>{try{await navigator.clipboard.writeText(`${location.origin}/?room=${room.code}`);area.querySelector('#coop-copy').textContent='已复制';}catch{dialog.querySelector('#coop-error').textContent=`房间码：${room.code}`;}};
  area.querySelector('#coop-hero-choice')?.addEventListener('change',e=>connection.send({type:'chooseHero',heroId:e.target.value}));
  area.querySelector('#coop-ready').onclick=()=>connection.send({type:'ready',ready:!own?.ready});
  area.querySelector('#coop-start')?.addEventListener('click',()=>connection.send({type:'start'}));
  area.querySelector('#coop-leave').onclick=leaveRoom;
}
function leaveRoom(){
  matchmakingWanted=false;matchingCancelWanted=false;clearMatchingRequest();
  clearInterval(countdown);countdown=null;document.querySelector('#coop-match-status')?.remove();document.querySelector('#coop-reconnecting')?.remove();
  connection?.send({type:'leave'});connection?.close();dialog?.close();dialog?.remove();dialog=null;
  if(startedGame){startedGame=null;callbacks.end('你已离开联机对局，房间不会使用 AI 补位');}
}
function updateMatchmaking(message){
  const panel=dialog?.querySelector('#coop-matchmaking');if(!panel)return;
  if(message.status!=='matched'&&message.requestId!==undefined&&message.requestId!==matchingRequestId)return;
  if(message.status==='canceled'){
    matchmakingWanted=false;matchingCancelWanted=false;clearMatchingRequest();panel.hidden=true;dialog.querySelector('#coop-join-form').hidden=false;dialog.querySelector('#coop-match-start').disabled=!connection.ready;return;
  }
  if(message.status==='queued'&&(!matchmakingWanted||matchingCancelWanted))return;
  if(message.status==='queued'&&message.requestId!==undefined)clearMatchingRequest();
  panel.hidden=false;dialog.querySelector('#coop-join-form').hidden=true;
  const matched=message.status==='matched';if(matched){matchmakingWanted=false;matchingCancelWanted=false;clearMatchingRequest();}
  panel.querySelector('#coop-match-title').textContent=matched?'匹配成功，正在进入战场':'正在寻找队友';
  panel.querySelector('#coop-match-count').textContent=`真人 ${message.players||0}/5`;
  panel.querySelector('#coop-match-hint').textContent=matched?
    (message.preferredHeroId&&message.heroId!==message.preferredHeroId?`队友已选同一英雄，为你分配${HEROES[message.heroId]?.name||'其他英雄'}。`:'五名真人已就绪，正在开始噩梦 AI 对局。'):
    message.waitingForServer?'五名真人已到齐，正在等待可用战场。':'不足五人继续等待，不会使用 AI 补位。';
  panel.querySelector('#coop-match-cancel').disabled=matched;
}
function updateMatchStatus(room){
  if(!document.querySelector('.match'))return;
  let status=document.querySelector('#coop-match-status');if(!status){status=document.createElement('div');status.id='coop-match-status';status.className='coop-match-status';document.querySelector('.match').append(status);}
  status.textContent=`${room.matchmade?'随机匹配 · ':''}房间 ${room.code} · 真人 ${room.members.filter(m=>m.connected).length}/5 · 噩梦 AI`;
  if(room.phase==='reconnecting'){
    showConnection('waiting',room);if(!countdown)countdown=setInterval(()=>{if(connection?.room?.phase==='reconnecting')showConnection('waiting',connection.room);},1000);
  }else{clearInterval(countdown);countdown=null;document.querySelector('#coop-reconnecting')?.remove();}
}
function showConnection(status,room){
  if(status==='connected'){if(connection.room?.phase!=='reconnecting')document.querySelector('#coop-reconnecting')?.remove();return;}
  let overlay=document.querySelector('#coop-reconnecting');if(!overlay){overlay=document.createElement('div');overlay.id='coop-reconnecting';overlay.className='coop-reconnecting';overlay.setAttribute('role','status');overlay.innerHTML='<h2></h2><p>真人席位已保留，比赛暂停。不会安排 AI 替补。</p><strong></strong><small></small><button type="button" class="coop-abandon">离开本次对局</button>';overlay.querySelector('button').onclick=leaveRoom;document.querySelector('.match')?.append(overlay);}
  const seconds=room?.reconnectDeadline?Math.max(0,Math.ceil((room.reconnectDeadline-Date.now())/1000)):null;
  const heading=overlay.querySelector('h2'),counter=overlay.querySelector('strong'),hint=overlay.querySelector('small'),title=status==='waiting'?'等待队友重连':'正在重新连接';
  if(heading.textContent!==title)heading.textContent=title;counter.hidden=seconds===null;
  const countText=seconds!==null?`${seconds} 秒`:'';if(counter.textContent!==countText)counter.textContent=countText;
  const hintText=seconds!==null?'超时将结束本次对局':'请保持网页打开';if(hint.textContent!==hintText)hint.textContent=hintText;
}
export function exitCoopMatch(){leaveRoom();}

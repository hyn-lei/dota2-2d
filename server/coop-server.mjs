import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { CoopGame } from './coop-game.mjs';
import { executeCommand, validHero, validName, messageHasOnly } from './commands.mjs';
import { snapshotState } from './snapshot.mjs';
import { encodeMessage } from '../src/network-protocol.js';

const defaults = {
  host:'127.0.0.1',port:5184,autoTick:true,tickMs:50,snapshotMs:100,reconnectMs:120000,
  maxRooms:20,maxConnections:120,maxSessions:600,maxMessageBytes:8192,
  maxBufferedBytes:2*1024*1024,heartbeatMs:15000,helloTimeoutMs:10000,snapshotAckMs:30000,
  sessionTtlMs:600000,lobbyTtlMs:1800000,endedTtlMs:120000,
  messageRate:60,commandRate:40,lobbyRate:2,
};
const tokenPattern=/^[a-f0-9]{64}$/;
const codePattern=/^[A-Z2-9]{6}$/;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ico':'image/x-icon'};

function consume(socket, kind, rate, now) {
  const bucket=socket.coopRates[kind] ||= {tokens:rate*2,at:now};
  bucket.tokens=Math.min(rate*2,bucket.tokens+(now-bucket.at)*rate/1000);bucket.at=now;
  if(bucket.tokens<1) return false;
  bucket.tokens--;return true;
}

export class RoomManager {
  constructor(options) {this.options=options;this.rooms=new Map();this.sessions=new Map();this.sockets=new Set();this.pendingSnapshots=new WeakMap();this.deferredSnapshots=new WeakMap();this.frame=0;this.closed=false;}

  send(socket,message) {
    if(socket?.readyState!==WebSocket.OPEN) return false;
    if(socket.bufferedAmount>this.options.maxBufferedBytes) {socket.terminate();return false;}
    const snapshot=message.type==='snapshot';
    if(snapshot&&this.pendingSnapshots.has(socket)) return false;
    if(snapshot)this.pendingSnapshots.set(socket,{frame:message.frame,sent:false,applied:false,at:Date.now()});
    try {
      // Keep one snapshot outstanding until transport drain AND client application.
      socket.send(encodeMessage(message),{compress:snapshot},error=>{
        if(error)socket.terminate();
        if(snapshot){
          if(error){this.pendingSnapshots.delete(socket);this.deferredSnapshots.delete(socket);return;}
          const pending=this.pendingSnapshots.get(socket);if(pending?.frame===message.frame){pending.sent=true;this.completeSnapshot(socket);}
        }
      });
      return true;
    } catch {if(snapshot){this.pendingSnapshots.delete(socket);this.deferredSnapshots.delete(socket);}socket.terminate();return false;}
  }
  completeSnapshot(socket) {
    const pending=this.pendingSnapshots.get(socket);if(!pending?.sent||!pending.applied)return;
    this.pendingSnapshots.delete(socket);
    const deferred=this.deferredSnapshots.get(socket);this.deferredSnapshots.delete(socket);
    if(deferred){
      const {room,member}=deferred,session=socket.coopSession;
      // Project only the latest state, including a terminal result, for the same active seat.
      if(!room.abortReason&&session?.socket===socket&&session.roomCode===room.code&&member.connected&&room.members.includes(member))
        this.send(socket,{type:'snapshot',frame:++this.frame,playerId:member.heroEntityId,roomCode:room.code,state:snapshotState(room.game)});
    }
  }
  error(socket,code,message) {this.send(socket,{type:'error',code,message});}
  roomView(room) {
    const deadlines=room.members.filter(m=>!m.connected&&m.reconnectDeadline).map(m=>m.reconnectDeadline);
    return {code:room.code,phase:room.phase,hostId:room.hostId,capacity:5,
      members:room.members.map(({clientId,name,heroId,ready,connected,heroEntityId})=>({clientId,name,heroId,ready,connected,heroEntityId:heroEntityId??null})),
      ...(deadlines.length ? {reconnectDeadline:Math.min(...deadlines)} : {}),};
  }
  broadcastRoom(room) {
    const message={type:'room',room:this.roomView(room)};
    for(const member of room.members) this.send(this.sessions.get(member.token)?.socket,message);
  }
  broadcastSnapshot(room) {
    if(!room.game) return;
    room.lastSnapshotAt=Date.now();
    const recipients=[];
    for(const member of room.members) {
      const socket=this.sessions.get(member.token)?.socket;
      if(!member.connected||socket?.readyState!==WebSocket.OPEN)continue;
      if(socket.bufferedAmount>this.options.maxBufferedBytes){socket.terminate();continue;}
      if(!this.pendingSnapshots.has(socket))recipients.push({member,socket});
      else this.deferredSnapshots.set(socket,{room,member});
    }
    if(!recipients.length)return;
    const state=snapshotState(room.game),frame=++this.frame;
    for(const {member,socket} of recipients)this.send(socket,{type:'snapshot',frame,playerId:member.heroEntityId,roomCode:room.code,state});
  }
  attach(socket) {
    this.sockets.add(socket);socket.coopRates={};socket.coopAlive=true;socket.coopViolations=0;
    const timer=setTimeout(()=>socket.close(1008,'hello required'),this.options.helloTimeoutMs);timer.unref();
    socket.on('pong',()=>{socket.coopAlive=true;});
    socket.on('message',(data,binary)=>{
      if(binary) return this.reject(socket,'INVALID_MESSAGE','仅支持 JSON 文本消息');
      if(!consume(socket,'message',this.options.messageRate,Date.now())) return this.reject(socket,'RATE_LIMIT','消息过于频繁');
      try {
        const message=JSON.parse(data.toString('utf8'));
        if(!message || typeof message!=='object' || Array.isArray(message) || typeof message.type!=='string') return this.reject(socket,'INVALID_MESSAGE','无效消息');
        this.handle(socket,message);if(socket.coopSession) clearTimeout(timer);
      } catch {this.reject(socket,'INVALID_MESSAGE','无效 JSON 消息');}
    });
    socket.on('error',()=>{});
    socket.on('close',()=>{clearTimeout(timer);this.sockets.delete(socket);this.disconnect(socket);});
  }
  reject(socket,code,message) {this.error(socket,code,message);if(++socket.coopViolations>=8) socket.close(1008,code);}
  handle(socket,message) {
    if(message.type==='hello') return this.hello(socket,message);
    const session=socket.coopSession;
    if(!session || session.socket!==socket) return this.reject(socket,'HELLO_REQUIRED','请先建立会话');
    session.lastSeenAt=Date.now();
    if(message.type==='snapshotAck') {
      if(!messageHasOnly(message,['type','frame'])||!Number.isSafeInteger(message.frame)||message.frame<=0)return this.reject(socket,'INVALID_MESSAGE','无效快照确认');
      const pending=this.pendingSnapshots.get(socket);
      if(pending?.frame===message.frame){pending.applied=true;this.completeSnapshot(socket);}return;
    }
    if(message.type==='ping') {
      if(!messageHasOnly(message,['type','sentAt'])||!Number.isFinite(message.sentAt)) return this.reject(socket,'INVALID_MESSAGE','无效 ping');
      return this.send(socket,{type:'pong',sentAt:message.sentAt});
    }
    if(message.type==='command') return this.command(session,message);
    if(!consume(socket,'lobby',this.options.lobbyRate,Date.now())) return this.reject(socket,'RATE_LIMIT','房间操作过于频繁');
    switch(message.type) {
      case 'create': return this.create(session,message);
      case 'join': return this.join(session,message);
      case 'chooseHero': return this.chooseHero(session,message);
      case 'ready': return this.ready(session,message);
      case 'start': return this.start(session,message);
      case 'leave': if(messageHasOnly(message,['type'])) return this.leave(session);break;
    }
    this.reject(socket,'INVALID_MESSAGE','未知或无效的消息');
  }
  hello(socket,message) {
    if(socket.coopSession || !messageHasOnly(message,['type','token']) || message.token!==undefined && (typeof message.token!=='string'||!tokenPattern.test(message.token))) return this.reject(socket,'INVALID_HELLO','无效会话请求');
    let session=message.token ? this.sessions.get(message.token) : null;
    if(message.token && !session) return this.error(socket,'TOKEN_EXPIRED','会话已失效，请重新加入');
    if(session?.socket?.readyState===WebSocket.OPEN) return this.error(socket,'TOKEN_ACTIVE','该会话已在另一连接中使用');
    if(!session) {
      this.cleanup();if(this.sessions.size>=this.options.maxSessions) return this.error(socket,'SERVER_FULL','服务器会话已满');
      const token=randomBytes(32).toString('hex');
      session={token,clientId:randomBytes(12).toString('hex'),socket:null,roomCode:null,lastCommandId:0,lastSeenAt:Date.now()};this.sessions.set(token,session);
    }
    // A delayed close callback from a previous socket cannot detach its replacement.
    const previous=session.socket;session.socket=socket;socket.coopSession=session;session.lastSeenAt=Date.now();
    if(previous && previous!==socket && previous.readyState!==WebSocket.CLOSED) previous.terminate();
    this.send(socket,{type:'welcome',token:session.token,clientId:session.clientId,lastCommandId:session.lastCommandId});
    const room=this.rooms.get(session.roomCode),member=room?.members.find(m=>m.clientId===session.clientId);
    if(!room||!member) {session.roomCode=null;return;}
    if(room.phase==='ended'){const reason=room.abortReason||'match_finished';this.removeMember(session,room);this.send(socket,{type:'end',reason});return;}
    if(member.reconnectDeadline && Date.now()>=member.reconnectDeadline && room.phase==='reconnecting') this.end(room,'reconnect_timeout');
    member.connected=true;delete member.reconnectDeadline;
    if(room.phase==='reconnecting'&&room.members.every(m=>m.connected)) {room.phase='playing';room.game.setPaused(false);}
    this.broadcastRoom(room);if(room.game) this.broadcastSnapshot(room);
    if(room.abortReason) this.send(socket,{type:'end',reason:room.abortReason});
  }
  available(session) {
    const current=this.rooms.get(session.roomCode);if(current?.phase==='ended') this.removeMember(session,current);
    if(session.roomCode) {this.error(session.socket,'ALREADY_IN_ROOM','请先离开当前房间');return false;}return true;
  }
  create(session,message) {
    if(!messageHasOnly(message,['type','name','heroId'])||!validName(message.name)||!validHero(message.heroId)) return this.reject(session.socket,'INVALID_ROOM','请输入玩家名并选择有效英雄');
    if(!this.available(session)) return;this.cleanup();
    if(this.rooms.size>=this.options.maxRooms) return this.error(session.socket,'SERVER_FULL','服务器房间已满');
    let code;do {code=Array.from(randomBytes(6),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');} while(this.rooms.has(code));
    const room={code,phase:'lobby',hostId:session.clientId,members:[],game:null,createdAt:Date.now(),lastActivityAt:Date.now(),lastSnapshotAt:0};
    this.rooms.set(code,room);this.addMember(session,room,message);
  }
  join(session,message) {
    if(!messageHasOnly(message,['type','code','name','heroId'])||typeof message.code!=='string'||!codePattern.test(message.code)||!validName(message.name)||!validHero(message.heroId)) return this.reject(session.socket,'INVALID_ROOM','无效的房间码、玩家名或英雄');
    if(!this.available(session)) return;const room=this.rooms.get(message.code);
    if(!room) return this.error(session.socket,'ROOM_NOT_FOUND','房间不存在');
    if(room.phase!=='lobby') return this.error(session.socket,'ROOM_STARTED','对局已经开始，不接受替补');
    if(room.members.length>=5) return this.error(session.socket,'ROOM_FULL','房间已有五名成员');
    if(room.members.some(m=>m.heroId===message.heroId)) return this.error(session.socket,'HERO_TAKEN','队友已经选择该英雄');this.addMember(session,room,message);
  }
  addMember(session,room,message) {
    room.members.push({token:session.token,clientId:session.clientId,name:message.name.trim(),heroId:message.heroId,ready:false,connected:true,heroEntityId:null});
    session.roomCode=room.code;room.lastActivityAt=Date.now();this.broadcastRoom(room);
  }
  lobbyMember(session) {
    const room=this.rooms.get(session.roomCode),member=room?.members.find(m=>m.clientId===session.clientId);
    if(!room||!member) {this.error(session.socket,'NO_ROOM','请先加入房间');return null;}
    if(room.phase!=='lobby') {this.error(session.socket,'ROOM_STARTED','对局已经开始');return null;}room.lastActivityAt=Date.now();return {room,member};
  }
  chooseHero(session,message) {
    if(!messageHasOnly(message,['type','heroId'])||!validHero(message.heroId)) return this.reject(session.socket,'INVALID_HERO','无效英雄');
    const found=this.lobbyMember(session);if(!found)return;const {room,member}=found;
    if(room.members.some(m=>m!==member&&m.heroId===message.heroId)) return this.error(session.socket,'HERO_TAKEN','队友已经选择该英雄');
    member.heroId=message.heroId;member.ready=false;this.broadcastRoom(room);
  }
  ready(session,message) {
    if(!messageHasOnly(message,['type','ready'])||typeof message.ready!=='boolean') return this.reject(session.socket,'INVALID_READY','无效准备状态');
    const found=this.lobbyMember(session);if(!found)return;found.member.ready=message.ready;this.broadcastRoom(found.room);
  }
  start(session,message) {
    if(!messageHasOnly(message,['type'])) return this.reject(session.socket,'INVALID_START','无效开局请求');
    const found=this.lobbyMember(session);if(!found)return;const {room}=found;
    if(room.hostId!==session.clientId) return this.error(session.socket,'HOST_ONLY','只有房主可以开始');
    if(room.members.length!==5||!room.members.every(m=>m.connected&&m.ready&&this.sessions.get(m.token)?.socket?.readyState===WebSocket.OPEN)||new Set(room.members.map(m=>m.heroId)).size!==5) return this.error(session.socket,'NOT_READY','必须五名在线成员选择不同英雄并全部准备');
    const roster=room.members.map(({heroId,name,clientId})=>({heroId,name,clientId})),options={seed:randomBytes(4).readUInt32LE()};
    room.game=this.options.gameFactory?this.options.gameFactory(roster,options):new CoopGame(roster,options);
    for(const member of room.members) member.heroEntityId=room.game.entities.find(e=>e.isHuman&&e.clientId===member.clientId)?.id;
    if(room.members.some(m=>!m.heroEntityId)) {this.end(room,'simulation_error');return;}
    room.phase='playing';this.broadcastRoom(room);this.broadcastSnapshot(room);
  }
  command(session,message) {
    if(!Number.isSafeInteger(message.id)||message.id<=0) return this.reject(session.socket,'INVALID_COMMAND','命令序号必须为正整数');
    const ack=result=>this.send(session.socket,{type:'ack',id:message.id,result});
    if(!consume(session.socket,'command',this.options.commandRate,Date.now())) return ack({ok:false,reason:'操作过于频繁'});
    if(message.id<=session.lastCommandId) return ack({ok:false,reason:'命令序号重复或过期'});session.lastCommandId=message.id;
    const room=this.rooms.get(session.roomCode),member=room?.members.find(m=>m.clientId===session.clientId);
    if(!room||!member||!member.connected||room.phase!=='playing'||!room.game||room.game.paused||room.game.status!=='playing') return ack({ok:false,reason:'当前无法执行对局操作'});
    try {ack(executeCommand(room.game,member.heroEntityId,message));} catch {ack({ok:false,reason:'操作执行失败'});}
  }
  removeMember(session,room) {
    room.members=room.members.filter(m=>m.clientId!==session.clientId);session.roomCode=null;
    if(room.hostId===session.clientId) room.hostId=room.members[0]?.clientId??null;
    if(!room.members.length) this.rooms.delete(room.code);else this.broadcastRoom(room);
  }
  leave(session) {
    const room=this.rooms.get(session.roomCode);if(!room) {session.roomCode=null;return;}
    if(['playing','reconnecting'].includes(room.phase)) this.end(room,'player_left');this.removeMember(session,room);
  }
  disconnect(socket) {
    const session=socket.coopSession;if(!session||session.socket!==socket) return;
    session.socket=null;session.lastSeenAt=Date.now();if(this.closed) return;
    const room=this.rooms.get(session.roomCode),member=room?.members.find(m=>m.clientId===session.clientId);if(!room||!member) return;
    if(room.phase==='lobby') return this.removeMember(session,room);member.connected=false;
    if(['playing','reconnecting'].includes(room.phase)) {
      room.phase='reconnecting';member.reconnectDeadline=Date.now()+this.options.reconnectMs;room.game.setPaused(true);
      for(const hero of room.game.entities.filter(e=>e.isHuman)) room.game.clearMovement(hero);this.broadcastSnapshot(room);
    }
    this.broadcastRoom(room);
  }
  end(room,reason) {
    if(room.phase==='ended')return;room.phase='ended';room.abortReason=reason;room.endedAt=Date.now();
    if(room.game) {room.game.setPaused(true);for(const hero of room.game.entities.filter(e=>e.isHuman))room.game.clearMovement(hero);}
    for(const member of room.members) {delete member.reconnectDeadline;this.send(this.sessions.get(member.token)?.socket,{type:'end',reason});}this.broadcastRoom(room);
  }
  cleanup(now=Date.now()) {
    for(const room of this.rooms.values()) {
      if(room.phase==='reconnecting'&&room.members.some(m=>!m.connected&&m.reconnectDeadline<=now)) this.end(room,'reconnect_timeout');
      if(room.phase==='lobby'&&now-room.lastActivityAt>this.options.lobbyTtlMs) this.end(room,'lobby_expired');
      if(room.phase==='ended'&&now-room.endedAt>this.options.endedTtlMs) {
        for(const member of room.members) {const session=this.sessions.get(member.token);if(session?.roomCode===room.code)session.roomCode=null;}this.rooms.delete(room.code);
      }
    }
    for(const [token,session] of this.sessions) if(!session.socket&&!session.roomCode&&now-session.lastSeenAt>this.options.sessionTtlMs) this.sessions.delete(token);
  }
  tick() {
    if(this.closed)return;const now=Date.now();this.cleanup(now);
    for(const room of this.rooms.values()) {
      if(room.phase==='playing') {
        try {room.game.step(this.options.tickMs/1000);} catch {this.end(room,'simulation_error');continue;}
        if(room.game.status!=='playing') {room.phase='ended';room.endedAt=now;this.broadcastRoom(room);this.broadcastSnapshot(room);}
      }
      if(room.game&&['playing','reconnecting'].includes(room.phase)&&now-room.lastSnapshotAt>=this.options.snapshotMs) this.broadcastSnapshot(room);
    }
  }
  heartbeat() {
    for(const socket of this.sockets) {
      const snapshot=this.pendingSnapshots.get(socket);
      if(snapshot&&Date.now()-snapshot.at>=this.options.snapshotAckMs){socket.terminate();continue;}
      if(!socket.coopAlive) {socket.terminate();continue;}socket.coopAlive=false;
      if(socket.readyState===WebSocket.OPEN)socket.ping();
    }
  }
}

export function createCoopServer(configuration={}) {
  const options={...defaults,...configuration};if(!options.root) throw new Error('A public frontend root is required');
  const root=resolve(options.root),manager=new RoomManager(options);
  const server=http.createServer(async (request,response)=>{
    try {
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      if(pathname==='/healthz') {response.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}).end('ok\n');return;}
      if(!['GET','HEAD'].includes(request.method)) {response.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
      const publicPath=pathname==='/'?'/index.html':pathname;
      if(publicPath!=='/index.html'&&!publicPath.startsWith('/src/')&&!publicPath.startsWith('/assets/')) {response.writeHead(404).end('Not found');return;}
      if(publicPath.includes('\\')||publicPath.includes('\0')||publicPath.split('/').some(segment=>segment==='..'||segment==='.'||segment.startsWith('.'))) {response.writeHead(403).end();return;}
      const path=resolve(root,'.'+publicPath),resolved=await realpath(path),resolvedRoot=await realpath(root);
      const publicBase=resolve(resolvedRoot,publicPath.startsWith('/src/')?'src':'assets');
      const allowed=publicPath==='/index.html'?resolved===resolve(resolvedRoot,'index.html'):resolved.startsWith(publicBase+sep);
      if(!allowed||!(await stat(resolved)).isFile()) {response.writeHead(403).end();return;}
      response.writeHead(200,{'Content-Type':mime[extname(resolved)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      response.end(request.method==='HEAD'?undefined:await readFile(resolved));
    } catch {response.writeHead(404).end('Not found');}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  const websocket=new WebSocketServer({noServer:true,maxPayload:options.maxMessageBytes,perMessageDeflate:{threshold:1024,serverNoContextTakeover:true,clientNoContextTakeover:true,concurrencyLimit:5,zlibDeflateOptions:{level:3,memLevel:4}}});
  server.on('upgrade',(request,socket,head)=>{
    let url;try {url=new URL(request.url,'http://localhost');} catch {socket.destroy();return;}
    if(url.pathname!=='/ws/coop'||url.search) {socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return;}
    if(request.headers.origin) {
      try {if(new URL(request.headers.origin).host!==request.headers.host) throw new Error();} catch {socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    }
    if(manager.sockets.size>=options.maxConnections) {socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');return;}
    websocket.handleUpgrade(request,socket,head,client=>websocket.emit('connection',client,request));
  });
  websocket.on('connection',socket=>manager.attach(socket));
  const tickTimer=options.autoTick?setInterval(()=>manager.tick(),options.tickMs):null;tickTimer?.unref();
  const heartbeatTimer=setInterval(()=>{manager.heartbeat();manager.cleanup();},options.heartbeatMs);heartbeatTimer.unref();
  return {server,manager,websocket,
    listen:()=>new Promise((resolveListen,reject)=>{
      const fail=error=>{server.off('listening',ready);reject(error);};const ready=()=>{server.off('error',fail);resolveListen(server.address());};
      server.once('error',fail);server.once('listening',ready);server.listen(options.port,options.host);
    }),
    close:async()=>{
      manager.closed=true;clearInterval(tickTimer);clearInterval(heartbeatTimer);for(const socket of manager.sockets)socket.terminate();
      await new Promise(resolveClose=>websocket.close(resolveClose));
      if(server.listening)await new Promise((resolveClose,reject)=>server.close(error=>error?reject(error):resolveClose()));
    },
  };
}

import { decodeMessage } from './network-protocol.js';
import { NetworkGame } from './network-game.js';

const tokenKey='af-coop-token';
export class CoopConnection extends EventTarget {
  constructor(){
    super();this.pending=new Map();this.commandId=0;this.closed=false;this.retry=0;this.frame=-1;
    try{this.token=localStorage.getItem(tokenKey)||undefined;}catch{}
  }
  emit(name,detail){this.dispatchEvent(new CustomEvent(name,{detail}));}
  connect(){
    this.closed=false;this.emit('connection',{status:'connecting'});
    const url=new URL('/ws/coop',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    const socket=new WebSocket(url);this.socket=socket;
    socket.onopen=()=>socket.send(JSON.stringify({type:'hello',...(this.token?{token:this.token}:{})}));
    socket.onmessage=e=>{
      let message;try{message=decodeMessage(e.data);}catch{return;}
      if(socket!==this.socket||this.closed)return;
      if(message.type==='welcome'){
        const formerClientId=this.clientId;
        this.token=message.token;this.clientId=message.clientId;this.commandId=Math.max(this.commandId,message.lastCommandId||0);this.ready=true;this.retry=0;if(this.game)this.game.lastMovement=null;
        try{localStorage.setItem(tokenKey,this.token);}catch{}
        if(this.game&&formerClientId&&formerClientId!==this.clientId){this.game=null;this.room=null;this.frame=-1;this.emit('end',{reason:'server_restart'});return;}
        this.emit('connection',{status:'connected'});this.emit('welcome',message);
      }else if(message.type==='room'){this.room=message.room;this.emit('room',message.room);}
      else if(message.type==='matchmaking'){this.matchmaking=message;this.emit('matchmaking',message);}
      else if(message.type==='snapshot'){
        if(message.frame<this.frame)return;this.frame=message.frame;
        if(!this.game||this.game.playerId!==message.playerId)this.game=new NetworkGame({state:message.state,playerId:message.playerId,request:(...args)=>this.request(...args)});
        else this.game.applySnapshot(message.state);
        this.send({type:'snapshotAck',frame:message.frame});
        this.emit('snapshot',{game:this.game,frame:message.frame});
      }else if(message.type==='ack'){
        const waiting=this.pending.get(message.id);if(waiting){clearTimeout(waiting.timer);this.pending.delete(message.id);waiting.resolve(message.result);}
      }else if(message.type==='end'){
        this.game=null;this.matchmaking=null;this.frame=-1;this.emit('end',message);
      }else if(message.type==='error'){
        this.emit('error',message);
        // A server restart can expire the former session. Rejoin manually as a fresh identity.
        if(message.code==='TOKEN_EXPIRED'){
          this.token=undefined;try{localStorage.removeItem(tokenKey);}catch{}
          socket.close();
        }
        if(message.code==='TOKEN_ACTIVE'){this.closed=true;socket.close();}
      }
    };
    socket.onclose=()=>{
      if(socket!==this.socket)return;this.ready=false;
      for(const waiting of this.pending.values()){clearTimeout(waiting.timer);waiting.resolve({ok:false,reason:'连接已断开，请等待重连'});}this.pending.clear();
      if(this.closed)return;this.emit('connection',{status:'disconnected'});
      this.retryTimer=setTimeout(()=>this.connect(),Math.min(8000,1000*2**this.retry++));
    };
    socket.onerror=()=>this.emit('connection',{status:'disconnected'});
    return this;
  }
  send(message){
    if(!this.ready||this.socket?.readyState!==WebSocket.OPEN){this.emit('error',{message:'尚未连接联机服务器，请稍候'});return false;}
    this.socket.send(JSON.stringify(message));return true;
  }
  request(action,args=[],slotGuards=[]){
    if(!this.ready||this.socket?.readyState!==WebSocket.OPEN)return Promise.resolve({ok:false,reason:'联机服务器尚未连接'});
    const id=++this.commandId;
    return new Promise(resolve=>{
      const timer=setTimeout(()=>{this.pending.delete(id);resolve({ok:false,reason:'服务器响应超时，请检查连接'});},8000);
      this.pending.set(id,{resolve,timer});this.send({type:'command',id,action,args,...(slotGuards.length?{slotGuards}:{})});
    });
  }
  close(){this.closed=true;this.ready=false;clearTimeout(this.retryTimer);for(const waiting of this.pending.values()){clearTimeout(waiting.timer);waiting.resolve({ok:false,reason:'已离开联机连接'});}this.pending.clear();this.socket?.close();}
}

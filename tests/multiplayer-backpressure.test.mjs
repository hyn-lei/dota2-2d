import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { RoomManager } from '../server/coop-server.mjs';
import { decodeMessage } from '../src/network-protocol.js';

function transport(slow=true) {
 return {readyState:WebSocket.OPEN,bufferedAmount:0,frames:[],callbacks:[],
  send(data,options,callback){
   const message=decodeMessage(data);this.frames.push({message,compress:options?.compress});
   if(callback){if(slow)this.callbacks.push(callback);else callback();}
   this.onMessage?.(message);
  },
  terminate(){this.readyState=WebSocket.CLOSED;},
 };
}

test('a slow peer skips stale snapshots while healthy peers and control replies continue',()=>{
 const manager=new RoomManager({maxBufferedBytes:2*1024*1024,lobbyRate:2});
 const slow=transport(),fast=transport(false);
 for(const [token,socket] of [['slow',slow],['fast',fast]]){const session={token,socket,roomCode:'TEST23'};socket.coopSession=session;socket.coopRates={};manager.sessions.set(token,session);}
 fast.onMessage=message=>{if(message.type==='snapshot')manager.handle(fast,{type:'snapshotAck',frame:message.frame});};
 const game={time:0,status:'playing',paused:false,score:[0,0],entities:[],effects:[],feed:[],camps:[],pendingSpells:[]};
 const room={code:'TEST23',game,members:[{token:'slow',connected:true,heroEntityId:'one'},{token:'fast',connected:true,heroEntityId:'two'}]};
 manager.broadcastSnapshot(room);game.time=1;manager.broadcastSnapshot(room);game.time=2;manager.broadcastSnapshot(room);
 assert.deepEqual(slow.frames.filter(f=>f.message.type==='snapshot').map(f=>f.message.state.time),[0]);
 assert.deepEqual(fast.frames.filter(f=>f.message.type==='snapshot').map(f=>f.message.state.time),[0,1,2]);
 manager.send(slow,{type:'ack',id:7,result:{ok:true}});assert.equal(slow.frames.at(-1).message.type,'ack');assert.equal(slow.frames.at(-1).compress,false);
 slow.callbacks.shift()();manager.handle(slow,{type:'snapshotAck',frame:slow.frames[0].message.frame});
 assert.deepEqual(slow.frames.filter(f=>f.message.type==='snapshot').map(f=>f.message.state.time),[0,2]);
});

test('a winning result reaches a slow peer after its last playing snapshot drains',()=>{
 const manager=new RoomManager({maxBufferedBytes:2*1024*1024,tickMs:50,snapshotMs:100,lobbyRate:2});
 const socket=transport();
 const session={token:'one',clientId:'one',socket,roomCode:'TEST23'};
 socket.coopSession=session;socket.coopRates={};manager.sessions.set(session.token,session);
 const game={time:0,status:'playing',paused:false,score:[0,0],entities:[],effects:[],feed:[],camps:[],pendingSpells:[],step(){this.time=1;this.status='won';this.winner=0;}};
 const room={code:'TEST23',game,phase:'playing',members:[{token:'one',clientId:'one',connected:true,heroEntityId:'hero'}]};
 manager.rooms.set(room.code,room);manager.broadcastSnapshot(room);manager.tick();
 assert.equal(room.phase,'ended');
 manager.handle(socket,{type:'snapshotAck',frame:socket.frames[0].message.frame});
 assert.equal(socket.frames.filter(frame=>frame.message.type==='snapshot').length,1);
 socket.callbacks.shift()();
 const results=socket.frames.filter(frame=>frame.message.type==='snapshot').map(frame=>({status:frame.message.state.status,winner:frame.message.state.winner??null}));
 assert.deepEqual(results,[{status:'playing',winner:null},{status:'won',winner:0}]);
});

test('transport drain alone cannot flood a client that has not applied its snapshot',()=>{
 const manager=new RoomManager({maxBufferedBytes:2*1024*1024,lobbyRate:2});
 const socket=transport(false),session={token:'one',socket,roomCode:'TEST23'};
 socket.coopSession=session;socket.coopRates={};manager.sessions.set(session.token,session);
 const game={time:0,status:'playing',paused:false,score:[0,0],entities:[],effects:[],feed:[],camps:[],pendingSpells:[]};
 const room={code:'TEST23',game,members:[{token:'one',connected:true,heroEntityId:'hero'}]};
 manager.broadcastSnapshot(room);game.time=1;manager.broadcastSnapshot(room);
 assert.deepEqual(socket.frames.filter(f=>f.message.type==='snapshot').map(f=>f.message.state.time),[0]);
 manager.handle(socket,{type:'snapshotAck',frame:999});game.time=2;manager.broadcastSnapshot(room);
 assert.equal(socket.frames.filter(f=>f.message.type==='snapshot').length,1);
 manager.handle(socket,{type:'snapshotAck',frame:socket.frames[0].message.frame});
 assert.deepEqual(socket.frames.filter(f=>f.message.type==='snapshot').map(f=>f.message.state.time),[0,2]);
});

test('a responsive transport that never acknowledges a snapshot is disconnected',()=>{
 const manager=new RoomManager({maxBufferedBytes:2*1024*1024,snapshotAckMs:0});
 const socket=transport(false);socket.coopAlive=true;socket.ping=()=>{};manager.sockets.add(socket);
 manager.send(socket,{type:'snapshot',frame:1,state:{time:0}});manager.heartbeat();
 assert.equal(socket.readyState,WebSocket.CLOSED);
});

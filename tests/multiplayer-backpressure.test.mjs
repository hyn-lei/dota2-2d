import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { RoomManager } from '../server/coop-server.mjs';
import { decodeMessage } from '../src/network-protocol.js';

function transport(slow=true) {
 return {readyState:WebSocket.OPEN,bufferedAmount:0,frames:[],callbacks:[],
  send(data,options,callback){
   this.frames.push({message:decodeMessage(data),compress:options?.compress});
   if(callback){if(slow)this.callbacks.push(callback);else callback();}
  },
  terminate(){this.readyState=WebSocket.CLOSED;},
 };
}

test('a slow peer skips stale snapshots while healthy peers and control replies continue',()=>{
 const manager=new RoomManager({maxBufferedBytes:2*1024*1024});
 const slow=transport(),fast=transport(false);manager.sessions.set('slow',{socket:slow});manager.sessions.set('fast',{socket:fast});
 const game={time:0,status:'playing',paused:false,score:[0,0],entities:[],effects:[],feed:[],camps:[],pendingSpells:[]};
 const room={code:'TEST23',game,members:[{token:'slow',connected:true,heroEntityId:'one'},{token:'fast',connected:true,heroEntityId:'two'}]};
 manager.broadcastSnapshot(room);game.time=1;manager.broadcastSnapshot(room);game.time=2;manager.broadcastSnapshot(room);
 assert.deepEqual(slow.frames.filter(f=>f.message.type==='snapshot').map(f=>f.message.state.time),[0]);
 assert.deepEqual(fast.frames.map(f=>f.message.state.time),[0,1,2]);
 manager.send(slow,{type:'ack',id:7,result:{ok:true}});assert.equal(slow.frames.at(-1).message.type,'ack');assert.equal(slow.frames.at(-1).compress,false);
 slow.callbacks.shift()();game.time=3;manager.broadcastSnapshot(room);
 assert.deepEqual(slow.frames.filter(f=>f.message.type==='snapshot').map(f=>f.message.state.time),[0,3]);
});

test('a winning result reaches a slow peer after its last playing snapshot drains',()=>{
 const manager=new RoomManager({maxBufferedBytes:2*1024*1024,tickMs:50,snapshotMs:100});
 const socket=transport();
 const session={token:'one',clientId:'one',socket,roomCode:'TEST23'};
 socket.coopSession=session;manager.sessions.set(session.token,session);
 const game={time:0,status:'playing',paused:false,score:[0,0],entities:[],effects:[],feed:[],camps:[],pendingSpells:[],step(){this.time=1;this.status='won';this.winner=0;}};
 const room={code:'TEST23',game,phase:'playing',members:[{token:'one',clientId:'one',connected:true,heroEntityId:'hero'}]};
 manager.rooms.set(room.code,room);manager.broadcastSnapshot(room);manager.tick();
 assert.equal(room.phase,'ended');
 socket.callbacks.shift()();
 const results=socket.frames.filter(frame=>frame.message.type==='snapshot').map(frame=>({status:frame.message.state.status,winner:frame.message.state.winner??null}));
 assert.deepEqual(results,[{status:'playing',winner:null},{status:'won',winner:0}]);
});

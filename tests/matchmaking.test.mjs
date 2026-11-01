import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createCoopServer } from '../server/coop-server.mjs';
import { decodeMessage } from '../src/network-protocol.js';

async function setup(t, options={}) {
  const service=createCoopServer({root:process.cwd(),host:'127.0.0.1',port:0,autoTick:false,lobbyRate:100,...options});
  await service.listen();const sockets=[];
  t.after(async()=>{for(const socket of sockets)socket.terminate();await service.close();});
  async function connect(){
    const socket=new WebSocket(`ws://127.0.0.1:${service.server.address().port}/ws/coop`);sockets.push(socket);
    const messages=[],waiters=[];
    socket.on('error',()=>{});
    socket.on('message',data=>{
      const message=decodeMessage(data.toString());
      if(message.type==='snapshot')socket.send(JSON.stringify({type:'snapshotAck',frame:message.frame}));
      const index=waiters.findIndex(w=>w.matches(message));
      if(index>=0)waiters.splice(index,1)[0].resolve(message);else messages.push(message);
    });
    const next=(type,predicate=()=>true)=>{
      const matches=m=>m.type===type&&predicate(m),index=messages.findIndex(matches);
      if(index>=0)return Promise.resolve(messages.splice(index,1)[0]);
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error(`Timed out waiting for ${type}`)),2500);
        waiters.push({matches,resolve:m=>{clearTimeout(timer);resolve(m);}});
      });
    };
    await once(socket,'open');const send=m=>socket.send(JSON.stringify(m));send({type:'hello'});
    return {socket,send,next,messages,...await next('welcome')};
  }
  return {service,connect};
}
const enqueue=client=>client.send({type:'matchmake',name:'Queue Player',heroId:'ogre_magi'});

test('the fifth online human automatically starts a nightmare match with five distinct heroes',async t=>{
  const f=await setup(t),clients=[];
  for(let i=0;i<4;i++){
    const client=await f.connect();clients.push(client);enqueue(client);
    const status=await client.next('matchmaking',m=>m.status==='queued'&&m.players===i+1);
    assert.equal(status.capacity,5);assert.equal(f.service.manager.rooms.size,0);
  }
  const fifth=await f.connect();clients.push(fifth);enqueue(fifth);
  const states=await Promise.all(clients.map(c=>c.next('snapshot'))),roomCodes=new Set(states.map(m=>m.roomCode));
  assert.equal(roomCodes.size,1);assert.equal(new Set(states.map(m=>m.playerId)).size,5);
  const heroes=states[0].state.entities.filter(e=>e.kind==='hero'),humans=heroes.filter(e=>e.isHuman);
  assert.equal(humans.length,5);assert.equal(new Set(humans.map(h=>h.heroId)).size,5);assert.equal(humans.filter(h=>h.heroId==='ogre_magi').length,1);
  assert.ok(humans.every(h=>h.controller==='human'&&h.team===0));assert.equal(heroes.filter(h=>h.team===1&&h.controller==='ai').length,5);
  const room=f.service.manager.rooms.get(states[0].roomCode);assert.equal(room.game.difficulty,'nightmare');assert.equal(room.matchmade,true);
  for(let i=0;i<5;i++)assert.equal(states[i].state.entities.find(e=>e.id===states[i].playerId).clientId,clients[i].clientId);
});

test('duplicate requests cannot occupy two queue slots and queued users cannot create a room',async t=>{
  const f=await setup(t),client=await f.connect();enqueue(client);await client.next('matchmaking');enqueue(client);
  await client.next('matchmaking');assert.equal(f.service.manager.matchQueue.length,1);
  client.send({type:'create',name:'Duplicate',heroId:'axe'});
  assert.equal((await client.next('error')).code,'ALREADY_MATCHMAKING');assert.equal(f.service.manager.rooms.size,0);
});

test('canceling a queue slot removes it and broadcasts the remaining true count',async t=>{
  const f=await setup(t),a=await f.connect(),b=await f.connect();enqueue(a);await a.next('matchmaking');enqueue(b);await b.next('matchmaking');
  a.send({type:'cancelMatchmaking'});assert.equal((await a.next('matchmaking',m=>m.status==='canceled')).status,'canceled');
  assert.equal((await b.next('matchmaking',m=>m.players===1)).players,1);assert.equal(f.service.manager.matchQueue.length,1);
  a.send({type:'create',name:'Friend host',heroId:'axe'});await a.next('room');
});

test('disconnected queued humans never become ghost seats in the next group',async t=>{
  const f=await setup(t),clients=[];
  for(let i=0;i<4;i++){const c=await f.connect();clients.push(c);enqueue(c);await c.next('matchmaking');}
  clients[1].socket.terminate();await clients[0].next('matchmaking',m=>m.players===3);
  const replacements=[];for(let i=0;i<2;i++){const c=await f.connect();replacements.push(c);enqueue(c);}
  const state=await clients[0].next('snapshot'),humans=state.state.entities.filter(e=>e.isHuman);
  assert.equal(humans.length,5);assert.equal(humans.some(h=>h.clientId===clients[1].clientId),false);
  assert.ok(replacements.every(c=>humans.some(h=>h.clientId===c.clientId)));
});

test('players already in a friend room cannot join matchmaking',async t=>{
  const f=await setup(t),client=await f.connect();client.send({type:'create',name:'Host',heroId:'axe'});await client.next('room');enqueue(client);
  assert.equal((await client.next('error')).code,'ALREADY_IN_ROOM');assert.equal(f.service.manager.matchQueue.length,0);
});

test('full server capacity keeps five humans waiting until a room becomes free',async t=>{
  const f=await setup(t,{maxRooms:1}),host=await f.connect();host.send({type:'create',name:'Host',heroId:'axe'});await host.next('room');
  const clients=[];for(let i=0;i<5;i++){const c=await f.connect();clients.push(c);enqueue(c);await c.next('matchmaking',m=>m.status==='queued');}
  assert.equal(f.service.manager.matchQueue.length,5);assert.equal(f.service.manager.rooms.size,1);assert.equal(clients[0].messages.some(m=>m.type==='snapshot'),false);
  host.send({type:'leave'});const state=await clients[0].next('snapshot');assert.equal(state.state.entities.filter(e=>e.isHuman).length,5);
});

test('canceling after a match forms cannot end it for the other four humans',async t=>{
  const f=await setup(t),clients=[];
  for(let i=0;i<5;i++){const c=await f.connect();clients.push(c);enqueue(c);}
  const state=await clients[0].next('snapshot');clients[0].send({type:'cancelMatchmaking'});
  assert.equal((await clients[0].next('error')).code,'MATCH_ALREADY_STARTED');assert.equal(f.service.manager.rooms.get(state.roomCode).phase,'playing');
});

test('invalid queue payloads and simulation initialization failure never create a partial playing match',async t=>{
  for(const gameFactory of [()=>{throw new Error('test simulation failure');},()=>null]){
  const f=await setup(t,{gameFactory}),bad=await f.connect();
  bad.send({type:'matchmake',name:'Invalid',heroId:'missing'});assert.equal((await bad.next('error')).code,'INVALID_MATCHMAKING');
  const clients=[];for(let i=0;i<5;i++){const c=await f.connect();clients.push(c);enqueue(c);}
  await Promise.all(clients.map(c=>c.next('end',m=>m.reason==='simulation_error')));
  assert.equal(f.service.manager.matchQueue.length,0);assert.equal([...f.service.manager.rooms.values()].some(r=>r.phase==='playing'),false);
  }
});

test('consecutive groups stay isolated while the remaining humans continue waiting',async t=>{
  const f=await setup(t),clients=[];
  for(let i=0;i<12;i++){const c=await f.connect();clients.push(c);enqueue(c);}
  const first=await clients[0].next('snapshot'),second=await clients[5].next('snapshot');
  assert.notEqual(first.roomCode,second.roomCode);assert.equal(f.service.manager.rooms.size,2);assert.equal(f.service.manager.matchQueue.length,2);
  assert.equal((await clients[11].next('matchmaking',m=>m.players===2)).status,'queued');
  assert.equal(clients[10].messages.some(m=>m.type==='snapshot'),false);
  const roomA=f.service.manager.rooms.get(first.roomCode),roomB=f.service.manager.rooms.get(second.roomCode);
  assert.deepEqual(roomA.members.map(m=>m.clientId),clients.slice(0,5).map(c=>c.clientId));
  assert.deepEqual(roomB.members.map(m=>m.clientId),clients.slice(5,10).map(c=>c.clientId));
  clients[0].send({type:'command',id:1,action:'buy',args:['branch']});assert.equal((await clients[0].next('ack')).result.ok,true);
  assert.deepEqual(roomA.game.entities.find(e=>e.clientId===clients[0].clientId).inventory,['branch']);
  assert.deepEqual(roomB.game.entities.find(e=>e.clientId===clients[5].clientId).inventory,[]);
});

test('queue replies preserve request identity across retries and cancellation',async t=>{
  const f=await setup(t),client=await f.connect();
  client.send({type:'matchmake',name:'Request owner',heroId:'axe',requestId:41});
  assert.equal((await client.next('matchmaking',m=>m.status==='queued')).requestId,41);
  client.send({type:'matchmake',name:'Request owner',heroId:'axe',requestId:42});
  assert.equal((await client.next('matchmaking',m=>m.requestId===42)).players,1);
  client.send({type:'cancelMatchmaking',requestId:43});
  assert.equal((await client.next('matchmaking',m=>m.status==='canceled')).requestId,43);
  assert.equal(f.service.manager.matchQueue.length,0);
});

import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { decodeMessage } from '../src/network-protocol.js';

const base=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8080';
const health=await fetch(new URL('/healthz',base),{signal:AbortSignal.timeout(10000)});
assert.equal(health.status,200);assert.equal(await health.text(),'ok\n');
const clients=[];
async function connect(token) {
  const socket=new WebSocket(new URL('/ws/coop',base).href.replace(/^http/,'ws'));
  const messages=[],waiters=[];
  socket.on('error',()=>{});
  socket.on('message',data=>{
    const value=decodeMessage(data.toString()),index=waiters.findIndex(w=>w.matches(value));
    if(index>=0)waiters.splice(index,1)[0].resolve(value);else messages.push(value);
  });
  const next=(type,predicate=()=>true)=>{
    const matches=value=>value.type===type&&predicate(value),index=messages.findIndex(matches);
    if(index>=0)return Promise.resolve(messages.splice(index,1)[0]);
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error(`Timed out waiting for multiplayer ${type}`)),10000);
      waiters.push({matches,resolve:value=>{clearTimeout(timer);resolve(value);}});
    });
  };
  await once(socket,'open');
  const send=message=>socket.send(JSON.stringify(message));send({type:'hello',...(token?{token}:{})});
  const client={socket,send,next,...await next('welcome')};clients.push(client);return client;
}

try {
  const heroIds=['juggernaut','crystal_maiden','windranger','axe','ogre_magi'];
  const host=await connect();host.send({type:'create',name:'CI Host',heroId:heroIds[0]});const code=(await host.next('room')).room.code;
  for(let i=1;i<5;i++){const client=await connect();client.send({type:'join',code,name:`CI Player ${i+1}`,heroId:heroIds[i]});await client.next('room');}
  for(const client of clients)client.send({type:'ready',ready:true});
  await host.next('room',m=>m.room.members.length===5&&m.room.members.every(p=>p.ready));host.send({type:'start'});
  const initial=await host.next('snapshot'),humans=initial.state.entities.filter(e=>e.kind==='hero'&&e.isHuman);
  assert.equal(humans.length,5);assert.ok(humans.every(e=>e.team===0&&e.controller==='human'));
  host.send({type:'command',id:1,action:'learnAbility',args:[0]});assert.equal((await host.next('ack')).result.ok,true);
  host.send({type:'command',id:2,action:'buy',args:['branch']});assert.equal((await host.next('ack')).result.ok,true);
  const observed=await clients[1].next('snapshot',m=>m.state.entities.find(e=>e.id===initial.playerId)?.inventory.includes('branch'));
  const hero=observed.state.entities.find(e=>e.id===initial.playerId);assert.equal(hero.abilityLevels[0],1);assert.ok(hero.inventoryMeta[0].uid);
  const partner=clients[1];host.socket.terminate();await partner.next('room',m=>m.room.phase==='reconnecting');
  const restored=await connect(host.token);assert.equal(restored.clientId,host.clientId);assert.equal(restored.lastCommandId,2);
  const resumed=await restored.next('snapshot');assert.equal(resumed.playerId,initial.playerId);assert.equal(resumed.state.paused,false);
  restored.send({type:'leave'});assert.equal((await partner.next('end')).reason,'player_left');
  console.log('Cooperative HTTP/WebSocket OK: five seats, authoritative commands, shared inventory/skills, disconnect pause and identity-preserving reconnect.');
} finally {
  for(const client of clients)if(client.socket.readyState===WebSocket.OPEN)client.send({type:'leave'});
  for(const client of clients)client.socket.close();
}

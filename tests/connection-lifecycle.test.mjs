import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createCoopServer } from '../server/coop-server.mjs';
import { CoopConnection } from '../src/coop-connection.js';
import { decodeMessage } from '../src/network-protocol.js';

function event(target,name,predicate=()=>true,timeout=10000){return new Promise((resolve,reject)=>{const listener=e=>{if(predicate(e.detail)){clearTimeout(timer);target.removeEventListener(name,listener);resolve(e.detail);}},timer=setTimeout(()=>{target.removeEventListener(name,listener);reject(new Error(`Timed out waiting for ${name}`));},timeout);target.addEventListener(name,listener);});}
async function environment(t){
 const original={WebSocket:globalThis.WebSocket,location:globalThis.location,localStorage:globalThis.localStorage};
 const service=createCoopServer({root:process.cwd(),port:0,autoTick:false});await service.listen();const port=service.server.address().port,store=new Map();
 globalThis.WebSocket=WebSocket;globalThis.location=new URL(`http://127.0.0.1:${port}`);globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const connection=new CoopConnection(),ready=event(connection,'welcome');connection.connect();await ready;
 const sockets=[];let activeService=service;
 t.after(async()=>{connection.close();for(const socket of sockets)socket.close();await activeService.close();for(const [key,value]of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
 async function peer(hero,code){const socket=new WebSocket(`ws://127.0.0.1:${port}/ws/coop`);sockets.push(socket);await once(socket,'open');const ready=new Promise(resolve=>socket.on('message',data=>{const m=decodeMessage(data.toString());if(m.type==='welcome')resolve(m);}));socket.send(JSON.stringify({type:'hello'}));await ready;socket.send(JSON.stringify({type:'join',code,name:hero,heroId:hero}));return socket;}
 return {service,port,connection,store,peer,setService:s=>activeService=s};
}
test('expired session credentials reconnect as a usable fresh identity',async t=>{
 const {service,connection}=await environment(t),oldId=connection.clientId;
 service.manager.sessions.delete(connection.token);const welcome=event(connection,'welcome',m=>m.clientId!==oldId);connection.socket.close();await welcome;
 assert.notEqual(connection.clientId,oldId);assert.equal(connection.ready,true);
 const joined=event(connection,'room',room=>room.members.length===1);connection.send({type:'create',name:'Fresh human',heroId:'ogre_magi'});assert.equal((await joined).members[0].clientId,connection.clientId);
});
test('closing a client cancels pending UI commands immediately',async t=>{
 const {connection}=await environment(t);const action=connection.request('learnAbility',[0]);connection.close();
 assert.equal(connection.pending.size,0);assert.equal((await action).ok,false);
});
test('an actual server restart ends the former match instead of leaving an unsynchronized client',async t=>{
 const fixture=await environment(t),{connection,service,port}=fixture;
 const roomReady=event(connection,'room',room=>room.members.length===1);connection.send({type:'create',name:'Browser human',heroId:'ogre_magi'});const room=await roomReady;
 for(const hero of ['juggernaut','crystal_maiden','windranger','axe']){
   const joined=event(connection,'room',r=>r.members.length===room.members.length+1),socket=await fixture.peer(hero,room.code);Object.assign(room,await joined);socket.send(JSON.stringify({type:'ready',ready:true}));
 }
 const allReady=event(connection,'room',r=>r.members.length===5&&r.members.every(m=>m.ready));connection.send({type:'ready',ready:true});await allReady;
 const snapshot=event(connection,'snapshot');connection.send({type:'start'});await snapshot;assert.equal(connection.game.isNetwork,true);
 const ended=event(connection,'end',m=>m.reason==='server_restart');await service.close();
 const replacement=createCoopServer({root:process.cwd(),port,autoTick:false});fixture.setService(replacement);await replacement.listen();await ended;
 assert.equal(connection.game,null);assert.equal(connection.room,null);assert.equal(replacement.manager.rooms.size,0);
});

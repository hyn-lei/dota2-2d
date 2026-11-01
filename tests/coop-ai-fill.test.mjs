import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { CoopGame } from '../server/coop-game.mjs';
import * as Bots from '../src/bot-ai.js';
import { createCoopServer } from '../server/coop-server.mjs';
import { decodeMessage } from '../src/network-protocol.js';

const ids=['ogre_magi','juggernaut','crystal_maiden','windranger','axe'];
const roster=n=>ids.slice(0,n).map((heroId,i)=>({heroId,name:`Human ${i+1}`,clientId:`human-${i}`}));
for(const n of [1,2,5])test(`${n} humans receive ${5-n} hard AI allies and five nightmare enemies`,()=>{
  const g=new CoopGame(roster(n),{fillWithAI:true,difficulty:'easy'}),heroes=g.entities.filter(e=>e.kind==='hero');
  const humans=heroes.filter(e=>e.isHuman),allies=heroes.filter(e=>e.team===0&&!e.isHuman),enemies=heroes.filter(e=>e.team===1);
  assert.equal(humans.length,n);assert.equal(allies.length,5-n);assert.equal(enemies.length,5);assert.equal(g.difficulty,'nightmare');
  assert.equal(new Set(heroes.filter(e=>e.team===0).map(e=>e.heroId)).size,5);
  assert.ok(allies.every(e=>e.controller==='ai'&&!e.isPlayer&&e.clientId===undefined&&e.aiDifficulty==='hard'));
  assert.ok(allies.every(e=>Bots.botProfile(g,e)===Bots.BOT_DIFFICULTY.hard));
  assert.ok(enemies.every(e=>Bots.botProfile(g,e)===Bots.BOT_DIFFICULTY.nightmare));
});

test('AI fill remains explicit and malformed or duplicate human rosters are rejected',()=>{
  assert.throws(()=>new CoopGame(roster(1)));assert.throws(()=>new CoopGame(roster(2),{fillWithAI:false}));
  assert.throws(()=>new CoopGame([],{fillWithAI:true}));assert.throws(()=>new CoopGame([...roster(5),roster(1)[0]],{fillWithAI:true}));
  assert.throws(()=>new CoopGame([roster(1)[0],roster(1)[0]],{fillWithAI:true}));
  assert.throws(()=>new CoopGame(roster(1),{fillWithAI:'nightmare'}));
});

test('hard allied profile drives real AI decisions and allies train/buy without acting for a human',()=>{
  const g=new CoopGame(roster(1),{fillWithAI:true}),ally=g.entities.find(e=>e.kind==='hero'&&e.team===0&&!e.isHuman);
  g._index();g._random=()=>0;ally.aiTimer=0;Bots.tickBot(g,ally,.05);assert.equal(ally.aiTimer,.08);
  g.step(1);assert.ok(ally.inventory.length>0);assert.ok(ally.abilityLevels.some(r=>r>0));
  assert.deepEqual(g.player.inventory,[]);assert.deepEqual(g.player.abilityLevels,[0,0,0,0]);
  assert.equal(g.withActor(ally.id,actor=>{actor.gold=9999;return {ok:true};}).ok,false);
});

async function setup(t,options={}){
  const service=createCoopServer({root:process.cwd(),host:'127.0.0.1',port:0,autoTick:false,lobbyRate:100,...options});await service.listen();
  t.after(()=>service.close());
  async function connect(){
    const socket=new WebSocket(`ws://127.0.0.1:${service.server.address().port}/ws/coop`),messages=[],waiters=[];
    socket.on('error',()=>{});socket.on('message',data=>{
      const m=decodeMessage(data.toString());if(m.type==='snapshot')socket.send(JSON.stringify({type:'snapshotAck',frame:m.frame}));
      const index=waiters.findIndex(w=>w.match(m));if(index>=0)waiters.splice(index,1)[0].resolve(m);else messages.push(m);
    });
    const next=(type,predicate=()=>true)=>{
      const match=m=>m.type===type&&predicate(m),index=messages.findIndex(match);if(index>=0)return Promise.resolve(messages.splice(index,1)[0]);
      return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Waiting for ${type}`)),2500);waiters.push({match,resolve:m=>{clearTimeout(timer);resolve(m);}});});
    };
    await once(socket,'open');const send=m=>socket.send(JSON.stringify(m));send({type:'hello'});
    return {socket,send,next,messages,...await next('welcome')};
  }
  return {service,connect};
}

for(const n of [1,2])test(`an AI-enabled room starts with ${n} real sessions and retains real actor ownership`,async t=>{
  const f=await setup(t),host=await f.connect(),clients=[host];
  host.send({type:'create',name:'Human 1',heroId:ids[0],fillWithAI:true});const first=(await host.next('room')).room;
  assert.equal(first.fillWithAI,true);assert.equal(first.aiAllies.length,4);const code=first.code;
  if(n===2){const c=await f.connect();clients.push(c);c.send({type:'join',code,name:'Human 2',heroId:ids[1]});await c.next('room');}
  const preview=n===1?first:(await host.next('room',m=>m.room.members.length===n)).room;
  for(const c of clients)c.send({type:'ready',ready:true});await host.next('room',m=>m.room.members.length===n&&m.room.members.every(p=>p.ready));
  host.send({type:'start'});const states=await Promise.all(clients.map(c=>c.next('snapshot')));
  const g=f.service.manager.rooms.get(code).game,humans=g.entities.filter(e=>e.isHuman),allies=g.entities.filter(e=>e.kind==='hero'&&e.team===0&&!e.isHuman);
  assert.equal(humans.length,n);assert.equal(allies.length,5-n);assert.equal(f.service.manager.rooms.get(code).members.length,n);
  assert.deepEqual(allies.map(e=>e.heroId),preview.aiAllies.map(e=>e.heroId));
  for(let i=0;i<n;i++)assert.equal(states[i].state.entities.find(e=>e.id===states[i].playerId).clientId,clients[i].clientId);
  clients.at(-1).send({type:'command',id:1,action:'buy',args:['branch']});assert.equal((await clients.at(-1).next('ack')).result.ok,true);
  assert.deepEqual(g.entities.find(e=>e.clientId===clients.at(-1).clientId).inventory,['branch']);assert.ok(allies.every(e=>e.inventory.length===0));
});

test('room flags cannot change random matching or request stronger allied difficulty',async t=>{
  const f=await setup(t),c=await f.connect();
  c.send({type:'matchmake',name:'Human',heroId:'ogre_magi',fillWithAI:true});assert.equal((await c.next('error')).code,'INVALID_MATCHMAKING');
  c.send({type:'create',name:'Human',heroId:'ogre_magi',fillWithAI:true,allyDifficulty:'nightmare'});assert.equal((await c.next('error')).code,'INVALID_ROOM');
  assert.equal(f.service.manager.rooms.size,0);assert.equal(f.service.manager.matchQueue.length,0);
});

test('AI fill cannot label synthetic teammates as additional humans',async t=>{
  const f=await setup(t,{gameFactory:humans=>new CoopGame([...humans,...roster(5).slice(1)])}),host=await f.connect();
  host.send({type:'create',name:'One human',heroId:'ogre_magi',fillWithAI:true});await host.next('room');
  host.send({type:'ready',ready:true});await host.next('room',m=>m.room.members[0].ready);host.send({type:'start'});
  await host.next('end',m=>m.reason==='simulation_error');assert.equal(host.messages.some(m=>m.type==='snapshot'),false);
});

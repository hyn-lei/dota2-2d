import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const backend = await import('../server/coop-server.mjs').catch(() => ({}));
const codec = await import('../src/network-protocol.js').catch(() => ({}));
const heroes = ['juggernaut','crystal_maiden','windranger','axe','ogre_magi','kunkka'];

async function setup(t, options = {}) {
  assert.equal(typeof backend.createCoopServer, 'function', 'server factory must exist');
  const service = backend.createCoopServer({root:process.cwd(),host:'127.0.0.1',port:0,autoTick:false,...options});
  await service.listen();
  t.after(() => service.close());
  const base = `http://127.0.0.1:${service.server.address().port}`;
  return {service,base,connect:token => connect(base,token)};
}

async function connect(base, token) {
  const socket = new WebSocket(base.replace(/^http/,'ws')+'/ws/coop');
  const messages = [], waiters = [];
  socket.on('message', data => {
    const value = codec.decodeMessage(data.toString());
    if(value.type==='snapshot')socket.send(JSON.stringify({type:'snapshotAck',frame:value.frame}));
    const index = waiters.findIndex(w => w.predicate(value));
    if(index >= 0) waiters.splice(index,1)[0].resolve(value);
    else messages.push(value);
  });
  socket.on('error', () => {});
  const next = (type, predicate = () => true) => {
    const matches = value => value.type === type && predicate(value);
    const index = messages.findIndex(matches);
    if(index >= 0) return Promise.resolve(messages.splice(index,1)[0]);
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}; received ${messages.map(m=>m.type+':'+(m.code||m.room?.phase||'')).join(',')}`)),3000);
      waiters.push({predicate:matches,resolve:value => {clearTimeout(timer);resolve(value);}});
    });
  };
  await once(socket,'open');
  const send = value => socket.send(JSON.stringify(value));
  send({type:'hello',...(token ? {token} : {})});
  const greeting = await next(token ? 'welcome':'welcome');
  return {socket,send,next,messages,...greeting};
}

async function lobby(t, options={}) {
  const fixture = await setup(t,options), clients = [];
  for(let index=0;index<5;index++) {
    const client = await fixture.connect();clients.push(client);
    if(index===0) {
      client.send({type:'create',name:'Player 1',heroId:heroes[index]});
      fixture.code=(await client.next('room')).room.code;
    } else {
      client.send({type:'join',code:fixture.code,name:`Player ${index+1}`,heroId:heroes[index]});
      await client.next('room',m=>m.room.members.length===index+1);
    }
  }
  return {...fixture,clients};
}

async function start(fixture) {
  for(const client of fixture.clients) client.send({type:'ready',ready:true});
  await fixture.clients[0].next('room',m=>m.room.members.length===5&&m.room.members.every(p=>p.ready));
  fixture.clients[0].send({type:'start'});
  return fixture.clients[0].next('snapshot');
}

test('recursive network snapshots preserve official infinite timestamps', () => {
  assert.equal(typeof codec.encodeMessage,'function');
  const value={nested:[{until:Infinity,purchasedAt:-Infinity}],finite:2,notANumber:NaN};
  assert.deepEqual(codec.decodeMessage(codec.encodeMessage(value)),{nested:[{until:Infinity,purchasedAt:-Infinity}],finite:2,notANumber:null});
});
test('WebSocket negotiates compression for large repeated state snapshots',async t=>{
 const {connect}=await setup(t);const client=await connect();t.after(()=>client.socket.close());
 assert.match(client.socket.extensions,/permessage-deflate/);
});

test('HTTP serves health and only public frontend paths',async t=>{
  const {base}=await setup(t);
  const health=await fetch(base+'/healthz');assert.equal(health.status,200);assert.equal(await health.text(),'ok\n');
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await fetch(base+'/src/engine.js')).status,200);
  for(const path of ['/package.json','/.env','/server/coop-server.mjs','/scripts/server.mjs','/src/../package.json','/src/%2e%2e/package.json']) {
    assert.ok([403,404].includes((await fetch(base+path)).status),path);
  }
});

test('four ready members cannot start and fifth distinct connected member permits start',async t=>{
  const {service,connect}=await setup(t),clients=[];
  const host=await connect();clients.push(host);host.send({type:'create',name:'Host',heroId:heroes[0]});
  const code=(await host.next('room')).room.code;
  for(let i=1;i<4;i++){const c=await connect();clients.push(c);c.send({type:'join',code,name:`P${i}`,heroId:heroes[i]});await c.next('room');}
  for(const c of clients)c.send({type:'ready',ready:true});
  await host.next('room',m=>m.room.members.length===4&&m.room.members.every(p=>p.ready));
  host.send({type:'start'});assert.equal((await host.next('error')).code,'NOT_READY');
  assert.equal(service.manager.rooms.get(code).game,null);
  const fifth=await connect();clients.push(fifth);fifth.send({type:'join',code,name:'P5',heroId:heroes[4]});await fifth.next('room');fifth.send({type:'ready',ready:true});
  await host.next('room',m=>m.room.members.length===5&&m.room.members.every(p=>p.ready));host.send({type:'start'});
  const snapshot=await host.next('snapshot');
  const radiant=snapshot.state.entities.filter(e=>e.kind==='hero'&&e.team===0),dire=snapshot.state.entities.filter(e=>e.kind==='hero'&&e.team===1);
  assert.equal(radiant.length,5);assert.ok(radiant.every(e=>e.isHuman&&e.isPlayer&&e.controller==='human'));
  assert.ok(radiant.every(e=>e.skillPoints===1&&e.abilityLevels.every(n=>n===0)));
  assert.equal(dire.length,5);assert.ok(dire.every(e=>e.controller==='ai'));
  assert.equal(service.manager.rooms.get(code).game.difficulty,'nightmare');
});

test('duplicate heroes, sixth member, and an active token cannot occupy another seat',async t=>{
  const fixture=await lobby(t),host=fixture.clients[0];
  host.send({type:'chooseHero',heroId:heroes[1]});assert.equal((await host.next('error')).code,'HERO_TAKEN');
  const sixth=await fixture.connect();sixth.send({type:'join',code:fixture.code,name:'Sixth',heroId:heroes[5]});assert.equal((await sixth.next('error')).code,'ROOM_FULL');
  const duplicate=new WebSocket(fixture.base.replace(/^http/,'ws')+'/ws/coop');
  const failure=once(duplicate,'message');await once(duplicate,'open');duplicate.send(JSON.stringify({type:'hello',token:host.token}));
  assert.equal(JSON.parse((await failure)[0].toString()).code,'TOKEN_ACTIVE');
  duplicate.terminate();assert.equal(fixture.service.manager.rooms.get(fixture.code).members.length,5);
});

test('commands mutate only the bound human, enforce item UIDs and increasing IDs',async t=>{
  const fixture=await lobby(t),snapshot=await start(fixture),[host,second]=fixture.clients;
  host.send({type:'command',id:1,action:'learnAbility',args:[0]});assert.equal((await host.next('ack')).result.ok,true);
  second.send({type:'command',id:1,action:'learnAbility',args:[1]});assert.equal((await second.next('ack')).result.ok,true);
  host.send({type:'command',id:2,action:'buy',args:['branch']});assert.equal((await host.next('ack')).result.ok,true);
  const game=fixture.service.manager.rooms.get(fixture.code).game,p=game.entities.find(e=>e.clientId===host.clientId),other=game.entities.find(e=>e.clientId===second.clientId);
  assert.equal(p.abilityLevels[0],1);assert.equal(other.abilityLevels[0],0);assert.equal(other.abilityLevels[1],1);
  assert.deepEqual(other.inventory,[]);const uid=p.inventoryMeta[0].uid;
  host.send({type:'command',id:3,action:'moveItem',args:['inventory',0,'backpack',0],slotGuards:[{area:'inventory',index:0,uid:'wrong'},{area:'backpack',index:0,uid:null}]});
  assert.equal((await host.next('ack')).result.ok,false);assert.equal(p.inventoryMeta[0].uid,uid);
  host.send({type:'command',id:4,action:'moveItem',args:['inventory',0,'backpack',0],slotGuards:[{area:'inventory',index:0,uid},{area:'backpack',index:0,uid:null}]});
  assert.equal((await host.next('ack')).result.ok,true);assert.equal(p.backpackMeta[0].uid,uid);
  host.send({type:'command',id:4,action:'buy',args:['branch']});assert.equal((await host.next('ack')).result.ok,false);
  fixture.service.manager.broadcastSnapshot(fixture.service.manager.rooms.get(fixture.code));
  const next=await second.next('snapshot',m=>m.frame>snapshot.frame);assert.equal(next.state.entities.find(e=>e.id===p.id).backpackMeta[0].uid,uid);
});

test('disconnect clears held inputs and pauses; reconnect restores hero and command sequence',async t=>{
  const fixture=await lobby(t),snapshot=await start(fixture),[host,second]=fixture.clients;
  host.send({type:'command',id:1,action:'setMovement',args:[1,0]});await host.next('ack');
  second.send({type:'command',id:1,action:'setMovement',args:[0,1]});await second.next('ack');
  host.socket.terminate();await second.next('room',m=>m.room.phase==='reconnecting');
  const room=fixture.service.manager.rooms.get(fixture.code),time=room.game.time;
  fixture.service.manager.tick();assert.equal(room.game.time,time);assert.equal(room.game.paused,true);
  assert.ok(room.game.entities.filter(e=>e.isHuman).every(e=>!e.movementInput.x&&!e.movementInput.y));
  const restored=await fixture.connect(host.token);assert.equal(restored.clientId,host.clientId);assert.equal(restored.lastCommandId,1);
  const resumed=await restored.next('snapshot');assert.equal(resumed.playerId,snapshot.playerId);assert.equal(room.game.paused,false);
  restored.send({type:'command',id:2,action:'learnAbility',args:[0]});assert.equal((await restored.next('ack')).result.ok,true);
});

test('disconnect timeout ends the match without substituting a bot',async t=>{
  const fixture=await lobby(t,{reconnectMs:20}),snapshot=await start(fixture),[host,second]=fixture.clients;
  host.socket.terminate();await second.next('room',m=>m.room.phase==='reconnecting');
  await new Promise(resolve=>setTimeout(resolve,25));fixture.service.manager.tick();
  assert.equal((await second.next('end')).reason,'reconnect_timeout');
  const room=fixture.service.manager.rooms.get(fixture.code);assert.equal(room.phase,'ended');
  assert.equal(room.game.entities.filter(e=>e.kind==='hero'&&e.team===0&&e.isHuman).length,5);
  assert.equal(room.game.entities.find(e=>e.id===snapshot.playerId).controller,'human');
});

test('invalid action, forged actor, nonfinite point and courier cargo mutations are rejected',async t=>{
  const fixture=await lobby(t);await start(fixture);const host=fixture.clients[0];
  const attempts=[{action:'damage',args:[]},{action:'moveTo',args:[1,2],actorId:'forged'},{action:'moveTo',args:[{$coopNumber:'Infinity'},2]},{action:'moveItem',args:['cargo',0,'inventory',0]},{action:'setMovement',args:[100,0]},{action:'cast',args:[0,{x:1,y:2,hp:999}]}];
  for(let i=0;i<attempts.length;i++){host.send({type:'command',id:i+1,...attempts[i]});assert.equal((await host.next('ack')).result.ok,false);}
});

test('lobby disconnect releases the seat and transfers host, without automatic readiness',async t=>{
  const fixture=await lobby(t),[host,second]=fixture.clients;
  host.socket.terminate();const room=(await second.next('room',m=>m.room.members.length===4&&m.room.hostId===second.clientId)).room;
  assert.equal(room.hostId,second.clientId);assert.ok(room.members.every(m=>!m.ready));
  const replacement=await fixture.connect();replacement.send({type:'join',code:fixture.code,name:'Replacement',heroId:heroes[0]});
  assert.equal((await replacement.next('room')).room.members.length,5);
  const returning=await fixture.connect(host.token);assert.equal(returning.clientId,host.clientId);
  assert.equal(fixture.service.manager.sessions.get(host.token).roomCode,null);
});

test('active items and recall require the actor slot UID, and snapshots preserve nested statuses',async t=>{
  const fixture=await lobby(t);await start(fixture);const host=fixture.clients[0],room=fixture.service.manager.rooms.get(fixture.code);
  host.send({type:'command',id:1,action:'recall',args:[]});assert.equal((await host.next('ack')).result.ok,false);
  const player=room.game.entities.find(e=>e.clientId===host.clientId),uid=player.tpMeta[0].uid;
  host.send({type:'command',id:2,action:'useItem',args:[0,null,'tp'],slotGuards:[{area:'tp',index:0,uid:'stale'}]});assert.equal((await host.next('ack')).result.ok,false);
  assert.equal(player.tpMeta[0].uid,uid);
  player.statuses.test={until:Infinity,nested:{amount:4}};player.navPath=[{x:1,y:2}];player.botState={secret:'private'};
  room.game.cutTrees=new Map([[2,Infinity]]);room.game.plantedTrees=[{x:2,y:3,until:Infinity}];room.game.shopStocks={'0:branch':{available:3,nextAt:Infinity}};
  room.game.pendingSpells=[{type:'shackle',sourceId:player.id,targetId:'target',landAt:5,skill:{secret:'private'}}];
  fixture.service.manager.broadcastSnapshot(room);const snapshot=await host.next('snapshot',m=>m.state.cutTrees.length===1),published=snapshot.state.entities.find(e=>e.id===player.id);
  assert.equal(published.statuses.test.until,Infinity);assert.equal(published.tpMeta[0].purchasedAt,-Infinity);assert.equal(published.navPath,undefined);assert.equal(published.botState,undefined);
  assert.deepEqual(snapshot.state.cutTrees,[[2,Infinity]]);assert.equal(snapshot.state.shopStocks['0:branch'].nextAt,Infinity);
  assert.equal(snapshot.state.pendingSpells[0].skill,undefined);
});

test('leaving a playing match aborts it and rejects all remaining commands',async t=>{
  const fixture=await lobby(t);await start(fixture);const [host,second]=fixture.clients;
  host.send({type:'leave'});assert.equal((await second.next('end')).reason,'player_left');
  second.send({type:'command',id:1,action:'buy',args:['branch']});assert.equal((await second.next('ack')).result.ok,false);
  const newcomer=await fixture.connect();newcomer.send({type:'join',code:fixture.code,name:'New',heroId:heroes[0]});assert.equal((await newcomer.next('error')).code,'ROOM_STARTED');
});

test('bounded incoming frames disconnect an offender while another room remains responsive',async t=>{
  const fixture=await setup(t,{maxMessageBytes:256}),good=await fixture.connect(),bad=await fixture.connect();
  const closed=once(bad.socket,'close');bad.socket.send('x'.repeat(257));assert.equal((await closed)[0],1009);
  good.send({type:'ping',sentAt:7});assert.equal((await good.next('pong')).sentAt,7);
});

test('connection and room bounds reject new traffic without displacing existing sessions',async t=>{
  const fixture=await setup(t,{maxConnections:2,maxRooms:1}),first=await fixture.connect(),second=await fixture.connect();
  first.send({type:'create',name:'One',heroId:heroes[0]});await first.next('room');
  second.send({type:'create',name:'Two',heroId:heroes[1]});assert.equal((await second.next('error')).code,'SERVER_FULL');
  const third=new WebSocket(fixture.base.replace(/^http/,'ws')+'/ws/coop');third.on('error',()=>{});
  const failure=await once(third,'unexpected-response');assert.equal(failure[1].statusCode,503);third.terminate();
  first.send({type:'ping',sentAt:9});assert.equal((await first.next('pong')).sentAt,9);
});

test('actor context is restored when a command throws',async t=>{
  const fixture=await lobby(t);await start(fixture);const game=fixture.service.manager.rooms.get(fixture.code).game,heroes=game.entities.filter(e=>e.isHuman),first=game.player;
  assert.throws(()=>game.withActor(heroes[1].id,()=>{assert.equal(game.player,heroes[1]);throw new Error('fixture');}),/fixture/);
  assert.equal(game.player,first);assert.equal(game.withActor('invalid',()=>assert.fail()).ok,false);
});
test('returning after a terminated match clears the old seat without replaying its snapshot',async t=>{
 const fixture=await lobby(t);await start(fixture);const prior=fixture.clients[1];fixture.clients[0].send({type:'leave'});await prior.next('end');
 prior.socket.close();await once(prior.socket,'close');const resumed=await fixture.connect(prior.token);t.after(()=>resumed.socket.close());
 await resumed.next('end');assert.equal(fixture.service.manager.sessions.get(prior.token).roomCode,null);
 assert.equal(resumed.messages.some(m=>m.type==='snapshot'),false);
 resumed.send({type:'create',name:'New match',heroId:'ogre_magi'});const fresh=await resumed.next('room',m=>m.room.phase==='lobby');assert.equal(fresh.room.members.length,1);
});

test('public directory symlinks cannot reveal private files inside the deployment root',async t=>{
  const root=await mkdtemp(join(tmpdir(),'coop-public-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'src'));await mkdir(join(root,'server'));await writeFile(join(root,'index.html'),'<html>public</html>');
  await writeFile(join(root,'server','private.mjs'),'private server material');
  await symlink(join(root,'server'),join(root,'src','private-link'),process.platform==='win32'?'junction':'dir');
  const {base}=await setup(t,{root});
  assert.ok([403,404].includes((await fetch(base+'/src/private-link/private.mjs')).status));
});

test('server heartbeat detects half-open sockets and releases their lobby seat',async t=>{
  const fixture=await setup(t,{heartbeatMs:10}),host=await fixture.connect();
  host.send({type:'create',name:'Heartbeat',heroId:heroes[0]});const code=(await host.next('room')).room.code;
  const serverClosed=once(fixture.service.manager.sessions.get(host.token).socket,'close');
  host.socket._autoPong=false;await Promise.all([once(host.socket,'close'),serverClosed]);assert.equal(fixture.service.manager.rooms.has(code),false);
});

test('command rate bounds leave gold unchanged for rejected messages',async t=>{
  const fixture=await lobby(t,{commandRate:1});await start(fixture);const host=fixture.clients[0],game=fixture.service.manager.rooms.get(fixture.code).game;
  for(let id=1;id<=2;id++){host.send({type:'command',id,action:'buy',args:['branch']});assert.equal((await host.next('ack')).result.ok,true);}
  const gold=game.entities.find(e=>e.clientId===host.clientId).gold;
  host.send({type:'command',id:3,action:'buy',args:['branch']});assert.equal((await host.next('ack')).result.ok,false);assert.equal(game.entities.find(e=>e.clientId===host.clientId).gold,gold);
});

test('authoritative movement, spell damage and statuses appear in every player snapshot',async t=>{
  const fixture=await lobby(t);await start(fixture);const host=fixture.clients[0],room=fixture.service.manager.rooms.get(fixture.code),game=room.game;
  const caster=game.entities.find(e=>e.clientId===fixture.clients[1].clientId),enemy=game.entities.find(e=>e.kind==='hero'&&e.team===1);
  game.nextWave=game.nextNeutralSpawn=game.roshanRespawnAt=Infinity;
  Object.assign(caster,{x:10000,y:10000});Object.assign(enemy,{x:10100,y:10000});
  const client=fixture.clients[1];client.send({type:'command',id:1,action:'learnAbility',args:[1]});assert.equal((await client.next('ack')).result.ok,true);
  const oldHp=enemy.hp;client.send({type:'command',id:2,action:'cast',args:[1,{x:enemy.x,y:enemy.y}]});assert.equal((await client.next('ack')).result.ok,true);
  game.step(.35);assert.ok(enemy.hp<oldHp);assert.ok(Object.values(enemy.statuses).some(s=>s.rooted||s.disarmed));
  fixture.service.manager.broadcastSnapshot(room);const state=(await host.next('snapshot',m=>m.state.time>=.35)).state;
  assert.equal(state.entities.find(e=>e.id===enemy.id).hp,enemy.hp);assert.deepEqual(state.entities.find(e=>e.id===enemy.id).statuses,enemy.statuses);
  client.send({type:'command',id:3,action:'setMovement',args:[1,0]});assert.equal((await client.next('ack')).result.ok,true);
  const x=caster.x;game.step(.1);assert.ok(caster.x>x);
});

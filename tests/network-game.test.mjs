import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { NetworkGame } from '../src/network-game.js';
import { effectIsActive } from '../src/combat-visuals.js';
const roster=['juggernaut','crystal_maiden','windranger','axe','ogre_magi'].map((heroId,i)=>({heroId,name:`P${i}`,clientId:`c${i}`}));
function setup(){const server=new Game({humanHeroes:roster,difficulty:'nightmare'}),humans=server.entities.filter(e=>e.isHuman);let resolve;const sent=[];
 const request=(action,args,slotGuards)=>{sent.push({action,args,slotGuards});return new Promise(r=>resolve=r);};
 const state={time:0,status:'playing',paused:false,entities:structuredClone(server.entities),effects:[],pendingSpells:[],feed:[],score:[0,0],camps:server.camps,cutTrees:[],shopStocks:{}};
 return {server,humans,state,sent,client:new NetworkGame({state,playerId:humans[1].id,request}),ack:result=>resolve(result)};
}
test('network rendering selects its own human without running local simulation',()=>{
 const {client,humans}=setup();assert.equal(client.player.id,humans[1].id);assert.equal(client.entities.filter(e=>e.isPlayer).length,1);
 assert.equal(client.entities.filter(e=>e.isHuman).length,5);const time=client.time,positions=client.entities.map(e=>[e.x,e.y]);client.step(10);assert.equal(client.time,time);assert.deepEqual(client.entities.map(e=>[e.x,e.y]),positions);
});
test('purchase success waits for the server and never changes local economy optimistically',async()=>{
 const {client,sent,ack}=setup(),gold=client.player.gold;let finished=false;const purchase=client.buy('boots').then(r=>{finished=true;return r;});
 await Promise.resolve();assert.equal(finished,false);assert.equal(client.player.gold,gold);assert.equal(client.player.inventory.length,0);assert.equal(sent[0].action,'buy');
 ack({ok:false,reason:'金币不足'});assert.equal((await purchase).ok,false);assert.equal(client.player.gold,gold);
});
test('item commands identify both slots by UID and active use identifies its source',async()=>{
 const {client,sent,ack}=setup();client.player.inventory=['boots'];client.player.inventoryMeta=[{uid:'own:boots',itemId:'boots'}];
 const moved=client.moveItem('inventory',0,'backpack',0);assert.deepEqual(sent[0].slotGuards,[{area:'inventory',index:0,uid:'own:boots'},{area:'backpack',index:0,uid:null}]);ack({ok:true});await moved;
 const use=client.useItem(0,{x:10000,y:10000},'inventory');assert.equal(sent[1].action,'useItem');assert.equal(sent[1].slotGuards[0].uid,'own:boots');ack({ok:false,reason:'这是被动物品'});await use;
});
test('snapshots preserve inspected selection while applying only authoritative state',()=>{
 const {client,state,humans}=setup();client.selectEntity(humans[2].id);state.entities.find(e=>e.id===humans[1].id).gold=123;
 client.applySnapshot(state);assert.equal(client.player.gold,123);assert.equal(client.selected.id,humans[2].id);assert.equal(client.entities.filter(e=>e.isPlayer).length,1);
});
test('a serialized shackle keeps its live tether but never attaches to a replacement stun',()=>{
 const stun={id:'stun',sourceId:'caster',startedAt:1,until:4};
 const state=JSON.parse(JSON.stringify({time:2,entities:[{id:'target',statuses:{stun}}],effects:[{visual:'shackleLink',targetId:'target',targetStun:stun}]}));
 assert.equal(effectIsActive(state.effects[0],state),true);
 state.entities[0].statuses.stun={...stun,sourceId:'other',startedAt:2};assert.equal(effectIsActive(state.effects[0],state),false);
});

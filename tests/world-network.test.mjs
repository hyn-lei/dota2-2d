import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {NetworkGame} from '../src/network-game.js';
import {executeCommand} from '../server/commands.mjs';
import {snapshotState} from '../server/snapshot.mjs';
import {serializeMatch,restoreMatch} from '../src/game-save.js';
import {createMeta} from '../src/inventory.js';
import {CoopGame} from '../server/coop-game.mjs';

const command=(action,args=[],slotGuards=[])=>({type:'command',id:1,action,args,slotGuards});
test('7.42 world rewards, glyph charges and map objectives survive local save and public snapshots',()=>{
 const g=new Game({hero:'chaos_knight'});g.glyphStates[0].rechargeAt=[360];g.glyphStates[0].cooldownUntil=7;g.tormentorDeaths=2;g.tormentorRespawnAt=1234;g.roshanDeaths=3;
 g.worldObjectives[0].collectedPeriod=2;g.madstoneDrops=[{id:'stone:1',x:100,y:100,amount:3,expiresAt:20}];
 const restored=restoreMatch(JSON.parse(serializeMatch(g))),snapshot=snapshotState(g);
 for(const projected of [restored,snapshot]){
  assert.equal(projected.tormentorDeaths,2);assert.equal(projected.tormentorRespawnAt,1234);assert.equal(projected.roshanDeaths,3);
  assert.deepEqual(projected.glyphStates,g.glyphStates);assert.equal(projected.worldObjectives[0].collectedPeriod,2);assert.deepEqual(projected.madstoneDrops,g.madstoneDrops);
 }
});
test('neutral crafting commands charge the bound actor and reject stale neutral item uses',()=>{
 const g=new CoopGame([{heroId:'chaos_knight',name:'CK',clientId:'ck:1'}],{fillWithAI:true}),p=g.player;p.madstone=6;
 const craft=g.neutralCraftState(p),result=executeCommand(g,p.id,command('craftNeutral',[craft.artifacts[0],craft.enchantments[0]]));
 assert.equal(result.ok,true);assert.equal(p.madstone,0);assert.equal(p.neutralTier,1);
 p.neutralItem='pogo_stick';p.neutralItemMeta=createMeta(p,'pogo_stick');g._refreshHero(p);
 const stale=executeCommand(g,p.id,command('useItem',[0,{x:p.x,y:p.y},'neutral'],[{area:'neutral',index:0,uid:'stale:1'}]));
 assert.equal(stale.ok,false);assert.match(stale.reason,/物品栏已更新/);
 const fresh=executeCommand(g,p.id,command('useItem',[0,{x:p.x,y:p.y},'neutral'],[{area:'neutral',index:0,uid:p.neutralItemMeta.uid}]));
 assert.equal(fresh.ok,true);
 assert.equal(executeCommand(g,p.id,command('moveItem',['neutral',0,'inventory',0])).ok,false);
});
test('network world actions request an ACK and use singular neutral item metadata guards',async()=>{
 const server=new Game({hero:'chaos_knight'}),state=snapshotState(server),sent=[];
 const client=new NetworkGame({state,playerId:server.player.id,request:(action,args,slotGuards)=>{sent.push({action,args,slotGuards});return Promise.resolve({ok:true});}});
 client.player.neutralItem='pogo_stick';client.player.neutralItemMeta={uid:'neutral:1',ownerId:client.player.id};
 await client.craftNeutral('spark_of_courage','enhancement_quickened');await client.useGlyph();await client.interactObjective('gate:1');await client.useItem(0,{x:100,y:100},'neutral');
 assert.deepEqual(sent.map(v=>v.action),['craftNeutral','useGlyph','interactObjective','useItem']);
 assert.deepEqual(sent.at(-1).slotGuards,[{area:'neutral',index:0,uid:'neutral:1'}]);
});

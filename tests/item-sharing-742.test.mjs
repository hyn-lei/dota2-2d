import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import * as Inventory from '../src/inventory.js';
import {tickUnit,useItem} from '../src/item-runtime.js';
import {tickCouriers} from '../src/courier.js';
import {CoopGame} from '../server/coop-game.mjs';
import {executeCommand} from '../server/commands.mjs';

function setup(){
 const g=new Game({hero:'crystal_maiden',seed:21}),hero=g.player;
 const ally=g.entities.find(e=>e.kind==='hero'&&e.team===hero.team&&e!==hero);
 const enemy=g.entities.find(e=>e.kind==='hero'&&e.team!==hero.team);
 for(const unit of [ally,enemy])Object.assign(unit,{x:hero.x+64,y:hero.y,inventory:[],inventoryMeta:[],backpack:[],backpackMeta:[]});
 g.entities=[hero,ally,enemy];hero.gold=10000;return {g,hero,ally,enemy};
}

test('a teammate can use a fully shared consumable while unauthorized holders cannot use or sell',()=>{
 const {g,hero,ally,enemy}=setup();
 assert.equal(g.buy('dust').ok,true);
 const ownedDust=hero.inventoryMeta[0].uid;
 const drop=g.dropItem('inventory',0);
 assert.equal(Inventory.pickupItem(g,ally,drop.entity.id).ok,true);
 assert.equal(ally.inventoryMeta[0].uid,ownedDust);
 assert.equal(ally.inventoryMeta[0].ownerId,hero.id);
 assert.equal(Inventory.sellItem(g,ally,'inventory',0).ok,false);
 assert.equal(useItem(g,ally,0,ally).ok,true);
 assert.equal(ally.inventory.length,0);

 assert.equal(g.buy('smoke_of_deceit').ok,true);
 const stolen=g.dropItem('inventory',0);
 assert.equal(Inventory.pickupItem(g,enemy,stolen.entity.id).ok,true);
 assert.equal(useItem(g,enemy,0,enemy).ok,false);
 assert.equal(enemy.inventory[0],'smoke_of_deceit');

 assert.equal(Inventory.giveItem(g,hero,'heavens_halberd').ok,true);
 const privateItem=g.dropItem('inventory',0);
 assert.equal(Inventory.pickupItem(g,ally,privateItem.entity.id).ok,true);
 assert.equal(useItem(g,ally,0,enemy).ok,false);
 assert.equal(ally.inventory[0],'heavens_halberd');
});

test('a combined ward switches, shares one charge, plants one charge, and splits the remaining owned wards',()=>{
 const {g,hero,ally}=setup();
 for(const id of ['ward_observer','ward_sentry','ward_observer','ward_sentry','ward_sentry'])assert.equal(g.buy(id).ok,true);
 const index=hero.inventory.indexOf('ward_dispenser');
 assert.deepEqual(hero.inventory,['ward_dispenser']);
 assert.equal(hero.inventoryMeta[index].mode,'observer');
 assert.equal(hero.inventoryMeta[index].charges,5);
 assert.equal(g.disassembleItem('inventory',index).ok,false);

 Object.assign(hero,{x:9856,y:9792});Object.assign(ally,{x:9856,y:9856});
 assert.equal(g.useItem(index,hero).ok,true);
 assert.equal(hero.inventoryMeta[index].mode,'sentry');
 assert.equal(g.useItem(index,{x:ally.x,y:ally.y,share:true}).ok,true);
 assert.equal(ally.inventory[0],'ward_sentry');
 assert.equal(ally.inventoryMeta[0].charges,1);
 assert.equal(ally.inventoryMeta[0].ownerId,hero.id);
 assert.equal(hero.inventoryMeta[index].charges,4);
 g.time=2;
 tickUnit(g,hero,2);
 assert.equal(g.useItem(index,{x:9856,y:10048}).ok,true);
 assert.ok(g.entities.some(e=>e.kind==='ward'&&e.wardType==='sentry'));
 assert.equal(hero.inventoryMeta[index].charges,3);
 g.time=10;
 assert.equal(g.disassembleItem('inventory',index).ok,true);
 assert.deepEqual(Inventory.itemEntries(hero,['inventory']).map(e=>[e.id,e.meta.charges,e.meta.ownerId]).sort(),
  [['ward_observer',2,hero.id],['ward_sentry',1,hero.id]]);
});

test('quickbuy reserves a ward carried by the courier and completes exactly once on delivery',()=>{
 const {g,hero}=setup(),courier=g.courier;
 Object.assign(hero,{x:9856,y:9792});
 assert.equal(g.queueItem('ward_dispenser').ok,true);
 assert.equal(g.buyQuick().ok,true);
 assert.equal(hero.stash[0],'ward_sentry');
 assert.equal(g.courierCommand('deliver').ok,true);
 tickCouriers(g,0);
 assert.equal(courier.cargo[0],'ward_sentry');
 const gold=hero.gold;
 assert.equal(g.buyQuick().ok,true);
 assert.equal(hero.stash[0],'ward_observer');
 assert.equal(hero.gold,gold);
 assert.equal(g.buyQuick().ok,false);
 assert.equal(courier.cargoMeta[0].charges,1);
 Object.assign(courier,{x:hero.x,y:hero.y});
 tickCouriers(g,0);
 assert.deepEqual(hero.quickbuy,['ward_dispenser']);
 assert.ok(hero.inventory.includes('ward_sentry'));
 Object.assign(hero,g.navigation.nearestWalkable({x:3008,y:17344}));
 assert.equal(g.collectStash().ok,true);
 assert.deepEqual(hero.inventory,['ward_dispenser']);
 assert.deepEqual(hero.quickbuy,[]);
 assert.equal(hero.inventoryMeta[0].charges,2);
});

test('the authoritative item command permits earned shared charges and rejects a stale slot UID',()=>{
 const heroes=['crystal_maiden','axe','kunkka','windranger','ogre_magi'].map((heroId,index)=>({heroId,clientId:'p'+index,name:heroId}));
 const g=new CoopGame(heroes),source=g.entities.find(e=>e.clientId==='p0'),target=g.entities.find(e=>e.clientId==='p1');
 Object.assign(source,{x:9856,y:9792});Object.assign(target,{x:9856,y:9984});
 assert.equal(Inventory.giveItem(g,source,'ward_observer').ok,true);
 const act=(actor,uid,point)=>executeCommand(g,actor.id,{type:'command',id:1,action:'useItem',args:[0,point,'inventory'],slotGuards:[{area:'inventory',index:0,uid}]});
 assert.equal(act(source,source.inventoryMeta[0].uid,{x:target.x,y:target.y,share:true}).ok,true);
 assert.equal(target.inventoryMeta[0].ownerId,source.id);
 assert.equal(act(target,'stale',{x:9856,y:10048}).ok,false);
 assert.equal(target.inventoryMeta[0].charges,1);
 assert.equal(act(target,target.inventoryMeta[0].uid,{x:9856,y:10048}).ok,true);
 assert.equal(target.inventory.length,0);
 assert.ok(g.entities.some(entity=>entity.wardType==='observer'&&entity.ownerId===target.id));
});

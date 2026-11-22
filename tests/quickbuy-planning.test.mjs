import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { BASES } from '../src/map-data.js';
import * as Inventory from '../src/inventory.js';
import * as Courier from '../src/courier.js';

function setup(atBase=false){
 const g=new Game({hero:'crystal_maiden'}),p=g.player;
 g.entities=g.entities.filter(e=>e.isPlayer||e.ownerId===p.id);
 g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;p.gold=20000;
 Object.assign(p,atBase?BASES[p.team]:{x:BASES[p.team].x+600,y:BASES[p.team].y-1600});
 return {g,p,c:g.courier};
}
const plan=g=>Inventory.quickbuyPlan(g,g.player);
const carried=(g,id)=>[...Inventory.itemEntries(g.player),...Inventory.itemEntries(g.courier)].filter(e=>e.id===id&&e.meta.ownerId===g.player.id);

test('quickbuy does not repurchase carried materials after leaving the shop',()=>{
 const {g,p}=setup(true);p.gold=155;g.queueItem('bracer');assert.equal(g.buyQuick().ok,true);
 const uid=p.inventoryMeta[0].uid;Object.assign(p,{x:10400,y:10400,gold:1000});
 const result=g.buyQuick();assert.equal(result.itemId,'gauntlets');assert.equal(result.cost,140);
 assert.deepEqual(p.stash,['gauntlets']);assert.equal(carried(g,'circlet').length,1);
 assert.equal(carried(g,'circlet')[0].meta.uid,uid);assert.deepEqual(p.quickbuy,['bracer']);
 assert.deepEqual(plan(g).missing,['recipe_bracer']);
});

test('quickbuy does not repurchase materials collected by the courier',()=>{
 const {g,p,c}=setup();p.gold=155;g.queueItem('bracer');assert.equal(g.buyQuick().ok,true);
 const uid=p.stashMeta[0].uid;g.courierCommand('deliver');Courier.tickCouriers(g,.1);p.gold=155;
 assert.deepEqual(c.cargo,['circlet']);const result=g.buyQuick();
 assert.equal(result.itemId,'gauntlets');assert.equal(result.cost,140);
 assert.deepEqual(p.stash,['gauntlets']);assert.equal(carried(g,'circlet').length,1);
 assert.equal(c.cargoMeta[0].uid,uid);assert.deepEqual(plan(g).missing,['recipe_bracer']);
});

test('quickbuy waits without spending when all materials are purchased but split across storage',()=>{
 const {g,p,c}=setup();p.gold=155;g.queueItem('bracer');g.buyQuick();g.courierCommand('deliver');Courier.tickCouriers(g,.1);
 p.gold=1000;g.buy('gauntlets');g.buy('recipe_bracer');
 const before=structuredClone({gold:p.gold,stash:p.stash,cargo:c.cargo,queue:p.quickbuy});
 const result=g.buyQuick();assert.equal(result.ok,false);
 assert.deepEqual({gold:p.gold,stash:p.stash,cargo:c.cargo,queue:p.quickbuy},before);
 assert.deepEqual(plan(g).missing,[]);
});

test('quickbuy reserves one instance per repeated recipe component',()=>{
 const {g}=setup(true);g.buy('branch');g.queueItem('magic_wand');
 const {targets,missing}=plan(g);assert.deepEqual(missing,['magic_stick','branch','recipe_magic_wand']);
 assert.equal(targets[0].consumed.length,1);assert.equal(targets[0].consumed[0].id,'branch');assert.equal(targets[0].cost,405);
});

test('quickbuy allocates shared materials to queued targets in order',()=>{
 const {g,p}=setup(true);g.buy('circlet');g.queueItem('bracer');g.queueItem('wraith_band',true);
 const {targets,missing}=plan(g);
 assert.deepEqual(targets.map(t=>t.missing),[['gauntlets','recipe_bracer'],['circlet','slippers','recipe_wraith_band']]);
 assert.deepEqual(missing,['gauntlets','recipe_bracer','circlet','slippers','recipe_wraith_band']);
 assert.equal(targets[0].consumed[0].meta.uid,p.inventoryMeta[0].uid);assert.deepEqual(targets[1].consumed,[]);
});

test('quickbuy preserves explicitly queued additional copies of an owned item',()=>{
 const {g,p}=setup(true);g.buy('bracer');g.queueItem('bracer');g.queueItem('bracer',true);
 assert.deepEqual(plan(g).targets.map(t=>t.missing),[['circlet','gauntlets','recipe_bracer'],['circlet','gauntlets','recipe_bracer']]);
 assert.equal(g.buyQuick().cost,505);assert.deepEqual(p.quickbuy,['bracer']);
 assert.deepEqual(plan(g).missing,['circlet','gauntlets','recipe_bracer']);
 assert.equal(g.buyQuick().cost,505);assert.deepEqual(p.quickbuy,[]);assert.equal(p.inventory.filter(id=>id==='bracer').length,3);
});

test('quickbuy uses an alternative recipe material in courier cargo',()=>{
 const {g,p,c}=setup(true);g.buy('boots');g.buy('robe');
 assert.equal(Inventory.transferItem(g,p,'inventory',1,c,['cargo'],true).ok,true);g.queueItem('power_treads');p.gold=450;
 assert.equal(g.buyQuick().itemId,'gloves');p.gold=450;
 const before=structuredClone({gold:p.gold,inventory:p.inventory,cargo:c.cargo});
 assert.equal(g.buyQuick().ok,false);assert.deepEqual({gold:p.gold,inventory:p.inventory,cargo:c.cargo},before);
 assert.deepEqual(plan(g).missing,[]);assert.deepEqual(c.cargo,['robe']);
});

test('quickbuy excludes foreign materials and cargo belonging to another courier',()=>{
 const {g,p,c}=setup(true);g.buy('circlet');p.inventoryMeta[0].ownerId='other-hero';
 g.buy('gauntlets');Inventory.transferItem(g,p,'inventory',1,c,['cargo'],true);c.cargoMeta[0].ownerId='other-hero';
 const other=g._unit('courier',p.team,p.x,p.y,{ownerId:'other-hero',cargo:['recipe_bracer'],cargoMeta:[],quickbuy:[]});
 Inventory.ensureInventory(other);other.cargoMeta[0].ownerId=p.id;g.entities.push(other);g.queueItem('bracer');
 assert.deepEqual(plan(g).missing,['circlet','gauntlets','recipe_bracer']);assert.deepEqual(plan(g).targets[0].consumed,[]);
});

test('quickbuy excludes locked materials until their combine lock is released',()=>{
 const {g,p}=setup(true);g.buy('circlet');g.queueItem('bracer');Inventory.setCombineLock(g,p,'inventory',0,true);
 assert.deepEqual(plan(g).missing,['circlet','gauntlets','recipe_bracer']);
 Inventory.setCombineLock(g,p,'inventory',0,false);assert.deepEqual(plan(g).missing,['gauntlets','recipe_bracer']);
});

test('quickbuy restores material needs after selling or dropping a reserved item',()=>{
 const {g,p}=setup(true);g.buy('circlet');g.queueItem('bracer');assert.deepEqual(plan(g).missing,['gauntlets','recipe_bracer']);
 assert.equal(g.sellItem('inventory',0).ok,true);assert.deepEqual(plan(g).missing,['circlet','gauntlets','recipe_bracer']);
 g.buy('circlet');assert.deepEqual(plan(g).missing,['gauntlets','recipe_bracer']);
 assert.equal(Inventory.dropItem(g,p,'inventory',0).ok,true);assert.deepEqual(plan(g).missing,['circlet','gauntlets','recipe_bracer']);
});

test('courier assembly completes exactly one duplicate quickbuy target before delivery',()=>{
 const {g,p,c}=setup();g.queueItem('moon_shard');g.queueItem('moon_shard',true);Object.assign(c,Inventory.SECRET_SHOPS[0]);
 assert.equal(g.buyWithCourier('hyperstone').ok,true);assert.deepEqual(p.quickbuy,['moon_shard','moon_shard']);
 assert.equal(g.buyWithCourier('hyperstone').ok,true);assert.deepEqual(c.cargo,['moon_shard']);assert.deepEqual(p.quickbuy,['moon_shard']);
 assert.deepEqual(plan(g).missing,['hyperstone','hyperstone']);
 Object.assign(c,{x:p.x,y:p.y});g.courierCommand('deliver');Courier.tickCouriers(g,.1);
 assert.deepEqual(p.quickbuy,['moon_shard']);assert.deepEqual(plan(g).missing,['hyperstone','hyperstone']);
 assert.equal(p.inventory.filter(id=>id==='moon_shard').length,1);
});

test('courier purchase completes one basic target without completing its queued second copy',()=>{
 const {g,p,c}=setup();g.queueItem('hyperstone');g.queueItem('hyperstone',true);Object.assign(c,Inventory.SECRET_SHOPS[0]);
 assert.equal(g.buyWithCourier('hyperstone').ok,true);assert.deepEqual(p.quickbuy,['hyperstone']);
 assert.deepEqual(plan(g).missing,['hyperstone']);
 Object.assign(c,{x:p.x,y:p.y});g.courierCommand('deliver');Courier.tickCouriers(g,.1);
 assert.deepEqual(p.quickbuy,['hyperstone']);assert.deepEqual(plan(g).missing,['hyperstone']);
});

test('failed courier purchases do not complete quickbuy targets',()=>{
 const {g,p,c}=setup();g.queueItem('hyperstone');Object.assign(c,Inventory.SECRET_SHOPS[0]);p.gold=0;
 assert.equal(g.buyWithCourier('hyperstone').ok,false);assert.deepEqual(p.quickbuy,['hyperstone']);assert.deepEqual(c.cargo,[]);assert.equal(p.gold,0);
});

test('quickbuy credits preserved cargo while its courier is dead',()=>{
 const {g,p,c}=setup();g.buy('circlet');g.courierCommand('deliver');Courier.tickCouriers(g,.1);g.queueItem('bracer');
 Courier.courierDied(g,c,null);assert.deepEqual(plan(g).missing,['gauntlets','recipe_bracer']);assert.equal(c.dead,true);
 assert.equal(carried(g,'circlet').length,1);assert.equal(plan(g).targets[0].consumed[0].meta.uid,c.cargoMeta[0].uid);
});

test('ordinary remote purchase quotes retain their physical storage boundary',()=>{
 const {g,p}=setup(true);g.buy('circlet');Object.assign(p,{x:10400,y:10400});g.queueItem('bracer');
 assert.equal(g.purchaseQuote('bracer').cost,505);assert.deepEqual(g.purchaseQuote('bracer').missing,['circlet','gauntlets','recipe_bracer']);
 assert.deepEqual(plan(g).missing,['gauntlets','recipe_bracer']);
});

test('quickbuy assembles purchased local materials without charging again',()=>{
 const {g,p}=setup(true);g.buy('circlet');g.buy('gauntlets');Object.assign(p,{x:10400,y:10400});g.buy('recipe_bracer');g.queueItem('bracer');
 Object.assign(p,BASES[p.team]);const gold=p.gold;assert.equal(g.buyQuick().cost,0);assert.equal(p.gold,gold);
 assert.deepEqual(p.quickbuy,[]);assert.deepEqual(p.inventory,['bracer']);assert.deepEqual(p.stash,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { BASES } from '../src/data.js';
import * as Inventory from '../src/inventory.js';

const setup=()=>{const g=new Game({hero:'crystal_maiden'});g.entities=[g.player];g.nextWave=Infinity;g.nextNeutralSpawn=Infinity;g.roshanRespawnAt=Infinity;g.player.gold=20000;return g;};

test('remote purchases enter stash and only grant stats when collected near the fountain',()=>{
 const g=setup(),p=g.player,damage=p.damage;p.x=10400;p.y=10400;
 assert.equal(g.buy('blade').ok,true);assert.deepEqual(p.inventory,[]);assert.deepEqual(p.stash,['blade']);assert.equal(p.damage,damage);
 assert.equal(g.collectStash().ok,false);Object.assign(p,BASES[0]);assert.equal(g.collectStash().ok,true);
 assert.deepEqual(p.inventory,['blade']);assert.deepEqual(p.stash,[]);assert.equal(p.damage,damage+15);
});

test('six equipment slots overflow to three inactive backpack slots, then stash',()=>{
 const g=setup(),p=g.player,damage=p.damage;
 for(let i=0;i<10;i++)assert.equal(g.buy('blade').ok,true);
 assert.equal(p.inventory.filter(Boolean).length,6);assert.equal(p.backpack.filter(Boolean).length,3);assert.equal(p.stash.filter(Boolean).length,1);
 assert.equal(p.damage,damage+90);
});

test('backpack swaps remove bonuses and wait six seconds before reactivation away from a shop',()=>{
 const g=setup(),p=g.player,damage=p.damage;g.buy('blade');
 assert.equal(g.moveItem('inventory',0,'backpack',0).ok,true);assert.equal(p.damage,damage);
 p.x=10400;p.y=10400;g.step(4);
 assert.equal(g.moveItem('backpack',0,'inventory',0).ok,true);assert.equal(p.damage,damage);
 g.setPaused(true);g.step(30);assert.equal(p.damage,damage);
 g.setPaused(false);g.step(6.05);assert.equal(p.damage,damage+15);
});

test('selling refunds the purchase within ten seconds and half afterward, with shop access required',()=>{
 const g=setup(),p=g.player,start=p.gold;g.buy('blade');assert.equal(g.sellItem('inventory',0).ok,true);assert.equal(p.gold,start);
 g.buy('blade');g.time=11;p.x=10400;p.y=10400;assert.equal(g.sellItem('inventory',0).ok,false);
 Object.assign(p,BASES[0]);assert.equal(g.sellItem('inventory',0).ok,true);assert.equal(p.gold,start-500);
});

test('dead heroes can shop into stash while paused or finished matches reject purchases',()=>{
 const g=setup(),p=g.player;p.dead=true;
 assert.equal(g.buy('blade').ok,true);assert.deepEqual(p.inventory,[]);assert.deepEqual(p.stash,['blade']);
 g.setPaused(true);assert.equal(g.buy('blade').ok,false);g.setPaused(false);g.status='won';assert.equal(g.buy('blade').ok,false);
});

test('invalid slots, insufficient gold, full stash and invalid items fail atomically',()=>{
 const g=setup(),p=g.player;g.buy('blade');const before=JSON.stringify([p.inventory,p.backpack,p.stash,p.gold]);
 assert.equal(g.moveItem('inventory',0,'inventory',6).ok,false);assert.equal(g.moveItem('inventory',0,'gold',0).ok,false);assert.equal(g.buy('missing-item').ok,false);
 assert.equal(JSON.stringify([p.inventory,p.backpack,p.stash,p.gold]),before);
 p.x=10400;p.y=10400;for(let i=0;i<6;i++)g.buy('blade');const gold=p.gold;assert.equal(g.buy('blade').ok,false);assert.equal(p.gold,gold);
});

test('completed recipes consume existing components and charge only the missing parts',()=>{
 const g=setup(),p=g.player;g.buy('circlet');g.buy('gauntlets');
 assert.equal(g.purchaseQuote('bracer').cost,210);const gold=p.gold;
 assert.equal(g.buy('bracer').ok,true);assert.equal(p.gold,gold-210);
 assert.deepEqual(p.inventory,['bracer']);assert.equal(p.strength,22);
});

test('buying a final scroll auto-combines in a full inventory without losing unrelated items',()=>{
 const g=setup(),p=g.player;for(const id of ['circlet','gauntlets','boots','blade','blade','blade'])g.buy(id);
 assert.equal(g.buy('recipe_bracer').ok,true);
 assert.equal(p.inventory.filter(id=>id==='bracer').length,1);assert.equal(p.inventory.filter(id=>id==='blade').length,3);
 assert.equal(p.backpack.filter(Boolean).length,0);
});

test('secret shop purchases require proximity and remote recipes do not consume carried parts',async()=>{
 const {SECRET_SHOPS}=await import('../src/inventory.js');
 const g=setup(),p=g.player;assert.equal(g.buy('vitality').ok,false);
 Object.assign(p,SECRET_SHOPS[0]);assert.equal(g.buy('vitality').ok,true);
 assert.equal(g.buy('blade').ok,true);assert.deepEqual(p.stash,['blade']);p.stash=[];
 Object.assign(p,BASES[0]);g.buy('circlet');p.x=10400;p.y=10400;
 assert.equal(g.purchaseQuote('bracer').cost,505);assert.equal(g.buy('bracer').ok,true);
 assert.ok(p.inventory.includes('circlet'));assert.deepEqual(p.stash,['bracer']);
});

test('quickbuy purchases affordable components and removes a completed recipe target',()=>{
 const g=setup(),p=g.player;p.gold=155;g.queueItem('bracer');assert.equal(g.buyQuick().ok,true);
 assert.deepEqual(p.inventory,['circlet']);assert.deepEqual(p.quickbuy,['bracer']);
 p.gold=350;assert.equal(g.buyQuick().ok,true);assert.deepEqual(p.inventory,['bracer']);assert.deepEqual(p.quickbuy,[]);
});

test('the final recipe scroll can combine even when every storage slot is occupied',()=>{
 const g=setup(),p=g.player;g.buy('circlet');g.buy('gauntlets');for(let i=0;i<13;i++)g.buy('blade');
 assert.equal(g.purchaseQuote('recipe_bracer').ok,true);const gold=p.gold;
 assert.equal(g.buy('recipe_bracer').ok,true);assert.equal(p.gold,gold-210);
 assert.equal(p.inventory.filter(id=>id==='bracer').length,1);
 assert.equal([...p.inventory,...p.backpack,...p.stash].filter(id=>id==='blade').length,13);
});

test('returning to base assembles stash components even when carried slots are full',()=>{
 const g=setup(),p=g.player;g.buy('circlet');g.buy('gauntlets');for(let i=0;i<7;i++)g.buy('blade');
 p.x=10400;p.y=10400;g.buy('recipe_bracer');assert.deepEqual(p.stash,['recipe_bracer']);
 Object.assign(p,BASES[0]);g.step(.05);
 assert.ok(p.inventory.includes('bracer'));assert.deepEqual(p.stash,[]);
});

test('moving attribute items between slots cannot create health or mana',()=>{
 const g=setup(),p=g.player;g.buy('gauntlets');g.buy('mantle');p.hp=5;p.mana=1;
 const hp=p.hp,mana=p.mana;
 for(let i=0;i<4;i++){g.moveItem('inventory',0,'backpack',0);g.moveItem('inventory',1,'backpack',1);g.moveItem('backpack',0,'inventory',0);g.moveItem('backpack',1,'inventory',1);}
 assert.ok(Math.abs(p.hp-hp)<.001);assert.ok(Math.abs(p.mana-mana)<.001);
});

test('an item instance retains its identity, owner and cooldown when moving through storage',()=>{
 const g=setup(),p=g.player;g.buy('blade');
 const meta=p.inventoryMeta[0];assert.ok(meta.uid);assert.equal(meta.ownerId,p.id);
 meta.cooldownRemaining=37;meta.mode='alternate';
 assert.equal(g.moveItem('inventory',0,'backpack',1).ok,true);
 assert.equal(p.backpackMeta[1].uid,meta.uid);assert.equal(p.backpackMeta[1].cooldownRemaining,37);
 assert.equal(g.moveItem('backpack',1,'inventory',3).ok,true);
 assert.equal(p.inventoryMeta[3].uid,meta.uid);assert.equal(p.inventoryMeta[3].mode,'alternate');
});

test('locked components do not auto-combine and unlocking combines without charging again',()=>{
 const g=setup(),p=g.player;g.buy('circlet');
 assert.equal(Inventory.setCombineLock?.(g,p,'inventory',0,true)?.ok,true);
 g.buy('gauntlets');g.buy('recipe_bracer');
 assert.ok(p.inventory.includes('circlet'));assert.ok(p.inventory.includes('recipe_bracer'));
 const gold=p.gold;assert.equal(Inventory.setCombineLock(g,p,'inventory',0,false).ok,true);
 assert.deepEqual(p.inventory,['bracer']);assert.equal(p.gold,gold);
});

test('disassembly preserves component identities and cooldowns and cannot mint resale gold',()=>{
 const g=setup(),p=g.player;Object.assign(p,Inventory.SECRET_SHOPS[0]);
 assert.equal(g.buy('perseverance').ok,true);const gold=p.gold;
 const slot=p.inventory.indexOf('perseverance');p.inventoryMeta[slot].cooldownRemaining=37;
 assert.equal(Inventory.disassembleItem?.(g,p,'inventory',slot)?.ok,true);
 assert.deepEqual(p.inventory.filter(Boolean).sort(),['healthring','voidstone']);
 assert.equal(p.inventoryMeta.filter(Boolean).every(m=>m.combineLocked&&m.cooldownRemaining===37),true);
 for(const e of Inventory.itemEntries(p,['inventory']))assert.equal(g.sellItem(e.area,e.index).ok,true);
 assert.equal(p.gold,gold+1400);
});

test('ground pickup transfers one instance once and preserves its sell and cooldown state',()=>{
 const g=setup(),p=g.player;g.buy('blade');const meta=p.inventoryMeta[0];meta.cooldownRemaining=12;
 const drop=Inventory.dropItem?.(g,p,'inventory',0);assert.equal(drop?.ok,true);
 assert.deepEqual(p.inventory,[]);assert.equal(drop.entity.meta.uid,meta.uid);
 assert.equal(Inventory.pickupItem(g,p,drop.entity.id).ok,true);
 assert.equal(p.inventoryMeta[0].uid,meta.uid);assert.equal(p.inventoryMeta[0].cooldownRemaining,12);
 const before=p.gold;assert.equal(Inventory.pickupItem(g,p,drop.entity.id).ok,false);
 assert.equal(p.inventory.length,1);g.sellItem('inventory',0);assert.equal(p.gold,before+1000);
});

test('transferring an instance to full storage fails atomically and foreign equipment is inactive',()=>{
 const g=setup(),p=g.player;g.buy('blade');
 const ally={...p,id:'ally',inventory:Array(6).fill('boots'),inventoryMeta:[],backpack:Array(3).fill('boots'),backpackMeta:[],stash:[],stashMeta:[]};g.entities.push(ally);
 const uid=p.inventoryMeta[0]?.uid;
 assert.equal(Inventory.transferItem?.(g,p,'inventory',0,ally,['inventory','backpack'])?.ok,false);
 assert.equal(p.inventory[0],'blade');ally.backpack=[];ally.backpackMeta=[];
 assert.equal(Inventory.transferItem(g,p,'inventory',0,ally,['inventory','backpack']).ok,true);
 assert.equal(ally.backpackMeta[0].uid,uid);assert.equal(ally.backpackMeta[0].ownerId,p.id);
 assert.equal(Inventory.activeEquipment(g,ally).includes('blade'),false);
});

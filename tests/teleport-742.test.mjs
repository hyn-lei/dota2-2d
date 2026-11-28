import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {useItem} from '../src/item-runtime.js';
import {giveItem,pickupItem} from '../src/inventory.js';

test('ordinary allied teleports at one tower take three, five and five and a half seconds',()=>{
 const g=new Game(),[first,second,third,late]=g.entities.filter(e=>e.kind==='hero'&&e.team===g.player.team);
 const tower=g.entities.find(e=>e.kind==='tower'&&e.team===first.team&&e.tier===1);
 assert.equal(useItem(g,first,0,tower,'tp').ok,true);
 assert.equal(first.recallDuration,3);
 g.stop();
 assert.equal(first.itemChannel,null);
 g.time=1;
 assert.equal(useItem(g,second,0,tower,'tp').ok,true);
 assert.equal(second.recallDuration,5);
 g._kill(second,null);
 assert.equal(second.itemChannel,null);
 assert.equal(second.recallTimer,0);
 assert.equal(useItem(g,third,0,tower,'tp').ok,true);
 assert.equal(third.recallDuration,5.5);
 g.time=27;
 assert.equal(useItem(g,late,0,tower,'tp').ok,true);
 assert.equal(late.recallDuration,3);
});

test('fountain and Boots of Travel skip the consecutive teleport delay',()=>{
 const g=new Game(),[first,second,traveler,fountainUser]=g.entities.filter(e=>e.kind==='hero'&&e.team===g.player.team);
 const tower=g.entities.find(e=>e.kind==='tower'&&e.team===first.team&&e.tier===1);
 const fountain=g.entities.find(e=>e.kind==='fountain'&&e.team===first.team);
 assert.equal(useItem(g,first,0,tower,'tp').ok,true);
 assert.equal(useItem(g,second,0,fountain,'tp').ok,true);
 assert.equal(useItem(g,fountainUser,0,fountain,'tp').ok,true);
 assert.equal(fountainUser.recallDuration,3);
 traveler.inventory=['travel_boots_2'];g._refreshHero(traveler);
 assert.equal(useItem(g,traveler,0,tower,'tp').ok,true);
 assert.equal(traveler.recallDuration,2);
});

test('borrowed Boots of Travel do not waive the consecutive teleport delay or scroll cost',()=>{
 const g=new Game(),[owner,borrower]=g.entities.filter(e=>e.kind==='hero'&&e.team===g.player.team);
 const tower=g.entities.find(e=>e.kind==='tower'&&e.team===owner.team&&e.tier===1);
 Object.assign(borrower,{x:owner.x,y:owner.y});
 assert.equal(giveItem(g,owner,'travel_boots_2').ok,true);
 const dropped=g.dropItem('inventory',0);
 assert.equal(pickupItem(g,borrower,dropped.entity.id).ok,true);
 assert.equal(useItem(g,owner,0,tower,'tp').ok,true);
 assert.equal(useItem(g,borrower,0,tower,'tp').ok,true);
 assert.equal(borrower.recallDuration,5);
 assert.equal(borrower.tp.includes('tpscroll'),false);
});

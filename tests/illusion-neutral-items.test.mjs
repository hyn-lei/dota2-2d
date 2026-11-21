import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {createIllusions} from '../src/illusions.js';
import {createMeta} from '../src/inventory.js';
import {afterAttack} from '../src/item-runtime.js';

test('Phantasm copies neutral attributes, tier metadata and item on-hit effects with its own ownership',()=>{
 const g=new Game({hero:'chaos_knight'}),p=g.player;
 p.neutralTier=4;p.neutralItem='heavy_blade';p.neutralItemMeta={...createMeta(p,'heavy_blade'),tier:4,curioBoost:true,recrafts:2};
 p.neutralEnchantment='enhancement_evolved';p.neutralEnchantmentMeta={...createMeta(p,'enhancement_evolved'),tier:4};g._refreshHero(p);
 const [clone]=createIllusions(g,p,1,30,100,325,{itemPotency:100,phantasmOwnerId:p.id});
 assert.equal(clone.strength,p.strength);assert.equal(clone.agility,p.agility);assert.equal(clone.intelligence,p.intelligence);
 assert.equal(clone.neutralItemMeta.ownerId,clone.id);assert.notEqual(clone.neutralItemMeta.uid,p.neutralItemMeta.uid);
 assert.equal(clone.neutralEnchantmentMeta.ownerId,clone.id);assert.equal(clone.neutralItemMeta.tier,4);assert.equal(clone.neutralItemMeta.curioBoost,true);assert.equal(clone.neutralItemMeta.recrafts,2);
 const enemy=g.entities.find(e=>e.kind==='hero'&&e.team!==p.team);enemy.maxMana=1000;
 const calls=[];g.damage=(target,amount,source,type)=>{calls.push({target,amount,source,type});return amount;};
 afterAttack(g,clone,enemy,{damage:0,itemPotency:100});
 assert.ok(calls.some(c=>c.source===clone&&c.target===enemy&&c.type==='physical'&&c.amount>0));
});

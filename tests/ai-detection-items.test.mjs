import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import * as Inventory from '../src/inventory.js';
import * as Skills from '../src/hero-runtime.js';

for(const separation of [200,800])test(`Gem active reveal after the carrier moves away respects its 300 radius at ${separation} distance`,()=>{
 const {g,p,e,c}=arena('axe',[0,0,0,0]);c.y+=3000;e.x=p.x+separation;
 p.inventory=['gem'];Inventory.ensureInventory(p);g._refreshHero(p);
 Skills.addStatus(g,e,'hidden',{invisible:true,positive:true,duration:20});assert.equal(g.canSee(p,e),true,'carried Gem passively reveals within 900');
 assert.equal(g.useItem(0,{x:p.x,y:p.y}).ok,true);p.x=8000;g._index();g.step(.05);
 assert.equal(g.canSee(p,e),separation<=300,'the stationary active must not retain the larger carried Gem radius');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {createMeta} from '../src/inventory.js';
import {applyStun,applyRoot,addStatus} from '../src/hero-runtime.js';

test('Timeless extends hostile disables once, respects resistance and leaves allied buffs unchanged',()=>{
 const g=new Game({hero:'chaos_knight'}),p=g.player,e=g.entities.find(e=>e.kind==='hero'&&e.team!==p.team);
 p.neutralEnchantment='enhancement_timeless';p.neutralEnchantmentMeta={...createMeta(p,'enhancement_timeless'),tier:4};g._refreshHero(p);
 e.statusResistance=20;applyStun(g,e,2,p);
 assert.ok(Math.abs(e.statuses.stun.duration-1.84)<1e-9);assert.equal(e.buffs.stunUntil,e.statuses.stun.until);
 applyStun(g,e,.1,p);assert.ok(Math.abs(e.statuses.stun.duration-1.84)<1e-9,'short repeated stuns do not amplify existing remaining time again');
 applyRoot(g,e,3,p);assert.ok(Math.abs(e.statuses.root.duration-2.76)<1e-9);
 const slow=addStatus(g,e,'slow:test',{sourceId:p.id,duration:4,slowPct:30});assert.ok(Math.abs(slow.duration-4.6)<1e-9);
 const buff=addStatus(g,p,'buff:test',{positive:true,sourceId:p.id,duration:4,armor:5});assert.equal(buff.duration,4);
});

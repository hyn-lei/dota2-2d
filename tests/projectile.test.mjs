import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';

test('Powershot collides during flight, so a target can leave the arrow path after release',()=>{
 const {g,p,e}=arena('windranger',[0,1,0,0]);g.entities=[p,e];
 e.x=p.x+1500;e.y=p.y;
 assert.equal(g.cast(1,{x:p.x+3000,y:p.y}).ok,true);g.step(1.05);
 const hp=e.hp;e.y+=500;g.step(1);
 assert.equal(e.hp,hp);
});

test('Powershot hits units entering its path and reduces damage only after an actual hit',()=>{
 const {g,p,e,c}=arena('windranger',[0,1,0,0]);
 e.x=p.x+1500;e.y=p.y+500;c.x=p.x+2100;c.y=p.y;
 g.cast(1,{x:p.x+3000,y:p.y});g.step(1.05);
 e.y=p.y;const hp=e.hp,creepHp=c.hp;g.step(1);
 assert.ok(Math.abs(hp-e.hp-170)<.01);
 assert.ok(Math.abs(creepHp-c.hp-170*.85)<.01);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { arena } from './skill-arena.mjs';

test('Axe is drafted on both teams; player begins untrained and bots have only one learned skill',()=>{
 const g=new Game({hero:'axe'});assert.deepEqual(g.player.abilityLevels,[0,0,0,0]);
 for(const team of [0,1])assert.ok(g.entities.some(e=>e.team===team&&e.heroId==='axe'));
 const bot=g.entities.find(e=>e.team===1&&e.heroId==='axe');assert.equal(bot.abilityLevels.reduce((a,b)=>a+b),1);
});
test('Call forces enemy heroes to attack and rejects their movement and casting commands',()=>{
 const {g,p,e}=arena('axe');e.x=p.x+240;e.range=20;g.cast(0);g.step(.3);
 assert.equal(g._tauntSource(e),p);p.isPlayer=false;p.aiTimer=Infinity;e.isPlayer=true;e.speed=300;
 g.moveTo(11500,11000);g.setMovement(1,0);assert.equal(e.destination,null);assert.equal(g.cast(0,p).ok,false);
 const before=e.x;g.step(.1);assert.ok(e.x<before);
 g.damage(p,99999,e,'pure');g.moveTo(11000,10400);assert.ok(e.destination);
});
test('Call armor expires and a longer stun takes priority over taunt movement',()=>{
 const {g,p,e}=arena('axe');g.cast(0);g.step(.3);
 const guarded=g.damage(p,100,e,'physical');e.buffs.stunUntil=g.time+1;e.speed=300;const x=e.x;
 g.step(.5);assert.equal(e.x,x);g.entities=[p];g.step(2);
 const unguarded=g.damage(p,100,e,'physical');assert.ok(unguarded>guarded);
});
test('Battle Hunger deals pure rank damage, slows only when facing away and ends on a kill',()=>{
 const {g,p,e,c}=arena('axe');g.cast(1,e);g.step(.3);
 assert.equal(e.hp,3988);e.speed=300;e.angle=0;assert.ok(Math.abs(g.combatStats(e).speed-246)<1e-8);
 e.angle=Math.PI;assert.equal(g.combatStats(e).speed,300);
 g.step(1);assert.equal(e.hp,3976);
 const ally={...c,id:'ally',team:0,hp:1,statuses:{},buffs:{}};g.entities.push(ally);g.damage(ally,100,e,'pure');assert.equal(e.statuses.hunger,undefined);
});
test('Hunger rejects buildings and empty points without paying mana, and persists after caster death',()=>{
 const {g,p,e,c}=arena('axe');const mana=p.mana;
 assert.equal(g.cast(1,{x:11800,y:11000}).ok,false);assert.equal(p.mana,mana);
 c.hp=20;g.cast(1,c);g.step(.3);g.damage(p,99999,e,'pure');g.step(1);
 assert.equal(c.dead,true);assert.equal(p.lastHits,1);
});
test('Counter Helix counts received attacks, hits enemy fighters and excludes allies and buildings',()=>{
 const {g,p,e,c}=arena('axe');c.x=p.x+200;const ally={...c,id:'ally',team:0,statuses:{},buffs:{}},tower={...c,id:'tower',kind:'tower',tier:1,lane:0};g.entities.push(ally,tower);
 for(let n=0;n<7;n++){e.attackCooldown=0;g._attack(e,p);}
 assert.equal(e.hp,3900);assert.equal(c.hp,3900);assert.equal(ally.hp,4000);assert.equal(tower.hp,4000);assert.equal(p.cooldowns[2],.3);
});
test('Culling Blade is flat pure damage and gives permanent armor only on hero kills',()=>{
 const {g,p,e}=arena('axe');e.hp=275;e.armor=500;
 g.cast(3,e);g.step(.3);assert.equal(e.dead,true);assert.equal(p.kills,1);assert.equal(p.cooldowns[3],0);assert.equal(p.cullingStacks,1);
 assert.ok(p.statuses.culling);assert.ok(g.combatStats(p).armor>p.armor);
});
test('Culling a creep does not reset cooldown or grant a permanent armor stack',()=>{
 const {g,p,c}=arena('axe');c.x=p.x+100;c.y=p.y+120;c.hp=100;
 g.cast(3,c);g.step(.3);assert.equal(c.dead,true);assert.ok(p.cooldowns[3]>79);assert.equal(p.cullingStacks||0,0);
});
test('Axe AI uses its learned ultimate against a valid low-health hero',()=>{
 const {g,p,e,c}=arena('axe');g.entities=[p,e];p.isPlayer=false;e.isPlayer=true;e.hp=200;p.aiTimer=0;
 g.step(.4);assert.equal(e.dead,true);assert.equal(p.cullingStacks,1);
});
test('One Man Army adds actual strength, health and damage, then fades near an ally',()=>{
 const {g,p,e}=arena('axe',[0,0,0,0]),baseStrength=p.strength,baseHp=p.maxHp;
 g.step(.05);assert.ok(p.strength>baseStrength);assert.ok(p.maxHp>baseHp);
 const ally={...e,id:'ally',team:0,x:p.x+50,statuses:{},buffs:{}};g.entities.push(ally);g.step(3.1);
 assert.ok(Math.abs(p.strength-baseStrength)<.01);assert.ok(Math.abs(p.maxHp-baseHp)<.1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import * as Chen from '../src/chen-runtime.js';
import * as Skills from '../src/hero-runtime.js';
test('Chen innate grows persuaded unit health, damage, speed and spell damage without Break',()=>{
 const {g,p,c}=arena('chen',[1,1,1,1]);p.level=10;c.level=1;c.maxHp=c.hp=300;c.damage=c.damageMin=c.damageMax=100;c.speed=270;c.x=p.x+200;
 g.cast(1,c);g.step(.4);assert.equal(c.maxHp,900);assert.equal(c.damage,125);assert.equal(c.speed,295);assert.equal(c.spellAmp,25);
 Skills.addStatus(g,p,'break',{duration:10,break:true});p.level=11;g.step(.1);assert.equal(c.maxHp,950);assert.equal(c.damage,127);assert.equal(c.spellAmp,27);
});
test('Chen can anoint a controlled creature and manually revive the same kind after death',()=>{
 const {g,p,c}=arena('chen',[1,1,1,1]);p.level=10;c.level=1;c.x=p.x+200;g.cast(1,c);g.step(.4);
 assert.ok(Chen.castAnoint(g,c).ok);assert.ok(c.zealot);assert.equal(p.zealotId,c.id);assert.ok(c.abilities.includes('chen_martyrdom'));
 g._kill(c,null);g.step(2);assert.equal(g.entities.some(e=>e.zealot&&!e.dead),false);
 assert.ok(g.castExtra('chen_zealot',p).ok);g.step(.4);const revived=g.entities.find(e=>e.id===p.zealotId);assert.ok(revived&&!revived.dead);assert.equal(revived.sourceId,c.sourceId);
});
test('Holy Persuasion self cast recalls controlled units with a three second cooldown',()=>{
 const {g,p,c}=arena('chen',[1,4,1,1]);c.level=1;c.x=p.x+200;g.cast(1,c);g.step(.4);p.cooldowns[1]=0;c.x=p.x+2000;
 assert.ok(g.cast(1,p).ok);g.step(.4);assert.ok(p.cooldowns[1]>2.5&&p.cooldowns[1]<=3);assert.ok(c.statuses.chenRecall);
 g.step(3);assert.ok(Math.hypot(c.x-p.x,c.y-p.y)<180);
});
test('Chen innate level growth preserves its health base and current health ratio beneath Granite Golem aura',()=>{
 const {g,p,c}=arena('chen',[1,4,0,3]);p.level=10;p.hasShard=true;c.level=1;c.maxHp=c.hp=300;c.x=p.x+200;c.hpRegen=0;
 g.cast(1,c);g.step(.4);assert.equal(c.maxHp,900);
 const golem=g._makeNeutral('granite_golem',{x:p.x+200,y:p.y+200},{id:'health-test',x:p.x+200,y:p.y+200});p.cooldowns[1]=0;
 g.cast(1,golem);g.step(.4);golem.manualControl=true;c.manualControl=true;assert.equal(c.maxHp,1053);assert.equal(c.creatureHpBonus,153);
 c.hp=c.maxHp/2;p.level=11;g.step(.1);assert.ok(Math.abs(c.maxHp-1111.5)<1e-6);assert.ok(Math.abs(c.creatureHpBonus-161.5)<1e-6);assert.ok(Math.abs(c.hp-c.maxHp/2)<1e-6);
 golem.x=p.x+5000;g.step(.3);assert.equal(c.maxHp,950);assert.equal(c.creatureHpBonus,0);assert.equal(c.hp,475);
});

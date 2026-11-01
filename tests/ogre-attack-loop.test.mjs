import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import * as Skills from '../src/hero-runtime.js';

function attackArena({ bot=false, taunted=false, bloodlust=false, targetDistance=140 }={}) {
  const {g,p,e}=arena('ogre_magi',[0,0,4,0]);
  g.entities=[p,e];g._random=()=>.99;p.gold=0;e.x=p.x+targetDistance;
  if(bloodlust){assert.ok(g.cast(2,p).ok);g.step(.5);assert.ok(p.statuses.ogreBloodlust);}
  p.attackCooldown=0;p.cooldowns=[999,999,999,999];
  if(bot){p.isPlayer=false;p.aiTimer=0;}
  if(taunted)Object.assign(p.buffs,{tauntSourceId:e.id,tauntUntil:g.time+20});
  else if(!bot)g.attackTarget(e.id);
  g._index();return {g,p,e};
}

function recordHits(g,target,duration) {
  const hits=[],startedAt=g.time;
  for(let elapsed=0;elapsed<duration-1e-7;elapsed+=.01){
    const hp=target.hp;g.step(.01);
    if(target.hp<hp)hits.push(g.time-startedAt);
  }
  return hits;
}

for(const bot of [false,true])for(const taunted of [false,true])for(const bloodlust of [false,true])for(const targetDistance of [140,180]){
  test(`Ogre ${bot?'bot':'player'} ${taunted?'taunt':'attack'} loop sustains ${bloodlust?'self Bloodlust':'level-one'} attack cadence at ${targetDistance} range`,()=>{
    const {g,e}=attackArena({bot,taunted,bloodlust,targetDistance});
    const hits=recordHits(g,e,8);
    // Official BAT 1.7, attack point 0.3, base AS 100 + 14 agility;
    // level-four Bloodlust adds 100 self AS. Allow one 10 ms simulation tick.
    const interval=bloodlust ? .7943925234 : 1.4912280702;
    const attackPoint=bloodlust ? .1401869159 : .2631578947;
    assert.ok(hits.length>4,`expected sustained attacks, observed ${hits.length} hits`);
    if(targetDistance===140)assert.ok(Math.abs(hits[0]-(.01+attackPoint))<=.010001,`first hit at ${hits[0]}`);
    else assert.ok(hits[0]<attackPoint+.1,`first hit at ${hits[0]} after a small range adjustment`);
    for(let i=1;i<hits.length;i++)assert.ok(Math.abs(hits[i]-hits[i-1]-interval)<=.010001,`hit gap ${hits[i]-hits[i-1]} should be ${interval}`);
  });
}

test('an in-range movement retry preserves an Ogre attack windup',()=>{
  const {g,p,e}=attackArena();assert.ok(g._attack(p,e));
  g._move(p,e,.05,p.range+e.radius-3);g.step(.3);
  assert.equal(e.hp,4000-p.damage);
});

test('a real movement command cancels an Ogre attack windup',()=>{
  const {g,p,e}=attackArena();assert.ok(g._attack(p,e));
  g.setMovement(-1,0);g.step(.4);
  assert.ok(p.x<10400);assert.equal(e.hp,4000);
});

test('starting a spell cancels an Ogre attack windup',()=>{
  const {g,p,e}=attackArena();assert.ok(g._attack(p,e));
  p.cooldowns[2]=0;assert.ok(g.cast(2,p).ok);g.step(.3);
  assert.equal(e.hp,4000);assert.equal(p.attackPhase,null);
});

for(const control of ['stunned','disarmed'])test(`${control} cancels an Ogre attack windup`,()=>{
  const {g,p,e}=attackArena();assert.ok(g._attack(p,e));
  Skills.addStatus(g,p,'attackControl',{duration:1,[control]:true});g.step(.3);
  assert.equal(e.hp,4000);assert.equal(p.attackPhase,null);
});

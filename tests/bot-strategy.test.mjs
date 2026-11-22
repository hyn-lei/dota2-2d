import test from 'node:test';
import assert from 'node:assert/strict';
import {tacticalWorld,tacticalPlan,trySupportTeleport} from '../src/bot-tactics.js';
import {tacticalArena,tower,supplyTp,advanceBots} from './bot-tactics-scenarios.mjs';
import * as Items from '../src/item-runtime.js';
import * as Skills from '../src/hero-runtime.js';

test('nightmare sends the available support rather than pulling a farming carry into a small fight',()=>{
  const {g,bots,enemy}=tacticalArena(1,'nightmare',2),[carry,support]=bots;
  carry.draftRole='carry';support.draftRole='support';
  const ally=g._makeHero('kunkka',1,1,true,3);
  Object.assign(ally,{x:15100,y:10400,isHuman:true,aiTimer:Infinity,targetId:enemy.id});
  Object.assign(enemy,{x:15500,targetId:ally.id});tower(g,1,14100);g._index();
  const plans=tacticalWorld(g).teams[1].plans;
  assert.equal(plans.get(support.id)?.mode,'assist');
  assert.equal(plans.has(carry.id),false,'the carry should keep its existing farm and lane duty');
});

test('nightmare reinforces a tower with a capable healthy frontliner instead of the first nearby weak heroes',()=>{
  const {g,bots,enemy}=tacticalArena(1,'nightmare',4),own=tower(g,1,15000,10400,{lane:1});
  for(const [i,h] of bots.entries())Object.assign(h,{x:14600+i*50,hp:h.maxHp*.5,draftRole:i===1?'support':'carry'});
  const frontliner=bots[3];frontliner.level=12;g._refreshHero(frontliner);
  Object.assign(frontliner,{hp:frontliner.maxHp,draftRole:'offlane'});
  enemy.level=7;g._refreshHero(enemy);Object.assign(enemy,{x:15400,targetId:own.id,hp:enemy.maxHp});g._index();
  const plans=tacticalWorld(g).teams[1].plans;
  assert.equal(plans.get(frontliner.id)?.objectiveId,own.id,'real level, damage and health must influence the reinforcement choice');
  assert.ok(plans.size<=4);
});

test('nightmare increases ordinary defense support when two underlevelled heroes cannot match the visible attacker',()=>{
  const {g,bots,enemy}=tacticalArena(1,'nightmare',5),own=tower(g,1,15000,10400,{lane:1});
  enemy.level=16;g._refreshHero(enemy);Object.assign(enemy,{x:15400,targetId:own.id,hp:enemy.maxHp});
  g._index();const plans=tacticalWorld(g).teams[1].plans;
  const defenders=bots.filter(h=>plans.get(h.id)?.objectiveId===own.id);
  assert.ok(defenders.length>=3,'visible enemy levels and equipment must change the support requirement');
  assert.ok(defenders.length<=4,'ordinary tower pressure must still leave a hero on another duty');
});

test('hell creates pressure on three safe lanes instead of spending its team on two push groups',()=>{
  function pushes(difficulty){
    const {g,bots,enemy}=tacticalArena(1,difficulty,5);enemy.dead=true;enemy.hp=0;g.time=180;
    for(const [i,h] of bots.entries())h.lane=i%3;
    const objectives=[tower(g,0,13200,10400,{lane:1}),tower(g,0,10400,13200,{lane:0}),tower(g,0,7800,10400,{lane:2})];
    objectives[0].hp=900;
    for(const t of objectives)g.entities.push(g._unit('creep',1,t.x-200,t.y,{maxHp:1000,lane:t.lane}));
    g._index();const plans=tacticalWorld(g).teams[1].plans;
    return objectives.map(t=>bots.filter(h=>plans.get(h.id)?.objectiveId===t.id).length);
  }
  assert.equal(pushes('nightmare').filter(n=>n>0).length,2);
  const pressure=pushes('hell');
  assert.equal(pressure.filter(n=>n>0).length,3,'three existing waves should produce three active lane threats');
  assert.ok(pressure.every(n=>n<=2),'an uncontested outer tower must not consume a three-hero group');
});

test('hell releases an exposed push when visible reinforcements arrive and keeps pressure on a safer lane',()=>{
  const {g,bots,enemy}=tacticalArena(1,'hell',5);enemy.dead=true;enemy.hp=0;g.time=180;
  const exposed=tower(g,0,13200,10400,{lane:1}),safe=tower(g,0,10400,13200,{lane:0});exposed.hp=500;
  for(const t of [exposed,safe])g.entities.push(g._unit('creep',1,t.x-200,t.y,{maxHp:1000,lane:t.lane}));
  g._index();assert.ok([...tacticalWorld(g).teams[1].plans.values()].some(p=>p.objectiveId===exposed.id));
  for(const [i,id] of ['axe','kunkka'].entries()){
    const reinforcement=g._makeHero(id,0,1,true,i+5);reinforcement.level=16;g._refreshHero(reinforcement);
    Object.assign(reinforcement,{x:exposed.x+400,y:exposed.y+i*80,hp:reinforcement.maxHp,isHuman:true,aiTimer:Infinity});
  }
  g.time+=.3;g._index();const world=tacticalWorld(g),plans=world.teams[1].plans;
  assert.equal(world.teams[1].visibleHeroes.length,2,'the decision needs actual allied-wave sight');
  assert.equal([...plans.values()].some(p=>p.objectiveId===exposed.id),false,'a losing push must release its old helpers');
  assert.ok(bots.some(h=>plans.get(h.id)?.objectiveId===safe.id));
});

test('hell anticipates a visible enemy support teleport before its real channel lands',()=>{
  const {g,bot,enemy}=tacticalArena(1,'hell');
  const own=tower(g,1,15000,11200,{lane:0}),anchor=tower(g,0,15000,10400,{lane:0});
  supplyTp(g,enemy);g._index();
  assert.equal(Items.useItem(g,enemy,0,anchor,'tp').ok,true);
  assert.equal(enemy.itemChannel?.kind,'teleport');
  const world=tacticalWorld(g);assert.ok(world.teams[1].visibleHeroes.some(h=>h.id===enemy.id));
  assert.equal(tacticalPlan(g,bot)?.objectiveId,own.id,'the observed incoming reinforcement should create an early defensive response');
  assert.ok(enemy.x<12000,'the enemy has not been moved early or teleported for free');
  g.difficulty='nightmare';g.time+=.3;g._index();
  assert.equal(tacticalPlan(g,bot),undefined,'the fourth tier waits for the actual arrival');
});

test('hell waits for a surviving wave instead of assigning heroes behind one dying creep',()=>{
  const {g,bot,enemy}=tacticalArena(1,'hell');enemy.dead=true;enemy.hp=0;g.time=180;
  const target=tower(g,0,13200),wave=g._unit('creep',1,13000,10400,{maxHp:1000,lane:2});wave.hp=1;
  g.entities.push(wave);g._index();assert.equal(tacticalPlan(g,bot),undefined,'a creep about to die cannot support a real tower approach');
  wave.hp=1000;g.time+=.3;g._index();assert.equal(tacticalPlan(g,bot)?.objectiveId,target.id);
});

test('hell cannot anticipate a support teleport whose caster has no allied sight',()=>{
  const {g,bot,enemy}=tacticalArena(1,'hell');
  tower(g,1,15000,11200,{lane:0});const anchor=tower(g,0,15000,10400,{lane:0});
  supplyTp(g,enemy);g._index();assert.equal(Items.useItem(g,enemy,0,anchor,'tp').ok,true);
  Skills.addStatus(g,enemy,'testInvisible',{duration:10,invisible:true});g._index();
  assert.equal(tacticalWorld(g).teams[1].visibleHeroes.length,0);
  assert.equal(tacticalPlan(g,bot),undefined,'the future landing cannot leak a hidden caster into the strategy');
});

test('temporary middle-tower support preserves home lanes and releases helpers after the threat leaves',()=>{
  const {g,bots,enemy}=tacticalArena(1,'hell',5),home=[0,1,2,0,2];
  for(const [i,h] of bots.entries())h.lane=home[i];
  const own=tower(g,1,15000,10400,{lane:1});Object.assign(enemy,{x:15400,targetId:own.id});g._index();
  for(const h of bots)g._botTick(h,.05);
  const helpers=bots.filter(h=>h.itemChannel?.kind==='teleport');
  assert.ok(helpers.length>=1&&helpers.length<=2);
  assert.deepEqual(bots.map(h=>h.lane),home,'support must not rewrite the original lane assignment');
  enemy.dead=true;enemy.hp=0;g.time=3.1;
  for(const h of helpers)Items.tickUnit(g,h,.05);
  g._index();advanceBots(g,helpers,.3);
  assert.ok(helpers.every(h=>!tacticalPlan(g,h)&&!h.botState.objectiveKey));
  assert.deepEqual(bots.map(h=>h.lane),home);
});

test('hidden movement within the shared observation interval cannot change the support teleport landing decision',()=>{
  function launch(hiddenX){
    const {g,bot,enemy}=tacticalArena(1,'hell'),own=tower(g,1,15000);
    enemy.level=15;g._refreshHero(enemy);Object.assign(enemy,{x:15700,hp:enemy.maxHp,targetId:own.id});
    bot.botState={};g._index();const world=tacticalWorld(g),plan=tacticalPlan(g,bot);
    assert.ok(world.teams[1].visibleHeroes.some(h=>h.id===enemy.id));
    g.time=.1;Skills.addStatus(g,enemy,'testInvisible',{duration:10,invisible:true});enemy.x=hiddenX;g._index();
    assert.equal(g.canSee(bot,enemy),false);assert.equal(tacticalWorld(g),world,'the shared pass must stay cached');
    return trySupportTeleport(g,bot,plan,{enemyHeroes:[]});
  }
  assert.deepEqual([launch(15700),launch(15150)],[true,true],'new hidden coordinates cannot reveal whether the last-known enemy moved into the landing');
});

test('a visible teleport caster cannot reveal an unseen destination to the hell push strategy',()=>{
  const {g,bot,enemy}=tacticalArena(1,'hell');g.time=180;
  const target=tower(g,0,13200,10400,{lane:2}),anchor=tower(g,0,14900,10400,{lane:1});
  g.entities.push(g._unit('creep',1,13000,10400,{maxHp:1000,lane:2}));
  enemy.level=20;g._refreshHero(enemy);Object.assign(enemy,{x:10600,hp:enemy.maxHp});supplyTp(g,enemy);g._index();
  assert.equal(tacticalPlan(g,bot)?.objectiveId,target.id);
  assert.equal(Items.useItem(g,enemy,0,anchor,'tp').ok,true);g.time+=.3;g._index();
  const world=tacticalWorld(g);
  assert.ok(world.teams[1].visibleHeroes.some(h=>h.id===enemy.id),'the origin is actually visible');
  assert.ok(world.teams[1].units.every(h=>Math.hypot(h.x-anchor.x,h.y-anchor.y)>1800),'the destination is outside every actual allied observer');
  assert.equal(tacticalPlan(g,bot)?.objectiveId,target.id,'the private far-away TP destination must not cancel a visible viable push');
});

test('hell cannot approve a second push with strong heroes already assigned to the first objective',()=>{
  const {g,bots,enemy}=tacticalArena(1,'hell',5);g.time=180;
  const safe=tower(g,0,13200,10400,{lane:1}),danger=tower(g,0,10400,13200,{lane:0});safe.hp=300;
  for(const t of [safe,danger])g.entities.push(g._unit('creep',1,t.x,t.y-200,{maxHp:1000,lane:t.lane}));
  for(const [i,h] of bots.entries()){
    const strong=i===0||i===3;h.level=strong?12:5;g._refreshHero(h);
    Object.assign(h,{x:strong?13000+i*10:10400,y:10400,hp:h.maxHp*(strong?1:.45)});
  }
  enemy.level=12;g._refreshHero(enemy);Object.assign(enemy,{x:10400,y:13600,hp:enemy.maxHp});g._index();
  const plans=tacticalWorld(g).teams[1].plans;
  assert.equal(plans.get(bots[0].id)?.objectiveId,safe.id);assert.equal(plans.get(bots[3].id)?.objectiveId,safe.id);
  assert.equal([...plans.values()].some(p=>p.objectiveId===danger.id),false,'the two strong assigned heroes cannot also certify that the remaining weak group can push a defended tower');
  assert.ok([bots[1],bots[2],bots[4]].every(h=>!plans.has(h.id)),'the insufficient group should retain its other duties');
});

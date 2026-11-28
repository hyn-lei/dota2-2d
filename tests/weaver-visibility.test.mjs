import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import * as Skills from '../src/hero-runtime.js';
import {drawCombatEffect} from '../src/combat-effects.js';
import {visibleRenderUnits} from '../src/renderer.js';
import {snapshotState} from '../server/snapshot.mjs';
import {teamCanSeePoint} from '../src/vision.js';
import {rewindHero} from '../src/weaver-runtime.js';

test('Enemy allied Time Lapse does not paint hidden target coordinates or its rewind path',()=>{
 const {g,p,e}=arena('weaver',[0,0,0,3]);p.team=1;e.team=0;p.hasScepter=true;
 const ally=g._makeHero('crystal_maiden',1,1,false,0);ally.x=p.x+100;ally.y=p.y;ally.attackCooldown=999;ally.aiTimer=Infinity;
 g.entities.push(ally);g._index();Skills.addStatus(g,ally,'invisible',{invisible:true,positive:true,duration:10});
 assert.equal(Skills.castExtraAbility(g,p,'weaver_time_lapse_ally',ally).ok,true);g.step(.31);
 const effect=g.effects.find(f=>f.visual==='weaverTimeLapse');assert.ok(effect);assert.equal(g.canSee(e,ally),false);
 const context={save(){},restore(){},globalAlpha:1};
 // Drawing paths would require Canvas path methods; a hidden target must produce no paint.
 g._commandActor=e;assert.doesNotThrow(()=>drawCombatEffect(context,effect,g,.45));
});

test('An established fate thread remains visible when its source is outside model clipping and its target is on screen',()=>{
 const {g,p,e,c}=arena('weaver',[0,0,0,0]);c.y+=1000;p.attackCooldown=0;
 g._attack(p,e,{attackReleased:true});p.attackCooldown=999;g.step(1.5);
 assert.equal(p.weaverThreads[0].phase,'established');e.x=p.x+800;g.step(.05);
 const visible=visibleRenderUnits(g,p,{x:e.x,y:e.y},100,100);
 assert.equal(visible.entities.includes(p),false);assert.ok(visible.auraEntities.includes(p));
});

test('A visible enemy rewind cannot transmit a route through fog',()=>{
 const {g,p,e}=arena('weaver',[0,0,0,0]);p.team=1;e.team=0;
 Object.assign(e,{x:9856,y:9792,visionDay:500});
 Object.assign(p,{x:9856,y:9856});g.entities=[p,e];g.time=6;
 const start={time:1,x:9856,y:9920,hp:300,mana:200};
 const hidden={...start,time:3,x:9000};
 p.weaverTimeLapseHistory=[start,hidden];
 assert.equal(teamCanSeePoint(g,e.team,p),true);
 assert.equal(teamCanSeePoint(g,e.team,start),true);
 assert.equal(teamCanSeePoint(g,e.team,hidden),false);
 assert.equal(rewindHero(g,p,p),true);
 assert.equal(snapshotState(g,p.team).effects[0].path[1].x,hidden.x);
 const opposing=snapshotState(g,e.team);
 assert.equal(opposing.effects[0].visual,'weaverTimeLapse');
 assert.equal(opposing.effects[0].path,undefined);
 assert.equal(opposing.entities.find(unit=>unit.id===p.id).weaverTimeLapsePreview,undefined);
});

test('Shukuchi damage cannot give a fate thread the initial position of an unseen enemy',()=>{
 const {g,p,e,c}=arena('weaver',[0,1,0,0]);c.y+=900;
 Skills.addStatus(g,e,'invisible',{invisible:true,positive:true,duration:10});
 assert.equal(g.cast(1).ok,true);g.step(.05);
 assert.ok(e.hp<e.maxHp);
 assert.equal(g.canSee(p,e),false);
 const thread=p.weaverThreads[0];assert.ok(thread);
 assert.equal(thread.x,undefined);assert.equal(thread.y,undefined);
 e.x+=30;delete e.statuses.invisible;
 g.step(.05);assert.equal(thread.x,e.x);assert.equal(thread.y,e.y);
});

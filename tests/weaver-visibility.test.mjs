import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import * as Skills from '../src/hero-runtime.js';
import {drawCombatEffect} from '../src/combat-effects.js';
import {visibleRenderUnits} from '../src/renderer.js';

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

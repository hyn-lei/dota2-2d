import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Game} from '../src/engine.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import {NEUTRAL_ABILITIES,NEUTRAL_UNITS,LANE_CREEPS} from '../src/unit-data.js';
import {UNIT_SKILL_UI} from '../src/unit-skill-data.js';
import {unitSkillIds,unitSkill} from '../src/unit-skills.js';
import {flagbearerAura,flagbearerMagicResistance} from '../src/unit-auras.js';
import {statusEffects} from '../src/status-ui.js';
import {visibleRenderUnits} from '../src/renderer.js';
import {unitAuraRadius} from '../src/combat-effects.js';

test('unit skill localization covers source abilities with original names and local art',()=>{
 assert.equal(UNIT_SKILL_UI.creep_irresolute.name,'绵力');assert.equal(UNIT_SKILL_UI.flagbearer_creep_aura_effect.name,'鼓舞光环');
 for(const [id,definition] of Object.entries(NEUTRAL_ABILITIES)){
  const ui=UNIT_SKILL_UI[id];assert.ok(ui,id);
  if(!definition.behavior.includes('HIDDEN')){assert.ok(ui.description,id);assert.ok(!ui.name.includes('_'),id);}
  if(ui.image)assert.ok(fs.existsSync(ui.image),id);
 }
 for(const unit of Object.values(NEUTRAL_UNITS))for(const id of unitSkillIds({...unit,kind:'neutral'}))assert.ok((NEUTRAL_ABILITIES[id]||UNIT_SKILL_UI[id]?.definition)&&UNIT_SKILL_UI[id],id);
});

test('flagbearer provides one live regen/resistance aura only to allied lane creeps',()=>{
 const g=new Game();g.time=900;
 const make=(type,team,x)=>{const u=g._unit('creep',team,x,8000,{...LANE_CREEPS[type],range:0,speed:0,lane:1});g.entities.push(u);return u;};
 const source=make('flagbearer',0,8000),creep=make('melee',0,8700),enemy=make('melee',1,8000),second=make('flagbearer',0,8000);
 assert.equal(flagbearerAura(g,source).hpRegen,3);assert.equal(flagbearerAura(g,creep).magicResistance,.08);assert.equal(flagbearerAura(g,enemy),null);assert.equal(flagbearerAura(g,g.player),null);
 const expected=1-(1-creep.magicResistance)*.92;assert.ok(Math.abs(g.combatStats(creep).magicResistance-expected)<1e-10);
 assert.equal(statusEffects(creep,g.time,g).filter(s=>s.id==='flagbearerAura').length,1);
 creep.hp-=50;const hp=creep.hp;g._index();g._tick(.05);assert.ok(Math.abs(creep.hp-hp-(3+creep.hpRegen)*.05)<1e-7,'one aura, three extra HP per second, fixed simulation tick');
 creep.x=8700.001;assert.equal(flagbearerAura(g,creep),null);creep.x=8700;
 source.dead=true;source.hp=0;assert.equal(flagbearerAura(g,creep).sourceId,second.id);
 second.dead=true;second.hp=0;assert.equal(flagbearerAura(g,creep),null);assert.equal(statusEffects(creep,g.time,g).some(s=>s.id==='flagbearerAura'),false);
});

test('flagbearer growth and resistance apply to damage and survive save/restore',()=>{
 assert.equal(flagbearerMagicResistance(449.999),0);assert.equal(flagbearerMagicResistance(450),4);assert.equal(flagbearerMagicResistance(900),8);assert.equal(flagbearerMagicResistance(100000),60);
 const g=new Game();g.time=450;const source=g._unit('creep',0,8000,8000,LANE_CREEPS.flagbearer),creep=g._unit('creep',0,8000,8000,LANE_CREEPS.melee);g.entities.push(source,creep);
 const before=creep.hp,resistance=g.combatStats(creep).magicResistance;g.damage(creep,100,null,'magical');assert.ok(Math.abs(before-creep.hp-100*(1-resistance))<1e-7);
 const restored=restoreMatch(parseMatch(serializeMatch(g,0))),unit=restored.entities.find(e=>e.id===creep.id);assert.equal(flagbearerAura(restored,unit).magicResistance,.04);assert.equal(unitSkill(restored,restored.entities.find(e=>e.id===source.id),'flagbearer_creep_aura_effect').rows.find(([k])=>k.includes('魔法抗性'))[1],'4');
 const hp=creep.hp;g.paused=true;g.step(1);assert.equal(creep.hp,hp);
});

test('render bounds optimization preserves visible models, ordering and offscreen aura sources',()=>{
 const g=new Game(),player=g.player,camera={x:8000,y:8000},halfW=1200,halfH=700;
 const ward=g._unit('ward',0,9800,8000,{healRadius:2000});g.entities.push(ward);
 for(let i=0;i<300;i++)g.entities.push(g._unit('creep',i%2,(i*977)%16000,(i*751)%16000,{dead:i%7===0,statuses:i%9===0?{hidden:{invisible:true,startedAt:0,until:100}}:{}}));
 g.time=10;
 const oldModels=g.entities.filter(e=>(!e.dead||['tower','barracks','ancient','fountain','filler'].includes(e.kind))&&(e.team===g.player.team||g.canSee(g.player,e))&&Math.abs(e.x-camera.x)<=halfW+450&&Math.abs(e.y-camera.y)<=halfH+450).sort((a,b)=>a.y-b.y);
 const oldAuras=g.entities.filter(e=>!e.dead&&(e.team===g.player.team||g.canSee(g.player,e))&&Math.abs(e.x-camera.x)<=halfW+Math.max(450,unitAuraRadius(e,g.time))&&Math.abs(e.y-camera.y)<=halfH+Math.max(450,unitAuraRadius(e,g.time)));
 const original=g.canSee;let queries=0;g.canSee=function(...args){queries++;return original.apply(this,args);};const optimized=visibleRenderUnits(g,player,camera,halfW,halfH);
 assert.deepEqual(optimized.entities,oldModels);assert.deepEqual(optimized.auraEntities,oldAuras);assert.ok(!optimized.entities.includes(ward));assert.ok(optimized.auraEntities.includes(ward));assert.ok(queries<g.entities.length/2);
});

test('drafted teams, collision, tactics and advancing lanes preserve their complete deterministic simulation state',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/simulation-with-random-drafts.json',import.meta.url)));
 for(const {config,steps,dt,sha256} of fixture.cases){const g=new Game(config);g.moveTo(7200,7600);for(let i=0;i<steps;i++)g.step(dt);assert.equal(createHash('sha256').update(serializeMatch(g,0)).digest('hex'),sha256,JSON.stringify(config));}
});

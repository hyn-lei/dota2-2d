import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { statusEffects } from '../src/status-ui.js';
import { addStatus,applyDispel,auraManaRegen } from '../src/hero-runtime.js';
import { createMeta } from '../src/inventory.js';
import { encodeMessage,decodeMessage } from '../src/network-protocol.js';

function arena(hero='drow_ranger'){
 const g=new Game({hero,seed:42}),p=g.player;
 g.entities=g.entities.filter(e=>e.kind==='hero');g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 for(const e of g.entities)Object.assign(e,{x:10400+(e.team?2000:0),y:10400,aiTimer:Infinity,attackCooldown:999,abilityLevels:[0,0,0,0],cooldowns:[999,999,999,999]});
 g._index();return {g,p};
}
const ids=(g,h=g.player)=>statusEffects(h,g.time,g).map(s=>s.id);

test('Arcane Aura display follows the actual learned source, proximity and source death',()=>{
 const {g,p}=arena(),maiden=g.entities.find(e=>e.team===0&&e.heroId==='crystal_maiden');
 assert.ok(maiden);assert.ok(!ids(g).includes('arcaneAura'));
 maiden.abilityLevels[2]=2;const near=statusEffects(p,g.time,g).find(s=>s.id==='arcaneAura');
 assert.equal(near.image,'assets/abilities/crystal_maiden_brilliance_aura.png');
 assert.ok(near.description.includes(String(Number((auraManaRegen(g,p)-p.manaRegen).toFixed(1)))));
 maiden.x+=4000;assert.ok(ids(g).includes('arcaneAura'),'global effect stays outside proximity');
 assert.notEqual(statusEffects(p,g.time,g).find(s=>s.id==='arcaneAura').description,near.description);
 maiden.dead=true;assert.ok(!ids(g).includes('arcaneAura'));
});

test('Marksmanship appears only when learned and enabled; break, nearby visible heroes and Glacier govern it',()=>{
 const {g,p}=arena(),enemy=g.entities.find(e=>e.team===1);assert.ok(!ids(g).includes('marksmanship'));
 p.abilityLevels[3]=1;assert.ok(ids(g).includes('marksmanship'));
 enemy.x=p.x+250;enemy.y=p.y;assert.ok(!ids(g).includes('marksmanship'));
 enemy.x=p.x+301;assert.ok(ids(g).includes('marksmanship'));
 addStatus(g,p,'itemBreak',{name:'破坏',break:true,duration:4});assert.ok(!ids(g).includes('marksmanship'));
 applyDispel(g,p);assert.ok(ids(g).includes('marksmanship'));
 enemy.x=p.x+200;p.hasShard=p.consumedShard=true;assert.ok(g.castExtra('drow_ranger_glacier',p).ok);for(let i=0;i<10;i++)g.step(.05);
 assert.ok(ids(g).includes('glacier'));assert.ok(ids(g).includes('marksmanship'));
 g.itemZones=[];assert.ok(!ids(g).includes('glacier'));assert.ok(!ids(g).includes('marksmanship'));
});

test('Precision Aura uses the actual granted agility and stops after leaving its radius',()=>{
 const {g,p}=arena(),ally=g.entities.find(e=>e.team===0&&e.range>200&&e!==p);
 assert.ok(ally);g.step(.05);
 assert.ok(ids(g).includes('trueshot'));assert.ok(ids(g,ally).includes('trueshot'));
 assert.match(statusEffects(ally,g.time,g).find(s=>s.id==='trueshot').description,new RegExp(String(Number(ally.trueshotAgility.toFixed(1)))));
 ally.x=p.x+2000;g.step(.05);assert.ok(!ids(g,ally).includes('trueshot'));
 addStatus(g,p,'itemBreak',{break:true,duration:2});g.step(.05);assert.ok(!ids(g).includes('trueshot'));
});

test('Item aura indicators follow the simulation update, backpack and muted source without granting stats twice',()=>{
 const {g,p}=arena('axe'),ally=g.entities.find(e=>e.team===0&&e!==p);
 p.inventory=['vladmir'];p.inventoryMeta=[createMeta(g,p,'vladmir')];g._refreshHero(p);g.step(.3);
 assert.ok(ids(g,ally).includes('itemAura:vladmir:ally'));
 const before=structuredClone(p),combat=g.combatStats(p);statusEffects(p,g.time,g);
 assert.deepEqual(p,before,'projection does not mutate the hero');assert.deepEqual(g.combatStats(p),combat);
 addStatus(g,p,'mute',{muted:true,duration:3});g.step(.3);assert.ok(!ids(g,ally).includes('itemAura:vladmir:ally'));
 applyDispel(g,p);p.backpack=p.inventory;p.backpackMeta=p.inventoryMeta;p.inventory=[];p.inventoryMeta=[];g.step(.3);
 assert.ok(!ids(g,ally).includes('itemAura:vladmir:ally'));
});

test('Hostile item auras, Radiance burn and permanent Culling armor have polarity and original art',()=>{
 const {g,p}=arena('axe'),enemy=g.entities.find(e=>e.team===1);enemy.x=p.x+200;
 enemy.inventory=['radiance','assault'];enemy.inventoryMeta=enemy.inventory.map(id=>createMeta(g,enemy,id));g._refreshHero(enemy);g.step(.3);
 const effects=statusEffects(p,g.time,g);
 assert.equal(effects.find(s=>s.id==='radianceBurn').positive,false);
 assert.equal(effects.find(s=>s.id==='itemAura:assault:enemy').positive,false);
 p.abilityLevels[3]=1;p.cullingStacks=3;const armor=statusEffects(p,g.time,g).find(s=>s.id==='cullingArmor');
 assert.equal(armor.stacks,3);assert.equal(armor.remaining,null);
 enemy.x+=3000;g.step(.3);assert.ok(!ids(g).includes('radianceBurn'));assert.ok(!ids(g).includes('itemAura:assault:enemy'));
});

test('Healing Ward, consumed upgrades and forced movement appear from authoritative non-status state',()=>{
 const {g,p}=arena('juggernaut');p.abilityLevels[1]=1;p.mana=p.maxMana=1000;p.cooldowns[1]=0;
 assert.ok(g.cast(1,p).ok);for(let i=0;i<10;i++)g.step(.05);assert.ok(ids(g).includes('healingWard'));
 const ward=g.entities.find(e=>e.kind==='ward');ward.dead=true;assert.ok(!ids(g).includes('healingWard'));
 Object.assign(p,{moonShard:true,consumedScepter:true,consumedShard:true,forcedMotion:{startedAt:g.time,until:g.time+1}});
 for(const id of ['consumed:moon_shard','consumed:ultimate_scepter_2','consumed:aghanims_shard','forcedMotion'])assert.ok(ids(g).includes(id));
 g.time+=1;assert.ok(!ids(g).includes('forcedMotion'));
});

test('Fade-in remains visible; an ordinary scheduled status waits for its start; dispel and death remove icons',()=>{
 const {g,p}=arena();p.inventory=['glimmer_cape'];p.inventoryMeta=[createMeta(g,p,'glimmer_cape')];g._refreshHero(p);p.mana=p.maxMana;
 assert.ok(g.useItem(0,p).ok);assert.ok(ids(g).some(id=>id.includes('glimmer_cape')));
 addStatus(g,p,'futureSlow',{startedAt:g.time+1,duration:3,slowPct:20});assert.ok(!ids(g).includes('futureSlow'));
 g.time+=1;assert.ok(ids(g).includes('futureSlow'));applyDispel(g,p);assert.ok(!ids(g).includes('futureSlow'));
 p.dead=true;p.respawnTimer=4;assert.deepEqual(ids(g),['dead']);
});

test('All explicit modifiers survive snapshot transport and disappear exactly at simulation expiration',()=>{
 const {g,p}=arena();g.time=10;
 for(const [id,fields]of Object.entries({drowFrost:{slowPct:20},drowGustSilence:{silenced:true},ogreBloodlust:{positive:true,attackSpeed:30},unknownFutureModifier:{positive:false,stacks:6}}))addStatus(g,p,id,{name:id,duration:4,...fields});
 const snapshot=decodeMessage(encodeMessage(p));
 const expected=statusEffects(p,g.time,g);assert.deepEqual(statusEffects(snapshot,g.time,g),expected);
 for(const id of ['drowFrost','drowGustSilence','ogreBloodlust','unknownFutureModifier'])assert.ok(ids(g).includes(id));
 assert.deepEqual(statusEffects(p,10,g),expected,'pausing keeps timers stable');g.time=14;
 for(const id of ['drowFrost','drowGustSilence','ogreBloodlust','unknownFutureModifier'])assert.ok(!ids(g).includes(id));
});

test('Building protection, backdoor protection and modifier details follow combat state',()=>{
 const {g,p}=arena(),tower=g._unit('tower',1,11000,11000,{tier:3,lane:0,backdoorActive:true});g.entities.push(tower);
 assert.ok(ids(g,tower).includes('backdoorProtection'));tower.backdoorActive=false;assert.ok(!ids(g,tower).includes('backdoorProtection'));
 const front=g._unit('tower',1,10800,11000,{tier:2,lane:0});g.entities.push(front);assert.ok(ids(g,tower).includes('structureProtection'));
 front.dead=true;assert.ok(!ids(g,tower).includes('structureProtection'));
 addStatus(g,p,'drowGustSilence',{name:'狂风沉默',silenced:true,duration:3});assert.equal(statusEffects(p,g.time,g).find(s=>s.id==='drowGustSilence').description,'无法施放技能。');
});

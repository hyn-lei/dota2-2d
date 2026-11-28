import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {heal} from '../src/item-common.js';
import {parseMatch,restoreMatch,serializeMatch} from '../src/game-save.js';
import {statusEffects} from '../src/status-ui.js';

const buildingKinds=['tower','barracks','filler','ancient','fountain'];
const damagedHp=200;

function scene({hero='juggernaut',item=null,team=0}={}){
 const g=new Game({hero});
 const p=team===0?g.player:g._makeHero(hero,team,1,true,0);
 const buildingsFor=side=>buildingKinds.map(kind=>g.entities.find(e=>e.kind===kind&&e.team===side&&(kind!=='tower'||e.tier===1)));
 const allies=buildingsFor(team),opponents=buildingsFor(1-team);
 g.entities=[p,...allies,...opponents];
 g.controlledHeroId=p.id;
 Object.assign(p,{x:10400,y:10400,attackCooldown:Infinity,abilityLevels:[0,1,1,0]});
 for(const [index,building] of allies.entries())Object.assign(building,{x:p.x+200,y:p.y+index*30,hp:damagedHp,hpRegen:0,attackCooldown:Infinity});
 for(const [index,building] of opponents.entries())Object.assign(building,{x:p.x+250,y:p.y+index*30,hp:damagedHp,hpRegen:0,attackCooldown:Infinity});
 if(item){p.inventory=[item];p.inventoryMeta=[];g._refreshHero(p);}
 p.mana=p.maxMana;
 g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 g._index();
 return {g,p,allies,opponents};
}

function expectHealth(buildings,expected){
 for(const building of buildings){
  const hp=typeof expected==='function'?expected(building):expected;
  assert.ok(Math.abs(building.hp-hp)<1e-6,`team ${building.team} ${building.kind}: ${building.hp} != ${hp}`);
 }
}

for(const [team,side] of ['Radiant','Dire'].entries()){
 test(`${side} buildings gain two health per second from allied Headdress and stop outside its range`,()=>{
  const {g,p,allies,opponents}=scene({item:'headdress',team});
  g.step(1);
  expectHealth(allies,damagedHp+2);
  expectHealth(opponents,damagedHp);
  p.x=allies[0].x-1201;
  g.step(.3);
  const health=new Map(allies.map(building=>[building.id,building.hp]));
  g.step(1);
  expectHealth(allies,building=>health.get(building.id));
 });

 test(`${side} Mekansm instantly heals all nearby allied building types`,()=>{
  const {g,p,allies,opponents}=scene({item:'mekansm',team});
  assert.equal(g.useItem(0,p).ok,true);
  expectHealth(allies,damagedHp+250);
  expectHealth(opponents,damagedHp);
 });

 test(`${side} targeted heals cannot restore buildings or spend Holy Locket charges on them`,()=>{
  const {g,p,allies}=scene({item:'holy_locket',team});
  const meta=g.itemState(0).meta;
  meta.charges=5;
  for(const building of allies){
   building.x-=500;
   assert.equal(g.useItem(0,building).ok,false,building.kind);
   building.x+=500;
   assert.equal(meta.charges,5);
   assert.equal(heal(g,building,600,p),0);
  }
  expectHealth(allies,damagedHp);
 });
}

test('Healing Ward restores all allied building types over time and caps at maximum health',()=>{
 const {g,p,allies,opponents}=scene();
 assert.equal(g.cast(1,p).ok,true);
 g.step(.5);
 assert.ok(g.entities.some(unit=>unit.kind==='ward'));
 const health=new Map(allies.map(building=>[building.id,building.hp]));
 g.step(1);
 expectHealth(allies,building=>health.get(building.id)+building.maxHp*.02);
 expectHealth(opponents,damagedHp);
 for(const building of allies)building.hp=building.maxHp-1;
 g.step(.2);
 expectHealth(allies,building=>building.maxHp);
});

test('a friendly flagbearer regenerates buildings without raising their magic resistance',()=>{
 const {g,p,allies,opponents}=scene({team:1});
 g.time=480;g.wave=4;g._spawnWave();
 const flagbearer=g.entities.find(e=>e.team===p.team&&e.kind==='creep'&&e.flagbearer);
 assert.ok(flagbearer);
 g.entities=g.entities.filter(e=>e.kind!=='creep'||e===flagbearer);
 Object.assign(flagbearer,{x:p.x+100,y:p.y,speed:0,attackCooldown:Infinity});
 const resistance=allies.map(building=>g.combatStats(building).magicResistance);
 g.step(1);
 expectHealth(allies,damagedHp+3);
 expectHealth(opponents,damagedHp);
 assert.deepEqual(allies.map(building=>g.combatStats(building).magicResistance),resistance);
});

test('ground-targeted Seeds of Serenity heals all allied building types inside its area',()=>{
 const {g,p,allies,opponents}=scene({team:1});
 p.neutralItem='seeds_of_serenity';g._refreshHero(p);p.mana=p.maxMana;
 assert.equal(g.useItem(0,allies[0],'neutral').ok,true);
 g.step(1);
 expectHealth(allies,damagedHp+3);
 expectHealth(opponents,damagedHp);
 for(const building of allies)building.x+=401;
 g.step(1);
 expectHealth(allies,damagedHp+3);
});

test('Guardian Greaves active heals buildings without restoring their mana and preserves the caster status',()=>{
 const {g,p,allies,opponents}=scene({item:'guardian_greaves'});
 for(const building of allies)Object.assign(building,{mana:0,maxMana:500});
 assert.equal(g.useItem(0,p).ok,true);
 expectHealth(allies,building=>Math.min(building.maxHp,damagedHp+325));
 expectHealth(opponents,damagedHp);
 for(const building of allies){
  assert.equal(building.mana,0,building.kind);
  assert.equal(statusEffects(building,g.time,g).some(effect=>effect.id==='mendLock'),false);
 }
 assert.equal(statusEffects(p,g.time,g).some(effect=>effect.id==='mendLock'),true);
});

test('Divine Favor supplies hidden regeneration to allied buildings',()=>{
 const {g,p,allies,opponents}=scene({hero:'chen',team:1});
 p.abilityLevels[2]=4;
 g.step(1);
 expectHealth(allies,damagedHp+6);
 expectHealth(opponents,damagedHp);
 for(const building of allies)assert.equal(statusEffects(building,g.time,g).some(effect=>effect.name==='神力恩泽光环'),false);
});

test('a controlled creature regenerates allied buildings without granting lifesteal',()=>{
 const {g,p,allies,opponents}=scene();
 const creature=g._unit('neutral',p.team,p.x,p.y,{ownerId:p.id,abilities:['spawnlord_aura'],attackCooldown:Infinity});
 g.entities.push(creature);
 g.step(1);
 expectHealth(allies,damagedHp+9);
 expectHealth(opponents,damagedHp);
 for(const building of allies)assert.equal(building.statuses['creatureAura:spawnlord_aura'].creatureLifesteal,undefined);
});

test('a restored legacy building aura still heals but stops reporting the hidden recovery',()=>{
 const {g,allies}=scene({item:'headdress'});
 g.step(.05);
 for(const building of allies){
  building.itemAura.hpRegen=2;
  delete building.itemAura.hiddenHpRegen;
 }
 g.selectedId=allies[0].id;
 const restored=restoreMatch(parseMatch(serializeMatch(g)));
 const building=restored.selected,hp=building.hp;
 assert.equal(restored.paused,true);
 assert.equal(building.itemAura.hpRegen||0,0);
 restored.setPaused(false);
 restored.step(.05);
 expectHealth([building],hp+.1);
});

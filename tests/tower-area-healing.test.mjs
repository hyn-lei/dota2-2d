import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {heal} from '../src/item-common.js';

function scene(hero='juggernaut',item=null){
 const g=new Game({hero}),p=g.player;
 const [tower,enemy]=[p.team,1-p.team].map(team=>g.entities.find(e=>e.kind==='tower'&&e.team===team&&e.tier===1));
 g.entities=[p,tower,enemy];
 Object.assign(p,{x:10400,y:10400,attackCooldown:Infinity,abilityLevels:[0,1,1,0]});
 for(const [index,building]of [tower,enemy].entries())Object.assign(building,{x:p.x+150+index*100,y:p.y,hp:500,attackCooldown:Infinity});
 if(item){p.inventory=[item];p.inventoryMeta=[];g._refreshHero(p);}
 p.mana=p.maxMana;
 g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 g._index();
 return {g,p,tower,enemy};
}

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

test('allied towers gain two health per second from Headdress and stop outside its range',()=>{
 const {g,p,tower,enemy}=scene('juggernaut','headdress');
 g.step(1);
 close(tower.hp,502);
 close(enemy.hp,500);
 p.x=tower.x-1201;
 g.step(.3);
 const hp=tower.hp;
 g.step(1);
 close(tower.hp,hp);
});

test('Healing Ward restores an allied tower over time and caps at maximum health',()=>{
 const {g,p,tower,enemy}=scene();
 assert.equal(g.cast(1,p).ok,true);
 g.step(.5);
 assert.ok(tower.hp>500);
 close(enemy.hp,500);
 tower.hp=tower.maxHp-1;
 g.step(.2);
 close(tower.hp,tower.maxHp);
});

test('Mekansm heals an allied tower immediately and leaves the enemy tower untouched',()=>{
 const {g,p,tower,enemy}=scene('juggernaut','mekansm');
 assert.equal(g.useItem(0,p).ok,true);
 close(tower.hp,750);
 close(enemy.hp,500);
});

test('targeted health restoration cannot heal a tower or spend Holy Locket charges on it',()=>{
 const {g,p,tower}=scene('juggernaut','holy_locket');
 const before=g.itemState(0).meta.charges;
 assert.equal(g.useItem(0,tower).ok,false);
 assert.equal(g.itemState(0).meta.charges,before);
 assert.equal(heal(g,tower,600,p),0);
 close(tower.hp,500);
});

test('tower gains regeneration from a friendly flagbearer without gaining its magic resistance',()=>{
 const {g,p,tower}=scene();
 g.time=480;g.wave=4;g._spawnWave();
 const flagbearer=g.entities.find(e=>e.team===p.team&&e.kind==='creep'&&e.flagbearer);
 assert.ok(flagbearer);
 g.entities=g.entities.filter(e=>e.kind!=='creep'||e===flagbearer);
 Object.assign(flagbearer,{x:tower.x-100,y:tower.y,speed:0,attackCooldown:Infinity});
 const resistance=g.combatStats(tower).magicResistance;
 g.step(1);
 close(tower.hp,503);
 assert.equal(g.combatStats(tower).magicResistance,resistance);
});

test('ground-targeted Seeds of Serenity restores a tower only inside its healing area',()=>{
 const {g,p,tower,enemy}=scene();
 p.neutralItem='seeds_of_serenity';g._refreshHero(p);p.mana=p.maxMana;
 assert.equal(g.useItem(0,tower,'neutral').ok,true);
 g.step(1);
 close(tower.hp,503);
 close(enemy.hp,500);
});

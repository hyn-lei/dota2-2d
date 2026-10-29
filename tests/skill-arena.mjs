import { Game } from '../src/engine.js';
export function arena(hero='kunkka',ranks=[1,1,1,1]){
 const g=new Game({hero});g._spawnWave();
 const p=g.player,e=g.entities.find(e=>e.kind==='hero'&&e.team===1&&e.heroId==='crystal_maiden'),c=g.entities.find(e=>e.kind==='creep'&&e.team===1&&!e.ranged);
 g.entities=[p,e,c];g.nextWave=Infinity;g.nextNeutralSpawn=Infinity;g.roshanRespawnAt=Infinity;
 Object.assign(p,{x:10400,y:10400,abilityLevels:ranks,skillPoints:0,maxMana:2000,mana:2000,hpRegen:0,manaRegen:0,attackCooldown:999});
 Object.assign(e,{x:10540,y:10400,maxHp:4000,hp:4000,armor:0,magicResistance:0,hpRegen:0,speed:0,damage:1,aiTimer:Infinity,attackCooldown:999,cooldowns:[999,999,999,999],abilityLevels:[0,0,0,0],skillPoints:0});
 Object.assign(c,{x:10780,y:10400,maxHp:4000,hp:4000,armor:0,magicResistance:0,hpRegen:0,speed:0,damage:1,attackCooldown:999});
 g._index();return {g,p,e,c};
}

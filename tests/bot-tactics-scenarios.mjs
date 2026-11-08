import {Game} from '../src/engine.js';
import * as Inventory from '../src/inventory.js';

export function tacticalArena(team=0,difficulty='normal',count=1){
  const g=new Game({difficulty,seed:812});g.entities=[];
  const bots=Array.from({length:count},(_,i)=>g._makeHero(['axe','crystal_maiden','windranger','kunkka','ogre_magi'][i%5],team,1,false,i));
  const enemy=g._makeHero('axe',1-team,1,true,0);
  for(const [i,h] of [...bots,enemy].entries())Object.assign(h,{x:10400+i*90,y:10400,
    isHuman:h===enemy,aiTimer:h===enemy?Infinity:0,abilityLevels:[0,0,0,0],skillPoints:0,talentPoints:0,
    gold:0,mana:200,hpRegen:0,manaRegen:0,attackCooldown:999,botShop:{nextAt:Infinity,needsShop:false}});
  Object.assign(g,{nextWave:Infinity,nextNeutralSpawn:Infinity,roshanRespawnAt:Infinity,nextBuildingCheck:Infinity});
  for(const c of g.camps)c.nextSpawn=Infinity;
  g._index();return {g,bots,bot:bots[0],enemy};
}
export function supplyTp(g,h){h.tp=['tpscroll'];h.tpMeta=[Inventory.createMeta(h,'tpscroll')];h.mana=200;}
export function tower(g,team,x,y=10400,stats={}){
  const t=g._unit('tower',team,x,y,{range:700,maxHp:1800,damage:90,tier:1,lane:2,attackCooldown:999,...stats});
  g.entities.push(t);g._index();return t;
}
export function advanceBots(g,bots,seconds){
  const samples=[];
  for(let i=0;i<Math.ceil(seconds/.05);i++){
    g.time+=.05;g._index();for(const h of bots){h.moving=false;g._botTick(h,.05);}
    samples.push(bots.map(h=>({x:h.x,y:h.y,mode:h.botState?.mode,target:h.targetId})));
  }
  return samples;
}

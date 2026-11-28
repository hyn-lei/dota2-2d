import {readFileSync} from 'node:fs';
import {Game} from '../src/engine.js';
import {heroNetWorth} from '../src/hero-kills.js';
import {isLaneCreep} from '../src/deny-runtime.js';

const difficulty=process.argv[2]||'nightmare';
const seconds=Number(process.argv[3]||20);
const seed=Number(process.argv[4]||42);
const draftPath=process.argv[5];
if(!['nightmare','hell'].includes(difficulty)||!Number.isFinite(seconds)||seconds<=0||
 !Number.isInteger(seed)||seed<0||seed>0xffffffff){
 throw Error('Usage: node tests/bot-comparison-sample.mjs <nightmare|hell> <seconds> <seed> [draft.json]');
}
const draft=draftPath?JSON.parse(readFileSync(draftPath,'utf8')):null;
if(draft){
 const ids=[...(draft.allies||[]),...(draft.enemies||[])].map(e=>e.heroId);
 if(ids.length!==10||new Set(ids).size!==10)throw Error('A comparison draft requires ten different heroes');
}
const game=new Game({hero:draft?.allies[0]?.heroId||'weaver',seed,difficulty,draft});
game.controlledHeroId=game.player.id;
game.player.isPlayer=false;
game.player.controller='ai';
const heroes=game.entities.filter(unit=>unit.kind==='hero'),goals=[],events=[],checkpoints=[];
const initial=heroes.map(hero=>({id:hero.id,hero:hero.heroId,team:hero.team,lane:hero.lane,role:hero.draftRole,
 profile:hero.team===1?difficulty:hero.aiDifficulty==='hard'?'hard':'normal',
 gold:hero.gold,hp:hero.maxHp,mana:hero.maxMana,damage:hero.damage,armor:hero.armor,
 items:hero.inventory.filter(Boolean),teleports:hero.tp.filter(Boolean)}));
const previousGoals=new Map();
const channels=new Map();
const laneLastHits=new Map();
const time=()=>Math.round(game.time*100)/100;

function captureCheckpoint(){
 const wealth=heroNetWorth(game,heroes);
 return {
  time:time(),
  score:[...game.score],
  heroes:heroes.map(hero=>({id:hero.id,lastHits:hero.lastHits,laneLastHits:laneLastHits.get(hero.id)||0,
   denies:hero.denies||0,kills:hero.kills,assists:hero.assists,deaths:hero.deaths,level:hero.level,
   gold:Math.round(hero.gold),netWorth:Math.round(wealth.get(hero.id)),shopSpent:hero.botShop?.spent||0,
   inventory:hero.inventory.filter(Boolean)}))
 };
}

const kill=game._kill.bind(game);
game._kill=(target,source)=>{
 const wasAlive=!target.dead,owner=game._combatOwner(source);
 kill(target,source);
 if(!wasAlive||!target.dead)return;
 if(isLaneCreep(target)&&owner?.kind==='hero'&&owner.team!==target.team){
  laneLastHits.set(owner.id,(laneLastHits.get(owner.id)||0)+1);
 }
 if(['tower','barracks','ancient'].includes(target.kind)||target.isRoshan||target.isTormentor){
  events.push({time:time(),type:target.isRoshan?'roshan':target.isTormentor?'tormentor':target.kind,
   objective:target.id,lane:target.lane,team:target.team,killer:owner?.id??null});
 }
};

checkpoints.push(captureCheckpoint());
let nextCheckpoint=300;
while(game.status==='playing'&&game.time<seconds-1e-7){
 const pendingObjectives=game.worldObjectives.filter(o=>Boolean(o.rune)||o.objectiveType==='wisdom').map(o=>({
  site:o,rune:o.rune,collectedPeriod:o.collectedPeriod,runePeriod:o.runePeriod
 }));
 game.step(Math.min(.05,seconds-game.time));
 for(const {site,rune,collectedPeriod,runePeriod} of pendingObjectives){
  const runePicked=rune&&!site.rune&&site.runePeriod===runePeriod;
  if(runePicked||site.collectedPeriod!==collectedPeriod){
   events.push({time:time(),type:site.objectiveType,objective:site.id,rune});
  }
 }
 for(const hero of heroes){
  const current=hero.channel||hero.freezingField||hero.itemChannel;
  const old=channels.get(hero.id);
  if(old&&old!==current){
   events.push({time:time(),type:'channel-ended',hero:hero.id,kind:old.kind,
    scheduledEnd:old.until,endedEarly:game.time+.05<old.until});
   channels.delete(hero.id);
  }
  if(current&&current!==old){
   events.push({time:time(),type:'channel-started',hero:hero.id,kind:current.kind,scheduledEnd:current.until});
   channels.set(hero.id,current);
  }
  const key=hero.botState?.objectiveKey||null;
  if(key===(previousGoals.get(hero.id)||null))continue;
  previousGoals.set(hero.id,key);
  goals.push({time:time(),hero:hero.id,mode:hero.botState.mode,goal:key});
 }
 if(game.time+1e-7>=nextCheckpoint){checkpoints.push(captureCheckpoint());nextCheckpoint+=300;}
}
const final=captureCheckpoint();
if(checkpoints.at(-1).time!==final.time)checkpoints.push(final);
console.log(JSON.stringify({scope:'local',patch:'7.42',difficulty,seed,fixedDraft:Boolean(draft),seconds:time(),initial,goals,events,checkpoints,
 score:game.score,winner:game.winner??null,status:game.status,completed:game.status!=='playing',heroes:final.heroes},null,2));

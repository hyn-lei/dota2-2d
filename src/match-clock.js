import {RULES} from './unit-data.js';
import {ITEM_BY_ID} from './item-data.js';
import {stockStatus} from './inventory.js';
import {resetBotTiming} from './bot-ai.js';

export const MAX_MATCH_MINUTES=500;
export const MAX_MATCH_SECONDS=MAX_MATCH_MINUTES*60;
export const hasExpiredMatchTime=game=>Boolean(game&&!game.isNetwork&&Number.isFinite(game.time)&&game.time>MAX_MATCH_SECONDS);

// Only live state is traversed. Definitions and navigation grids are not clocks.
const roots=['entities','effects','pendingSpells','itemZones','plantedTrees','feed'];
const skip=new Set(['skill','item','definition','skillCache','innateCache','navPath','navGoal','navigation','collisions','grid']);
const dictionaries=new Set(['abilityCooldowns','itemBarrierCooldowns','drowWaveHits','dwell','lastDamagers']);
const timestamps=new Set(['time','until','deathTime','targetLife','lastTick','nextTick','nextSlash','nextExplosion','extraCooldownTick','nextTornadoTick','nextBloodlustCheck','nextBuildingCheck','nextProc','nextCrozierSteal','clearSince']);
const timestamp=key=>timestamps.has(key)||/(?:At|Until)$/.test(key);

function rebase(value,delta,seen,allNumbers=false){
 if(!value||typeof value!=='object'||seen.has(value))return;
 seen.add(value);
 if(value instanceof Set){for(const entry of value)rebase(entry,delta,seen);return;}
 const entries=value instanceof Map?[...value]:Object.entries(value);
 for(const [key,entry]of entries){
  if(skip.has(key)||/cache/i.test(key))continue;
  if(Number.isFinite(entry)&&(allNumbers||timestamp(key))){
   // Some permanent units use zero as an absent expiry, rather than an expired clock.
   if(key==='expiresAt'&&entry===0)continue;
   if(value instanceof Map)value.set(key,entry+delta);else value[key]=entry+delta;
  }else rebase(entry,delta,seen,dictionaries.has(key));
 }
}

function rebaseStocks(game,oldTime,delta){
 for(const [key,stock]of Object.entries(game.shopStocks||{})){
  const colon=key.indexOf(':'),team=Number(key.slice(0,colon)),id=key.slice(colon+1),item=ITEM_BY_ID[id];
  if(!item?.maxStock)continue;
  const start=item.initialStockTime||0;
  if(start&&game.time<start){stock.available=0;stock.nextAt=start;}
  else if(!(start&&oldTime<start&&stock.nextAt===start)&&Number.isFinite(stock.nextAt))stock.nextAt+=delta;
  // Initial unlocks follow the match clock; ongoing refill timers retain their remaining time.
  stockStatus(game,{team},id);
 }
}

export function rebaseMatchTime(game,seconds){
 const oldTime=game.time,delta=seconds-oldTime,seen=new WeakSet();
 for(const key of roots)rebase(game[key],delta,seen);
 for(const key of Object.keys(game))if(key!=='time'&&Number.isFinite(game[key])&&timestamp(key))game[key]+=delta;
 for(const [id,until]of game.cutTrees||[])if(Number.isFinite(until))game.cutTrees.set(id,until+delta);
 game.time=seconds;
 // Skip historical spawns and let the next actual wave use the selected time's growth.
 const interval=RULES.laneWaveInterval;
 game.wave=Math.floor(seconds/interval)+1;game.nextWave=game.wave*interval;
 game.nextNeutralSpawn=(Math.floor(seconds/60)+1)*60;
 // Overdue scheduler sentinels stay due and remain valid when rewinding to zero.
 game.nextBuildingCheck=Math.max(seconds,game.nextBuildingCheck);
 game.roshanRespawnAt=Math.max(seconds,game.roshanRespawnAt);
 for(const camp of game.camps)camp.nextSpawn=game.nextNeutralSpawn;
 rebaseStocks(game,oldTime,delta);resetBotTiming(game);game._index();
}

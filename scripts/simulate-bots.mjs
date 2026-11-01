import { Game } from '../src/engine.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const seconds=Number(process.env.BOT_SIM_SECONDS||900);
const tiers=(process.env.BOT_SIM_TIERS||'easy,normal,hard').split(',');
const results=[];mkdirSync('artifacts',{recursive:true});
for(const difficulty of tiers){
  const g=new Game({difficulty,seed:42}),started=performance.now(),samples=[];
  while(g.time<seconds-1e-6&&g.status==='playing'){
    g.step(Math.min(15,seconds-g.time));
    if(Math.round(g.time)%300===0||g.status!=='playing'){
      const sample={time:Math.round(g.time),score:[...g.score],towers:g.entities.filter(e=>e.kind==='tower'&&e.dead).length};samples.push(sample);console.log(JSON.stringify({difficulty,...sample}));
    }
  }
  const heroes=g.entities.filter(e=>e.kind==='hero'&&!e.isPlayer).map(h=>({hero:h.heroId,team:h.team,level:h.level,kills:h.kills,deaths:h.deaths,lastHits:h.lastHits,gold:Math.round(h.gold),
    equipment:h.inventory.filter(Boolean),backpack:h.backpack.filter(Boolean),stash:h.stash.filter(Boolean),goal:h.botShop?.goal,purchases:h.botShop?.purchases||0,spent:h.botShop?.spent||0,mode:h.botState?.mode}));
  const result={difficulty,time:g.time,status:g.status,elapsedMs:Math.round(performance.now()-started),samples,heroes,
    finite:g.entities.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp)&&(e.gold===undefined||Number.isFinite(e.gold)&&e.gold>=0))};
  results.push(result);writeFileSync('artifacts/bot-simulation.json',JSON.stringify(results,null,2));
  if(!result.finite)throw Error(`${difficulty}: invalid simulation state`);
}
console.log(JSON.stringify({tiers:results.length,seconds,finite:results.every(r=>r.finite)}));

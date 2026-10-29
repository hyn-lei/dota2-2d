import { Game } from '../src/engine.js';
import fs from 'node:fs';
const g=new Game({seed:42});
const started=performance.now(),samples=[];
while(g.time<3600&&g.status==='playing'){
  g.step(30);
  if(Math.round(g.time)%600===0||g.status!=='playing'){
    const sample={time:Math.round(g.time),status:g.status,score:g.score.slice(),entities:g.entities.length,
      towersDestroyed:g.entities.filter(e=>e.kind==='tower'&&e.dead).length,
      barracksDestroyed:g.entities.filter(e=>e.kind==='barracks'&&e.dead).length};
    samples.push(sample);console.log(JSON.stringify(sample));
  }
}
const result={samples,status:g.status,time:g.time,elapsedMs:Math.round(performance.now()-started),
  finite:g.entities.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)&&Number.isFinite(e.y)),
  heroes:g.entities.filter(e=>e.kind==='hero').map(e=>({name:e.name,team:e.team,level:e.level,kills:e.kills,deaths:e.deaths,gold:Math.floor(e.gold),x:Math.round(e.x),y:Math.round(e.y),pathIndex:e.pathIndex}))};
fs.writeFileSync(process.argv[2]||'artifacts/simulation-741f.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,seconds:Math.round(result.time),elapsedMs:result.elapsedMs,finite:result.finite}));
if(!result.finite)process.exitCode=1;

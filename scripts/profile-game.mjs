import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
import {closeDevelopmentNotice} from '../tests/browser-helpers.mjs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}});
try{
 await mkdir('artifacts',{recursive:true});await page.goto(process.env.GAME_URL||'http://localhost:5193',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Game}=await import('/src/engine.js'),{Renderer}=await import('/src/renderer.js');for(const [type,name] of [[Game,'step'],[Renderer,'render'],[Renderer,'minimap']]){const original=type.prototype[name];type.prototype[name]=function(...args){if(name==='render'){window.g=args[0];window.r=this;}const start=performance.now(),result=original.apply(this,args);if(window.samples)(window.samples[name]??=[]).push(performance.now()-start);return result;};}});
 await page.locator('#start-game').click();await page.waitForFunction(()=>window.g?.time>.2);
 await page.evaluate(()=>{g.paused=true;g.time=180;g.nextWave=210;g.nextNeutralSpawn=240;g._spawnCamps();for(let i=0;i<4;i++)g._spawnWave();r.camera={x:8000,y:8000};r.followPlayer=false;g.paused=false;});
 await page.waitForTimeout(1000);
 const client=await page.context().newCDPSession(page);await client.send('Profiler.enable');await client.send('Profiler.start');
 await page.evaluate(()=>{window.samples={};window.frameTimes=[];window.frameStart=performance.now();window.measure=true;const frame=t=>{frameTimes.push(t-frameStart);frameStart=t;if(measure)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
 await page.waitForTimeout(7000);
 const {profile}=await client.send('Profiler.stop');await writeFile('artifacts/'+(process.argv[2]||'baseline')+'.cpuprofile',JSON.stringify(profile));
 const report=await page.evaluate(()=>{measure=false;const stats=a=>{a.sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};return {entities:g.entities.length,viewport:[innerWidth,innerHeight],time:g.time,timing:Object.fromEntries(Object.entries(samples).map(([k,a])=>[k,stats(a)])),frame:stats(frameTimes.slice(1))};});
 await writeFile('artifacts/'+(process.argv[2]||'baseline')+'-performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 const counts=new Map(),nodes=new Map(profile.nodes.map(n=>[n.id,n]));for(let i=0;i<profile.samples.length;i++){const n=nodes.get(profile.samples[i]),key=n.callFrame.functionName+' '+n.callFrame.url.split('/').at(-1)+':'+n.callFrame.lineNumber;counts.set(key,(counts.get(key)||0)+(profile.timeDeltas[i]||0));}console.log([...counts].sort((a,b)=>b[1]-a[1]).slice(0,25));
}finally{await browser.close();}

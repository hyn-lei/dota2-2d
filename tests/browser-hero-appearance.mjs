import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{
  const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
  Renderer.prototype.render=function(g,t){window.heroArtGame=g;window.heroArtRenderer=this;const start=performance.now(),result=render.call(this,g,t);if(window.heroRenderTimes)heroRenderTimes.push(performance.now()-start);return result;};
 });
 await page.locator('[data-hero="weaver"]').click();await page.locator('#start-game').click();
 await page.waitForFunction(()=>window.heroArtGame?.time>.1);
 await page.waitForFunction(async()=>{const {loadHeroSprites}=await import('/src/hero-sprites.js');const image=loadHeroSprites();return image?.complete&&image.naturalWidth>0;});
 const lineup=await page.evaluate(async()=>{
  const {HEROES}=await import('/src/data.js'),{createIllusions}=await import('/src/illusions.js');
  const g=heroArtGame,r=heroArtRenderer;g.paused=true;const ids=Object.keys(HEROES),units=ids.map((id,i)=>{
   const h=id===g.player.heroId?g.player:g._makeHero(id,0,1,false,i+1);
   Object.assign(h,{x:10400+(i%5-2)*200,y:10400+(Math.floor(i/5)-.5)*250,angle:-.7,moving:false,statuses:{},attackFlash:0});return h;
  });
  g.entities=[...units];g.selectedId=g.player.id;g._index();r.zoom=1.05;r.lookAt(10400,10400);
  const canvas=document.createElement('canvas');canvas.width=1300;canvas.height=340;const c=canvas.getContext('2d');c.fillStyle='#17272b';c.fillRect(0,0,1300,340);
  const frames=[];
  for(const [i,h]of units.entries()){
   c.save();c.translate(65+i*130,160);r.drawUnit(c,{...h,x:0,y:0,isPlayer:false},g,g.time);c.restore();
   const illusion=createIllusions(g,h,1,20,100,100)[0];c.save();c.translate(65+i*130,285);r.drawUnit(c,{...illusion,x:0,y:0},g,g.time);c.restore();
   c.fillStyle='#e5edf0';c.font='12px sans-serif';c.textAlign='center';c.fillText(HEROES[h.heroId].name,65+i*130,25);
   const pixels=c.getImageData(i*130,40,130,130).data;let colored=0;for(let j=0;j<pixels.length;j+=4)if(Math.max(pixels[j],pixels[j+1],pixels[j+2])-Math.min(pixels[j],pixels[j+1],pixels[j+2])>35)colored++;
   frames.push({hero:h.heroId,coloredPixels:colored});
  }
  g.entities=units;g._index();canvas.id='hero-appearance-evidence';canvas.style.cssText='position:fixed;bottom:0;left:0;z-index:1000';document.body.append(canvas);
  return {heroes:ids.length,frames};
 });
 assert.equal(lineup.heroes,10);for(const frame of lineup.frames)assert.ok(frame.coloredPixels>500,frame.hero+' has a visible character');
 await page.locator('#hero-appearance-evidence').screenshot({path:'artifacts/hero-appearance-and-illusions.png'});
 await page.evaluate(()=>document.querySelector('#hero-appearance-evidence').remove());await page.screenshot({path:'artifacts/all-heroes-in-match.png'});
 await page.evaluate(()=>{window.heroRenderTimes=[];window.heroFrames=[];window.heroMeasure=true;let last;const frame=t=>{if(last!=null)heroFrames.push(t-last);last=t;if(heroMeasure)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
 await page.waitForTimeout(3000);
 const timing=await page.evaluate(()=>{heroMeasure=false;const stats=a=>{a.sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p95:a[Math.floor(a.length*.95)]};};return {render:stats(heroRenderTimes),frames:stats(heroFrames)};});
 assert.deepEqual(errors,[]);assert.ok(timing.render.mean<20);
 const report={lineup,timing,errors};await writeFile('artifacts/hero-appearance-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}

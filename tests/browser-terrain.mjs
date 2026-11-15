import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createCoopServer} from '../server/coop-server.mjs';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

let service,base=process.env.GAME_URL;
if(!base){service=createCoopServer({root:resolve(process.env.STATIC_ROOT||'dist'),host:'127.0.0.1',port:0});await service.listen();base=`http://127.0.0.1:${service.server.address().port}`;}
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],checks=[],pixels=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  await page.addInitScript(()=>{
    window.nativeTerrainBitmap=window.createImageBitmap.bind(window);window.terrainDecodes=[];
    window.createImageBitmap=(source,options)=>{
      if(source instanceof Blob&&source.type==='image/jpeg')terrainDecodes.push({...options});
      return nativeTerrainBitmap(source,options);
    };
  });
  await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
  await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
    window.terrainCalls=[];
    Renderer.prototype.render=function(game,time){window.g=game;window.r=this;return render.call(this,game,time);};
    const drawImage=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
      const isTerrain=window.r&&this.canvas===r.canvas&&(image===r.mapAsset.image||[...(r.mapAsset.bitmaps?.values()||[])].includes(image));
      const result=drawImage.call(this,image,...args);
      if(isTerrain){
        terrainCalls.push({args,bitmap:image instanceof ImageBitmap,imageWidth:image.naturalWidth||image.width,imageHeight:image.naturalHeight||image.height});
        if(window.captureTerrain){window.captureTerrain=false;window.terrainPixels=this.getImageData(0,0,this.canvas.width,this.canvas.height).data;}
      }
      return result;
    };
    window.terrainBlob=await (await fetch((await import('/src/map-data.js')).MAP_IMAGE.url)).blob();
  });
  await page.locator('#start-game').click();await page.waitForFunction(()=>window.g&&r.mapAsset.ready&&terrainCalls.length);
  const calls=await page.evaluate(()=>{g.setPaused(true);return terrainCalls;});
  assert.ok(calls.every(call=>call.bitmap),'the real battlefield must reuse decoded map bitmaps instead of repeatedly drawing the large JPEG');
  assert.ok(calls.every(call=>call.imageWidth===8878&&call.imageHeight===8356),'the default camera must retain the native map resolution');
  checks.push('The production battlefield uses a decoded native map bitmap');

  await page.evaluate(()=>{r.followPlayer=false;r.w=512;r.h=384;r.dpr=1;r.canvas.width=512;r.canvas.height=384;});
  await page.evaluate(()=>window.nativeTerrainSource=r.mapAsset.bitmaps.get(1));
  for(const {zoom,divisor} of [{zoom:.18,divisor:2},{zoom:.04,divisor:8}]){
    await page.evaluate(zoom=>{r.zoom=zoom;r.render(g,g.time);},zoom);
    await page.waitForFunction(divisor=>r.mapAsset.bitmaps.has(divisor),divisor);
    if(divisor===2)await page.evaluate(()=>window.replacedTerrainSource=r.mapAsset.bitmaps.get(2));
  }
  const restored=await page.evaluate(()=>{
    const before=terrainDecodes.length;r.zoom=.45;r.dpr=2;r.render(g,g.time);
    return {retained:r.mapAsset.bitmaps.get(1)===nativeTerrainSource,released:replacedTerrainSource.width===0&&replacedTerrainSource.height===0,before,after:terrainDecodes.length,call:terrainCalls.at(-1),cached:r.mapAsset.bitmaps.size};
  });
  assert.ok(restored.retained,'overview zoom must not evict the native map needed when zooming back in');
  assert.equal(restored.call.imageWidth,8878,'restoring a detailed high-DPR camera must immediately draw the native map');
  assert.equal(restored.after,restored.before,'returning to native detail must reuse the prepared bitmap');
  assert.ok(restored.released,'evicting an alternate resolution must close its bitmap and release decoded pixels');
  assert.ok(restored.cached<=2);
  checks.push('Playable, overview and high-DPR zoom transitions retain native detail without decoding it again');
  await page.evaluate(()=>r.dpr=1);
  for(const {zoom,divisor} of [{zoom:.04,divisor:8},{zoom:.18,divisor:2},{zoom:.45,divisor:1},{zoom:1.05,divisor:1}]){
    await page.evaluate(zoom=>{r.zoom=zoom;r.render(g,g.time);},zoom);
    await page.waitForFunction(divisor=>r.mapAsset.bitmaps?.has(divisor),divisor);
    await page.evaluate(async divisor=>{
      window.terrainReference=await nativeTerrainBitmap(terrainBlob,{resizeWidth:Math.ceil(8878/divisor),resizeHeight:Math.ceil(8356/divisor),resizeQuality:'high'});
    },divisor);
    for(const camera of [{x:10000,y:11000},{x:1100,y:900},{x:15900,y:15000}]){
      pixels.push(await page.evaluate(({camera,zoom,divisor})=>{
        r.camera={...camera};window.captureTerrain=true;r.render(g,g.time);
        const {x,y}=r.camera,rect={x:994.7115844901873,y:769,width:19466.576831019625,height:18322};
        const reference=document.createElement('canvas');reference.width=512;reference.height=384;
        const context=reference.getContext('2d');context.fillStyle='#1b2927';context.fillRect(0,0,512,384);
        context.translate(256,192);context.scale(zoom,zoom);context.translate(-x,-y);
        context.drawImage(terrainReference,rect.x,rect.y,rect.width,rect.height);
        const compare=data=>{let maxDelta=0,differentPixels=0;for(let i=0;i<data.length;i+=4){let different=false;for(let channel=0;channel<4;channel++){
          const delta=Math.abs(data[i+channel]-terrainPixels[i+channel]);maxDelta=Math.max(maxDelta,delta);different||=delta>0;
        }if(different)differentPixels++;}return {maxDelta,differentPixels};};
        const decoded=compare(context.getImageData(0,0,512,384).data);
        context.setTransform(1,0,0,1,0,0);context.fillStyle='#1b2927';context.fillRect(0,0,512,384);
        context.translate(256,192);context.scale(zoom,zoom);context.translate(-x,-y);
        context.drawImage(r.mapAsset.image,rect.x,rect.y,rect.width,rect.height);
        return {camera,shownCamera:{x,y},zoom,divisor,decoded,originalJpeg:compare(context.getImageData(0,0,512,384).data),totalPixels:512*384};
      },{camera,zoom,divisor}));
    }
    await page.evaluate(()=>terrainReference.close());
  }
  await writeFile('artifacts/terrain-browser-pixels.json',JSON.stringify(pixels,null,2)+'\n');
  assert.ok(pixels.every(result=>result.decoded.maxDelta<=2),JSON.stringify(pixels));
  assert.ok(pixels.filter(result=>result.zoom>=.18).every(result=>result.originalJpeg.maxDelta<=2),JSON.stringify(pixels));
  checks.push('Rendered map pixels match the decoded source at overview, playable zooms and map edges; playable zooms also match the original JPEG');

  const reuse=await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),before=terrainDecodes.length;
    for(let i=0;i<20;i++)r.render(g,g.time);
    const secondCanvas=document.createElement('canvas');document.body.append(secondCanvas);
    const second=new Renderer(secondCanvas);second.render(g,g.time);second.resizeObserver.disconnect();secondCanvas.remove();
    return {before,after:terrainDecodes.length,bitmaps:r.mapAsset.bitmaps.size};
  });
  assert.equal(reuse.after,reuse.before,'stable frames and a new renderer must reuse prepared map images');
  assert.ok(reuse.bitmaps<=2,'decoded map memory must remain bounded when changing zoom levels');
  checks.push('Map bitmaps are reused across frames and renderer lifecycles with at most two cached resolutions');
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>r.resize());await page.waitForTimeout(100);await page.screenshot({path:`artifacts/terrain-${viewport.width}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  checks.push('Desktop and mobile battlefield layouts remain usable');

  for(const missing of [true,false]){
    const fallback=await browser.newPage({viewport:{width:1366,height:768}});fallback.on('pageerror',error=>errors.push(error.message));
    try{
      await fallback.addInitScript(missing=>{window.fallbackDecodes=0;window.createImageBitmap=missing?undefined:()=>{fallbackDecodes++;return Promise.reject(new Error('Unsupported bitmap decoding'));};},missing);
      await fallback.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(fallback);
      await fallback.evaluate(async()=>{
        const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
        Renderer.prototype.render=function(game,time){window.g=game;window.r=this;return render.call(this,game,time);};
      });
      await fallback.locator('#start-game').click();await fallback.waitForFunction(()=>window.g&&r.mapAsset.ready);
      const state=await fallback.evaluate(()=>{g.setPaused(true);const before=fallbackDecodes;for(let i=0;i<10;i++)r.render(g,g.time);return {before,after:fallbackDecodes,loaded:r.mapAsset.image.complete&&!r.mapAsset.failed};});
      assert.ok(state.loaded);assert.equal(state.after,state.before,'an unavailable decoder must not restart failed work on every frame');
    }finally{await fallback.close();}
  }
  checks.push('Browsers without bitmap support or with a decode failure retain a usable original-image fallback');
  assert.deepEqual(errors,[]);await writeFile('artifacts/terrain-browser-report.json',JSON.stringify({checks,pixels,reuse,errors},null,2)+'\n');
  for(const check of checks)console.log('PASS '+check);
}finally{await browser.close();await service?.close();}

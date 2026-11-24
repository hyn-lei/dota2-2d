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
if(process.argv.includes('--memory-only')){
  try{await checkTerrainMemory();}finally{await browser.close();await service?.close();}
  process.exit(0);
}
if(process.argv.includes('--recovery-only')){
  try{await checkCropRecovery();}finally{await browser.close();await service?.close();}
  process.exit(0);
}
if(process.argv.includes('--large-viewport-only')){
  try{await checkLargeBattlefield();}finally{await browser.close();await service?.close();}
  process.exit(0);
}
try{
  await page.addInitScript(()=>{
    window.nativeTerrainBitmap=window.createImageBitmap.bind(window);window.terrainDecodes=[];
    window.createImageBitmap=(source,...args)=>{
      if(source instanceof Blob&&source.type==='image/jpeg')terrainDecodes.push(args);
      return nativeTerrainBitmap(source,...args);
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
        terrainCalls.push({args,bitmap:image instanceof ImageBitmap,imageWidth:image.naturalWidth||image.width,imageHeight:image.naturalHeight||image.height,divisor:[...r.mapAsset.bitmaps].find(([,bitmap])=>bitmap===image)?.[0]});
        if(window.captureTerrain){window.captureTerrain=false;window.terrainPixels=this.getImageData(0,0,this.canvas.width,this.canvas.height).data;}
      }
      return result;
    };
    window.terrainBlob=await (await fetch((await import('/src/map-data.js')).MAP_IMAGE.url)).blob();
    window.terrainOriginalImage=new Image();
    const {MAP_IMAGE}=await import('/src/map-data.js');
    await new Promise((resolve,reject)=>{terrainOriginalImage.onload=resolve;terrainOriginalImage.onerror=reject;terrainOriginalImage.src=MAP_IMAGE.url;});
  });
  await page.locator('#start-game').click();await waitForTerrain(1);
  const calls=await page.evaluate(()=>{g.setPaused(true);return terrainCalls.filter(call=>call.divisor===1);});
  assert.ok(calls.every(call=>call.bitmap),'the real battlefield must reuse decoded map bitmaps instead of repeatedly drawing the large JPEG');
  assert.ok(calls.every(call=>call.imageWidth*call.imageHeight*4<64*1048576),'the default camera must retain bounded decoded pixels');
  checks.push('The production battlefield uses a bounded camera crop at native detail');

  await page.evaluate(()=>{r.followPlayer=false;r.w=512;r.h=384;r.dpr=1;r.canvas.width=512;r.canvas.height=384;});
  await page.evaluate(()=>window.nativeTerrainSource=r.mapAsset.bitmaps.get(1));
  for(const {zoom,divisor} of [{zoom:.18,divisor:2},{zoom:.04,divisor:8}]){
    await page.evaluate(zoom=>{r.zoom=zoom;r.render(g,g.time);},zoom);
    await waitForTerrain(divisor);
    if(divisor===2)await page.evaluate(()=>window.replacedTerrainSource=r.mapAsset.bitmaps.get(2));
  }
  await page.evaluate(()=>{r.zoom=.45;r.dpr=2;r.render(g,g.time);});await waitForTerrain(1);
  const restored=await page.evaluate(()=>({call:terrainCalls.at(-1),cached:r.mapAsset.bitmaps.size}));
  assert.equal(restored.call.divisor,1,'a detailed high-DPR camera must recover native texels');
  assert.ok(restored.call.imageWidth*restored.call.imageHeight*4<64*1048576);
  assert.ok(restored.cached<=3);
  checks.push('Playable, overview and high-DPR zoom transitions recover native camera detail');
  await page.evaluate(()=>r.dpr=1);
  for(const {zoom,divisor} of [{zoom:.04,divisor:8},{zoom:.18,divisor:2},{zoom:.45,divisor:1},{zoom:1.05,divisor:1}]){
    await page.evaluate(zoom=>{r.zoom=zoom;r.render(g,g.time);},zoom);
    await waitForTerrain(divisor);
    await page.evaluate(async divisor=>{
      window.terrainReference=await nativeTerrainBitmap(terrainBlob,{resizeWidth:Math.ceil(8878/divisor),resizeHeight:Math.ceil(8356/divisor),resizeQuality:'high'});
    },divisor);
    for(const camera of [{x:10000,y:11000},{x:1100,y:900},{x:15900,y:15000}]){
      await page.evaluate(camera=>{r.camera={...camera};r.render(g,g.time);},camera);await waitForTerrain(divisor);
      pixels.push(await page.evaluate(({camera,zoom,divisor})=>{
        r.camera={...camera};window.captureTerrain=true;r.render(g,g.time);
        const {x,y}=r.camera,rect={x:994.7115844901873,y:769,width:19466.576831019625,height:18322};
        const reference=document.createElement('canvas');reference.width=512;reference.height=384;
        const context=reference.getContext('2d');context.fillStyle='#1b2927';context.fillRect(0,0,512,384);
        context.translate(256,192);context.scale(zoom,zoom);context.translate(-x,-y);
        context.drawImage(terrainReference,rect.x,rect.y,rect.width,rect.height);
        const compare=data=>{let maxDelta=0,differentPixels=0,totalDelta=0;for(let i=0;i<data.length;i+=4){let different=false;for(let channel=0;channel<4;channel++){
          const delta=Math.abs(data[i+channel]-terrainPixels[i+channel]);maxDelta=Math.max(maxDelta,delta);different||=delta>0;
          totalDelta+=delta;
        }if(different)differentPixels++;}return {maxDelta,differentPixels,meanDelta:totalDelta/data.length};};
        const decoded=compare(context.getImageData(0,0,512,384).data);
        context.setTransform(1,0,0,1,0,0);context.fillStyle='#1b2927';context.fillRect(0,0,512,384);
        context.translate(256,192);context.scale(zoom,zoom);context.translate(-x,-y);
        context.drawImage(terrainOriginalImage,rect.x,rect.y,rect.width,rect.height);
        return {camera,shownCamera:{x,y},zoom,divisor,decoded,originalJpeg:compare(context.getImageData(0,0,512,384).data),totalPixels:512*384};
      },{camera,zoom,divisor}));
    }
    await page.evaluate(()=>terrainReference.close());
  }
  await writeFile('artifacts/terrain-browser-pixels.json',JSON.stringify(pixels,null,2)+'\n');
  // Bound the sparse bilinear-rounding changes introduced by cropped draw geometry.
  const matches=(comparison,total)=>comparison.maxDelta<=8&&comparison.meanDelta<.05&&comparison.differentPixels/total<.02;
  assert.ok(pixels.every(result=>matches(result.decoded,result.totalPixels)),JSON.stringify(pixels));
  assert.ok(pixels.filter(result=>result.zoom>=.18).every(result=>matches(result.originalJpeg,result.totalPixels)),JSON.stringify(pixels));
  checks.push('Rendered map pixels match the decoded source at overview, playable zooms and map edges; playable zooms also match the original JPEG');

  const reuse=await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),before=terrainDecodes.length,original=r;
    for(let i=0;i<20;i++)r.render(g,g.time);
    const secondCanvas=document.createElement('canvas');document.body.append(secondCanvas);
    const second=new Renderer(secondCanvas);second.zoom=original.zoom;second.lookAt(original.camera.x,original.camera.y);second.render(g,g.time);second.destroy();secondCanvas.remove();
    return {before,after:terrainDecodes.length,bitmaps:original.mapAsset.bitmaps.size};
  });
  assert.equal(reuse.after,reuse.before,'stable frames and a new renderer must reuse prepared map images');
  assert.ok(reuse.bitmaps<=3,'decoded map memory must remain bounded when changing zoom levels');
  checks.push('Camera bitmaps are reused across stable frames and matching renderer lifecycles');
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>r.resize());await page.waitForTimeout(100);await page.screenshot({path:`artifacts/terrain-${viewport.width}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  checks.push('Desktop and mobile battlefield layouts remain usable');

  for(const missing of [true,false,'sync']){
    const fallback=await browser.newPage({viewport:{width:1366,height:768}});fallback.on('pageerror',error=>errors.push(error.message));
    try{
      await fallback.addInitScript(missing=>{
        window.fallbackDecodes=0;
        window.createImageBitmap=missing===true?undefined:()=>{
          fallbackDecodes++;
          if(missing==='sync')throw new Error('Unsupported bitmap decoding');
          return Promise.reject(new Error('Unsupported bitmap decoding'));
        };
      },missing);
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
  await page.close();if(!process.argv.includes('--painting-only')){await checkTerrainMemory();await checkCropRecovery();await checkLargeBattlefield();}
}finally{await browser.close();await service?.close();}

async function waitForTerrain(divisor){
  await page.waitForFunction(divisor=>{
    if(!window.g||!r.mapAsset.ready)return false;
    r.render(g,g.time);
    return terrainCalls.at(-1)?.divisor===divisor;
  },divisor);
}

async function checkTerrainMemory(){
  const probe=await browser.newPage({viewport:{width:2560,height:1340},deviceScaleFactor:1.5});
  try{
    await probe.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(probe);
    await probe.evaluate(async()=>{
      const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
      Renderer.prototype.render=function(game,time){window.g=game;window.r=this;return render.call(this,game,time);};
    });
    await probe.locator('#start-game').click();
    await probe.waitForFunction(()=>window.g&&r.mapAsset.ready&&r.mapAsset.bitmaps.has(1));
    const report=await probe.evaluate(()=>({decodedMiB:[...r.mapAsset.bitmaps.values()].reduce((sum,image)=>sum+image.width*image.height*4/1048576,0),images:[...r.mapAsset.bitmaps.values()].map(image=>({width:image.width,height:image.height}))}));
    await writeFile('artifacts/terrain-memory-regression.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
    assert.ok(report.decodedMiB<64,'the visible default camera must use bounded decoded map memory');
    console.log('PASS Visible-camera decoded map memory stays bounded');
  }finally{await probe.close();}
}

async function checkCropRecovery(){
  const probe=await browser.newPage({viewport:{width:1366,height:768}});
  try{
    await probe.addInitScript(()=>{
      const decode=createImageBitmap;
      window.rejectCrop=false;window.cropFailures=0;
      window.createImageBitmap=(source,...args)=>{
        if(rejectCrop&&(source instanceof ImageBitmap||source instanceof Blob&&typeof args[0]==='number')){
          cropFailures++;return Promise.reject(new Error('Transient crop failure'));
        }
        return decode(source,...args);
      };
    });
    await probe.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(probe);
    await probe.evaluate(async()=>{
      const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
      Renderer.prototype.render=function(game,time){window.g=game;window.r=this;return render.call(this,game,time);};
    });
    await probe.locator('#start-game').click();await probe.waitForFunction(()=>window.g&&r.mapAsset.bitmaps.has(1));
    await probe.evaluate(()=>{g.setPaused(true);window.oldCrop=r.mapAsset.bitmaps.get(1);window.rejectCrop=true;r.lookAt(10000,11000);});
    await probe.waitForFunction(()=>cropFailures>0&&r.mapAsset.pending.size===0);
    const failures=await probe.evaluate(()=>cropFailures);await probe.waitForTimeout(300);
    assert.equal(await probe.evaluate(()=>cropFailures),failures,'failed crop work must wait before retrying');
    await probe.evaluate(()=>window.rejectCrop=false);
    await probe.waitForFunction(()=>r.mapAsset.bitmaps.get(1)!==oldCrop&&r.mapAsset.pending.size===0,{},{timeout:6000});
    assert.equal(await probe.evaluate(()=>oldCrop.width),0,'recovery must release the superseded camera bitmap');
    console.log('PASS Native camera detail recovers after a later crop failure');
  }finally{await probe.close();}
}

async function checkLargeBattlefield(){
  const large=await browser.newPage({viewport:{width:2560,height:1340},deviceScaleFactor:1.5});
  const errors=[];
  large.on('pageerror',error=>errors.push(error.message));
  try{
    await large.addInitScript(()=>Math.random=()=>42/4294967296);
    await large.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(large);
    await large.evaluate(async()=>{
      const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
      Renderer.prototype.render=function(game,time){
        window.largeGame=game;window.largeRenderer=this;
        const start=performance.now(),result=render.call(this,game,time);
        if(window.largeSamples)largeSamples.push({at:performance.now(),renderMs:performance.now()-start,x:game.player.x,y:game.player.y,alive:!game.player.dead});
        return result;
      };
    });
    await large.locator('#start-game').click();
    await large.waitForFunction(()=>window.largeGame?.time>.2&&largeRenderer.mapAsset.ready);
    await large.evaluate(()=>{
      // Exercise slow-paint recovery on machines that can normally paint 4K quickly.
      const drawImage=CanvasRenderingContext2D.prototype.drawImage;
      window.largeOriginalDrawImage=drawImage;
      const until=performance.now()+1200;
      let slowedFrame=-1;
      CanvasRenderingContext2D.prototype.drawImage=function(...args){
        const result=drawImage.apply(this,args);
        // Multiple sprite draws in one frame must share the injected paint delay.
        if(this.canvas===largeRenderer.canvas&&slowedFrame!==largeRenderer.frame&&performance.now()<until){
          slowedFrame=largeRenderer.frame;
          const finish=performance.now()+25;
          while(performance.now()<finish){}
        }
        return result;
      };
    });
    await large.waitForTimeout(1500);
    const limited=await large.evaluate(()=>{
      CanvasRenderingContext2D.prototype.drawImage=largeOriginalDrawImage;
      const canvas=largeRenderer.canvas,bounds=canvas.getBoundingClientRect();
      return {pixels:canvas.width*canvas.height,nativePixels:bounds.width*bounds.height*Math.min(devicePixelRatio,2)**2};
    });
    const measure=async(moving=false)=>{
      await large.evaluate(()=>window.largeSamples=[]);
      if(moving){
        for(let i=0;i<4;i++){
          await large.keyboard.down('ArrowRight');await large.waitForTimeout(500);await large.keyboard.up('ArrowRight');
          await large.keyboard.down('ArrowLeft');await large.waitForTimeout(500);await large.keyboard.up('ArrowLeft');
        }
      }else await large.waitForTimeout(4000);
      return await large.evaluate(()=>{
        const frames=largeSamples;window.largeSamples=null;
        const intervals=frames.slice(1).map((frame,i)=>frame.at-frames[i].at);
        const sorted=[...intervals].sort((a,b)=>a-b),elapsed=frames.at(-1).at-frames[0].at;
        return {frames:frames.length,fps:(frames.length-1)*1000/elapsed,frameP95:sorted[Math.floor(sorted.length*.95)],frameMax:Math.max(...intervals),renderMs:frames.reduce((sum,frame)=>sum+frame.renderMs,0)/frames.length,canvas:[largeRenderer.canvas.width,largeRenderer.canvas.height],dpr:largeRenderer.dpr,entities:largeGame.entities.length,positionChanges:frames.slice(1).filter((frame,i)=>Math.hypot(frame.x-frames[i].x,frame.y-frames[i].y)>.01).length,deadFrames:frames.filter(frame=>!frame.alive).length};
      });
    };
    const opening=await measure();
    const corridor=await large.evaluate(()=>{
      const game=largeGame;
      game.time=180;game.nextWave=210;game.nextNeutralSpawn=240;game._spawnCamps();for(let i=0;i<4;i++)game._spawnWave();
      Object.assign(game.player,game.navigation.nearestWalkable({x:10000,y:10880}));game._index();largeRenderer.center(game.player);
      return game.navigation.lineClear(game.player,{x:game.player.x+450,y:game.player.y})&&game.navigation.lineClear(game.player,{x:game.player.x-450,y:game.player.y});
    });
    assert.ok(corridor,'the movement probe needs a clear corridor');
    const movement=await measure(true);
    const target=await large.evaluate(()=>{
      const game=largeGame,renderer=largeRenderer;
      game.clearMovement(game.player);renderer.lookAt(game.player.x,game.player.y);
      const bounds=renderer.canvas.getBoundingClientRect();
      return {world:{x:game.player.x+200,y:game.player.y},screen:{x:bounds.left+bounds.width/2+200*renderer.zoom,y:bounds.top+bounds.height/2}};
    });
    await large.mouse.click(target.screen.x,target.screen.y,{button:'right'});
    const destination=await large.evaluate(()=>largeGame.player.destination);
    await large.setViewportSize({width:800,height:600});
    await large.waitForTimeout(200);
    const resized=await large.evaluate(()=>{
      const canvas=largeRenderer.canvas,bounds=canvas.getBoundingClientRect();
      return {dpr:largeRenderer.dpr,nativeDpr:Math.min(devicePixelRatio,2),canvas:[canvas.width,canvas.height],css:[bounds.width,bounds.height]};
    });
    const report={limited,opening,movement,target:target.world,destination,resized,errors};
    await writeFile('artifacts/terrain-large-viewport-performance.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
    assert.ok(limited.pixels<limited.nativePixels*.9,'persistent slow painting must reduce the oversized backing surface');
    assert.ok(opening.fps>30,'a large battlefield must avoid persistent low-frame-rate painting');
    assert.ok(movement.fps>30,'a mature large battlefield must remain responsive during camera-follow movement');
    assert.ok(movement.positionChanges/(movement.frames-1)>.8,'held movement must continue on rendered frames');
    assert.equal(movement.deadFrames,0);
    assert.ok(movement.entities>=200);
    assert.equal(resized.dpr,resized.nativeDpr,'a smaller window must recover native pixel density');
    assert.ok(Math.abs(resized.canvas[0]-resized.css[0]*resized.nativeDpr)<=1);
    assert.ok(Math.abs(resized.canvas[1]-resized.css[1]*resized.nativeDpr)<=1);
    assert.ok(destination&&Math.hypot(destination.x-target.world.x,destination.y-target.world.y)<1,'a real ground click must retain its world-space destination after scaling');
    assert.deepEqual(errors,[]);
    console.log('PASS Large battlefield painting, continuous movement and native-density resize recovery');
  }finally{await large.close();}
}

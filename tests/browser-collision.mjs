import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));const check=s=>{checks.push(s);console.log('PASS '+s);};await mkdir('artifacts',{recursive:true});
try{
 await page.goto(process.env.GAME_URL||'http://localhost:5194',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.g=g;window.r=this;return render.call(this,g,t);};});
 await page.locator('#start-game').click();await page.waitForFunction(()=>g?.time>.1);
 const opening=await page.evaluate(async()=>{
  const {collisionShape}=await import('/src/collision.js'),heroes=g.entities.filter(e=>e.kind==='hero');
  return {time:g.time,heroes:heroes.map(h=>({id:h.id,x:h.x,y:h.y,isPlayer:h.isPlayer,walkable:g.navigation.isWalkable(h),fountainGap:Math.min(...g.entities.filter(e=>e.kind==='fountain').map(f=>Math.hypot(h.x-f.x,h.y-f.y)-Math.max(200,f.radius)-h.collisionRadius)),overlaps:g.entities.filter(e=>{
   if(e===h||e.dead||e.hp<=0||e.flying||e.noCollision)return false;
   const shape=collisionShape(e),radius=h.collisionRadius;
   return shape.type==='circle'?Math.hypot(h.x-e.x,h.y-e.y)<radius+shape.radius-.001:Math.abs(h.x-e.x)<shape.hx+radius-.001&&Math.abs(h.y-e.y)<shape.hy+radius-.001;
  }).map(e=>e.id)}))};
 });
 assert.equal(opening.heroes.length,10);assert.ok(opening.heroes.every(h=>h.walkable&&!h.overlaps.length&&h.fountainGap>=-.001),JSON.stringify(opening));
 await page.screenshot({path:'artifacts/collision-spawns.png'});check('Both teams start on walkable ground without overlapping heroes, couriers or buildings');
 await page.waitForFunction(t=>g.time>t+5,opening.time);
 const departures=await page.evaluate(starts=>starts.map(start=>{const h=g.entities.find(e=>e.id===start.id);return {id:h.id,isPlayer:h.isPlayer,moved:Math.hypot(h.x-start.x,h.y-start.y)};}),opening.heroes);
 assert.ok(departures.filter(h=>!h.isPlayer).every(h=>h.moved>700),JSON.stringify(departures));assert.equal(departures.find(h=>h.isPlayer).moved,0);
 check('All nine AI heroes leave the fountain while the player remains idle');
 await page.evaluate(()=>{const p=g.player;g.entities=g.entities.filter(e=>e===p||e.kind==='fountain');g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=1e9;Object.assign(p,{x:9000,y:9000,destination:null,navPath:null});g._index();r.center(p);});
 await page.locator('#battlefield').focus();await page.keyboard.press('b');await page.waitForFunction(()=>g.player.itemChannel?.kind==='teleport');
 await page.waitForFunction(()=>!g.player.itemChannel&&g.player.x<4000);
 const fountainReturn=await page.evaluate(()=>{const h=g.player,f=g.entities.find(e=>e.kind==='fountain'&&e.team===h.team);return {distance:Math.hypot(h.x-f.x,h.y-f.y),minimum:Math.max(200,f.radius)+h.collisionRadius,walkable:g.navigation.isWalkable(h),overlaps:g.collisions.overlaps(h)};});
 assert.ok(fountainReturn.distance>=fountainReturn.minimum&&fountainReturn.walkable&&!fountainReturn.overlaps);await page.screenshot({path:'artifacts/collision-fountain-return.png'});
 check('The real recall key channels a scroll and lands outside the visible attacking fountain circle');
 await page.evaluate(async()=>{
  const {Navigator}=await import('/src/navigation.js'),{createMeta}=await import('/src/inventory.js');const p=g.player;g.entities=[p];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=1e9;
  Object.assign(p,{x:6000,y:6016,destination:null,navPath:null});const blocker=g._unit('creep',0,6160,6016,{radius:16,speed:0,maxHp:10000}),walls=[5866,6166].map(y=>g._unit('filler',0,6160,y,{bounds:[400,220],radius:200,speed:0,maxHp:10000}));
  g.entities.push(blocker,...walls);g._creepTick=()=>{};g.navigation=new Navigator({cols:240,rows:240,cellSize:32,blocked:'0'.repeat(57600)},[],walls);g._index();p.inventory=['phase_boots'];p.inventoryMeta=[createMeta(p,'phase_boots')];g._refreshHero(p);r.center(p);r.zoom=.8;window.blocker=blocker;window.walls=walls;
 });
 await page.locator('#battlefield').focus();const time=await page.evaluate(()=>g.time);await page.keyboard.down('ArrowRight');await page.waitForFunction(t=>g.time>t+1.2,time);await page.keyboard.up('ArrowRight');
 const blocked=await page.evaluate(()=>({x:g.player.x,y:g.player.y,d:Math.hypot(g.player.x-blocker.x,g.player.y-blocker.y)}));assert.ok(blocked.x>6050&&blocked.x<=6120.01,JSON.stringify(blocked));assert.ok(blocked.d>=40-.01);await page.screenshot({path:'artifacts/collision-blocked.png'});check('Real keyboard movement is body-blocked by an allied creep in a building corridor');
 await page.keyboard.press('1');await page.waitForFunction(()=>Object.values(g.player.statuses).some(s=>s.phased&&s.until>g.time));await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>g.player.x>6200);await page.keyboard.up('ArrowRight');check('Using phase boots through the HUD binding passes the blocking creep');
 const started=await page.evaluate(()=>g.time);await page.keyboard.down('ArrowUp');await page.waitForFunction(t=>g.time>t+.7,started);await page.keyboard.up('ArrowUp');assert.ok(await page.evaluate(()=>g.player.y>=6000-.01));check('Buildings still block movement during phase');
 await page.waitForFunction(()=>!Object.values(g.player.statuses).some(s=>s.phased&&s.until>g.time));
 await page.evaluate(()=>{const p=g.player;Object.assign(p,{x:6000,y:6016,destination:null,navPath:null});g._index();});const resumed=await page.evaluate(()=>g.time);await page.keyboard.down('ArrowRight');await page.waitForFunction(t=>g.time>t+1,resumed);await page.keyboard.up('ArrowRight');assert.ok(await page.evaluate(()=>g.player.x<=6120.01));check('Collision returns after the phase status expires');
 const routes=[];
 for(const kind of ['hero','creep']){
  await page.evaluate(async kind=>{
   const {Navigator}=await import('/src/navigation.js'),p=g.player;Object.assign(p,{x:8000,y:8000,destination:null,navPath:null});
   const mover=kind==='hero'?g._makeHero('axe',0,1,false,0):g._unit('creep',0,6100,6000,{radius:16,speed:200,maxHp:10000});Object.assign(mover,{x:6100,y:6000,navPath:null});
   const blockers=[[6164,6000],[6164,5960],[6164,6040],[6100,5952],[6132,5952],[6100,6048],[6132,6048]].map(([x,y])=>g._unit('creep',0,x,y,{radius:16,speed:0,maxHp:10000}));
   const tower=g._unit('tower',0,6330,6000,{bounds:[120,160],radius:80,maxHp:10000,attackCooldown:999});g.entities=[p,mover,...blockers,tower];
   g.navigation=new Navigator({cols:300,rows:300,cellSize:32,blocked:'0'.repeat(90000)},[],[tower]);g._index();
   window.routeMover=mover;window.routeGoal={x:6800,y:6000};window.routeMetrics={minX:mover.x,maxStep:0,overlap:false};
   const walk=(h,dt)=>{if(h!==mover)return;const before={x:h.x,y:h.y};g._move(h,routeGoal,dt);routeMetrics.minX=Math.min(routeMetrics.minX,h.x);routeMetrics.maxStep=Math.max(routeMetrics.maxStep,Math.hypot(h.x-before.x,h.y-before.y));routeMetrics.overlap||=blockers.some(b=>Math.hypot(h.x-b.x,h.y-b.y)<h.collisionRadius+b.collisionRadius-.001)||Math.abs(h.x-tower.x)<60+h.collisionRadius-.001&&Math.abs(h.y-tower.y)<80+h.collisionRadius-.001;};
   g._heroTick=walk;g._creepTick=walk;r.followPlayer=false;r.lookAt(6450,6000);r.zoom=.8;
  },kind);
  await page.waitForFunction(()=>Math.hypot(routeMover.x-routeGoal.x,routeMover.y-routeGoal.y)<10,null,{timeout:15000});
  const route=await page.evaluate(kind=>({kind,...routeMetrics,distance:Math.hypot(routeMover.x-routeGoal.x,routeMover.y-routeGoal.y),speed:g.combatStats(routeMover).speed}),kind);
  assert.ok(route.minX<6100&&!route.overlap&&route.maxStep<=route.speed*.05+.01&&route.distance<10,JSON.stringify(route));routes.push(route);
  await page.screenshot({path:`artifacts/collision-${kind}-detour.png`});check(`${kind} detects three front blockers, walks around the group and tower, and reaches its destination`);
 }
 assert.deepEqual(errors,[]);await writeFile('artifacts/collision-report.json',JSON.stringify({checks,opening,departures,fountainReturn,routes,errors},null,2)+'\n');
}finally{await browser.close();}

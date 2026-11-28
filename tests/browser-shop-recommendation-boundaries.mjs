import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const only=process.argv.includes('--scenario')?process.argv[process.argv.indexOf('--scenario')+1]:null;
const browser=await chromium.launch(),errors=[];let page;
try{
 for(const scenario of only?[only]:['neutral','supplies','context']){
  page=await browser.newPage({viewport:{width:1366,height:900}});page.on('pageerror',e=>errors.push(e.message));
  if(scenario==='context')await page.addInitScript(()=>{Math.random=()=>5/4294967296;});
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
  await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.recBoundaryGame=g;return render.call(this,g,t);};});
  await page.locator(`[data-hero="${scenario==='neutral'?'weaver':'crystal_maiden'}"]`).click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.recBoundaryGame?.time>.1);
  await page.locator('#shop-button').click();
  if(scenario==='neutral'){
   await page.locator('[data-category="neutral"]').click();assert.equal(await page.locator('#shop').evaluate(e=>e.classList.contains('neutral-mode')),true);
   await page.locator('[data-recommended-item="desolator"]').click();
   assert.equal(await page.locator('[data-category="all"]').getAttribute('aria-pressed'),'true','a normal recommended item opens the normal catalog');
   assert.match(await page.locator('.item-detail .detail-heading h3').textContent(),/[黯暗]灭/);
  }else if(scenario==='supplies'){
   await page.locator('[data-recommendation-stage="early"]').click();
   const result=await page.evaluate(()=>{const g=recBoundaryGame;return [g.buy('ward_observer').ok,g.buy('ward_observer').ok,g.player.inventoryMeta[g.player.inventory.indexOf('ward_observer')].charges];});
   assert.deepEqual(result,[true,true,2]);await page.waitForTimeout(200);
   assert.match(await page.locator('[data-recommended-item="ward_observer"]').textContent(),/已拥有/,'two stacked observers fulfill two recommended purchases');
   const used=await page.evaluate(()=>{const g=recBoundaryGame,p=g.player;Object.assign(p,{x:10400,y:10400});return g.useItem(p.inventory.indexOf('ward_observer'),{x:10500,y:10400}).ok;});assert.ok(used);
   await page.waitForTimeout(200);assert.doesNotMatch(await page.locator('[data-recommended-item="ward_observer"]').textContent(),/已拥有/,'using one ward updates the recommendation');
  }else{
   await page.locator('[data-recommendation-stage="situational"]').click();
   const sentry=page.locator('[data-recommended-item="ward_sentry"]');
   assert.match(await sentry.textContent(),/编织者的缩地隐身/);
   assert.doesNotMatch(await page.locator('[data-recommended-item="lotus_orb"]').textContent(),/反弹定向技能/);
   const prepared=await page.evaluate(async()=>{
    const {BASES}=await import('/src/map-data.js'),{tickCouriers}=await import('/src/courier.js');
    const g=recBoundaryGame,p=g.player;
    Object.assign(p,{x:BASES[0].x+600,y:BASES[0].y-1600});
    g.queueItem('bracer');g.queueItem('blink',true);
    const ward=g.buy('ward_sentry');g.courierCommand('deliver');tickCouriers(g,.1);
    const ownItems=()=>[...p.inventory,...p.backpack,...p.stash,...g.courier.cargo];
    const before={queue:[...p.quickbuy],items:ownItems()};
    g.time=1500;
    window.checkRecommendationItems=()=>({queue:[...p.quickbuy],items:ownItems()});
    return {bought:ward.ok,area:ward.area,before};
   });
   assert.equal(prepared.bought,true);assert.equal(prepared.area,'stash');
   await page.waitForFunction(()=>document.querySelector('[data-recommended-item="lotus_orb"]')?.textContent.includes('反弹定向技能'));
   assert.match(await sentry.textContent(),/运送中/);
   assert.deepEqual(await page.evaluate(()=>checkRecommendationItems()),prepared.before,'changing recommendation phase leaves the manual queue and purchased items intact');
  }
  console.log('PASS recommendation '+scenario+' boundary');
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}

import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.recommendGame=g;return render.call(this,g,t);};});
 await page.locator('[data-hero="weaver"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.recommendGame?.time>.1);
 await page.locator('.shop-button').click();
 assert.equal(await page.locator('.shop-recommendations').count(),1,'the shop adds a dedicated recommendation area');
 const panel=page.locator('.shop-recommendations');await panel.waitFor({state:'visible'});
 assert.match(await panel.textContent(),/编织者/);
 const desolator=panel.locator('[data-recommended-item="desolator"]'),crit=panel.locator('[data-recommended-item="greater_crit"]');
 assert.equal(await desolator.count(),1);assert.equal(await crit.count(),1);
 assert.match(await desolator.textContent(),/护甲|减甲/);assert.match(await crit.textContent(),/暴击/);
 const before=await page.evaluate(()=>({gold:recommendGame.player.gold,items:[...recommendGame.player.inventory]}));
 await desolator.click();assert.match(await page.locator('.item-detail .detail-heading h3').textContent(),/[黯暗]灭/);
 assert.deepEqual(await page.evaluate(()=>recommendGame.player.inventory),before.items,'viewing recommendations does not buy gear');
 await crit.click({modifiers:['Shift']});assert.deepEqual(await page.evaluate(()=>recommendGame.player.quickbuy),['greater_crit']);
 await page.evaluate(()=>{recommendGame.player.gold=6000;});await desolator.click({button:'right'});
 await page.waitForFunction(()=>recommendGame.player.inventory.includes('desolator'));
 await page.waitForFunction(()=>document.querySelector('[data-recommended-item="desolator"]')?.textContent.includes('已拥有'));
 await page.evaluate(()=>{const enemy=recommendGame.entities.find(e=>e.kind==='hero'&&e.team===1);recommendGame.selectEntity(enemy.id);});
 await page.waitForTimeout(150);assert.match(await panel.textContent(),/编织者/,'inspecting an enemy keeps the player build');
 const layout=await page.evaluate(()=>{const a=document.querySelector('.shop-recommendations').getBoundingClientRect(),b=document.querySelector('.shop-main').getBoundingClientRect(),s=document.querySelector('#shop').getBoundingClientRect();return {ratio:a.width/b.width,left:a.right<=b.left,within:s.left>=0&&s.right<=innerWidth};});
 assert.ok(layout.ratio>.45&&layout.ratio<.55&&layout.left&&layout.within);
 await page.screenshot({path:'artifacts/shop-recommendations-weaver.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'small viewports have no horizontal overflow');
 await panel.locator('[data-recommendation-stage="situational"]').click();assert.ok(await panel.locator('[data-recommended-item]').count()>0);
 await page.screenshot({path:'artifacts/shop-recommendations-small.png'});assert.deepEqual(errors,[]);
 await writeFile('artifacts/shop-recommendations-report.json',JSON.stringify({layout,errors},null,2));console.log('PASS Weaver recommendations, reason display, real purchase, quickbuy, owner identity and responsive layout');
}finally{await browser.close();}

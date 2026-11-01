import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.GAME_URL||'http://localhost:5184';
const message='如果打真人比赛，因为当前网页正在频繁开发，网页随时都有可能会刷新。这可能会导致比赛打到一半突然打不了，或者刚开始就被刷掉了。';
const browser=await chromium.launch({headless:true});
const checks=[],errors=[];
await mkdir('artifacts',{recursive:true});

try{
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    page.setDefaultTimeout(5000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base,{waitUntil:'networkidle'});
    const notice=page.getByRole('dialog',{name:'温馨提示',exact:true});
    const close=page.getByRole('button',{name:'关闭温馨提示',exact:true});
    await notice.waitFor({state:'visible'});
    assert.equal(await notice.locator('p').textContent(),message);
    assert.equal(await close.evaluate(button=>button===document.activeElement),true);
    const geometry=await notice.evaluate(dialog=>{
      const panel=dialog.getBoundingClientRect(),text=dialog.querySelector('p'),button=dialog.querySelector('button'),textBox=text.getBoundingClientRect(),closeBox=button.getBoundingClientRect();
      return {width:panel.width,height:panel.height,left:panel.left,top:panel.top,right:panel.right,bottom:panel.bottom,
        viewportWidth:innerWidth,viewportHeight:innerHeight,scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth,
        scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight,fontSize:parseFloat(getComputedStyle(text).fontSize),
        textInside:textBox.left>=panel.left&&textBox.right<=panel.right&&textBox.top>=panel.top&&textBox.bottom<=panel.bottom,
        closeInside:closeBox.right<=panel.right&&closeBox.top>=panel.top,closeWidth:closeBox.width,closeHeight:closeBox.height,
        pageOverflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(geometry.width>=viewport.width*.9&&geometry.height>=viewport.height*.9,JSON.stringify(geometry));
    assert.ok(geometry.left>=0&&geometry.top>=0&&geometry.right<=viewport.width&&geometry.bottom<=viewport.height);
    assert.ok(geometry.scrollWidth<=geometry.clientWidth&&geometry.scrollHeight<=geometry.clientHeight);
    assert.ok(geometry.textInside&&geometry.closeInside&&!geometry.pageOverflow);
    assert.ok(geometry.fontSize>=20&&geometry.closeWidth>=44&&geometry.closeHeight>=44);
    await page.keyboard.press('Tab');
    assert.equal(await close.evaluate(button=>button===document.activeElement),true);
    await page.screenshot({path:`artifacts/development-notice-${viewport.width}.png`});
    await close.click();assert.equal(await notice.count(),0);
    assert.equal(await page.locator('#start-game').isVisible(),true);
    await page.locator('[data-hero="ogre_magi"]').click();
    assert.match(await page.locator('#selected-info').textContent(),/食人魔魔法师/);
    await page.reload({waitUntil:'networkidle'});
    await notice.waitFor({state:'visible'});assert.equal(await notice.locator('p').textContent(),message);
    await page.keyboard.press('Escape');assert.equal(await notice.count(),0);
    checks.push({viewport,geometry,initial:true,reload:true,close:true,escape:true,focus:true});
    console.log(`PASS development notice at ${viewport.width}×${viewport.height}: open, reload, close, focus and viewport fit`);
    await page.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile('artifacts/development-notice-report.json',JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}

import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createCoopServer} from '../server/coop-server.mjs';
import {Navigator} from '../src/navigation.js';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

await mkdir('artifacts',{recursive:true});
const service=createCoopServer({root:fileURLToPath(new URL('..',import.meta.url)),port:0});await service.listen();
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
const check=name=>{checks.push(name);console.log('PASS '+name);};page.on('pageerror',e=>errors.push(e.message));
async function rightClick(point){const position=await page.evaluate(point=>{r.zoom=.5;r.lookAt(point.x,point.y-100/r.zoom);return r.worldToScreen(point.x,point.y);},point);await page.locator('#battlefield').click({button:'right',position});}
try{
 await page.goto(`http://127.0.0.1:${service.server.address().port}`,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(game,time){window.g=game;window.r=this;return render.call(this,game,time);};});
 await page.locator('#open-coop').click();await page.waitForFunction(()=>document.querySelector('#coop-connection').textContent.includes('已连接'));
 await page.locator('#coop-name').fill('Chen Orders');await page.locator('#coop-join-hero').selectOption('chen');await page.locator('#coop-fill-ai').check();await page.locator('#coop-create').click();await page.waitForSelector('#coop-room-code');
 const code=await page.locator('#coop-room-code').textContent();await page.locator('#coop-ready').click();await page.waitForFunction(()=>!document.querySelector('#coop-start').disabled);await page.locator('#coop-start').click();await page.waitForFunction(()=>window.g?.isNetwork&&g.player.heroId==='chen');await page.locator('#control-hint button').click();
 const room=service.manager.rooms.get(code),game=room.game,p=game.player,z=game.entities.find(e=>e.zealot&&e.ownerId===p.id);
 assert.equal(game.entities.filter(e=>e.kind==='hero').length,10);assert.equal(game.entities.filter(e=>e.kind==='hero'&&!e.isHuman).length,9);
 game.entities=[p,z];game.nextWave=game.nextNeutralSpawn=game.roshanRespawnAt=Infinity;game._neutralTick=()=>{};game._creepTick=()=>{};
 game.navigation=new Navigator({cols:160,rows:160,cellSize:64,blocked:'0'.repeat(25600)},[]);Object.assign(p,{x:6000,y:6000,attackCooldown:Infinity});Object.assign(z,{x:6080,y:6000,attackCooldown:Infinity});game._index();service.manager.broadcastSnapshot(room);
 await page.waitForFunction(()=>g.player.x===6000);await page.locator(`[data-owned-unit="${z.id}"]`).click();await page.waitForFunction(id=>g.selected.id===id,z.id);
 await rightClick({x:7350,y:6000});await page.waitForFunction(id=>{const u=g.entities.find(e=>e.id===id);return u.creatureOrder==='hold'&&Math.abs(u.x-7350)<4;},z.id);
 assert.ok(Math.hypot(z.x-p.x,z.y-p.y)>600);
 const enemy=(x,y)=>{const e=game._unit('creep',1,x,y,{lane:1,name:'测试敌人',maxHp:10000,hpRegen:0,speed:0,range:0,armor:0,attackCooldown:Infinity});game.entities.push(e);game._index();service.manager.broadcastSnapshot(room);return e;};
 const nearby=enemy(z.x+80,z.y),park={x:z.x,y:z.y},start=game.time;await page.waitForFunction(time=>g.time>time+1,start);
 assert.equal(nearby.hp,10000);assert.equal(z.targetId,null);assert.ok(Math.hypot(z.x-park.x,z.y-park.y)<.01);
 check('A real nine-AI room accepts independent Zealot movement beyond 600 and preserves parked orders through repeated WebSocket snapshots');

 const selected=enemy(z.x+1000,z.y);await page.waitForFunction(id=>g.entities.some(e=>e.id===id),selected.id);await rightClick(selected);
 await page.waitForFunction(({id,target})=>g.entities.find(e=>e.id===id)?.explicitTarget===target,{id:z.id,target:selected.id});
 await page.waitForFunction(({id,x})=>g.entities.find(e=>e.id===id).x>x+90,{id:z.id,x:park.x});assert.equal(z.targetId,selected.id);assert.equal(nearby.hp,10000);
 game._kill(selected,z);await page.waitForFunction(({id,target})=>g.entities.find(e=>e.id===id)?.huntTargetId===target,{id:z.id,target:nearby.id});
 await rightClick({x:7600,y:6300});await page.waitForFunction(id=>g.entities.find(e=>e.id===id)?.creatureOrder==='hold',z.id);assert.equal(z.targetId,null);
 await rightClick(nearby);await page.waitForFunction(({id,target})=>g.entities.find(e=>e.id===id)?.explicitTarget===target,{id:z.id,target:nearby.id});
 game._kill(nearby,z);const next=enemy(z.x+550,z.y);await page.waitForFunction(({id,target})=>g.entities.find(e=>e.id===id)?.huntTargetId===target,{id:z.id,target:next.id});
 game._kill(next,z);await page.waitForFunction(id=>g.entities.find(e=>e.id===id)?.creatureOrder==='follow',z.id);const d=Math.hypot(z.x-p.x,z.y-p.y);await page.waitForFunction(({id,d})=>{const u=g.entities.find(e=>e.id===id);return Math.hypot(u.x-g.player.x,u.y-g.player.y)<d-90;},{id:z.id,d});
 check('Server-authoritative enemy orders chase far targets, hunt after kills, stop hunting on ground clicks and return to Chen when the fight ends');

 await page.locator('#stop-controlled-unit').click();await page.waitForFunction(id=>g.entities.find(e=>e.id===id)?.creatureOrder==='hold',z.id);
 game._addXp(p,1e8);service.manager.broadcastSnapshot(room);
 await page.waitForFunction(id=>{const u=g.entities.find(e=>e.id===id);return u.zealotGrowth?.level===30&&u.zealotGrowth.attackSpeed===400&&u.zealotGrowth.armor===50&&u.zealotGrowth.magicResistancePct===60;},z.id);
 assert.equal(z.zealotGrowth.damage,464);await page.locator('[data-unit-ability="chen_zealot_growth"]').hover();assert.match(await page.locator('.unit-abilities .skill-tooltip').textContent(),/上限 400/);
 await page.locator('#hud-unit-details').click();await page.waitForSelector('#hero-stat-tooltip:not([hidden])');
 const attributes=await page.locator('#hero-stat-tooltip').evaluate(el=>Object.fromEntries([...el.querySelectorAll('dl>div')].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent])));
 assert.equal(attributes['护甲'],'52');assert.equal(attributes['魔法抗性'],'60%');assert.equal(attributes['攻击速度'],'500');await page.getByRole('button',{name:'关闭详细属性',exact:true}).click();
 check('Growth and its three caps are calculated by the server, reach the real WebSocket client and appear in the selected unit’s portrait attributes');
 const foreign=game._unit('summon',1,9500,9500,{ownerId:'other-owner'});game.entities.push(foreign);game._index();service.manager.broadcastSnapshot(room);
 assert.equal((await page.evaluate(id=>g.invoke('unitCommand',[id,'moveTo',[7000,7000]]),foreign.id)).ok,false);
 await page.keyboard.press('F1');await page.waitForFunction(()=>g.selected.id===g.player.id);
 await page.locator(`[data-inspect-hero="${p.id}"]`).click();assert.ok(await page.locator('#hero-stat-tooltip').isVisible());
 check('Stop works over WebSocket; ownership checks reject another unit’s forged command; F1 restores hero control');
 await page.getByRole('button',{name:'关闭详细属性',exact:true}).click();
 await page.locator(`[data-owned-unit="${z.id}"]`).click();game._kill(z,null);service.manager.broadcastSnapshot(room);
 await page.waitForFunction(()=>document.querySelector('.game-hud').dataset.unitId===g.player.id);
 const startX=p.x;await rightClick({x:p.x+350,y:p.y});
 await page.waitForFunction(x=>g.player.x>x+40,startX);assert.ok(p.x>startX+20);
 check('After the selected Zealot dies, the same client sends movement to Chen and the server moves him without reselection');
 assert.deepEqual(errors,[]);await page.screenshot({path:'artifacts/chen-coop.png'});await writeFile('artifacts/chen-coop-report.json',JSON.stringify({checks,errors},null,2)+'\n');
}catch(error){await page.screenshot({path:'artifacts/chen-coop-failure.png'});throw error;}finally{await browser.close();await service.close();}

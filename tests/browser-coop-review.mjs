import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import WebSocket from 'ws';
import { decodeMessage } from '../src/network-protocol.js';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

const base=process.env.GAME_URL||'http://127.0.0.1:5190',peers=[],issues=[],errors=[];
await mkdir('artifacts',{recursive:true});const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
async function peer(hero,code){
 const socket=new WebSocket(new URL('/ws/coop',base).href.replace(/^http/,'ws'));peers.push(socket);
 const welcome=new Promise(resolve=>socket.on('message',data=>{const message=decodeMessage(data.toString());if(message.type==='snapshot')socket.send(JSON.stringify({type:'snapshotAck',frame:message.frame}));if(message.type==='welcome')resolve();}));
 await once(socket,'open');socket.send(JSON.stringify({type:'hello'}));await welcome;
 socket.send(JSON.stringify({type:'join',code,name:hero,heroId:hero}));socket.send(JSON.stringify({type:'ready',ready:true}));return socket;
}
try{
 await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){if(g)window.observedGame=g;return render.call(this,g,t);};});
 await page.locator('#open-coop').click();await page.waitForFunction(()=>document.querySelector('#coop-connection').textContent.includes('已连接'));
 await page.locator('#coop-name').fill('界面回归真人');await page.locator('#coop-join-hero').selectOption('ogre_magi');await page.locator('#coop-create').click();await page.waitForSelector('#coop-room-code');
 const code=await page.locator('#coop-room-code').textContent();for(const hero of ['juggernaut','crystal_maiden','windranger','axe'])await peer(hero,code);
 await page.locator('#coop-ready').click();await page.waitForFunction(()=>!document.querySelector('#coop-start').disabled);await page.locator('#coop-start').click();await page.waitForFunction(()=>window.observedGame?.isNetwork);
 await page.keyboard.press('F3');
 try{await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('信使已收到运输指令'),{},{timeout:1500});}catch{issues.push('F3 does not display the authoritative courier acknowledgement');}
 peers.at(-1).close();await page.waitForSelector('#coop-reconnecting');await page.keyboard.press('Escape');await page.locator('#back-lobby').waitFor();
 try{await page.locator('#back-lobby').click({timeout:1500});}catch{
   issues.push('Reconnect overlay intercepts the menu leave button');await page.locator('#back-lobby').focus();await page.keyboard.press('Enter');
 }
 await page.waitForSelector('#start-game');await page.locator('#start-game').click();await page.waitForFunction(()=>window.observedGame&&!window.observedGame.isNetwork);
 await page.waitForTimeout(1300);if(await page.locator('#coop-reconnecting').count())issues.push('Old reconnect countdown recreates its overlay over an offline match');
 assert.deepEqual(issues,[]);assert.deepEqual(errors,[]);
 await page.screenshot({path:'artifacts/coop-leave-offline.png'});await writeFile('artifacts/coop-review-browser-report.json',JSON.stringify({checks:['F3 server acknowledgement','Reconnect menu remains clickable','Leaving cancels reconnect timer'],errors},null,2));
 console.log('Cooperative review regressions: 3 checks passed.');
}finally{for(const socket of peers)socket.close();await browser.close();}

import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createCoopServer} from '../server/coop-server.mjs';
import {createMeta} from '../src/inventory.js';
import {Navigator} from '../src/navigation.js';
import {createIllusions} from '../src/illusions.js';
import * as Skills from '../src/hero-runtime.js';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const service=createCoopServer({root:fileURLToPath(new URL('..',import.meta.url)),port:0});await service.listen();
const base=`http://127.0.0.1:${service.server.address().port}`,browser=await chromium.launch(),pages=[],contexts=[],checks=[],errors=[];
const check=name=>{checks.push(name);console.log('PASS '+name);};await mkdir('artifacts',{recursive:true});
try{
 for(let i=0;i<2;i++){const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();contexts.push(context);pages.push(page);page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(game,t){window.g=game;window.r=this;return render.call(this,game,t);};});await page.locator('#open-coop').click();await page.waitForFunction(()=>document.querySelector('#coop-connection').textContent.includes('已连接'));await page.locator('#coop-name').fill('Illusion Player '+i);await page.locator('#coop-join-hero').selectOption(i?'crystal_maiden':'juggernaut');}
 const [a,b]=pages;await a.locator('#coop-fill-ai').check();await a.locator('#coop-create').click();await a.waitForSelector('#coop-room-code');const code=await a.locator('#coop-room-code').textContent();await b.locator('#coop-code').fill(code);await b.locator('#coop-join').click();await b.waitForSelector('#coop-room-code');for(const p of pages)await p.locator('#coop-ready').click();await a.waitForFunction(()=>!document.querySelector('#coop-start').disabled);await a.locator('#coop-start').click();for(const p of pages)await p.waitForFunction(()=>g?.isNetwork);
 const room=service.manager.rooms.get(code),game=room.game,humans=game.entities.filter(e=>e.isHuman);game.entities=humans;game.nextWave=game.nextNeutralSpawn=game.roshanRespawnAt=1e9;game._chooseTarget=()=>null;game.navigation=new Navigator({cols:160,rows:160,cellSize:64,blocked:'0'.repeat(25600)},[]);
 for(const [i,p]of humans.entries()){Object.assign(p,{x:6000+i*550,y:6000,level:15,abilityLevels:[4,4,4,2],inventory:['manta'],cooldowns:[0,0,0,0],destination:null,explicitTarget:null});p.inventoryMeta=[createMeta(p,'manta')];game._refreshHero(p);p.mana=p.maxMana;}
 game._index();service.manager.broadcastSnapshot(room);for(const p of pages){await p.waitForFunction(()=>g.player.inventory[0]==='manta');await p.locator('#control-hint button').click();await p.evaluate(()=>{r.zoom=.8;r.lookAt(g.player.x,g.player.y-55/r.zoom);});await p.locator('#battlefield').focus();await p.keyboard.press('1');await p.waitForFunction(()=>g.entities.filter(e=>e.kind==='illusion'&&e.ownerId===g.player.id).length===2);for(const c of game.entities.filter(e=>e.kind==='illusion'))c.expiresAt=game.time+120;}
 const ownId=await a.evaluate(()=>g.entities.find(e=>e.kind==='illusion'&&e.ownerId===g.player.id).id);const position=await a.evaluate(id=>{const c=g.entities.find(e=>e.id===id);return r.worldToScreen(c.x,c.y);},ownId);await a.locator('#battlefield').click({position});await a.waitForFunction(id=>g.selected.id===id,ownId);const before=humans.map(h=>({id:h.id,x:h.x,y:h.y})),x=game.entities.find(e=>e.id===ownId).x,time=game.time;
 await a.keyboard.down('ArrowLeft');await a.waitForFunction(t=>g.time>t+.7,time);await a.keyboard.up('ArrowLeft');await a.waitForFunction(id=>g.entities.find(e=>e.id===id)?.movementInput.x===0,ownId);assert.ok(game.entities.find(e=>e.id===ownId).x<x-80);assert.deepEqual(humans.map(h=>({id:h.id,x:h.x,y:h.y})),before);const moved=game.entities.find(e=>e.id===ownId).x;await b.waitForFunction(({id,x})=>Math.abs(g.entities.find(e=>e.id===id).x-x)<.01,{id:ownId,x:moved});check('Two real browser identities create Manta illusions and synchronize independent manual movement through WebSocket commands');
 const rejected=await b.evaluate(id=>g.invoke('unitCommand',[id,'moveTo',[7000,7000]]),ownId);assert.equal(rejected.ok,false);assert.equal(game.entities.find(e=>e.id===ownId).destination,null);assert.equal(game.entities.find(e=>e.id===ownId).ownerId,humans[0].id);const weakCast=await a.evaluate(id=>g.invoke('unitCommand',[id,'cast',[0,{x:6500,y:6000}]]),ownId);assert.equal(weakCast.ok,false);check('Server rejects forged commands for another player’s illusion and rejects weak-illusion active skills');
 await a.keyboard.press('Space');await a.waitForFunction(()=>g.selected.id===g.player.id);const still=game.entities.find(e=>e.id===ownId).x;await a.keyboard.down('ArrowRight');await a.waitForFunction(x=>g.player.x>x+30,humans[0].x);await a.keyboard.up('ArrowRight');assert.equal(game.entities.find(e=>e.id===ownId).x,still);await a.screenshot({path:'artifacts/illusion-coop.png'});check('Returning control to the owner leaves its illusion stationary when no enemies are nearby');
 const automatic=game.entities.find(e=>e.id===ownId),neutral=game._unit('neutral',2,automatic.x-400,automatic.y,{maxHp:10000,speed:0});
 game._neutralTick=()=>{};game.entities.push(neutral);game._index();service.manager.broadcastSnapshot(room);
 for(const page of pages)await page.waitForFunction(({id,target})=>g.entities.find(e=>e.id===id)?.targetId===target,{id:ownId,target:neutral.id});
 for(const page of pages)await page.waitForFunction(id=>{const e=g.entities.find(e=>e.id===id);return e&&e.hp<e.maxHp;},neutral.id);
 assert.equal(automatic.explicitTarget,null);assert.ok(automatic.x<still-150);game._kill(neutral,null);
 check('Both WebSocket clients observe the server automatically acquiring, chasing and damaging an unprovoked neutral with a weak illusion');
 const owner=humans[0],caster=game._makeHero('ogre_magi',0,1,false,0);
 Object.assign(caster,{x:owner.x+180,y:owner.y,level:15,abilityLevels:[0,0,4,0],talents:[3],skillPoints:0,aiTimer:Infinity});
 game._refreshHero(caster);caster.mana=caster.maxMana;assert.equal(game._cast(caster,2,owner).ok,true);
 await a.waitForFunction(()=>g.player.statuses?.ogreBloodlust?.attackSpeed>0);
 const expected=Skills.skillOf(caster,2).values.bonus_attack_speed;
 const snapshots=['weak','strong'].map((type,i)=>{
  const clone=createIllusions(game,owner,1,120,33,300,{type})[0];
  Object.assign(clone,{x:owner.x+(i?2500:-300),y:owner.y+200});return clone;
 });
 owner.statuses.ogreBloodlust.attackSpeed+=100;Skills.addStatus(game,owner,'laterArmor',{positive:true,duration:20,armor:50});
 game._index();service.manager.broadcastSnapshot(room);
 const ids=snapshots.map(c=>c.id);
 for(const page of pages)await page.waitForFunction(({ids,expected})=>ids.every(id=>{
  const c=g.entities.find(e=>e.id===id);return c&&c.statuses?.ogreBloodlust?.attackSpeed===expected&&!c.statuses?.laterArmor;
 }),{ids,expected});
 assert.ok(snapshots.every(c=>c.statuses.ogreBloodlust.attackSpeed===expected&&!c.statuses.laterArmor));
 check('Both clients preserve independent weak and strong snapshots of a talent-enhanced buff while later owner changes remain on the owner');
 const strong=snapshots[1],target=game._unit('neutral',2,strong.x+250,strong.y,{maxHp:10000,speed:0});
 game.entities.push(target);game._index();service.manager.broadcastSnapshot(room);
 const idleAt=game.time;await a.waitForFunction(time=>g.time>time+.5,idleAt);
 assert.equal(strong.targetId,null);assert.equal(target.hp,target.maxHp);
 const ordered=await a.evaluate(({id,target})=>g.invoke('unitCommand',[id,'attackTarget',[target]]),{id:strong.id,target:target.id});
 assert.equal(ordered.ok,true);for(const page of pages)await page.waitForFunction(id=>{const e=g.entities.find(e=>e.id===id);return e&&e.hp<e.maxHp;},target.id);
 assert.equal(strong.explicitTarget,target.id);check('A strong illusion remains idle beside an enemy until its owner sends a real WebSocket attack command');
 assert.deepEqual(errors,[]);await writeFile('artifacts/illusion-coop-report.json',JSON.stringify({checks,errors},null,2)+'\n');
}catch(error){const state=await Promise.all(pages.map(p=>p.evaluate(()=>({time:g?.time,player:g?.player?.id,selected:g?.selected?.id,modal:document.querySelector('.modal')?.textContent,toast:document.querySelector('#toast')?.textContent,clones:g?.entities.filter(e=>e.kind==='illusion').map(e=>({id:e.id,x:e.x,y:e.y,input:e.movementInput}))}))));console.log(JSON.stringify(state));await pages[0]?.screenshot({path:'artifacts/illusion-coop-failure.png'});throw error;}finally{for(const c of contexts)await c.close();await browser.close();await service.close();}

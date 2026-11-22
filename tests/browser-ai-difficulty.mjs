import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';

const url=process.env.GAME_URL||'http://127.0.0.1:5184',ids=['easy','normal','hard','nightmare','hell'];
const selected=process.argv.includes('--difficulty')?process.argv[process.argv.indexOf('--difficulty')+1]:null;
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
async function observe(){await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.difficultyGame=g;return render.call(this,g,t);};});}
try{
 await page.goto(url,{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 assert.deepEqual(await page.locator('#difficulty option').evaluateAll(nodes=>nodes.map(n=>n.value)),ids);
 await page.locator('.settings-button').click();
 assert.deepEqual(await page.locator('#setting-difficulty option').evaluateAll(nodes=>nodes.map(n=>n.value)),ids);
 await page.keyboard.press('Escape');
 for(const id of selected?[selected]:ids){
  await page.locator('#difficulty').selectOption(id);await observe();await page.locator('#start-game').click();
  await page.waitForFunction(()=>window.difficultyGame?.time>.15);
  const actual=await page.evaluate(()=>({difficulty:difficultyGame.difficulty,bots:difficultyGame.entities.filter(e=>e.kind==='hero'&&!e.isPlayer).length,hero:difficultyGame.player.heroId}));
  assert.equal(actual.difficulty,id);assert.equal(actual.bots,9);results.push(actual);
  await page.waitForFunction(id=>{try{return JSON.parse(localStorage.getItem('af-single-match-v1')).state.difficulty===id;}catch{return false;}},id);
  await page.reload({waitUntil:'networkidle'});await closeDevelopmentNotice(page);
  assert.equal(await page.locator('#difficulty').inputValue(),id);
  await observe();await page.locator('#resume-game').click();await page.waitForFunction(()=>window.difficultyGame?.time>.15);
  assert.equal(await page.evaluate(()=>difficultyGame.difficulty),id);
  await page.reload({waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 }
 await page.screenshot({path:'artifacts/ai-five-difficulties.png'});assert.deepEqual(errors,[]);
 await writeFile('artifacts/ai-difficulty-browser.json',JSON.stringify({results,errors},null,2));
 console.log(`PASS ${results.length} difficulty selections, real nine-AI starts and saved-match resumes`);
}finally{await browser.close();}

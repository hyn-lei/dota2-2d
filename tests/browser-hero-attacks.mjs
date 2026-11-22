import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {closeDevelopmentNotice} from './browser-helpers.mjs';
const requested=process.argv.includes('--scenario')?process.argv[process.argv.indexOf('--scenario')+1]:'all';
const scenarios=requested==='all'?['cycle','cancel','pause','network','geminate','heroes']:[requested];
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5184',{waitUntil:'networkidle'});await closeDevelopmentNotice(page);
 await page.evaluate(async()=>{const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;Renderer.prototype.render=function(g,t){window.attackScene=g;window.attackRenderer=this;return render.call(this,g,t);};});
 await page.locator('[data-hero="weaver"]').click();await page.locator('#start-game').click();await page.waitForFunction(()=>window.attackScene?.time>.1);
 await page.waitForFunction(async()=>{const {loadHeroSprites}=await import('/src/hero-sprites.js');const img=loadHeroSprites();return img?.complete&&img.naturalWidth>0;});
 for(const scenario of scenarios){
 if(scenario==='melee'||scenario==='heroes'){
  const checks=await page.evaluate(async scenario=>{
   const {drawHeroSprite}=await import('/src/hero-sprites.js'),g=attackScene,r=attackRenderer,checks=[],pictures=[];
   const sample=(h,pose)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=320;const c=canvas.getContext('2d');c.translate(160,210);c.scale(2.05,2.05);drawHeroSprite(c,h,-Math.PI/2,pose);return canvas.toDataURL();};
   const armed=['axe','kunkka','chaos_knight','ogre_magi'],heroes=scenario==='heroes'?Object.keys((await import('/src/data.js')).HEROES):armed;
   for(const id of heroes){
    const h=g._makeHero(id,0,1,true,1),target=g._makeHero('axe',1,1,false,2);
    Object.assign(h,{x:10400,y:10400,attackCooldown:0,abilityLevels:[0,0,0,0],statuses:{}});
    Object.assign(target,{x:h.x+(h.range>200?250:70),y:10400,speed:0,aiTimer:Infinity,attackCooldown:999,hp:50000,maxHp:50000});
    g.entities=[h,target];g.effects=[];g.pendingSpells=[];g.time+=2;g.paused=false;g._index();
    if(!g._attack(h,target))throw Error(id+' must start a real attack');
    const point=h.attackPhase?.executeAt??g.time;g.step(point-g.time+.06);g.paused=true;r.render(g,g.time);
    const pose=r.heroAttacks.pose(h,g.time),jointOnly={...pose,x:0,rotation:0,scaleX:1,scaleY:1};
    if(armed.includes(id)&&sample(h,jointOnly)===sample(h,null))throw Error(id+' weapon must move independently of the body during a real attack');
    if(!r.heroAttacks.pose(h,g.time))throw Error(id+' must follow through after a real hit');
    if(sample(h,pose)===sample(h,null))throw Error(id+' must animate its character after a real attack');
    pictures.push({hero:id,idle:sample(h,null),strike:sample(h,pose)});
    checks.push(id);
   }
   return {checks,pictures};
  },scenario);
  for(const picture of checks.pictures)for(const state of ['idle','strike'])await writeFile('artifacts/'+picture.hero+'-attack-'+state+'.png',Buffer.from(picture[state].split(',')[1],'base64'));
  assert.deepEqual(errors,[]);console.log('PASS real character attacks and independent melee weapons for '+checks.checks.join(', '));
  process.exitCode=0;
 }else{
 const report=await page.evaluate(scenario=>{
  const g=attackScene,p=g.player,e=g._makeHero('axe',1,1,false,0),r=attackRenderer;
  Object.assign(p,{x:10400,y:10400,destination:null,explicitTarget:null,movementInput:{x:0,y:0},attackCooldown:0,attackPhase:null,attackFlash:0,abilityLevels:[0,0,0,0],statuses:{}});
  Object.assign(e,{x:10650,y:10400,speed:0,aiTimer:Infinity,attackCooldown:999,hp:50000,maxHp:50000,abilityLevels:[0,0,0,0]});
  g.entities=[p,e];g.effects=[];g.pendingSpells=[];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=g.nextBuildingCheck=Infinity;g.time=10;g.paused=false;g._index();
  const sample=h=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=320;const c=canvas.getContext('2d');c.translate(160,210);r.drawUnit(c,{...h,x:0,y:0},g,g.time);return canvas.toDataURL();};
  window.attackSample=sample;
  const idle=()=>sample({...p,id:'idle-'+p.id,attackPhase:null,attackFlash:0});
  const same=(a,b,message)=>{if(a!==b)throw Error(message);},different=(a,b,message)=>{if(a===b)throw Error(message);};
  const baseline=idle();if(scenario==='idle')return {scenario,baseline};if(!g._attack(p,e)||!p.attackPhase)throw Error('A real Weaver attack must start a windup');g.step(.08);g.paused=true;r.render(g,g.time);
  if(scenario==='geminate'){
   g.paused=false;p.abilityLevels[2]=1;p.attackSpeed=700;g.attackTarget(e.id);
   let overlap=false;
   for(let i=0;i<60;i++){
    g.step(.025);r.render(g,g.time);
    const extra=g.effects.find(f=>f.sourceId===p.id&&f.visual==='weaverGeminate'&&f.startedAt>p.attackPhase?.startedAt);
    if(!extra)continue;
    overlap=true;
    if(r.heroAttacks.pose(p,g.time)?.phase==='windup')throw Error('A real Geminate release during a new windup must still animate the extra strike');
    break;
   }
   if(!overlap)throw Error('The real fast-attack sequence must include overlapping Geminate release and windup');
   g.paused=true;return {scenario,baseline,geminateOverlap:true};
  }
  const windup=sample(p),rest=idle();if(scenario==='cycle'||scenario==='windup')different(windup,rest,'The real attack windup must move the character, not just its projectile');
  if(scenario==='cancel'){
   e.x=p.x+2000;g._index();g.paused=false;g.setMovement(0,1);g.step(.05);g.paused=true;r.render(g,g.time);
   if(p.attackPhase)throw Error('Movement must cancel the real windup');same(sample(p),idle(),'A cancelled windup cannot play a release animation');return {scenario,baseline,cancelled:true};
  }
  g.paused=false;g.step(.36);g.paused=true;r.render(g,g.time);
  if(!g.pendingSpells.some(s=>s.type==='attack'&&s.sourceId===p.id))throw Error('Release must launch the real attack');
  const released=sample(p);if(scenario==='cycle'||scenario==='release')different(released,idle(),'The real release must animate the character');
  if(scenario==='network'){
   p.attackSpeed=700;
   // Keep one actual released-attack snapshot fixed while presentation advances.
   // A stalled server packet must not restart the same high-speed attack.
   const sourceTime=g.time,view=Object.create(g);
   view.time=sourceTime+.03;r.heroAttacks.update(view,g);
   if(!r.heroAttacks.pose(p,view.time))throw Error('The network snapshot must initially show the real strike');
   view.time=sourceTime+.2;r.heroAttacks.update(view,g);
   if(r.heroAttacks.pose(p,view.time))throw Error('An unchanged network attack snapshot must recover once, without replaying its release flash');
   g.time=sourceTime+.04;view.time=g.time;r.heroAttacks.update(view,g);
   if(r.heroAttacks.pose(p,view.time))throw Error('A delayed newer authoritative snapshot must not rewind an already recovered attack');
   return {scenario,baseline,released,networkRecovered:true};
  }
  window.pausedAttackImage=released;
  if(scenario==='pause')return {scenario,baseline,windup,released};
  g.paused=false;g.step(.5);g.paused=true;r.render(g,g.time);const recovered=sample(p);same(recovered,idle(),'Completed recovery must return to the unchanged idle pose');
  return {scenario,baseline,windup,released,recovered};
 },scenario);
 if(scenario==='pause'){
  const before=await page.evaluate(()=>attackSample(attackScene.player));await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>attackSample(attackScene.player)),before,'paused attack frames must stay stable');
 }
 if(scenario===scenarios[0])await writeFile('artifacts/weaver-idle-reference.png',Buffer.from(report.baseline.split(',')[1],'base64'));
 for(const state of ['windup','released','recovered'])if(report[state])await writeFile('artifacts/weaver-attack-'+state+'.png',Buffer.from(report[state].split(',')[1],'base64'));
 assert.deepEqual(errors,[]);console.log('PASS real hero attack '+scenario+' animation checks');
 }
 }
}finally{await browser.close();}

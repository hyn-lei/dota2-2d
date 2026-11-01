import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { closeDevelopmentNotice } from './browser-helpers.mjs';

const base=process.env.GAME_URL||'http://localhost:5184';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const checks=[];const check=name=>{checks.push(name);console.log(`PASS ${name}`);};
try{
  await page.goto(base,{waitUntil:'networkidle'});
  await closeDevelopmentNotice(page);
  await page.evaluate(async()=>{
    const {Renderer}=await import('/src/renderer.js'),render=Renderer.prototype.render;
    Renderer.prototype.render=function(game,t){window.vfxRenderer=this;window.liveGame=game;return render.call(this,window.vfxGame||game,window.vfxGame?.time??t);};
  });
  await page.locator('#start-game').click();await page.waitForFunction(()=>window.liveGame?.time>.2);
  const result=await page.evaluate(async()=>{
    const {Game}=await import('/src/engine.js');
    const {attackVisualFields,effectPose,unitVisuals}=await import('/src/combat-visuals.js');
    const {drawCombatEffect,drawUnitCombatEffects}=await import('/src/combat-effects.js');
    const {interruptCast,applyDispel,applyStun,castExtraAbility}=await import('/src/hero-runtime.js');
    const {Renderer}=await import('/src/renderer.js');
    const assert=(condition,message)=>{if(!condition)throw Error(message);};
    const canvas=document.createElement('canvas');canvas.width=380;canvas.height=260;const c=canvas.getContext('2d');
    const snapshot=draw=>{c.clearRect(0,0,380,260);draw();return canvas.toDataURL();};
    function arena(hero,team=0){
      const g=new Game({hero}),p=g.player,e=g.entities.find(u=>u.kind==='hero'&&u.team===1&&u.heroId==='crystal_maiden');
      g.entities=[p,e];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
      Object.assign(p,{x:10400,y:10400,team,abilityLevels:[4,4,4,3],level:25,skillPoints:0,mana:5000,maxMana:5000,attackCooldown:999,manaRegen:0,hpRegen:0});
      Object.assign(e,{x:10600,y:10400,team:1-team,maxHp:10000,hp:10000,armor:0,magicResistance:0,speed:0,hpRegen:0,attackCooldown:999,cooldowns:[999,999,999,999],aiTimer:Infinity,abilityLevels:[0,0,0,0]});g._index();return {g,p,e};
    }
    const cases=[];
    for(const team of [0,1])for(const [hero,index,step,expected]of [
      ['crystal_maiden',0,.4,'frostNova'],['windranger',0,.16,'shackleShot'],['windranger',1,1.05,'powershot'],
      ['axe',0,.4,'berserkerCall'],['axe',3,.5,'cullingBlade'],['kunkka',0,2.1,'torrent'],['kunkka',3,.5,'ship']]){
      const {g,p,e}=arena(hero,team);if(hero==='axe'&&index===3)e.x=p.x+120;
      const cast=g.cast(index,e);assert(cast.ok,`${hero} cast ${index}: ${cast.reason}`);g.step(step);
      assert(g.effects.some(f=>f.visual===expected||f.type===expected),`${hero} team ${team} ${expected}`);cases.push(`${hero}:${expected}:${team}`);
    }
    const {g,p,e}=arena('windranger');p.attackCooldown=0;g._attack(p,e);const attack=g.effects.findLast(f=>f.type==='projectile');
    const pose=effectPose(attack,attack.startedAt+attack.maxLife*.5,g.entities);
    assert(Math.abs(pose.x-(attack.x+attack.tx)/2)<1e-7,'flight midpoint');
    const drawAt=progress=>snapshot(()=>drawCombatEffect(c,{...attack,x:50,y:150,tx:300,ty:150,startedAt:0},{time:attack.maxLife*progress,entities:[]},.6));
    assert(drawAt(.1)!==drawAt(.5)&&drawAt(.5)!==drawAt(.95),'distinct launch, flight and impact frames');
    const seed=g.seed,serial=g.serial,effects=JSON.stringify(g.effects);
    drawAt(.5);drawAt(.5);assert(seed===g.seed&&serial===g.serial&&effects===JSON.stringify(g.effects),'drawing cannot mutate simulation');
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=.63;c.globalCompositeOperation='source-over';c.setLineDash([3,2]);
    drawCombatEffect(c,{type:'projectile',visual:'frostAttack',x:0,y:0,tx:0,ty:0,life:.5,maxLife:1},{time:.5,entities:[]},.18);
    assert(c.globalAlpha===.63&&c.globalCompositeOperation==='source-over'&&c.getTransform().isIdentity&&c.getLineDash().join(',')==='3,2','Canvas state restored, zero-length shot finite');
    c.globalAlpha=1;c.setLineDash([]);
    const frost=arena('crystal_maiden');frost.g.cast(1,frost.e);frost.g.step(.4);
    assert(unitVisuals(frost.e,frost.g.time).includes('frostbite'),'frostbite persists on victim');
    delete frost.e.statuses.frostbite;assert(!unitVisuals(frost.e,frost.g.time).includes('frostbite'),'dispel removes ice');
    frost.e.statuses.root={until:99};assert(!unitVisuals(frost.e,frost.g.time).includes('frostbite'),'non-frost roots are not ice');
    const field=arena('crystal_maiden');field.g.cast(3,field.p);field.g.step(.1);
    assert(unitVisuals(field.p,field.g.time).includes('freezingField'),'channel displays field');
    const fieldFrame=snapshot(()=>{c.save();c.translate(-field.p.x+190,-field.p.y+160);drawUnitCombatEffects(c,field.p,field.g,.45,'ground');c.restore();});
    field.g.paused=true;const time=field.g.time;field.g.step(1);
    assert(field.g.time===time&&fieldFrame===snapshot(()=>{c.save();c.translate(-field.p.x+190,-field.p.y+160);drawUnitCombatEffects(c,field.p,field.g,.45,'ground');c.restore();}),'paused field stays pixel-identical');
    interruptCast(field.g,field.p,false);assert(!unitVisuals(field.p,field.g.time).includes('freezingField'),'interruption removes field');
    field.p.dead=true;assert(unitVisuals(field.p,field.g.time).length===0,'dead units have no aura');
    for(const team of [0,1]){
      const spin=arena('juggernaut',team);assert(spin.g.cast(0,spin.p).ok,'Blade Fury cast');spin.g.step(.1);assert(unitVisuals(spin.p,spin.g.time).includes('bladeFury'),'both-team Blade Fury');
      const omni=arena('juggernaut',team);omni.e.x=omni.p.x+120;assert(omni.g.cast(3,omni.e).ok,'Omnislash cast');omni.g.step(.45);assert(omni.g.effects.some(f=>f.visual==='omnislash'),'both-team Omnislash');
      const ward=arena('juggernaut',team);assert(ward.g.cast(1,ward.p).ok,'Healing Ward cast');ward.g.step(.45);assert(ward.g.entities.some(u=>unitVisuals(u,ward.g.time).includes('healingWard')),'both-team Healing Ward');
      cases.push(`juggernaut:bladeFury:${team}`,`juggernaut:omnislash:${team}`,`juggernaut:healingWard:${team}`);
    }
    const rope=arena('windranger');rope.e.x=rope.p.x+500;const anchor=rope.g._unit('creep',1,rope.p.x+650,rope.p.y,{speed:0,attackCooldown:999,lane:1,pathIndex:0});rope.g.entities.push(anchor);
    rope.g.cast(0,rope.e);rope.g.step(.7);const tether=rope.g.effects.find(f=>f.visual==='shackleLink');assert(tether,'real tether');
    const tetherFrame=()=>snapshot(()=>{c.save();c.translate(-rope.e.x+50,-rope.e.y+130);drawCombatEffect(c,tether,rope.g,.5);c.restore();});
    const attached=tetherFrame();applyDispel(rope.g,rope.e,true);const detached=tetherFrame();assert(attached!==detached,'dispel removes actual rope pixels');
    applyStun(rope.g,rope.e,1,{id:'other'});assert(tetherFrame()===detached,'unrelated stun cannot restore rope pixels');
    const dodge=arena('windranger');dodge.e.x=dodge.p.x+700;dodge.e.hasShard=true;dodge.g.cast(0,dodge.e);dodge.g.step(.16);
    const shot=dodge.g.effects.find(f=>f.visual==='shackleShot');assert(shot,'incoming arrow');castExtraAbility(dodge.g,dodge.e,'crystal_maiden_crystal_clone',{x:dodge.e.x+1000,y:dodge.e.y});dodge.g.step(.21);
    const blank=snapshot(()=>{}),disjointFrame=snapshot(()=>drawCombatEffect(c,{...shot,x:50,y:130,tx:300,ty:130},dodge.g,.5));assert(blank===disjointFrame,'disjoint leaves no arrow pixels');
    const mainRenderer=window.vfxRenderer,edgeCanvas=document.createElement('canvas');edgeCanvas.style.cssText='position:fixed;left:-1000px;width:400px;height:300px';document.body.append(edgeCanvas);
    const edgeRenderer=new Renderer(edgeCanvas);edgeRenderer.zoom=.45;edgeRenderer.followPlayer=false;edgeRenderer.lookAt(10400,10400);
    const edge=arena('crystal_maiden');edge.p.x=10400+400/2/.45+600;edge.g.cast(3,edge.p);edge.g.step(.1);edge.g.effects=[];edgeRenderer.render(edge.g,edge.g.time);const partialField=edgeCanvas.toDataURL();
    edge.p.channel=null;edgeRenderer.render(edge.g,edge.g.time);assert(partialField!==edgeCanvas.toDataURL(),'offscreen caster leaves its overlapping field visible');edgeRenderer.destroy();edgeCanvas.remove();window.vfxRenderer=mainRenderer;

    // A visual contact sheet, drawn by the production renderer at a playable scale.
    function sheet(id,title,rows,draw){
      const panel=document.createElement('section');panel.id=id;panel.style.cssText='position:absolute;inset:0 auto auto 0;width:1440px;background:#101b1c;color:#e3e8d8;padding:28px;box-sizing:border-box;z-index:9999;font:15px Segoe UI,Microsoft YaHei,sans-serif';
      const heading=document.createElement('h2');heading.textContent=title;heading.style.cssText='font-size:24px;margin:0 0 18px;font-weight:500';panel.append(heading);
      const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:14px';panel.append(grid);
      for(const [i,row]of rows.entries()){
        const cell=document.createElement('div');cell.style.cssText='background:#1e302f;border:1px solid #41544c;overflow:hidden';
        const label=document.createElement('div');label.textContent=row.label;label.style.cssText='padding:12px 14px;color:#c8d4c0';cell.append(label);
        const tile=document.createElement('canvas');tile.width=440;tile.height=260;tile.style.cssText='display:block;width:100%;height:260px';cell.append(tile);grid.append(cell);draw(tile.getContext('2d'),row,i);
      }document.body.append(panel);return panel;
    }
    const attacks=[['冰女 · 冰晶普攻',0,'crystal_maiden'],['敌方冰女 · 冰晶普攻',1,'crystal_maiden'],['风行者 · 弓箭',0,'windranger'],
      ['敌方风行者 · 弓箭',1,'windranger'],['天辉防御塔 · 金色能量',0,'tower'],['夜魇防御塔 · 熔火',1,'tower'],
      ['天辉远程兵 · 光弹',0,'creep'],['夜魇远程兵 · 火弹',1,'creep'],['远程野怪 · 奥术弹',2,'neutral']].map(([label,team,id])=>({label,team,id}));
    sheet('vfx-attacks','弹道外形 · 双方英雄 / 防御塔 / 远程单位',attacks,(ctx,row)=>{
      const source={id:'source',kind:['tower','creep','neutral'].includes(row.id)?row.id:'hero',heroId:row.id,range:600,x:30,y:148,team:row.team};
      const fx={type:'projectile',x:source.x,y:source.y,startedAt:0,...attackVisualFields(source,{id:'target',x:410,y:148,kind:'hero'})};
      for(const p of [.15,.5,.88])drawCombatEffect(ctx,fx,{time:fx.life*p,entities:[]},.65);
    });
    const spells=[['冰霜新星','frostNova'],['剑刃风暴','bladeFury'],['淘汰之刃','cullingBlade'],['洪流','torrent'],['幽灵船','ship'],['反击螺旋','counterHelix'],['极寒领域','freezingField'],['束缚击 / 强力击','powershot'],['冰封禁制','frostbite']].map(([label,v])=>({label,v}));
    sheet('vfx-spells','英雄技能 · 冰霜 / 剑刃 / 斧击 / 海浪',spells,(ctx,row)=>{
      ctx.save();ctx.translate(220,130);ctx.scale(.44,.44);
      if(['bladeFury','freezingField','frostbite'].includes(row.v)){
        const a=arena(row.v==='bladeFury'?'juggernaut':'crystal_maiden');a.g.cast(row.v==='bladeFury'?0:row.v==='freezingField'?3:1,row.v==='frostbite'?a.e:a.p);a.g.step(.4);
        const u=row.v==='frostbite'?a.e:a.p;ctx.translate(-u.x,-u.y);drawUnitCombatEffects(ctx,u,a.g,.48,'ground');window.vfxRenderer.drawUnit(ctx,u,a.g,a.g.time);drawUnitCombatEffects(ctx,u,a.g,.48,'above');
      }else{
        const type=row.v==='ship'?'ship':row.v==='torrent'?'torrent':row.v==='powershot'?'beam':row.v==='cullingBlade'||row.v==='counterHelix'?'slash':'burst';
        const fx={type,visual:row.v,x:row.v==='powershot'?-250:0,y:0,tx:row.v==='powershot'?350:row.v==='ship'?50:0,ty:0,radius:row.v==='frostNova'?280:row.v==='counterHelix'?260:200,life:1,maxLife:1,startedAt:0,color:row.v==='powershot'?'#c2ed96':'#a3e2ed'};
        drawCombatEffect(ctx,fx,{time:.4,entities:[]},.48);
      }ctx.restore();
    });
    document.querySelector('#vfx-spells').hidden=true;
    window.vfxArena=arena;
    return {cases,checks:8};
  });
  assert.equal(result.cases.length,20);check('Actual spell events from both teams use distinct visuals');
  check('Projectile phases, Canvas state, zero-length paths and simulation independence');
  check('Persistent frost/channel effects follow dispel, interruption, death and pause');
  await page.locator('#vfx-attacks').screenshot({path:'artifacts/vfx-projectiles.png'});
  await page.evaluate(()=>{document.querySelector('#vfx-attacks').hidden=true;document.querySelector('#vfx-spells').hidden=false;});
  await page.locator('#vfx-spells').screenshot({path:'artifacts/vfx-skills.png'});
  await page.evaluate(()=>{
    document.querySelector('#vfx-attacks').remove();document.querySelector('#vfx-spells').remove();
    const {g,p,e}=window.vfxArena('crystal_maiden');g._makeHero('juggernaut',0,1,false,1);
    const jug=g.entities.at(-1);Object.assign(jug,{x:10050,y:10400,abilityLevels:[4,4,4,3],mana:5000,attackCooldown:999,aiTimer:Infinity});
    g._cast(jug,0,jug);g.cast(0,e);g.step(.4);g.paused=true;window.vfxGame=g;window.vfxRenderer.followPlayer=false;window.vfxRenderer.zoom=.45;window.vfxRenderer.lookAt(10400,10400);
  });
  await page.waitForTimeout(100);await page.screenshot({path:'artifacts/vfx-battle-desktop.png'});
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>window.vfxRenderer.zoom=.18);await page.waitForTimeout(100);
    await page.screenshot({path:`artifacts/vfx-battle-${viewport.width}.png`});
  }check('Combat renders at desktop/mobile viewports and minimum zoom');
  assert.deepEqual(errors,[]);await writeFile('artifacts/vfx-browser-report.json',JSON.stringify({checks,spellCases:result.cases,errors},null,2));
  console.log(`Browser VFX checks passed: ${checks.length} groups, ${result.cases.length} real spell cases.`);
}finally{await browser.close();}

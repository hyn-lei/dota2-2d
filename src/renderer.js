import { HEROES, TEAM_COLORS } from './data.js';
import { WORLD, BASES, MAP_IMAGE, CAMP_LAYOUT, MAP_OBJECTIVES, TREES } from './map-data.js';
import { drawCombatEffect, drawUnitCombatEffects, unitAuraRadius } from './combat-effects.js';

const TAU = Math.PI * 2;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
function random(seed=17) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function circle(c,x,y,r,fill,stroke,width=1) { c.beginPath(); c.arc(x,y,r,0,TAU); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();} }
function poly(c,points,fill,stroke,width=1) { c.beginPath(); points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p)); c.closePath(); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();} }
function line(c,points,color,width) { c.beginPath(); points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)); c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke(); }
const BUILDINGS = new Set(['tower','barracks','ancient','fountain','filler']);
const CAMP_NAMES = {small:'小型',medium:'中型',large:'大型',ancient:'远古',flooded_small:'洪流 · 小型',flooded_medium:'洪流 · 中型'};
const CAMP_COLORS = {small:'#e0cc8e',medium:'#dbad6a',large:'#d18b60',ancient:'#d8acdf',flooded_small:'#8ecac6',flooded_medium:'#78b6bd'};
const unitColor = e => TEAM_COLORS[e.team] || (e.ancient ? '#cfb0e0' : '#e4bd77');
let sharedMapAsset;

// Keep one decoded terrain image across lobby/match renderer lifecycles.
// The only terrain canvas is the 1024-square minimap, never WORLD.width².
function getMapAsset() {
  if(sharedMapAsset) return sharedMapAsset;
  const preview=document.createElement('canvas');preview.width=1024;preview.height=1024;
  const context=preview.getContext('2d');context.fillStyle='#18241e';context.fillRect(0,0,1024,1024);
  const asset={image:new Image(),preview,ready:false,failed:false};sharedMapAsset=asset;
  asset.image.decoding='async';
  asset.image.onload=()=>{
    asset.ready=true;
    const s=1024/WORLD.width;
    context.drawImage(asset.image,MAP_IMAGE.x*s,MAP_IMAGE.y*s,MAP_IMAGE.width*s,MAP_IMAGE.height*s);
  };
  asset.image.onerror=()=>{asset.failed=true;};
  asset.image.src=MAP_IMAGE.url;
  return asset;
}

export class Renderer {
  constructor(canvas) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera={x:BASES[0].x,y:BASES[0].y};
    this.zoom=.45;this.pointer={x:0,y:0};this.marker=null;this.lookUntil=0;this.followPlayer=true;this.lobby=true;
    this.hoverId=null;this.showCampBounds=false;this.mapAsset=getMapAsset();
    this.terrain=this.createTerrain();this.frame=0;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);}
  screenToWorld(x,y){return {x:(x-this.w/2)/this.zoom+this.camera.x,y:(y-this.h/2)/this.zoom+this.camera.y};}
  worldToScreen(x,y){return {x:(x-this.camera.x)*this.zoom+this.w/2,y:(y-this.camera.y)*this.zoom+this.h/2};}
  mark(x,y){this.marker={x,y,at:performance.now()};}
  center(player){if(!player)return;this.camera.x=player.x;this.camera.y=player.y;this.lookUntil=0;this.followPlayer=true;this.clampCamera();}
  lookAt(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;this.camera.x=x;this.camera.y=y;this.lookUntil=Infinity;this.followPlayer=false;this.clampCamera();}
  setZoom(mult,anchor){
    if(!Number.isFinite(mult)||mult<=0)return this.zoom;
    const before=anchor?this.screenToWorld(anchor.x,anchor.y):null;
    this.zoom=clamp(this.zoom*mult,.18,1.05);
    if(before){const after=this.screenToWorld(anchor.x,anchor.y);this.camera.x+=before.x-after.x;this.camera.y+=before.y-after.y;}
    this.clampCamera();return this.zoom;
  }
  pan(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy))return;this.camera.x+=dx/this.zoom;this.camera.y+=dy/this.zoom;this.followPlayer=false;this.lookUntil=Infinity;this.clampCamera();}
  clampCamera(){
    const halfW=this.w/2/this.zoom,halfH=this.h/2/this.zoom;
    this.camera.x=halfW*2>=WORLD.width?WORLD.width/2:clamp(this.camera.x,halfW,WORLD.width-halfW);
    this.camera.y=halfH*2>=WORLD.height?WORLD.height/2:clamp(this.camera.y,halfH,WORLD.height-halfH);
  }
  createTerrain(){return getMapAsset().preview;}
  drawTree(c,x,y,s,dire,rnd){
    c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='rgba(10,20,17,.24)';c.beginPath();c.ellipse(12,15,28,12,-.4,0,TAU);c.fill();
    if(dire){line(c,[{x:0,y:18},{x:-2,y:-29},{x:12,y:-50}],'#514e40',8);line(c,[{x:-1,y:-7},{x:-20,y:-29},{x:-25,y:-47}],'#615b49',4);line(c,[{x:0,y:-24},{x:20,y:-30},{x:26,y:-44}],'#615b49',4);if(rnd()>.45)poly(c,[[-21,-36],[0,-58],[24,-40],[13,-24],[-14,-20]],rnd()>.5?'#51574a':'#565343');}
    else {c.fillStyle='#555741';c.fillRect(-4,-3,8,25);poly(c,[[-27,4],[-18,-18],[-26,-14],[-12,-38],[-18,-33],[0,-67],[18,-33],[12,-38],[26,-14],[18,-18],[27,4],[0,14]],'#233b30');poly(c,[[-23,0],[-13,-24],[-17,-21],[0,-61],[16,-22],[10,-26],[23,0],[0,8]],rnd()>.5?'#3c5740':'#415e43');poly(c,[[-11,-28],[0,-60],[8,-34],[0,-39]],'#6a7850');line(c,[{x:0,y:5},{x:0,y:-46}],'rgba(139,150,93,.15)',1);}
    c.restore();
  }
  render(game,time){
    this.frame++;const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);
    if(!game){this.renderLobby(c,time);return;}
    const p=game.player;
    if(this.followPlayer&&p){this.camera.x+=(p.x-this.camera.x)*.08;this.camera.y+=(p.y-55/this.zoom-this.camera.y)*.08;}
    this.clampCamera();
    const halfW=this.w/2/this.zoom,halfH=this.h/2/this.zoom;
    c.fillStyle='#1b2927';c.fillRect(0,0,this.w,this.h);c.save();c.translate(this.w/2,this.h/2);c.scale(this.zoom,this.zoom);c.translate(-this.camera.x,-this.camera.y);
    if(this.mapAsset.ready)c.drawImage(this.mapAsset.image,MAP_IMAGE.x,MAP_IMAGE.y,MAP_IMAGE.width,MAP_IMAGE.height);
    else c.drawImage(this.terrain,0,0,WORLD.width,WORLD.height);
    // The terrain reference is a baked image. Overlay clear ground and stumps where trees were cut.
    for(const [index]of game.cutTrees||[]){const tree=TREES[index];if(Math.abs(tree.x-this.camera.x)>halfW+100||Math.abs(tree.y-this.camera.y)>halfH+100)continue;circle(c,tree.x,tree.y,64,'#384936');circle(c,tree.x,tree.y,13,'#817052','#b0a079',2);}
    for(const tree of game.plantedTrees||[])if(tree.until>game.time)this.drawTree(c,tree.x,tree.y,1.3,false,random(17));
    BASES.forEach((b,team)=>{const glow=c.createRadialGradient(b.x,b.y,30,b.x,b.y,300);glow.addColorStop(0,team?'rgba(204,103,75,.12)':'rgba(126,202,162,.12)');glow.addColorStop(1,'transparent');circle(c,b.x,b.y,300,glow);});
    const camps=game.camps||CAMP_LAYOUT;
    for(const camp of camps){
      if(Math.abs(camp.x-this.camera.x)>halfW+500||Math.abs(camp.y-this.camera.y)>halfH+500)continue;
      const color=CAMP_COLORS[camp.type]||'#d8ba83';
      if(this.showCampBounds){c.save();c.globalAlpha=.16;poly(c,camp.spawnBox.map(v=>[v.x,v.y]),color);c.globalAlpha=.9;c.setLineDash([10/this.zoom,7/this.zoom]);poly(c,camp.spawnBox.map(v=>[v.x,v.y]),null,camp.blocked?'#e89879':color,1/this.zoom);c.restore();}
      c.save();c.globalAlpha=this.showCampBounds ? .85 : .5;circle(c,camp.x,camp.y,Math.max(18,1.4/this.zoom),null,color,1/this.zoom);c.restore();
    }
    const selected=game.entities.find(e=>e.id===(game.selectedId||p?.id));
    const hovered=game.entities.find(e=>e.id===this.hoverId);
    for(const e of new Set([selected,hovered])){
      if(!e||e.dead||!e.range)continue;c.save();
      c.globalAlpha=e===hovered ? .5 : .22;c.setLineDash([7/this.zoom,7/this.zoom]);
      circle(c,e.x,e.y,e.range,null,unitColor(e),1/this.zoom);c.restore();
    }
    for(const hero of game.entities)if(hero.xMark){
      const mark=hero.xMark,target=game.entities.find(e=>e.id===mark.targetId&&!e.dead);if(!target)continue;
      c.save();const col=hero.team?'#df967c':'#dfc28b';c.globalAlpha=.6;c.setLineDash([5,8]);line(c,[mark,target],col,1);c.setLineDash([]);c.globalAlpha=.85;
      circle(c,mark.x,mark.y,52,null,col,2/this.zoom);line(c,[{x:mark.x-25,y:mark.y-25},{x:mark.x+25,y:mark.y+25}],col,3/this.zoom);line(c,[{x:mark.x+25,y:mark.y-25},{x:mark.x-25,y:mark.y+25}],col,3/this.zoom);
      c.font=`${11/this.zoom}px Consolas,monospace`;c.textAlign='center';c.fillStyle=col;c.fillText(`${Math.max(0,mark.expiresAt-game.time).toFixed(1)}s`,mark.x,mark.y+52+14/this.zoom);c.restore();
    }
    const entities=game.entities.filter(e=>(!e.dead||BUILDINGS.has(e.kind))&&(e.team===game.player?.team||!game.canSee||game.canSee(game.player,e))&&Math.abs(e.x-this.camera.x)<=halfW+450&&Math.abs(e.y-this.camera.y)<=halfH+450).sort((a,b)=>a.y-b.y);
    const auraEntities=game.entities.filter(e=>!e.dead&&(e.team===game.player?.team||!game.canSee||game.canSee(game.player,e))&&Math.abs(e.x-this.camera.x)<=halfW+Math.max(450,unitAuraRadius(e,game.time))&&Math.abs(e.y-this.camera.y)<=halfH+Math.max(450,unitAuraRadius(e,game.time)));
    for(const e of auraEntities)drawUnitCombatEffects(c,e,game,this.zoom,'ground');
    for(const e of entities){if(this.zoom<.15)this.drawOverviewEntity(c,e);else if(BUILDINGS.has(e.kind))this.drawBuilding(c,e,game,time);else this.drawUnit(c,e,game,time);}
    for(const e of auraEntities)drawUnitCombatEffects(c,e,game,this.zoom,'above');
    for(const e of game.effects||[]){const padding=(e.radius||80)+300;
      if(Math.max(e.x,e.tx??e.x)<this.camera.x-halfW-padding||Math.min(e.x,e.tx??e.x)>this.camera.x+halfW+padding||Math.max(e.y,e.ty??e.y)<this.camera.y-halfH-padding||Math.min(e.y,e.ty??e.y)>this.camera.y+halfH+padding)continue;
      this.drawEffect(c,e,game.time,game);
    }
    if(this.marker){const age=(performance.now()-this.marker.at)/1000;if(age<.8){c.save();c.translate(this.marker.x,this.marker.y);c.scale(1/this.zoom,1/this.zoom);c.globalAlpha=1-age/.8;const r=10+age*22;circle(c,0,0,r,null,'#d2e5a3',1.5);for(let i=0;i<4;i++){c.save();c.rotate(i*TAU/4);poly(c,[[0,-r],[-3,-r-5],[3,-r-5]],'#d2e5a3');c.restore();}c.restore();}else this.marker=null;}
    if(p?.recallTimer>0){circle(c,p.x,p.y,90+Math.sin(time*8)*6,null,'#9bd9d6',2/this.zoom);c.save();c.translate(p.x,p.y);c.rotate(time*2);poly(c,[[-55,-55],[55,-55],[55,55],[-55,55]],null,'#b4e4d9',1/this.zoom);c.restore();}
    c.restore();
    const vignette=c.createRadialGradient(this.w/2,this.h/2,this.h*.4,this.w/2,this.h/2,this.w*.8);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(8,16,17,.25)');c.fillStyle=vignette;c.fillRect(0,0,this.w,this.h);
    for(const e of entities)this.drawEntityLabel(c,e,game);
    for(const shop of MAP_OBJECTIVES.ent_dota_shop.slice(2)){const point=this.worldToScreen(shop.x,shop.y);circle(c,point.x,point.y,8,'#b9934d','#f0d28c',2);if(this.zoom>.15)this.label(c,'神秘商店',point.x,point.y-20,'#e1c486',11);}
    if(this.showCampBounds)for(const camp of camps){const screen=this.worldToScreen(camp.x,camp.y);if(screen.x<-100||screen.y<-50||screen.x>this.w+100||screen.y>this.h+50)continue;const name=this.zoom<.15?`${camp.campId} ${CAMP_NAMES[camp.type]||'野怪'}`:`${CAMP_NAMES[camp.type]||'野怪'}营地 · ${camp.campId}${camp.blocked?' · 封野':''}`;this.label(c,name,screen.x,screen.y-18,CAMP_COLORS[camp.type]||'#dfc58d',11);}
    if(p?.dead){c.fillStyle='rgba(17,23,24,.4)';c.fillRect(0,0,this.w,this.h);}
    if(!this.mapAsset.ready)this.label(c,this.mapAsset.failed?'地图图片加载失败':'正在载入战场地图…',this.w/2,this.h/2,'#e5ddc1',13);
  }
  label(c,text,x,y,color='#e6e5cf',size=11){
    c.save();c.font=`500 ${size}px "Segoe UI","Microsoft YaHei",sans-serif`;c.textAlign='center';c.textBaseline='middle';
    const width=c.measureText(text).width+12;c.fillStyle='rgba(11,18,17,.82)';c.fillRect(x-width/2,y-9,width,18);c.fillStyle=color;c.fillText(text,x,y);c.restore();
  }
  drawEntityLabel(c,e,game){
    const selected=e.id===(game.selectedId||game.player?.id),hovered=e.id===this.hoverId,hero=e.kind==='hero',building=BUILDINGS.has(e.kind),neutral=e.kind==='neutral';
    if(e.dead&&!selected&&!hovered)return;
    if(this.zoom<.15){if(selected||hovered){const p=this.worldToScreen(e.x,e.y);circle(c,p.x,p.y,7,null,'#f4e9af',1.3);this.label(c,e.name||HEROES[e.heroId]?.name||'单位',p.x,p.y-16,unitColor(e),11);}return;}
    const p=this.worldToScreen(e.x,e.y),color=unitColor(e),worldRadius=e.selectionRadius||e.radius||24;
    const visualRadius=building?Math.max(18,worldRadius*this.zoom):hero?23:neutral?(e.ancient?25:19):13;
    if(selected||hovered){
      const r=visualRadius+5;c.save();c.strokeStyle=selected?'#f4e9af':'#e4e8ce';c.lineWidth=selected?1.7:1.2;
      c.beginPath();for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]]){c.moveTo(p.x+x*(r-7),p.y+y*r);c.lineTo(p.x+x*r,p.y+y*r);c.lineTo(p.x+x*r,p.y+y*(r-7));}c.stroke();
      circle(c,p.x,p.y,Math.max(5,(e.radius||24)*this.zoom),null,selected?'rgba(241,232,171,.6)':'rgba(228,232,206,.4)',1);c.restore();
    }
    const roshan=e.isRoshan||e.neutralId==='roshan'||e.sourceId==='npc_dota_roshan'||e.name==='肉山';
    const modelTop=hero?Math.max(26,55*2.05*this.zoom):neutral?Math.max(22,35*(roshan?5:e.ancient?3.3:2.5)*this.zoom):building?visualRadius:Math.max(14,22*2.3*this.zoom);
    const y=p.y-modelTop-9,width=hero?62:building?(e.kind==='ancient'?84:58):neutral?46:30;
    if(!e.dead&&e.kind!=='filler'&&e.kind!=='fountain'){
      this.healthbar(c,p.x,y,e.hp/e.maxHp,width,color,hero||building?5:4);
      if(hero)this.healthbar(c,p.x,y+7,(e.mana||0)/(e.maxMana||1),width,'#7eafca',2);
    }
    let name=hero?(HEROES[e.heroId]?.name||e.name):e.name;
    if(hero)name=`${name}${e.isPlayer?' · 你':''}  ${e.level||1}`;
    if(e.dead)name=`${name||'建筑'} · 已摧毁`;
    if(hero||neutral||selected||hovered)this.label(c,name||'单位',p.x,y-14,e.dead?'#ada99c':selected?'#f2e7ba':color,11);
    else if(e.kind==='tower'){
      c.save();c.font='600 10px "Segoe UI",sans-serif';c.textAlign='center';c.fillStyle='#e7e2cb';c.shadowColor='#12211a';c.shadowBlur=4;c.fillText(`T${e.tier}`,p.x,y-5);c.restore();
    }
    if(building&&!e.dead&&game.isProtected?.(e)){
      c.save();c.translate(p.x+width/2+7,y+2);c.strokeStyle='#d0d6c3';c.lineWidth=1.1;c.beginPath();c.arc(0,-2,2.5,Math.PI,0);c.stroke();c.fillStyle='#bcc6b0';c.fillRect(-3,-2,6,5);c.restore();
    }
  }
  drawOverviewEntity(c,e){
    const size=(e.kind==='hero'?3:e.kind==='ancient'?4:2)/this.zoom,color=e.dead?'#77766b':e.isPlayer?'#fff1b7':unitColor(e);
    c.save();if(e.kind==='tower'||e.kind==='barracks'){c.fillStyle=color;c.fillRect(e.x-size,e.y-size,size*2,size*2);}
    else if(e.kind==='hero'||e.kind==='ancient')circle(c,e.x,e.y,size,color,'#17251e',.8/this.zoom);c.restore();
  }
  renderLobby(c,t){
    const w=this.w,h=this.h;const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#1d2b2b');sky.addColorStop(.45,'#415650');sky.addColorStop(1,'#142321');c.fillStyle=sky;c.fillRect(0,0,w,h);
    const rnd=random(87);const moon=c.createRadialGradient(w*.73,h*.24,2,w*.73,h*.24,w*.5);moon.addColorStop(0,'rgba(165,181,142,.24)');moon.addColorStop(1,'transparent');c.fillStyle=moon;c.fillRect(0,0,w,h);
    for(let layer=0;layer<5;layer++){const y=h*(.32+layer*.12),points=[[0,h]];for(let x=0;x<=w+120;x+=100)points.push([x,y+(rnd()-.5)*h*.18]);points.push([w,h]);poly(c,points,['#3b4d49','#31423e','#293b35','#20332d','#192a26'][layer]);}
    for(let layer=0;layer<3;layer++){const amount=22+layer*8;for(let i=0;i<amount;i++){const x=rnd()*w,y=h*(.58+layer*.14)+rnd()*h*.15,s=(.7+layer*.8)*(w/1440);c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-25,0],[-12,-40],[-20,-32],[-8,-65],[-14,-57],[0,-110],[14,-57],[8,-65],[20,-32],[12,-40],[25,0]],['#33443a','#26382f','#152820'][layer]);c.restore();}}
    // Distant watchtower silhouette.
    const tx=w*.82,ty=h*.54;c.fillStyle='#1c2c29';c.fillRect(tx,ty-118,48,128);poly(c,[[tx-14,ty-110],[tx+24,ty-151],[tx+62,ty-110]],'#253831');c.fillRect(tx-5,ty-95,58,13);c.fillStyle='rgba(196,156,88,.3)';c.fillRect(tx+18,ty-88,9,20);
    for(let i=0;i<38;i++){const x=((i*137.7+t*(4+i%5))%(w+100))-50,y=h*.15+((i*79.1+Math.sin(t*.3+i)*35)%(h*.75));circle(c,x,y,i%3===0?1.6:.7,`rgba(223,189,122,${.15+Math.sin(t+i)*.1})`);}
    const dark=c.createLinearGradient(0,0,w,0);dark.addColorStop(0,'rgba(14,20,21,.97)');dark.addColorStop(.34,'rgba(14,20,21,.79)');dark.addColorStop(.65,'rgba(14,20,21,.12)');dark.addColorStop(1,'rgba(14,20,21,.2)');c.fillStyle=dark;c.fillRect(0,0,w,h);
  }
  drawBuilding(c,e,game,t){
    const color=unitColor(e),ancient=e.kind==='ancient',radius=Math.max(55,e.radius||72);c.save();c.translate(e.x,e.y);
    if(e.dead){
      // Opaque rubble also covers the original intact model baked into the JPG.
      const r=Math.max(e.kind==='filler'?95:155,radius*1.65),rnd=random([...e.id].reduce((a,v)=>a+v.charCodeAt(0),19));
      const scar=c.createRadialGradient(0,-r*.15,r*.65,0,-r*.15,r*1.25);scar.addColorStop(0,'#30382f');scar.addColorStop(.68,'#30382f');scar.addColorStop(1,'rgba(34,42,34,0)');
      circle(c,0,-r*.15,r*1.25,scar);
      poly(c,[[-r*.83,-r*.28],[-r*.61,-r*.81],[r*.12,-r*.91],[r*.79,-r*.51],[r*.91,r*.24],[r*.24,r*.65],[-r*.63,r*.53]],e.team?'#3f3933':'#424a3c','#262d26',2);
      for(let i=0;i<11;i++){const x=(rnd()-.5)*r*1.4,y=(rnd()-.5)*r,s=12+rnd()*r*.22;poly(c,[[x-s,y],[x-s*.4,y-s*.7],[x+s*.65,y-s*.6],[x+s,y+s*.4],[x-s*.2,y+s*.65]],i%3?'#686955':'#898672','#343c31',1);}
      c.globalAlpha=.6;line(c,[{x:-24,y:-24},{x:24,y:24}],'#b0a58a',3/this.zoom);line(c,[{x:24,y:-24},{x:-24,y:24}],'#b0a58a',3/this.zoom);c.restore();return;
    }
    // The real map supplies the building art; overlays communicate live state.
    c.globalAlpha=e.kind==='filler' ? .22 : .5;
    if(e.kind==='barracks'){
      poly(c,[[-radius,-radius*.7],[radius,-radius*.7],[radius,radius*.7],[-radius,radius*.7]],null,color,1.4/this.zoom);
      c.globalAlpha=.85;c.save();c.translate(0,radius*.85);c.scale(1/this.zoom,1/this.zoom);
      circle(c,0,0,8,'#1e2c25',color,1);
      if(e.barracksType==='melee'){line(c,[{x:-3,y:4},{x:3,y:-4}],color,1.5);line(c,[{x:-3,y:1},{x:0,y:4}],color,1.5);}
      else{c.beginPath();c.arc(-1,0,4.5,-1.25,1.25);c.strokeStyle=color;c.lineWidth=1;c.stroke();line(c,[{x:0,y:-4},{x:0,y:4}],color,1);}
      c.restore();
    }else if(e.kind==='fountain'){
      const r=Math.max(200,radius);circle(c,0,0,r,null,color,1.5/this.zoom);c.globalAlpha=.2;
      const glow=c.createRadialGradient(0,0,20,0,0,r);glow.addColorStop(0,e.team?'#de9b78':'#90e1d3');glow.addColorStop(1,'transparent');circle(c,0,0,r,glow);
      c.globalAlpha=.65;for(let i=0;i<6;i++){const a=t*.4+i*TAU/6;circle(c,Math.cos(a)*r*.7,Math.sin(a)*r*.7,3/this.zoom,color);}
    }else{
      const r=ancient?Math.max(210,radius):radius+24;circle(c,0,0,r,null,color,(ancient?1.8:1.2)/this.zoom);
      if(ancient){c.globalAlpha=.18;circle(c,0,0,r+12+Math.sin(t*1.3)*6,null,color,5/this.zoom);}
      if(e.kind==='tower'){c.globalAlpha=.85;for(let i=0;i<(e.tier||1);i++)circle(c,(i-((e.tier||1)-1)/2)*13/this.zoom,r+8/this.zoom,2/this.zoom,color);}
    }
    c.restore();
  }
  healthbar(c,x,y,value,width,color,height=5){c.fillStyle='#1b2522';c.fillRect(x-width/2-1,y-1,width+2,height+2);c.fillStyle=color;c.fillRect(x-width/2,y,width*clamp(value,0,1),height);c.fillStyle='rgba(255,255,255,.16)';c.fillRect(x-width/2,y,width*clamp(value,0,1),1);}
  drawUnit(c,e,game,t){
    const hero=e.kind==='hero',neutral=e.kind==='neutral',color=unitColor(e);c.save();c.translate(e.x,e.y);
    if(neutral){this.drawNeutral(c,e,t);c.restore();return;}
    if(e.kind==='droppedItem'){poly(c,[[0,-22],[25,0],[0,22],[-25,0]],'#8b713c','#ead08c',3);circle(c,0,0,7,'#f3dfa8');c.restore();return;}
    if(e.kind==='courier'){
      c.scale(1.8,1.8);if(e.flying){const flap=Math.sin(t*10)*5;poly(c,[[-6,0],[-30,-15-flap],[-22,8],[0,8]],'#c2c9b5',color,1);poly(c,[[6,0],[30,-15-flap],[22,8],[0,8]],'#c2c9b5',color,1);}
      c.fillStyle='#826b4f';c.fillRect(-12,-6,25,18);circle(c,9,-11,9,'#aa9270',color,2);poly(c,[[4,-17],[4,-32],[9,-19]],'#b6a07c');poly(c,[[12,-17],[17,-31],[17,-15]],'#b6a07c');c.fillStyle='#244a40';c.fillRect(-14,-9,15,13);circle(c,12,-13,1.7,'#17241d');c.restore();return;
    }
    if(e.kind==='ward'){
      if(e.healRadius)circle(c,0,0,e.healRadius,null,'rgba(149,196,112,.16)',2);
      c.fillStyle='#594d31';c.fillRect(-7,-30,14,55);poly(c,[[-24,-25],[0,-49],[24,-25],[0,-9]],'#91bc73','#dae3a2',3);
      circle(c,0,-28,7,'#e2eab1');circle(c,0,16,30,null,'rgba(146,204,121,.55)',2);c.restore();return;
    }
    const scale=(hero?2.05:2.3)*(e.statuses?.ogreBloodlust?.until>game.time?1+(e.statuses.ogreBloodlust.modelScale||0)/100:1);c.scale(scale,scale);
    c.fillStyle='rgba(7,17,14,.34)';c.beginPath();c.ellipse(3,9,hero?22:12,hero?10:6,0,0,TAU);c.fill();
    if(e.isPlayer){circle(c,0,4,26,null,'#d8de99',2);circle(c,0,4,29,null,'rgba(212,223,156,.18)',3);}
    const buffs=e.buffs||{};
    if(e.statuses?.barrier?.until>game.time)circle(c,0,-8,31,null,'rgba(143,196,237,.7)',2);
    if(buffs.shieldUntil>game.time)circle(c,0,-8,30,null,'rgba(179,213,201,.55)',2);
    if(buffs.tideUntil>game.time){c.save();c.rotate(e.angle||0);line(c,[{x:14,y:-24},{x:37,y:-4}],'#b1e2e4',3);circle(c,24,-13,21,null,'rgba(151,212,217,.25)',2);c.restore();}
    if(game._tauntSource?.(e)){c.strokeStyle='#e4a277';c.lineWidth=2;line(c,[{x:-9,y:-65},{x:0,y:-58},{x:9,y:-65}],'#e4a277',2);}
    c.save();const angle=e.angle??(e.team?2.3:-.7);c.rotate(angle+Math.PI/2);
    const bob=e.moving?Math.sin(t*14+Number(String(e.id).replace(/\D/g,'')))*2:Math.sin(t*2)*.6;c.translate(0,bob);
    if(hero){
      if(e.heroId==='ogre_magi'){
        poly(c,[[-22,-9],[-27,10],[-15,24],[16,24],[28,10],[22,-9]],'#558cc0','#2d4b65',2);
        poly(c,[[-23,10],[-16,29],[0,24],[16,29],[24,11],[8,6],[-6,8]],'#a05b39','#5f442d',2);
        poly(c,[[-24,-4],[-34,2],[-31,15],[-21,12]],'#5f9acb');poly(c,[[24,-4],[34,2],[31,15],[21,12]],'#689cca');
        for(const x of [-12,11]){circle(c,x,-18,12,'#75aad4','#31546b',1.5);poly(c,[[x-8,-13],[x-6,-5],[x+5,-4],[x+9,-12]],'#c1ad8a','#5c695f',1);line(c,[{x:x-6,y:-19},{x:x+6,y:-19}],'#253b4b',2);poly(c,[[x-8,-26],[x-2,-34],[x+6,-29],[x+8,-24]],'#3b5364');}
        line(c,[{x:-21,y:14},{x:20,y:14}],'#d6b678',3);
        c.save();c.translate(31,3);c.rotate(e.attackFlash>0?-1.25:-.3);line(c,[{x:0,y:23},{x:0,y:-28}],'#8a633a',6);poly(c,[[-9,-25],[-14,-40],[-6,-51],[8,-49],[14,-36],[9,-24]],'#957249','#493a28',2);for(const [x,y]of [[-13,-38],[-4,-50],[12,-37]])poly(c,[[x-3,y],[x,y-7],[x+3,y]],'#ddd8b9');c.restore();
      }else if(e.heroId==='juggernaut'){
        poly(c,[[-14,8],[-17,-7],[-6,-18],[7,-18],[17,-7],[12,12],[3,7]],'#9c5a3f','#303b30',2);
        poly(c,[[-12,12],[-15,22],[-5,19],[0,11],[5,19],[14,22],[11,10]],'#b57148');
        poly(c,[[-9,-14],[-5,-24],[5,-24],[9,-14],[5,-2],[-5,-2]],'#e7ddbb','#6e634f',1.5);
        line(c,[{x:-5,y:-16},{x:5,y:-16}],'#8b4233',2);line(c,[{x:0,y:-12},{x:0,y:-3}],'#8b4233',2);
        c.save();c.translate(16,-1);c.rotate(e.attackFlash>0?-1:-.25);poly(c,[[-2,10],[-3,-38],[1,-51],[4,-38],[2,10]],'#d7dbca','#697e77',1);line(c,[{x:-7,y:5},{x:7,y:5}],'#ccac67',3);c.restore();
      }else if(e.heroId==='crystal_maiden'){
        poly(c,[[-5,-15],[-16,16],[0,24],[16,16],[5,-15]],'#6898ae','#293c44',2);poly(c,[[-5,-10],[0,18],[12,15],[6,-8]],'#91c2d0');
        circle(c,0,-13,9,'#d2bca0');poly(c,[[-10,-12],[-10,-23],[0,-28],[10,-23],[11,-9],[4,-18],[-4,-18]],'#d3dcdb','#587d88',1);
        line(c,[{x:17,y:17},{x:17,y:-33}],'#b2c5bc',3);poly(c,[[11,-33],[17,-45],[23,-33],[17,-24]],'#b9e9ed','#608d9b',1);
      }else if(e.heroId==='kunkka'){
        poly(c,[[-13,-14],[-20,6],[-15,25],[-4,18],[0,22],[5,18],[17,25],[19,7],[12,-15]],'#365a73','#263d43',2);
        poly(c,[[-10,-11],[-12,8],[0,17],[11,7],[9,-11]],'#e0d4b1','#8b8c6c',1);
        poly(c,[[-18,-13],[-22,-7],[-13,-2],[-8,-10]],'#c4a56a','#776b43',1);
        poly(c,[[18,-13],[22,-7],[13,-2],[8,-10]],'#c4a56a','#776b43',1);
        circle(c,0,-17,9,'#cbab83','#5e5946',1);
        poly(c,[[-8,-15],[-6,-7],[0,-3],[7,-8],[8,-15],[4,-12],[-3,-12]],'#433c2d');
        poly(c,[[-16,-24],[-10,-30],[-3,-27],[2,-34],[8,-28],[16,-25],[12,-19],[-12,-19]],'#29485f','#bdad7b',1.5);
        line(c,[{x:-9,y:-22},{x:10,y:-22}],'#d4bf7f',1.5);
        c.save();c.translate(17,1);c.rotate(e.attackFlash>0?-1:-.15);
        poly(c,[[-2,9],[-2,-27],[5,-40],[9,-42],[5,-24],[2,9]],buffs.tideUntil>game.time?'#c0e9e8':'#d2d7cb','#6d9296',1);
        c.beginPath();c.arc(1,8,7,-.8,2.7);c.strokeStyle='#d2b577';c.lineWidth=3;c.stroke();c.restore();
      }else if(e.heroId==='axe'){
        // Heavy red armor, broad shoulders and a double-edged axe distinguish the strength hero.
        poly(c,[[-16,14],[-22,-8],[-12,-20],[12,-20],[22,-8],[16,14],[0,22]],'#a8523d','#483b31',2);
        poly(c,[[-14,10],[-18,23],[-5,25],[0,15],[5,25],[18,23],[14,10]],'#6d4434','#2f3029',1.5);
        poly(c,[[-22,-9],[-24,-20],[-11,-23],[-7,-12]],'#806b50','#c1ae7d',1.5);
        poly(c,[[22,-9],[24,-20],[11,-23],[7,-12]],'#806b50','#c1ae7d',1.5);
        circle(c,0,-17,9,'#bd6b48','#5a3e2c',1);
        poly(c,[[-7,-14],[-4,-7],[0,-4],[5,-8],[7,-14],[3,-11],[-3,-11]],'#332d24');
        poly(c,[[-2,-26],[-3,-32],[2,-35],[5,-27]],'#282b24');
        c.save();c.translate(22,-1);c.rotate(e.attackFlash>0?-1.1:-.25);
        line(c,[{x:0,y:23},{x:0,y:-40}],'#99774c',4);
        poly(c,[[-2,-39],[-16,-44],[-23,-33],[-20,-20],[-5,-24],[0,-30],[5,-24],[20,-20],[23,-33],[16,-44],[2,-39]],'#b5b9a7','#45534b',1.5);
        line(c,[{x:-22,y:-33},{x:-20,y:-22},{x:-7,y:-25}],'#dedfc6',2);
        line(c,[{x:22,y:-33},{x:20,y:-22},{x:7,y:-25}],'#dedfc6',2);c.restore();
      }else{
        poly(c,[[-8,-17],[-17,13],[-9,23],[3,16],[14,19],[12,-6]],'#578552','#2b4533',2);poly(c,[[-12,-8],[-14,-20],[0,-27],[11,-17],[6,-9]],'#a6a04e');circle(c,0,-10,7,'#d7b995');poly(c,[[-10,-14],[-2,-24],[10,-17],[7,-3],[2,-15]],'#ba7843');
        c.beginPath();c.arc(10,-2,23,-1.5,1.5);c.strokeStyle='#c5ad6a';c.lineWidth=3;c.stroke();line(c,[{x:11,y:-25},{x:11,y:21}],'#d2ccb0',1);line(c,[{x:6,y:0},{x:37,y:0}],'#cdd0b1',2);
      }
    }else{
      poly(c,[[-7,7],[-9,-5],[0,-12],[9,-5],[7,7]],e.team?'#985d51':'#8caa73','#2f3b30',1.5);circle(c,0,-10,5,'#c3bd9c','#4c5546',1);line(c,[{x:7,y:3},{x:10,y:-18}],e.ranged?'#bfc18e':'#b8c2af',2);if(!e.ranged)poly(c,[[-12,-3],[-6,-6],[-5,4],[-9,8],[-13,3]],e.team?'#834c43':'#577755','#b4b397',1);
    }
    c.restore();
    if(e.attackFlash>0&&e.range<=200&&!hero){c.save();c.rotate(e.angle||0);c.beginPath();c.arc(13,0,18,-.7,.7);c.strokeStyle='rgba(244,226,177,.85)';c.lineWidth=3;c.stroke();c.restore();}
    c.restore();
  }
  drawNeutral(c,e,t){
    const roshan=e.isRoshan||e.neutralId==='roshan'||e.sourceId==='npc_dota_roshan'||e.name==='肉山';
    const ancient=e.ancient||roshan,color=roshan?'#dba58a':ancient?'#d5b2df':'#e3c188';
    const ranged=e.ranged||e.attackType==='ranged'||e.range>250;
    const size=roshan?5:ancient?3.3:2.5;
    c.save();c.scale(size,size);c.fillStyle='rgba(12,17,13,.4)';c.beginPath();c.ellipse(0,7,18,11,0,0,TAU);c.fill();
    c.rotate((e.angle||0)+Math.PI/2);if(e.moving)c.translate(0,Math.sin(t*9)*1.2);
    if(ancient){
      poly(c,[[-14,14],[-20,-1],[-15,-17],[-6,-24],[7,-25],[17,-15],[21,0],[14,14],[0,20]],roshan?'#6d453c':'#695b77','#282a2a',1.5);
      poly(c,[[-14,-12],[-26,-25],[-22,-5],[-13,1]],'#b4a08c','#3c3731',1);
      poly(c,[[14,-12],[26,-25],[22,-5],[13,1]],'#b4a08c','#3c3731',1);
      poly(c,[[-8,-18],[-6,-30],[0,-35],[7,-30],[9,-18],[0,-11]],roshan?'#98694e':'#a18ca5','#35312f',1);
      line(c,[{x:-5,y:-25},{x:5,y:-25}],color,2);line(c,[{x:0,y:-11},{x:0,y:13}],color,1.4);
      if(roshan){poly(c,[[-16,0],[-31,-9],[-32,15],[-17,12]],'#8c5541','#302d28',1);poly(c,[[16,0],[31,-9],[32,15],[17,12]],'#8c5541','#302d28',1);}
    }else{
      poly(c,[[-11,13],[-16,0],[-12,-13],[-4,-19],[8,-15],[15,-3],[11,13],[0,18]],ranged?'#767556':'#87704f','#34392c',1.5);
      circle(c,0,-13,9,'#ac9870','#4b4c37',1);poly(c,[[-9,-16],[-13,-25],[-3,-19]],'#d0bd89');poly(c,[[9,-16],[13,-25],[3,-19]],'#d0bd89');
      line(c,[{x:-4,y:-14},{x:4,y:-14}],'#e7cf9b',1.5);
      if(ranged){line(c,[{x:15,y:13},{x:15,y:-22}],'#9d8058',2);circle(c,15,-24,4,'#b9c496');}
      else{poly(c,[[-12,1],[-21,4],[-20,13],[-12,12]],'#b79d70','#4b4b34',1);poly(c,[[12,1],[21,4],[20,13],[12,12]],'#b79d70','#4b4b34',1);}
    }
    if(e.attackFlash>0){c.beginPath();c.arc(0,-5,28,-2.2,-.7);c.strokeStyle=color;c.lineWidth=3;c.stroke();}
    c.restore();
  }
  drawEffect(c,e,t,game={time:t,entities:[]}){
    if(drawCombatEffect(c,e,game,this.zoom))return;
    const k=clamp(e.life/(e.maxLife||1),0,1),color=e.color||'#e4ca8f';
    c.save();c.globalAlpha=Math.min(1,k*2);
    if(e.type==='text'){
      c.font=`bold ${13/this.zoom}px "Segoe UI",sans-serif`;c.textAlign='center';
      c.shadowColor='#13201a';c.shadowBlur=3/this.zoom;c.fillStyle=color;
      c.fillText(e.text||'',e.x,e.y-(1-k)*26/this.zoom);
    }else circle(c,e.x,e.y,(e.radius||65)*(1-k*.6),null,color,2);
    c.restore();
  }
  minimap(canvas,game){
    if(!canvas||!game)return;const c=canvas.getContext('2d'),{side,x:offsetX,y:offsetY}=this.minimapBounds(canvas),scale=side/WORLD.width;
    c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#111b18';c.fillRect(0,0,canvas.width,canvas.height);
    c.save();c.translate(offsetX,offsetY);c.beginPath();c.rect(0,0,side,side);c.clip();c.drawImage(this.terrain,0,0,side,side);
    c.fillStyle='rgba(7,15,14,.19)';c.fillRect(0,0,side,side);
    for(const camp of game.camps||CAMP_LAYOUT){const x=camp.x*scale,y=camp.y*scale,r=camp.type==='ancient'?2.2:1.6;poly(c,[[x,y-r],[x+r,y],[x,y+r],[x-r,y]],CAMP_COLORS[camp.type]||'#d9bb7c','#263227',.6);}
    const entities=game.entities.filter(e=>(!e.dead||BUILDINGS.has(e.kind))&&(e.team===game.player?.team||!game.canSee||game.canSee(game.player,e)));
    for(const e of entities){
      const x=e.x*scale,y=e.y*scale,color=e.dead?'#77766b':e.isPlayer?'#fff1b7':unitColor(e);
      c.fillStyle=color;
      if(e.kind==='tower'){const r=e.tier===4?2.1:2.4;c.fillRect(x-r,y-r,r*2,r*2);c.strokeStyle=e.dead?'#363c32':'#18281e';c.lineWidth=.7;c.strokeRect(x-r,y-r,r*2,r*2);}
      else if(e.kind==='barracks'){c.fillRect(x-1.5,y-1,3,2);}
      else if(e.kind==='ancient'){poly(c,[[x,y-4.3],[x+4.3,y],[x,y+4.3],[x-4.3,y]],color,'#14241d',1);}
      else if(e.kind==='hero'){circle(c,x,y,e.isPlayer?3.2:2.6,color,'#13221b',.8);}
      else if(e.kind==='neutral'){if(e.isRoshan||e.sourceId==='npc_dota_roshan')circle(c,x,y,2.6,'#dca185','#241f1a',.7);}
      else if(e.kind==='creep')circle(c,x,y,.9,color);
      if(e.id===game.selectedId&&!e.dead)circle(c,x,y,e.kind==='ancient'?5.8:4.7,null,'#fff4cb',1);
    }
    c.strokeStyle='rgba(243,243,215,.88)';c.lineWidth=1;c.strokeRect((this.camera.x-this.w/2/this.zoom)*scale,(this.camera.y-this.h/2/this.zoom)*scale,this.w/this.zoom*scale,this.h/this.zoom*scale);
    c.restore();c.strokeStyle='#78816a';c.lineWidth=1;c.strokeRect(offsetX+.5,offsetY+.5,side-1,side-1);
  }
  minimapBounds(canvas){const side=Math.min(canvas.width,canvas.height);return {side,x:(canvas.width-side)/2,y:(canvas.height-side)/2};}
  minimapToWorld(canvas,x,y){
    const rect=canvas.getBoundingClientRect(),bounds=this.minimapBounds(canvas),px=x/rect.width*canvas.width,py=y/rect.height*canvas.height;
    if(px<bounds.x||py<bounds.y||px>bounds.x+bounds.side||py>bounds.y+bounds.side)return null;
    return {x:clamp((px-bounds.x)/bounds.side,0,1)*WORLD.width,y:clamp((py-bounds.y)/bounds.side,0,1)*WORLD.height};
  }
  destroy(){this.resizeObserver.disconnect();}
}

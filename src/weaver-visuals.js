// Effects read simulation state and game time; no independent animation loop.
const TAU=Math.PI*2;
const circle=(c,x,y,r,color,width=2)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function glow(c,x,y,r,color){const gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color);gradient.addColorStop(1,'transparent');c.fillStyle=gradient;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}

export function drawWeaverBeetle(c,e,time,zoom=1){
 const attached=!!e.swarmTargetId,scale=Math.max(1,.28/zoom);
 c.save();c.rotate((e.angle||0)+Math.PI/2);c.scale(scale,scale);
 if(attached)glow(c,0,0,30,'#e6c16b55');
 for(let i=0;i<3;i++)for(const side of [-1,1]){
  const y=(i-1)*8,step=Math.sin(time*16+i*2)*(attached?1:4);
  line(c,[[side*7,y],[side*17,y-5+step],[side*24,y+3+step]],'#de945b',2.5);
 }
 c.fillStyle='#ba7050';c.beginPath();c.ellipse(0,0,9,14,0,0,TAU);c.fill();
 line(c,[[0,-12],[0,13]],'#653c39',2);circle(c,0,-11,6,'#f3c788',2);
 line(c,[[-4,-14],[-9,-23]],'#e6a875',2);line(c,[[4,-14],[9,-23]],'#e6a875',2);c.restore();
}

export function drawWeaverState(c,e,game,zoom,layer){
 const t=game.time,sh=e.weaverShukuchi;
 if(layer==='ground'&&sh?.until>t){
  c.save();c.translate(e.x,e.y);c.rotate(e.angle||0);glow(c,0,0,95,'#62c9e836');
  for(let i=0;i<6;i++){const x=-35-((t*130+i*21)%130),y=(i-2.5)*13;line(c,[[x-45,y+6],[x,y],[x+17,y-4]],i%2?'#b869db80':'#72d9ef80',2.5);}c.restore();
 }
 if(layer!=='above')return;
 for(const thread of e.weaverThreads||[]){
  if(thread.until<=t)continue;
  const target=game.entities.find(u=>u.id===thread.targetId);
  // Runtime x/y retain the last visible position. Never follow a hidden target.
  const known=target&&(!game.canSee||game.canSee(game.player||e,target))?target:thread;
  const x=known?.x,y=known?.y;
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy)||1,points=[];
  for(let i=0;i<=20;i++){const f=i/20,w=Math.sin(f*Math.PI*6-t*5)*7*Math.sin(f*Math.PI);points.push([e.x+dx*f-dy/d*w,e.y+dy*f+dx/d*w-28]);}
  c.save();c.globalAlpha*=thread.phase==='setup'?.3:thread.phase==='linger'?.45:.85;
  if(thread.phase==='setup')c.setLineDash([7/zoom,8/zoom]);
  line(c,points,'#7461ba',Math.max(3,2/zoom));line(c,points,'#b7c5ff',Math.max(1,.8/zoom));c.setLineDash([]);
  glow(c,x,y-28,32,'#c3a4fc65');circle(c,x,y-28,22,'#e3b2ef80',1.5);c.restore();
 }
 const marked=Object.values(e.statuses||{}).some(s=>(s.weaverShukuchiMark||s.id==='weaverShukuchiMark')&&s.until>t);
 if(marked){c.save();c.translate(e.x,e.y-95);c.rotate(t*.8);circle(c,0,0,17,'#c28aed',2);line(c,[[-22,0],[22,0]],'#8bdce9',1.5);line(c,[[0,-22],[0,22]],'#e8a8dd',1.5);c.restore();}
 const preview=e.weaverTimeLapsePreview;
 if(e.heroId==='weaver'&&e.id===(game.selectedId||game.player?.id)&&e.abilityLevels?.[3]>0&&preview){
  c.save();c.globalAlpha*=.32;circle(c,preview.x,preview.y,48,'#99c6fa',Math.max(2,1/zoom));
  line(c,[[preview.x-15,preview.y],[preview.x+15,preview.y]],'#ced9ff',2);line(c,[[preview.x,preview.y-15],[preview.x,preview.y+15]],'#ced9ff',2);c.restore();
 }
}

export function drawWeaverEffect(c,e,game,zoom,progress){
 if(e.visual!=='weaverTimeLapse')return false;
 const target=game.entities.find(u=>u.id===e.targetId);
 if(target&&game.canSee&&game.player&&!game.canSee(game.player,target))return true;
 const k=1-progress,tx=e.tx??e.to?.x??e.x,ty=e.ty??e.to?.y??e.y;
 const from=e.from||e;
 const path=e.path?.map(p=>[p.x,p.y-25])||[[from.x,from.y-25],[tx,ty-25]];
 c.save();c.globalAlpha*=k;line(c,path,'#777de766',Math.max(12,4/zoom));line(c,path,'#a7d8f8',Math.max(2,1/zoom));
 for(const [x,y]of [[from.x,from.y],[tx,ty]]){
  glow(c,x,y-20,100,'#a79bef65');c.save();c.translate(x,y-20);c.scale(1,.65);
  for(let i=0;i<3;i++)circle(c,0,0,35+progress*100+i*15,i%2?'#a3d8f4':'#cfacfa',2);c.restore();
 }
 c.restore();return true;
}

export function weaverAuraRadius(e,time){
 let radius=0;
 for(const thread of e.weaverThreads||[])if((thread.until==null||thread.until>time)&&Number.isFinite(thread.x))radius=Math.max(radius,Math.hypot(thread.x-e.x,thread.y-e.y)+60);
 const preview=e.weaverTimeLapsePreview;if(preview)radius=Math.max(radius,Math.hypot(preview.x-e.x,preview.y-e.y)+60);
 return radius;
}

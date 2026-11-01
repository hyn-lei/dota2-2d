import { effectPose, effectIsActive, unitVisuals } from './combat-visuals.js';
import { abilityAt, talentStats } from './ability-data.js';

const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function circle(c,x,y,r,fill,stroke,width=1){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function polygon(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function stroke(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function glow(c,x,y,r,color){c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');circle(c,x,y,r,g);c.restore();}
function crystal(c,x,y,size,angle=0){
  c.save();c.translate(x,y);c.rotate(angle);
  polygon(c,[[0,-size],[-size*.34,-size*.18],[-size*.22,size*.2],[size*.26,size*.2],[size*.4,-size*.25]],'#72bbda','#d5f7ff',1);
  polygon(c,[[0,-size],[-size*.06,size*.16],[size*.26,size*.2],[size*.4,-size*.25]],'#b9efff');
  stroke(c,[[0,-size],[0,size*.15]],'#f0fcff',1);c.restore();
}
function snowflake(c,x,y,r,angle=0){
  c.save();c.translate(x,y);c.rotate(angle);
  for(let i=0;i<6;i++){c.rotate(TAU/6);stroke(c,[[0,0],[r,0]],'#d5f5ff',1.3);stroke(c,[[r*.5,-r*.22],[r*.7,0],[r*.5,r*.22]],'#a8dfee',1);}
  c.restore();
}
function sparks(c,r,progress,color,count=12){
  for(let i=0;i<count;i++){const a=noise(i+1)*TAU,d=r*(.2+noise(i+20)*.8)*progress;
    const x=Math.cos(a)*d,y=Math.sin(a)*d;stroke(c,[[x,y],[x+Math.cos(a)*8,y+Math.sin(a)*8]],color,1+noise(i+40)*2);}
}
function bladeArc(c,r,angle,color,width=12,sweep=2.1){
  const points=[];
  for(let i=0;i<=22;i++){const f=i/22,a=angle+f*sweep;points.push([Math.cos(a)*r,Math.sin(a)*r]);}
  for(let i=22;i>=0;i--){const f=i/22,a=angle+f*sweep,inside=r-width*Math.sin(f*Math.PI);points.push([Math.cos(a)*inside,Math.sin(a)*inside]);}
  polygon(c,points,color);c.beginPath();c.arc(0,0,r,angle,angle+sweep);c.strokeStyle='#fff1d6';c.lineWidth=1.4;c.stroke();
}

function projectile(c,e,pose,zoom){
  const p=pose.progress,v=e.visual||'neutralBolt',tower=v.endsWith('Tower'),arrow=['arrowAttack','powershot','shackleShot'].includes(v),power=v==='powershot';
  const color=e.color||'#e9d391',size=clamp(.5/zoom,.85,1.6),tail=Math.min(pose.distance*p,power?260:tower?145:arrow?100:85);
  const head=tower?18:power?12:arrow?5:v==='frostAttack'?11:9;
  c.save();c.translate(pose.x,pose.y);c.rotate(pose.angle);c.scale(size,size);
  const gradient=c.createLinearGradient(-Math.max(tail,1),0,10,0);gradient.addColorStop(0,'transparent');gradient.addColorStop(.72,color);gradient.addColorStop(1,'#fff6d5');
  c.globalAlpha*=.65;polygon(c,[[-tail,0],[-28,-head*.6],[8,0],[-28,head*.6]],gradient);c.globalAlpha/=.65;
  glow(c,0,0,head*3.4,tower?'#ffb65765':power?'#acff7760':'#bcefff40');
  if(arrow){
    if(power){polygon(c,[[-85,0],[-21,-12],[32,0],[-21,12]],'#9ee674');polygon(c,[[-68,0],[28,0],[-17,-3]],'#f3ffce');
      for(let i=0;i<3;i++)stroke(c,[[-45-i*28,-15],[-25-i*28,0],[-45-i*28,15]],'#c5f99a',2);}
    else{stroke(c,[[-50,0],[19,0]],'#cab58a',2.7);polygon(c,[[25,0],[8,-6],[11,0],[8,6]],'#ecf1d3','#839578',1);
      polygon(c,[[-42,0],[-55,-7],[-32,-3],[-25,0]],'#9da56d');polygon(c,[[-42,0],[-55,7],[-32,3],[-25,0]],'#d9d2a2');}
    if(v==='shackleShot'){circle(c,0,0,12,null,'#eddd95',2);stroke(c,[[-32,-9],[-18,7],[-4,-9],[9,6]],'#c6aa65',2);}
  }else if(v==='frostAttack'){
    c.save();c.rotate(Math.PI/2);crystal(c,0,0,29);c.restore();
    for(let i=0;i<5;i++){c.globalAlpha=.65*(1-i/5);crystal(c,-18-i*13,Math.sin(i*2.4)*8,7-i*.7,Math.PI/2);}
  }else if(v==='direTower'||v==='direBolt'){
    const flameScale=tower?1:.62;c.save();c.scale(flameScale,flameScale);
    for(let i=4;i>=0;i--)glow(c,-i*7,(noise(i+Math.floor(p*20))-.5)*7,21-i*2,i%2?'#ff552aac':'#ff962faa');
    polygon(c,[[-42,0],[-17,-8],[5,-14],[17,-5],[22,0],[13,8],[-10,9]],'#ed642580');
    glow(c,4,0,15,'#ffde82');circle(c,7,0,head*.44,'#fff0b9');c.restore();
    for(let i=0;i<8;i++){const x=-18-noise(i+2)*tail,y=(noise(i+12)-.5)*25;circle(c,x,y,1+noise(i+24)*2.5,i%2?'#e9592b':'#ffcf69');}
  }else if(v==='cannonBall'){
    circle(c,0,0,12,'#425b5c','#b1d9ce',2);circle(c,3,-3,4,'#8daeb0');
    for(let i=0;i<4;i++)glow(c,-18-i*15,(noise(i)-.5)*12,11,'#aac6c530');
  }else{
    circle(c,0,0,head,color);circle(c,3,-2,head*.52,'#fff9d9');
    if(tower){c.save();c.rotate(p*5);polygon(c,[[0,-25],[6,-5],[25,0],[6,5],[0,25],[-6,5],[-25,0],[-6,-5]],null,'#ffeab5',1.4);c.restore();}
    for(let i=0;i<5;i++)circle(c,-22-i*12,(noise(i+4)-.5)*15,2,color);
  }
  c.restore();
  if(p>.86){c.save();c.translate(pose.tx,pose.ty);c.globalAlpha*=(1-p)/.14;glow(c,0,0,tower?58:30,color);sparks(c,tower?65:35,(p-.86)/.14,color,zoom<.3?5:10);c.restore();}
}
function frostNova(c,r,p,zoom){
  const expansion=Math.sin(Math.min(1,p*1.8)*Math.PI/2),reach=r*(.18+.82*expansion);
  c.globalAlpha*=1-p;glow(c,0,0,reach,'#67c5e33a');
  c.globalAlpha*=.5;circle(c,0,0,reach,null,'#c5f5ff',2);c.globalAlpha*=2;
  // Small icy branches and a short luminous front read as an explosion, rather than a floor glyph.
  for(let i=0;i<6;i++){const a=i*TAU/6;stroke(c,[[Math.cos(a)*reach*.15,Math.sin(a)*reach*.15],[Math.cos(a)*reach*.66,Math.sin(a)*reach*.66]],'#a8e6fa80',2);}
  const count=zoom<.3?6:12;
  for(let i=0;i<count;i++){const a=i*TAU/count,rr=reach*(.55+noise(i)*.3),x=Math.cos(a)*rr,y=Math.sin(a)*rr;glow(c,x,y,32,'#9bebff70');crystal(c,x,y,15+noise(i+8)*25,a+.4);}
  for(let i=0;i<count*3;i++){const a=noise(i+61)*TAU,d=reach*noise(i+47);circle(c,Math.cos(a)*d,Math.sin(a)*d,1+noise(i+80)*2,'#ecfbff');}
}
function waterBurst(c,e,p,zoom){
  const r=(e.radius||200)*(.4+.6*p),height=(e.type==='torrent'?185:110)*Math.sin(p*Math.PI);
  c.globalAlpha*=1-p*.7;glow(c,0,0,r,'#73d1e435');
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,r*(1-i*.2),r*(.65-i*.12),0,0,TAU);c.strokeStyle=i%2?'#9ce2ea':'#d5f4ed';c.lineWidth=3-i*.5;c.stroke();}
  const count=zoom<.3?8:16;
  for(let i=0;i<count;i++){const a=i*TAU/count,rr=r*(.25+noise(i)*.55),x=Math.cos(a)*rr,y=Math.sin(a)*rr*.65,h=height*(.4+noise(i+10)*.6);
    const g=c.createLinearGradient(x,y,x,y-h);g.addColorStop(0,'#387f9a30');g.addColorStop(.55,'#67bed5b0');g.addColorStop(1,'#defdf5');
    polygon(c,[[x-12,y],[x-9,y-h*.4],[x-4,y-h],[x+3,y-h-9],[x+8,y-h*.55],[x+15,y]],g);
    circle(c,x+5,y-h-20,3,'#ddf8fa');circle(c,x-8,y-h-8,2,'#a4e0ed');}
}
function ghostship(c,e,pose){
  c.translate(pose.x,pose.y);c.rotate(pose.angle);const s=clamp((e.radius||200)/200,.8,1.6);c.scale(s,s);
  glow(c,-40,0,160,'#80e2db30');
  for(let i=0;i<7;i++){const y=(i-3)*17;stroke(c,[[-225-i*4,y*1.6],[-140,y*.9],[-90,y]],i%2?'#b6eee2':'#6ab7c6',2);}
  c.globalAlpha*=.85;polygon(c,[[-110,-43],[-55,-55],[60,-39],[136,0],[60,39],[-55,55],[-110,43]],'#2c656cbb','#bcf3dc',2.5);
  polygon(c,[[-95,-30],[-45,-40],[52,-29],[111,0],[52,29],[-45,40],[-95,30]],'#3b81836a','#71b7aa',1);
  for(let i=-80;i<70;i+=18)stroke(c,[[i,-31],[i,31]],'#94cfbe80',1);
  stroke(c,[[-34,-70],[-34,70]],'#c5ecda',3);stroke(c,[[35,-55],[35,55]],'#b0e2cd',3);
  polygon(c,[[-35,-68],[6,-45],[18,-3],[9,42],[-35,68],[-22,0]],'#c5eed3a0','#e7fff0',1.5);
  polygon(c,[[34,-53],[68,-34],[79,0],[65,34],[34,53],[44,0]],'#93d6c6a0','#cefae0',1.5);
  stroke(c,[[105,0],[165,0]],'#d3f6df',3);polygon(c,[[-100,-26],[-70,-21],[-70,21],[-100,26]],'#579b8ca0','#bbebd4',1);
  for(let i=0;i<10;i++)circle(c,-120-noise(i+17)*110,(noise(i+31)-.5)*95,2,'#d6f9e8');
}

/** Draw one event; return false for text/UI effects handled by Renderer. */
export function drawCombatEffect(c,e,game,zoom=1){
  if(e.type==='text'||e.type==='recall')return false;
  if(!effectIsActive(e,game))return true;
  const pose=effectPose(e,game.time,game.entities),p=pose.progress,k=1-p;
  if(k<=0)return true;
  c.save();c.lineCap='round';c.lineJoin='round';c.globalAlpha=Math.min(1,k*3);
  const v=e.visual,r=e.radius||65,color=e.color||'#e4ce9f';
  if(v==='shackleLink'){
    const target=game.entities.find(u=>u.id===e.targetId&&!u.dead),anchor=e.anchorId?game.entities.find(u=>u.id===e.anchorId&&!u.dead):null;
    if(target){
      const end=anchor||{x:e.tx,y:e.ty},dx=end.x-target.x,dy=end.y-target.y,d=Math.hypot(dx,dy)||1,points=[];
      for(let i=0;i<=20;i++){const f=i/20,w=Math.sin(f*Math.PI*12+game.time*8)*4;points.push([target.x+dx*f-dy/d*w,target.y+dy*f+dx/d*w-25]);}
      stroke(c,points,'#695737',5);stroke(c,points,'#e5cb81',2);glow(c,target.x,target.y-25,38,'#e7d18240');
    }
  }else if(v==='tidalWave'){
    c.translate(pose.x,pose.y);c.rotate(pose.angle);glow(c,0,0,r,'#77d3e235');
    c.beginPath();c.ellipse(0,0,45,r,0,-Math.PI/2,Math.PI/2);c.strokeStyle='#c2f2eb';c.lineWidth=14;c.stroke();
    for(let i=0;i<14;i++){const y=(i/13-.5)*r*2;stroke(c,[[-65-noise(i)*60,y],[-15,y-8],[25*Math.cos(y/r),y]],'#8fd7e0',3);}
  }else if(e.type==='projectile'||v==='powershot')projectile(c,e,pose,zoom);
  else if(e.type==='ship')ghostship(c,e,pose);
  else if(e.type==='beam'){
    // Instant item beams show their complete connection; spell missiles use profiles above.
    const points=[],dx=(e.tx??e.x)-e.x,dy=(e.ty??e.y)-e.y,d=Math.hypot(dx,dy)||1;
    for(let i=0;i<=12;i++){const f=i/12,j=i&&i<12?(noise(i+Math.floor(game.time*18))-.5)*24:0;points.push([e.x+dx*f-dy/d*j,e.y+dy*f+dx/d*j-20]);}
    c.globalAlpha*=.3;stroke(c,points,color,10);c.globalAlpha/=.3;stroke(c,points,color,3);stroke(c,points,'#f2f7ea',1);
  }else{
    const melee=['meleeSlash','bladeSlash','axeSlash','tideSlash','omnislash'].includes(v);
    c.translate(melee?(e.tx??e.x):e.x,melee?(e.ty??e.y)-25:e.y);
    if(v==='frostNova')frostNova(c,r,p,zoom);
    else if(v==='galeForce'){
      const dir=e.direction||{x:1,y:0};c.rotate(Math.atan2(dir.y,dir.x));glow(c,0,0,r,'#bde18f15');
      const count=zoom<.3?8:18;
      for(let i=0;i<count;i++){const y=(noise(i+9)-.5)*r*1.8,x=((game.time*160+i*47)%(r*2))-r;stroke(c,[[x-60,y+6],[x,y],[x+25,y-6]],'#c1dc9f70',2);}
    }
    else if(e.type==='torrent'||e.type==='shipImpact')waterBurst(c,e,p,zoom);
    else if(e.type==='torrentWarning'){
      c.globalAlpha=.25+.35*p;circle(c,0,0,r,null,'#89bfc8',1.5);circle(c,0,0,r*p,null,'#bce4e3',2);
      for(let i=0;i<6;i++){c.beginPath();c.arc(0,0,r*.64,game.time*.6+i*TAU/6,game.time*.6+i*TAU/6+.5);c.strokeStyle='#b6e7ec';c.lineWidth=2;c.stroke();}
    }else if(v==='cullingBlade'){
      glow(c,0,0,110,'#ed4c2730');c.save();c.translate(0,-135+Math.min(1,p*2.4)*125);c.rotate(-.35);
      stroke(c,[[0,-90],[0,20]],'#71503c',8);polygon(c,[[0,-77],[-33,-96],[-65,-72],[-59,-29],[-25,-41],[0,-54],[25,-41],[59,-29],[65,-72],[33,-96]],'#97a3a1','#e9e4c9',3);
      stroke(c,[[-64,-71],[-57,-32],[-27,-42]],'#ff8b65',4);stroke(c,[[64,-71],[57,-32],[27,-42]],'#ff8b65',4);c.restore();if(p>.3)sparks(c,145,(p-.3)/.7,'#f48053');
    }else if(v==='berserkerCall'||v==='shackleImpact'){
      glow(c,0,0,r*(.3+.7*p),v==='berserkerCall'?'#e64b3428':'#d7dd8430');circle(c,0,0,r*Math.sin(p*Math.PI/2),null,color,4*k+1);sparks(c,r,p,color,zoom<.3?8:18);
    }else if(v==='counterHelix'){
      c.rotate(p*TAU*1.4);for(let i=0;i<3;i++)bladeArc(c,r*.85,i*TAU/3,'#f18051b0',24,1.8);sparks(c,r,p,'#edc29a',10);
    }else if(melee||e.type==='slash'){
      c.rotate(e.angle??Math.atan2((e.ty??e.y)-e.y,(e.tx??e.x)-e.x));
      if(v==='omnislash'){const d=Math.hypot((e.tx??e.x)-e.x,(e.ty??e.y)-e.y);stroke(c,[[-d,0],[0,0]],'#ffb86e',8*k+1);stroke(c,[[-d,0],[20,0]],'#fff3d6',2);}
      bladeArc(c,r*(.7+.3*p),-1.6+p*.4,color,16*k+3,2.5);sparks(c,r*.7,p,color,6);
    }else if(e.type==='cleave'){
      const angle=Math.atan2(e.ty-e.y,e.tx-e.x),reach=Math.hypot(e.tx-e.x,e.ty-e.y);c.rotate(angle);c.globalAlpha*=.3;
      polygon(c,[[0,0],[reach,-r/2],[reach+25,0],[reach,r/2]],'#78cede');c.globalAlpha/=.3;
      c.beginPath();c.ellipse(reach*(.5+p*.5),0,35,r*.5,0,-Math.PI/2,Math.PI/2);c.strokeStyle='#c9f4ee';c.lineWidth=5;c.stroke();
      for(let i=0;i<10;i++)circle(c,reach*p*noise(i+2),(noise(i+5)-.5)*r*p,3,'#a7dfe8');
    }else{
      // Existing item bursts/heals keep their own colors, now with radial motes.
      glow(c,0,0,r*(.4+.6*p),color+'30');circle(c,0,0,r*(.35+.65*p),null,color,2);sparks(c,r,p,color,zoom<.3?6:12);
    }
  }
  c.restore();return true;
}

/** Persistent world-space auras are derived from actual statuses, never independent timers. */
export function drawUnitCombatEffects(c,e,game,zoom=1,layer='ground'){
  const visuals=unitVisuals(e,game.time);if(!visuals.length)return;
  const t=game.time;c.save();c.translate(e.x,e.y);
  for(const v of visuals){
    if(layer==='ground'){
      if(v==='bladeFury'){
        const r=unitAuraRadius(e,game.time);
        glow(c,0,0,r,'#d95b2925');c.save();c.scale(1,.68);c.rotate(t*13);
        for(let i=0;i<3;i++){bladeArc(c,r*(.88+i*.04),i*TAU/3,'#e87943c0',20,1.8);c.globalAlpha=.28;bladeArc(c,r*(.68+i*.05),i*TAU/3-.45,'#ffb962',12,2.5);c.globalAlpha=1;}c.restore();
        for(let i=0;i<10;i++){const a=t*9+i*TAU/10;stroke(c,[[Math.cos(a)*r*.72,Math.sin(a)*r*.53],[Math.cos(a+.06)*r*.97,Math.sin(a+.06)*r*.65]],'#ffd69a',2);}
      }else if(v==='freezingField'){
        const r=unitAuraRadius(e,game.time);
        glow(c,0,0,r,'#79c9e225');circle(c,0,0,r,null,'#9bdaeb70',1.5);
        const count=zoom<.3?12:28;
        for(let i=0;i<count;i++){const a=i*2.39996+t*.22,d=r*Math.sqrt((i+.5)/count),x=Math.cos(a)*d,y=Math.sin(a)*d;
          c.globalAlpha=.25+noise(i+8)*.5;snowflake(c,x,y,5+noise(i)*8,t*.3);circle(c,x+9,y-10-(t*28+i*13)%55,2,'#e7faff');}c.globalAlpha=1;
      }else if(v==='healingWard'){
        glow(c,0,0,e.healRadius,'#84c8661b');circle(c,0,0,48+Math.sin(t*2)*8,null,'#b7e88990',2);
        for(let i=0;i<7;i++){const a=t*.5+i*TAU/7;glow(c,Math.cos(a)*70,Math.sin(a)*44,10,'#b5ee7e90');}
      }else if(v==='windrun'){
        c.save();c.rotate(e.angle||0);for(let i=0;i<5;i++){const y=(i-2)*16,x=-45-((t*100+i*19)%80);stroke(c,[[x-50,y+8],[x,y],[25,y-9]],'#a9df9860',2);}c.restore();
      }else if(v==='call'){circle(c,0,0,70+Math.sin(t*7)*4,null,'#e8905890',2);}
    }else{
      if(v==='frostbite'||v==='crystalClone'){
        glow(c,0,-25,80,'#94daed30');for(let i=0;i<7;i++){const a=i*TAU/7;crystal(c,Math.cos(a)*40,Math.sin(a)*22,48+noise(i)*28,(i-3)*.1);}snowflake(c,0,-52,18,t*.1);
      }else if(v==='hunger'){
        const y=-116+Math.sin(t*4)*4;glow(c,0,y,26,'#ed49254a');polygon(c,[[-13,y-15],[13,y-15],[16,y],[8,y+10],[-8,y+10],[-16,y]],'#a13927','#f5b66e',1.5);
        polygon(c,[[-11,y-5],[-3,y-3],[-5,y+1]],'#ffde94');polygon(c,[[11,y-5],[3,y-3],[5,y+1]],'#ffde94');stroke(c,[[-7,y+8],[7,y+8]],'#ffd49b',2);
      }else if(v==='powershotCharge'){
        const fraction=clamp((t-e.channel.startedAt)/e.channel.skill.channelTime,0,1);c.save();c.rotate(e.angle||0);glow(c,52,-12,30+fraction*35,'#b7f49c50');
        for(let i=0;i<5;i++){const a=t*6+i*TAU/5,r=50*(1-fraction)+12;stroke(c,[[52+Math.cos(a)*r,-12+Math.sin(a)*r],[52+Math.cos(a)*(r+10),-12+Math.sin(a)*(r+10)]],'#e0ffc0',2);}c.restore();
      }else if(v==='focus'){
        const target=game.entities.find(u=>u.id===e.focusTargetId&&!u.dead);if(target){const dx=target.x-e.x,dy=target.y-e.y;c.save();c.translate(dx,dy-25);circle(c,0,0,40,null,'#d8e6a660',1.5);for(let i=0;i<4;i++){c.rotate(Math.PI/2);stroke(c,[[28,-10],[28,10]],'#e7f5b9',2);}c.restore();}
      }
    }
  }
  c.restore();
}

export function unitAuraRadius(e,time){
  const area=(e.spellAoE||0)+(e.heroId?talentStats(e.heroId,e.talents||[]).spellAoE||0:0);
  const field=e.freezingField||e.channel;
  if(field?.kind==='freezing'&&field.until>time)return field.skill.values.radius+area;
  if(e.statuses?.spin?.until>time)return abilityAt(e.heroId,0,e.abilityLevels?.[0]||1,e.talents||[],e).values.blade_fury_radius+area;
  if(e.kind==='ward')return e.healRadius||0;
  return 100;
}

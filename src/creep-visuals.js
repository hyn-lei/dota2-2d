const palettes=[
 [{cloth:'#587845',armor:'#a9b398',edge:'#d8d4aa',skin:'#c8bc8a',glow:'#a6db91'},
  {cloth:'#2d7262',armor:'#879fb2',edge:'#e1bd75',skin:'#c4caaa',glow:'#70d5c3'},
  {cloth:'#285555',armor:'#d0cfac',edge:'#fff0ba',skin:'#e2d7b0',glow:'#8af3dc'}],
 [{cloth:'#8b4a3d',armor:'#64574d',edge:'#c9ae8a',skin:'#b79975',glow:'#d98864'},
  {cloth:'#713b58',armor:'#88848b',edge:'#e0b392',skin:'#c6afa2',glow:'#e098cc'},
  {cloth:'#501e34',armor:'#a09caa',edge:'#f5d393',skin:'#d5c3b1',glow:'#ff8875'}],
];
const polygon=(c,points,fill,stroke,width=1.4)=>{c.beginPath();for(let i=0;i<points.length;i++)c[i?'lineTo':'moveTo'](...points[i]);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
const line=(c,points,color,width=2)=>{c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
const orb=(c,x,y,r,fill,stroke)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.3;c.stroke();}};
export function creepAppearance(unit){
 const stage=unit.zealot||unit.upgrade==='mega'?2:unit.upgrade==='super'?1:0;
 return {stage,upgrade:['normal','super','mega'][stage],type:unit.siege?'siege':unit.ranged?'ranged':'melee',team:unit.team===1?1:0};
}
export function drawLaneCreep(c,unit,time,scaleBonus=1){
 const {stage,type,team}=creepAppearance(unit),p=palettes[team][stage],outline='#25322b';
 c.save();c.scale(2.3*scaleBonus,2.3*scaleBonus);
 c.fillStyle='rgba(6,15,12,.38)';c.beginPath();c.ellipse(0,9,type==='siege'?24:12+stage*3,type==='siege'?12:7,0,0,Math.PI*2);c.fill();
 c.rotate((unit.angle||0)+Math.PI/2);
 if(type==='siege'){
  for(const x of [-20,20])for(const y of [-9,13]){
   orb(c,x,y,7+stage,p.armor,outline);c.save();c.translate(x,y);c.rotate(unit.moving?time*8:0);line(c,[[-5,0],[5,0]],p.edge,1.5);line(c,[[0,-5],[0,5]],p.edge,1.5);c.restore();
  }
  polygon(c,[[-18,18],[-20,-14],[-12,-23],[12,-23],[20,-14],[18,18]],p.cloth,outline,2);
  polygon(c,[[-14,11],[-13,-14],[13,-14],[14,11]],p.armor,p.edge);
  if(stage===0){line(c,[[-10,8],[0,-23],[10,8]],'#96784b',4);polygon(c,[[-8,-26],[8,-26],[7,-18],[-7,-18]],p.edge,outline);orb(c,0,-22,4,'#403e31');}
  else if(stage===1){polygon(c,[[-9,12],[-8,-30],[8,-30],[9,12]],p.armor,p.edge,2);orb(c,0,-29,6,'#2b3633',p.edge);polygon(c,[[-12,14],[0,5],[12,14],[0,23]],p.edge,outline);}
  else{
   for(const x of [-7,7]){polygon(c,[[x-4,9],[x-4,-34],[x+4,-34],[x+4,9]],p.armor,p.edge,2);orb(c,x,-33,4,'#241f29',p.glow);}
   polygon(c,[[-20,-16],[-29,-24],[-22,-4]],p.edge,outline);polygon(c,[[20,-16],[29,-24],[22,-4]],p.edge,outline);
   polygon(c,[[-17,13],[-12,22],[0,29],[12,22],[17,13]],p.armor,p.edge,2);orb(c,0,15,5,p.glow);
  }
  if(unit.attackFlash>0)orb(c,0,-34,9,p.glow);
 }else{
  const step=unit.moving?Math.sin(time*13+Number(String(unit.id).replace(/\D/g,'')))*2:0;
  c.translate(0,step);c.scale(1+stage*.1,1+stage*.1);
  polygon(c,[[-7,4],[-9,16],[-3,17],[0,7],[3,17],[9,16],[7,4]],outline,p.edge,1);
  if(type==='ranged'){
   polygon(c,[[-8,-9],[-14,14],[0,20],[14,14],[8,-9]],p.cloth,outline,1.5);
   polygon(c,[[-4,-7],[-6,14],[0,17],[6,14],[4,-7]],p.armor,p.edge,1);
   line(c,[[12,13],[12,-27-stage*3]],'#94815c',2.6);
   if(stage===0)orb(c,12,-27,4,p.glow,p.edge);
   else if(stage===1)polygon(c,[[5,-27],[12,-37],[19,-27],[12,-20]],p.glow,p.edge);
   else{polygon(c,[[3,-29],[6,-39],[12,-34],[18,-39],[21,-29],[12,-18]],p.armor,p.edge);orb(c,12,-28,5,p.glow);line(c,[[5,-27],[19,-27]],p.edge,1.5);}
  }else{
   polygon(c,[[-8,9],[-11,-6],[-6,-15],[6,-15],[11,-6],[8,9]],p.cloth,outline,1.6);
   if(stage){polygon(c,[[-10,-6],[-15,-13],[-8,-18],[-3,-7]],p.armor,p.edge);polygon(c,[[10,-6],[15,-13],[8,-18],[3,-7]],p.armor,p.edge);polygon(c,[[-6,-6],[-5,6],[5,6],[6,-6]],p.armor,p.edge);}
   const shield=stage===0?[[-15,-4],[-9,-7],[-7,4],[-11,9],[-17,4]]:stage===1?[[-19,-9],[-8,-12],[-6,4],[-13,14],[-20,4]]:[[-23,-11],[-15,-19],[-7,-11],[-6,7],[-15,20],[-23,7]];
   polygon(c,shield,p.armor,p.edge,1.8);if(stage===2){orb(c,-15,0,3,p.glow);polygon(c,[[-21,-11],[-24,-19],[-16,-14]],p.edge);}
   c.save();c.translate(11,2);c.rotate(unit.attackFlash>0?-.9:0);line(c,[[0,10],[0,-19]],'#806b47',2.5);
   polygon(c,stage===0?[[-2,-8],[-2,-25],[0,-30],[2,-25],[2,-8]]:stage===1?[[-3,-7],[-5,-28],[0,-36],[5,-28],[3,-7]]:[[-4,-6],[-7,-29],[-4,-38],[0,-44],[4,-38],[7,-29],[4,-6]],p.armor,p.edge,1.3);line(c,[[-5,-5],[5,-5]],p.edge,2);c.restore();
  }
  orb(c,0,-12,5,p.skin,outline);
  if(stage===0)polygon(c,[[-6,-12],[-6,-19],[0,-22],[6,-19],[6,-12]],p.armor,outline);
  else if(stage===1)polygon(c,[[-8,-11],[-7,-22],[-12,-27],[-3,-22],[0,-25],[3,-22],[12,-27],[7,-22],[8,-11]],p.armor,p.edge);
  else{polygon(c,[[-9,-11],[-8,-22],[-17,-32],[-4,-26],[0,-35],[4,-26],[17,-32],[8,-22],[9,-11]],p.armor,p.edge);line(c,[[-4,-14],[4,-14]],p.glow,2);}
  if(unit.flagbearer){line(c,[[-8,4],[-17,-33]],'#ad9360',2);polygon(c,[[-17,-33],[-29,-28],[-18,-21]],p.cloth,p.edge);}
  if(unit.zealot)orb(c,0,0,18,null,'#f3dca3');
 }
 c.restore();
}

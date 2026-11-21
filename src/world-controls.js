export const objectiveNames={outpost:'前哨',wisdom:'智慧神龛',gate:'双生之门',powerRune:'强化神符'};
export function worldObjectiveAt(game,point,radius=70){
 return (game.worldObjectives||[]).filter(o=>Math.hypot(o.x-point.x,o.y-point.y)<=radius).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
}
export function mountWorldControls(container,game,notify){
 container.insertAdjacentHTML('beforeend','<button id="defense-glyph" title="保护己方建筑和兵线">防御符文 2/2</button><span id="world-objective-hint" hidden></span><span id="aegis-timer" hidden></span>');
 const glyph=container.querySelector('#defense-glyph'),hint=container.querySelector('#world-objective-hint'),aegis=container.querySelector('#aegis-timer');
 glyph.onclick=async()=>{const result=await game.useGlyph();if(!result.ok)notify(result.reason);update();};
 function update(){
  const p=game.player,state=game.glyphStates?.[p.team]||{rechargeAt:[],cooldownUntil:0},charges=2-state.rechargeAt.length;
  glyph.textContent=`防御符文 ${charges}/2`;glyph.disabled=game.paused||charges===0||state.cooldownUntil>game.time;
  glyph.title=state.rechargeAt.length?`下次充能 ${Math.max(0,Math.ceil(state.rechargeAt[0]-game.time))} 秒 · 建筑保护 7 秒`:'建筑保护 7 秒 · 小兵保护 3 秒';
  const near=worldObjectiveAt(game,p,250),interaction=p.worldInteraction;
  hint.hidden=!near&&!interaction;
  if(interaction)hint.textContent=`正在使用${objectiveNames[(game.worldObjectives||[]).find(o=>o.id===interaction.objectiveId)?.objectiveType]||'地图目标'} ${Math.max(0,interaction.endsAt-game.time).toFixed(1)} 秒`;
  else if(near)hint.textContent=`${objectiveNames[near.objectiveType]} · ${near.objectiveType==='powerRune'?'走近拾取':'右键使用'}`;
  const holder=game.entities.find(e=>e.kind==='hero'&&e.aegisUntil>game.time);aegis.hidden=!holder;
  if(holder){const seconds=Math.ceil(holder.aegisUntil-game.time);aegis.textContent=`${holder.name} · 不朽 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
 }
 return {update};
}

export function drawWorldObjectives(c,game,zoom){
 const colors={outpost:'#d9b77d',wisdom:'#9ccdeb',gate:'#b396de',powerRune:'#8fd9bd'};
 c.save();c.lineWidth=1.5/zoom;c.font=`${10/zoom}px "Microsoft YaHei",sans-serif`;c.textAlign='center';
 for(const o of game.worldObjectives||[]){
  const r=Math.max(30,12/zoom),color=colors[o.objectiveType];c.strokeStyle=color;c.fillStyle='#152330c9';
  c.beginPath();c.arc(o.x,o.y,r,0,Math.PI*2);c.fill();c.stroke();
  if(o.objectiveType==='gate'){c.beginPath();c.ellipse(o.x,o.y-4,r*.46,r*.75,0,0,Math.PI*2);c.stroke();}
  else{c.beginPath();c.moveTo(o.x,o.y-r*.55);c.lineTo(o.x+r*.4,o.y);c.lineTo(o.x,o.y+r*.55);c.lineTo(o.x-r*.4,o.y);c.closePath();c.stroke();}
  c.fillStyle=color;c.fillText(objectiveNames[o.objectiveType],o.x,o.y+r+12/zoom);
 }
 for(const stone of game.madstoneDrops||[]){c.fillStyle='#cfc085';c.beginPath();c.moveTo(stone.x,stone.y-14);c.lineTo(stone.x+10,stone.y);c.lineTo(stone.x,stone.y+14);c.lineTo(stone.x-10,stone.y);c.closePath();c.fill();}
 c.restore();
}

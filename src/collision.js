const buildings=new Set(['tower','barracks','ancient','fountain','filler','glacierWall']);
const mobiles=new Set(['hero','creep','neutral','summon','illusion','courier','ward']);
const EPS=.001,CELL=256;
export function phased(unit,time){
 return !!unit.phased||Object.values(unit.statuses||{}).some(s=>s.phased&&s.until>time&&(s.startedAt==null||s.startedAt<=time));
}
export function collisionShape(unit){
 if(buildings.has(unit.kind)){const bounds=unit.bounds||[unit.radius*2,unit.radius*2];return {type:'box',hx:bounds[0]/2,hy:bounds[1]/2};}
 return {type:'circle',radius:unit.collisionRadius??unit.radius??18};
}
function solid(unit){return !unit.dead&&unit.hp>0&&!unit.flying&&!unit.noCollision&&(buildings.has(unit.kind)||mobiles.has(unit.kind));}
const extent=s=>s.type==='box'?{x:s.hx,y:s.hy}:{x:s.radius,y:s.radius};

/** Footprint collision is separate from selection rings and attack ranges. */
export class CollisionWorld{
 constructor(){this.buckets=new Map();this.entries=new Map();this.time=0;}
 rebuild(units,time){this.buckets.clear();this.entries.clear();this.time=time;for(const unit of units)this.update(unit);}
 update(unit){
  const old=this.entries.get(unit),active=solid(unit),shape=active?collisionShape(unit):null;
  if(old&&active&&old.x===unit.x&&old.y===unit.y&&old.shape.type===shape.type&&old.shape.radius===shape.radius&&old.shape.hx===shape.hx&&old.shape.hy===shape.hy)return;
  if(old)for(const key of old.keys){const bucket=this.buckets.get(key);bucket.delete(unit);if(!bucket.size)this.buckets.delete(key);}
  this.entries.delete(unit);if(!active)return;
  const size=extent(shape),keys=[];
  for(let x=Math.floor((unit.x-size.x)/CELL);x<=Math.floor((unit.x+size.x)/CELL);x++)for(let y=Math.floor((unit.y-size.y)/CELL);y<=Math.floor((unit.y+size.y)/CELL);y++){
   const key=`${x},${y}`;if(!this.buckets.has(key))this.buckets.set(key,new Set());this.buckets.get(key).add(unit);keys.push(key);
  }
  this.entries.set(unit,{shape,keys,x:unit.x,y:unit.y});
 }
 nearby(unit,dx=0,dy=0){
  const radius=collisionShape(unit).radius||24,result=new Set();
  for(let x=Math.floor((Math.min(unit.x,unit.x+dx)-radius)/CELL);x<=Math.floor((Math.max(unit.x,unit.x+dx)+radius)/CELL);x++)for(let y=Math.floor((Math.min(unit.y,unit.y+dy)-radius)/CELL);y<=Math.floor((Math.max(unit.y,unit.y+dy)+radius)/CELL);y++)for(const other of this.buckets.get(`${x},${y}`)||[])if(other!==unit&&solid(other)&&!phased(other,this.time))result.add(other);
  if(phased(unit,this.time))for(const other of result)if(!buildings.has(other.kind))result.delete(other);
  return result;
 }
 overlaps(unit,point=unit){
  const radius=collisionShape(unit).radius||24;
  for(const other of this.nearby(unit,point.x-unit.x,point.y-unit.y)){
   const shape=this.entries.get(other)?.shape||collisionShape(other),dx=point.x-other.x,dy=point.y-other.y;
   if(shape.type==='circle'?Math.hypot(dx,dy)<radius+shape.radius-EPS:Math.abs(dx)<shape.hx+radius-EPS&&Math.abs(dy)<shape.hy+radius-EPS)return true;
  }
  return false;
 }
 /** Reserve nearby walkable ground using the same footprints as normal movement. */
 place(unit,point,navigator,from=null){
  const origin=navigator?navigator.nearestWalkable(point):{x:point.x,y:point.y},step=(collisionShape(unit).radius||24)*2+8;
  const valid=p=>(!navigator||navigator.isWalkable(p))&&(!from||!navigator||navigator.lineClear(from,p))&&!this.overlaps(unit,p);
  const apply=p=>{unit.x=p.x;unit.y=p.y;this.update(unit);return true;};
  if(valid(origin))return apply(origin);
  for(let ring=1;ring<=16;ring++){
   const candidates=[];
   for(let y=-ring;y<=ring;y++)for(let x=-ring;x<=ring;x++)if(Math.abs(x)===ring||Math.abs(y)===ring)candidates.push({x:origin.x+x*step,y:origin.y+y*step,d:x*x+y*y});
   candidates.sort((a,b)=>a.d-b.d);
   const free=candidates.find(valid);if(free)return apply(free);
  }
  return false;
 }
 sweep(unit,dx,dy){
  const radius=collisionShape(unit).radius||24;let result=null;
  for(const other of this.nearby(unit,dx,dy)){
   const shape=this.entries.get(other)?.shape||collisionShape(other),px=unit.x-other.x,py=unit.y-other.y;let t,nx,ny;
   if(shape.type==='circle'){
    const r=radius+shape.radius,a=dx*dx+dy*dy,b=px*dx+py*dy,c=px*px+py*py-r*r;
    if(c<0){if(b>=0)continue;t=0;const d=Math.hypot(px,py)||1;nx=px/d;ny=py/d;}
    else{const discriminant=b*b-a*c;if(a<EPS||b>=0||discriminant<=0)continue;t=(-b-Math.sqrt(discriminant))/a;if(t<0||t>1)continue;const hx=px+dx*t,hy=py+dy*t,d=Math.hypot(hx,hy)||1;nx=hx/d;ny=hy/d;}
   }else{
    const hx=shape.hx+radius,hy=shape.hy+radius;
    if(Math.abs(px)<hx&&Math.abs(py)<hy){const ax=hx-Math.abs(px),ay=hy-Math.abs(py);nx=ax<ay?(Math.sign(px)||1):0;ny=ax<ay?0:(Math.sign(py)||1);if(dx*nx+dy*ny>=0)continue;t=0;}
    else{
     let enter=-Infinity,exit=Infinity;nx=ny=0;let missed=false;
     for(const [p,d,h,axis]of [[px,dx,hx,0],[py,dy,hy,1]]){
      if(Math.abs(d)<EPS){if(Math.abs(p)>h){missed=true;break;}continue;}
      const t1=(-h-p)/d,t2=(h-p)/d,near=Math.min(t1,t2),far=Math.max(t1,t2);
      if(near>enter){enter=near;nx=axis===0?-Math.sign(d):0;ny=axis===1?-Math.sign(d):0;}exit=Math.min(exit,far);
     }
     if(missed||enter>exit||exit<0||enter<0||enter>1)continue;t=enter;
    }
   }
   if(!result||t<result.t)result={t,nx,ny,unit:other};
  }
  return result;
 }
 separate(unit,navigator){
  if(!solid(unit)||phased(unit,this.time))return false;
  const radius=collisionShape(unit).radius;if(!radius)return false;
  if(navigator&&!navigator.isWalkable(unit))return this.place(unit,unit,navigator);
  const before={x:unit.x,y:unit.y};
  for(let pass=0;pass<4;pass++){
   let changed=false;
   for(const other of this.nearby(unit)){
    const shape=this.entries.get(other)?.shape||collisionShape(other),dx=unit.x-other.x,dy=unit.y-other.y;let ox=0,oy=0;
    if(shape.type==='circle'){
     const d=Math.hypot(dx,dy),overlap=radius+shape.radius-d;if(overlap<=EPS)continue;
     const sign=String(unit.id)<String(other.id)?1:-1;ox=(d?dx/d:sign)*(overlap+EPS);oy=(d?dy/d:0)*(overlap+EPS);
    }else{
     const hx=shape.hx+radius,hy=shape.hy+radius,ax=hx-Math.abs(dx),ay=hy-Math.abs(dy);if(ax<=EPS||ay<=EPS)continue;
     if(ax<ay)ox=(Math.sign(dx)||1)*(ax+EPS);else oy=(Math.sign(dy)||1)*(ay+EPS);
    }
    const point={x:unit.x+ox,y:unit.y+oy};if(navigator&&!navigator.lineClear(unit,point))continue;
    unit.x=point.x;unit.y=point.y;changed=true;this.update(unit);
   }
   if(!changed)break;
  }
  if(this.overlaps(unit))this.place(unit,unit,navigator,unit);
  return unit.x!==before.x||unit.y!==before.y;
 }
 move(unit,dx,dy,navigator){
  if(!solid(unit)){unit.x+=dx;unit.y+=dy;this.update(unit);return {blocked:false};}
  this.separate(unit,navigator);let blocked=false,obstacle=null;
  for(let i=0;i<3&&Math.hypot(dx,dy)>EPS;i++){
   const hit=this.sweep(unit,dx,dy),t=hit?Math.max(0,hit.t-EPS/Math.hypot(dx,dy)):1;
   const point={x:unit.x+dx*t,y:unit.y+dy*t};
   if(navigator&&navigator.isWalkable(unit)&&!navigator.lineClear(unit,point)){blocked=true;break;}
   unit.x=point.x;unit.y=point.y;if(!hit)break;
   blocked=true;obstacle=hit.unit;dx*=1-t;dy*=1-t;const inward=Math.min(0,dx*hit.nx+dy*hit.ny);dx-=inward*hit.nx;dy-=inward*hit.ny;
  }
  this.update(unit);return {blocked,obstacle};
 }
 detour(unit,obstacle,goal,navigator){
  if(!obstacle)return null;
  const shape=collisionShape(obstacle),size=extent(shape),radius=collisionShape(unit).radius||24,padding=radius+16;
  const candidates=shape.type==='box'?[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y])=>({x:obstacle.x+x*(size.x+padding),y:obstacle.y+y*(size.y+padding)})):[0,1,2,3,4,5,6,7].map(i=>({x:obstacle.x+Math.cos(i*Math.PI/4)*(size.x+padding),y:obstacle.y+Math.sin(i*Math.PI/4)*(size.y+padding)}));
  const length=Math.hypot(goal.x-unit.x,goal.y-unit.y)||1,fx=(goal.x-unit.x)/length,fy=(goal.y-unit.y)/length,side=Math.max(size.x,size.y)+padding;
  candidates.push({x:unit.x-fy*side,y:unit.y+fx*side},{x:unit.x+fy*side,y:unit.y-fx*side});
  return candidates.filter(p=>(p.x-unit.x)*fx+(p.y-unit.y)*fy>=-EPS&&navigator.lineClear(unit,p)&&!this.sweep(unit,p.x-unit.x,p.y-unit.y)).sort((a,b)=>(Math.hypot(a.x-unit.x,a.y-unit.y)+Math.hypot(a.x-goal.x,a.y-goal.y))-(Math.hypot(b.x-unit.x,b.y-unit.y)+Math.hypot(b.x-goal.x,b.y-goal.y)))[0]||null;
 }
}

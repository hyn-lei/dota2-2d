// Short-lived collision-aware paths supplement the shared terrain route.
const STEP=32,RANGE=20,COLS=RANGE*2+1,COUNT=COLS*COLS,PADDING=6;
export function obstaclePath(world,unit,goal,navigator){
 const start={x:unit.x,y:unit.y},length=Math.hypot(goal.x-start.x,goal.y-start.y);
 if(length<3)return null;
 const point=id=>({x:start.x+(id%COLS-RANGE)*STEP,y:start.y+(Math.floor(id/COLS)-RANGE)*STEP});
 const state=new Uint8Array(COUNT),cost=new Float64Array(COUNT),parent=new Int32Array(COUNT),closed=new Uint8Array(COUNT);
 const clear=(a,b)=>navigator.lineClear(a,b)&&!world.sweep(unit,b.x-a.x,b.y-a.y,a,PADDING);
 const free=id=>{
  if(id<0||id>=COUNT)return false;if(state[id])return state[id]===2;
  const p=point(id),inside=p.x>=navigator.ox&&p.y>=navigator.oy&&p.x<=navigator.ox+(navigator.cols-1)*navigator.size&&p.y<=navigator.oy+(navigator.rows-1)*navigator.size;
  state[id]=inside&&navigator.isWalkable(p)&&!world.overlaps(unit,p,PADDING)?2:1;return state[id]===2;
 };
 const reach=Math.min(length,512),gx=Math.round(RANGE+(goal.x-start.x)/length*reach/STEP),gy=Math.round(RANGE+(goal.y-start.y)/length*reach/STEP);
 let target=null;
 for(let ring=0;ring<=RANGE&&target===null;ring++){
  const candidates=[];
  for(let y=gy-ring;y<=gy+ring;y++)for(let x=gx-ring;x<=gx+ring;x++){
   if(x<0||y<0||x>=COLS||y>=COLS||ring&&Math.abs(x-gx)!==ring&&Math.abs(y-gy)!==ring)continue;
   const id=y*COLS+x;if(free(id))candidates.push({id,d:(x-gx)**2+(y-gy)**2});
  }
  candidates.sort((a,b)=>a.d-b.d);if(candidates.length)target=candidates[0].id;
 }
 const source=RANGE*COLS+RANGE;if(target===null||target===source)return null;
 const tx=target%COLS,ty=Math.floor(target/COLS),heap=[];
 const estimate=id=>Math.hypot(id%COLS-tx,Math.floor(id/COLS)-ty);
 const push=(id,score)=>{
  let n=heap.length;heap.push({id,score});while(n){const p=(n-1)>>1;if(heap[p].score<=score)break;heap[n]=heap[p];n=p;}heap[n]={id,score};
 };
 const pop=()=>{
  const first=heap[0],last=heap.pop();if(heap.length){let n=0;while(n*2+1<heap.length){let c=n*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[n]=heap[c];n=c;}heap[n]=last;}return first.id;
 };
 state[source]=2;parent[source]=-1;push(source,estimate(source));let reached=false,expanded=0;
 while(heap.length&&expanded<COUNT){
  const id=pop();if(closed[id])continue;expanded++;if(id===target){reached=true;break;}closed[id]=1;
  const x=id%COLS,y=Math.floor(id/COLS),a=point(id);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=COLS||ny>=COLS)continue;
   const next=ny*COLS+nx;if(closed[next]||!free(next)||!clear(a,point(next)))continue;
   const value=cost[id]+(dx&&dy?Math.SQRT2:1);
   if(!cost[next]||value<cost[next]){cost[next]=value;parent[next]=id;push(next,value+estimate(next));}
  }
 }
 if(!reached)return null;
 const raw=[];for(let id=target;id!==source;id=parent[id])raw.push(point(id));raw.reverse();
 if(length<=512&&navigator.isWalkable(goal)&&!world.overlaps(unit,goal,PADDING)&&clear(raw.at(-1),goal))raw.push({x:goal.x,y:goal.y});
 const path=[];let anchor=start,index=0;
 while(index<raw.length){let last=index;while(last+1<raw.length&&clear(anchor,raw[last+1]))last++;path.push(raw[last]);anchor=raw[last];index=last+1;}
 return path;
}

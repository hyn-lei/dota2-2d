import { NAV_GRID } from './nav-data.js';
import { TREES } from './map-data.js';

/** Terrain A*, with real tree positions layered over the exported terrain sample. */
export class Navigator {
  constructor(grid=NAV_GRID, trees=TREES, buildings=[]) {
    this.grid=grid; this.size=grid.cellSize; this.cols=grid.cols; this.rows=grid.rows;
    this.ox=grid.origin?.x||0; this.oy=grid.origin?.y||0;
    this.baseTerrain=Uint8Array.from(grid.blocked,c=>c==='1'?1:0);
    this.blocked=this.baseTerrain.slice();
    const count=this.cols*this.rows;
    this.seen=new Uint32Array(count); this.closed=new Uint32Array(count);
    this.cost=new Float64Array(count); this.parent=new Int32Array(count);
    this.generation=0; this.cache=new Map();
    this.updateTrees(trees,buildings);
  }
  updateTrees(trees,buildings=this.buildings||[]){
    this.blocked.set(this.baseTerrain);
    for(const tree of trees){
      const cx=Math.round((tree.x-this.ox)/this.size),cy=Math.round((tree.y-this.oy)/this.size);
      for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++){
        if(x<0||y<0||x>=this.cols||y>=this.rows)continue;
        if(Math.hypot(this.ox+x*this.size-tree.x,this.oy+y*this.size-tree.y)<=70)
          this.blocked[y*this.cols+x]=1;
      }
    }
    this.terrainBlocked=this.blocked.slice();
    this.updateBuildings(buildings);
  }
  updateBuildings(buildings){
    this.buildings=buildings;
    this.blocked.set(this.terrainBlocked);
    for(const b of buildings){
      if(b.dead||b.kind==='fountain')continue;
      const width=(b.bounds?.[0]||b.radius*2||96)/2+16;
      const height=(b.bounds?.[1]||b.radius*2||96)/2+16;
      const from=this.cell({x:b.x-width,y:b.y-height}),to=this.cell({x:b.x+width,y:b.y+height});
      for(let y=from.y;y<=to.y;y++)for(let x=from.x;x<=to.x;x++)this.blocked[y*this.cols+x]=1;
    }
    this.cache.clear();
  }
  cell(point) {
    const x=Math.max(0,Math.min(this.cols-1,Math.round((point.x-this.ox)/this.size)));
    const y=Math.max(0,Math.min(this.rows-1,Math.round((point.y-this.oy)/this.size)));
    return {x,y,id:y*this.cols+x};
  }
  point(id){return {x:this.ox+(id%this.cols)*this.size,y:this.oy+Math.floor(id/this.cols)*this.size};}
  walkable(x,y){return x>=0&&y>=0&&x<this.cols&&y<this.rows&&!this.blocked[y*this.cols+x];}
  isWalkable(point){const c=this.cell(point);return this.walkable(c.x,c.y);}
  nearestWalkable(point) {
    const cell=this.cell(point);
    if(!this.blocked[cell.id])return {x:point.x,y:point.y};
    for(let r=1;r<40;r++){
      let best=null,bestDistance=Infinity;
      for(let y=cell.y-r;y<=cell.y+r;y++)for(let x=cell.x-r;x<=cell.x+r;x++){
        if(Math.abs(x-cell.x)!==r&&Math.abs(y-cell.y)!==r)continue;
        if(!this.walkable(x,y))continue;
        const p=this.point(y*this.cols+x),d=Math.hypot(p.x-point.x,p.y-point.y);
        if(d<bestDistance){best=p;bestDistance=d;}
      }
      if(best)return best;
    }
    return {x:point.x,y:point.y};
  }
  lineClear(a,b) {
    const length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(length/(this.size/3)));
    let previous=this.cell(a);
    if(!this.walkable(previous.x,previous.y))return false;
    for(let i=1;i<=steps;i++){
      const c=this.cell({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps});
      if(!this.walkable(c.x,c.y))return false;
      if(c.x!==previous.x&&c.y!==previous.y&&(!this.walkable(c.x,previous.y)||!this.walkable(previous.x,c.y)))return false;
      previous=c;
    }
    return true;
  }
  findPath(from,to) {
    const a=this.nearestWalkable(from),b=this.nearestWalkable(to);
    if(this.lineClear(a,b))return [b];
    const start=this.cell(a).id,goal=this.cell(b).id,key=`${start}:${goal}`;
    if(this.cache.has(key)){
      const copy=this.cache.get(key).map(p=>({...p}));
      if(this.lineClear(copy.length>1?copy.at(-2):a,b))copy[copy.length-1]=b;
      else copy.push(b);
      return copy;
    }
    const generation=++this.generation,heap=[];
    const push=(id,score)=>{
      let n=heap.length;heap.push({id,score});
      while(n){const p=(n-1)>>1;if(heap[p].score<=score)break;heap[n]=heap[p];n=p;}heap[n]={id,score};
    };
    const pop=()=>{
      const first=heap[0],last=heap.pop();
      if(heap.length){let n=0;while(n*2+1<heap.length){let child=n*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[n]=heap[child];n=child;}heap[n]=last;}
      return first.id;
    };
    const gx=goal%this.cols,gy=Math.floor(goal/this.cols);
    const heuristic=(x,y)=>{const dx=Math.abs(gx-x),dy=Math.abs(gy-y);return Math.max(dx,dy)+.41421356237*Math.min(dx,dy);};
    this.seen[start]=generation;this.cost[start]=0;this.parent[start]=-1;push(start,0);
    let reached=false,expanded=0;
    while(heap.length&&expanded++<60000){
      const id=pop();if(this.closed[id]===generation)continue;
      if(id===goal){reached=true;break;}
      this.closed[id]=generation;const x=id%this.cols,y=Math.floor(id/this.cols);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=x+dx,ny=y+dy;if(!this.walkable(nx,ny))continue;
        if(dx&&dy&&(!this.walkable(x+dx,y)||!this.walkable(x,y+dy)))continue;
        const next=ny*this.cols+nx,cost=this.cost[id]+(dx&&dy?Math.SQRT2:1);
        if(this.closed[next]===generation)continue;
        if(this.seen[next]!==generation||cost<this.cost[next]){
          this.seen[next]=generation;this.cost[next]=cost;this.parent[next]=id;push(next,cost+heuristic(nx,ny));
        }
      }
    }
    if(!reached)return [];
    const raw=[];for(let id=goal;id!==start&&id>=0;id=this.parent[id])raw.push(this.point(id));raw.reverse();raw.push(b);
    const path=[];let anchor=a,index=0;
    while(index<raw.length){let last=index;while(last+1<raw.length&&this.lineClear(anchor,raw[last+1]))last++;path.push(raw[last]);anchor=raw[last];index=last+1;}
    if(this.cache.size>500)this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key,path);return path.map(p=>({...p}));
  }
}

export const navigation=new Navigator();

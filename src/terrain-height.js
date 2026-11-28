import {NAV_GRID} from './nav-data.js';
import {GROUND_HEIGHT_RUNS,WATER_HEIGHT_RUNS} from './terrain-height-data.js';

const {cols,rows,cellSize,origin}=NAV_GRID;
const missingHeight=-16384;
let ground,water;

function decodeRuns(encoded){
 const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
 const runs=new DataView(bytes.buffer),values=new Float32Array(cols*rows);
 let sample=0;
 for(let offset=0;offset<bytes.length;offset+=6){
  const end=sample+runs.getUint16(offset,true);
  values.fill(runs.getFloat32(offset+2,true),sample,end);
  sample=end;
 }
 if(sample!==values.length)throw new Error('Invalid compiled terrain height grid');
 return values;
}

function heightIndex(point){
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return -1;
 const x=point.x-origin.x,y=point.y-origin.y;
 if(x<0||y<0||x>(cols-1)*cellSize||y>(rows-1)*cellSize)return -1;
 return Math.round(y/cellSize)*cols+Math.round(x/cellSize);
}

/** Compiled solid elevation at the nearest navigation center, or null if unavailable. */
export function terrainHeightAt(point){
 const index=heightIndex(point);
 if(index<0)return null;
 ground??=decodeRuns(GROUND_HEIGHT_RUNS);
 return ground[index]===missingHeight?null:ground[index];
}

/** Separate compiled water surface sample, or null when the layer is absent. */
export function terrainWaterHeightAt(point){
 const index=heightIndex(point);
 if(index<0)return null;
 water??=decodeRuns(WATER_HEIGHT_RUNS);
 return water[index]===missingHeight?null:water[index];
}

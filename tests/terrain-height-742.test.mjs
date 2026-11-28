import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigator} from '../src/navigation.js';

test('7.42 ground samples preserve the mid ramp, riverbed and fountain plateau',async()=>{
 const {terrainHeightAt,terrainWaterHeightAt}=await import('../src/terrain-height.js');
 const plateau={x:9856,y:9600},slope={x:9856,y:9728},river={x:9856,y:9792};
 assert.equal(terrainHeightAt(plateau),128);
 assert.equal(terrainHeightAt(slope),23.158203125);
 assert.equal(terrainHeightAt(river),0);
 assert.equal(terrainWaterHeightAt(river),16);
 assert.equal(terrainWaterHeightAt(plateau),null);
 assert.equal(terrainHeightAt({x:3008,y:17344}),384);
});

test('7.42 height lookup keeps the navigator grid and preserves missing compiled samples',async()=>{
 const {terrainHeightAt,terrainWaterHeightAt}=await import('../src/terrain-height.js');
 const navigator=new Navigator(undefined,[]),point={x:9849,y:9791};
 const center=navigator.point(navigator.cell(point).id);
 assert.deepEqual(center,{x:9856,y:9792});
 assert.equal(terrainHeightAt(point),terrainHeightAt(center));
 assert.equal(terrainWaterHeightAt(point),16);
 assert.equal(terrainHeightAt({x:20736,y:10752}),null);
 assert.equal(terrainWaterHeightAt({x:20864,y:10752}),null);
 assert.equal(terrainHeightAt({x:-1,y:10000}),null);
});

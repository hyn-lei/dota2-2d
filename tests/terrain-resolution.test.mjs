import test from 'node:test';
import assert from 'node:assert/strict';
import * as rendering from '../src/renderer.js';

const rect={x:100,y:200,width:4096,height:2048};
function resolution(image,scale){
  assert.equal(typeof rendering.terrainResolution,'function','terrain rendering must choose a decoded resolution for the current pixel scale');
  return rendering.terrainResolution(image,scale,rect);
}

test('terrain uses the native image when projected source pixels need full detail',()=>{
  assert.equal(resolution({naturalWidth:2048,naturalHeight:1024},.5),1);
  assert.equal(resolution({naturalWidth:2048,naturalHeight:1024},1.05),1);
});

test('terrain chooses a bounded decoded resolution without undersampling either axis',()=>{
  const image={naturalWidth:2048,naturalHeight:1024};
  assert.equal(resolution(image,.25),2);
  assert.equal(resolution(image,.125),4);
  assert.equal(resolution(image,.04),8);
  assert.equal(resolution(image,.001),8);
  assert.equal(resolution({naturalWidth:2048,naturalHeight:512},.25),1);
});

test('terrain respects physical pixel density and ImageBitmap dimensions',()=>{
  const image={width:2048,height:1024};
  assert.equal(resolution(image,.25),2);
  assert.equal(resolution(image,.25*2),1);
});

test('terrain falls back to native resolution for an unloaded source or invalid scale',()=>{
  assert.equal(resolution({width:0,height:0},.25),1);
  for(const scale of [0,-1,NaN,Infinity])assert.equal(resolution({width:2048,height:1024},scale),1);
});

test('terrain retains full detail when only a coarser cached bitmap is available',()=>{
  const image={naturalWidth:8878,naturalHeight:8356},coarse={width:1110,height:1045};
  const asset={image,blob:null,bitmaps:new Map([[8,coarse]]),pending:new Map(),unavailable:new Set([1,2])};
  for(const scale of [.18,.45,.45*2]){
    assert.equal(rendering.terrainImageForScale(asset,scale),image,'a failed or pending sharper decode must use the loaded native image');
  }
});

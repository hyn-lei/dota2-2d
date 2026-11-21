import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
// A frame from Valve's transparent hero render, with its original alpha channel.
const hero=process.argv[2]||'chaos_knight';
const source=path.resolve(`docs/research/heroes/${hero}.webm`);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.setContent('<video muted></video>');
 await page.locator('video').evaluate((video,src)=>video.src=src,'data:video/webm;base64,'+fs.readFileSync(source).toString('base64'));
 const data=await page.evaluate(async()=>{
  const video=document.querySelector('video');
  if(video.readyState<2)await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=reject;});
  video.pause();video.currentTime=.8;await new Promise(resolve=>video.onseeked=resolve);
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);return canvas.toDataURL('image/png').split(',')[1];
 });
 fs.writeFileSync(`assets/${hero}.png`,Buffer.from(data,'base64'));console.log(`Saved official ${hero} render frame.`);
}finally{await browser.close();}

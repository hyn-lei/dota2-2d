import fs from 'node:fs';
import { ABILITIES } from '../src/ability-data.js';
fs.mkdirSync('assets/abilities',{recursive:true});
const ids=Object.values(ABILITIES).flat().map(a=>a.id);
let fetched=0;
await Promise.all(ids.map(async id=>{const path=`assets/abilities/${id}.png`;if(fs.existsSync(path)){fetched++;return;}
 const response=await fetch(`https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/abilities/${id}.png`);
 if(!response.ok)throw Error(`${id}: ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.readUInt32BE(0)!==0x89504e47)throw Error('Not a PNG');fs.writeFileSync(path,bytes);fetched++;
}));
console.log(`Saved ${fetched} official ability icons locally.`);

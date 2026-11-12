import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {serializeMatch} from '../src/game-save.js';

const previous=JSON.parse(await readFile(new URL('../tests/fixtures/simulation-with-obstacle-navigation.json',import.meta.url),'utf8'));
const cases=[];
for(const {config,steps,dt} of previous.cases){
 const capture=()=>{const g=new Game(config);g.moveTo(7200,7600);for(let i=0;i<steps;i++)g.step(dt);return createHash('sha256').update(serializeMatch(g,0)).digest('hex');};
 const sha256=capture();assert.equal(capture(),sha256,'independent matches must remain deterministic');
 cases.push({config,steps,dt,sha256});console.log(JSON.stringify({config,sha256}));
}
await writeFile(new URL('../tests/fixtures/simulation-with-lane-progress.json',import.meta.url),JSON.stringify({
 baseRevision:'ed3fe614b7e63ec42efd7ad3a90f2701c749aaf8',
 change:'Bots retain forward lane progress during a push and rejoin once after task changes or respawn. Advancing beyond the opening T3 waypoints intentionally changes movement and combat; the obstacle-navigation baseline is retained as history.',cases
},null,2)+'\n');

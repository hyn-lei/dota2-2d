import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {serializeMatch} from '../src/game-save.js';

const old=JSON.parse(await readFile(new URL('../tests/fixtures/simulation-with-unit-collision.json',import.meta.url),'utf8'));
const cases=[];
for(const {config,steps,dt} of old.cases){
  const capture=()=>{
    const g=new Game(config);g.moveTo(7200,7600);for(let i=0;i<steps;i++)g.step(dt);
    return createHash('sha256').update(serializeMatch(g,0)).digest('hex');
  };
  const sha256=capture();assert.equal(capture(),sha256,'independent matches must remain deterministic');
  cases.push({config,steps,dt,sha256});console.log(JSON.stringify({config,sha256}));
}
await writeFile(new URL('../tests/fixtures/simulation-with-team-tactics.json',import.meta.url),JSON.stringify({
  baseRevision:'b2f14d536d0d353d23f8bd48a6e13877a050129c',
  change:'Both-team strategic assignments, real support teleports and committed safe positions intentionally change AI movement and combat. The prior collision baseline is retained as history.',cases
},null,2)+'\n');

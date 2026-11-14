import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {serializeMatch} from '../src/game-save.js';

const previous=JSON.parse(await readFile(new URL('../tests/fixtures/simulation-with-random-drafts.json',import.meta.url),'utf8'));
const inputs=[...previous.cases,{config:{hero:'chen',difficulty:'hard',seed:66},steps:1800,dt:.05}];
const cases=[];
for(const {config,steps,dt} of inputs){
 const capture=()=>{
  const game=new Game(config);game.moveTo(7200,7600);
  for(let index=0;index<steps;index++)game.step(dt);
  return createHash('sha256').update(serializeMatch(game,0)).digest('hex');
 };
 const sha256=capture();assert.equal(capture(),sha256,'two independent complete simulations must match');
 cases.push({config,steps,dt,sha256});console.log(JSON.stringify({config,sha256,independentRuns:2}));
}
await writeFile(new URL('../tests/fixtures/simulation-with-chen.json',import.meta.url),JSON.stringify({
 baseRevision:'0ca0ec7',baseFixture:'simulation-with-random-drafts.json',
 change:'Chen joins the draft pool with his Zealot and controlled neutrals. Summon orders use one movement controller. The user-requested Growth passive accumulates each Chen level-up, capped at +400 attack speed, +50 armor and +60% magic resistance, with no separate damage cap. A repeated seed brings back heroes absent from recent drafts. These intentional roster, combat and movement changes replace the baseline; historical fixtures remain unchanged.',cases
},null,2)+'\n');

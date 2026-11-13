import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { serializeMatch } from '../src/game-save.js';

const previous=JSON.parse(await readFile(new URL('../tests/fixtures/simulation-with-lane-progress.json',import.meta.url),'utf8'));
const cases=[];
for(const {config,steps,dt} of previous.cases) {
  const capture=()=>{
    const game=new Game(config);game.moveTo(7200,7600);
    for(let index=0; index<steps; index++)game.step(dt);
    return createHash('sha256').update(serializeMatch(game,0)).digest('hex');
  };
  const sha256=capture();assert.equal(capture(),sha256,'independent drafted matches must remain deterministic');
  cases.push({config,steps,dt,sha256});console.log(JSON.stringify({config,sha256}));
}
await writeFile(new URL('../tests/fixtures/simulation-with-random-drafts.json',import.meta.url),JSON.stringify({
  baseRevision:'a50818726e8333eecfd9114c7ee95d958efb2ed4',
  change:'Seeded AI drafts use the full playable hero pool, complementary roles and 2-1-2 opening lanes. Different rosters and lanes intentionally change combat and movement; the lane-progress baseline is retained as history.',cases
},null,2)+'\n');

// Intentional collision changes alter paths and combat. Keep the previous fixture as history.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game} from '../src/engine.js';
import {serializeMatch} from '../src/game-save.js';
const previous=JSON.parse(await readFile(new URL('../tests/fixtures/simulation-before-unit-hud.json',import.meta.url),'utf8'));
const cases=previous.cases.map(({config,steps,dt})=>{
 const game=new Game(config);game.moveTo(7200,7600);for(let i=0;i<steps;i++)game.step(dt);
 return {config,steps,dt,sha256:createHash('sha256').update(serializeMatch(game,0)).digest('hex')};
});
await writeFile(new URL('../tests/fixtures/simulation-with-unit-collision.json',import.meta.url),JSON.stringify({baseRevision:'1209a2abd36ba6aec90d9347327a56c5be4d3d17',change:'Ground unit collisions, local detours and phase movement intentionally replace the previous movement state.',cases},null,2)+'\n');
console.log('Captured three collision-enabled deterministic match states.');

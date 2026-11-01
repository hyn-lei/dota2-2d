import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { fixture, image, previous, oldCompose, oldEnv } from './deployment-fixture.mjs';

test('only the server host and SSH key are required to enable deployment',async t=>{
 const f=await fixture(t),result=await f.run('config',{DEPLOY_SSH_FINGERPRINT:undefined});
 assert.equal(result.status,0,result.stderr);assert.match(await readFile(join(f.dir,'outputs'),'utf8'),/configured=true/);
});

test('missing connection configuration reports waiting without claiming a deployment',async t=>{
 const f=await fixture(t),result=await f.run('config',{DEPLOY_HOST:'',DEPLOY_SSH_KEY:''});
 assert.equal(result.status,0,result.stderr);assert.match(await readFile(join(f.dir,'outputs'),'utf8'),/configured=false/);assert.equal(await f.log(),'');
});

test('partial SSH configuration fails and lists the missing key name',async t=>{
 const f=await fixture(t),result=await f.run('config',{DEPLOY_SSH_KEY:''});
 assert.equal(result.status,2);assert.match(result.stderr,/DEPLOY_SSH_KEY/);assert.doesNotMatch(result.stderr,/private-test-key|registry-test-token/);
});

test('a first deployment creates its directory, Compose and dotenv then pulls through up',async t=>{
 const f=await fixture(t,{existing:false}),result=await f.run('rollout',{DEPLOY_HTTP_PORT:undefined,DEPLOY_BIND_ADDRESS:undefined});
 assert.equal(result.status,0,result.stderr);
 const compose=parse(await readFile(join(f.target,'compose.yaml'),'utf8'));
 assert.equal(compose.services.game.image,'${IMAGE}');assert.equal(compose.services.game.read_only,true);
 assert.match(await f.log(),/up .*--pull always/);assert.match(await readFile(join(f.target,'.env'),'utf8'),/HTTP_PORT=8080/);
 assert.equal(await readFile(join(f.dir,'state'),'utf8'),image);assert.deepEqual(await readdir(f.work),[]);
});

test('updating generates Compose while preserving existing server settings',async t=>{
 const f=await fixture(t),result=await f.run();assert.equal(result.status,0,result.stderr);
 assert.equal(await readFile(join(f.target,'.env'),'utf8'),oldEnv.replace('old:stable',image));
 const compose=parse(await readFile(join(f.target,'compose.yaml'),'utf8'));assert.equal(compose.services.game.image,'${IMAGE}');
 assert.deepEqual(await readdir(f.work),[]);assert.doesNotMatch(result.stdout+result.stderr,/registry-test-token/);
});

test('an existing docker-compose.yml remains the selected Compose filename',async t=>{
 const f=await fixture(t,{legacy:true}),result=await f.run();assert.equal(result.status,0,result.stderr);
 assert.equal(parse(await readFile(join(f.target,f.composeName),'utf8')).services.game.image,'${IMAGE}');
 assert.equal(existsSync(join(f.target,'compose.yaml')),false);
});

test('an existing named project is updated without starting a second project',async t=>{
 const f=await fixture(t,{projectName:'game-prod'}),result=await f.run();assert.equal(result.status,0,result.stderr);
 assert.equal(await readFile(join(f.dir,'state.game-prod'),'utf8'),image);
 assert.deepEqual((await readdir(f.dir)).filter(name=>name.startsWith('state.')),['state.game-prod']);
 assert.equal(parse(await readFile(join(f.target,f.composeName),'utf8')).name,'game-prod');
});

test('deployment cannot overwrite a Compose project containing other services',async t=>{
 const f=await fixture(t),result=await f.run('rollout',{AUTO_SERVICES:'web\nstock-worker'});
 assert.equal(result.status,2);assert.equal(await readFile(join(f.target,f.composeName),'utf8'),oldCompose);
 assert.equal(await readFile(join(f.target,'.env'),'utf8'),oldEnv);assert.doesNotMatch(await f.log(),/ up /);
});

test('a failed pull restores files and leaves the previous running image intact',async t=>{
 const f=await fixture(t),result=await f.run('rollout',{AUTO_FAIL_PULL:'1'});assert.equal(result.status,1);
 assert.equal(await readFile(join(f.target,'.env'),'utf8'),oldEnv);assert.equal(await readFile(join(f.target,f.composeName),'utf8'),oldCompose);
 assert.equal(await readFile(join(f.dir,'state'),'utf8'),'old:stable');assert.deepEqual(await readdir(f.work),[]);
});

for(const [name,overrides] of [['unhealthy container',{AUTO_FAIL_NEW:'1'}],['public revision mismatch',{AUTO_HEADER_SHA:'e'.repeat(40)}],['inspect failure',{AUTO_FAIL_INSPECT:'1'}],['dotenv persist failure',{AUTO_FAIL_PERSIST:'1'}]]){
 test(`${name} restores the old configuration and immutable image`,async t=>{
  const f=await fixture(t),result=await f.run('rollout',overrides);assert.equal(result.status,1);
  assert.equal(await readFile(join(f.target,'.env'),'utf8'),oldEnv);assert.equal(await readFile(join(f.target,f.composeName),'utf8'),oldCompose);
  assert.equal(await readFile(join(f.dir,'state'),'utf8'),previous);assert.deepEqual(await readdir(f.work),[]);
  assert.doesNotMatch(await f.log(),/compose down|image prune/);
 });
}

test('a failed first deployment removes its new service and generated files',async t=>{
 const f=await fixture(t,{existing:false}),result=await f.run('rollout',{AUTO_FAIL_NEW:'1'});assert.equal(result.status,1);
 assert.equal(existsSync(join(f.target,'compose.yaml')),false);assert.equal(existsSync(join(f.target,'.env')),false);
 assert.equal(existsSync(join(f.dir,'state')),false);assert.deepEqual(await readdir(f.work),[]);
});

test('a recovery write failure preserves backups but removes registry credentials',async t=>{
 const f=await fixture(t),result=await f.run('rollout',{AUTO_FAIL_RESTORE:'1',AUTO_HEADER_SHA:'e'.repeat(40)});
 assert.equal(result.status,1);assert.match(result.stderr,/backups retained/);
 const directories=await readdir(f.work);assert.equal(directories.length,1);
 const files=await readdir(join(f.work,directories[0]));assert.ok(files.includes('compose.before'));assert.ok(files.includes('env.before'));assert.equal(files.includes('config.json'),false);
});

test('invalid image input cannot create a directory or call Docker',async t=>{
 const f=await fixture(t,{existing:false}),result=await f.run('rollout',{DEPLOY_IMAGE:'latest; touch injected'});
 assert.equal(result.status,2);assert.equal(existsSync(f.target),false);assert.equal(await f.log(),'');
});

test('first deployment can set a custom host port without manual dotenv upload',async t=>{
 const f=await fixture(t,{existing:false}),result=await f.run('rollout',{DEPLOY_HTTP_PORT:'9185',DEPLOY_BIND_ADDRESS:'127.0.0.1'});
 assert.equal(result.status,0,result.stderr);const env=await readFile(join(f.target,'.env'),'utf8');
 assert.match(env,/HTTP_PORT=9185/);assert.match(env,/BIND_ADDRESS=127\.0\.0\.1/);
});

test('real Docker Compose accepts the generated deployment configuration',async t=>{
 const available=spawnSync('docker',['compose','version'],{encoding:'utf8'});
 if(available.status!==0){if(process.env.CI)assert.fail('CI requires Docker Compose for this check');t.skip('Docker Compose unavailable locally');return;}
 const f=await fixture(t,{projectName:'game-prod'}),result=await f.run();assert.equal(result.status,0,result.stderr);
 const checkEnv={...process.env};for(const key of ['IMAGE','HTTP_PORT','BIND_ADDRESS','COMPOSE_PROJECT_NAME'])delete checkEnv[key];
 const check=spawnSync('docker',['compose','-f',join(f.target,f.composeName),'--env-file',join(f.target,'.env'),'config','--format','json'],{encoding:'utf8',env:checkEnv});
 assert.equal(check.status,0,check.stderr);const model=JSON.parse(check.stdout),game=model.services.game;
 assert.equal(model.name,'game-prod');
 assert.equal(game.image,image);assert.equal(game.ports[0].published,'9184');assert.equal(game.ports[0].target,8080);assert.equal(game.ports[0].host_ip,'127.0.0.1');
 const rollback=await fixture(t,{projectName:'rollback-prod'}),failed=await rollback.run('rollout',{AUTO_FAIL_NEW:'1'});assert.equal(failed.status,1);
 const recovery=spawnSync('docker',['compose','-f',join(rollback.target,rollback.composeName),'-f',rollback.capture,'--env-file',join(rollback.target,'.env'),'config','--format','json'],{encoding:'utf8',env:checkEnv});
 assert.equal(recovery.status,0,recovery.stderr);const restored=JSON.parse(recovery.stdout);
 assert.equal(restored.name,'rollback-prod');assert.equal(restored.services.game.image,previous);
});

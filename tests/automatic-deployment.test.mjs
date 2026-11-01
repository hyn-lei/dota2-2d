import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const bash=process.platform==='win32'?['D:/Git/bin/bash.exe','C:/Program Files/Git/bin/bash.exe'].find(existsSync):'bash';
const posix=path=>process.platform==='win32'?path.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,drive)=>'/'+drive.toLowerCase()):path;
const sha='a'.repeat(40),image='ghcr.io/hyn-lei/dota2-2d@sha256:'+'b'.repeat(64),previous='sha256:'+'c'.repeat(64);
const source=name=>posix(resolve('scripts',name));
async function fixture(t){
 assert.ok(bash,'Bash must be installed to verify deployment behavior');
 const dir=await mkdtemp(join(tmpdir(),'dota-auto-deploy-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const bin=join(dir,'bin'),target=join(dir,"game space ' quote"),runner=join(dir,'runner');
 for(const path of [bin,target,runner])await mkdir(path);
 await writeFile(join(target,'compose.yaml'),'services:\n  game:\n    image: ${IMAGE}\n');
 await writeFile(join(target,'.env'),'# keep these settings\nIMAGE=old:stable\nHTTP_PORT=9184\nBIND_ADDRESS=127.0.0.1\n');
 const env={AUTO_LOG:posix(join(dir,'commands')),AUTO_STATE:posix(join(dir,'state')),AUTO_HEADER_SHA:sha,RUNNER_TEMP:posix(runner),GITHUB_SHA:sha,GITHUB_ACTOR:'hyn-lei',GITHUB_TOKEN:'registry-test-token',DEPLOY_HOST:'server.example.test',DEPLOY_USER:'game',DEPLOY_SSH_KEY:'private-test-key',DEPLOY_KNOWN_HOSTS:'server.example.test ssh-ed25519 public-test-key',DEPLOY_PATH:posix(target),DEPLOY_PUBLIC_URL:'https://dota2.prismabyss.com',DEPLOY_IMAGE:image};
 await writeFile(join(bin,'ssh'),`#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$AUTO_LOG"
case "\${*: -1}" in
  *'mktemp -d'*) printf '/tmp/dota2-ssh.fixture\\n';;
  *'cat >'*) cat >/dev/null;;
  *'bash '*deploy-on-server.sh*) IFS= read -r token; [[ "$token" == registry-test-token ]];;
  *) exit 0;;
esac
`,{mode:0o755});
 await writeFile(join(bin,'docker'),`#!/usr/bin/env bash
printf '%s image=%s\\n' "$*" "\${IMAGE:-}" >> "$AUTO_LOG"
case "$1" in
  login) cat >/dev/null; printf '{}' > "$DOCKER_CONFIG/config.json";;
  inspect) if [[ "$*" == *'.Config.Image'* ]]; then [[ "\${AUTO_FAIL_INSPECT:-}" != 1 ]] || exit 1; cat "$AUTO_STATE"; else printf '%s\\n' '${previous}'; fi;;
  compose)
    case "$2" in
      version|config) exit 0;;
      ps) printf 'container-one\\n';;
      pull) [[ "\${AUTO_FAIL_PULL:-}" != 1 ]];;
      up) if [[ "\${AUTO_FAIL_NEW:-}" == 1 && "\${IMAGE:-}" == *@* ]]; then exit 1; fi; printf '%s' "$IMAGE" > "$AUTO_STATE";;
    esac;;
esac
`,{mode:0o755});
 await writeFile(join(bin,'curl'),`#!/usr/bin/env bash
while (($#)); do if [[ "$1" == --dump-header ]]; then shift; printf 'HTTP/1.1 200 OK\\r\\nX-Game-Revision: %s\\r\\n' "$AUTO_HEADER_SHA" > "$1"; fi; shift; done
printf 'ok\\n'
`,{mode:0o755});
 // Git Bash has no flock. Replace this OS boundary while exercising the deployment script itself.
 await writeFile(join(bin,'flock'),'#!/usr/bin/env bash\nexit 0\n',{mode:0o755});
 await writeFile(join(bin,'mv'),`#!/usr/bin/env bash
if [[ "\${AUTO_FAIL_PERSIST:-}" == 1 && "$(cat "$AUTO_STATE")" == *@* ]]; then exit 1; fi
exec /usr/bin/mv "$@"
`,{mode:0o755});
 const run=(script,args=[],overrides={},input='registry-test-token\n')=>spawnSync(bash,['-c','export PATH="$1:$PATH"; shift; exec bash "$@"','test',posix(bin),source(script),...args],{env:{...process.env,...env,...overrides},input,encoding:'utf8',timeout:15000});
 const log=()=>readFile(join(dir,'commands'),'utf8').catch(()=>'');
 return {dir,target,runner,env,run,log};
}

test('empty deployment configuration explicitly waits without connecting to a server',async t=>{
 const f=await fixture(t),result=f.run('deploy-from-actions.sh',['--check-config'],{DEPLOY_HOST:'',DEPLOY_USER:'',DEPLOY_SSH_KEY:'',DEPLOY_KNOWN_HOSTS:''});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/configured=false/);assert.equal(await f.log(),'');
});

test('partial deployment configuration fails with missing names and no secret values',async t=>{
 const f=await fixture(t),result=f.run('deploy-from-actions.sh',['--check-config'],{DEPLOY_SSH_KEY:''});
 assert.equal(result.status,2);assert.match(result.stderr,/DEPLOY_SSH_KEY/);assert.doesNotMatch(result.stdout+result.stderr,/private-test-key|registry-test-token/);
});

test('SSH deployment pins host keys, safely quotes the directory and cleans temporary keys',async t=>{
 const f=await fixture(t),result=f.run('deploy-from-actions.sh');
 assert.equal(result.status,0,result.stderr);const log=await f.log();
 assert.match(log,/StrictHostKeyChecking=yes/);assert.match(log,/BatchMode=yes/);assert.match(log,/game@server\.example\.test/);assert.ok(log.includes(Buffer.from(posix(f.target)).toString('base64')));
 assert.doesNotMatch(log+result.stdout+result.stderr,/private-test-key|registry-test-token/);assert.deepEqual(await readdir(f.runner),[]);
});

test('invalid SSH hosts fail before transport or filesystem mutation',async t=>{
 const f=await fixture(t),result=f.run('deploy-from-actions.sh',[],{DEPLOY_HOST:'server; touch injected'});
 assert.equal(result.status,2);assert.equal(await f.log(),'');assert.deepEqual(await readdir(f.runner),[]);
});

test('failed image pulls leave the existing service and dotenv untouched',async t=>{
 const f=await fixture(t),before=await readFile(join(f.target,'.env'),'utf8');
 const result=f.run('deploy-on-server.sh',[image,sha,posix(f.target),'hyn-lei','https://dota2.prismabyss.com'],{AUTO_FAIL_PULL:'1'});
 assert.equal(result.status,1);assert.doesNotMatch(await f.log(),/compose up/);assert.equal(await readFile(join(f.target,'.env'),'utf8'),before);
});

test('successful deployment verifies the running digest and public revision, preserving server ports',async t=>{
 const f=await fixture(t),result=f.run('deploy-on-server.sh',[image,sha,posix(f.target),'hyn-lei','https://dota2.prismabyss.com']);
 assert.equal(result.status,0,result.stderr);assert.equal(await readFile(join(f.target,'.env'),'utf8'),`# keep these settings\nIMAGE=${image}\nHTTP_PORT=9184\nBIND_ADDRESS=127.0.0.1\n`);
 assert.match(await f.log(),/compose up .*--no-deps.*game/);assert.doesNotMatch(result.stdout+result.stderr,/registry-test-token/);
});

test('a public revision mismatch restores the previous immutable image and reports failure',async t=>{
 const f=await fixture(t),result=f.run('deploy-on-server.sh',[image,sha,posix(f.target),'hyn-lei','https://dota2.prismabyss.com'],{AUTO_HEADER_SHA:'d'.repeat(40)});
 assert.equal(result.status,1);assert.match(await f.log(),new RegExp('compose up .*--pull never.*image='+previous));
 assert.match(await readFile(join(f.target,'.env'),'utf8'),new RegExp('IMAGE='+previous));assert.match(result.stderr,/rollback|restored/i);
});

test('an unhealthy new container rolls back without removing other services',async t=>{
 const f=await fixture(t),result=f.run('deploy-on-server.sh',[image,sha,posix(f.target),'hyn-lei','https://dota2.prismabyss.com'],{AUTO_FAIL_NEW:'1'});
 assert.equal(result.status,1);const log=await f.log();assert.match(log,new RegExp('image='+previous));assert.doesNotMatch(log,/compose down|prune/);
});

test('failure inspecting a recreated container still restores the previous service',async t=>{
 const f=await fixture(t),result=f.run('deploy-on-server.sh',[image,sha,posix(f.target),'hyn-lei','https://dota2.prismabyss.com'],{AUTO_FAIL_INSPECT:'1'});
 assert.equal(result.status,1);assert.match(await f.log(),new RegExp('compose up .*--pull never.*image='+previous));
});

test('an atomic dotenv write failure cannot report a successful deployment',async t=>{
 const f=await fixture(t),result=f.run('deploy-on-server.sh',[image,sha,posix(f.target),'hyn-lei','https://dota2.prismabyss.com'],{AUTO_FAIL_PERSIST:'1'});
 assert.equal(result.status,1);assert.match(await readFile(join(f.target,'.env'),'utf8'),new RegExp('IMAGE='+previous));
});

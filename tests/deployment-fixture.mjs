import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

export const workflow=parse(readFileSync('.github/workflows/docker.yml','utf8'));
const bash=process.platform==='win32'?['D:/Git/bin/bash.exe','C:/Program Files/Git/bin/bash.exe'].find(existsSync):'bash';
const posix=path=>process.platform==='win32'?path.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,drive)=>'/'+drive.toLowerCase()):path;
export const sha='a'.repeat(40),image='ghcr.io/hyn-lei/dota2-2d@sha256:'+'b'.repeat(64),previous='sha256:'+'c'.repeat(64);
const newId='sha256:'+'d'.repeat(64);
export const oldCompose='services:\n  game:\n    image: old:stable\n';
export const oldEnv='# keep server settings\nIMAGE=old:stable\nHTTP_PORT=9184\nBIND_ADDRESS=127.0.0.1\nCUSTOM_VALUE=keep-me\n';

export async function fixture(t,{existing=true,legacy=false,projectName}={}){
 assert.ok(bash,'Bash must be installed');
 const temporaryRoot=resolve(tmpdir()),dir=await mkdtemp(join(temporaryRoot,'dota-inline-deploy-'));
 t.after(()=>{const target=resolve(dir);assert.equal(dirname(target),temporaryRoot);assert.ok(basename(target).startsWith('dota-inline-deploy-'));return rm(target,{recursive:true,force:true});});
 const bin=join(dir,'bin'),target=join(dir,"game space ' quote"),work=join(dir,'work');
 for(const path of [bin,work])await mkdir(path);
 const composeName=legacy?'docker-compose.yml':'compose.yaml';
 const project=projectName||basename(target).toLowerCase().replace(/[^a-z0-9_-]/g,'').replace(/^[^a-z0-9]+/,'');
 const originalCompose=projectName?`name: ${JSON.stringify(projectName)}\n${oldCompose}`:oldCompose;
 if(existing){
  await mkdir(target);await writeFile(join(target,composeName),originalCompose);await writeFile(join(target,'.env'),oldEnv);
  await writeFile(join(dir,'state'),'old:stable');await writeFile(join(dir,'state.'+project),'old:stable');await writeFile(join(dir,'id.'+project),previous);
 }
 const resolver=join(dir,'resolve-compose.mjs'),capture=join(dir,'rollback-used.yaml');
 const env={AUTO_LOG:posix(join(dir,'commands')),AUTO_STATE:posix(join(dir,'state')),AUTO_IDS:posix(join(dir,'id')),AUTO_MARKER:posix(join(dir,'tag-changed')),AUTO_RESOLVER:posix(resolver),AUTO_CAPTURE:posix(capture),AUTO_HEADER_SHA:sha,AUTO_RETAG_OLD:'1',TMPDIR:posix(work),GITHUB_OUTPUT:posix(join(dir,'outputs')),GITHUB_STEP_SUMMARY:posix(join(dir,'summary')),COMPOSE_PROJECT_NAME:undefined,DEPLOY_IMAGE:image,DEPLOY_SHA:sha,DEPLOY_PATH:posix(target),DEPLOY_PUBLIC_URL:'https://dota2.prismabyss.com',GH_TOKEN:'registry-test-token',GH_ACTOR:'hyn-lei',DEPLOY_HOST:'server.example.test',DEPLOY_SSH_KEY:'private-test-key',DEPLOY_SSH_PORT:'22',DEPLOY_SSH_FINGERPRINT:'',DEPLOY_HTTP_PORT:'',DEPLOY_BIND_ADDRESS:''};
 // Resolve the actual files passed to Docker. A literal image cannot be overridden by shell IMAGE.
 await writeFile(resolver,String.raw`import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {parse} from ${JSON.stringify(import.meta.resolve('yaml'))};
const dotenv={};
try {for(const line of readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)dotenv[m[1]]=m[2];}}catch{}
const value=key=>process.env[key]??dotenv[key];
const expand=input=>String(input??'').replace(/\$\{([A-Z_]+)(?::-([^}]*))?\}/g,(_,key,fallback)=>value(key)||fallback||'');
let name='',image='';
for(let file of process.argv.slice(2)){if(process.platform==='win32')file=file.replace(/^\/([a-z])\//i,(_,drive)=>drive.toUpperCase()+':/');const doc=parse(readFileSync(file,'utf8'));if(doc.name!==undefined)name=expand(doc.name);if(doc.services?.game?.image!==undefined)image=expand(doc.services.game.image);}
name=value('COMPOSE_PROJECT_NAME')||name||basename(process.cwd()).toLowerCase().replace(/[^a-z0-9_-]/g,'').replace(/^[^a-z0-9]+/,'')||'dota2-2d';
process.stdout.write(name+' '+image);
`);
 await writeFile(join(bin,'docker'),`#!/usr/bin/env bash
original="$*"
case "$1" in
 login) printf '%s\\n' "$original" >> "$AUTO_LOG"; cat >/dev/null; printf '{}' > "$DOCKER_CONFIG/config.json";;
 exec)
  printf '%s\\n' "$original" >> "$AUTO_LOG"
  [[ "$*" == *'node scripts/check-public-coop.mjs '* ]] || exit 2
  if [[ "\${AUTO_FAIL_PUBLIC_WS:-}" == 1 ]]; then printf 'Public WebSocket handshake failed: Unexpected server response: 404\\n' >&2; exit 1; fi;;
 inspect)
  cid="\${*: -1}"; project="\${cid%-container}"
  printf '%s\\n' "$original" >> "$AUTO_LOG"
  if [[ "$*" == *'.Config.Image'* ]]; then [[ "\${AUTO_FAIL_INSPECT:-}" != 1 ]] || exit 1; cat "$AUTO_STATE.$project"; else cat "$AUTO_IDS.$project"; fi;;
 compose)
  shift; files=()
  while [[ "\${1:-}" == -f ]]; do files+=("$2");shift 2; done
  if [[ "$1" == version ]]; then exit 0; fi
  resolved=$(node "$AUTO_RESOLVER" "\${files[@]}") || exit 1
  read -r project selected <<< "$resolved"
  printf '%s image=%s project=%s\\n' "$original" "$selected" "$project" >> "$AUTO_LOG"
  case "$1" in
   config)
    if [[ "\${2:-}" == --services ]]; then printf '%s\\n' "\${AUTO_SERVICES:-game}";
    elif [[ "\${2:-}" != --quiet ]]; then printf 'name: "%s"\\nservices:\\n  game:\\n    image: %s\\n' "$project" "$selected"; fi;;
   ps) if [[ -f "$AUTO_STATE.$project" ]]; then printf '%s-container\\n' "$project"; fi;;
   up)
    [[ "\${AUTO_FAIL_PULL:-}" != 1 || "$selected" != *@* ]] || exit 1
    actual='${previous}'
    if [[ "$selected" == '${image}' ]]; then actual='${newId}'; touch "$AUTO_MARKER";
    elif [[ "$selected" == old:stable && -f "$AUTO_MARKER" && "$AUTO_RETAG_OLD" == 1 ]]; then actual='${newId}'; fi
    printf '%s' "$selected" > "$AUTO_STATE.$project";printf '%s' "$selected" > "$AUTO_STATE";printf '%s' "$actual" > "$AUTO_IDS.$project"
    if ((\${#files[@]} > 1)); then cp "\${files[-1]}" "$AUTO_CAPTURE"; fi
    [[ "\${AUTO_FAIL_NEW:-}" != 1 || "$selected" != *@* ]] || exit 1;;
   rm) rm -f "$AUTO_STATE.$project" "$AUTO_IDS.$project" "$AUTO_STATE";;
  esac;;
esac
`,{mode:0o755});
 await writeFile(join(bin,'curl'),`#!/usr/bin/env bash
while (($#)); do if [[ "$1" == --dump-header ]]; then shift; printf 'HTTP/1.1 200 OK\\r\\nX-Game-Revision: %s\\r\\n' "$AUTO_HEADER_SHA" > "$1"; fi; shift; done
printf 'ok\\n'
`,{mode:0o755});
 await writeFile(join(bin,'flock'),'#!/usr/bin/env bash\nexit 0\n',{mode:0o755});
 await writeFile(join(bin,'mv'),`#!/usr/bin/env bash
if [[ "\${AUTO_FAIL_PERSIST:-}" == 1 && "$*" == *'.env.deploy.'* && "$(cat "$AUTO_STATE")" == '${image}' ]]; then exit 1; fi
exec /usr/bin/mv "$@"
`,{mode:0o755});
 await writeFile(join(bin,'cp'),`#!/usr/bin/env bash
source="$1"; [[ "$source" != -p ]] || source="$3"
if [[ "\${AUTO_FAIL_RESTORE:-}" == 1 && "$source" == */compose.before ]]; then exit 1; fi
exec /usr/bin/cp "$@"
`,{mode:0o755});
 const run=async(kind='rollout',overrides={})=>{
  const script=kind==='config'?workflow.jobs['deployment-config'].steps.find(s=>s.id==='config').run:workflow.jobs.deploy.steps.find(s=>s.id==='rollout')?.with?.script;
  assert.equal(typeof script,'string','The workflow must contain its actual inline SSH deployment script');
  const path=join(dir,kind+'.sh');await writeFile(path,script+'\n');
  return spawnSync(bash,['-c','export PATH="$1:$PATH"; shift; exec bash "$@"','test',posix(bin),posix(path)],{cwd:dir,env:{...process.env,...env,...overrides},encoding:'utf8',timeout:30000});
 };
 const log=()=>readFile(join(dir,'commands'),'utf8').catch(()=>'');
 return {dir,target,work,composeName,project,originalCompose,capture,env,run,log};
}

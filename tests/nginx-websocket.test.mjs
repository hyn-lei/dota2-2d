import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const python=process.platform==='win32'?'python':'python3';
const script=resolve('scripts/patch-nginx-websocket.py');
const invoke=text=>{
 const code='import importlib.util,json,sys; sys.dont_write_bytecode=True; s=importlib.util.spec_from_file_location("patch",sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps(m.patch_config(json.load(sys.stdin))))';
 const result=spawnSync(python,['-c',code,script],{input:JSON.stringify(text),encoding:'utf8'});
 return result.status===0?{text:JSON.parse(result.stdout)}:{error:result.stderr};
};
const game='server {\n    server_name dota2.prismabyss.com;\n    listen 443 ssl;\n    location / {\n        proxy_pass http://localhost:8080;\n        proxy_set_header Host $host;\n    }\n}\n';
const other='server {\n    server_name other.example.test;\n    location / { proxy_pass http://localhost:9100; }\n}\n';
const redirect='server {\n    server_name dota2.prismabyss.com;\n    listen 80;\n    return 301 https://$host$request_uri;\n}\n';

test('only the game proxy receives a WebSocket upgrade location',()=>{
 const result=invoke(other+game+redirect);assert.equal(result.error,undefined,result.error);
 assert.ok(result.text.startsWith(other));assert.ok(result.text.endsWith(redirect));
 assert.match(result.text,/location = \/ws\/coop/);assert.match(result.text,/proxy_http_version 1\.1/);
 assert.match(result.text,/proxy_set_header Upgrade \$http_upgrade/);assert.match(result.text,/proxy_set_header Connection "upgrade"/);
});

test('proxy repair is idempotent',()=>{
 const once=invoke(game).text;assert.equal(invoke(once).text,once);
});

test('quoted braces and commented braces do not change server selection',()=>{
 const result=invoke(other+game.replace('listen 443 ssl;','listen 443 ssl;\n    # } { ignored\n    add_header X-Example "{ quoted }";'));
 assert.equal(result.error,undefined,result.error);assert.ok(result.text.startsWith(other));
});

test('an existing cooperative location is upgraded without duplicating it',()=>{
 const source=game.replace('    location / {','    location /ws/coop { proxy_pass http://localhost:8080; }\n    location / {');
 const result=invoke(source);assert.equal(result.error,undefined,result.error);
 assert.equal((result.text.match(/location = \/ws\/coop/g)||[]).length,1);assert.match(result.text,/proxy_http_version 1\.1/);
});

test('missing or ambiguous game proxy blocks are rejected',()=>{
 assert.match(invoke(other).error,/exactly one/);assert.match(invoke(game+game).error,/exactly one/);
});

const transaction=(text,fail)=>{
 const code=`import importlib.util,json,sys,tempfile,subprocess
from pathlib import Path
sys.dont_write_bytecode=True
s=importlib.util.spec_from_file_location("patch",sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
source,fail=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as directory:
    path=Path(directory)/"all.conf"; path.write_bytes(source.encode()); calls=[]
    def run(args,check):
        calls.append(args[1:])
        if len(calls)==1:
            assert 'proxy_set_header Upgrade $http_upgrade;' in path.read_text()
        if len(calls)==fail:
            raise subprocess.CalledProcessError(1,args)
    m.subprocess.run=run
    error=None
    try: result=m.apply_patch(str(path),'dota2.prismabyss.com','http://localhost:8080','nginx')
    except subprocess.CalledProcessError: result=None; error='nginx failed'
    backups=list(Path(directory).glob('*.bak'))
    print(json.dumps({'result':result,'error':error,'text':path.read_bytes().decode(),'backups':[b.read_bytes().decode() for b in backups],'calls':calls}))`;
 const result=spawnSync(python,['-c',code,script],{input:JSON.stringify([text,fail]),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
};

for(const [name,fail] of [['configuration validation',1],['reload',2]]){
 test(`failed Nginx ${name} restores the original bytes before recovery`,()=>{
  const source=(other+game+redirect).replaceAll('\n','\r\n'),result=transaction(source,fail);
  assert.equal(result.error,'nginx failed');assert.equal(result.text,source);assert.deepEqual(result.backups,[source]);
  assert.deepEqual(result.calls.slice(-2),[['-t'],['-s','reload']]);
 });
}

test('successful Nginx repair keeps a backup and validates before reloading',()=>{
 const result=transaction(other+game+redirect,0);
 assert.equal(result.result.changed,true);assert.deepEqual(result.backups,[other+game+redirect]);
 assert.deepEqual(result.calls,[['-t'],['-s','reload']]);assert.ok(result.text.startsWith(other));
 const again=transaction(result.text,0);assert.equal(again.result.changed,false);assert.deepEqual(again.calls,[]);
});

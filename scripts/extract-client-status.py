"""Retain the installed Valve status CSS references without modifying Steam files."""
import argparse, hashlib, json, pathlib, re, struct, subprocess, tempfile
parser=argparse.ArgumentParser()
parser.add_argument('--vpk',required=True,type=pathlib.Path)
parser.add_argument('--decoder',required=True,type=pathlib.Path)
parser.add_argument('--retrieved',required=True)
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parent.parent
wanted={'panorama/styles/hud/hud_reborn.vcss_c','panorama/styles/hud/dota_hud_buff.vcss_c'}
with args.vpk.open('rb') as stream:
    signature,version,size=struct.unpack('<III',stream.read(12))
    if signature!=0x55aa1234 or version not in (1,2): raise ValueError('Unsupported VPK')
    start=28 if version==2 else 12
    stream.seek(start); tree=stream.read(size)
position=0
def token():
    global position
    end=tree.index(0,position); value=tree[position:end].decode();position=end+1;return value
entries={}
while extension:=token():
    while directory:=token():
        while name:=token():
            crc,preload,archive,offset,length,term=struct.unpack_from('<IHHIIH',tree,position);position+=18
            prefix=tree[position:position+preload];position+=preload
            path=(directory+'/' if directory!=' ' else '')+name+'.'+extension
            if path in wanted: entries[path]=(archive,offset,length,prefix)
if set(entries)!=wanted: raise ValueError('Missing status resources')
output=root/'docs/research/hud/status';output.mkdir(parents=True,exist_ok=True)
records=[]
with tempfile.TemporaryDirectory(prefix='game4-status-') as temporary:
    temporary=pathlib.Path(temporary)
    for path,(archive,offset,length,prefix) in entries.items():
        source=args.vpk if archive==0x7fff else args.vpk.with_name(f'pak01_{archive:03}.vpk')
        with source.open('rb') as stream: stream.seek(offset+(start+size if archive==0x7fff else 0)); data=prefix+stream.read(length)
        raw=temporary/'raw'/path;raw.parent.mkdir(parents=True,exist_ok=True);raw.write_bytes(data)
        records.append({'resource':path,'rawSha256':hashlib.sha256(data).hexdigest()})
    decoded=temporary/'decoded'
    subprocess.run([str(args.decoder.resolve()),'-i',str(temporary/'raw'),'--recursive','-d','-o',str(decoded)],check=True)
    for record in records:
        path=pathlib.Path(record['resource']);css=(decoded/path.parent/path.name.replace('.vcss_c','.css')).read_bytes()
        record['decodedSha256']=hashlib.sha256(css).hexdigest()
        text=css.decode('utf8')
        if path.name=='hud_reborn.vcss_c':
            text='\n\n'.join(match.group(0).strip() for match in re.finditer(r'([^{}]+)\{[^{}]*\}',text) if '#buffs' in match.group(1) or '#debuffs' in match.group(1))+'\n'
        else: text=text.replace('\r\n','\n')
        target=output/path.name.replace('.vcss_c','.css');target.write_text(text,encoding='utf8',newline='\n')
        record['file']=target.relative_to(root).as_posix();record['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
manifest=args.vpk.parents[4]/'appmanifest_570.acf'
build=re.search(r'"buildid"\s+"(\d+)"',manifest.read_text(encoding='utf8')).group(1)
(output/'sources.json').write_text(json.dumps({'retrieved':args.retrieved,'steamApp':570,'steamBuild':build,'archive':'game/dota/pak01_dir.vpk','decoder':'Source 2 Viewer 20.1.0','scope':'Status size, placement, duration ring and centered stacks; hud_reborn retains only buff/debuff rules','resources':records},indent=2)+'\n',encoding='utf8')
print('Retained status references from build '+build)

"""Read the original unit skill localization/icons from an installed Dota VPK.

Raw selected tokens and hashes go to docs/research/units; the separate JS
generator builds runtime metadata. Requires Source 2 Viewer CLI 20.1+.
"""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import struct
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--vpk', required=True, type=pathlib.Path)
parser.add_argument('--decoder', required=True, type=pathlib.Path)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
ids = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {NEUTRAL_ABILITIES,NEUTRAL_UNITS,BUILDING_STATS,LANE_CREEPS,ROSHAN} from './src/unit-data.js'; console.log(JSON.stringify([...new Set([...Object.keys(NEUTRAL_ABILITIES),...Object.values(NEUTRAL_UNITS).flatMap(u=>u.abilities),...Object.values(BUILDING_STATS).flatMap(u=>u.abilities),...Object.values(LANE_CREEPS).flatMap(u=>u.abilities),...ROSHAN.abilities])]))"], cwd=root))
ids += ['courier_return_to_base', 'courier_transfer_items', 'courier_go_to_secretshop',
        'courier_burst', 'courier_shield', 'juggernaut_healing_ward']
paths = {f'panorama/images/spellicons/{name}_png.vtex_c': name for name in ids}
localizations = ['resource/localization/abilities_schinese.txt', 'resource/localization/abilities_english.txt']
with args.vpk.open('rb') as stream:
    signature, version, tree_size = struct.unpack('<III', stream.read(12))
    if signature != 0x55aa1234 or version not in (1, 2):
        raise ValueError('Unsupported VPK')
    header_size = 28 if version == 2 else 12
    stream.seek(header_size)
    tree = stream.read(tree_size)
position = 0
def token():
    global position
    end = tree.index(0, position)
    result = tree[position:end].decode('utf8')
    position = end + 1
    return result
entries = {}
while extension := token():
    while directory := token():
        while name := token():
            crc, preload_size, archive, offset, size, terminator = struct.unpack_from('<IHHIIH', tree, position)
            position += 18
            preload = tree[position:position + preload_size]
            position += preload_size
            path = (directory + '/' if directory != ' ' else '') + name + '.' + extension
            if path in paths or path in localizations:
                entries[path] = (archive, offset, size, preload)
def read(path):
    archive, offset, size, preload = entries[path]
    source = args.vpk if archive == 0x7fff else args.vpk.with_name(f'pak01_{archive:03}.vpk')
    with source.open('rb') as stream:
        stream.seek(offset + (header_size + tree_size if archive == 0x7fff else 0))
        return preload + stream.read(size)
snapshot = {'source': 'Valve installed Dota 2 client, Steam build 26139613',
            'referencePatch': '7.41f', 'retrieved': '2026-11-08', 'localization': {}, 'textures': {}, 'missingIcons': []}
for path in localizations:
    raw = read(path)
    tokens = dict(re.findall(r'"([^"\n]+)"\s+"((?:\\.|[^"\\])*)"', raw.decode('utf-8-sig')))
    prefixes = tuple(('DOTA_Tooltip_ability_' + name).lower() for name in ids)
    snapshot['localization'][path] = {'sha256': hashlib.sha256(raw).hexdigest(),
        'tokens': {key: value for key, value in tokens.items() if key.lower().startswith(prefixes)}}
with tempfile.TemporaryDirectory(prefix='game4-unit-skills-') as temporary:
    temporary = pathlib.Path(temporary)
    for path, name in paths.items():
        if path not in entries:
            snapshot['missingIcons'].append(name)
            continue
        raw = read(path)
        target = temporary / 'raw' / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        snapshot['textures'][name] = {'path': path, 'sha256': hashlib.sha256(raw).hexdigest()}
    decoded = temporary / 'decoded'
    subprocess.run([str(args.decoder.resolve()), '-i', str(temporary / 'raw'), '--recursive', '-d', '-o', str(decoded)], check=True)
    for name, source in snapshot['textures'].items():
        path = pathlib.Path(source['path'])
        png = decoded / path.parent / path.name.replace('.vtex_c', '.png')
        target = root / 'assets' / 'abilities' / (name + '.png')
        shutil.copyfile(png, target)
        source['pngSha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
out = root / 'docs/research/units/client-ability-tokens.json'
out.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'Extracted {len(snapshot["textures"])} icons, missing: {snapshot["missingIcons"]}')

"""Extract Dota's current compiled entity layers and neutral spawn hulls.

Reads the installed map VPK without modifying Steam files. The entity dump is
kept in ignored artifacts; selected gameplay fields and original resources are
saved separately from the runtime map generator. No navigation mesh is inferred.
"""
import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import re
import struct
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--vpk', required=True, type=pathlib.Path)
parser.add_argument('--decoder', required=True, type=pathlib.Path)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
output = root / 'docs/research/maps/7.42'
decoded = root / 'artifacts/map-742-decoded'
raw = output / 'raw'
output.mkdir(parents=True, exist_ok=True)
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
            name = (directory + '/' if directory != ' ' else '') + name + '.' + extension
            if name.startswith('maps/dota/entities/') and (extension == 'vents_c' or name.rsplit('/', 1)[1].startswith('neutralcamp')):
                entries[name] = (archive, offset, size, preload)

def read(name):
    archive, offset, size, preload = entries[name]
    if archive != 0x7fff:
        raise ValueError('This extractor expects the self-contained map VPK')
    with args.vpk.open('rb') as stream:
        stream.seek(header_size + tree_size + offset)
        return preload + stream.read(size)

resources = []
for name in entries:
    data = read(name)
    target = raw / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    resources.append({'file': str(target.relative_to(root)).replace('\\', '/'), 'vpkPath': name, 'sha256': hashlib.sha256(data).hexdigest()})
subprocess.run([str(args.decoder.resolve()), '-i', str(args.vpk.resolve()), '--vpk_filepath', 'maps/dota/entities/', '--vpk_extensions', 'vents_c', '-d', '-o', str(decoded)], check=True, stdout=subprocess.DEVNULL)
entities = []
fields = {'classname', 'origin', 'angles', 'scales', 'targetname', 'hammeruniqueid', 'model', 'volumename', 'neutraltype', 'minspawntype', 'maxspawntype', 'maxupgradecount', 'pulltype', 'teamnumber', 'mapunitname', 'npcfirstwaypoint', 'target', 'spawnflags', 'boss_type'}
classes = {'ent_dota_tree', 'npc_dota_tower', 'npc_dota_barracks', 'npc_dota_fort', 'npc_dota_building', 'ent_dota_fountain', 'npc_dota_neutral_spawner', 'trigger_multiple', 'path_corner', 'npc_dota_watch_tower', 'npc_dota_xp_fountain', 'npc_dota_unit_twin_gate', 'npc_dota_lotus_pool', 'npc_dota_roshan_spawner', 'npc_dota_miniboss_spawner', 'npc_dota_lantern', 'ent_dota_shop', 'dota_item_rune_spawner_powerup', 'dota_item_rune_spawner_bounty', 'info_player_start_dota', 'info_target'}
for path in sorted((decoded / 'maps/dota/entities').glob('*.vents')):
    for text in re.split(r'^====\d+====\s*$', path.read_text(encoding='utf8'), flags=re.M):
        entity = {}
        for line in text.splitlines():
            match = re.match(r'^(\w+)\s+(.+)$', line)
            if not match or match[1] not in fields:
                continue
            key, value = match.groups()
            try:
                entity[key] = json.loads(value)
            except json.JSONDecodeError:
                entity[key] = value.replace('resource_name:', '').strip('"')
        if entity.get('classname') in classes or entity.get('classname', '').startswith('npc_dota_spawner_'):
            entity['sourceLayer'] = path.stem
            entities.append(entity)
assert len([e for e in entities if e['classname'] == 'npc_dota_neutral_spawner']) == 28

def hull(record):
    if not record['vpkPath'].endswith('.vmdl_c'):
        return None
    text = subprocess.check_output([str(args.decoder.resolve()), '-i', str(root / record['file']), '-b', 'PHYS']).decode('utf8')
    minima = [json.loads(m) for m in re.findall(r'm_vMinBounds\s*=\s*(\[[^\]]+\])', text)]
    maxima = [json.loads(m) for m in re.findall(r'm_vMaxBounds\s*=\s*(\[[^\]]+\])', text)]
    if not minima or len(minima) != len(maxima):
        raise ValueError('Missing hull bounds: ' + record['vpkPath'])
    return record['vpkPath'].removesuffix('_c'), {'min': [min(p[i] for p in minima) for i in range(3)], 'max': [max(p[i] for p in maxima) for i in range(3)]}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    hulls = dict(record for record in executor.map(hull, resources) if record)
(output / 'entities.json').write_text(json.dumps(entities, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
(output / 'spawn-hulls.json').write_text(json.dumps(hulls, indent=2) + '\n', encoding='utf8')
(output / 'sources.json').write_text(json.dumps({'patch': '7.42', 'retrieved': '2026-11-21', 'steamBuild': 26825343, 'clientVersion': 6989, 'sourceRevision': 11264029, 'vpk': 'game/dota/maps/dota.vpk', 'vpkSha256': hashlib.sha256(args.vpk.read_bytes()).hexdigest(), 'decoder': 'Source 2 Viewer CLI 20.1', 'scope': 'Gameplay entity layers, trees, lane routes and all 28 neutral spawn hulls; no inferred navigation or texture changes', 'resources': resources}, indent=2) + '\n', encoding='utf8')
print(f'Extracted {len(entities)} gameplay entities and {len(hulls)} original spawn hulls.')

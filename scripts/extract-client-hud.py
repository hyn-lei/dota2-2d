"""Extract the small, explicitly named HUD resource set from an installed Dota VPK.

Requires Source 2 Viewer CLI 20.1+ for texture decoding. Never modifies Steam files.
See docs/hud-status-sources.md for the recorded source build and resulting hashes.
"""
import argparse
import pathlib
import shutil
import struct
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--vpk', required=True, type=pathlib.Path)
parser.add_argument('--decoder', required=True, type=pathlib.Path)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
heroes = {name: ('windrunner' if name == 'windranger' else name) for name in
          ['juggernaut', 'crystal_maiden', 'windranger', 'axe', 'ogre_magi', 'kunkka', 'drow_ranger']}
textures = {'talent-tree': 'statbranch_button_bg_all_off_psd',
            'talent-frame': 'statbranch_button_bg_psd', 'talent-level': 'statbranch_levelbg_psd'}
wanted = {f'panorama/images/heroes/selection/npc_dota_hero_{source}_png.vtex_c':
          f'portraits/{hero}.png' for hero, source in heroes.items()}
wanted.update({f'panorama/images/hud/reborn/{source}.vtex_c': f'{name}.png'
               for name, source in textures.items()})

with args.vpk.open('rb') as stream:
    signature, version, tree_size = struct.unpack('<III', stream.read(12))
    if signature != 0x55aa1234 or version not in (1, 2):
        raise ValueError('Unsupported VPK header')
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
            if path in wanted:
                entries[path] = (archive, offset, size, preload)
missing = set(wanted) - set(entries)
if missing:
    raise ValueError(f'Missing client textures: {sorted(missing)}')
with tempfile.TemporaryDirectory(prefix='game4-hud-') as temporary:
    temporary = pathlib.Path(temporary)
    for path, (archive, offset, size, preload) in entries.items():
        source = args.vpk if archive == 0x7fff else args.vpk.with_name(f'pak01_{archive:03}.vpk')
        with source.open('rb') as stream:
            stream.seek(offset + (header_size + tree_size if archive == 0x7fff else 0))
            data = preload + stream.read(size)
        raw = temporary / 'raw' / path
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_bytes(data)
    decoded = temporary / 'decoded'
    subprocess.run([str(args.decoder.resolve()), '-i', str(temporary / 'raw'), '--recursive',
                    '-d', '-o', str(decoded)], check=True)
    for path, output in wanted.items():
        raw = pathlib.Path(path)
        png = decoded / raw.parent / (raw.name.replace('.vtex_c', '.png'))
        target = root / 'assets' / 'hud' / output
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(png, target)
        print(target.relative_to(root))

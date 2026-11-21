"""Read only scripts/shops.txt from an installed Dota VPK; no texture decoder.

The installed Steam files are never modified. The HUD texture provenance stays
unchanged; only shopSnapshot in client-sources.json is refreshed.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import re
import struct
import zlib

parser = argparse.ArgumentParser()
parser.add_argument('--vpk', required=True, type=pathlib.Path)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
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


entry = None
while extension := token():
    while directory := token():
        while name := token():
            crc, preload_size, archive, offset, size, terminator = struct.unpack_from('<IHHIIH', tree, position)
            position += 18
            preload = tree[position:position + preload_size]
            position += preload_size
            if directory == 'scripts' and name == 'shops' and extension == 'txt':
                entry = crc, archive, offset, size, preload
if entry is None:
    raise ValueError('Missing scripts/shops.txt')
crc, archive, offset, size, preload = entry
source = args.vpk if archive == 0x7fff else args.vpk.with_name(f'pak01_{archive:03}.vpk')
with source.open('rb') as stream:
    stream.seek(offset + (header_size + tree_size if archive == 0x7fff else 0))
    data = preload + stream.read(size)
if len(data) != len(preload) + size or zlib.crc32(data) != crc:
    raise ValueError('Shop payload CRC or length mismatch')
target = root / 'docs/research/hud/shops-client.txt'
target.write_bytes(data)
manifest = args.vpk.parents[4] / 'appmanifest_570.acf'
match = re.search(r'"buildid"\s+"(\d+)"', manifest.read_text(encoding='utf8'))
metadata_file = root / 'docs/research/hud/client-sources.json'
metadata = json.loads(metadata_file.read_text(encoding='utf8'))
digest = hashlib.sha256(data).hexdigest()
metadata['shopSnapshot'] = {
    'retrieved': str(datetime.date.today()),
    'steamApp': 570,
    'steamBuild': match.group(1) if match else None,
    'archive': 'game/dota/pak01_dir.vpk',
    'resource': 'scripts/shops.txt',
    'file': str(target.relative_to(root)).replace('\\', '/'),
    'sha256': digest,
    'rawSha256': digest,
    'crc32': f'{crc:08x}',
    'normalization': 'None; original VPK payload bytes retained.',
}
metadata_file.write_bytes((json.dumps(metadata, ensure_ascii=False, indent=2) + '\n').encode('utf8'))
print(f'Extracted scripts/shops.txt: {len(data)} bytes, Steam build {metadata["shopSnapshot"]["steamBuild"]}, SHA256 {digest}')

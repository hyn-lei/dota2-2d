"""Patch only the proxied game virtual host, preserving other Nginx sites."""
import argparse
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import time


def tokens(text):
    result = []
    i = 0
    while i < len(text):
        if text[i].isspace():
            i += 1
        elif text[i] == '#':
            end = text.find('\n', i)
            i = len(text) if end < 0 else end + 1
        elif text[i] in '{};':
            result.append((text[i], i, i + 1))
            i += 1
        else:
            start = i
            quote = text[i] if text[i] in '\"\'' else None
            value = []
            if quote:
                i += 1
            while i < len(text):
                char = text[i]
                if char == '\\' and i + 1 < len(text):
                    value.append(text[i + 1])
                    i += 2
                elif quote and char == quote:
                    i += 1
                    break
                elif not quote and (char.isspace() or char in '{};#'):
                    break
                else:
                    value.append(char)
                    i += 1
            else:
                if quote:
                    raise ValueError('Unclosed quoted Nginx token')
            result.append((''.join(value), start, i))
    return result


def patch_config(text, domain='dota2.prismabyss.com', upstream='http://localhost:8080'):
    items = tokens(text)
    stack, ends = [], {}
    for index, item in enumerate(items):
        if item[0] == '{':
            stack.append(index)
        elif item[0] == '}':
            if not stack:
                raise ValueError('Unmatched Nginx closing brace')
            ends[stack.pop()] = index
    if stack:
        raise ValueError('Unclosed Nginx block')
    candidates = []
    for index, item in enumerate(items[:-1]):
        if item[0] != 'server' or items[index + 1][0] != '{':
            continue
        opening, closing = index + 1, ends[index + 1]
        names, proxies = [], []
        for cursor in range(opening + 1, closing):
            if items[cursor][0] == 'server_name':
                end = cursor + 1
                while end < closing and items[end][0] != ';':
                    names.append(items[end][0])
                    end += 1
            if items[cursor][0] == 'proxy_pass':
                proxies.append(items[cursor + 1][0])
        if domain in names and upstream in proxies:
            candidates.append((opening, closing))
    if len(candidates) != 1:
        raise ValueError('Expected exactly one matching proxied game server block')
    opening, closing = candidates[0]
    locations = []
    for cursor in range(opening + 1, closing):
        if items[cursor][0] != 'location':
            continue
        end = cursor + 1
        while end < closing and items[end][0] != '{':
            end += 1
        values = [item[0] for item in items[cursor + 1:end]]
        if values in [['=', '/ws/coop'], ['/ws/coop']]:
            locations.append((cursor, end, ends[end]))
    if len(locations) > 1:
        raise ValueError('Ambiguous existing cooperative WebSocket locations')
    newline = '\r\n' if '\r\n' in text else '\n'
    lines = [
        'location = /ws/coop {',
        '    proxy_pass ' + upstream + ';',
        '    proxy_http_version 1.1;',
        '    proxy_set_header Host $host;',
        '    proxy_set_header Upgrade $http_upgrade;',
        '    proxy_set_header Connection "upgrade";',
        '    proxy_read_timeout 180s;',
        '    proxy_send_timeout 180s;',
        '}',
    ]
    if locations:
        start, _, end = locations[0]
        line_start = text.rfind('\n', 0, items[start][1]) + 1
        indent = text[line_start:items[start][1]]
        replacement = lines[0] + newline + newline.join(indent + line for line in lines[1:])
        return text[:items[start][1]] + replacement + text[items[end][2]:]
    line_start = text.rfind('\n', 0, items[closing][1]) + 1
    closing_indent = text[line_start:items[closing][1]]
    indent = closing_indent + '    '
    replacement = newline + newline.join(indent + line for line in lines) + newline
    return text[:line_start] + replacement + text[line_start:]


def replace_file(path, content, original_stat):
    descriptor, candidate = tempfile.mkstemp(prefix='.dota2-ws-', dir=path.parent)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8', newline='') as output:
            output.write(content)
        os.chmod(candidate, stat.S_IMODE(original_stat.st_mode))
        if hasattr(os, 'chown'):
            os.chown(candidate, original_stat.st_uid, original_stat.st_gid)
        os.replace(candidate, path)
    finally:
        if os.path.exists(candidate):
            os.unlink(candidate)


def apply_patch(config, domain, upstream, nginx):
    path = Path(config)
    if path.is_symlink() or not path.is_file():
        raise ValueError('Nginx configuration must be a regular file')
    original = path.read_bytes().decode('utf-8')
    updated = patch_config(original, domain, upstream)
    if updated == original:
        return {'changed': False, 'domain': domain}
    original_stat = path.stat()
    backup = path.with_name(path.name + '.dota2-ws-' + str(time.time_ns()) + '.bak')
    shutil.copy2(path, backup)
    replace_file(path, updated, original_stat)
    try:
        subprocess.run([nginx, '-t'], check=True)
        subprocess.run([nginx, '-s', 'reload'], check=True)
    except BaseException:
        replace_file(path, original, original_stat)
        subprocess.run([nginx, '-t'], check=True)
        subprocess.run([nginx, '-s', 'reload'], check=True)
        raise
    return {'changed': True, 'domain': domain, 'backup': str(backup)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('config')
    parser.add_argument('--domain', default='dota2.prismabyss.com')
    parser.add_argument('--upstream', default='http://localhost:8080')
    parser.add_argument('--nginx', default='/usr/sbin/nginx')
    args = parser.parse_args()
    print(json.dumps(apply_patch(args.config, args.domain, args.upstream, args.nginx)))

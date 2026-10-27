#!/usr/bin/env python3
"""用 GPT-Image-2.5-Sunburst 的 /images/edits 生成表情帧。

输入参考图：assets/teacher/raw/full.png
输出：assets/teacher/raw/full-blink.png、full-talk.png
"""
import base64
import json
import os
import re
import sys
import time
import urllib.request
import uuid

CFG = os.path.expanduser(r'~\.codex\config.toml')
TOKEN = re.search(r'experimental_bearer_token\s*=\s*"([^"]+)"', open(CFG, encoding='utf-8').read()).group(1)
BASE = 'https://www.fucheers.top/v1'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def multipart(fields, files):
    boundary = '----classtick' + uuid.uuid4().hex
    body = b''
    for key, value in fields.items():
        body += ('--' + boundary + '\r\n').encode()
        body += ('Content-Disposition: form-data; name="' + key + '"\r\n\r\n').encode()
        body += str(value).encode() + b'\r\n'
    for key, filename, content_type, data in files:
        body += ('--' + boundary + '\r\n').encode()
        body += ('Content-Disposition: form-data; name="' + key + '"; filename="' + filename + '"\r\n').encode()
        body += ('Content-Type: ' + content_type + '\r\n\r\n').encode()
        body += data + b'\r\n'
    body += ('--' + boundary + '--\r\n').encode()
    return boundary, body


def edit(prompt, image_path, out_path, size='1024x1536', quality='medium', model='gpt-image-2.5-sunburst'):
    with open(image_path, 'rb') as f:
        image = f.read()
    fields = {'model': model, 'prompt': prompt, 'size': size, 'quality': quality, 'n': '1'}
    boundary, body = multipart(fields, [('image', os.path.basename(image_path), 'image/png', image)])
    req = urllib.request.Request(
        BASE + '/images/edits',
        data=body,
        headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'multipart/form-data; boundary=' + boundary},
        method='POST'
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=420) as resp:
        data = json.load(resp)
    dt = time.time() - t0
    item = data['data'][0]
    if item.get('b64_json'):
        raw = base64.b64decode(item['b64_json'])
    elif item.get('url'):
        with urllib.request.urlopen(item['url'], timeout=180) as resp:
            raw = resp.read()
    else:
        raise RuntimeError('no image: ' + json.dumps(data)[:400])
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    open(out_path, 'wb').write(raw)
    print(json.dumps({'out': out_path, 'bytes': len(raw), 'seconds': round(dt, 1), 'model': model, 'size': size}, ensure_ascii=False))


def main():
    ref = os.path.join(ROOT, 'assets/teacher/raw/full.png')
    base = ('Use the reference image. Keep the exact same original character, same face, same silver-blonde hair with side braid, '
            'same navy-and-gold court uniform, same white cape, same full-body pose, same framing, same warm lighting and the same pure white background. ')
    jobs = [
        (base + 'Change ONLY the eyes: both eyes gently closed in a natural blink, relaxed eyelids, no other facial change, no smile change. '
         'Do not alter anything else. Anime illustration, soft watercolor, clean elegant line art, no text, no watermark.', 'full-blink.png'),
        (base + 'Change ONLY the mouth: lips slightly parted as if speaking one soft word, calm gentle expression, eyes open as in the reference. '
         'Do not alter pose, outfit or framing. Anime illustration, soft watercolor, clean elegant line art, no text, no watermark.', 'full-talk.png'),
        ('Use the reference image. Keep the exact same original character and outfit. Change ONLY the expression: a warm subtle smile, '
         'eyes open softly, mouth gently curved. Same full-body pose, framing and pure white background. Anime illustration, soft watercolor, clean line art, no text.',
         'full-smile.png')
    ]
    for prompt, name in jobs:
        edit(prompt, ref, os.path.join(ROOT, 'assets/teacher/raw', name))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""为「单文件手机版」生成压缩素材，目标把 3.9MB 压到 2MB 以内。

只影响 dist 单文件构建；正常站点仍使用全尺寸素材。
用法：python tools/optimize_single_assets.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

TEACHER = [
    ('full.webp', 'full.webp', None, 720, 66),
    ('full-star.webp', 'full-star.webp', None, 720, 66),
    ('full-rose.webp', 'full-rose.webp', None, 720, 66),
    ('full-witch.webp', 'full-witch.webp', None, 720, 66),
    ('avatar.webp', 'avatar.webp', 160, 160, 76),
    ('bust.webp', 'bust.webp', 380, 420, 64),
    ('thinking.webp', 'thinking.webp', 380, 420, 64),
    ('chibi.webp', 'chibi.webp', 128, 160, 76),
    ('full-blink.webp', 'full-blink.webp', None, 720, 66),
    ('full-talk.webp', 'full-talk.webp', None, 720, 66),
    ('full-smile.webp', 'full-smile.webp', None, 720, 66),
]
ROYAL = [
    ('hero-castle.webp', 'hero-castle.webp', 900, None, 60),
    ('parchment.webp', 'parchment.webp', 700, None, 52),
    ('corner-tl.webp', 'corner-tl.webp', 180, 180, 74),
    ('corner-tr.webp', 'corner-tr.webp', 180, 180, 74),
    ('corner-bl.webp', 'corner-bl.webp', 180, 180, 74),
    ('corner-br.webp', 'corner-br.webp', 180, 180, 74),
    ('crown.webp', 'crown.webp', 120, 120, 74),
    ('seal.webp', 'seal.webp', 120, 120, 72),
    ('rose-window.webp', 'rose-window.webp', 160, 160, 70),
    ('divider.webp', 'divider.webp', 520, None, 72),
    ('castle-crest.webp', 'castle-crest.webp', 220, 320, 72),
    ('castle-badge.webp', 'castle-badge.webp', 96, 96, 78),
    ('knight.webp', 'knight.webp', 260, 480, 64),
    ('king.webp', 'king.webp', 260, 480, 64),
    ('queen.webp', 'queen.webp', 260, 480, 64),
    ('court-thumb-knight.webp', 'court-thumb-knight.webp', 160, 240, 72),
    ('court-thumb-king.webp', 'court-thumb-king.webp', 160, 240, 72),
    ('court-thumb-queen.webp', 'court-thumb-queen.webp', 160, 240, 72),
    ('court-face-knight.webp', 'court-face-knight.webp', 72, 72, 78),
    ('court-face-king.webp', 'court-face-king.webp', 72, 72, 78),
    ('court-face-queen.webp', 'court-face-queen.webp', 72, 72, 78),
]


def fit(img, max_w=None, max_h=None):
    w, h = img.size
    scale = 1.0
    if max_w:
        scale = min(scale, max_w / w)
    if max_h:
        scale = min(scale, max_h / h)
    if scale < 1:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    return img


def main():
    for sub, items in (('teacher', TEACHER), ('royal', ROYAL)):
        out_dir = os.path.join(ROOT, 'assets', 'opt', sub)
        os.makedirs(out_dir, exist_ok=True)
        for src_name, out_name, max_w, max_h, quality in items:
            src = os.path.join(ROOT, 'assets', sub, src_name)
            if not os.path.exists(src):
                print('  [skip]', src_name)
                continue
            img = fit(Image.open(src).convert('RGBA'), max_w, max_h)
            path = os.path.join(out_dir, out_name)
            img.save(path, 'WEBP', quality=quality, method=6)
            print('  [opt] %-24s %4dx%-5d %6.1f KB' % (sub + '/' + out_name, img.width, img.height, os.path.getsize(path) / 1024))

    # 单文件内联图标：96px 足够（favicon / logo / 通知兜底）
    icon_src = os.path.join(ROOT, 'icons', 'icon-192.png')
    icon_out_dir = os.path.join(ROOT, 'assets', 'opt', 'icons')
    os.makedirs(icon_out_dir, exist_ok=True)
    icon = Image.open(icon_src).convert('RGBA').resize((96, 96), Image.LANCZOS)
    icon.save(os.path.join(icon_out_dir, 'icon-96.png'), 'PNG', optimize=True)
    print('  [opt] icons/icon-96.png %6.1f KB' % (os.path.getsize(os.path.join(icon_out_dir, 'icon-96.png')) / 1024))


if __name__ == '__main__':
    main()

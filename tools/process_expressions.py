#!/usr/bin/env python3
"""把 Sunburst 生成的表情帧对齐到 full.webp 的画布并输出 WebP。"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from process_royal_assets import flood_white_to_alpha  # noqa: E402

RAW = os.path.join(ROOT, "assets", "teacher", "raw")
OUT = os.path.join(ROOT, "assets", "teacher")

full = Image.open(os.path.join(RAW, "full.png")).convert("RGBA")
bbox = flood_white_to_alpha(full, thresh=24).getbbox()
target = Image.open(os.path.join(OUT, "full.webp")).size
print("full bbox:", bbox, "target:", target)

for name, out_name in (("full-blink.png", "full-blink.webp"),
                       ("full-talk.png", "full-talk.webp"),
                       ("full-smile.png", "full-smile.webp")):
    im = Image.open(os.path.join(RAW, name)).convert("RGBA")
    cut = flood_white_to_alpha(im, thresh=24).crop(bbox).resize(target, Image.LANCZOS)
    path = os.path.join(OUT, out_name)
    cut.save(path, "WEBP", quality=82, method=6)
    print("  [webp] %-20s %4dx%-5d %6.1f KB" % (out_name, cut.width, cut.height, os.path.getsize(path) / 1024))

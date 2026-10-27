#!/usr/bin/env python3
"""课刻 ClassTick · 皇家导师素材后处理

输入：assets/teacher/raw/{full,bust,thinking,chibi}.png（GPT-Image-2 生成，纯白底）
输出：assets/teacher/{full,bust,thinking,chibi,avatar}.webp
"""
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "assets", "teacher", "raw")
OUT = os.path.join(ROOT, "assets", "teacher")


def load(name):
    return Image.open(os.path.join(RAW, name)).convert("RGBA")


def flood_white_to_alpha(img, thresh=26):
    """从四边把与白底连通的区域变透明；适合人物立绘（保留衣服内部白色）。"""
    img = img.copy()
    w, h = img.size
    px = img.load()
    seeds = []
    step = max(1, w // 12)
    for x in range(0, w, step):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, step):
        seeds.append((0, y))
        seeds.append((w - 1, y))
    for seed in seeds:
        x, y = seed
        r, g, b, a = px[x, y]
        if r > 236 and g > 236 and b > 236:
            ImageDraw.floodfill(img, seed, (0, 0, 0, 0), thresh=thresh)
    return img


def trim(img, pad=6):
    alpha = img.split()[3]
    box = alpha.getbbox()
    if not box:
        return img
    x0, y0, x1, y1 = box
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(img.width, x1 + pad), min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


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


def save(img, name, quality=86):
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", quality=quality, method=6)
    print("  [webp] %-12s %4dx%-4d %6.1f KB" % (name, img.width, img.height, os.path.getsize(path) / 1024))


def make_avatar(bust):
    """从半身像里裁一个脸部圆形头像源图（方形，随后 CSS 圆形裁切）。"""
    w, h = bust.size
    size = int(min(w, h * 0.66))
    left = int((w - size) / 2 + w * 0.01)
    top = int(h * 0.01)
    crop = bust.crop((left, top, min(w, left + size), min(h, top + size)))
    # 方形头像再稍微上移，让脸居中
    return fit(crop, max_w=320, max_h=320)


def main():
    os.makedirs(OUT, exist_ok=True)
    print("处理皇家导师素材 →", OUT)

    full = trim(fit(flood_white_to_alpha(load("full.png"), thresh=28), max_h=1200))
    save(full, "full.webp", quality=84)

    bust = trim(fit(flood_white_to_alpha(load("bust.png"), thresh=26), max_h=660))
    save(bust, "bust.webp", quality=86)
    save(make_avatar(bust), "avatar.webp", quality=88)

    thinking = trim(fit(flood_white_to_alpha(load("thinking.png"), thresh=26), max_h=560))
    save(thinking, "thinking.webp", quality=86)

    chibi = trim(fit(flood_white_to_alpha(load("chibi.png"), thresh=26), max_w=300, max_h=300))
    save(chibi, "chibi.webp", quality=90)

    # 多套服装（全身立绘）
    for raw_name, out_name in [("full-star.png", "full-star.webp"), ("full-rose.png", "full-rose.webp")]:
        raw_path = os.path.join(RAW, raw_name)
        if not os.path.exists(raw_path):
            print("  [skip] 缺少", raw_name)
            continue
        costume = trim(fit(flood_white_to_alpha(load(raw_name), thresh=28), max_h=1200))
        save(costume, out_name, quality=84)

    print("完成。")


if __name__ == "__main__":
    main()

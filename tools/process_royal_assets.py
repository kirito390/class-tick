#!/usr/bin/env python3
"""课刻 ClassTick · 皇室素材后处理

输入：assets/royal/raw/*.png（gpt-image-2 生成）
输出：
  assets/royal/*.webp  —— 城堡主视觉、羊皮纸、四角花纹、皇冠、蜡封、分隔纹、玫瑰窗
  icons/*.png          —— 应用图标（192/512/maskable/apple/badge/favicon/preview）

用法：python tools/process_royal_assets.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "assets", "royal", "raw")
OUT = os.path.join(ROOT, "assets", "royal")
ICONS = os.path.join(ROOT, "icons")


def load(name):
    return Image.open(os.path.join(RAW, name)).convert("RGBA")


def flood_white_to_alpha(img, thresh=30):
    """从四边和白底连通的区域填充为透明（适合实心物体，如蜡封）。"""
    img = img.copy()
    w, h = img.size
    px = img.load()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for seed in seeds:
        r, g, b, a = px[seed]
        if r > 235 and g > 235 and b > 235:
            ImageDraw.floodfill(img, seed, (0, 0, 0, 0), thresh=thresh)
    return img


def white_to_alpha(img, softness=3.4, cutoff=236):
    """按「离白色的距离」生成 alpha，适合线稿：白色全透明，金线保留，边缘平滑。"""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    minc = rgb.min(axis=2)
    alpha = np.clip((cutoff - minc) * softness, 0, 255)
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def trim(img, pad=4):
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


def save_webp(img, name, quality=86):
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", quality=quality, method=6)
    print("  [webp] %-22s %5dx%-5d %6.1f KB" % (name, img.width, img.height, os.path.getsize(path) / 1024))


def corner_variants(base):
    """生成左上/右上/左下/右下四个方向的花纹。"""
    tl = fit(base, max_w=160, max_h=160)
    br = tl.rotate(180)
    tr = tl.transpose(Image.FLIP_LEFT_RIGHT)
    bl = tl.transpose(Image.FLIP_TOP_BOTTOM)
    return {"corner-tl.webp": tl, "corner-tr.webp": tr, "corner-bl.webp": bl, "corner-br.webp": br}


def make_icons(master):
    """从生成的主图标派生 PWA 需要的所有尺寸。"""
    master = master.resize((1024, 1024), Image.LANCZOS)

    # 常规圆角图标：保留生成图的深紫底纹
    normal = master
    normal.resize((512, 512), Image.LANCZOS).save(os.path.join(ICONS, "icon-512.png"), optimize=True)
    normal.resize((192, 192), Image.LANCZOS).save(os.path.join(ICONS, "icon-192.png"), optimize=True)
    normal.resize((32, 32), Image.LANCZOS).save(os.path.join(ICONS, "favicon-32.png"), optimize=True)
    normal.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ICONS, "icon-preview.png"), optimize=True)

    # maskable：内容缩到 86%，四周用取样到的底色补齐，保证安全区
    arr = np.asarray(master.convert("RGB"))
    corner = arr[8:40, 8:40].reshape(-1, 3).mean(axis=0).astype(np.uint8)
    bg = Image.new("RGB", (1024, 1024), tuple(int(v) for v in corner))
    inner = master.resize((880, 880), Image.LANCZOS)
    mask = Image.new("L", (880, 880), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 879, 879], radius=190, fill=255)
    bg.paste(inner, (72, 72), mask)
    maskable = bg.convert("RGBA")
    maskable.resize((512, 512), Image.LANCZOS).save(os.path.join(ICONS, "maskable-512.png"), optimize=True)
    maskable.resize((180, 180), Image.LANCZOS).save(os.path.join(ICONS, "apple-touch-icon.png"), optimize=True)

    # 通知栏小图标：白色皇冠剪影 + 透明底
    badge = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    d = ImageDraw.Draw(badge)
    crown = [(24, 138), (44, 78), (72, 116), (96, 52), (120, 116), (148, 78), (168, 138)]
    d.polygon(crown, fill=(255, 255, 255, 255))
    d.rounded_rectangle([24, 132, 168, 158], radius=13, fill=(255, 255, 255, 255))
    for cx, cy, r in [(44, 70, 9), (96, 44, 10), (148, 70, 9)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    badge.resize((96, 96), Image.LANCZOS).save(os.path.join(ICONS, "badge-96.png"), optimize=True)
    print("  [icons] 192 / 512 / maskable / apple / badge / favicon / preview 已更新")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("处理皇室素材 →", OUT)

    # 1) 应用图标（优先使用 v2 纹章图腾）
    icon_name = "icon-v2.png" if os.path.exists(os.path.join(RAW, "icon-v2.png")) else "icon.png"
    make_icons(load(icon_name))

    # 2) 城堡主视觉（保持 3:2，CSS 负责裁切）
    hero = fit(load("hero-castle.png"), max_w=1400)
    save_webp(hero, "hero-castle.webp", quality=76)

    # 3) 羊皮纸底纹
    parchment = fit(load("parchment.png"), max_w=1100)
    save_webp(parchment, "parchment.webp", quality=68)

    # 4) 金线角花：线稿 → 透明底 → 四方向
    corner = trim(fit(white_to_alpha(load("corner.png")), max_w=320, max_h=320), pad=2)
    for name, img in corner_variants(corner).items():
        save_webp(img, name, quality=90)

    # 5) 皇冠纹章
    crown = trim(fit(white_to_alpha(load("crown.png")), max_w=280, max_h=280), pad=2)
    save_webp(crown, "crown.webp", quality=90)

    # 6) 红蜡封（实心物体：用 floodfill 去白底，保留内部高光）
    seal = trim(fit(flood_white_to_alpha(load("seal.png")), max_w=200, max_h=200), pad=2)
    save_webp(seal, "seal.webp", quality=88)

    # 7) 横向金色分隔纹
    divider = trim(fit(white_to_alpha(load("divider.png")), max_w=640), pad=2)
    save_webp(divider, "divider.webp", quality=90)

    # 8) 玫瑰窗（关于/设置页装饰）
    rose = trim(fit(flood_white_to_alpha(load("rose-window.png"), thresh=24), max_w=280, max_h=280), pad=2)
    save_webp(rose, "rose-window.webp", quality=86)

    print("完成。")


if __name__ == "__main__":
    main()

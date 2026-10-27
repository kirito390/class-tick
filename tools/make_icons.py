#!/usr/bin/env python3
"""生成课刻 ClassTick 的图标：品牌渐变 + 日历 + 三行课程条。

用法（使用 DSH 自带 Python，已含 Pillow）：
    python tools/make_icons.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "icons")
MASTER = 2048

BG_TOP = (38, 132, 110)
BG_BOTTOM = (16, 74, 60)
CREAM = (255, 253, 247, 255)
TOMATO = (228, 87, 46, 255)
BRAND_DEEP = (18, 78, 63, 235)
BRAND_EDGE = (12, 56, 45, 255)


def gradient(size):
    h = w = size
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    arr = np.zeros((h, w, 3), dtype=np.float32)
    for i in range(3):
        arr[:, :, i] = BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t
    return Image.fromarray(arr.astype(np.uint8), "RGB").convert("RGBA")


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def content_layer(scale=1.0):
    """在 2048 设计尺寸上画内容，再整体缩放。"""
    layer = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # 日历本体
    d.rounded_rectangle([440, 600, 1608, 1660], radius=190, fill=CREAM)
    # 顶部红色标题条（顶部圆角，底部方角）
    d.rounded_rectangle([440, 600, 1608, 940], radius=190, fill=TOMATO)
    d.rectangle([440, 750, 1608, 940], fill=TOMATO)
    # 装订环
    d.rounded_rectangle([700, 430, 776, 760], radius=38, fill=CREAM)
    d.rounded_rectangle([1272, 430, 1348, 760], radius=38, fill=CREAM)
    # 三行课程条
    d.rounded_rectangle([620, 1058, 1428, 1178], radius=60, fill=BRAND_DEEP)
    d.rounded_rectangle([620, 1212, 1200, 1332], radius=60, fill=BRAND_DEEP)
    d.rounded_rectangle([620, 1366, 1330, 1486], radius=60, fill=BRAND_DEEP)
    # 右下角小圆点（签到提醒的暗示）
    d.ellipse([1370, 1352, 1560, 1542], fill=TOMATO)
    d.ellipse([1430, 1412, 1500, 1482], fill=CREAM)

    if scale != 1.0:
        size = int(MASTER * scale)
        layer = layer.resize((size, size), Image.LANCZOS)
        canvas = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
        canvas.paste(layer, ((MASTER - size) // 2, (MASTER - size) // 2), layer)
        return canvas
    return layer


def make_icon(maskable=False):
    bg = gradient(MASTER)
    if maskable:
        canvas = bg.copy()
        content = content_layer(scale=0.84)
    else:
        canvas = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
        canvas.paste(bg, (0, 0), rounded_mask(MASTER, 440))
        content = content_layer(scale=1.0)
    canvas.alpha_composite(content)
    # 极细的内描边，增强小尺寸下的轮廓
    edge = ImageDraw.Draw(canvas)
    if not maskable:
        edge.rounded_rectangle([2, 2, MASTER - 3, MASTER - 3], radius=438, outline=BRAND_EDGE, width=6)
    return canvas


def save(img, name, size):
    os.makedirs(OUT, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
    print("  [ok]", name, f"{size}x{size}")


def make_badge():
    """Android 通知栏小图标：白色剪影 + 透明底。"""
    size = 384
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([28, 52, 356, 340], radius=54, fill=(255, 255, 255, 255))
    d.rectangle([28, 150, 356, 206], fill=(0, 0, 0, 0))
    d.rounded_rectangle([110, 18, 152, 96], radius=18, fill=(255, 255, 255, 255))
    d.rounded_rectangle([232, 18, 274, 96], radius=18, fill=(255, 255, 255, 255))
    d.rounded_rectangle([78, 236, 286, 280], radius=22, fill=(0, 0, 0, 0))
    return img


def main():
    print("build icons ->", OUT)
    normal = make_icon(False)
    save(normal, "icon-512.png", 512)
    save(normal, "icon-192.png", 192)
    save(normal, "favicon-32.png", 32)
    maskable = make_icon(True)
    save(maskable, "maskable-512.png", 512)
    save(maskable, "apple-touch-icon.png", 180)
    save(make_badge(), "badge-96.png", 96)
    # 主图也给 PWA 安装预览用
    save(normal, "icon-preview.png", 1024)
    print("done.")


if __name__ == "__main__":
    main()

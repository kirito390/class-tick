#!/usr/bin/env python3
"""课刻 ClassTick · 王廷素材后处理（v1.5）

输入：
  assets/royal/raw/court/castle-crest.png
  assets/royal/raw/court/knight.png / king.png / queen.png
  assets/teacher/raw/witch.png

输出：
  assets/royal/castle-crest.webp            城堡纹章图标
  assets/royal/knight.webp / king.webp / queen.webp
  assets/royal/court-face-*.webp            页脚小像（96×96）
  assets/teacher/full-witch.webp            艾莉丝魔女装

用法：python tools/process_court_assets.py
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from process_royal_assets import flood_white_to_alpha, trim, fit, save_webp  # noqa: E402

RAW = os.path.join(ROOT, "assets", "royal", "raw", "court")
TEACHER_RAW = os.path.join(ROOT, "assets", "teacher", "raw")
ROYAL_OUT = os.path.join(ROOT, "assets", "royal")
TEACHER_OUT = os.path.join(ROOT, "assets", "teacher")


def load_court(name):
    return Image.open(os.path.join(RAW, name)).convert("RGBA")


def clean(img, thresh=26, pad=6):
    """白底 → 透明，裁边，轻微收一下边缘。"""
    cut = flood_white_to_alpha(img, thresh=thresh)
    cut = trim(cut, pad=pad)
    # 把半透明白边压掉一点，避免深色背景上出现白边
    px = cut.load()
    for y in range(cut.height):
        for x in range(cut.width):
            r, g, b, a = px[x, y]
            if a < 12:
                px[x, y] = (0, 0, 0, 0)
    return cut


def face_crop(img, size=96):
    """从全身立绘上部裁一个圆形头像。"""
    w, h = img.size
    box = max(1, int(min(w, h) * 0.42))
    cx = w // 2
    top = max(0, int(h * 0.04))
    left = max(0, cx - box // 2)
    top = min(max(0, top), h - box)
    crop = img.crop((left, top, left + box, top + box)).resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((1, 1, size - 2, size - 2), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(crop, (0, 0), mask)
    return out


def main():
    castle = fit(clean(load_court("castle-crest.png"), thresh=24), max_w=512, max_h=512)
    save_webp(castle, "castle-crest.webp", quality=90)
    badge = fit(castle.copy(), max_w=160, max_h=160)
    save_webp(badge, "castle-badge.webp", quality=90)

    figures = {}
    for key, max_h in (("knight", 780), ("king", 780), ("queen", 780)):
        fig = fit(clean(load_court(key + ".png")), max_h=max_h)
        figures[key] = fig
        save_webp(fig, key + ".webp", quality=88)
        thumb = fit(fig.copy(), max_h=260)
        save_webp(thumb, "court-thumb-" + key + ".webp", quality=88)

    for key, fig in figures.items():
        face = face_crop(fig)
        path = os.path.join(ROYAL_OUT, "court-face-" + key + ".webp")
        face.save(path, "WEBP", quality=88, method=6)
        print("  [webp] %-22s %5dx%-5d %6.1f KB" % ("court-face-" + key + ".webp", face.width, face.height, os.path.getsize(path) / 1024))

    witch = Image.open(os.path.join(TEACHER_RAW, "witch.png")).convert("RGBA")
    witch = fit(clean(witch, thresh=24), max_h=1100)
    path = os.path.join(TEACHER_OUT, "full-witch.webp")
    witch.save(path, "WEBP", quality=90, method=6)
    print("  [webp] %-22s %5dx%-5d %6.1f KB" % ("full-witch.webp", witch.width, witch.height, os.path.getsize(path) / 1024))

    print("完成。")


if __name__ == "__main__":
    main()

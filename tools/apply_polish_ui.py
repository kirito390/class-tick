#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""课刻 ClassTick · v3 润色：结构/图标/样式/资源/构建"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESUME = True


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8", newline="") as f:
        f.write(text)


def replace_pairs(text, pairs, label=""):
    for old, new in pairs:
        count = text.count(old)
        if count == 0 and RESUME:
            print("  [skip] %s 已应用" % label)
            continue
        if count != 1:
            print("[FAIL] %s 匹配 %d 次：%r" % (label, count, old[:70]))
            sys.exit(1)
        text = text.replace(old, new, 1)
    return text


# ============================================================ index.html
IDX = read("index.html")
IDX = replace_pairs(IDX, [
    ('  <link rel="stylesheet" href="assets/teacher.css">\n',
     '  <link rel="stylesheet" href="assets/teacher.css">\n  <link rel="stylesheet" href="assets/royal-polish.css">\n'),
    ('  <div class="app" id="app">',
     '  <div class="royal-aura" aria-hidden="true"></div>\n  <div class="royal-dust" aria-hidden="true"></div>\n  <div class="app" id="app">'),
    ('        <div class="brand-text">\n          <h1>',
     '        <div class="brand-text">\n          <p class="brand-eyebrow">Royal Class Registry · Tongji</p>\n          <h1>'),
    ('<span>今日</span>', '<span class="tab-cn">今日</span><em class="tab-en">Today</em>'),
    ('<span>本周</span>', '<span class="tab-cn">本周</span><em class="tab-en">Week</em>'),
    ('<span>课程</span>', '<span class="tab-cn">课程</span><em class="tab-en">Registry</em>'),
    ('<span>设置</span>', '<span class="tab-cn">设置</span><em class="tab-en">Decree</em>')
], "index")

# 页脚改成两行：中文信息 + 英文铭牌
FOOT_OLD = '''    <footer class="foot">
      <span id="foot-week">课刻 ClassTick</span>
      <span class="foot-dot">·</span>
      <span id="foot-note">数据仅保存在本机</span>
      <span class="foot-dot">·</span>
      <button class="link-btn" data-action="show-about">关于 / 安装指南</button>
    </footer>'''
FOOT_NEW = '''    <footer class="foot">
      <div class="foot-row">
        <span id="foot-week">课刻 ClassTick</span>
        <span class="foot-dot">·</span>
        <span id="foot-note">数据仅保存在本机</span>
        <span class="foot-dot">·</span>
        <button class="link-btn" data-action="show-about">关于 / 安装指南</button>
      </div>
      <div class="foot-en" id="foot-en">Class Tick · Royal Edition · MMXXVI</div>
    </footer>'''
IDX = replace_pairs(IDX, [(FOOT_OLD, FOOT_NEW)], "footer")

# favicon 改为新纹章 PNG
IDX = replace_pairs(IDX, [
    ('  <link rel="icon" href="icons/favicon.svg" type="image/svg+xml">',
     '  <link rel="icon" href="icons/icon-192.png" type="image/png">\n  <link rel="icon" href="icons/favicon-32.png" type="image/png" sizes="32x32">')
], "favicon")

# 导师对话：新增换装按钮 / 服饰名 / 舞台星光 / AI 徽章
IDX = replace_pairs(IDX, [
    ('        <div class="teacher-head-actions">\n          <button class="icon-btn" data-action="teacher-tips"',
     '        <div class="teacher-head-actions">\n          <button class="icon-btn" data-action="teacher-outfit" title="为艾莉丝换装" aria-label="为艾莉丝换装">✦</button>\n          <button class="icon-btn" data-action="teacher-tips"'),
    ('          <h2 id="teacher-dialog-title">皇家导师 · 艾莉丝</h2>',
     '          <h2 id="teacher-dialog-title">皇家导师 · 艾莉丝<span class="teacher-ai-badge" id="teacher-ai-badge" hidden>AI</span></h2>'),
    ('        <i>「朝程、鸣钟与落印，交由我记着。」</i>',
     '        <i>「朝程、鸣钟与落印，交由我记着。」</i>\n        <i class="teacher-outfit-name" id="teacher-outfit-name">COURT UNIFORM · 宫廷制服</i>'),
    ('      <img class="teacher-art" src="assets/teacher/full.webp" alt="皇家导师艾莉丝立绘">',
     '      <img class="teacher-art" id="teacher-art" src="assets/teacher/full.webp" alt="皇家导师艾莉丝立绘">\n'
     '      <i class="teacher-sparkle s1" aria-hidden="true"></i>\n'
     '      <i class="teacher-sparkle s2" aria-hidden="true"></i>\n'
     '      <i class="teacher-sparkle s3" aria-hidden="true"></i>\n'
     '      <i class="teacher-sparkle s4" aria-hidden="true"></i>')
], "teacher-ui")
write("index.html", IDX)
print("[OK] index.html")

# ============================================================ core.js 设置项
CORE = read("assets/core.js")
CORE = replace_pairs(CORE, [
    ("  var DEFAULT_SETTINGS = {\n    skin: 'royal',\n    teacher: true,",
     "  var DEFAULT_SETTINGS = {\n    skin: 'royal',\n    teacher: true,\n    teacherOutfit: 'court',\n    llmOn: false,\n    llmBase: 'https://api.deepseek.com/v1',\n    llmModel: 'deepseek-chat',\n    llmKey: '',"),
    ("      teacher: s.teacher !== false,",
     "      teacher: s.teacher !== false,\n"
     "      teacherOutfit: ['court', 'star', 'rose'].indexOf(s.teacherOutfit) === -1 ? 'court' : s.teacherOutfit,\n"
     "      llmOn: s.llmOn === true,\n"
     "      llmBase: String(s.llmBase || 'https://api.deepseek.com/v1').slice(0, 200),\n"
     "      llmModel: String(s.llmModel || 'deepseek-chat').slice(0, 80),\n"
     "      llmKey: String(s.llmKey || '').slice(0, 200),")
], "core settings")
write("assets/core.js", CORE)
print("[OK] core.js")

# ============================================================ manifest：新图标（去 svg）
try:
    manifest = json.loads(read("manifest.webmanifest"))
except Exception as exc:
    print("[FAIL] manifest: %s" % exc)
    sys.exit(1)
manifest["icons"] = [i for i in manifest.get("icons", []) if i.get("type") != "image/svg+xml"]
manifest["description"] = "皇室典藏课程表：可交互皇家导师艾莉丝、今日朝程、晨钟诏书、鸣钟示警、课前 2 分钟落印签到、随身行囊。"
manifest["theme_color"] = "#241a44"
manifest["background_color"] = "#e9dbb8"
write("manifest.webmanifest", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print("[OK] manifest")

# ============================================================ sw.js
SW = read("sw.js")
SW = replace_pairs(SW, [
    ("const CACHE = 'classtick-v1.2.0-teacher';", "const CACHE = 'classtick-v1.3.0-polish';"),
    ("  './icons/favicon.svg'", "  './icons/favicon-32.png'"),
    ("  './assets/teacher/chibi.webp',\n",
     "  './assets/teacher/chibi.webp',\n  './assets/teacher/full-star.webp',\n  './assets/teacher/full-rose.webp',\n  './assets/royal-polish.css',\n")
], "sw")
write("sw.js", SW)
print("[OK] sw.js")

# ============================================================ 素材处理脚本
P = read("tools/process_royal_assets.py")
P = replace_pairs(P, [
    ('    # 1) 应用图标\n    make_icons(load("icon.png"))',
     '    # 1) 应用图标（优先使用 v2 纹章图腾）\n    icon_name = "icon-v2.png" if os.path.exists(os.path.join(RAW, "icon-v2.png")) else "icon.png"\n    make_icons(load(icon_name))')
], "process_royal")
write("tools/process_royal_assets.py", P)

P = read("tools/process_teacher_assets.py")
P = replace_pairs(P, [
    ('    chibi = trim(fit(flood_white_to_alpha(load("chibi.png"), thresh=26), max_w=300, max_h=300))\n    save(chibi, "chibi.webp", quality=90)',
     '    chibi = trim(fit(flood_white_to_alpha(load("chibi.png"), thresh=26), max_w=300, max_h=300))\n    save(chibi, "chibi.webp", quality=90)\n\n    # 多套服装（全身立绘）\n    for raw_name, out_name in [("full-star.png", "full-star.webp"), ("full-rose.png", "full-rose.webp")]:\n        raw_path = os.path.join(RAW, raw_name)\n        if not os.path.exists(raw_path):\n            print("  [skip] 缺少", raw_name)\n            continue\n        costume = trim(fit(flood_white_to_alpha(load(raw_name), thresh=28), max_h=1200))\n        save(costume, out_name, quality=84)')
], "process_teacher")
write("tools/process_teacher_assets.py", P)
print("[OK] process scripts")

# ============================================================ build_single.mjs
B = read("tools/build_single.mjs")
B = replace_pairs(B, [
    ("  ['assets/teacher.css', /<link rel=\"stylesheet\" href=\"assets\\/teacher\\.css\">/]",
     "  ['assets/teacher.css', /<link rel=\"stylesheet\" href=\"assets\\/teacher\\.css\">/],\n  ['assets/royal-polish.css', /<link rel=\"stylesheet\" href=\"assets\\/royal-polish\\.css\">/]"),
    ("const TEACHER_ASSETS = ['full.webp', 'bust.webp', 'avatar.webp', 'thinking.webp', 'chibi.webp'];",
     "const TEACHER_ASSETS = ['full.webp', 'bust.webp', 'avatar.webp', 'thinking.webp', 'chibi.webp', 'full-star.webp', 'full-rose.webp'];"),
    ("html = html.replace(/<link rel=\"icon\"[^>]*>/, inline('<link rel=\"icon\" type=\"image/svg+xml\" href=\"' + iconSvgUri + '\">'));\nhtml = html.replace('src=\"icons/icon-192.png\"', inline('src=\"' + iconPngUri + '\"'));",
     "html = html.replace(/<link rel=\"icon\"[^>]*>\\n/g, function () { return ''; });\nhtml = html.replace('<meta name=\"theme-color\"', inline('<link rel=\"icon\" type=\"image/png\" href=\"' + iconPngUri + '\">\\n  <meta name=\"theme-color\"'));\nhtml = html.replace('src=\"icons/icon-192.png\"', inline('src=\"' + iconPngUri + '\"'));")
], "build")
write("tools/build_single.mjs", B)
print("[OK] build_single.mjs")

print("\n结构润色补丁完成。")

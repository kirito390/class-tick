#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""课刻 ClassTick · v3 润色：app.js 排版英文 / 换装 / 动态效果 / LLM"""

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


APP = read("assets/app.js")

# ---------------------------------------------------------- 1. 纹章家族英文名
OLD_HOUSE = """  var HOUSE = {
    tomato: { name: '赤狮', motto: '勇者先至' },
    teal: { name: '碧潮', motto: '潮起有时' },
    amber: { name: '金穗', motto: '勤耕必获' },
    sky: { name: '晴鹰', motto: '目及远方' },
    violet: { name: '紫鸢', motto: '静而有光' },
    olive: { name: '林鹿', motto: '深林自守' },
    rose: { name: '蔷薇', motto: '有刺亦芳' },
    sand: { name: '砂堡', motto: '寸土筑城' },
    ink: { name: '玄鸦', motto: '夜读不辍' }
  };"""
NEW_HOUSE = """  var HOUSE = {
    tomato: { name: '赤狮', motto: '勇者先至', en: 'Crimson Lion', enMotto: 'The Bold Prevail' },
    teal: { name: '碧潮', motto: '潮起有时', en: 'Emerald Tide', enMotto: 'The Tide Keeps Time' },
    amber: { name: '金穗', motto: '勤耕必获', en: 'Golden Harvest', enMotto: 'Toil Bears Fruit' },
    sky: { name: '晴鹰', motto: '目及远方', en: 'Azure Falcon', enMotto: 'Eyes on the Horizon' },
    violet: { name: '紫鸢', motto: '静而有光', en: 'Violet Iris', enMotto: 'Quiet Light Within' },
    olive: { name: '林鹿', motto: '深林自守', en: 'Forest Stag', enMotto: 'Keep to the Deep Wood' },
    rose: { name: '蔷薇', motto: '有刺亦芳', en: 'Thorned Rose', enMotto: 'Sweet Yet Sharp' },
    sand: { name: '砂堡', motto: '寸土筑城', en: 'Sandstone Keep', enMotto: 'Every Stone a Home' },
    ink: { name: '玄鸦', motto: '夜读不辍', en: 'Midnight Raven', enMotto: 'Read Through the Night' }
  };"""
APP = replace_pairs(APP, [(OLD_HOUSE, NEW_HOUSE)], "house")

# ---------------------------------------------------------- 2. 英文标注 / 换装 / LLM / 动效 辅助函数
HELPERS = r'''  // ============================================================ 皇室英文标注 / 换装 / LLM / 动效

  var EN_MAP = {
    '今日朝程': "Today's Court",
    '今天的课': "Today's Court",
    '今日行囊': "Today's Itinerary",
    '今天要带': "Today's Itinerary",
    '本周朝纲': 'Weekly Overview',
    '本周一览': 'Weekly Overview',
    '此刻': 'Now',
    '现在': 'Now',
    '系统传令': 'Royal Decree',
    '系统通知': 'Royal Decree',
    '传令设置': 'Reminders',
    '提醒设置': 'Reminders',
    '学期信息': 'Term Records',
    '作息时辰': 'Hours of Court',
    '作息时间': 'Hours of Court',
    '皇家导师': 'Royal Tutor',
    '外观与关于': 'Appearance',
    '我的课程纹册': 'Course Registry',
    '我的课程': 'Course Registry',
    '王室档案库': 'Royal Archives',
    '数据与备份': 'Royal Archives',
    'AI 对话（可选）': 'AI Conversation'
  };

  function toRoman(num) {
    var n = Math.max(1, Math.min(3999, Number(num) || 1));
    var map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
      [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var out = '';
    for (var i = 0; i < map.length; i++) {
      while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; }
    }
    return out;
  }

  /** 给面板标题补一行英文小标（幂等） */
  function decorateEnglish() {
    var heads = $$('.panel-head h2, .side-title');
    heads.forEach(function (head) {
      if (head.querySelector('.h2-en')) return;
      var cn = (head.textContent || '').replace(/\s+/g, '');
      var en = EN_MAP[cn];
      if (!en) return;
      head.innerHTML = '<span class="h2-en">' + en + '</span><span class="h2-cn">' + head.innerHTML + '</span>';
    });
  }

  // ---------------------------------------------------------- 导师多套服装
  var OUTFITS = {
    court: { cn: '宫廷制服', en: 'Court Uniform', file: 'full.webp' },
    star: { cn: '星夜礼服', en: 'Starlit Gown', file: 'full-star.webp' },
    rose: { cn: '白蔷薇礼服', en: 'White Rose Gown', file: 'full-rose.webp' }
  };

  function currentOutfitKey() {
    var preview = params.get('outfit');
    if (preview && OUTFITS[preview]) return preview;
    var key = state.data && state.data.settings.teacherOutfit;
    return OUTFITS[key] ? key : 'court';
  }

  function applyTeacherOutfit(animate) {
    var key = currentOutfitKey();
    var outfit = OUTFITS[key];
    var art = $('#teacher-art');
    var nameEl = $('#teacher-outfit-name');
    if (nameEl) nameEl.textContent = outfit.en.toUpperCase() + ' · ' + outfit.cn;
    if (!art) return;
    var nextSrc = 'assets/teacher/' + outfit.file;
    var current = art.getAttribute('src') || '';
    if (current === nextSrc) return;
    if (animate && !prefersReducedMotion()) {
      art.classList.add('is-changing');
      setTimeout(function () {
        art.setAttribute('src', nextSrc);
        art.classList.remove('is-changing');
      }, 230);
    } else {
      art.setAttribute('src', nextSrc);
    }
  }

  function cycleTeacherOutfit() {
    var order = ['court', 'star', 'rose'];
    var cur = currentOutfitKey();
    var next = order[(order.indexOf(cur) + 1) % order.length];
    state.data.settings.teacherOutfit = next;
    saveData();
    applyTeacherOutfit(true);
    if (teacherOpen()) {
      teacherSay('<p>换好了，殿下。这一套是 <b>' + OUTFITS[next].cn + '</b>（' + OUTFITS[next].en + '）。</p>', null, 260);
    }
    toast(T('已为艾莉丝换上 ' + OUTFITS[next].cn, '已切换导师服装'));
  }

  // ---------------------------------------------------------- 可选的大模型对话
  function llmReady() {
    var s = state.data && state.data.settings;
    return !!(s && s.llmOn && s.llmBase && s.llmModel && s.llmKey);
  }

  function teacherSystemPrompt() {
    var s = state.data.settings;
    var n = now();
    var week = C.semesterWeek(state.data.meta, n);
    var items = C.dayItems(state.data, n);
    var next = C.nextItem(state.data, n);
    var today = items.map(function (it) { return C.minToHm(it.startMin) + ' ' + it.name + (it.room ? '@' + it.room : ''); }).join('；') || '无课';
    var nextText = next ? (next.state === 'now' ? '正在上《' + next.item.name + '》' : '下一节《' + next.item.name + '》' + C.relativeDayLabel(next.item.start, n) + C.minToHm(next.item.startMin) + ' ' + (next.item.room || '')) : '暂无';
    return '你是《课刻 ClassTick》里的皇家导师"艾莉丝·瓦尔登"，一位优雅、温柔、略带天然呆的宫廷教师。' +
      '你称呼用户为"殿下"，用中文回答，语气礼貌克制、简洁（不超过 120 字），不中二、不堆砌古风。' +
      '你可以给出学习与时间管理建议，但不得编造课表；不知道就说不知道。\n' +
      '当前上下文：' + C.dateLabel(n) + ' ' + C.dayLabel(n) + '，第' + week + '周。今日课程：' + today + '。' + nextText + '。' +
      '提醒设置：早报' + s.digestTime + '，课前提前' + s.preMin + '分钟，签到提前' + s.signMin + '分钟。' +
      (state.data.courses.length ? '共' + state.data.courses.length + '门课。' : '课表尚空。');
  }

  function askLLM(text) {
    var s = state.data.settings;
    var base = String(s.llmBase || '').replace(/\/+$/, '');
    if (!base) return Promise.reject(new Error('未配置接口地址'));
    var controller = ('AbortController' in window) ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;
    var payload = {
      model: s.llmModel || 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        { role: 'system', content: teacherSystemPrompt() },
        { role: 'user', content: text }
      ]
    };
    return fetch(base + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (s.llmKey || '')
      },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      var msg = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!msg) throw new Error('接口未返回内容');
      return '<p>' + esc(String(msg).trim()).replace(/\n/g, '<br>') + '</p>';
    });
  }

  function updateTeacherAI() {
    var badge = $('#teacher-ai-badge');
    if (badge) badge.hidden = !llmReady();
    var form = $('#teacher-text');
    if (form) form.setAttribute('placeholder', llmReady()
      ? '对艾莉丝说点什么…（AI 对话已开启）'
      : '对艾莉丝说：早报改到 7:00 / 签到提前 5 分钟 / 换成深色…');
  }

  function testLLM() {
    var s = state.data.settings;
    if (!s.llmBase || !s.llmKey || !s.llmModel) {
      toast(T('请先填写接口地址、模型与 API Key', '请先填写接口地址、模型与 API Key'), 'error');
      return;
    }
    toast(T('正在叩问大模型…', '正在测试连接…'));
    askLLM('请用一句话向殿下问安，并说明你已就绪。').then(function (html) {
      toast(T('连接成功 ✓', '连接成功 ✓'));
      if (teacherOpen()) teacherSay(html);
    }).catch(function (err) {
      toast(T('连接失败：' + (err && err.message ? err.message : err), '连接失败：' + (err && err.message ? err.message : err)), 'error');
    });
  }

  // ---------------------------------------------------------- 点击涟漪 / 金星
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function makeRipple(event) {
    if (prefersReducedMotion() || !event.target || !event.target.closest) return;
    var target = event.target.closest('.text-btn, .chip-btn, .mini-btn, .icon-btn, .tab, .wk-block, .color-dot, .teacher-fab');
    if (!target) return;
    var rect = target.getBoundingClientRect();
    if (!rect.width) return;
    var size = Math.max(rect.width, rect.height) * 1.25;
    var span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (event.clientX - rect.left - size / 2) + 'px';
    span.style.top = (event.clientY - rect.top - size / 2) + 'px';
    target.appendChild(span);
    setTimeout(function () { span.remove(); }, 680);
  }

  function sparkleBurst(x, y, count) {
    if (prefersReducedMotion()) return;
    var n = count || 14;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      var angle = (Math.PI * 2 * i / n) + Math.random() * 0.35;
      var dist = 34 + Math.random() * 58;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      document.body.appendChild(s);
      setTimeout(function (node) { return function () { node.remove(); }; }(s), 820);
    }
  }

  // ============================================================ 小工具

  function now() {'''
APP = replace_pairs(APP, [
    ("  // ============================================================ 小工具\n\n  function now() {", HELPERS)
], "helpers")

# ---------------------------------------------------------- 3. 导航中文选择器适配
APP = replace_pairs(APP, [
    ("      var span = btn.querySelector('span');\n      if (span && tabText[btn.dataset.tab]) span.textContent = tabText[btn.dataset.tab];",
     "      var span = btn.querySelector('.tab-cn') || btn.querySelector('span');\n      if (span && tabText[btn.dataset.tab]) span.textContent = tabText[btn.dataset.tab];")
], "tab-cn")

# ---------------------------------------------------------- 4. Hero 英文标注
APP = replace_pairs(APP, [
    ("        '<p class=\"hero-kicker\"><span class=\"pulse' + (isNow ? ' on' : '') + '\"></span>' +\n          (isNow ? T('正在开讲', '正在上课') : T('下一节 · 静候开讲', '下一节课')) +",
     "        '<p class=\"hero-kicker\"><span class=\"pulse' + (isNow ? ' on' : '') + '\"></span>' +\n          '<span class=\"kicker-en\">' + (isNow ? 'Now Teaching' : 'Next Class') + '</span>' +\n          (isNow ? T('正在开讲', '正在上课') : T('下一节 · 静候开讲', '下一节课')) +"),
    ("          '<span class=\"cd-label\">' + countdownLabel + '</span>' +",
     "          '<span class=\"cd-label\"><i class=\"cd-en\">' + (isNow ? 'Remaining' : 'Countdown') + '</i>' + countdownLabel + '</span>' +")
], "hero-en")

# ---------------------------------------------------------- 5. 周标题英文 + 罗马数字
APP = replace_pairs(APP, [
    ("    $('#week-title').textContent = T('王历 · 第 {n} 周', '第 {n} 周', { n: week });",
     "    $('#week-title').innerHTML = '<span class=\"week-en\">Week ' + toRoman(week) + ' · Chronicle</span>' +\n      '<span class=\"week-cn\">' + (isRoyal() ? '王历 · 第 ' + week + ' 周' : '第 ' + week + ' 周') + '</span>';")
], "week-title")

# ---------------------------------------------------------- 6. 课程页英文家族
APP = replace_pairs(APP, [
    ("              T('{n} 个时段', '{n} 个时间段', { n: c.sessions.length }) + '</p></div>' +",
     "              T('{n} 个时段', '{n} 个时间段', { n: c.sessions.length }) + '</p>' +\n            '<p class=\"course-en\">' + (isRoyal() && HOUSE[c.color] ? 'House of the ' + HOUSE[c.color].en + ' · ' + HOUSE[c.color].enMotto : '') + '</p></div>' +"),
    ("      var label = isRoyal() ? (house.name + '家族 · ' + house.motto) : ('颜色 ' + c);",
     "      var label = isRoyal() ? (house.name + '家族 · ' + house.motto + ' · House of the ' + house.en) : ('颜色 ' + c);")
], "courses-en")

# ---------------------------------------------------------- 7. 各渲染函数末尾补英文
APP = replace_pairs(APP, [
    ("      } else {\n        sum.textContent = T('今日无课', '暂无课程');\n      }\n    }\n  }",
     "      } else {\n        sum.textContent = T('今日无课', '暂无课程');\n      }\n    }\n    decorateEnglish();\n  }"),
    ("    $('#legend').innerHTML = legend || '<span class=\"legend-empty\">' + T('本周无课', '这周没有课') + '</span>';\n  }",
     "    $('#legend').innerHTML = legend || '<span class=\"legend-empty\">' + T('本周无课', '这周没有课') + '</span>';\n    decorateEnglish();\n  }"),
    ("        }).join('') + '</p>' : '') +\n        '</article>';\n    }).join('');\n  }",
     "        }).join('') + '</p>' : '') +\n        '</article>';\n    }).join('');\n    decorateEnglish();\n  }"),
    ("    root.innerHTML = settingsHTML();\n  }",
     "    root.innerHTML = settingsHTML();\n    decorateEnglish();\n  }")
], "decorate-calls")

# ---------------------------------------------------------- 8. 导师设置：服饰选择
APP = replace_pairs(APP, [
    ("      switchRow('data-setting=\"teacher\"' + (s.teacher !== false ? ' checked' : ''), T('显示皇家导师', '显示课程助手'), T('点左下角头像，可唤来艾莉丝调整传令与查看朝程', '点左下角头像，可唤来助手调整提醒与查看课表')) +\n      '<div class=\"btn-grid\">",
     "      switchRow('data-setting=\"teacher\"' + (s.teacher !== false ? ' checked' : ''), T('显示皇家导师', '显示课程助手'), T('点左下角头像，可唤来艾莉丝调整传令与查看朝程', '点左下角头像，可唤来助手调整提醒与查看课表')) +\n"
     "      '<div class=\"sub-row\"><label>' + T('导师服饰', '导师服饰') + ' <select data-setting=\"teacherOutfit\">' +\n"
     "        [['court', '宫廷制服 · Court'], ['star', '星夜礼服 · Starlit'], ['rose', '白蔷薇礼服 · Rose']].map(function (o) {\n"
     "          return '<option value=\"' + o[0] + '\"' + (s.teacherOutfit === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';\n"
     "        }).join('') + '</select></label></div>' +\n"
     "      '<div class=\"btn-grid\">")
], "teacher-outfit-setting")

# ---------------------------------------------------------- 9. AI 对话面板
AI_PANEL = '''    html += '<section class="panel"><div class="panel-head"><h2>' + T('AI 对话（可选）', 'AI 对话（可选）') + '</h2><span class="panel-sub">' + T('可选 · 需自备 API', '可选 · 需自备 API') + '</span></div>' +
      switchRow('data-setting="llmOn"' + (s.llmOn ? ' checked' : ''), T('启用大模型对话', '启用大模型对话'), T('未听懂的句子交给大模型；关闭时完全本地解析、离线可用', '未听懂的句子交给大模型；关闭时完全本地解析')) +
      '<div class="llm-config">' +
      '<div class="field-row">' +
      '<label class="field"><span>' + T('接口地址', '接口地址') + '</span><input type="text" data-setting="llmBase" value="' + esc(s.llmBase) + '" placeholder="https://api.deepseek.com/v1"></label>' +
      '<label class="field"><span>' + T('模型', '模型') + '</span><input type="text" data-setting="llmModel" value="' + esc(s.llmModel) + '" placeholder="deepseek-chat"></label>' +
      '</div>' +
      '<div class="field"><span>' + T('API Key（仅存本机）', 'API Key（仅存本机）') + '</span><input type="password" data-setting="llmKey" value="' + esc(s.llmKey) + '" placeholder="sk-..." autocomplete="off"></div>' +
      '<div class="btn-grid"><button class="text-btn solid" data-action="teacher-test-llm">' + T('测试连接', '测试连接') + '</button>' +
      '<button class="text-btn bordered" data-action="teacher-open">' + T('打开对话', '打开对话') + '</button></div>' +
      '<p class="hint">' + T('开启后，仅当本地规则听不懂时，才会把这句话与课表上下文（时间、下一节课、提醒设置）发给你配置的接口；Key 只保存在本机浏览器。', '开启后，仅当本地规则听不懂时，才会把这句话与课表上下文发给你配置的接口；Key 只保存在本机浏览器。') + '</p>' +
      '</div></section>' +

'''
APP = replace_pairs(APP, [
    ("    html += '<section class=\"panel\"><div class=\"panel-head\"><h2>' + T('外观与关于', '外观与关于') + '</h2></div>' +",
     AI_PANEL + "    html += '<section class=\"panel\"><div class=\"panel-head\"><h2>' + T('外观与关于', '外观与关于') + '</h2></div>' +")
], "ai-panel")

# ---------------------------------------------------------- 10. 设置变更：服饰 / LLM
APP = replace_pairs(APP, [
    ("      if (key === 'teacher') {\n        updateTeacherDock();\n        renderAll();\n        return;\n      }",
     "      if (key === 'teacher') {\n        updateTeacherDock();\n        renderAll();\n        return;\n      }\n"
     "      if (key === 'teacherOutfit') {\n        applyTeacherOutfit(true);\n        renderSettings();\n        return;\n      }\n"
     "      if (key.indexOf('llm') === 0) {\n        updateTeacherAI();\n        return;\n      }")
], "settings-change")

# ---------------------------------------------------------- 11. Click 事件：换装 / 测试连接
APP = replace_pairs(APP, [
    ("      case 'teacher-open':\n        openTeacher();\n        break;",
     "      case 'teacher-open':\n        openTeacher();\n        break;\n      case 'teacher-outfit':\n        cycleTeacherOutfit();\n        break;\n      case 'teacher-test-llm':\n        testLLM();\n        break;")
], "onclick")

# ---------------------------------------------------------- 12. 导师回复：LLM 兜底
OLD_RESPOND = """  function teacherRespond(raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!text) return;
    teacherBubble('user', '<p>' + esc(text) + '</p>');
    var input = $('#teacher-text');
    if (input) input.value = '';
    var reply = teacherIntent(text) || {};
    teacherSay(reply.html || '<p>殿下恕罪，这句我还没听明白。</p>', reply.actions || null, 520);
  }"""
NEW_RESPOND = """  function teacherRespond(raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!text) return;
    teacherBubble('user', '<p>' + esc(text) + '</p>');
    var input = $('#teacher-text');
    if (input) input.value = '';
    var reply = teacherIntent(text) || {};

    if (reply.fallback && llmReady()) {
      var av = $('#teacher-avatar-img');
      if (av) av.src = TEACHER.thinking;
      var typing = teacherBubble('teacher', '<span class="teacher-typing"><i></i><i></i><i></i></span>');
      askLLM(text).then(function (answer) {
        if (typing) typing.remove();
        teacherBubble('teacher', answer);
        if (av) av.src = TEACHER.avatar;
        teacherState.busy = false;
      }).catch(function (err) {
        if (typing) typing.remove();
        teacherBubble('teacher', '<p>殿下恕罪，大模型那边暂时没有回音（' + esc(String((err && err.message) || err).slice(0, 60)) + '）。我仍可以按旧办法替您调整设置。</p>', reply.actions || null);
        if (av) av.src = TEACHER.avatar;
        teacherState.busy = false;
      });
      return;
    }

    teacherSay(reply.html || '<p>殿下恕罪，这句我还没听明白。</p>', reply.actions || null, 520);
  }"""
APP = replace_pairs(APP, [(OLD_RESPOND, NEW_RESPOND)], "respond")

# 未识别分支加 fallback 标记
APP = replace_pairs(APP, [
    ("    // 未识别\n    return {\n      html: '<p>殿下恕罪，这一句我还没听明白。您可以试试：</p>",
     "    // 未识别\n    return {\n      fallback: true,\n      html: '<p>殿下恕罪，这一句我还没听明白。您可以试试：</p>")
], "fallback-flag")

# ---------------------------------------------------------- 13. 渲染入口：服饰 / AI
APP = replace_pairs(APP, [
    ("    renderSettings();\n    updateTeacherDock();\n    renderTeacherStatus();\n  }",
     "    renderSettings();\n    decorateEnglish();\n    applyTeacherOutfit(false);\n    updateTeacherAI();\n    updateTeacherDock();\n    renderTeacherStatus();\n  }")
], "renderAll")

# ---------------------------------------------------------- 14. 导师初始化：服饰 / 视差
APP = replace_pairs(APP, [
    ("  function initTeacher() {\n    updateTeacherDock();\n    renderTeacherStatus();\n    teacherQuickChips();",
     "  function initTeacher() {\n    updateTeacherDock();\n    renderTeacherStatus();\n    teacherQuickChips();\n    applyTeacherOutfit(false);\n    updateTeacherAI();\n    bindTeacherParallax();")
], "initTeacher")

# 打开对话时同步服饰
APP = replace_pairs(APP, [
    ("    teacherQuickChips();\n    renderTeacherStatus();\n    teacherGreet(false);",
     "    teacherQuickChips();\n    renderTeacherStatus();\n    applyTeacherOutfit(false);\n    updateTeacherAI();\n    teacherGreet(false);")
], "openTeacher")

# 视差函数插到 initTeacher 之前
PARALLAX = '''  function bindTeacherParallax() {
    var stage = $('.teacher-stage');
    if (!stage) return;
    stage.addEventListener('pointermove', function (event) {
      var rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      var mx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      var my = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      stage.style.setProperty('--mx', mx.toFixed(3));
      stage.style.setProperty('--my', my.toFixed(3));
    });
    stage.addEventListener('pointerleave', function () {
      stage.style.setProperty('--mx', '0');
      stage.style.setProperty('--my', '0');
    });
  }

  function initTeacher() {'''
APP = replace_pairs(APP, [("  function initTeacher() {", PARALLAX)], "parallax")

# ---------------------------------------------------------- 15. 事件绑定：涟漪 / logo 金星
APP = replace_pairs(APP, [
    ("  function bindEvents() {\n    document.addEventListener('click', onClick);",
     "  function bindEvents() {\n    document.addEventListener('pointerdown', makeRipple);\n"
     "    $$('.logo').forEach(function (logo) {\n"
     "      logo.addEventListener('click', function (event) {\n"
     "        sparkleBurst(event.clientX, event.clientY, 16);\n"
     "        setTab('today');\n"
     "      });\n"
     "    });\n"
     "    document.addEventListener('click', onClick);")
], "ripple-bind")

# ---------------------------------------------------------- 16. 自测：英文 / 动效 / 换装 / AI
APP = replace_pairs(APP, [
    ("    test('导师能听懂并修改设置', state.data.settings.signMin === 5, 'signMin=' + state.data.settings.signMin);\n    state.data.settings.signMin = oldSignMin;\n    saveData();",
     "    test('导师能听懂并修改设置', state.data.settings.signMin === 5, 'signMin=' + state.data.settings.signMin);\n"
     "    state.data.settings.signMin = oldSignMin;\n"
     "    saveData();\n"
     "    test('英文皇室标注已渲染', $$('.h2-en').length >= 3 && !!$('.kicker-en') && !!$('.brand-eyebrow'));\n"
     "    test('纹章动效层已就绪', !!$('.royal-aura') && !!$('.royal-dust'));\n"
     "    test('导师多套服装已配置', ['court', 'star', 'rose'].indexOf(state.data.settings.teacherOutfit) >= 0 && !!document.getElementById('teacher-art'));\n"
     "    if (window.__classtickTeacher) window.__classtickTeacher.setOutfit('star');\n"
     "    test('导师换装生效', (document.getElementById('teacher-art').getAttribute('src') || '').indexOf('full-star') >= 0);\n"
     "    if (window.__classtickTeacher) window.__classtickTeacher.setOutfit(state.data.settings.teacherOutfit || 'court');\n"
     "    test('AI 对话配置已就绪', state.data.settings.llmOn === false && !!document.querySelector('[data-setting=\"llmOn\"]') && typeof window.__classtickTeacher.llm.ask === 'function');")
], "selftest")

# ---------------------------------------------------------- 17. 测试钩子扩展
APP = replace_pairs(APP, [
    ("    try: function (text) { return teacherIntent(text); },\n    state: teacherState\n  };",
     "    try: function (text) { return teacherIntent(text); },\n    state: teacherState,\n"
     "    setOutfit: function (key) { if (!OUTFITS[key]) return false; state.data.settings.teacherOutfit = key; applyTeacherOutfit(false); return true; },\n"
     "    cycleOutfit: cycleTeacherOutfit,\n"
     "    decorate: decorateEnglish,\n"
     "    llm: {\n"
     "      ready: llmReady,\n"
     "      ask: askLLM,\n"
     "      test: testLLM,\n"
     "      configure: function (patch) {\n"
     "        Object.assign(state.data.settings, patch || {});\n"
     "        saveData();\n"
     "        updateTeacherAI();\n"
     "        return state.data.settings;\n"
     "      }\n"
     "    }\n  };")
], "hooks")

write("assets/app.js", APP)
print("[OK] assets/app.js 润色完成")

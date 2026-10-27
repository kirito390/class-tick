#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""课刻 ClassTick · 皇家导师（可交互课表管家）接入脚本"""

import json
import os
import sys

RESUME = True  # 已应用过的补丁跳过，便于断点续跑

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8", newline="") as f:
        f.write(text)


def replace_region(text, start, end, new, label=""):
    try:
        i = text.index(start)
        j = text.index(end, i)
    except ValueError:
        print("[FAIL] %s: 找不到区域" % label)
        sys.exit(1)
    return text[:i] + new + text[j:]


def replace_pairs(text, pairs, label=""):
    for old, new in pairs:
        count = text.count(old)
        if count == 0 and RESUME:
            print("  [skip] %s: 已应用过" % label)
            continue
        if count != 1:
            print("[FAIL] %s: 匹配 %d 次（应为 1）：%r" % (label, count, old[:80]))
            sys.exit(1)
        text = text.replace(old, new, 1)
    return text


# ============================================================ core.js：新增设置项
CORE = read("assets/core.js")
CORE = replace_pairs(CORE, [
    ("  var DEFAULT_SETTINGS = {\n    skin: 'royal',",
     "  var DEFAULT_SETTINGS = {\n    skin: 'royal',\n    teacher: true,"),
    ("    data.settings = {\n      skin: ['royal', 'classic'].indexOf(s.skin) === -1 ? 'royal' : s.skin,",
     "    data.settings = {\n      skin: ['royal', 'classic'].indexOf(s.skin) === -1 ? 'royal' : s.skin,\n      teacher: s.teacher !== false,")
], "core")
write("assets/core.js", CORE)
print("[OK] core.js")

# ============================================================ index.html
IDX = read("index.html")
IDX = replace_pairs(IDX, [
    ('  <link rel="stylesheet" href="assets/royal.css">\n',
     '  <link rel="stylesheet" href="assets/royal.css">\n  <link rel="stylesheet" href="assets/teacher.css">\n')
], "index.html:css")

DOCK = r'''
  <!-- 皇家导师：可交互的课表管家 -->
  <div class="teacher-dock" id="teacher-dock" hidden>
    <div class="teacher-bubble" id="teacher-bubble" hidden>
      <p id="teacher-bubble-text"></p>
      <div class="teacher-bubble-actions" id="teacher-bubble-actions"></div>
    </div>
    <button class="teacher-fab" data-action="teacher-open" aria-label="呼叫皇家导师艾莉丝">
      <img class="teacher-fab-img" src="assets/teacher/chibi.webp" alt="" width="64" height="64">
      <span class="teacher-fab-ring" aria-hidden="true"></span>
      <span class="teacher-fab-dot" aria-hidden="true"></span>
    </button>
  </div>

  <dialog class="sheet teacher-sheet" id="dlg-teacher" aria-labelledby="teacher-dialog-title">
    <div class="teacher-stage">
      <img class="teacher-art" src="assets/teacher/full.webp" alt="皇家导师艾莉丝立绘">
      <div class="teacher-stage-caption">
        <span>ROYAL TUTOR</span>
        <b>艾莉丝 · 瓦尔登</b>
        <i>「朝程、鸣钟与落印，交由我记着。」</i>
      </div>
    </div>
    <div class="teacher-chat">
      <header class="teacher-head">
        <span class="teacher-avatar"><img id="teacher-avatar-img" src="assets/teacher/bust.webp" alt=""></span>
        <div class="teacher-head-text">
          <h2 id="teacher-dialog-title">皇家导师 · 艾莉丝</h2>
          <p id="teacher-status">正在为你核对朝程…</p>
        </div>
        <div class="teacher-head-actions">
          <button class="icon-btn" data-action="teacher-tips" title="给我一点指引" aria-label="给我一点指引">?</button>
          <button class="icon-btn" data-action="teacher-settings" title="导师与传令设置" aria-label="导师与传令设置">⚙</button>
          <button class="icon-btn" data-action="close-dialog" aria-label="关闭">×</button>
        </div>
      </header>
      <div class="teacher-log" id="teacher-log" aria-live="polite"></div>
      <div class="teacher-quick" id="teacher-quick"></div>
      <form class="teacher-input" id="teacher-form">
        <input id="teacher-text" type="text" autocomplete="off"
               placeholder="对艾莉丝说：早报改到 7:00 / 签到提前 5 分钟 / 换成深色…"
               aria-label="对皇家导师说话">
        <button type="submit" class="text-btn solid small">进言</button>
      </form>
    </div>
  </dialog>
'''
anchor = '  <div class="reminder-stack" id="reminder-stack" aria-live="assertive"></div>'
IDX = replace_pairs(IDX, [(anchor, DOCK + "\n" + anchor)], "index.html:dock")
write("index.html", IDX)
print("[OK] index.html")

# ============================================================ sw.js
SW = read("sw.js")
SW = replace_pairs(SW, [
    ("const CACHE = 'classtick-v1.1.0-royal';", "const CACHE = 'classtick-v1.2.0-teacher';"),
    ("  './assets/royal/rose-window.webp',\n",
     "  './assets/royal/rose-window.webp',\n"
     "  './assets/teacher.css',\n"
     "  './assets/teacher/full.webp',\n"
     "  './assets/teacher/bust.webp',\n"
     "  './assets/teacher/thinking.webp',\n"
     "  './assets/teacher/chibi.webp',\n")
], "sw.js")
write("sw.js", SW)
print("[OK] sw.js")

# ============================================================ manifest：新增导师快捷方式
MAN = read("manifest.webmanifest")
try:
    manifest = json.loads(MAN)
except Exception as exc:
    print("[FAIL] manifest 解析失败：%s" % exc)
    sys.exit(1)
shortcuts = manifest.setdefault("shortcuts", [])
if not any(item.get("url") == "./?teacher=1" for item in shortcuts):
    shortcuts.append({
        "name": "呼叫皇家导师",
        "short_name": "皇家导师",
        "url": "./?teacher=1",
        "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]
    })
write("manifest.webmanifest", json.dumps(manifest, ensure_ascii=False, indent=2) + chr(10))
print("[OK] manifest")

# ============================================================ app.js
APP = read("assets/app.js")

TEACHER = r'''  // ============================================================ 皇家导师 · 艾莉丝

  var TEACHER = {
    name: '艾莉丝·瓦尔登',
    short: '艾莉丝',
    avatar: 'assets/teacher/bust.webp',
    thinking: 'assets/teacher/thinking.webp',
    chibi: 'assets/teacher/chibi.webp'
  };

  var teacherState = { greeted: false, busy: false, tipShown: false };

  var CN_NUM = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

  function cnToInt(input) {
    var s = String(input == null ? '' : input).trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    var total = 0, num = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (CN_NUM[ch] != null) { num = CN_NUM[ch]; }
      else if (ch === '十') { total += (num || 1) * 10; num = 0; }
      else if (ch === '百') { total += (num || 1) * 100; num = 0; }
      else { return null; }
    }
    return total + num;
  }

  /** 从一句话里解析时间："早报改到 7:00" / "晚上8点" / "七点半" */
  function parseClockText(text) {
    var t = String(text || '').replace(/\s/g, '');
    var m = /(\d{1,2}|[零一二两三四五六七八九十]{1,3})\s*[:：点時时]\s*(\d{1,2}|[零一二两三四五六七八九十]{1,3}|半)?/.exec(t);
    if (!m) return null;
    var h = cnToInt(m[1]);
    if (h == null) return null;
    var mi = 0;
    if (m[2] === '半') mi = 30;
    else if (m[2]) { mi = cnToInt(m[2]); if (mi == null) mi = 0; }
    if (/(下午|傍晚|晚上|夜里|今晚)/.test(t) && h < 12) h += 12;
    if (h > 23 || mi > 59) return null;
    return C.pad2(h) + ':' + C.pad2(mi);
  }

  function parseMinutesText(text) {
    var m = /(\d{1,3}|[零一二两三四五六七八九十]{1,3})\s*(?:分钟|分)/.exec(String(text || ''));
    if (!m) return null;
    var num = cnToInt(m[1]);
    return num == null ? null : num;
  }

  function teacherDockEl() { return $('#teacher-dock'); }
  function teacherOpen() { var dlg = $('#dlg-teacher'); return !!(dlg && dlg.open); }

  function updateTeacherDock() {
    var dock = teacherDockEl();
    if (!dock) return;
    var on = !!(state.data && state.data.settings.teacher !== false);
    dock.hidden = !on;
    if (!on) hideTeacherBubble(false);
  }

  function renderTeacherStatus() {
    var el = $('#teacher-status');
    if (!el || !state.data) return;
    var n = now();
    var next = C.nextItem(state.data, n);
    if (!next) { el.textContent = T('今日朝程已空 · 待命中', '暂无课程 · 待命中'); return; }
    var it = next.item;
    var rel = C.relativeDayLabel(it.start, n);
    el.textContent = (next.state === 'now'
      ? T('正在开讲《{n}》', '正在上课《{n}》')
      : T('下一节《{n}》 · {rel} {time} 开讲', '下一节《{n}》 · {rel} {time} 上课')
    ).replace('{n}', it.name).replace('{rel}', rel).replace('{time}', C.minToHm(it.startMin));
  }

  function teacherLogEl() { return $('#teacher-log'); }
  function teacherScroll() {
    var log = teacherLogEl();
    if (log) log.scrollTop = log.scrollHeight;
  }

  function teacherBubble(role, html, actions) {
    var log = teacherLogEl();
    if (!log) return null;
    var wrap = document.createElement('div');
    wrap.className = 'teacher-msg is-' + role;
    var avatar = role === 'teacher'
      ? '<span class="teacher-msg-avatar"><img src="' + TEACHER.avatar + '" alt=""></span>'
      : '';
    var acts = '';
    if (actions && actions.length) {
      acts = '<div class="teacher-msg-actions">' + actions.map(function (a) {
        return '<button class="text-btn tiny ' + (a.primary ? 'solid' : 'bordered') + '" data-action="teacher-do" data-teach-act="' + esc(a.act) + '"' +
          (a.arg != null ? ' data-teach-arg="' + esc(a.arg) + '"' : '') + '>' + esc(a.label) + '</button>';
      }).join('') + '</div>';
    }
    wrap.innerHTML = avatar + '<div class="teacher-msg-body">' + html + acts + '</div>';
    log.appendChild(wrap);
    teacherScroll();
    return wrap;
  }

  function teacherTyping() {
    var av = $('#teacher-avatar-img');
    if (av) av.src = TEACHER.thinking;
    return teacherBubble('teacher', '<span class="teacher-typing"><i></i><i></i><i></i></span>');
  }

  function teacherSay(html, actions, delay) {
    var typing = teacherTyping();
    setTimeout(function () {
      if (typing && typing.parentNode) typing.remove();
      teacherBubble('teacher', html, actions);
      var av = $('#teacher-avatar-img');
      if (av) av.src = TEACHER.avatar;
      teacherState.busy = false;
      teacherScroll();
    }, delay == null ? 460 : delay);
    teacherState.busy = true;
  }

  function teacherHelpHTML() {
    return '<p>殿下可以这样吩咐我：</p>' +
      '<p>· <b>调整传令</b>：「早报改到 7:00」「课前提醒提前 30 分钟」「签到提前 5 分钟」「关掉晚间预告」</p>' +
      '<p>· <b>查看朝程</b>：「今天有什么课」「下一节几点」「本周几节课」「明天有课吗」</p>' +
      '<p>· <b>换装与工具</b>：「换成深色」「换回学院皮肤」「导出日历」「重新认识你」</p>';
  }

  function teacherTodayReply() {
    var items = C.dayItems(state.data, now());
    if (!items.length) {
      return {
        html: '<p>今日朝程已空。殿下可以安心休整，或去「课程纹册」补一补。</p>',
        actions: [{ label: '去课程纹册', act: 'goto-courses', primary: true }]
      };
    }
    var lines = items.map(function (it) {
      return '<p>· <b>' + C.minToHm(it.startMin) + '–' + C.minToHm(it.endMin) + '</b> 《' + esc(it.name) + '》' +
        (it.room ? ' · ' + esc(it.room) : '') +
        (it.bring.length ? '<br><span class="teacher-soft">行囊：' + esc(it.bring.join('、')) + '</span>' : '') + '</p>';
    }).join('');
    return { html: '<p>今日共 <b>' + items.length + ' 节课</b>：</p>' + lines };
  }

  function teacherNextReply() {
    var n = now();
    var cur = C.currentItem(state.data, n);
    var next = C.nextItem(state.data, n);
    if (!next) return { html: '<p>未来两周暂无朝程。殿下要不要先册封一节课？</p>', actions: [{ label: '册封课程', act: 'start-course', primary: true }] };
    var it = next.item;
    var cd = C.formatCountdown(it.start, n);
    return {
      html: '<p>' + (cur && next.state === 'now'
        ? '此刻正在开讲 <b>《' + esc(it.name) + '》</b>，还有 <b>' + (it.endMin - C.minuteOfDay(n)) + ' 分钟</b>散课。'
        : '下一节是 <b>《' + esc(it.name) + '》</b>，' + C.relativeDayLabel(it.start, n) + ' <b>' + C.minToHm(it.startMin) + '</b> 开讲' + (cd.ms > 0 ? '，距开讲还有 <b>' + cd.text + '</b>' : '') + '。') +
        '</p><p>地点：<b>' + esc(it.room || T('殿堂待定', '地点待定')) + '</b> · ' + esc(it.periodLabel) + (it.teacher ? ' · ' + esc(it.teacher) : '') +
        (it.bring.length ? '<br><span class="teacher-soft">随身行囊：' + esc(it.bring.join('、')) + '</span>' : '') + '</p>',
      actions: [{ label: '打开今日朝程', act: 'goto-today' }]
    };
  }

  function teacherTodaySummary() {
    var items = C.dayItems(state.data, now());
    var next = C.nextItem(state.data, now());
    var head = items.length ? '今日有 <b>' + items.length + ' 节课</b>' : '今日朝程已空';
    if (next && next.state === 'now') return head + '，此刻正在开讲《' + esc(next.item.name) + '》。';
    if (next) return head + '，下一节《' + esc(next.item.name) + '》' + C.relativeDayLabel(next.item.start, now()) + ' ' + C.minToHm(next.item.startMin) + ' 开讲。';
    return head + '。';
  }

  function teacherApply() {
    saveData();
    renderAll();
  }

  function teacherIntent(raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!text) return { html: '<p>殿下请讲，我在听。</p>' };
    var s = state.data.settings;
    var t = text.toLowerCase();
    var n = now();

    if (/^(你是谁|介绍.*自己|你叫什么|你的名字)/.test(text)) {
      return { html: '<p>我是 <b>艾莉丝·瓦尔登</b>，受命协助殿下打理课业的皇家导师。朝程、鸣钟、落印，都可以交给我。</p>' };
    }
    if (/(你能做什么|能帮我做什么|怎么用|帮助|指引|不会用|hello|hi|在吗|你好|您好)/.test(t)) {
      return { html: teacherHelpHTML(), actions: [{ label: '今天有什么课', act: 'say', arg: '今天有什么课' }, { label: '签到提前 5 分钟', act: 'say', arg: '签到提前 5 分钟' }] };
    }
    if (/^(谢谢|多谢|辛苦|感谢)/.test(text)) {
      return { html: '<p>殿下客气了。能为您省下几分钟，便是我最大的荣幸。</p>' };
    }
    if (/(重新认识|重置导师|重新介绍)/.test(text)) {
      localStorage.removeItem('classtick.teacherSeen');
      teacherState.greeted = false;
      setTimeout(function () { teacherGreet(true); }, 120);
      return { html: '<p>好，那就当是初次见面。</p>' };
    }
    if (/(隐藏|退下|关掉导师|不要导师|再见)/.test(text) && /(导师|艾莉丝|你)/.test(text)) {
      s.teacher = false;
      teacherApply();
      setTimeout(closeTeacher, 900);
      return { html: '<p>那我先退下了。殿下若想我再侍奉，可在「御前设置 → 皇家导师」中唤回。</p>' };
    }

    // 早报时间
    if (/(早报|晨钟|诏书)/.test(text)) {
      var dtime = parseClockText(text);
      if (dtime) {
        s.digestTime = dtime;
        s.digestOn = true;
        teacherApply();
        return {
          html: '<p>遵命，<b>晨钟早报</b>已改为 <b>' + dtime + '</b>，并重新执掌。届时我会把今日朝程与行囊一并呈上。</p>',
          actions: [{ label: '看今日朝程', act: 'goto-today' }]
        };
      }
      return { html: '<p>现在的晨钟早报是 <b>' + s.digestTime + '</b>。殿下想改到几点？可以说「早报改到 7:00」。</p>' };
    }

    // 关闭 / 开启四类传令
    var channels = [
      { re: /(早报|晨钟|诏书)/, key: 'digestOn', name: '晨钟早报' },
      { re: /(课前|鸣钟|出发)/, key: 'preOn', name: '鸣钟示警' },
      { re: /(签到)/, key: 'signOn', name: '御前签到' },
      { re: /(晚间|暮色|预告)/, key: 'eveningOn', name: '暮色预告' }
    ];
    var off = /(关闭|关掉|停掉|不要|取消|别提醒|静音)/.test(text);
    var on = /(开启|打开|恢复|启用)/.test(text);
    if (off || on) {
      for (var i = 0; i < channels.length; i++) {
        if (channels[i].re.test(text)) {
          if (!off && channels[i].key === 'signOn' && /分钟/.test(text)) break;
          s[channels[i].key] = !!on;
          teacherApply();
          return { html: on
            ? '<p>遵命，<b>' + channels[i].name + '</b>已重新执掌。</p>'
            : '<p>已停掉<b>' + channels[i].name + '</b>。需要时随时唤我开启。</p>' };
        }
      }
    }

    // 课前提醒提前量
    if (/(课前|鸣钟|出发)/.test(text)) {
      var pm = parseMinutesText(text);
      if (pm != null) {
        s.preMin = C.clampInt(pm, 0, 120, 20);
        s.preOn = true;
        teacherApply();
        return { html: '<p>鸣钟示警已改为课前 <b>' + s.preMin + ' 分钟</b>。号角响起时，请随我启程。</p>' };
      }
      return { html: '<p>现在的鸣钟示警是课前 <b>' + s.preMin + ' 分钟</b>。殿下想改成几分钟？</p>' };
    }

    // 签到时间
    if (/签到/.test(text) && /(分钟|提前)/.test(text)) {
      var sm = parseMinutesText(text);
      if (sm != null) {
        s.signMin = C.clampInt(sm, 0, 30, 2);
        s.signOn = true;
        teacherApply();
        return { html: '<p>御前签到已改为课前 <b>' + s.signMin + ' 分钟</b>。落印之事，我会准时提醒。</p>' };
      }
      return { html: '<p>现在的御前签到是课前 <b>' + s.signMin + ' 分钟</b>。殿下想改成几分钟？</p>' };
    }

    // 主题
    if (/(深色|暗色|夜堡|夜晚模式)/.test(text)) {
      s.theme = 'dark';
      teacherApply();
      return { html: '<p>已为您换上 <b>夜堡</b> 主题，灯烛调暗了些。</p>' };
    }
    if (/(浅色|日间|白天模式)/.test(text)) {
      s.theme = 'light';
      teacherApply();
      return { html: '<p>已换上 <b>日间</b> 主题，纸页重新明亮起来。</p>' };
    }
    if (/(跟随系统|自动主题)/.test(text)) {
      s.theme = 'auto';
      teacherApply();
      return { html: '<p>主题已改为 <b>跟随系统</b>。</p>' };
    }

    // 皮肤
    if (/(学院|素纸|极简|经典皮肤)/.test(text)) {
      s.skin = 'classic';
      teacherApply();
      return { html: '<p>已切换为 <b>学院纸感</b> 皮肤。若想再披金冠，说一声「换回皇室」即可。</p>' };
    }
    if (/(皇室|皇家|金冠|典藏)/.test(text) && /(皮肤|换|主题)/.test(text)) {
      s.skin = 'royal';
      teacherApply();
      return { html: '<p>已披上 <b>皇室典藏</b> 皮肤。金冠与城堡，都回来了。</p>' };
    }

    // 今天 / 明天
    if (/(今天|今日).*(课|朝程)|今日朝程|今天的课/.test(text)) {
      return teacherTodayReply();
    }
    if (/明天.*(课|朝程)/.test(text)) {
      var tItems = C.dayItems(state.data, C.addDays(n, 1));
      if (!tItems.length) return { html: '<p>明日暂无朝程，殿下可安心筹备。</p>' };
      var lines = tItems.map(function (it) {
        return '<p>· <b>' + C.minToHm(it.startMin) + '</b> 《' + esc(it.name) + '》' + (it.room ? ' · ' + esc(it.room) : '') +
          (it.bring.length ? '<br><span class="teacher-soft">行囊：' + esc(it.bring.join('、')) + '</span>' : '') + '</p>';
      }).join('');
      return { html: '<p>明日共 <b>' + tItems.length + ' 节课</b>：</p>' + lines };
    }

    // 下一节 / 现在
    if (/(下一节|下节课|几点上课|还有多久|下一堂课|现在上什么)/.test(text)) {
      return teacherNextReply();
    }

    // 本周 / 学期
    if (/(本周|这周|一周).*(几节|多少|课)/.test(text)) {
      var week = C.semesterWeek(state.data.meta, n);
      var ws = C.weekStats(state.data, week);
      return { html: '<p>第 <b>' + week + '</b> 周共有 <b>' + ws.count + ' 节课</b>。工作日分布：' +
        [1, 2, 3, 4, 5, 6, 7].map(function (d) { return '周' + C.DAY_SHORT[d - 1] + ' ' + ws.days[d]; }).join(' · ') + '。</p>' };
    }
    if (/(第几周|开学|周数|学期)/.test(text)) {
      return { html: '<p>现在是第 <b>' + C.semesterWeek(state.data.meta, n) + '</b> 周，学期共 <b>' + state.data.meta.weeks + '</b> 周。若王历有偏差，可在设置里改开学日期。</p>', actions: [{ label: '去改学期信息', act: 'open-settings' }] };
    }

    // 添加课程
    if (/(加.*课|添加.*课|册封|新增.*课|排课)/.test(text)) {
      closeTeacher();
      setTimeout(function () { openCourseDialog(null); }, 180);
      return { html: '<p>好，册封新课程的卷轴已备好。</p>' };
    }

    // 导出 / 备份
    if (/(导出|下载|备份).*(日历|ics)/.test(t) || /日历文件/.test(text)) {
      exportICS();
      return { html: '<p>日历卷轴已生成：共 <b>' + C.buildICS(state.data).events + '</b> 个事件。导入系统日历后，即便我不在身旁，闹钟也会准时响起。</p>' };
    }
    if (/(导出|下载|备份).*(json|课表|纹册|档案)/.test(t)) {
      exportJSON();
      return { html: '<p>已把课表封入 JSON 档案，换设备时带它来见我即可。</p>' };
    }

    // 通知
    if (/(开启|打开).*(通知|传令|提醒权限)|通知权限/.test(text)) {
      enableNotifications();
      return { html: '<p>我这就向浏览器申请传令。</p>' };
    }
    if (/(测试|试一下).*(通知|传令|提醒)/.test(text)) {
      showSystemNotification(T('皇家导师 · 测试传令', '课程管家 · 测试通知'), T('若您看到这条传令，说明鸣钟之路畅通无阻。', '如果你看到这条通知，说明提醒链路是通的。'), { tag: 'classtick-test' });
      return { html: '<p>测试传令已发出。若您看到了它，鸣钟之路便是通的。</p>' };
    }

    // 签到 / 落印
    if (/^(签到|落印|打卡)/.test(text)) {
      var target = teacherCheckinTarget();
      if (!target) return { html: '<p>今日没有可落印的课。殿下想先看看朝程吗？</p>', actions: [{ label: '今日朝程', act: 'say', arg: '今天有什么课' }] };
      checkIn(target.key, target.date);
      return { html: '<p>已为 <b>《' + esc(target.name) + '》</b> 落印。迟到与否，我替您记着。</p>' };
    }

    // 未识别
    return {
      html: '<p>殿下恕罪，这一句我还没听明白。您可以试试：</p><p class="teacher-soft">「早报改到 7:00」「课前提醒提前 30 分钟」「签到提前 5 分钟」「今天有什么课」「换成深色」。</p>',
      actions: [
        { label: '今天有什么课', act: 'say', arg: '今天有什么课' },
        { label: '签到提前 5 分钟', act: 'say', arg: '签到提前 5 分钟' },
        { label: '换成深色', act: 'say', arg: '换成深色' }
      ]
    };
  }

  function teacherCheckinTarget() {
    var n = now();
    var items = C.dayItems(state.data, n);
    var m = C.minuteOfDay(n);
    for (var i = 0; i < items.length; i++) {
      if (items[i].endMin > m) return items[i];
    }
    return null;
  }

  function teacherRespond(raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!text) return;
    teacherBubble('user', '<p>' + esc(text) + '</p>');
    var input = $('#teacher-text');
    if (input) input.value = '';
    var reply = teacherIntent(text) || {};
    teacherSay(reply.html || '<p>殿下恕罪，这句我还没听明白。</p>', reply.actions || null, 520);
  }

  function teacherGreet(force) {
    var log = teacherLogEl();
    if (!log) return;
    var seen = localStorage.getItem('classtick.teacherSeen') === '1';
    if (teacherState.greeted && !force) return;
    teacherState.greeted = true;
    log.innerHTML = '';
    var intro = '<p>' + (seen ? '殿下，午安。' : '殿下，初次见面。') +
      '我是皇家导师 <b>' + TEACHER.name + '</b>，从今往后，朝程、鸣钟与落印都由我替您记着。</p>' +
      '<p class="teacher-soft">您可以直接吩咐我，例如「早报改到 7:00」「签到提前 5 分钟」「换成深色」。若想先听听我能做什么，问一句「你能做什么」便好。</p>';
    teacherBubble('teacher', intro);
    localStorage.setItem('classtick.teacherSeen', '1');
    setTimeout(function () {
      teacherBubble('teacher', '<p>' + teacherTodaySummary() + '</p>', [
        { label: '今天有什么课', act: 'say', arg: '今天有什么课' },
        { label: '下一节几点', act: 'say', arg: '下一节几点' },
        { label: '签到提前 5 分钟', act: 'say', arg: '签到提前 5 分钟' },
        { label: '你能做什么', act: 'say', arg: '你能做什么' }
      ]);
      teacherScroll();
    }, 560);
  }

  function teacherQuickChips() {
    var box = $('#teacher-quick');
    if (!box) return;
    var chips = [
      ['今天有什么课', 'say', '今天有什么课'],
      ['下一节几点', 'say', '下一节几点'],
      ['早报改到 7:00', 'say', '早报改到 7:00'],
      ['课前提前 30 分钟', 'say', '课前提醒提前 30 分钟'],
      ['签到提前 5 分钟', 'say', '签到提前 5 分钟'],
      [isRoyal() ? '换成深色' : '换成浅色', 'say', isRoyal() ? '换成深色' : '换成浅色'],
      ['导出日历', 'export-ics', null],
      ['你能做什么', 'say', '你能做什么']
    ];
    box.innerHTML = chips.map(function (c) {
      return '<button class="text-btn tiny" data-action="teacher-do" data-teach-act="' + c[1] + '"' +
        (c[2] != null ? ' data-teach-arg="' + esc(c[2]) + '"' : '') + '>' + esc(c[0]) + '</button>';
    }).join('');
  }

  function openTeacher() {
    var dlg = $('#dlg-teacher');
    if (!dlg) return;
    hideTeacherBubble(true);
    updateTeacherDock();
    if (!dlg.open) dlg.showModal();
    teacherQuickChips();
    renderTeacherStatus();
    teacherGreet(false);
    setTimeout(function () {
      var input = $('#teacher-text');
      if (input && !('ontouchstart' in window)) input.focus();
    }, 140);
  }

  function closeTeacher() {
    var dlg = $('#dlg-teacher');
    if (dlg && dlg.open) dlg.close();
  }

  function teacherDo(act, arg) {
    switch (act) {
      case 'say':
        teacherRespond(arg || '');
        break;
      case 'enable-notify':
        enableNotifications().then(function () {
          var granted = ('Notification' in window) && Notification.permission === 'granted';
          teacherSay(granted
            ? '<p>传令已通。课前 2 分钟，我会准时呈上落印提醒。</p>'
            : '<p>浏览器似乎仍不许传令。请点地址栏左侧的锁图标，把「通知」改为允许。</p>');
        });
        break;
      case 'start-course':
        closeTeacher();
        setTimeout(function () { openCourseDialog(null); }, 160);
        break;
      case 'export-ics':
        exportICS();
        teacherSay('<p>日历卷轴已生成：共 <b>' + C.buildICS(state.data).events + '</b> 个事件，导入系统日历即可。</p>');
        break;
      case 'export-json':
        exportJSON();
        teacherSay('<p>已把课表封入 JSON 档案。</p>');
        break;
      case 'goto-today':
        closeTeacher();
        setTab('today');
        break;
      case 'goto-courses':
        closeTeacher();
        setTab('courses');
        break;
      case 'open-settings':
        closeTeacher();
        setTab('settings');
        break;
      case 'hide-teacher':
        state.data.settings.teacher = false;
        teacherApply();
        closeTeacher();
        toast(T('导师已退下，可在「御前设置」中唤回', '助手已隐藏，可在设置中重新开启'));
        break;
      case 'reintro':
        localStorage.removeItem('classtick.teacherSeen');
        teacherState.greeted = false;
        openTeacher();
        break;
      case 'dismiss-tip':
        hideTeacherBubble(true);
        break;
      case 'checkin': {
        var target = teacherCheckinTarget();
        if (target) {
          checkIn(target.key, target.date);
          teacherSay('<p>已为 <b>《' + esc(target.name) + '》</b> 落印。</p>');
        }
        break;
      }
      case 'test-notify':
        showSystemNotification(T('皇家导师 · 测试传令', '课程管家 · 测试通知'), T('鸣钟之路畅通无阻。', '如果你看到这条通知，说明提醒链路是通的。'), { tag: 'classtick-test' });
        teacherSay('<p>测试传令已发出。</p>');
        break;
      default:
        break;
    }
  }

  function showTeacherBubble(html, actions) {
    var bubble = $('#teacher-bubble');
    if (!bubble) return;
    var text = $('#teacher-bubble-text');
    var acts = $('#teacher-bubble-actions');
    if (text) text.innerHTML = html;
    if (acts) {
      acts.innerHTML = (actions || []).map(function (a) {
        return '<button class="text-btn ' + (a.primary ? 'solid' : 'bordered') + ' tiny" data-action="teacher-do" data-teach-act="' + esc(a.act) + '"' +
          (a.arg != null ? ' data-teach-arg="' + esc(a.arg) + '"' : '') + '>' + esc(a.label) + '</button>';
      }).join('');
    }
    bubble.hidden = false;
    teacherState.tipShown = true;
  }

  function hideTeacherBubble(persist) {
    var bubble = $('#teacher-bubble');
    if (bubble) bubble.hidden = true;
    if (persist) {
      try { sessionStorage.setItem('classtick.teacherTip', '1'); } catch (e) { /* ignore */ }
    }
  }

  function teacherTipTick() {
    if (!state.data || state.data.settings.teacher === false) return;
    if (teacherOpen() || teacherState.tipShown) return;
    try { if (sessionStorage.getItem('classtick.teacherTip') === '1') return; } catch (e) { /* ignore */ }
    var s = state.data.settings;
    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    var n = now();
    var next = C.nextItem(state.data, n);

    if (perm !== 'granted') {
      showTeacherBubble('<b>还差一步</b>：允许系统通知，我才能在课前 2 分钟提醒殿下落印。', [
        { label: '去开启传令', act: 'enable-notify', primary: true },
        { label: '稍后再说', act: 'dismiss-tip' }
      ]);
      return;
    }
    if (state.demo) {
      showTeacherBubble('<b>示例纹册</b>已备好。要现在换成殿下自己的课表吗？', [
        { label: '开始册封', act: 'start-course', primary: true },
        { label: '先看看', act: 'dismiss-tip' }
      ]);
      return;
    }
    if (next) {
      var it = next.item;
      var cd = C.formatCountdown(it.start, n);
      showTeacherBubble('殿下，' + (next.state === 'now' ? '此刻正在开讲' : '下一节') +
        '《' + esc(it.name) + '》' + (it.room ? ' · ' + esc(it.room) : '') +
        (cd.ms > 0 && next.state !== 'now' ? '，还有 ' + cd.text : '') + '。' +
        (it.bring.length ? '<br>行囊：' + esc(it.bring.join('、')) : ''), [
        { label: '打开朝程', act: 'goto-today', primary: true },
        { label: '调一调传令', act: 'open-settings' },
        { label: '知道啦', act: 'dismiss-tip' }
      ]);
    }
  }

  function initTeacher() {
    updateTeacherDock();
    renderTeacherStatus();
    teacherQuickChips();
    var form = $('#teacher-form');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var input = $('#teacher-text');
        if (input) teacherRespond(input.value);
      });
    }
    setTimeout(teacherTipTick, 2600);
  }

  // ============================================================ 主循环
'''
APP = replace_region(APP,
    "  // ============================================================ 主循环",
    "  function tick() {",
    TEACHER, "teacher-module")

# 设置页加入「皇家导师」面板
APP = replace_pairs(APP, [
    ("    html += '<section class=\"panel\"><div class=\"panel-head\"><h2>' + T('外观与关于', '外观与关于') + '</h2></div>' +",
     "    html += '<section class=\"panel\"><div class=\"panel-head\"><h2>' + T('皇家导师', '课程管家') + '</h2><span class=\"panel-sub\">' + T('可交互的课表管家', '可交互的课程助手') + '</span></div>' +\n"
     "      switchRow('data-setting=\"teacher\"' + (s.teacher !== false ? ' checked' : ''), T('显示皇家导师', '显示课程助手'), T('点左下角头像，可唤来艾莉丝调整传令与查看朝程', '点左下角头像，可唤来助手调整提醒与查看课表')) +\n"
     "      '<div class=\"btn-grid\"><button class=\"text-btn solid\" data-action=\"teacher-open\">' + T('唤来艾莉丝', '打开助手') + '</button>' +\n"
     "      '<button class=\"text-btn bordered\" data-action=\"teacher-reintro\">' + T('重新认识艾莉丝', '重新介绍') + '</button></div>' +\n"
     "      '<p class=\"hint\">' + T('她可以直接改设置：早报时间、鸣钟提前量、签到分钟数、皮肤与主题，还能查看朝程、导出日历、打开签到入口。', '对话可以直接改设置：早报时间、课前提前量、签到分钟数、皮肤与主题，还能查看课表、导出日历。') + '</p></section>' +\n\n"
     "      '<section class=\"panel\"><div class=\"panel-head\"><h2>' + T('外观与关于', '外观与关于') + '</h2></div>' +")
], "settings-teacher")

# 通知图标：皇室皮肤下用导师 chibi
APP = replace_pairs(APP, [
    ("      icon: 'icons/icon-192.png',\n      badge: 'icons/badge-96.png',",
     "      icon: isRoyal() ? TEACHER.chibi : 'icons/icon-192.png',\n      badge: 'icons/badge-96.png',")
], "notify-icon")

# 设置 change：导师开关
APP = replace_pairs(APP, [
    ("      if (key === 'skin') {\n        applySkin();\n        renderAll();\n        return;\n      }",
     "      if (key === 'teacher') {\n        updateTeacherDock();\n        renderAll();\n        return;\n      }\n      if (key === 'skin') {\n        applySkin();\n        renderAll();\n        return;\n      }")
], "settings-teacher-change")

# renderAll 末尾刷新导师状态
APP = replace_pairs(APP, [
    ("    renderCourses();\n    renderSettings();\n  }",
     "    renderCourses();\n    renderSettings();\n    updateTeacherDock();\n    renderTeacherStatus();\n  }")
], "renderAll-teacher")

# tick 刷新导师状态
APP = replace_pairs(APP, [
    ("    renderTopbar();\n    if (state.tab === 'today') renderToday();\n    checkReminders();",
     "    renderTopbar();\n    if (state.tab === 'today') renderToday();\n    if (teacherOpen()) renderTeacherStatus();\n    checkReminders();")
], "tick-teacher")

# onClick 新增导师动作
APP = replace_pairs(APP, [
    ("      case 'notify':\n        enableNotifications();\n        break;",
     "      case 'notify':\n        enableNotifications();\n        break;\n      case 'teacher-open':\n        openTeacher();\n        break;\n      case 'teacher-do':\n        teacherDo(target.dataset.teachAct, target.dataset.teachArg);\n        break;\n      case 'teacher-settings':\n        closeTeacher();\n        setTab('settings');\n        break;\n      case 'teacher-tips':\n        teacherSay(teacherHelpHTML(), null, 180);\n        break;\n      case 'teacher-reintro':\n        teacherState.greeted = false;\n        localStorage.removeItem('classtick.teacherSeen');\n        openTeacher();\n        break;\n      case 'teacher-hide':\n        state.data.settings.teacher = false;\n        saveData();\n        renderAll();\n        closeTeacher();\n        toast(T('导师已退下，可在「御前设置」中唤回', '助手已隐藏，可在设置中重新开启'));\n        break;")
], "onClick-teacher")

# onSubmit：导师输入框
APP = replace_pairs(APP, [
    ("    if (event.target.id === 'course-form') {",
     "    if (event.target.id === 'teacher-form') {\n      event.preventDefault();\n      var teacherInput = $('#teacher-text');\n      if (teacherInput) teacherRespond(teacherInput.value);\n      return;\n    }\n    if (event.target.id === 'course-form') {")
], "onSubmit-teacher")

# 自测：导师检查 + 意图改设置
APP = replace_pairs(APP, [
    ("    test('皇家文案已生效', !!document.querySelector('.tab[data-tab=\"today\"] span') && document.querySelector('.tab[data-tab=\"today\"] span').textContent.indexOf('今日') >= 0 && document.querySelector('#hero-slot .hero-kicker') != null && document.querySelector('#hero-slot .hero-kicker').textContent.indexOf('开讲') >= 0);",
     "    test('皇家文案已生效', !!document.querySelector('.tab[data-tab=\"today\"] span') && document.querySelector('.tab[data-tab=\"today\"] span').textContent.indexOf('今日') >= 0 && document.querySelector('#hero-slot .hero-kicker') != null && document.querySelector('#hero-slot .hero-kicker').textContent.indexOf('开讲') >= 0);\n"
     "    test('皇家导师界面已就绪', !!document.getElementById('dlg-teacher') && !!document.getElementById('teacher-fab') && document.getElementById('teacher-dock') != null && !document.getElementById('teacher-dock').hidden);\n"
     "    var oldSignMin = state.data.settings.signMin;\n"
     "    if (window.__classtickTeacher) window.__classtickTeacher.try('签到提前 5 分钟');\n"
     "    test('导师能听懂并修改设置', state.data.settings.signMin === 5, 'signMin=' + state.data.settings.signMin);\n"
     "    state.data.settings.signMin = oldSignMin;\n"
     "    saveData();")
], "selftest-teacher")

# init：初始化导师、?teacher=1 直接打开
APP = replace_pairs(APP, [
    ("    var tabParam = params.get('tab');\n    bindEvents();\n    renderAll();\n    setTab(tabParam && ['today', 'week', 'courses', 'settings'].indexOf(tabParam) >= 0 ? tabParam : 'today');\n    registerServiceWorker();",
     "    var tabParam = params.get('tab');\n    bindEvents();\n    renderAll();\n    setTab(tabParam && ['today', 'week', 'courses', 'settings'].indexOf(tabParam) >= 0 ? tabParam : 'today');\n    initTeacher();\n    registerServiceWorker();\n    if (params.get('teacher') === '1') setTimeout(openTeacher, 320);")
], "init-teacher")

# 暴露测试钩子
APP = replace_pairs(APP, [
    ("  if (document.readyState === 'loading') {",
     "  // 供 QA / 自测使用的轻量测试钩子\n"
     "  window.__classtickTeacher = {\n"
     "    open: openTeacher,\n"
     "    close: closeTeacher,\n"
     "    ask: teacherRespond,\n"
     "    try: function (text) { return teacherIntent(text); },\n"
     "    state: teacherState\n"
     "  };\n\n"
     "  if (document.readyState === 'loading') {")
], "teacher-hook")

write("assets/app.js", APP)
print("[OK] assets/app.js（含皇家导师模块）")

print("\n皇家导师接入完成。")

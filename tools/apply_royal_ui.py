#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""课刻 ClassTick · 皇室皮肤接入脚本（一次性使用）

把 app.js / index.html / style.css / sw.js / manifest 里的界面文案与皮肤开关
切换到「皇室典藏 / 学院纸感」双皮肤结构。
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8", newline="") as f:
        f.write(text)


def replace_pairs(text, pairs, label=""):
    for old, new in pairs:
        count = text.count(old)
        if count != 1:
            print("[FAIL] %s: 匹配 %d 次（应为 1）：%r" % (label, count, old[:70]))
            sys.exit(1)
        text = text.replace(old, new, 1)
    return text


def replace_region(text, start, end, new, label=""):
    try:
        i = text.index(start)
        j = text.index(end, i)
    except ValueError:
        print("[FAIL] %s: 找不到区域 %r / %r" % (label, start[:50], end[:50]))
        sys.exit(1)
    return text[:i] + new + text[j:]


# ============================================================ app.js

APP = read("assets/app.js")

# ---------- 1. 插入皮肤与文案基础设施 ----------
HELPERS = r'''  // ============================================================ 皮肤与皇家文案

  var previewSkin = (params.get('skin') === 'classic' || params.get('skin') === 'royal') ? params.get('skin') : null;

  // 九大纹章家族：课程颜色 → 家族名与家训（皇家皮肤下用于选色提示）
  var HOUSE = {
    tomato: { name: '赤狮', motto: '勇者先至' },
    teal: { name: '碧潮', motto: '潮起有时' },
    amber: { name: '金穗', motto: '勤耕必获' },
    sky: { name: '晴鹰', motto: '目及远方' },
    violet: { name: '紫鸢', motto: '静而有光' },
    olive: { name: '林鹿', motto: '深林自守' },
    rose: { name: '蔷薇', motto: '有刺亦芳' },
    sand: { name: '砂堡', motto: '寸土筑城' },
    ink: { name: '玄鸦', motto: '夜读不辍' }
  };

  function currentSkin() {
    if (previewSkin) return previewSkin;
    return (state.data && state.data.settings.skin === 'classic') ? 'classic' : 'royal';
  }
  function isRoyal() { return currentSkin() === 'royal'; }

  /** T(皇室文案, 学院文案, 变量)：按当前皮肤取文案，并替换 {变量} */
  function T(royal, classic, vars) {
    var text = isRoyal() ? royal : (classic == null ? royal : classic);
    return String(text).replace(/\{(\w+)\}/g, function (_, key) {
      return vars && vars[key] != null ? vars[key] : '';
    });
  }

  function dayStatusText(n) {
    if (!isRoyal()) return C.dayStatus(n);
    var m = C.minuteOfDay(n);
    if (m < 360) return '星辰已高悬，早些安寝';
    if (m < 540) return '晨安，今日亦当准时';
    if (m < 720) return '上午朝程，稳步前行';
    if (m < 840) return '午宴小憩，勿忘午后课程';
    if (m < 1080) return '午后安好，再接再厉';
    if (m < 1320) return '晚安时分，看看明日朝程';
    return '城堡熄灯，明日再会';
  }

  function royalReminderTitle(r) {
    if (!isRoyal()) return r.title;
    if (r.kind === 'digest' && r.items) return '晨间诏书 · 今日 ' + r.items.length + ' 节课';
    if (r.kind === 'evening' && r.items) return '暮色预告 · 明日 ' + r.items.length + ' 节';
    if (r.kind === 'pre') return '号角响起 · ' + state.data.settings.preMin + ' 分钟后开讲';
    if (r.kind === 'sign' && r.item) return '请落印签到 · ' + r.item.name;
    return r.title;
  }
  function royalReminderBody(r) {
    if (!isRoyal()) return r.body;
    if (r.kind === 'pre' && r.item) {
      return '《' + r.item.name + '》 · ' + (r.item.room || '殿堂待定') +
        (r.item.bring.length ? ' ｜ 随身行囊：' + r.item.bring.join('、') : '');
    }
    if (r.kind === 'sign' && r.item) {
      return (r.item.room ? r.item.room + ' · ' : '') + '还有 ' + state.data.settings.signMin + ' 分钟开讲，前往签到处落印';
    }
    return r.body;
  }

  function applyStaticLabels(skin) {
    var royal = skin === 'royal';
    var setText = function (sel, text) {
      var el = $(sel);
      if (el) el.textContent = text;
    };
    var tabText = {
      today: royal ? '今日朝程' : '今日',
      week: royal ? '本周王历' : '本周',
      courses: royal ? '课程纹册' : '课程',
      settings: royal ? '御前设置' : '设置'
    };
    $$('.tab').forEach(function (btn) {
      var span = btn.querySelector('span');
      if (span && tabText[btn.dataset.tab]) span.textContent = tabText[btn.dataset.tab];
    });
    setText('#today-title', royal ? '今日朝程' : '今天的课');
    var courseHeads = $$('#view-courses .panel h2');
    if (courseHeads[0]) courseHeads[0].textContent = royal ? '我的课程纹册' : '我的课程';
    if (courseHeads[1]) courseHeads[1].textContent = royal ? '王室档案库' : '数据与备份';
    var courseSub = $('#view-courses .panel-sub');
    if (courseSub) courseSub.textContent = royal ? '课表只封存在你自己的设备上' : '课表只存在你自己的设备上';
    setText('#dlg-import-title', royal ? '呈递课表' : '导入课表');
    setText('#dlg-confirm-title', royal ? '请御批确认' : '确认操作');
    setText('#dlg-about-title', royal ? '关于课刻 · 宫廷指南' : '关于课刻 · 安装指南');
    setText('#foot-note', royal ? '档案仅存于本机' : '数据仅保存在本机');
    var widgetSpan = $('#btn-widget span');
    if (widgetSpan) widgetSpan.textContent = royal ? '宫廷窗' : '小组件';
    document.title = royal ? '课刻 ClassTick · 皇家课程表' : '课刻 ClassTick · 把课表装进口袋和桌面';
    document.body.classList.toggle('is-royal', royal);
  }

  function applySkin() {
    var skin = currentSkin();
    document.documentElement.dataset.skin = skin;
    applyStaticLabels(skin);
    applyTheme();
  }

  // ============================================================ 小工具

  function now() {
'''
APP = replace_pairs(APP, [(
    "  // ============================================================ 小工具\n\n  function now() {\n",
    HELPERS
)], "helpers")

# ---------- 2. 主题与通知标签 ----------
APP = replace_region(APP,
    "  function applyTheme() {",
    "  // ============================================================ 顶栏",
    r'''  function applyTheme() {
    var theme = previewTheme || (state.data && state.data.settings.theme) || 'auto';
    document.documentElement.dataset.theme = theme;
    var royal = isRoyal();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', royal ? (dark ? '#141020' : '#241a44') : (dark ? '#12100e' : '#1f6f5c'));
    }
  }

''', "applyTheme")

APP = replace_region(APP,
    "  function notifyLabel() {",
    "  function renderTopbar() {",
    r'''  function notifyLabel() {
    var royal = isRoyal();
    if (!('Notification' in window)) return royal ? '不支持传令' : '不支持通知';
    if (Notification.permission === 'granted') return royal ? '传令已通' : '提醒已开启';
    if (Notification.permission === 'denied') return royal ? '传令受阻' : '提醒被拒绝';
    return royal ? '开启传令' : '开启提醒';
  }

''', "notifyLabel")

APP = replace_pairs(APP, [(
    "    if (foot) foot.textContent = '课刻 ClassTick · ' + (inTerm ? '第 ' + week + ' 周' : '假期中');",
    "    if (foot) foot.textContent = (isRoyal() ? '皇家典藏 · ' : '课刻 ClassTick · ') + (inTerm ? '第 ' + week + ' 周' : '假期中');"
)], "foot-week")

# ---------- 3. Hero ----------
APP = replace_region(APP,
    "  function heroHTML() {",
    "  // ============================================================ 今日：提示条",
    r'''  function heroHTML() {
    var data = state.data;
    var n = now();
    var next = C.nextItem(data, n);
    var todayItems = C.dayItems(data, n);
    var stats = C.dayStats(data, n);

    if (!next) {
      return '<section class="hero hero-empty">' +
        '<div class="hero-main">' +
        '<p class="hero-kicker">' + T('未来两周', '未来两周') + '</p>' +
        '<h2 class="hero-course">' + T('暂无朝程 🎈', '没有排课 🎈') + '</h2>' +
        '<p class="hero-meta"><span>' + ICONS.calendar + T('去「课程纹册」册封你的课表吧', '去「课程」里添加你的课表吧') + '</span></p>' +
        '</div>' +
        '<div class="hero-side"><button class="text-btn solid" data-action="course-new">' + T('册封课程', '添加课程') + '</button></div>' +
        '</section>';
    }

    var it = next.item;
    var cd = C.formatCountdown(it.start, n);
    var rel = C.relativeDayLabel(it.start, n);
    var isNow = next.state === 'now';
    var cdClass = cd.urgent ? ' is-urgent' : '';
    var signinBtn = '';
    if (!isNow && !isCheckedIn(it)) {
      signinBtn = '<button class="text-btn solid small" data-action="checkin" data-key="' + esc(it.key) + '" data-date="' + esc(it.date) + '">' + T('落印签到', '签到打卡') + '</button>';
    } else if (isCheckedIn(it)) {
      signinBtn = '<span class="signin-badge">' + ICONS.check + ' ' + T('已落印', '已签到') + '</span>';
    }

    var dialHTML = isNow
      ? '<div class="cd-dials' + cdClass + '">' + (function () {
        var remain = Math.max(0, Math.round((it.end - n) / 1000));
        return dialsHTML(Math.floor(remain / 3600), Math.floor((remain % 3600) / 60), remain % 60);
      })() + '</div>'
      : '<div class="cd-dials' + cdClass + '">' + dialsHTML(cd.hours, cd.minutes, cd.seconds) + '</div>';

    var heroFoot = todayItems.length
      ? T('今日 {c} 节课 · {t} 开讲 · 共 {h} 小时 {m} 分', '今天 {c} 节课 · {t} 开始 · 共 {h} 小时 {m} 分', {
        c: stats.count,
        t: C.minToHm(stats.first.startMin),
        h: Math.floor(stats.minutes / 60),
        m: stats.minutes % 60
      })
      : T('今日无课，{rel} {t} 有《{name}》', '今天没有课，{rel} {t} 有《{name}》', {
        rel: rel,
        t: C.minToHm(next.item.startMin),
        name: esc(next.item.name)
      });

    var countdownLabel = isNow
      ? T('距散课还有', '距离下课')
      : (rel === '今天' ? T('距开讲还有', '距离上课') : rel + T('开讲', '上课'));

    var countdownSub = isNow
      ? T('专心听讲，散课再会', '认真听讲，下课见')
      : (cd.urgent
        ? T('号角已响，即刻启程', '马上出发，别迟到')
        : T('提前 {n} 分钟启程正好', '提前 {n} 分钟出门刚好', { n: Math.min(20, Math.max(1, data.settings.preMin)) }));

    return '<section class="hero' + (isNow ? ' hero-now' : '') + '" style="--hero-tint:var(--c-' + esc(it.color) + ')">' +
      '<span class="hero-glow" aria-hidden="true"></span>' +
      '<div class="hero-main">' +
        '<p class="hero-kicker"><span class="pulse' + (isNow ? ' on' : '') + '"></span>' +
          (isNow ? T('正在开讲', '正在上课') : T('下一节 · 静候开讲', '下一节课')) +
          '<span class="kicker-sep">·</span>' + rel + ' ' + C.dayLabel(it.start) + ' ' + C.minToHm(it.startMin) + '–' + C.minToHm(it.endMin) +
        '</p>' +
        '<h2 class="hero-course">' + esc(it.name) + '</h2>' +
        '<p class="hero-meta">' +
          '<span>' + ICONS.pin + esc(it.room || T('殿堂待定', '地点待定')) + '</span>' +
          '<span>' + ICONS.clock + esc(it.periodLabel) + '</span>' +
          (it.teacher ? '<span>' + ICONS.user + esc(it.teacher) + '</span>' : '') +
        '</p>' +
        (it.bring.length ? '<p class="hero-bring">' + ICONS.bag + '<span>' + T('随身行囊', '携带') + '</span>' +
          it.bring.map(function (b) { return '<b>' + esc(b) + '</b>'; }).join('') + '</p>' : '') +
      '</div>' +
      '<div class="hero-side">' +
        '<div class="countdown">' +
          '<span class="cd-label">' + countdownLabel + '</span>' +
          dialHTML +
          '<span class="cd-sub">' + countdownSub + '</span>' +
        '</div>' +
        '<div class="hero-actions">' + signinBtn +
          (data.settings.signInUrl && !isCheckedIn(it) ? '<a class="text-btn bordered small" href="' + esc(data.settings.signInUrl) + '" target="_blank" rel="noreferrer">' + T('前往签到处', '签到入口') + '</a>' : '') +
        '</div>' +
      '</div>' +
      '<p class="hero-foot">' + heroFoot + '</p>' +
      '</section>';
  }

''', "heroHTML")

# ---------- 4. 提示条 ----------
APP = replace_region(APP,
    "  function noticeHTML() {",
    "  // ============================================================ 今日：时间线",
    r'''  function noticeHTML() {
    var out = '';
    if (state.demo) {
      out += '<div class="notice notice-demo">' +
        '<span class="notice-ico">' + ICONS.calendar + '</span>' +
        '<p>' + T('<b>示例纹册</b> · 换成你的课表即可使用', '<b>示例课表</b> · 换成你自己的就能用') + '</p>' +
        '<div class="notice-actions"><button class="text-btn solid tiny" data-action="goto-tab" data-tab="courses">' + T('换成我的', '换成我的') + '</button>' +
        '<button class="icon-btn" data-action="dismiss-demo" aria-label="关闭提示">×</button></div>' +
        '</div>';
      return out;
    }
    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    if (perm === 'default') {
      out += '<div class="notice notice-accent">' +
        '<span class="notice-ico">' + ICONS.bell + '</span>' +
        '<p>' + T('<b>开启传令</b>：晨钟诏书、课前 {p} 分钟鸣钟、课前 {s} 分钟御前签到。', '<b>开启提醒</b>：每日早报、课前 {p} 分钟、课前 {s} 分钟签到提醒。', { p: state.data.settings.preMin, s: state.data.settings.signMin }) + '</p>' +
        '<div class="notice-actions"><button class="text-btn solid tiny" data-action="notify">' + T('一键开启', '一键开启') + '</button></div>' +
        '</div>';
    } else if (perm === 'denied') {
      out += '<div class="notice notice-warn">' +
        '<span class="notice-ico">' + ICONS.bell + '</span>' +
        '<p>' + T('<b>传令被浏览器拦下</b>：点地址栏左侧的锁图标，把「通知」改为允许；或导出 .ics 交给系统日历提醒。', '<b>通知被浏览器拦截了</b>：点地址栏左侧的锁图标，把「通知」改为允许；或导出 .ics 交给系统日历提醒。') + '</p>' +
        '<div class="notice-actions"><button class="text-btn tiny bordered" data-action="export-ics">导出 .ics</button></div>' +
        '</div>';
    }
    return out;
  }

''', "noticeHTML")

# ---------- 5. 时间线 ----------
APP = replace_region(APP,
    "  function timelineHTML() {",
    "  function sideHTML() {",
    r'''  function timelineHTML() {
    var items = C.dayItems(state.data, now());
    if (!items.length) {
      return '<div class="empty-state">' +
        '<span class="empty-emblem" aria-hidden="true"></span>' +
        '<span class="empty-emoji">☕️</span>' +
        '<p>' + T('今日无课，城堡安歇', '今天没有课') + '</p>' +
        '<small>' + T('好好休整，或去「课程纹册」补全课表', '好好休息，或者去「课程」里把课表补全') + '</small>' +
        '</div>';
    }
    var n = now();
    var nowMin = C.minuteOfDay(n);
    var nextFound = false;
    return items.map(function (it) {
      var st = 'future';
      var stateText = '';
      if (nowMin >= it.endMin) {
        st = 'past';
        stateText = T('已散课', '已结束');
      } else if (nowMin >= it.startMin) {
        st = 'now';
        stateText = T('正在开讲 · 还剩 {n} 分钟', '正在上课 · 还剩 {n} 分钟', { n: it.endMin - nowMin });
      } else if (!nextFound) {
        st = 'next';
        nextFound = true;
        var cd = C.formatCountdown(it.start, n);
        stateText = cd.ms < 60000 ? T('马上开讲', '马上开始') : '还有 ' + cd.text;
      } else {
        stateText = T('{t} 开讲', '{t} 开始', { t: C.minToHm(it.startMin) });
      }
      var checked = isCheckedIn(it);
      return '<article class="tl-item is-' + st + '" style="--tint:var(--c-' + esc(it.color) + ')">' +
        '<div class="tl-time"><b>' + C.minToHm(it.startMin) + '</b><span>' + C.minToHm(it.endMin) + '</span></div>' +
        '<div class="tl-rail"><i class="tl-dot"></i></div>' +
        '<div class="tl-card">' +
          '<header class="tl-head">' +
            '<h3>' + esc(it.name) + '</h3>' +
            '<span class="tl-state">' + esc(stateText) + '</span>' +
          '</header>' +
          '<p class="tl-meta">' +
            '<span>' + ICONS.pin + esc(it.room || T('殿堂待定', '地点待定')) + '</span>' +
            '<span>' + ICONS.clock + esc(it.periodLabel) + '</span>' +
            (it.teacher ? '<span>' + ICONS.user + esc(it.teacher) + '</span>' : '') +
          '</p>' +
          (it.bring.length ? '<p class="tl-bring">' + ICONS.bag + it.bring.map(function (b) {
            return '<span>' + esc(b) + '</span>';
          }).join('') + '</p>' : '') +
          '<div class="tl-actions">' +
            (checked
              ? '<span class="signin-badge">' + ICONS.check + ' ' +
                C.minToHm((new Date(state.data.checkins[checkinKey(it)]).getHours() * 60 + new Date(state.data.checkins[checkinKey(it)]).getMinutes()) || '') +
                T(' 已落印', ' 已签到') + '</span>'
              : '<button class="mini-btn" data-action="checkin" data-key="' + esc(it.key) + '" data-date="' + esc(it.date) + '">' + ICONS.check + T('落印签到', '标记签到') + '</button>') +
            '<button class="mini-btn ghost" data-action="course-edit" data-id="' + esc(it.courseId) + '">' + ICONS.edit + T('修订', '编辑') + '</button>' +
          '</div>' +
        '</div>' +
        '</article>';
    }).join('');
  }

''', "timelineHTML")

# ---------- 6. 侧栏 ----------
APP = replace_region(APP,
    "  function sideHTML() {",
    "  function renderToday() {",
    r'''  function sideHTML() {
    var n = now();
    var items = C.dayItems(state.data, n);
    var bring = C.unionBring(items);
    var stats = C.dayStats(state.data, n);
    var week = C.semesterWeek(state.data.meta, n);
    var wstats = C.weekStats(state.data, week);
    var tomorrow = C.dayItems(state.data, C.addDays(n, 1));

    var bringHTML = '<h3 class="side-title">' + ICONS.bag + T('今日行囊', '今天要带') + '</h3>' +
      (bring.length
        ? '<div class="bring-cloud">' + bring.map(function (b) { return '<span class="bring-chip">' + esc(b) + '</span>'; }).join('') + '</div>'
        : '<p class="side-empty">' + T('今日无需特别行装，轻装出行。', '今天没有特别要带的，轻装出门。') + '</p>') +
      (items.length ? '<p class="side-note">' + T('出自：', '来自：') + items.map(function (i) { return esc(i.name); }).join('、') + '</p>' : '');

    var glanceHTML = '<h3 class="side-title">' + ICONS.calendar + T('本周朝纲', '本周一览') + '</h3>' +
      '<div class="week-bars">' + [1, 2, 3, 4, 5, 6, 7].map(function (d) {
        var count = wstats.days[d] || 0;
        var isToday = C.weekdayOf(n) === d;
        return '<div class="week-bar' + (isToday ? ' is-today' : '') + '">' +
          '<b>' + (count || '·') + '</b><i>周' + C.DAY_SHORT[d - 1] + '</i></div>';
      }).join('') + '</div>' +
      '<p class="side-note">' + T('本周共 {n} 节', '本周共 {n} 节', { n: wstats.count }) +
        (tomorrow.length
          ? T(' · 明日 {n} 节，最早 {t}', ' · 明天 {n} 节，最早 {t}', { n: tomorrow.length, t: C.minToHm(tomorrow[0].startMin) })
          : T(' · 明日无课', ' · 明天没课')) + '</p>';

    var statusHTML = '<h3 class="side-title">' + ICONS.clock + T('此刻', '现在') + '</h3>' +
      '<p class="side-status">' + esc(dayStatusText(n)) + '</p>' +
      '<ul class="reminder-summary">' +
        '<li><span>' + T('晨钟早报', '每日早报') + '</span><b>' + (state.data.settings.digestOn ? state.data.settings.digestTime : T('已停', '关闭')) + '</b></li>' +
        '<li><span>' + T('鸣钟示警', '课前提醒') + '</span><b>' + (state.data.settings.preOn ? T('提前 {n} 分钟', '提前 {n} 分钟', { n: state.data.settings.preMin }) : T('已停', '关闭')) + '</b></li>' +
        '<li><span>' + T('御前签到', '签到提醒') + '</span><b>' + (state.data.settings.signOn ? T('课前 {n} 分钟', '课前 {n} 分钟', { n: state.data.settings.signMin }) : T('已停', '关闭')) + '</b></li>' +
      '</ul>' +
      '<button class="text-btn bordered tiny full" data-action="goto-tab" data-tab="settings">' + T('调整诏令', '调整提醒') + '</button>';

    return { bring: bringHTML, glance: glanceHTML, status: statusHTML };
  }

''', "sideHTML")

APP = replace_pairs(APP, [(
    "        sum.textContent = '暂无课程';",
    "        sum.textContent = T('今日无课', '暂无课程');"
)], "today-sum")

# ---------- 7. 周视图文案 ----------
APP = replace_pairs(APP, [(
    "    $('#week-title').textContent = '第 ' + week + ' 周';\n"
    "    var narrow = window.matchMedia('(max-width: 720px)').matches;\n"
    "    $('#week-range').textContent = C.dateLabel(start) + ' – ' + C.dateLabel(end) +\n"
    "      (week === currentWeek ? ' · 本周' : '') + (narrow ? ' · 左右滑动' : '');",

    "    $('#week-title').textContent = T('王历 · 第 {n} 周', '第 {n} 周', { n: week });\n"
    "    var narrow = window.matchMedia('(max-width: 720px)').matches;\n"
    "    $('#week-range').textContent = C.dateLabel(start) + ' – ' + C.dateLabel(end) +\n"
    "      (week === currentWeek ? T(' · 本周', ' · 本周') : '') + (narrow ? T(' · 左右滑动', ' · 左右滑动') : '');"
)], "week-head")

APP = replace_pairs(APP, [(
    "    html += '<div class=\"wk-head wk-corner\">节次</div>';",
    "    html += '<div class=\"wk-head wk-corner\">' + T('时辰', '节次') + '</div>';"
)], "wk-corner")

APP = replace_pairs(APP, [(
    "    $('#legend').innerHTML = legend || '<span class=\"legend-empty\">这周没有课</span>';",
    "    $('#legend').innerHTML = legend || '<span class=\"legend-empty\">' + T('本周无课', '这周没有课') + '</span>';"
)], "legend")

# ---------- 8. 课程页 ----------
APP = replace_region(APP,
    "  function renderCourses() {",
    "  // ============================================================ 设置",
    r'''  function renderCourses() {
    var box = $('#course-list');
    if (!box) return;
    var data = state.data;
    if (!data.courses.length) {
      box.innerHTML = '<div class="empty-state"><span class="empty-emblem" aria-hidden="true"></span><span class="empty-emoji">📚</span>' +
        '<p>' + T('纹册尚空', '还没有课程') + '</p>' +
        '<small>' + T('点右上角「+ 册封课程」开始，或在「王室档案库」恢复示例纹册', '点右上角「+ 添加课程」开始，或者去「数据与备份」里恢复示例课表') + '</small></div>';
      return;
    }
    box.innerHTML = data.courses.map(function (c) {
      var sessions = c.sessions.map(function (s) {
        var times = C.sessionTimes(data.periods, s);
        var timeText = times ? C.minToHm(times.startMin) + '–' + C.minToHm(times.endMin) : '时间未定';
        return '<li><span class="sess-day">' + C.dayName(s.day) + '</span>' +
          '<span class="sess-time">' + timeText + '</span>' +
          '<span class="sess-room">' + esc(s.room || T('殿堂待定', '地点待定')) + '</span>' +
          '<span class="sess-weeks">' + esc(C.weeksLabel(s.weeks, data.meta.weeks)) + '</span></li>';
      }).join('');
      var bring = C.unionBring(c.sessions.map(function (s) { return { bring: s.bring }; }));
      return '<article class="course-card" style="--tint:var(--c-' + esc(c.color) + ')">' +
        '<header class="course-head">' +
          '<span class="course-swatch"></span>' +
          '<div class="course-title"><h3>' + esc(c.name) + '</h3>' +
            '<p>' + (c.teacher ? esc(c.teacher) + ' · ' : '') + T('{n} 个时段', '{n} 个时间段', { n: c.sessions.length }) + '</p></div>' +
          '<div class="course-actions">' +
            '<button class="icon-btn" data-action="course-edit" data-id="' + esc(c.id) + '" aria-label="' + T('编辑', '编辑') + ' ' + esc(c.name) + '">' + ICONS.edit + '</button>' +
            '<button class="icon-btn danger" data-action="course-delete" data-id="' + esc(c.id) + '" aria-label="' + T('删除', '删除') + ' ' + esc(c.name) + '">' + ICONS.trash + '</button>' +
          '</div>' +
        '</header>' +
        '<ul class="sess-list">' + sessions + '</ul>' +
        (bring.length ? '<p class="course-bring">' + ICONS.bag + bring.map(function (b) {
          return '<span>' + esc(b) + '</span>';
        }).join('') + '</p>' : '') +
        '</article>';
    }).join('');
  }

''', "renderCourses")

# ---------- 9. 下一次提醒 ----------
APP = replace_region(APP,
    "  function nextReminderText() {",
    "  function settingsHTML() {",
    r'''  function nextReminderText() {
    var list = C.buildReminders(state.data, now(), C.addDays(now(), 7));
    var current = now().getTime();
    for (var i = 0; i < list.length; i++) {
      if (list[i].at.getTime() > current) {
        var r = list[i];
        var royalLabels = { digest: '早报', pre: '鸣钟', sign: '签到', evening: '预告' };
        var classicLabels = { digest: '早报', pre: '课前提醒', sign: '签到提醒', evening: '晚间预告' };
        var label = (isRoyal() ? royalLabels : classicLabels)[r.kind] || T('传令', '提醒');
        return T('下一次传令：', '下一次提醒：') + C.relativeDayLabel(r.at, now()) + ' ' +
          C.minToHm(r.at.getHours() * 60 + r.at.getMinutes()) + ' · ' + label;
      }
    }
    return T('七日之内暂无召令', '未来一周还没有排到提醒');
  }

''', "nextReminderText")

# ---------- 10. 设置页 ----------
APP = replace_region(APP,
    "  function settingsHTML() {",
    "  function periodEditorHTML() {",
    r'''  function settingsHTML() {
    var s = state.data.settings;
    var m = state.data.meta;
    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    var permText = {
      granted: T('传令已通', '已开启'),
      denied: T('传令受阻', '被浏览器拒绝'),
      default: T('未开启', '未开启'),
      unsupported: T('不支持', '此浏览器不支持')
    }[perm] || perm;

    var html = '';

    html += '<section class="panel"><div class="panel-head"><h2>' + T('系统传令', '系统通知') + '</h2>' +
      '<span class="badge ' + (perm === 'granted' ? 'ok' : 'warn') + '">' + permText + '</span></div>' +
      '<p class="hint">' + T('课刻在页面打开时负责准点传令；想让诏令更可靠，可以同时导出 .ics 交给手机 / 电脑的系统日历。', '课刻在页面打开时负责准点提醒；想让提醒更可靠，可以同时导出 .ics 交给手机 / 电脑的系统日历。') + '</p>' +
      '<div class="btn-grid">' +
      '<button class="text-btn solid" data-action="notify">' + (perm === 'granted' ? T('重新确认传令', '重新确认权限') : T('开启系统传令', '开启系统通知')) + '</button>' +
      '<button class="text-btn bordered" data-action="test-notify"' + (perm === 'granted' ? '' : ' disabled') + '>' + T('发送一条测试传令', '发送一条测试通知') + '</button>' +
      '<button class="text-btn bordered" data-action="preview-reminder">' + T('预览传令卡片', '预览提醒卡片') + '</button>' +
      '<button class="text-btn bordered" data-action="export-ics">' + T('导出 .ics 日历', '导出 .ics 日历') + '</button>' +
      '</div></section>';

    html += '<section class="panel"><div class="panel-head"><h2>' + T('传令设置', '提醒设置') + '</h2>' +
      '<span class="panel-sub" id="next-reminder">' + esc(nextReminderText()) + '</span></div>' +
      switchRow('data-setting="digestOn"' + (s.digestOn ? ' checked' : ''), T('晨钟早报', '每日早报'), T('起身后提醒今日所有课程、地点与行囊', '起床后提醒今天所有的课、地点和要带的东西')) +
      '<div class="sub-row"><label>' + T('诏书时间', '早报时间') + ' <input type="time" data-setting="digestTime" value="' + s.digestTime + '"></label></div>' +
      switchRow('data-setting="preOn"' + (s.preOn ? ' checked' : ''), T('鸣钟示警', '课前提醒'), T('提前一点提醒你启程，避免迟到', '提前一点提醒你出发，避免迟到')) +
      '<div class="sub-row"><label>' + T('提前', '提前') + ' <input type="number" min="0" max="120" step="5" data-setting="preMin" value="' + s.preMin + '"> ' + T('分钟', '分钟') + '</label></div>' +
      switchRow('data-setting="signOn"' + (s.signOn ? ' checked' : ''), T('御前签到', '课前签到提醒'), T('开讲前 2 分钟提醒你落印签到，不错过签章', '上课前 2 分钟提醒你打开签到入口，不错过签到')) +
      '<div class="sub-row"><label>' + T('课前', '课前') + ' <input type="number" min="0" max="30" step="1" data-setting="signMin" value="' + s.signMin + '"> ' + T('分钟提醒签到', '分钟提醒签到') + '</label></div>' +
      switchRow('data-setting="eveningOn"' + (s.eveningOn ? ' checked' : ''), T('暮色预告', '晚间预告'), T('睡前告诉你明日几时、何处开讲', '睡前告诉你明天几点、在哪里上课')) +
      '<div class="sub-row"><label>' + T('预告时间', '预告时间') + ' <input type="time" data-setting="eveningTime" value="' + s.eveningTime + '"></label></div>' +
      '<div class="field"><span>' + T('签到处链接（选填）', '签到入口链接（选填）') + '</span>' +
      '<input type="url" data-setting="signInUrl" placeholder="' + T('例如学习通 / 雨课堂的签到页链接', '例如学习通 / 雨课堂的签到页链接') + '" value="' + esc(s.signInUrl) + '"></div>' +
      '</section>';

    html += '<section class="panel"><div class="panel-head"><h2>' + T('学期信息', '学期信息') + '</h2><span class="panel-sub">' + T('影响王历计算', '影响周次计算') + '</span></div>' +
      '<div class="field-row">' +
      '<label class="field"><span>' + T('纹册名称', '课表名称') + '</span><input type="text" maxlength="40" data-meta="name" value="' + esc(m.name) + '"></label>' +
      '<label class="field"><span>' + T('学院', '学校') + '</span><input type="text" maxlength="40" data-meta="school" value="' + esc(m.school) + '"></label>' +
      '</div>' +
      '<div class="field-row">' +
      '<label class="field"><span>' + T('学期第一周周一', '学期第一周周一') + '</span><input type="date" data-meta="semesterStart" value="' + m.semesterStart + '"></label>' +
      '<label class="field"><span>' + T('学期总周数', '学期总周数') + '</span><input type="number" min="1" max="30" data-meta="weeks" value="' + m.weeks + '"></label>' +
      '</div>' +
      '<p class="hint">' + T('当前是第 <b>{n}</b> 周。若王历不准，改一下开学日期即可。', '当前是第 <b>{n}</b> 周。如果周次不准，改一下开学日期即可。', { n: C.semesterWeek(m, now()) }) + '</p>' +
      '</section>';

    html += '<section class="panel"><div class="panel-head"><h2>' + T('作息时辰', '作息时间') + '</h2><span class="panel-sub">' + T('按你们学校的时间改', '按你们学校的时间改') + '</span></div>' +
      '<div class="period-editor" id="period-editor">' + periodEditorHTML() + '</div>' +
      '<div class="btn-grid"><button class="text-btn solid" data-action="save-periods">' + T('封存作息时辰', '保存作息时间') + '</button>' +
      '<button class="text-btn bordered" data-action="reset-periods">' + T('恢复默认时辰', '恢复默认作息') + '</button></div></section>';

    html += '<section class="panel"><div class="panel-head"><h2>' + T('外观与关于', '外观与关于') + '</h2></div>' +
      '<div class="field-row"><label class="field"><span>' + T('皮肤', '皮肤') + '</span><select data-setting="skin">' +
      '<option value="royal"' + (isRoyal() ? ' selected' : '') + '>' + T('皇室典藏 · 金冠纹章', '皇室典藏 · 金冠纹章') + '</option>' +
      '<option value="classic"' + (!isRoyal() ? ' selected' : '') + '>' + T('学院纸感 · 素纸极简', '学院纸感 · 素纸极简') + '</option>' +
      '</select></label>' +
      '<label class="field"><span>' + T('主题', '主题') + '</span><select data-setting="theme">' +
      [['auto', T('跟随系统', '跟随系统')], ['light', T('浅色', '浅色')], ['dark', T('深色', '深色')]].map(function (o) {
        return '<option value="' + o[0] + '"' + (s.theme === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></label></div>' +
      '<div class="field-row"><label class="field"><span>' + T('版本', '版本') + '</span>' +
      '<input type="text" value="' + (isRoyal() ? '课刻 ClassTick · 皇家典藏 v1.1' : '课刻 ClassTick · 学院纸感 v1.1') + '" readonly></label>' +
      '<label class="field"><span>' + T('存档位置', '存储位置') + '</span><input type="text" value="' + T('本机浏览器 · 不上传', '本机浏览器 · 不上传') + '" readonly></label></div>' +
      '<div class="btn-grid">' +
      '<button class="text-btn bordered" data-action="install">' + T('安装到桌面 / 手机', '安装到桌面 / 手机') + '</button>' +
      '<button class="text-btn bordered" data-action="show-about">' + T('安装与诏令说明', '安装与提醒说明') + '</button>' +
      '<button class="text-btn bordered danger" data-action="clear-all">' + T('清空全部档案', '清空全部数据') + '</button>' +
      '</div></section>';

    return html;
  }

''', "settingsHTML")

# ---------- 11. 提醒卡片 ----------
APP = replace_region(APP,
    "  function addReminderCard(r) {",
    "  function showSystemNotification(title, body, opts) {",
    r'''  function addReminderCard(r) {
    var stack = $('#reminder-stack');
    if (!stack) return;
    var id = 'rem-' + Date.now().toString(36);
    state.reminders[id] = r;
    var royalLabels = { digest: '晨间诏书', pre: '鸣钟示警', sign: '御前签到', evening: '暮色预告' };
    var classicLabels = { digest: '今日早报', pre: '课前提醒', sign: '签到提醒', evening: '晚间预告' };
    var kindLabel = (isRoyal() ? royalLabels : classicLabels)[r.kind] || (isRoyal() ? '传令' : '提醒');
    var el = document.createElement('div');
    el.className = 'reminder kind-' + r.kind;
    el.innerHTML =
      '<div class="reminder-head"><span class="reminder-kind">' + kindLabel + '</span>' +
      '<button class="icon-btn" data-action="reminder-dismiss" data-rem="' + id + '" aria-label="关闭提醒">×</button></div>' +
      '<h3>' + esc(r.title) + '</h3>' +
      '<p>' + esc(r.body) + '</p>' +
      '<div class="reminder-actions">' +
      (r.kind === 'sign' && r.item
        ? '<button class="text-btn solid tiny" data-action="reminder-checkin" data-rem="' + id + '">' + ICONS.check + T('落印签到', '标记已签到') + '</button>' +
          (state.data.settings.signInUrl ? '<a class="text-btn bordered tiny" href="' + esc(state.data.settings.signInUrl) + '" target="_blank" rel="noreferrer">' + T('前往签到处', '打开签到入口') + '</a>' : '')
        : '<button class="text-btn bordered tiny" data-action="reminder-dismiss" data-rem="' + id + '">' + T('知道了', '知道了') + '</button>') +
      '</div>';
    stack.appendChild(el);
    if (r.kind !== 'sign') {
      setTimeout(function () { el.classList.add('out'); }, 45000);
      setTimeout(function () { el.remove(); }, 46000);
    }
  }

''', "addReminderCard")

APP = replace_region(APP,
    "  function fireReminder(r) {",
    "  function checkReminders(force) {",
    r'''  function fireReminder(r) {
    var view = isRoyal()
      ? Object.assign({}, r, { title: royalReminderTitle(r), body: royalReminderBody(r) })
      : r;
    addReminderCard(view);
    var isSign = r.kind === 'sign';
    showSystemNotification(view.title, view.body, { tag: r.key, requireInteraction: isSign });
    if (navigator.vibrate) {
      try { navigator.vibrate(isSign ? [90, 60, 90, 60, 160] : [60, 40, 60]); } catch (e) { /* ignore */ }
    }
  }

''', "fireReminder")

# ---------- 12. 通知授权 ----------
APP = replace_region(APP,
    "  function enableNotifications() {",
    "  // ============================================================ 签到",
    r'''  function enableNotifications() {
    if (!('Notification' in window)) {
      toast(T('这个浏览器不支持系统传令，试试 Chrome / Edge / Safari', '这个浏览器不支持系统通知，试试 Chrome / Edge / Safari'), 'error');
      return Promise.resolve();
    }
    return Notification.requestPermission().then(function (perm) {
      state.notify = perm;
      renderTopbar();
      if (state.tab === 'settings') renderSettings();
      if (perm === 'granted') {
        toast(T('传令已通，下一堂御课见 🔔', '通知已开启，下一节课见 🔔'));
        showSystemNotification(
          T('课刻已就位', '课刻已就位'),
          T('晨钟诏书、鸣钟示警、御前签到都会准点送达。', '早报、课前提醒、签到提醒都会准点送达。'),
          { tag: 'classtick-welcome' }
        );
      } else {
        toast(T('传令没有开启，可稍后在御前设置里再试', '通知没有开启，可稍后在设置里再试'), 'error');
      }
      renderToday();
    });
  }

''', "enableNotifications")

APP = replace_pairs(APP, [(
    "    toast('已记下《' + target.name + '》的签到 ✓');",
    "    toast(T('《' + target.name + '》签到已落印 ✓', '已记下《' + target.name + '》的签到 ✓'));"
)], "checkIn toast")

# ---------- 13. 选色器（纹章家族） ----------
APP = replace_region(APP,
    "  function colorPickerHTML(selected) {",
    "  function sessionRowHTML(s, index) {",
    r'''  function colorPickerHTML(selected) {
    return C.COLORS.map(function (c) {
      var house = HOUSE[c] || { name: c, motto: '' };
      var label = isRoyal() ? (house.name + '家族 · ' + house.motto) : ('颜色 ' + c);
      return '<button type="button" class="color-dot' + (c === selected ? ' is-on' : '') + '" data-color="' + c +
        '" style="--tint:var(--c-' + c + ')" aria-label="' + esc(label) + '" title="' + esc(label) +
        '" aria-pressed="' + (c === selected) + '"></button>';
    }).join('');
  }

''', "colorPickerHTML")

APP = replace_pairs(APP, [(
    "    $('#dlg-course-title').textContent = course ? '编辑课程' : '添加课程';",
    "    $('#dlg-course-title').textContent = course ? T('修订课程', '编辑课程') : T('册封新课程', '添加课程');"
)], "course-dialog-title")

APP = replace_pairs(APP, [(
    "    toast(idx >= 0 ? '课程已更新 ✓' : '课程已添加 ✓');",
    "    toast(idx >= 0 ? T('课程纹册已更新 ✓', '课程已更新 ✓') : T('课程已册封 ✓', '课程已添加 ✓'));"
)], "saveCourse toast")

# ---------- 14. 数据导入导出 ----------
APP = replace_pairs(APP, [
    ("    toast('已导出 JSON 备份');",
     "    toast(T('课表已封入王室档案（JSON）', '已导出 JSON 备份'));"),
    ("    toast('已生成 ' + ics.events + ' 个日历事件，导入系统日历即可');",
     "    toast(T('已生成 {n} 个日历事件，导入系统日历即可', '已生成 {n} 个日历事件，导入系统日历即可', { n: ics.events }));"),
    ("      return { ok: false, message: 'JSON 解析失败：' + e.message };",
     "      return { ok: false, message: T('卷轴无法解读：' + e.message, 'JSON 解析失败：' + e.message) };"),
    ("    if (!raw || typeof raw !== 'object') return { ok: false, message: '内容不是有效的课表对象' };",
     "    if (!raw || typeof raw !== 'object') return { ok: false, message: T('内容不是有效的课表卷轴', '内容不是有效的课表对象') };"),
    ("        $('#import-error').textContent = '还没有内容：请选择文件或粘贴 JSON';",
     "        $('#import-error').textContent = T('还没有内容：请选择卷轴或粘贴 JSON', '还没有内容：请选择文件或粘贴 JSON');"),
    ("      toast('课表已导入 ✓' + (result.warnings && result.warnings.length ? '（' + result.warnings.length + ' 条提醒）' : ''));",
     "      toast(T('课表已呈递 ✓', '课表已导入 ✓') + (result.warnings && result.warnings.length ? '（' + result.warnings.length + T(' 条待核', ' 条提醒') + '）' : ''));")
], "data toasts")

# ---------- 15. 各类操作 toast / 确认 ----------
APP = replace_pairs(APP, [
    ("      toast('保存失败：浏览器存储不可用', 'error');",
     "      toast(T('档案未能封存：浏览器存储不可用', '保存失败：浏览器存储不可用'), 'error');"),
    ("      toast('先给课程起个名字吧', 'error');",
     "      toast(T('请先为这门课题名', '先给课程起个名字吧'), 'error');"),
    ("        confirmDialog('删除《' + course.name + '》？删除后可以重新添加，但不会自动恢复。', function () {",
     "        confirmDialog(T('删除《' + course.name + '》？删除后可以重新册封，但不会自动复原。', '删除《' + course.name + '》？删除后可以重新添加，但不会自动恢复。'), function () {"),
    ("          toast('课程已删除');",
     "          toast(T('课程已从纹册移除', '课程已删除'));"),
    ("          toast('至少保留一个时间段', 'error');",
     "          toast(T('至少保留一段上课时间', '至少保留一个时间段'), 'error');"),
    ("        confirmDialog('恢复成示例课表？当前课表会被覆盖。', function () {",
     "        confirmDialog(T('恢复成示例纹册？当前纹册会被覆盖。', '恢复成示例课表？当前课表会被覆盖。'), function () {"),
    ("          toast('已恢复示例课表');",
     "          toast(T('示例纹册已复原', '已恢复示例课表'));"),
    ("        confirmDialog('清空全部课程和设置？建议先导出 JSON 备份。', function () {",
     "        confirmDialog(T('清空全部课程与设置？建议先把课表封入 JSON 档案。', '清空全部课程和设置？建议先导出 JSON 备份。'), function () {"),
    ("          toast('已清空，去添加你的第一门课吧');",
     "          toast(T('纹册已清空，去册封你的第一门课吧', '已清空，去添加你的第一门课吧'));"),
    ("        toast('已恢复默认作息');",
     "        toast(T('已恢复默认时辰', '已恢复默认作息'));"),
    ("        showSystemNotification('课刻测试通知', '如果你看到这条通知，说明提醒链路是通的 🔔', { tag: 'classtick-test' });",
     "        showSystemNotification(T('课刻测试传令', '课刻测试通知'), T('如果你看到这条传令，说明提醒链路是通的 🔔', '如果你看到这条通知，说明提醒链路是通的 🔔'), { tag: 'classtick-test' });"),
    ("        toast('已发送测试通知');",
     "        toast(T('测试传令已发出', '已发送测试通知'));"),
    ("          toast('最近两天没有课，先添加一节课再预览吧');",
     "          toast(T('近两日无朝程，先册封一节课再预览吧', '最近两天没有课，先添加一节课再预览吧'));"),
    ("        toast('已弹出提醒卡片预览');",
     "        toast(T('传令卡片预览已弹出', '已弹出提醒卡片预览'));"),
    ("          toast('已记下《' + r.item.name + '》的签到 ✓');",
     "          toast(T('《' + r.item.name + '》签到已落印 ✓', '已记下《' + r.item.name + '》的签到 ✓'));"),
    ("    if (!w) toast('弹窗被拦截了，请允许课刻打开弹窗', 'error');",
     "    if (!w) toast(T('信使被拦下：请允许课刻打开弹窗', '弹窗被拦截了，请允许课刻打开弹窗'), 'error');"),
    ("        if (choice.outcome === 'accepted') toast('课刻已安装到桌面 🎉');",
     "        if (choice.outcome === 'accepted') toast(T('课刻已入驻这台设备 🎉', '课刻已安装到桌面 🎉'));"),
    ("      toast('课刻已安装 🎉');",
     "      toast(T('课刻已入驻这台设备 🎉', '课刻已安装 🎉'));")
], "misc toasts")

# ---------- 16. 作息保存 ----------
APP = replace_region(APP,
    "  function savePeriods() {",
    "  function onSettingsChange(event) {",
    r'''  function savePeriods() {
    var rows = $$('#period-editor .period-row');
    var list = rows.map(function (row) {
      return {
        start: $('[data-field="start"]', row).value,
        end: $('[data-field="end"]', row).value
      };
    }).filter(function (p) { return C.hmToMin(p.start) != null && C.hmToMin(p.end) != null; });
    if (!list.length) {
      toast(T('至少保留一节有效时辰', '至少保留一节有效时间'), 'error');
      return;
    }
    state.data.periods = C.normalizePeriods(list);
    saveData();
    renderAll();
    toast(T('作息时辰已封存 ✓', '作息时间已保存 ✓'));
  }

''', "savePeriods")

# ---------- 17. 设置 change：支持皮肤切换 ----------
APP = replace_region(APP,
    "  function onSettingsChange(event) {",
    "  function onSubmit(event) {",
    r'''  function onSettingsChange(event) {
    var el = event.target;
    if (!el || !el.closest) return;
    if (el.matches('[data-setting]')) {
      var key = el.dataset.setting;
      var value;
      if (el.type === 'checkbox') value = el.checked;
      else if (el.type === 'number') value = C.clampInt(el.value, Number(el.min) || 0, Number(el.max) || 999, 0);
      else value = el.value;
      state.data.settings[key] = value;
      saveData();
      if (key === 'skin') {
        applySkin();
        renderAll();
        return;
      }
      if (key === 'theme') applyTheme();
      renderTopbar();
      if (key === 'signInUrl' || key === 'theme') renderSettings();
      if (state.preview) return;
      renderToday();
      if (key === 'theme') renderSettings();
      return;
    }
    if (el.matches('[data-meta]')) {
      var field = el.dataset.meta;
      var meta = state.data.meta;
      if (field === 'weeks') meta.weeks = C.clampInt(el.value, 1, 30, 18);
      else if (field === 'semesterStart') {
        var parsed = C.parseYmd(el.value);
        if (!parsed) { toast(T('日期书写有误，请用 2026-09-01 的格式', '日期格式不对'), 'error'); return; }
        meta.semesterStart = C.ymd(parsed);
      } else {
        meta[field] = String(el.value || '').slice(0, 40);
      }
      saveData();
      renderAll();
      return;
    }
  }

''', "onSettingsChange")

# ---------- 18. 渲染入口与启动 ----------
APP = replace_region(APP,
    "  function renderAll() {",
    "  function renderCurrentTab() {",
    r'''  function renderAll() {
    applySkin();
    renderTopbar();
    renderToday();
    renderWeek();
    renderCourses();
    renderSettings();
  }

''', "renderAll")

APP = replace_pairs(APP, [(
    "    var tabParam = params.get('tab');\n"
    "    bindEvents();\n"
    "    applyTheme();\n"
    "    renderAll();",
    "    var tabParam = params.get('tab');\n"
    "    bindEvents();\n"
    "    renderAll();"
)], "init")

# ---------- 19. 自测增加皮肤检查 ----------
APP = replace_pairs(APP, [(
    "    test('主题已应用', !!document.documentElement.dataset.theme);",
    "    test('主题已应用', !!document.documentElement.dataset.theme);\n"
    "    test('皇室皮肤已应用', document.documentElement.dataset.skin === 'royal' && document.querySelector('.logo-royal img') != null);\n"
    "    test('皇家文案已生效', !!document.querySelector('.tab[data-tab=\"today\"] span') && document.querySelector('.tab[data-tab=\"today\"] span').textContent.indexOf('今日') >= 0 && document.querySelector('#hero-slot .hero-kicker') != null && document.querySelector('#hero-slot .hero-kicker').textContent.indexOf('开讲') >= 0);"
)], "selftest-skin")

write("assets/app.js", APP)
print("[OK] assets/app.js 已接入皇室皮肤与文案")

# ============================================================ index.html
IDX = read("index.html")
IDX = replace_pairs(IDX, [
    ('  <meta name="theme-color" content="#241a44" media="(prefers-color-scheme: light)">\n'
     '  <meta name="theme-color" content="#141020" media="(prefers-color-scheme: dark)">',
     '  <meta name="theme-color" content="#241a44">'),
    ('<span>数据仅保存在本机</span>', '<span id="foot-note">数据仅保存在本机</span>')
], "index.html")
write("index.html", IDX)
print("[OK] index.html")

# ============================================================ style.css（基础皮肤规则）
CSS = read("assets/style.css")
CSS += '''

/* ============================================================ 皮肤切换基础规则 */
.logo .logo-royal { display: none; }
.logo .logo-royal img { display: block; object-fit: cover; border-radius: 15px; }
.empty-emblem { display: none; }
body.is-royal .logo svg { display: none; }
body.is-royal .logo .logo-royal { display: block; }
'''
write("assets/style.css", CSS)
print("[OK] assets/style.css")

# ============================================================ sw.js
SW = read("sw.js")
SW = replace_pairs(SW, [
    ("const CACHE = 'classtick-v1.0.0';", "const CACHE = 'classtick-v1.1.0-royal';"),
    ("  './manifest.webmanifest',\n"
     "  './icons/icon-192.png',\n"
     "  './icons/icon-512.png',\n"
     "  './icons/maskable-512.png',\n"
     "  './icons/favicon.svg'\n"
     "];",
     "  './manifest.webmanifest',\n"
     "  './assets/royal.css',\n"
     "  './assets/royal/hero-castle.webp',\n"
     "  './assets/royal/parchment.webp',\n"
     "  './assets/royal/corner-tl.webp',\n"
     "  './assets/royal/corner-tr.webp',\n"
     "  './assets/royal/corner-bl.webp',\n"
     "  './assets/royal/corner-br.webp',\n"
     "  './assets/royal/crown.webp',\n"
     "  './assets/royal/seal.webp',\n"
     "  './assets/royal/rose-window.webp',\n"
     "  './icons/icon-192.png',\n"
     "  './icons/icon-512.png',\n"
     "  './icons/maskable-512.png',\n"
     "  './icons/badge-96.png',\n"
     "  './icons/favicon.svg'\n"
     "];")
], "sw.js")
write("sw.js", SW)
print("[OK] sw.js")

# ============================================================ manifest
MAN = read("manifest.webmanifest")
MAN = replace_pairs(MAN, [
    ('"name": "课刻 ClassTick · 课程表",', '"name": "课刻 ClassTick · 皇家课程表",'),
    ('"description": "把课表装进手机和电脑桌面：今日课表、每日早报、课前提醒、课前 2 分钟签到提醒、携带清单。",',
     '"description": "皇室典藏版课程表：把课表装进手机和电脑桌面，今日朝程、晨钟诏书、鸣钟示警、课前 2 分钟落印签到、随身行囊，一个都不落下。",'),
    ('"background_color": "#f3eee2",', '"background_color": "#e9dbb8",'),
    ('"theme_color": "#1f6f5c",', '"theme_color": "#241a44",')
], "manifest")
write("manifest.webmanifest", MAN)
print("[OK] manifest.webmanifest")

# ============================================================ royal.css 收尾补充
ROYAL = read("assets/royal.css")
ROYAL += '''

/* ============================================================ 补充：纹章装饰细节 */
html[data-skin="royal"] .brand-text h1::after {
  content: "皇家典藏";
  font-family: var(--font-kai);
  font-size: 9.5px;
  font-weight: 400;
  letter-spacing: .2em;
  color: var(--gold-deep);
  border: 1px solid var(--gold-line);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 4px;
  vertical-align: 6px;
  opacity: .9;
}

html[data-skin="royal"] #dlg-about .sheet-head,
html[data-skin="royal"] #dlg-course .sheet-head { position: relative; overflow: hidden; }
html[data-skin="royal"] #dlg-about .sheet-head::after {
  content: "";
  position: absolute;
  right: 56px;
  top: 50%;
  width: 42px;
  height: 42px;
  margin-top: -21px;
  background: url("../assets/royal/rose-window.webp") center / contain no-repeat;
  opacity: .55;
  pointer-events: none;
}

html[data-skin="royal"] .panel-head {
  position: relative;
}
html[data-skin="royal"] .panel-head::after {
  content: "";
  display: block;
  position: absolute;
  left: 0;
  right: 0;
  bottom: -7px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-line) 18%, var(--gold-line) 82%, transparent);
  opacity: .7;
}

html[data-skin="royal"] .panel,
html[data-skin="royal"] .course-card,
html[data-skin="royal"] .sheet,
html[data-skin="royal"] .reminder { background-size: auto, cover; }

html[data-skin="royal"] .empty-emblem {
  width: 54px;
  height: 54px;
  background-size: contain;
  filter: drop-shadow(0 3px 8px rgba(120, 85, 20, .25));
}

/* 手机端：城堡靠右，让文字区域保持暗色可读 */
@media (max-width: 720px) {
  html[data-skin="royal"] .hero { background-position: 72% center; }
  html[data-skin="royal"] .brand-text h1::after { font-size: 8.5px; letter-spacing: .14em; }
}
'''
write("assets/royal.css", ROYAL)
print("[OK] assets/royal.css 补充")

print("\n全部补丁应用完成。")

/*!
 * 课刻 ClassTick · 界面与提醒
 * 依赖：assets/core.js（window.ClassTickCore）、assets/seed.js（window.ClassTickSeed）
 */
(function () {
  'use strict';

  var C = window.ClassTickCore;
  var STORE_KEY = 'classtick.data.v1';
  var FIRED_KEY = 'classtick.fired.v1';
  var DEMO_KEY = 'classtick.demo.v1';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { return C.pad2(n); }

  var ICONS = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.6 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10.4" r="2.3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.6V12l3 1.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.4" r="3.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 20c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8.5h13l-1 11h-11z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.6 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 7h13M9.5 7V5.4h5V7M7.5 7l.9 12h7.2l.9-12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 19 1-4.2L16.3 4.5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L9.2 18 5 19Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 10h16M9 3.6v3.4M15 3.6v3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 0 0-5 5v3.2L5.6 15h12.8L17 11.2V8a5 5 0 0 0-5-5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.7 18a2.4 2.4 0 0 0 4.6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };

  var state = {
    data: null,
    now: new Date(),
    preview: null,
    tab: 'today',
    weekOffset: 0,
    installPrompt: null,
    fired: {},
    editingId: null,
    draftSessions: [],
    notify: 'default',
    selftest: false,
    demo: false,
    reminders: {},
    lastMinuteTick: -1,
    viewDate: null,
    plannerFilter: 'open',
    editingTaskId: null
  };

  var params = new URLSearchParams(location.search);
  var widgetMode = params.get('widget') === '1';
  var previewTheme = (params.get('theme') === 'dark' || params.get('theme') === 'light') ? params.get('theme') : null;
  state.selftest = params.get('selftest') === '1';
  if (params.get('date')) {
    var viewParam = C.parseYmd(params.get('date'));
    if (viewParam) state.viewDate = C.startOfDay(viewParam);
  }
  // 预览模式：?now=2026-10-26T07:40 冻结时间，方便截图与演示（不会触发提醒）
  if (params.get('now')) {
    var previewDate = new Date(params.get('now'));
    if (!isNaN(previewDate.getTime())) {
      state.preview = previewDate;
      state.now = new Date(previewDate.getTime());
    }
  }

  // ============================================================ 皮肤与皇家文案

  var previewSkin = (params.get('skin') === 'classic' || params.get('skin') === 'royal') ? params.get('skin') : null;

  // 九大纹章家族：课程颜色 → 家族名与家训（皇家皮肤下用于选色提示）
  var HOUSE = {
    tomato: { name: '赤狮', motto: '勇者先至', en: 'Crimson Lion', enMotto: 'The Bold Prevail' },
    teal: { name: '碧潮', motto: '潮起有时', en: 'Emerald Tide', enMotto: 'The Tide Keeps Time' },
    amber: { name: '金穗', motto: '勤耕必获', en: 'Golden Harvest', enMotto: 'Toil Bears Fruit' },
    sky: { name: '晴鹰', motto: '目及远方', en: 'Azure Falcon', enMotto: 'Eyes on the Horizon' },
    violet: { name: '紫鸢', motto: '静而有光', en: 'Violet Iris', enMotto: 'Quiet Light Within' },
    olive: { name: '林鹿', motto: '深林自守', en: 'Forest Stag', enMotto: 'Keep to the Deep Wood' },
    rose: { name: '蔷薇', motto: '有刺亦芳', en: 'Thorned Rose', enMotto: 'Sweet Yet Sharp' },
    sand: { name: '砂堡', motto: '寸土筑城', en: 'Sandstone Keep', enMotto: 'Every Stone a Home' },
    ink: { name: '玄鸦', motto: '夜读不辍', en: 'Midnight Raven', enMotto: 'Read Through the Night' }
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

  // ============================================================ 日期视图 / 行囊勾选

  var WEEKDAY_EN = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  function weekdayEn(date) {
    return WEEKDAY_EN[C.weekdayOf(date) - 1];
  }

  function currentViewDate() {
    return state.viewDate || now();
  }

  function isTodayView() {
    return C.isSameDay(currentViewDate(), now());
  }

  function setViewDate(date) {
    if (!date) state.viewDate = null;
    else state.viewDate = C.startOfDay(date);
    renderToday();
    renderWeek();
  }

  function packedFor(date) {
    return state.data.packed[C.ymd(date)] || {};
  }

  function isPacked(name, date) {
    return !!packedFor(date)[name];
  }

  function togglePackedItem(name, date) {
    var key = C.ymd(date);
    var map = state.data.packed[key] || (state.data.packed[key] = {});
    if (map[name]) delete map[name];
    else map[name] = true;
    if (!Object.keys(map).length) delete state.data.packed[key];
    saveData();
    renderToday();
  }

  function unpackedFor(items, date) {
    var packed = packedFor(date);
    var out = [];
    items.forEach(function (it) {
      (it.bring || []).forEach(function (name) {
        if (!packed[name] && out.indexOf(name) === -1) out.push(name);
      });
    });
    return out;
  }

  function unpackedForItem(item) {
    var packed = packedFor(C.parseYmd(item.date));
    return (item.bring || []).filter(function (name) { return !packed[name]; });
  }

  function remindUnpacked() {
    var date = currentViewDate();
    var items = C.dayItems(state.data, date);
    var un = unpackedFor(items, date);
    var packedCount = C.unionBring(items).length - un.length;
    if (!un.length) {
      toast(T('行囊已齐，殿下可以安心启程。', '要带的东西都齐了。'));
      return;
    }
    var message = T('行囊还差：' + un.join('、'), '还差：' + un.join('、'));
    toast(message);
    showSystemNotification(T('行囊提醒', '带东西提醒'), message, { tag: 'classtick-packed' });
    if (teacherOpen()) teacherSay('<p>殿下，' + T('今日行囊还差 <b>' + esc(un.join('、')) + '</b>，已经带上的有 ' + packedCount + ' 件。', '今天还差 <b>' + esc(un.join('、')) + '</b> 没带，已经带了 ' + packedCount + ' 件。') + '</p>');
  }

  function daySwitchHTML() {
    var date = currentViewDate();
    var monday = C.addDays(date, 1 - C.weekdayOf(date));
    var html = '<div class="ds-row">';
    for (var d = 0; d < 7; d++) {
      var day = C.addDays(monday, d);
      var items = C.dayItems(state.data, day);
      var isSel = C.isSameDay(day, date);
      var isToday = C.isSameDay(day, now());
      html += '<button class="ds-day' + (isSel ? ' is-active' : '') + (isToday ? ' is-today' : '') + '" ' +
        'data-action="select-day" data-date="' + C.ymd(day) + '" aria-pressed="' + isSel + '">' +
        '<b>周' + C.DAY_SHORT[d] + '</b><i>' + C.shortDate(day) + '</i>' +
        '<span class="ds-count">' + (items.length ? items.length : '·') + '</span></button>';
    }
    html += '</div>';
    if (!isTodayView()) {
      html += '<div class="ds-back"><button class="text-btn tiny bordered" data-action="goto-today">回到今天</button>' +
        '<span>' + T('正在查看 ' + C.dateLabel(date) + ' 的朝程', '正在查看 ' + C.dateLabel(date) + ' 的课表') + '</span></div>';
    }
    return html;
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
      var span = btn.querySelector('.tab-cn') || btn.querySelector('span');
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

  // ============================================================ 皇室英文标注 / 换装 / LLM / 动效

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
    rose: { cn: '白蔷薇礼服', en: 'White Rose Gown', file: 'full-rose.webp' },
    witch: { cn: '旅行魔女', en: 'Wandering Witch', file: 'full-witch.webp' }
  };

  function currentOutfitKey() {
    var preview = params.get('outfit');
    if (preview && OUTFITS[preview]) return preview;
    var key = state.data && state.data.settings.teacherOutfit;
    return OUTFITS[key] ? key : 'court';
  }

  /** 单文件版会把素材内联成 data URI，通过映射表取用；正常版本回落到文件路径 */
  function outfitSrc(file) {
    var map = window.__CLASSTICK_OUTFIT_SRC || {};
    return map[file] || ('assets/teacher/' + file);
  }

  var EXPRESSIONS = {
    blink: 'full-blink.webp',
    talk: 'full-talk.webp',
    smile: 'full-smile.webp'
  };
  var expressionHideTimer = 0;
  var blinkLoopTimer = 0;

  function expressionSrc(file) {
    var map = window.__CLASSTICK_OUTFIT_SRC || {};
    return map[file] || ('assets/teacher/' + file);
  }

  function setTeacherExpression(name, holdMs) {
    var img = $('#teacher-expression');
    if (!img) return;
    if (expressionHideTimer) { clearTimeout(expressionHideTimer); expressionHideTimer = 0; }
    if (!name || currentOutfitKey() !== 'court') {
      img.style.opacity = '0';
      return;
    }
    var file = EXPRESSIONS[name];
    if (!file) return;
    img.setAttribute('src', expressionSrc(file));
    img.style.opacity = '1';
    if (holdMs) {
      expressionHideTimer = setTimeout(function () {
        img.style.opacity = '0';
        expressionHideTimer = 0;
      }, holdMs);
    }
  }

  function startTalking(ms) {
    if (!teacherOpen() || currentOutfitKey() !== 'court') return;
    setTeacherExpression('talk', ms || 900);
  }

  function startBlinkLoop() {
    if (blinkLoopTimer) clearInterval(blinkLoopTimer);
    blinkLoopTimer = setInterval(function () {
      if (!teacherOpen() || document.hidden) return;
      if (currentOutfitKey() !== 'court' || prefersReducedMotion()) return;
      var dlg = $('#dlg-teacher');
      if (!dlg || !dlg.open) return;
      setTeacherExpression('blink', 130);
    }, 4600);
  }

  function teacherMotion(name, ms) {
    var stage = $('.teacher-stage');
    if (!stage) return;
    stage.dataset.motion = name;
    setTimeout(function () {
      if (stage.dataset.motion === name) delete stage.dataset.motion;
    }, ms || 1100);
  }

  function applyTeacherOutfit(animate) {
    var key = currentOutfitKey();
    var outfit = OUTFITS[key];
    var art = $('#teacher-art');
    var sheet = $('#dlg-teacher');
    if (sheet) sheet.dataset.outfit = key;
    var nameEl = $('#teacher-outfit-name');
    if (nameEl) nameEl.textContent = outfit.en.toUpperCase() + ' · ' + outfit.cn;
    if (!art) return;
    var nextSrc = outfitSrc(outfit.file);
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
    var order = ['court', 'star', 'rose', 'witch'];
    var cur = currentOutfitKey();
    var next = order[(order.indexOf(cur) + 1) % order.length];
    state.data.settings.teacherOutfit = next;
    saveData();
    applyTeacherOutfit(true);
    if (teacherOpen()) {
      teacherSay('<p>换好了，殿下。这一套是 <b>' + OUTFITS[next].cn + '</b>（' + OUTFITS[next].en + '）。</p>', null, 260);
    }
    toast(T('已为艾莉丝换上 ' + OUTFITS[next].cn + ' · ' + OUTFITS[next].en, '已切换导师服装'));
    var outfitBtn = document.querySelector('#dlg-teacher [data-action="teacher-outfit"]');
    if (outfitBtn && !prefersReducedMotion()) {
      outfitBtn.classList.remove('is-flash');
      void outfitBtn.offsetWidth;
      outfitBtn.classList.add('is-flash');
      setTimeout(function () { outfitBtn.classList.remove('is-flash'); }, 680);
    }
  }

  // ---------------------------------------------------------- 可选的大模型对话
  var LLM_PRESETS = {
    deepseek: { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', keyHint: '输入 DeepSeek API Key' },
    zhipu: { name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', keyHint: '输入智谱 API Key' },
    kimi: { name: 'Kimi', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', keyHint: '输入 Kimi API Key' },
    siliconflow: { name: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct', keyHint: '输入硅基流动 API Key' },
    ollama: { name: 'Ollama（本地）', base: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:7b', keyHint: '本地模型无需 Key' },
    lmstudio: { name: 'LM Studio（本地）', base: 'http://127.0.0.1:1234/v1', model: 'local-model', keyHint: '本地模型无需 Key' },
    custom: { name: '自定义接口', base: '', model: '', keyHint: '按你的接口填写' }
  };

  function llmIsLocal() {
    var s = state.data && state.data.settings;
    return !!(s && /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(String(s.llmBase || '')));
  }

  function llmReady() {
    var s = state.data && state.data.settings;
    return !!(s && s.llmOn && s.llmBase && s.llmModel && (s.llmKey || llmIsLocal()));
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

  function askLLM(text, onDelta) {
    var s = state.data.settings;
    var base = String(s.llmBase || '').replace(/\/+$/, '');
    if (!base) return Promise.reject(new Error('未配置接口地址'));
    var controller = ('AbortController' in window) ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 30000) : null;
    var stream = typeof onDelta === 'function';
    var payload = {
      model: s.llmModel || 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 600,
      stream: stream,
      messages: [
        { role: 'system', content: teacherSystemPrompt() },
        { role: 'user', content: text }
      ]
    };
    var headers = { 'Content-Type': 'application/json' };
    if (s.llmKey) headers.Authorization = 'Bearer ' + s.llmKey;
    return fetch(base + '/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (!stream || !res.body || !res.body.getReader) return res.json().then(function (data) {
        var msg = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!msg) throw new Error('接口未返回内容');
        return '<p>' + esc(String(msg).trim()).replace(/\n/g, '<br>') + '</p>';
      });
      var reader = res.body.getReader();
      var decoder = ('TextDecoder' in window) ? new TextDecoder('utf-8') : null;
      var buffer = '';
      var full = '';
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) {
            if (timer) clearTimeout(timer);
            var clean = full.trim();
            if (!clean) throw new Error('接口未返回内容');
            return '<p>' + esc(clean).replace(/\n/g, '<br>') + '</p>';
          }
          buffer += decoder ? decoder.decode(chunk.value, { stream: true }) : String(chunk.value);
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(function (line) {
            line = line.trim();
            if (!line || line.indexOf('data:') !== 0) return;
            var data = line.slice(5).trim();
            if (data === '[DONE]') return;
            try {
              var json = JSON.parse(data);
              var delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
              if (delta) {
                full += delta;
                onDelta(delta, full);
              }
            } catch (e) { /* ignore partial line */ }
          });
          return pump();
        });
      }
      return pump();
    });
  }

  function updateTeacherAI() {
    var badge = $('#teacher-ai-badge');
    if (badge) badge.hidden = !llmReady();
    var form = $('#teacher-text');
    if (form) form.setAttribute('placeholder', llmReady()
      ? (llmIsLocal() ? '对艾莉丝说点什么…（本地模型已连接）' : '对艾莉丝说点什么…（AI 对话已开启）')
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

  function now() {
    return state.preview ? new Date(state.preview.getTime()) : new Date();
  }
  function toast(message, kind) {
    var box = document.createElement('div');
    box.className = 'toast' + (kind ? ' is-' + kind : '');
    box.textContent = message;
    var openDialog = document.querySelector('dialog[open]');
    var teacherDialog = document.getElementById('dlg-teacher');
    if (openDialog && openDialog === teacherDialog) {
      /* 导师对话内：把反馈做成聊天区上方的一条金色提示，不遮挡底部关闭按钮 */
      box.classList.add('teacher-flash');
      var log = document.getElementById('teacher-log');
      if (log) {
        log.appendChild(box);
        log.scrollTop = log.scrollHeight;
      }
    } else if (openDialog) {
      box.classList.add('toast-in-dialog');
      openDialog.appendChild(box);
    } else {
      $('#toasts').appendChild(box);
    }
    setTimeout(function () { box.classList.add('out'); }, 2600);
    setTimeout(function () { box.remove(); }, 3200);
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function todayStr() { return C.ymd(now()); }
  function findCourse(id) {
    return (state.data.courses || []).filter(function (c) { return c.id === id; })[0] || null;
  }
  function checkinKey(item) { return item.date + '|' + item.key; }
  function isCheckedIn(item) { return !!(state.data.checkins && state.data.checkins[checkinKey(item)]); }

  // ============================================================ 数据

  function loadData() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { raw = null; }
    var fromSeed = false;
    if (!raw) {
      raw = window.ClassTickSeed;
      fromSeed = true;
    }
    var data = C.normalizeData(raw);
    state.demo = fromSeed || localStorage.getItem(DEMO_KEY) === '1';
    return data;
  }
  function saveData() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); } catch (e) {
      toast(T('档案未能封存：浏览器存储不可用', '保存失败：浏览器存储不可用'), 'error');
    }
    if (PUSH.subscribed) queuePushSync();
  }
  function loadFired() {
    try { return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function markFired(key) {
    state.fired[key] = Date.now();
    var keys = Object.keys(state.fired);
    if (keys.length > 240) keys.slice(0, keys.length - 240).forEach(function (k) { delete state.fired[k]; });
    try { localStorage.setItem(FIRED_KEY, JSON.stringify(state.fired)); } catch (e) { /* ignore */ }
  }

  // ============================================================ 主题

  function applyTheme() {
    var theme = previewTheme || (state.data && state.data.settings.theme) || 'auto';
    document.documentElement.dataset.theme = theme;
    var royal = isRoyal();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', royal ? (dark ? '#141020' : '#241a44') : (dark ? '#12100e' : '#1f6f5c'));
    }
  }

  // ============================================================ 顶栏

  function notifyLabel() {
    var royal = isRoyal();
    if (!('Notification' in window)) return royal ? '不支持传令' : '不支持通知';
    if (Notification.permission === 'granted') return royal ? '传令已通' : '提醒已开启';
    if (Notification.permission === 'denied') return royal ? '传令受阻' : '提醒被拒绝';
    return royal ? '开启传令' : '开启提醒';
  }

  function renderTopbar() {
    var data = state.data;
    var week = C.semesterWeek(data.meta, now());
    var inTerm = week >= 1 && week <= data.meta.weeks;
    var sub = (inTerm ? '第 ' + week + ' 周' : (week < 1 ? '学期还没开始' : '学期已结束')) +
      ' · ' + C.dateLabel(now()) + ' ' + C.dayLabel(now()) +
      ' · ' + data.courses.length + ' 门课';
    var el = $('#brand-sub');
    if (el) el.textContent = sub;
    var label = $('#notify-label');
    if (label) label.textContent = notifyLabel();
    var btn = $('#btn-notify');
    if (btn) btn.classList.toggle('on', state.notify === 'granted');
    var foot = $('#foot-week');
    if (foot) foot.textContent = (isRoyal() ? '皇家典藏 · ' : '课刻 ClassTick · ') + (inTerm ? '第 ' + week + ' 周' : '假期中');
  }

  // ============================================================ 今日：Hero

  function dialsHTML(hours, minutes, seconds) {
    var parts = [];
    if (hours > 0) parts.push({ v: pad2(hours), u: '时' });
    parts.push({ v: pad2(minutes), u: '分' });
    if (hours === 0) parts.push({ v: pad2(seconds), u: '秒' });
    return parts.map(function (p, i) {
      return (i ? '<span class="cd-sep">:</span>' : '') +
        '<span class="cd-dial"><b>' + p.v + '</b><i>' + p.u + '</i></span>';
    }).join('');
  }

  function heroHTML() {
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
          '<span class="kicker-en">' + (isNow ? 'Now Teaching' : 'Next Class') + '</span>' +
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
          it.bring.map(function (b) {
            var packed = isPacked(b, C.parseYmd(it.date));
            return '<button class="hero-bring-chip' + (packed ? ' is-packed' : '') + '" data-action="toggle-packed" ' +
              'data-item="' + esc(b) + '" data-date="' + esc(it.date) + '" aria-pressed="' + packed + '" ' +
              'aria-label="' + esc((packed ? '取消已带：' : '标记已带：') + b) + '">' +
              (packed ? '<i>✓</i>' : '') + esc(b) + '</button>';
          }).join('') + '</p>' : '') +
      '</div>' +
      '<div class="hero-side">' +
        '<div class="countdown">' +
          '<span class="cd-label"><i class="cd-en">' + (isNow ? 'Remaining' : 'Countdown') + '</i>' + countdownLabel + '</span>' +
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

  // ============================================================ 今日：提示条

  function noticeHTML() {
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

  // ============================================================ 今日：时间线

  function timelineHTML() {
    var viewDate = currentViewDate();
    var todayView = isTodayView();
    var items = C.dayItems(state.data, viewDate);
    if (!items.length) {
      return '<div class="empty-state">' +
        '<span class="empty-emblem" aria-hidden="true"></span>' +
        '<span class="empty-emoji">☕️</span>' +
        '<p>' + T(isTodayView() ? '今日无课，城堡安歇' : C.dayLabel(viewDate) + '无课，城堡安歇', isTodayView() ? '今天没有课' : C.dayLabel(viewDate) + '没有课') + '</p>' +
        '<small>' + T('好好休整，或去「课程纹册」补全课表', '好好休息，或者去「课程」里把课表补全') + '</small>' +
        '</div>';
    }
    var n = now();
    var nowMin = todayView ? C.minuteOfDay(n) : -1;
    var nextFound = false;
    return items.map(function (it) {
      var st = 'future';
      var stateText = '';
      if (!todayView) {
        st = 'future';
        stateText = T('{t} 开讲', '{t} 开始', { t: C.minToHm(it.startMin) });
      } else if (nowMin >= it.endMin) {
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

  function sideHTML() {
    var viewDate = currentViewDate();
    var items = C.dayItems(state.data, viewDate);
    var bring = C.unionBring(items);
    var packed = packedFor(viewDate);
    var week = C.semesterWeek(state.data.meta, viewDate);
    var wstats = C.weekStats(state.data, week);
    var tomorrow = C.dayItems(state.data, C.addDays(viewDate, 1));
    var weekStart = C.addDays(C.semesterRange(state.data.meta).start, (week - 1) * 7);
    var un = bring.filter(function (name) { return !packed[name]; });
    var packedCount = bring.length - un.length;

    var bringHTML = '<h3 class="side-title">' + ICONS.bag + T(isTodayView() ? '今日行囊' : C.dayLabel(viewDate) + '行囊', isTodayView() ? '今天要带' : C.dayLabel(viewDate) + '要带') + '</h3>' +
      (bring.length
        ? '<div class="packed-progress"><span>' + packedCount + '/' + bring.length + ' 已带</span><i><b style="width:' + Math.round(bring.length ? packedCount / bring.length * 100 : 0) + '%"></b></i></div>' +
          '<div class="bring-cloud is-packing">' + bring.map(function (b) {
            var on = !!packed[b];
            return '<button class="bring-chip' + (on ? ' is-packed' : '') + '" data-action="toggle-packed" data-item="' + esc(b) + '" data-date="' + C.ymd(viewDate) + '" aria-pressed="' + on + '">' +
              (on ? '<span class="chip-check">✓</span>' : '') + esc(b) + '</button>';
          }).join('') + '</div>' +
          (un.length
            ? '<p class="packed-left">' + T('还差：', '还差：') + un.map(function (b) { return '<b>' + esc(b) + '</b>'; }).join('、') + '</p>' +
              '<button class="text-btn bordered tiny full" data-action="remind-unpacked">' + ICONS.bell + T('提醒我带齐', '提醒我带齐') + '</button>'
            : '<p class="packed-done">' + T('行囊已齐 ✓', '东西都带齐了 ✓') + '</p>')
        : '<p class="side-empty">' + T(isTodayView() ? '今日无需特别行装，轻装出行。' : '这天无需特别行装。', isTodayView() ? '今天没有特别要带的，轻装出门。' : '这天没有特别要带的。') + '</p>') +
      (items.length ? '<p class="side-note">' + T('出自：', '来自：') + items.map(function (i) { return esc(i.name); }).join('、') + '</p>' : '');

    var glanceHTML = '<h3 class="side-title">' + ICONS.calendar + T('本周朝纲', '本周一览') + '</h3>' +
      '<div class="week-bars">' + [1, 2, 3, 4, 5, 6, 7].map(function (d) {
        var count = wstats.days[d] || 0;
        var barDate = C.addDays(weekStart, d - 1);
        var isToday = C.isSameDay(barDate, now());
        var isSel = C.isSameDay(barDate, viewDate);
        return '<button class="week-bar' + (isToday ? ' is-today' : '') + (isSel ? ' is-selected' : '') + '" data-action="select-day" data-date="' + C.ymd(barDate) + '" aria-label="查看 ' + C.dayLabel(barDate) + ' 朝程">' +
          '<b>' + (count || '·') + '</b><i>周' + C.DAY_SHORT[d - 1] + '</i></button>';
      }).join('') + '</div>' +
      '<p class="side-note">' + T('本周共 {n} 节', '本周共 {n} 节', { n: wstats.count }) +
        (tomorrow.length
          ? T(' · 明日 {n} 节，最早 {t}', ' · 明天 {n} 节，最早 {t}', { n: tomorrow.length, t: C.minToHm(tomorrow[0].startMin) })
          : T(' · 明日无课', ' · 明天没课')) + '</p>' +
      '<button class="text-btn bordered tiny full" data-action="goto-tab" data-tab="planner">' + T('查看日程与 DDL →', '查看日程与 DDL →') + '</button>';

    var statusHTML = '<h3 class="side-title">' + ICONS.clock + T('此刻', '现在') + '</h3>' +
      '<p class="side-status">' + esc(dayStatusText(now())) + '</p>' +
      '<ul class="reminder-summary">' +
        '<li><span>' + T('晨钟早报', '每日早报') + '</span><b>' + (state.data.settings.digestOn ? state.data.settings.digestTime : T('已停', '关闭')) + '</b></li>' +
        '<li><span>' + T('鸣钟示警', '课前提醒') + '</span><b>' + (state.data.settings.preOn ? T('提前 {n} 分钟', '提前 {n} 分钟', { n: state.data.settings.preMin }) : T('已停', '关闭')) + '</b></li>' +
        '<li><span>' + T('御前签到', '签到提醒') + '</span><b>' + (state.data.settings.signOn ? T('课前 {n} 分钟', '课前 {n} 分钟', { n: state.data.settings.signMin }) : T('已停', '关闭')) + '</b></li>' +
      '</ul>' +
      '<button class="text-btn bordered tiny full" data-action="goto-tab" data-tab="settings">' + T('调整诏令', '调整提醒') + '</button>';

    return { bring: bringHTML, glance: glanceHTML, status: statusHTML };
  }


  function renderToday() {
    if (!state.data) return;
    var slot = $('#hero-slot');
    if (slot) {
      var firstRender = !slot.dataset.rendered;
      slot.innerHTML = heroHTML();
      slot.dataset.rendered = '1';
      var hero = slot.querySelector('.hero');
      if (hero && !firstRender) hero.style.animation = 'none';
    }
    var notice = $('#notice-slot');
    if (notice) notice.innerHTML = noticeHTML();
    var tl = $('#timeline');
    if (tl) tl.innerHTML = timelineHTML();
    var ds = $('#day-switch');
    if (ds) ds.innerHTML = daySwitchHTML();
    var title = $('#today-title');
    if (title) {
      var vd = currentViewDate();
      title.innerHTML = '<span class="h2-en">' + (isTodayView() ? "TODAY'S COURT" : weekdayEn(vd) + "'S COURT") + '</span>' +
        '<span class="h2-cn">' + T(isTodayView() ? '今日朝程' : C.dayLabel(vd) + '朝程', isTodayView() ? '今天的课' : C.dayLabel(vd) + '的课') + '</span>';
    }
    var side = sideHTML();
    if ($('#side-bring')) $('#side-bring').innerHTML = side.bring;
    if ($('#side-glance')) $('#side-glance').innerHTML = side.glance;
    if ($('#side-status')) $('#side-status').innerHTML = side.status;
    var sum = $('#today-sum');
    if (sum) {
      var items = C.dayItems(state.data, currentViewDate());
      if (items.length) {
        var mins = 0;
        items.forEach(function (it) { mins += it.endMin - it.startMin; });
        sum.textContent = items.length + ' 节 · ' + Math.floor(mins / 60) + ' 小时 ' + (mins % 60) + ' 分';
      } else {
        sum.textContent = T(isTodayView() ? '今日无课' : '这天无课', '暂无课程');
      }
    }
    decorateEnglish();
  }

  // ============================================================ 本周

  function renderWeek() {
    if (!state.data) return;
    var data = state.data;
    var currentWeek = C.semesterWeek(data.meta, now());
    var week = Math.max(1, Math.min(data.meta.weeks, currentWeek + state.weekOffset));
    state.weekOffset = week - currentWeek;
    var range = C.semesterRange(data.meta);
    var start = C.addDays(range.start, (week - 1) * 7);
    var end = C.addDays(start, 6);
    $('#week-title').innerHTML = '<span class="week-en">Week ' + toRoman(week) + ' · Chronicle</span>' +
      '<span class="week-cn">' + (isRoyal() ? '王历 · 第 ' + week + ' 周' : '第 ' + week + ' 周') + '</span>';
    var narrow = window.matchMedia('(max-width: 720px)').matches;
    $('#week-range').textContent = C.dateLabel(start) + ' – ' + C.dateLabel(end) +
      (week === currentWeek ? T(' · 本周', ' · 本周') : '') + (narrow ? T(' · 左右滑动', ' · 左右滑动') : '');
    var prev = $('[data-action="week-prev"]');
    var next = $('[data-action="week-next"]');
    if (prev) prev.disabled = week <= 1;
    if (next) next.disabled = week >= data.meta.weeks;

    var periods = data.periods;
    var rowH = window.matchMedia('(max-width: 560px)').matches ? 48 : 56;
    var html = '<div class="week-grid" style="--rows:' + periods.length + ';--row-h:' + rowH + 'px">';
    html += '<div class="wk-head wk-corner">' + T('时辰', '节次') + '</div>';
    for (var d = 1; d <= 7; d++) {
      var dayDate = C.addDays(start, d - 1);
      var isToday = C.isSameDay(dayDate, now());
      var isSelected = C.isSameDay(dayDate, currentViewDate());
      html += '<button class="wk-head' + (isToday ? ' is-today' : '') + (isSelected ? ' is-selected' : '') + (d >= 6 ? ' is-weekend' : '') + '" ' +
        'data-action="select-day" data-date="' + C.ymd(dayDate) + '" aria-label="查看 ' + C.dayLabel(dayDate) + ' 朝程">' +
        '<b>周' + C.DAY_SHORT[d - 1] + '</b><span>' + C.shortDate(dayDate) + '</span></button>';
    }
    html += '<div class="wk-times" style="grid-row:2 / span ' + periods.length + '">';
    periods.forEach(function (p) {
      html += '<div class="wk-time"><b>' + p.n + '</b><span>' + p.start + '</span></div>';
    });
    html += '</div>';
    for (var day = 1; day <= 7; day++) {
      var date = C.addDays(start, day - 1);
      var items = decorateWeekItems(C.dayItems(data, date), periods);
      html += '<div class="wk-col' + (C.isSameDay(date, now()) ? ' is-today' : '') + (C.isSameDay(date, currentViewDate()) ? ' is-selected' : '') + (day >= 6 ? ' is-weekend' : '') +
        '" style="grid-column:' + (day + 1) + ';grid-row:2 / span ' + periods.length + '">';
      // 计算泳道，避免同一时段重叠的课互相遮挡
      var lanes = [];
      var placed = items.map(function (it) {
        var lane = 0;
        while (lane < lanes.length && lanes[lane] > it.startMin) lane++;
        lanes[lane] = it.endMin;
        return { it: it, lane: lane };
      });
      var laneCount = Math.max(1, lanes.length);
      placed.forEach(function (p) {
        var it = p.it;
        var top = it.periodStartIndex * rowH;
        var height = (it.periodEndIndex - it.periodStartIndex + 1) * rowH - 6;
        var width = (100 / laneCount);
        html += '<button class="wk-block" style="--tint:var(--c-' + esc(it.color) + ');top:' + (top + 3) + 'px;height:' + height +
          'px;left:calc(' + (p.lane * width) + '% + 2px);width:calc(' + width + '% - 4px)" ' +
          'data-action="course-edit" data-id="' + esc(it.courseId) + '" title="' + esc(it.name + ' · ' + (it.room || '') + ' · ' + it.periodLabel) + '">' +
          '<b>' + esc(it.name) + '</b>' +
          '<span>' + esc(it.room || '') + '</span>' +
          '<span class="wk-block-time">' + C.minToHm(it.startMin) + '–' + C.minToHm(it.endMin) + '</span>' +
          '</button>';
      });
      if (!items.length) html += '<span class="wk-empty">·</span>';
      html += '</div>';
    }
    html += '</div>';
    $('#week-scroll').innerHTML = html;

    var courseMap = {};
    data.courses.forEach(function (c) { courseMap[c.id] = c; });
    var weekCourses = {};
    for (var dd = 1; dd <= 7; dd++) {
      C.dayItems(data, C.addDays(start, dd - 1)).forEach(function (it) { weekCourses[it.courseId] = true; });
    }
    var legend = Object.keys(weekCourses).map(function (id) {
      var c = courseMap[id];
      if (!c) return '';
      return '<span class="legend-item"><i style="background:var(--c-' + esc(c.color) + ')"></i>' + esc(c.name) + '</span>';
    }).join('');
    $('#legend').innerHTML = legend || '<span class="legend-empty">' + T('本周无课', '这周没有课') + '</span>';
    decorateEnglish();
  }

  // 周视图定位辅助：给 item 附加节次索引（渲染前计算）
  function decorateWeekItems(items, periods) {
    items.forEach(function (it) {
      var startIdx = 0;
      for (var i = 0; i < periods.length; i++) {
        if (it.startMin >= C.hmToMin(periods[i].start)) startIdx = i;
      }
      var endIdx = startIdx;
      for (var j = startIdx; j < periods.length; j++) {
        endIdx = j;
        if (it.endMin <= C.hmToMin(periods[j].end) + 1) break;
      }
      it.periodStartIndex = startIdx;
      it.periodEndIndex = Math.max(startIdx, endIdx);
    });
    return items;
  }

  // ============================================================ 课程

  function renderCourses() {
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
            '<p>' + (c.teacher ? esc(c.teacher) + ' · ' : '') +
              (isRoyal() && HOUSE[c.color] ? HOUSE[c.color].name + '家族 · ' : '') +
              T('{n} 个时段', '{n} 个时间段', { n: c.sessions.length }) + '</p>' +
            '<p class="course-en">' + (isRoyal() && HOUSE[c.color] ? 'House of the ' + HOUSE[c.color].en + ' · ' + HOUSE[c.color].enMotto : '') + '</p></div>' +
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
    decorateEnglish();
  }

  // ============================================================ 日程 / DDL

  function findTask(id) {
    return (state.data.tasks || []).filter(function (t) { return t.id === id; })[0] || null;
  }

  function taskStatus(task) {
    if (task.done) return 'done';
    var due = C.taskDueAt(task);
    if (due.getTime() < now().getTime()) return 'overdue';
    if (C.isSameDay(due, now())) return 'today';
    if (C.isSameDay(due, C.addDays(now(), 1))) return 'tomorrow';
    return 'later';
  }

  function taskRemindText(min) {
    if (min == null) return '';
    if (min === 0) return T('截止时提醒', '截止时提醒');
    if (min % 1440 === 0) return T('提前 {n} 天', '提前 {n} 天', { n: min / 1440 });
    if (min % 60 === 0) return T('提前 {n} 小时', '提前 {n} 小时', { n: min / 60 });
    return T('提前 {n} 分钟', '提前 {n} 分钟', { n: min });
  }

  function taskDueText(task) {
    var due = C.taskDueAt(task);
    var st = taskStatus(task);
    if (st === 'done') return T('已完成', '已完成');
    var time = task.time ? ' ' + task.time : '';
    if (st === 'overdue') return T('已逾期', '已逾期') + ' · ' + C.dateLabel(due) + time;
    if (st === 'today') return T('今天截止', '今天截止') + time;
    if (st === 'tomorrow') return T('明天截止', '明天截止') + time;
    return C.dateLabel(due) + time;
  }

  function plannerFilteredTasks() {
    var filter = state.plannerFilter;
    var list = (state.data.tasks || []).slice();
    if (filter === 'done') return list.filter(function (t) { return t.done; });
    if (filter !== 'all') list = list.filter(function (t) { return !t.done; });
    if (['homework', 'exam', 'todo', 'event'].indexOf(filter) >= 0) {
      list = list.filter(function (t) { return t.type === filter; });
    }
    return list;
  }

  function plannerCounts() {
    var tasks = state.data.tasks || [];
    var open = tasks.filter(function (t) { return !t.done; });
    var weekEnd = C.addDays(now(), 7);
    return {
      open: open.length,
      today: open.filter(function (t) { return C.isSameDay(C.taskDueAt(t), now()) && taskStatus(t) !== 'overdue'; }).length,
      overdue: open.filter(function (t) { return taskStatus(t) === 'overdue'; }).length,
      week: open.filter(function (t) {
        var due = C.taskDueAt(t);
        return taskStatus(t) !== 'overdue' && due.getTime() <= weekEnd.getTime();
      }).length,
      done: tasks.length - open.length
    };
  }

  function taskItemHTML(task) {
    var st = taskStatus(task);
    var typeLabel = C.taskTypeLabel(task.type);
    return '<article class="task-item is-' + st + ' is-p' + task.priority + '" data-id="' + esc(task.id) + '">' +
      '<button class="task-check' + (task.done ? ' is-done' : '') + '" data-action="task-toggle" data-id="' + esc(task.id) + '" ' +
        'aria-label="' + (task.done ? T('标记未完成', '标记未完成') : T('标记完成', '标记完成')) + '" aria-pressed="' + task.done + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<div class="task-main">' +
        '<header class="task-head"><h3>' + esc(task.title) + '</h3>' +
          '<span class="task-type type-' + task.type + '">' + typeLabel + '</span></header>' +
        '<p class="task-meta">' +
          '<span class="task-due is-' + st + '">' + ICONS.clock + esc(taskDueText(task)) + '</span>' +
          (task.courseName ? '<span>' + ICONS.calendar + esc(task.courseName) + '</span>' : '') +
          (task.remindMin != null ? '<span>' + ICONS.bell + esc(taskRemindText(task.remindMin)) + '</span>' : '') +
          '<span class="task-priority p' + task.priority + '">' + (task.priority === 1 ? T('重要', '重要') : task.priority === 3 ? T('次要', '次要') : T('普通', '普通')) + '</span>' +
        '</p>' +
        (task.note ? '<p class="task-note">' + esc(task.note) + '</p>' : '') +
      '</div>' +
      '<div class="task-actions">' +
        '<button class="icon-btn" data-action="task-edit" data-id="' + esc(task.id) + '" aria-label="' + T('编辑', '编辑') + '">' + ICONS.edit + '</button>' +
        '<button class="icon-btn danger" data-action="task-delete" data-id="' + esc(task.id) + '" aria-label="' + T('删除', '删除') + '">' + ICONS.trash + '</button>' +
      '</div>' +
    '</article>';
  }

  function plannerSettingsHTML() {
    var s = state.data.settings;
    return switchRow('data-setting="taskRemindOn"' + (s.taskRemindOn ? ' checked' : ''), T('DDL 截止提醒', 'DDL 截止提醒'), T('在作业 / 考试 / 待办截止前按默认时间提醒', '在作业 / 考试 / 待办截止前提醒')) +
      '<div class="sub-row"><label>' + T('默认提前', '默认提前') + ' <input type="number" min="0" max="1440" step="5" data-setting="taskRemindMin" value="' + s.taskRemindMin + '"> ' + T('分钟', '分钟') + '</label></div>' +
      switchRow('data-setting="taskEveningOn"' + (s.taskEveningOn ? ' checked' : ''), T('前一日暮色预告', '前一日晚间预告'), T('截止前一天晚上提醒明日 DDL，提前准备', '截止前一天晚上提醒明天的 DDL')) +
      '<div class="sub-row"><label>' + T('预告时间', '预告时间') + ' <input type="time" data-setting="taskEveningTime" value="' + s.taskEveningTime + '"></label></div>' +
      '<p class="hint">' + T('这些提醒会并入课刻的传令系统；导出 .ics 时任务也会写入系统日历。', '这些提醒会并入课刻的提醒系统；导出 .ics 时任务也会写入系统日历。') + '</p>';
  }

  function renderPlanner() {
    if (!state.data) return;
    var counts = plannerCounts();
    var stats = $('#planner-stats');
    if (stats) {
      stats.innerHTML =
        '<div class="planner-stat is-today"><b>' + counts.today + '</b><span>' + T('今日待办', '今日待办') + '</span><small>Today</small></div>' +
        '<div class="planner-stat is-overdue"><b>' + counts.overdue + '</b><span>' + T('已逾期', '已逾期') + '</span><small>Overdue</small></div>' +
        '<div class="planner-stat"><b>' + counts.week + '</b><span>' + T('七日内 DDL', '七日内 DDL') + '</span><small>This Week</small></div>' +
        '<div class="planner-stat is-done"><b>' + counts.done + '</b><span>' + T('已完成', '已完成') + '</span><small>Done</small></div>';
    }
    var filters = $('#planner-filters');
    if (filters) {
      var options = [['open', T('未完成', '未完成')], ['all', T('全部', '全部')], ['homework', T('作业', '作业')], ['exam', T('考试', '考试')], ['todo', T('待办', '待办')], ['event', T('日程', '日程')], ['done', T('已完成', '已完成')]];
      filters.innerHTML = options.map(function (o) {
        return '<button class="filter-chip' + (state.plannerFilter === o[0] ? ' is-on' : '') + '" data-action="task-filter" data-filter="' + o[0] + '">' + o[1] + '</button>';
      }).join('');
    }
    var box = $('#planner-list');
    if (box) {
      var tasks = plannerFilteredTasks();
      if (!tasks.length) {
        box.innerHTML = '<div class="empty-state planner-empty"><span class="empty-emblem" aria-hidden="true"></span><span class="empty-emoji">🕯️</span>' +
          '<p>' + T(state.data.tasks.length ? '此筛选下没有日程' : '日程尚空，殿下可以记下第一项作业', state.data.tasks.length ? '这个筛选下没有日程' : '还没有日程，先记下第一项作业吧') + '</p>' +
          '<small>' + T('DDL、考试、待办与重要事项都可以记在这里', 'DDL、考试、待办和重要事项都可以记在这里') + '</small></div>';
      } else {
        var groups = [
          { key: 'overdue', label: T('已逾期', '已逾期') },
          { key: 'today', label: T('今天', '今天') },
          { key: 'tomorrow', label: T('明天', '明天') },
          { key: 'later', label: T('以后', '以后') },
          { key: 'done', label: T('已完成', '已完成') }
        ];
        var html = '';
        groups.forEach(function (g) {
          var list = tasks.filter(function (t) { return taskStatus(t) === g.key; });
          if (!list.length) return;
          html += '<section class="task-group"><h3 class="task-group-title">' + g.label +
            '<span>' + list.length + '</span></h3>' + list.map(taskItemHTML).join('') + '</section>';
        });
        box.innerHTML = html;
      }
    }
    var ps = $('#planner-settings');
    if (ps) ps.innerHTML = plannerSettingsHTML();
    decorateEnglish();
  }

  function openTaskDialog(id) {
    var task = id ? findTask(id) : null;
    state.editingTaskId = task ? task.id : null;
    var title = $('#dlg-task-title');
    if (title) title.textContent = task ? T('编辑日程', '编辑日程') : T('新建日程', '新建日程');
    $('#task-id').value = task ? task.id : '';
    $('#task-title').value = task ? task.title : '';
    $('#task-type').value = task ? task.type : 'homework';
    var courseSel = $('#task-course');
    courseSel.innerHTML = '<option value="">' + T('不关联', '不关联') + '</option>' + state.data.courses.map(function (c) {
      return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>';
    }).join('');
    courseSel.value = task && task.courseName ? task.courseName : '';
    if (courseSel.value !== (task && task.courseName ? task.courseName : '')) courseSel.value = '';
    $('#task-due').value = task ? task.due : C.ymd(now());
    $('#task-time').value = task ? task.time : '';
    $('#task-priority').value = task ? String(task.priority) : '2';
    var remindSel = $('#task-remind');
    remindSel.value = task && task.remindMin != null ? String(task.remindMin) : '';
    if (remindSel.value === '' && task && task.remindMin != null) {
      var opt = document.createElement('option');
      opt.value = String(task.remindMin);
      opt.textContent = T('提前 {n} 分钟', '提前 {n} 分钟', { n: task.remindMin });
      remindSel.appendChild(opt);
      remindSel.value = String(task.remindMin);
    }
    $('#task-note').value = task ? task.note : '';
    $('#task-delete').hidden = !task;
    $('#dlg-task').showModal();
  }

  function saveTaskForm() {
    var id = $('#task-id').value;
    var raw = {
      id: id || C.uid('t'),
      title: $('#task-title').value.trim(),
      type: $('#task-type').value,
      courseName: $('#task-course').value,
      due: $('#task-due').value,
      time: $('#task-time').value,
      priority: Number($('#task-priority').value) || 2,
      remindMin: $('#task-remind').value === '' ? null : Number($('#task-remind').value),
      note: $('#task-note').value.trim()
    };
    if (!raw.title) {
      toast(T('请先给日程起个名字', '请先填写标题'), 'error');
      return;
    }
    var task = C.normalizeTasks([raw])[0];
    if (!task) {
      toast(T('请填写有效的截止日期', '请填写有效的截止日期'), 'error');
      return;
    }
    var old = id ? findTask(id) : null;
    if (old) {
      task.done = old.done;
      task.doneAt = old.doneAt;
      task.createdAt = old.createdAt;
      state.data.tasks = state.data.tasks.map(function (t) { return t.id === id ? task : t; });
    } else {
      state.data.tasks.push(task);
    }
    saveData();
    var dlg = $('#dlg-task');
    if (dlg && dlg.open) dlg.close();
    renderPlanner();
    renderToday();
    toast(T(old ? '日程已更新 ✓' : '日程已记下 ✓', old ? '日程已更新 ✓' : '日程已记下 ✓'));
  }

  function toggleTask(id) {
    var task = findTask(id);
    if (!task) return;
    task.done = !task.done;
    task.doneAt = task.done ? new Date().toISOString() : '';
    saveData();
    renderPlanner();
    toast(task.done ? T('已划掉「' + task.title + '」✓', '已完成「' + task.title + '」✓') : T('已恢复为未完成', '已恢复为未完成'));
  }

  function deleteTask(id) {
    var task = findTask(id);
    if (!task) return;
    confirmDialog(T('删除「' + task.title + '」？删除后不可恢复。', '删除「' + task.title + '」？删除后不可恢复。'), function () {
      state.data.tasks = state.data.tasks.filter(function (t) { return t.id !== id; });
      saveData();
      var dlg = $('#dlg-task');
      if (dlg && dlg.open) dlg.close();
      renderPlanner();
      renderToday();
      toast(T('日程已删除', '日程已删除'));
    });
  }

  // ============================================================ 设置

  function switchRow(attrs, title, desc) {
    return '<label class="switch-row">' +
      '<span class="switch-text"><b>' + title + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</span>' +
      '<input type="checkbox" ' + attrs + '>' +
      '<i class="switch" aria-hidden="true"></i>' +
      '</label>';
  }

  function nextReminderText() {
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

  function settingsHTML() {
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

    html += pushStatusHTML();

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

    html += '<section class="panel"><div class="panel-head"><h2>' + T('皇家导师', '课程管家') + '</h2><span class="panel-sub">' + T('可交互的课表管家', '可交互的课程助手') + '</span></div>' +
      switchRow('data-setting="teacher"' + (s.teacher !== false ? ' checked' : ''), T('显示皇家导师', '显示课程助手'), T('点左下角头像，可唤来艾莉丝调整传令与查看朝程', '点左下角头像，可唤来助手调整提醒与查看课表')) +
      '<div class="sub-row"><label>' + T('导师服饰', '导师服饰') + ' <select data-setting="teacherOutfit">' +
        [['court', '宫廷制服 · Court'], ['star', '星夜礼服 · Starlit'], ['rose', '白蔷薇礼服 · Rose'], ['witch', '旅行魔女 · Witch']].map(function (o) {
          return '<option value="' + o[0] + '"' + (s.teacherOutfit === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></label></div>' +
      '<div class="btn-grid"><button class="text-btn solid" data-action="teacher-open">' + T('唤来艾莉丝', '打开助手') + '</button>' +
      '<button class="text-btn bordered" data-action="teacher-reintro">' + T('重新认识艾莉丝', '重新介绍') + '</button></div>' +
      '<p class="hint">' + T('她可以直接改设置：早报时间、鸣钟提前量、签到分钟数、皮肤与主题，还能查看朝程、导出日历、打开签到入口。', '对话可以直接改设置：早报时间、课前提前量、签到分钟数、皮肤与主题，还能查看课表、导出日历。') + '</p></section>';

    html += '<section class="panel"><div class="panel-head"><h2><span class="h2-en">AI Conversation</span><span class="h2-cn">' + T('AI 对话（可选）', 'AI 对话（可选）') + '</span></h2><span class="panel-sub">' + T('可选 · 需自备 API', '可选 · 需自备 API') + '</span></div>' +
      switchRow('data-setting="llmOn"' + (s.llmOn ? ' checked' : ''), T('启用大模型对话', '启用大模型对话'), T('未听懂的句子交给大模型；关闭时完全本地解析、离线可用', '未听懂的句子交给大模型；关闭时完全本地解析')) +
      '<div class="llm-config">' +
      '<div class="field"><span>' + T('服务预设', '服务预设') + '</span><select data-setting="llmPreset">' +
      Object.keys(LLM_PRESETS).map(function (key) {
        return '<option value="' + key + '"' + (s.llmPreset === key ? ' selected' : '') + '>' + LLM_PRESETS[key].name + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field-row">' +
      '<label class="field"><span>' + T('接口地址', '接口地址') + '</span><input type="text" data-setting="llmBase" value="' + esc(s.llmBase) + '" placeholder="https://api.deepseek.com/v1"></label>' +
      '<label class="field"><span>' + T('模型', '模型') + '</span><input type="text" data-setting="llmModel" value="' + esc(s.llmModel) + '" placeholder="deepseek-chat"></label>' +
      '</div>' +
      '<div class="field"><span>' + T('API Key（仅存本机）', 'API Key（仅存本机）') + '</span><input type="password" data-setting="llmKey" value="' + esc(s.llmKey) + '" placeholder="sk-..." autocomplete="off"></div>' +
      '<div class="btn-grid"><button class="text-btn solid" data-action="teacher-test-llm">' + T('测试连接', '测试连接') + '</button>' +
      '<button class="text-btn bordered" data-action="teacher-open">' + T('打开对话', '打开对话') + '</button></div>' +
      '<p class="hint">' + T('开启后，仅当本地规则听不懂时，才会把这句话与课表上下文（时间、下一节课、提醒设置）发给你配置的接口，并逐字流式回复；Key 只保存在本机浏览器。选 Ollama / LM Studio 时填本机地址即可，无需 Key、完全离线。', '开启后，仅当本地规则听不懂时，才会把这句话与课表上下文发给接口，并逐字流式回复；Key 只保存在本机浏览器。选 Ollama / LM Studio 时填本机地址即可，无需 Key。') + '</p>' +
      '</div></section>';

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
      '<input type="text" value="' + (isRoyal() ? '课刻 ClassTick · 皇家典藏 v1.6.0' : '课刻 ClassTick · 学院纸感 v1.6.0') + '" readonly></label>' +
      '<label class="field"><span>' + T('存档位置', '存储位置') + '</span><input type="text" value="' + T('本机浏览器 · 不上传', '本机浏览器 · 不上传') + '" readonly></label></div>' +
      '<div class="btn-grid">' +
      '<button class="text-btn bordered" data-action="install">' + T('安装到桌面 / 手机', '安装到桌面 / 手机') + '</button>' +
      '<button class="text-btn bordered" data-action="show-about">' + T('安装与诏令说明', '安装与提醒说明') + '</button>' +
      '<button class="text-btn bordered danger" data-action="clear-all">' + T('清空全部档案', '清空全部数据') + '</button>' +
      '</div></section>';

    return html;
  }

  function periodEditorHTML() {
    return state.data.periods.map(function (p, i) {
      return '<div class="period-row">' +
        '<span class="period-n">' + p.n + '</span>' +
        '<input type="time" data-period="' + i + '" data-field="start" value="' + p.start + '" aria-label="第' + p.n + '节开始时间">' +
        '<span class="period-dash">–</span>' +
        '<input type="time" data-period="' + i + '" data-field="end" value="' + p.end + '" aria-label="第' + p.n + '节结束时间">' +
        '</div>';
    }).join('');
  }

  function renderSettings() {
    var root = $('#settings-root');
    if (!root) return;
    root.innerHTML = settingsHTML();
    decorateEnglish();
  }

  // ============================================================ 渲染入口

  function renderCourt() {
    var witch = document.getElementById('court-witch-img');
    if (witch) witch.setAttribute('src', outfitSrc('full-witch.webp'));
  }

  function renderAll() {
    applySkin();
    renderTopbar();
    renderCourt();
    renderToday();
    renderWeek();
    renderCourses();
    renderPlanner();
    renderSettings();
    decorateEnglish();
    applyTeacherOutfit(false);
    updateTeacherAI();
    updateTeacherDock();
    renderTeacherStatus();
  }

  function renderCurrentTab() {
    if (state.tab === 'today') renderToday();
    else if (state.tab === 'week') renderWeek();
    else if (state.tab === 'courses') renderCourses();
    else if (state.tab === 'planner') renderPlanner();
    else if (state.tab === 'settings') renderSettings();
  }

  function setTab(tab) {
    if (['today', 'week', 'courses', 'planner', 'settings'].indexOf(tab) === -1) tab = 'today';
    state.tab = tab;
    $$('.view').forEach(function (v) {
      var active = v.dataset.view === tab;
      v.classList.toggle('is-active', active);
      v.hidden = !active;
    });
    $$('.tab').forEach(function (b) {
      var active = b.dataset.tab === tab;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (tab === 'week') state.weekOffset = 0;
    if (tab === 'planner') renderPlanner();
    renderCurrentTab();
    if (!widgetMode) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================ 提醒 & 通知

  function addReminderCard(r) {
    var stack = $('#reminder-stack');
    if (!stack) return;
    var id = 'rem-' + Date.now().toString(36);
    state.reminders[id] = r;
    var royalLabels = { digest: '晨间诏书', pre: '鸣钟示警', sign: '御前签到', evening: '暮色预告', task: '课业传令', 'task-eve': '明日截止' };
    var classicLabels = { digest: '今日早报', pre: '课前提醒', sign: '签到提醒', evening: '晚间预告', task: '作业提醒', 'task-eve': '明日截止' };
    var kindLabel = (isRoyal() ? royalLabels : classicLabels)[r.kind] || (isRoyal() ? '传令' : '提醒');
    var el = document.createElement('div');
    el.className = 'reminder kind-' + r.kind;
    el.innerHTML =
      '<div class="reminder-head"><span class="reminder-kind">' + kindLabel + '</span>' +
      '<button class="icon-btn" data-action="reminder-dismiss" data-rem="' + id + '" aria-label="关闭提醒">×</button></div>' +
      '<h3>' + esc(r.title) + '</h3>' +
      '<p>' + esc(r.body) + '</p>' +
      '<div class="reminder-actions">' +
      ((r.kind === 'task' || r.kind === 'task-eve') && r.task
        ? '<button class="text-btn solid tiny" data-action="reminder-task-done" data-rem="' + id + '">' + ICONS.check + T('标记完成', '标记完成') + '</button>' +
          '<button class="text-btn bordered tiny" data-action="reminder-dismiss" data-rem="' + id + '">' + T('知道了', '知道了') + '</button>'
        : (r.kind === 'sign' && r.item
          ? '<button class="text-btn solid tiny" data-action="reminder-checkin" data-rem="' + id + '">' + ICONS.check + T('落印签到', '标记已签到') + '</button>' +
            (state.data.settings.signInUrl ? '<a class="text-btn bordered tiny" href="' + esc(state.data.settings.signInUrl) + '" target="_blank" rel="noreferrer">' + T('前往签到处', '打开签到入口') + '</a>' : '')
          : '<button class="text-btn bordered tiny" data-action="reminder-dismiss" data-rem="' + id + '">' + T('知道了', '知道了') + '</button>')) +
      '</div>';
    stack.appendChild(el);
    if (r.kind !== 'sign') {
      setTimeout(function () { el.classList.add('out'); }, 45000);
      setTimeout(function () { el.remove(); }, 46000);
    }
  }

  function showSystemNotification(title, body, opts) {
    opts = opts || {};
    if (!('Notification' in window) || Notification.permission !== 'granted') return Promise.resolve(false);
    var options = {
      body: body,
      icon: isRoyal() ? TEACHER.chibi : 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      tag: opts.tag || 'classtick',
      renotify: true,
      requireInteraction: !!opts.requireInteraction,
      data: { url: './?tab=today' }
    };
    return navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && reg.showNotification) return reg.showNotification(title, options).then(function () { return true; });
      new Notification(title, options);
      return true;
    }).catch(function () {
      try { new Notification(title, options); return true; } catch (e) { return false; }
    });
  }

  function fireReminder(r) {
    var view = isRoyal()
      ? Object.assign({}, r, { title: royalReminderTitle(r), body: royalReminderBody(r) })
      : r;
    if ((r.kind === 'pre' || r.kind === 'sign') && r.item) {
      var missing = unpackedForItem(r.item);
      if (missing.length) view.body += T(' 还差：' + missing.join('、'), ' 还差：' + missing.join('、'));
    }
    addReminderCard(view);
    var isSign = r.kind === 'sign';
    showSystemNotification(view.title, view.body, { tag: r.key, requireInteraction: isSign });
    if (navigator.vibrate) {
      try { navigator.vibrate(isSign ? [90, 60, 90, 60, 160] : [60, 40, 60]); } catch (e) { /* ignore */ }
    }
  }

  function checkReminders(force) {
    if (!state.data || state.preview) return;
    var current = new Date();
    var list = C.buildReminders(state.data, C.addDays(current, -1), C.addDays(current, 1))
      .concat(C.buildTaskReminders(state.data, C.addDays(current, -1), C.addDays(current, 1)));
    list.sort(function (a, b) { return a.at - b.at; });
    list.forEach(function (r) {
      var diff = current.getTime() - r.at.getTime();
      if (diff < 0 || diff > 10 * 60000) return;
      if (state.fired[r.key]) return;
      markFired(r.key);
      fireReminder(r);
    });
  }

  function enableNotifications() {
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

  // ============================================================ 后台传令 · Web Push

  var PUSH = {
    supported: false,
    available: false,
    subscribed: false,
    count: 0,
    next: null,
    busy: false,
    error: '',
    loaded: false
  };
  var pushSyncTimer = 0;

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window &&
      (location.protocol === 'https:' || location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' || location.hostname === '[::1]');
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function pushData() {
    var clone = JSON.parse(JSON.stringify(state.data));
    if (clone.settings) {
      clone.settings.llmKey = '';
      clone.settings.llmBase = '';
    }
    return clone;
  }

  function pushFetch(path, options) {
    return fetch(path, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, options || {})).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
        return body;
      });
    });
  }

  function loadPushStatus() {
    if (!pushSupported()) {
      PUSH.loaded = true;
      return Promise.resolve();
    }
    PUSH.supported = true;
    return fetch('/api/push/status').then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (status) {
      PUSH.available = !!status.ok;
      PUSH.count = status.subscribed || 0;
      PUSH.next = status.next || null;
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      PUSH.subscribed = !!sub;
      PUSH.loaded = true;
      if (state.tab === 'settings') renderSettings();
    }).catch(function (err) {
      PUSH.loaded = true;
      PUSH.error = err && err.message ? err.message : String(err);
    });
  }

  function enablePush() {
    if (!pushSupported()) {
      toast(T('这个环境不支持后台传令：需要 HTTPS 或 localhost，且浏览器支持 Push', '当前环境不支持后台推送：需要 HTTPS 或 localhost'), 'error');
      return;
    }
    if (!('Notification' in window)) {
      toast(T('浏览器不支持通知', '浏览器不支持通知'), 'error');
      return;
    }
    PUSH.busy = true;
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error('通知权限未允许');
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return fetch('/api/push/key').then(function (res) {
        if (!res.ok) throw new Error('后台服务未启动');
        return res.json();
      }).then(function (keyInfo) {
        if (!keyInfo.publicKey) throw new Error('服务端未生成 VAPID 公钥');
        return reg.pushManager.getSubscription().then(function (old) {
          return old || reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyInfo.publicKey)
          });
        });
      }).then(function (sub) {
        return pushFetch('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription: sub.toJSON(), data: pushData() })
        });
      });
    }).then(function (result) {
      PUSH.subscribed = true;
      PUSH.available = true;
      PUSH.count = result.subscribed || 1;
      PUSH.next = result.next || null;
      PUSH.error = '';
      PUSH.busy = false;
      renderSettings();
      toast(T('后台传令已开启：关闭课刻也会收到提醒', '后台提醒已开启：关闭应用也会收到通知'));
    }).catch(function (err) {
      PUSH.busy = false;
      PUSH.error = err && err.message ? err.message : String(err);
      renderSettings();
      toast(T('后台传令开启失败：' + PUSH.error, '开启后台提醒失败：' + PUSH.error), 'error');
    });
  }

  function disablePush() {
    PUSH.busy = true;
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return null;
      return pushFetch('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: sub.endpoint })
      }).catch(function () { return null; }).then(function () {
        return sub.unsubscribe();
      });
    }).then(function () {
      PUSH.subscribed = false;
      PUSH.busy = false;
      renderSettings();
      toast(T('已关闭后台传令；页面打开时的提醒仍有效', '已关闭后台提醒；打开页面时的提醒仍然有效'));
    }).catch(function (err) {
      PUSH.busy = false;
      toast(T('关闭失败：' + err.message, '关闭失败：' + err.message), 'error');
    });
  }

  function testPush() {
    pushFetch('/api/push/test', { method: 'POST' }).then(function (result) {
      toast(T('测试后台传令已发送：' + result.sent + '/' + result.total + ' 台设备', '测试推送已发送：' + result.sent + '/' + result.total + ' 台设备'));
    }).catch(function (err) {
      toast(T('测试失败：' + err.message, '测试失败：' + err.message), 'error');
    });
  }

  function syncPushNow() {
    if (!PUSH.subscribed) return Promise.resolve();
    return pushFetch('/api/push/sync', { method: 'POST', body: JSON.stringify({ data: pushData() }) })
      .then(function (result) { PUSH.next = result.next || null; })
      .catch(function (err) { PUSH.error = err.message; });
  }

  function queuePushSync() {
    if (pushSyncTimer) clearTimeout(pushSyncTimer);
    pushSyncTimer = setTimeout(function () {
      pushSyncTimer = 0;
      syncPushNow();
    }, 900);
  }

  function pushStatusHTML() {
    var badge = PUSH.subscribed ? T('已连接', '已连接') : (PUSH.available ? T('未开启', '未开启') : T('不可用', '不可用'));
    var badgeClass = PUSH.subscribed ? 'ok' : (PUSH.available ? 'warn' : 'warn');
    var next = PUSH.next
      ? T('下一条后台传令：', '下一条后台提醒：') + C.relativeDayLabel(new Date(PUSH.next.at), now()) + ' ' +
        C.minToHm(new Date(PUSH.next.at).getHours() * 60 + new Date(PUSH.next.at).getMinutes()) + ' · ' + esc(PUSH.next.title || '')
      : T('同步课表后会自动排程', '同步课表后会自动排程');
    var serverHint = PUSH.available
      ? T('后台服务已就绪 · ' + PUSH.count + ' 台设备订阅', '后台服务已就绪 · ' + PUSH.count + ' 台设备订阅')
      : T('未连接后台服务（file:// 或静态托管时不可用，可回退 .ics）', '未连接后台服务（file:// 或静态托管时不可用，可回退 .ics）');
    return '<section class="panel push-panel"><div class="panel-head"><h2>' + T('后台传令 · Web Push', '后台提醒 · Web Push') + '</h2>' +
      '<span class="badge ' + badgeClass + '">' + badge + '</span></div>' +
      '<p class="hint">' + T('开启后，即使课刻被完全关闭，服务端也会在课前、签到、DDL 到点时把传令推送到这台设备。需要课刻本地服务（或你自己部署的 HTTPS 服务）保持运行。', '开启后，即使应用被完全关闭，服务端也会在课前、签到、DDL 到点时推送通知。需要本地服务（或自己部署的 HTTPS 服务）保持运行。') + '</p>' +
      '<p class="push-meta">' + esc(serverHint) + ' · ' + esc(next) + '</p>' +
      (PUSH.error ? '<p class="push-error">' + esc(PUSH.error) + '</p>' : '') +
      '<div class="btn-grid">' +
      (PUSH.subscribed
        ? '<button class="text-btn solid" data-action="push-test">' + T('发送测试传令', '发送测试推送') + '</button>' +
          '<button class="text-btn bordered" data-action="push-sync">' + T('立即同步课表', '立即同步课表') + '</button>' +
          '<button class="text-btn bordered danger" data-action="push-disable">' + T('关闭后台传令', '关闭后台提醒') + '</button>'
        : '<button class="text-btn solid" data-action="push-enable"' + (PUSH.busy ? ' disabled' : '') + '>' + (PUSH.busy ? T('正在申请…', '正在申请…') : T('开启后台传令', '开启后台提醒')) + '</button>' +
          '<button class="text-btn bordered" data-action="push-sync">' + T('只同步课表', '只同步课表') + '</button>') +
      '<button class="text-btn bordered" data-action="export-ics">' + T('导出 .ics 兜底', '导出 .ics 兜底') + '</button>' +
      '</div>' +
      '<p class="hint">' + T('手机需要在 HTTPS 站点安装 PWA 后开启；iPhone 需 iOS 16.4+ 且添加到主屏幕。后台服务必须保持运行，电脑关机 / 服务停止时不会推送。', '手机需要在 HTTPS 站点安装 PWA 后开启；iPhone 需 iOS 16.4+ 且添加到主屏幕。后台服务必须保持运行，电脑关机 / 服务停止时不会推送。') + '</p>' +
      '</section>';
  }

  // ============================================================ 签到

  function checkIn(itemKey, dateStr) {
    var items = C.dayItems(state.data, C.parseYmd(dateStr) || now());
    var target = items.filter(function (it) { return it.key === itemKey; })[0];
    if (!target) return;
    state.data.checkins[target.date + '|' + target.key] = new Date().toISOString();
    saveData();
    renderToday();
    toast(T('《' + target.name + '》签到已落印 ✓', '已记下《' + target.name + '》的签到 ✓'));
    if (state.data.settings.signInUrl) window.open(state.data.settings.signInUrl, '_blank', 'noopener');
  }

  // ============================================================ 课程编辑

  function newSession() {
    return { id: C.uid('s'), day: 1, start: 1, end: 2, weeks: '', room: '', bring: [] };
  }

  function colorPickerHTML(selected) {
    return C.COLORS.map(function (c) {
      var house = HOUSE[c] || { name: c, motto: '' };
      var label = isRoyal() ? (house.name + '家族 · ' + house.motto + ' · House of the ' + house.en) : ('颜色 ' + c);
      return '<button type="button" class="color-dot' + (c === selected ? ' is-on' : '') + '" data-color="' + c +
        '" style="--tint:var(--c-' + c + ')" aria-label="' + esc(label) + '" title="' + esc(label) +
        '" aria-pressed="' + (c === selected) + '"></button>';
    }).join('');
  }

  function sessionRowHTML(s, index) {
    var periodOpts = state.data.periods.map(function (p) {
      return '<option value="' + p.n + '"' + (p.n === s.start ? ' selected' : '') + '>第 ' + p.n + ' 节 ' + p.start + '</option>';
    }).join('');
    var periodOpts2 = state.data.periods.map(function (p) {
      return '<option value="' + p.n + '"' + (p.n === s.end ? ' selected' : '') + '>第 ' + p.n + ' 节 ' + p.end + '</option>';
    }).join('');
    var dayOpts = C.DAY_NAMES.map(function (d, i) {
      return '<option value="' + (i + 1) + '"' + (i + 1 === s.day ? ' selected' : '') + '>' + d + '</option>';
    }).join('');
    return '<div class="session-row" data-index="' + index + '">' +
      '<div class="session-line">' +
        '<select data-field="day" aria-label="星期">' + dayOpts + '</select>' +
        '<select data-field="start" aria-label="开始节次">' + periodOpts + '</select>' +
        '<span class="dash">–</span>' +
        '<select data-field="end" aria-label="结束节次">' + periodOpts2 + '</select>' +
        '<button type="button" class="icon-btn danger" data-action="session-del" data-index="' + index + '" aria-label="删除这个时间段">' + ICONS.trash + '</button>' +
      '</div>' +
      '<div class="session-line">' +
        '<input type="text" data-field="room" placeholder="上课地点，如 南楼 114" value="' + esc(s.room) + '">' +
        '<input type="text" data-field="weeks" placeholder="周次，如 1-16 / 1-16单，留空=每周" value="' + esc(s.weeks) + '">' +
      '</div>' +
      '<div class="session-line">' +
        '<input type="text" data-field="bring" placeholder="要带的东西，用顿号或逗号分隔：教材、计算器、作业本" value="' + esc((s.bring || []).join('、')) + '">' +
      '</div>' +
      '</div>';
  }

  function renderSessionRows() {
    var box = $('#session-rows');
    if (!box) return;
    if (!state.draftSessions.length) state.draftSessions.push(newSession());
    box.innerHTML = state.draftSessions.map(sessionRowHTML).join('');
  }

  function openCourseDialog(courseId) {
    state.editingId = courseId || null;
    var course = courseId ? findCourse(courseId) : null;
    $('#dlg-course-title').textContent = course ? T('修订课程', '编辑课程') : T('册封新课程', '添加课程');
    var form = $('#course-form');
    form.reset();
    form.elements.name.value = course ? course.name : '';
    form.elements.teacher.value = course ? course.teacher : '';
    var color = course ? course.color : C.COLORS[Math.floor(Math.random() * C.COLORS.length)];
    $('#color-picker').innerHTML = colorPickerHTML(color);
    $('#color-picker').dataset.selected = color;
    state.draftSessions = course
      ? course.sessions.map(function (s) {
        return { id: s.id, day: s.day, start: s.start, end: s.end, weeks: s.weeks, room: s.room, bring: (s.bring || []).slice() };
      })
      : [newSession()];
    renderSessionRows();
    $('#dlg-course').showModal();
    setTimeout(function () { form.elements.name.focus(); }, 60);
  }

  function collectCourseForm() {
    var form = $('#course-form');
    var name = form.elements.name.value.trim();
    if (!name) {
      toast(T('请先为这门课题名', '先给课程起个名字吧'), 'error');
      form.elements.name.focus();
      return null;
    }
    var sessions = [];
    $$('#session-rows .session-row').forEach(function (row) {
      var s = {
        day: C.clampInt($('[data-field="day"]', row).value, 1, 7, 1),
        start: C.clampInt($('[data-field="start"]', row).value, 1, state.data.periods.length, 1),
        end: C.clampInt($('[data-field="end"]', row).value, 1, state.data.periods.length, 1),
        weeks: $('[data-field="weeks"]', row).value.trim(),
        room: $('[data-field="room"]', row).value.trim(),
        bring: $('[data-field="bring"]', row).value
      };
      if (s.end < s.start) s.end = s.start;
      sessions.push(s);
    });
    if (!sessions.length) sessions.push(newSession());
    return {
      id: state.editingId || C.uid('c'),
      name: name.slice(0, 40),
      teacher: form.elements.teacher.value.trim().slice(0, 30),
      color: $('#color-picker').dataset.selected || C.COLORS[0],
      sessions: sessions
    };
  }

  function saveCourse(course) {
    var data = state.data;
    var idx = -1;
    data.courses.forEach(function (c, i) { if (c.id === course.id) idx = i; });
    if (idx >= 0) data.courses[idx] = course;
    else data.courses.push(course);
    state.demo = false;
    localStorage.removeItem(DEMO_KEY);
    saveData();
    renderAll();
    setTab('courses');
    toast(idx >= 0 ? T('课程纹册已更新 ✓', '课程已更新 ✓') : T('课程已册封 ✓', '课程已添加 ✓'));
  }

  // ============================================================ 数据导入导出

  function exportJSON() {
    var text = JSON.stringify(state.data, null, 2);
    download('课刻课表-' + todayStr().replace(/-/g, '') + '.json', text, 'application/json');
    toast(T('课表已封入王室档案（JSON）', '已导出 JSON 备份'));
  }
  function exportICS() {
    var ics = C.buildICS(state.data);
    download(ics.filename, ics.text, 'text/calendar');
    toast(T('已生成 {n} 个日历事件，导入系统日历即可', '已生成 {n} 个日历事件，导入系统日历即可', { n: ics.events }));
  }
  function importJSON(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (e) {
      return { ok: false, message: T('卷轴无法解读：' + e.message, 'JSON 解析失败：' + e.message) };
    }
    if (!raw || typeof raw !== 'object') return { ok: false, message: T('内容不是有效的课表卷轴', '内容不是有效的课表对象') };
    var data = C.normalizeData(raw);
    var check = C.validateData(data);
    if (!check.ok) return { ok: false, message: check.errors.join('；') };
    state.data = data;
    state.demo = false;
    localStorage.removeItem(DEMO_KEY);
    saveData();
    renderAll();
    return { ok: true, warnings: check.warnings };
  }

  // ============================================================ 关于 / 安装

  function platformName() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows/.test(ua)) return 'windows';
    if (/Macintosh/.test(ua)) return 'mac';
    return 'other';
  }

  function aboutHTML() {
    var p = platformName();
    var blocks = [];
    blocks.push('<h3>它是怎么提醒你的</h3><ul class="about-list">' +
      '<li><b>每日早报</b>：每天 ' + state.data.settings.digestTime + ' 提醒今天的课、地点、要带的东西</li>' +
      '<li><b>课前提醒</b>：提前 ' + state.data.settings.preMin + ' 分钟提醒出发</li>' +
      '<li><b>签到提醒</b>：上课前 ' + state.data.settings.signMin + ' 分钟提醒你签到</li>' +
      '<li><b>晚间预告</b>：每晚 ' + state.data.settings.eveningTime + ' 告诉你明天的课</li></ul>' +
      '<p class="hint">这些提醒在课刻页面打开时由浏览器准点触发；系统通知权限开启后，即使课刻在后台也能弹出系统通知。</p>');
    blocks.push('<h3>安装到电脑（Windows / macOS）</h3><ol class="about-list">' +
      '<li>用 Chrome 或 Edge 打开课刻（地址栏是 localhost 或 https 时才能安装）</li>' +
      '<li>点地址栏右侧的「安装」图标，或课刻右上角的「安装」按钮</li>' +
      '<li>安装后可固定到任务栏，右键图标可以「以小组件窗口打开」</li></ol>');
    if (p === 'android') {
      blocks.push('<h3>安装到安卓手机</h3><ol class="about-list">' +
        '<li>用 Chrome 打开课刻的 https 地址（局域网 http 地址也能用，但不能安装）</li>' +
        '<li>右上角菜单 → 「安装应用」或「添加到主屏幕」</li>' +
        '<li>安装后从桌面图标打开，并把课刻加入电池优化白名单</li></ol>');
    } else if (p === 'ios') {
      blocks.push('<h3>安装到 iPhone / iPad</h3><ol class="about-list">' +
        '<li>用 Safari 打开课刻的 https 地址</li>' +
        '<li>点底部「分享」→「添加到主屏幕」</li>' +
        '<li>iOS 16.4 起，添加到主屏幕的网页才能接收系统通知</li></ol>');
    } else {
      blocks.push('<h3>安装到手机</h3><ol class="about-list">' +
        '<li>把课刻部署到 https 地址（或局域网地址），用手机浏览器打开</li>' +
        '<li>安卓 Chrome：菜单 → 安装应用；iPhone Safari：分享 → 添加到主屏幕</li>' +
        '<li>没有 https 时，也可以把「导出 .ics」发到手机，导入系统日历获得提醒</li></ol>');
    }
    blocks.push('<h3>更可靠的做法：交给系统日历</h3><p class="hint">课刻会导出带两个闹钟的 .ics 文件（课前 ' +
      state.data.settings.preMin + ' 分钟、课前 ' + state.data.settings.signMin + ' 分钟）。导入手机或电脑的日历后，即使不打开课刻，系统也会准时提醒。' +
      '导入方式：手机日历 App → 设置 → 导入日历；Windows 日历 → 添加日历 → 从文件上传。</p>');
    blocks.push('<h3>隐私</h3><p class="hint">课表只保存在你设备的浏览器本地存储里，不上传任何服务器。换设备时用「导出 JSON / 导入课表」迁移。</p>');
    return blocks.join('');
  }

  function showInstallGuide() {
    $('#about-body').innerHTML = aboutHTML();
    $('#dlg-about').showModal();
  }

  function doInstall() {
    if (state.installPrompt) {
      var promptEvent = state.installPrompt;
      state.installPrompt = null;
      promptEvent.prompt();
      promptEvent.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') toast(T('课刻已入驻这台设备 🎉', '课刻已安装到桌面 🎉'));
        $('#btn-install').hidden = true;
      });
      return;
    }
    showInstallGuide();
  }

  function openWidgetWindow() {
    var w = window.open('./?widget=1', 'classtick-widget',
      'popup=yes,width=396,height=760,left=' + Math.max(0, screen.availWidth - 420) + ',top=60');
    if (!w) toast(T('信使被拦下：请允许课刻打开弹窗', '弹窗被拦截了，请允许课刻打开弹窗'), 'error');
  }

  // ============================================================ 事件绑定

  function confirmDialog(text, onOk) {
    $('#dlg-confirm-text').textContent = text;
    var ok = $('#dlg-confirm-ok');
    var handler = function () {
      ok.removeEventListener('click', handler);
      $('#dlg-confirm').close();
      onOk();
    };
    ok.addEventListener('click', handler);
    $('#dlg-confirm').showModal();
  }

  function closeDialog(el) {
    var dlg = el && el.closest ? el.closest('dialog') : null;
    if (dlg && dlg.open) dlg.close();
  }

  function onClick(event) {
    var target = event.target.closest ? event.target.closest('[data-action]') : null;
    if (!target) return;
    var action = target.dataset.action;
    switch (action) {
      case 'notify':
        enableNotifications();
        break;
      case 'teacher-open':
        openTeacher();
        break;
      case 'teacher-outfit':
        cycleTeacherOutfit();
        break;
      case 'court-open':
        renderCourt();
        var courtDlg = $('#dlg-court');
        if (courtDlg) courtDlg.showModal();
        break;
      case 'court-witch':
        state.data.settings.teacherOutfit = 'witch';
        saveData();
        applyTeacherOutfit(true);
        toast(T('已为艾莉丝换上旅行魔女装 · Wandering Witch', '已换上魔女装'));
        if (teacherOpen()) teacherSay('<p>殿下，我换上旅行的装束了。下一段路，也让我陪着您吧。</p>');
        break;
      case 'court-teacher':
        var courtDlg2 = $('#dlg-court');
        if (courtDlg2 && courtDlg2.open) courtDlg2.close();
        openTeacher();
        break;
      case 'teacher-art': {
        var artKey = currentOutfitKey();
        var full = document.getElementById('art-full');
        if (full) full.setAttribute('src', outfitSrc(OUTFITS[artKey].file));
        var artDlg = document.getElementById('dlg-art');
        if (artDlg) artDlg.showModal();
        break;
      }
      case 'teacher-test-llm':
        testLLM();
        break;
      case 'teacher-do':
        teacherDo(target.dataset.teachAct, target.dataset.teachArg);
        break;
      case 'teacher-settings':
        closeTeacher();
        setTab('settings');
        break;
      case 'teacher-tips':
        teacherSay(teacherHelpHTML(), null, 180);
        break;
      case 'teacher-reintro':
        teacherState.greeted = false;
        localStorage.removeItem('classtick.teacherSeen');
        openTeacher();
        break;
      case 'teacher-hide':
        state.data.settings.teacher = false;
        saveData();
        renderAll();
        closeTeacher();
        toast(T('导师已退下，可在「御前设置」中唤回', '助手已隐藏，可在设置中重新开启'));
        break;
      case 'install':
        doInstall();
        break;
      case 'open-widget':
        openWidgetWindow();
        break;
      case 'open-full':
        location.href = './?tab=' + state.tab;
        break;
      case 'show-about':
        $('#about-body').innerHTML = aboutHTML();
        $('#dlg-about').showModal();
        break;
      case 'close-dialog':
        closeDialog(target);
        break;
      case 'goto-tab':
        setTab(target.dataset.tab);
        break;
      case 'goto-planner':
        setTab('planner');
        break;
      case 'select-day':
        setViewDate(C.parseYmd(target.dataset.date));
        setTab('today');
        break;
      case 'goto-today':
        state.viewDate = null;
        renderToday();
        renderWeek();
        toast(T('已回到今天', '已回到今天'));
        break;
      case 'toggle-packed':
        togglePackedItem(target.dataset.item, C.parseYmd(target.dataset.date));
        break;
      case 'remind-unpacked':
        remindUnpacked();
        break;
      case 'task-new':
        openTaskDialog(null);
        break;
      case 'task-edit':
        openTaskDialog(target.dataset.id);
        break;
      case 'task-toggle':
        toggleTask(target.dataset.id);
        break;
      case 'task-delete': {
        var delTaskId = target.dataset.id || state.editingTaskId;
        if (delTaskId) deleteTask(delTaskId);
        break;
      }
      case 'task-filter':
        state.plannerFilter = target.dataset.filter || 'open';
        renderPlanner();
        break;
      case 'reminder-task-done': {
        var taskRem = state.reminders[target.dataset.rem];
        if (taskRem && taskRem.task) {
          var doneTask = findTask(taskRem.task.id);
          if (doneTask && !doneTask.done) {
            doneTask.done = true;
            doneTask.doneAt = new Date().toISOString();
            saveData();
            renderPlanner();
          }
          toast(T('已标记完成：' + (taskRem.task.title || ''), '已标记完成'));
        }
        var taskCard = target.closest('.reminder');
        if (taskCard) taskCard.remove();
        break;
      }
      case 'week-prev':
        state.weekOffset -= 1;
        renderWeek();
        break;
      case 'week-next':
        state.weekOffset += 1;
        renderWeek();
        break;
      case 'week-now':
        state.weekOffset = 0;
        renderWeek();
        break;
      case 'course-new':
        openCourseDialog(null);
        break;
      case 'course-edit':
        openCourseDialog(target.dataset.id);
        break;
      case 'course-delete': {
        var course = findCourse(target.dataset.id);
        if (!course) break;
        confirmDialog(T('删除《' + course.name + '》？删除后可以重新册封，但不会自动复原。', '删除《' + course.name + '》？删除后可以重新添加，但不会自动恢复。'), function () {
          state.data.courses = state.data.courses.filter(function (c) { return c.id !== target.dataset.id; });
          saveData();
          renderAll();
          toast(T('课程已从纹册移除', '课程已删除'));
        });
        break;
      }
      case 'session-add':
        state.draftSessions.push(newSession());
        renderSessionRows();
        break;
      case 'session-del': {
        var idx = Number(target.dataset.index);
        if (state.draftSessions.length <= 1) {
          toast(T('至少保留一段上课时间', '至少保留一个时间段'), 'error');
          break;
        }
        state.draftSessions.splice(idx, 1);
        renderSessionRows();
        break;
      }
      case 'export-json':
        exportJSON();
        break;
      case 'import-json':
        $('#import-error').hidden = true;
        $('#import-text').value = '';
        $('#dlg-import').showModal();
        break;
      case 'export-ics':
        exportICS();
        break;
      case 'reset-demo':
        confirmDialog(T('恢复成示例纹册？当前纹册会被覆盖。', '恢复成示例课表？当前课表会被覆盖。'), function () {
          state.data = C.normalizeData(window.ClassTickSeed);
          state.demo = true;
          localStorage.setItem(DEMO_KEY, '1');
          saveData();
          renderAll();
          setTab('today');
          toast(T('示例纹册已复原', '已恢复示例课表'));
        });
        break;
      case 'clear-all':
        confirmDialog(T('清空全部课程与设置？建议先把课表封入 JSON 档案。', '清空全部课程和设置？建议先导出 JSON 备份。'), function () {
          state.data = C.normalizeData({
            meta: (state.data && state.data.meta) || {},
            periods: state.data.periods,
            settings: state.data.settings,
            courses: []
          });
          state.demo = false;
          saveData();
          renderAll();
          setTab('courses');
          toast(T('纹册已清空，去册封你的第一门课吧', '已清空，去添加你的第一门课吧'));
        });
        break;
      case 'dismiss-demo':
        state.demo = false;
        localStorage.setItem(DEMO_KEY, '0');
        renderToday();
        break;
      case 'checkin':
        checkIn(target.dataset.key, target.dataset.date);
        break;
      case 'save-periods':
        savePeriods();
        break;
      case 'reset-periods':
        state.data.periods = C.normalizePeriods(C.DEFAULT_PERIODS);
        saveData();
        renderSettings();
        renderAll();
        toast(T('已恢复默认时辰', '已恢复默认作息'));
        break;
      case 'push-enable':
        enablePush();
        break;
      case 'push-disable':
        disablePush();
        break;
      case 'push-test':
        testPush();
        break;
      case 'push-sync':
        syncPushNow().then(function () {
          toast(T('课表已同步到后台传令服务', '课表已同步到后台服务'));
          renderSettings();
        });
        break;
      case 'test-notify':
        showSystemNotification(T('课刻测试传令', '课刻测试通知'), T('如果你看到这条传令，说明提醒链路是通的 🔔', '如果你看到这条通知，说明提醒链路是通的 🔔'), { tag: 'classtick-test' });
        toast(T('测试传令已发出', '已发送测试通知'));
        break;
      case 'preview-reminder': {
        var upcoming = C.buildReminders(state.data, C.addDays(now(), -1), C.addDays(now(), 2))
          .filter(function (r) { return (r.kind === 'sign' || r.kind === 'pre' || r.kind === 'digest') && r.at.getTime() > now().getTime(); });
        if (!upcoming.length) {
          toast(T('近两日无朝程，先册封一节课再预览吧', '最近两天没有课，先添加一节课再预览吧'));
          break;
        }
        var sample = upcoming.filter(function (r) { return r.kind === 'sign'; })[0] || upcoming[0];
        fireReminder(sample);
        toast(T('传令卡片预览已弹出', '已弹出提醒卡片预览'));
        break;
      }
      case 'reminder-dismiss': {
        var rid = target.dataset.rem;
        var card = target.closest('.reminder');
        if (card) card.remove();
        delete state.reminders[rid];
        break;
      }
      case 'reminder-checkin': {
        var r = state.reminders[target.dataset.rem];
        if (r && r.item) {
          state.data.checkins[r.item.date + '|' + r.item.key] = new Date().toISOString();
          saveData();
          renderToday();
          toast(T('《' + r.item.name + '》签到已落印 ✓', '已记下《' + r.item.name + '》的签到 ✓'));
        }
        var c2 = target.closest('.reminder');
        if (c2) c2.remove();
        break;
      }
      default:
        break;
    }
  }

  function onColorPick(event) {
    var dot = event.target.closest ? event.target.closest('.color-dot') : null;
    if (!dot) return;
    $$('.color-dot', $('#color-picker')).forEach(function (d) {
      d.classList.toggle('is-on', d === dot);
      d.setAttribute('aria-pressed', d === dot ? 'true' : 'false');
    });
    $('#color-picker').dataset.selected = dot.dataset.color;
  }

  function savePeriods() {
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

  function onSettingsChange(event) {
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
      if (key === 'teacher') {
        updateTeacherDock();
        renderAll();
        return;
      }
      if (key === 'teacherOutfit') {
        applyTeacherOutfit(true);
        renderSettings();
        return;
      }
      if (key === 'llmPreset') {
        var preset = LLM_PRESETS[value];
        if (preset) {
          if (preset.base) state.data.settings.llmBase = preset.base;
          if (preset.model) state.data.settings.llmModel = preset.model;
          saveData();
        }
        renderSettings();
        return;
      }
      if (key.indexOf('llm') === 0) {
        updateTeacherAI();
        return;
      }
      if (key.indexOf('task') === 0) {
        renderPlanner();
        renderToday();
        return;
      }
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

  function onSubmit(event) {
    if (event.target.id === 'task-form') {
      event.preventDefault();
      saveTaskForm();
      return;
    }
    if (event.target.id === 'teacher-form') {
      event.preventDefault();
      var teacherInput = $('#teacher-text');
      if (teacherInput) teacherRespond(teacherInput.value);
      return;
    }
    if (event.target.id === 'course-form') {
      event.preventDefault();
      var course = collectCourseForm();
      if (!course) return;
      $('#dlg-course').close();
      saveCourse(course);
      return;
    }
    if (event.target.id === 'import-form') {
      event.preventDefault();
      var text = $('#import-text').value.trim();
      if (!text) {
        $('#import-error').hidden = false;
        $('#import-error').textContent = T('还没有内容：请选择卷轴或粘贴 JSON', '还没有内容：请选择文件或粘贴 JSON');
        return;
      }
      var result = importJSON(text);
      if (!result.ok) {
        $('#import-error').hidden = false;
        $('#import-error').textContent = result.message;
        return;
      }
      $('#dlg-import').close();
      setTab('today');
      toast(T('课表已呈递 ✓', '课表已导入 ✓') + (result.warnings && result.warnings.length ? '（' + result.warnings.length + T(' 条待核', ' 条提醒') + '）' : ''));
      return;
    }
  }

  function onImportFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      $('#import-text').value = String(reader.result || '');
      $('#import-error').hidden = true;
    };
    reader.readAsText(file);
  }

  // ============================================================ 皇家导师 · 艾莉丝

  var TEACHER = {
    name: '艾莉丝·瓦尔登',
    short: '艾莉丝',
    avatar: 'assets/teacher/avatar.webp',
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

  function teacherSalutation(n) {
    var h = (n || now()).getHours();
    if (h < 6) return T('夜深了，殿下早些安寝。', '夜深了，早点睡。');
    if (h < 11) return T('殿下，早安。', '早上好。');
    if (h < 14) return T('殿下，午安。', '中午好。');
    if (h < 18) return T('殿下，午后安。', '下午好。');
    return T('殿下，晚安。', '晚上好。');
  }

  function renderTeacherStatus() {
    var el = $('#teacher-status');
    if (!el || !state.data) return;
    var n = now();
    var next = C.nextItem(state.data, n);
    if (!next) { el.textContent = T('今日朝程已空 · 待命中', '暂无课程 · 待命中'); return; }
    var it = next.item;
    var rel = C.relativeDayLabel(it.start, n);
    var time = C.minToHm(it.startMin);
    var head = rel === '今天' ? time : rel + ' ' + time;
    el.textContent = next.state === 'now'
      ? T('正在开讲 · ' + it.name, '正在上课 · ' + it.name)
      : T('下一节 ' + head + ' · ' + it.name, '下一节 ' + head + ' · ' + it.name);
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

  function teacherBubbleActions(wrap, actions) {
    if (!wrap || !actions || !actions.length) return;
    var body = wrap.querySelector('.teacher-msg-body');
    if (!body || body.querySelector('.teacher-msg-actions')) return;
    body.insertAdjacentHTML('beforeend', '<div class="teacher-msg-actions">' + actions.map(function (a) {
      return '<button class="text-btn tiny bordered" data-action="teacher-do" data-teach-act="' + esc(a.act) + '"' +
        (a.arg != null ? ' data-teach-arg="' + esc(a.arg) + '"' : '') + '>' + esc(a.label) + '</button>';
    }).join('') + '</div>');
  }

  function teacherTyping() {
    var av = $('#teacher-avatar-img');
    if (av) av.src = TEACHER.thinking;
    return teacherBubble('teacher', '<span class="teacher-typing"><i></i><i></i><i></i></span>');
  }

  function teacherSay(html, actions, delay) {
    startTalking((delay == null ? 460 : delay) + 420);
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
    if (/(今天|明天|本周|这周|最近).*(作业|ddl|任务|待办|考试|日程)|(作业|ddl|任务|待办|考试|日程).*(有哪些|有什么|多少个|查看|列出|截止)/i.test(text)) {
      var openTasks = (state.data.tasks || []).filter(function (t) { return !t.done; });
      if (!openTasks.length) {
        return {
          html: '<p>殿下目前没有未完成的日程。若想记作业，可以说「记作业」，或在「日程」页新建一项。</p>',
          actions: [{ label: '新建日程', act: 'task-new' }, { label: '打开日程页', act: 'goto-planner' }]
        };
      }
      var dueSoon = openTasks.filter(function (t) {
        var due = C.taskDueAt(t);
        return due.getTime() <= C.addDays(now(), 1).getTime();
      });
      var top = (dueSoon.length ? dueSoon : openTasks).slice(0, 5);
      return {
        html: '<p>殿下，未完成事项共 <b>' + openTasks.length + '</b> 项' +
          (dueSoon.length ? '，其中 <b>' + dueSoon.length + '</b> 项今明两天截止' : '') + '：</p>' +
          '<ul class="teacher-task-list">' + top.map(function (t) {
            return '<li><b>' + esc(t.title) + '</b><span>' + esc(taskDueText(t)) + '</span></li>';
          }).join('') + '</ul>',
        actions: [{ label: '查看全部日程', act: 'goto-planner' }, { label: '新建日程', act: 'task-new' }]
      };
    }
    if (/(记|新建|添加|加|安排).*(作业|任务|日程|待办)|新建日程|记作业|记一下作业/.test(text)) {
      return {
        html: '<p>好，殿下把要记的事项告诉我，或直接打开日程表单慢慢写。我会把 DDL 收进传令里。</p>',
        actions: [{ label: '打开日程表单', act: 'task-new' }, { label: '看今日日程', act: 'say', arg: '今天有什么作业' }]
      };
    }
    if (/(行囊|没带|未带|带了|带齐|要带)/.test(text)) {
      var dayItems = C.dayItems(state.data, now());
      var missingPack = unpackedFor(dayItems, now());
      if (!missingPack.length) {
        return { html: '<p>殿下今日行囊已齐，可以轻装启程。</p>' };
      }
      return {
        html: '<p>今日行囊还差：<b>' + esc(missingPack.join('、')) + '</b>。</p><p class="teacher-soft">到「今日行囊」里点一下物品，就能标记为已带；我也可以在课前鸣钟时再提醒一次。</p>',
        actions: [{ label: '提醒我带齐', act: 'say', arg: '行囊还差什么' }]
      };
    }
    if (/(行个礼|鞠个躬|行礼|点点头|点头|转一圈|转个圈|眨眼|笑一个)/.test(text)) {
      var motion = /(转)/.test(text) ? 'spin' : /(眨|笑)/.test(text) ? 'blink' : /(点)/.test(text) ? 'nod' : 'bow';
      setTimeout(function () {
        if (motion === 'blink') setTeacherExpression('blink', 220);
        else teacherMotion(motion, motion === 'spin' ? 1200 : 900);
      }, 60);
      return {
        html: motion === 'spin'
          ? '<p>（艾莉丝转了个圈，裙摆像星图一样展开。）殿下，这样可还好看？</p>'
          : motion === 'blink'
            ? '<p>（她眨了眨眼，紫瞳里有一点笑意。）我在听，殿下。</p>'
            : motion === 'nod'
              ? '<p>（她轻轻点头。）嗯，我记下了。</p>'
              : '<p>（艾莉丝提着裙摆，向你微微欠身。）殿下，愿今日诸事顺遂。</p>'
      };
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
      fallback: true,
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

    if (reply.fallback && llmReady()) {
      startTalking(1200);
      var av = $('#teacher-avatar-img');
      if (av) av.src = TEACHER.thinking;
      var stream = teacherBubble('teacher', '<div class="teacher-stream"><span class="teacher-typing"><i></i><i></i><i></i></span></div>');
      var streamBody = stream ? stream.querySelector('.teacher-stream') : null;
      var gotDelta = false;
      askLLM(text, function (delta, full) {
        if (!streamBody) return;
        gotDelta = true;
        streamBody.textContent = full;
        startTalking(700);
        teacherScroll();
      }).then(function (answer) {
        if (streamBody) {
          streamBody.classList.remove('teacher-stream');
          streamBody.innerHTML = gotDelta ? answer : answer;
        }
        if (reply.actions && stream) teacherBubbleActions(stream, reply.actions);
        if (av) av.src = TEACHER.avatar;
        teacherState.busy = false;
        teacherScroll();
      }).catch(function (err) {
        if (stream) stream.remove();
        teacherBubble('teacher', '<p>殿下恕罪，大模型那边暂时没有回音（' + esc(String((err && err.message) || err).slice(0, 60)) + '）。我仍可以按旧办法替您调整设置。</p>', reply.actions || null);
        if (av) av.src = TEACHER.avatar;
        teacherState.busy = false;
      });
      return;
    }

    teacherSay(reply.html || '<p>殿下恕罪，这句我还没听明白。</p>', reply.actions || null, 520);
  }

  function teacherGreet(force) {
    var log = teacherLogEl();
    if (!log) return;
    var seen = localStorage.getItem('classtick.teacherSeen') === '1';
    if (teacherState.greeted && !force) return;
    teacherState.greeted = true;
    log.innerHTML = '';
    var intro = '<p>' + (seen ? teacherSalutation(now()) : T('殿下，初次见面。', '你好，初次见面。')) +
      '我是皇家导师 <b>' + TEACHER.name + '</b>，从今往后，朝程、鸣钟与落印都由我替您记着。</p>' +
      '<p class="teacher-soft">您可以直接吩咐我，例如「早报改到 7:00」「签到提前 5 分钟」「换成深色」。若想先听听我能做什么，问一句「你能做什么」便好。</p>' +
      '<p class="teacher-soft">右上角 ✦ 可为我换装；Esc、底部「结束晋见」或点击窗外空白都能关闭这扇窗。</p>';
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
      ['换一套礼服', 'outfit', null],
      ['行个礼', 'bow', null],
      ['转个圈', 'spin', null],
      ['关闭对话', 'close', null],
      ['你能做什么', 'say', '你能做什么']
    ];
    box.innerHTML = chips.map(function (c) {
      return '<button class="text-btn tiny" data-action="teacher-do" data-teach-act="' + c[1] + '"' +
        (c[2] != null ? ' data-teach-arg="' + esc(c[2]) + '"' : '') + '>' + esc(c[0]) + '</button>';
    }).join('');
  }

  function openTeacher() {
    var dlg = $('#dlg-teacher');
    if (!dlg || dlg.open) return;
    hideTeacherBubble(true);
    updateTeacherDock();
    if (!dlg.open) dlg.showModal();
    teacherQuickChips();
    renderTeacherStatus();
    applyTeacherOutfit(false);
    updateTeacherAI();
    teacherGreet(false);
    setTimeout(function () {
      var input = $('#teacher-text');
      if (input && !('ontouchstart' in window)) input.focus();
      var log = $('#teacher-log');
      if (log) log.scrollTop = log.scrollHeight;
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
      case 'outfit':
        cycleTeacherOutfit();
        break;
      case 'close':
        closeTeacher();
        break;
      case 'bow':
        teacherMotion('bow', 1000);
        teacherSay('<p>（艾莉丝提着裙摆，向你微微欠身。）殿下，愿今日诸事顺遂。</p>');
        break;
      case 'nod':
        teacherMotion('nod', 800);
        teacherSay('<p>（她轻轻点头。）嗯，我记下了。</p>');
        break;
      case 'spin':
        teacherMotion('spin', 1150);
        teacherSay('<p>（她转了个圈，裙摆像星图一样展开。）怎样，殿下？</p>');
        break;
      case 'blink':
        setTeacherExpression('blink', 180);
        teacherSay('<p>（她眨了眨眼。）我在听，殿下。</p>');
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
      case 'goto-planner':
        closeTeacher();
        setTab('planner');
        break;
      case 'task-new':
        closeTeacher();
        setTimeout(function () { openTaskDialog(null); }, 160);
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

  function bindTeacherParallax() {
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

  function initTeacher() {
    updateTeacherDock();
    renderTeacherStatus();
    teacherQuickChips();
    applyTeacherOutfit(false);
    updateTeacherAI();
    bindTeacherParallax();
    setTimeout(teacherTipTick, 2600);
  }

  // ============================================================ 主循环
  function tick() {
    state.now = now();
    renderTopbar();
    if (state.tab === 'today') renderToday();
    if (teacherOpen()) renderTeacherStatus();
    checkReminders();
  }

  // ============================================================ 自测

  function runSelfTest() {
    var results = [];
    function test(name, condition, extra) {
      results.push({ name: name, ok: !!condition, extra: extra || '' });
    }
    var n = now();
    test('核心库已加载', typeof C === 'object' && typeof C.buildICS === 'function');
    test('课表数据已加载', state.data && state.data.courses.length > 0, state.data ? state.data.courses.length + ' 门课' : '');
    var todayItems = C.dayItems(state.data, n);
    test('今日课程数量', todayItems.length === 3, todayItems.length + ' 节');
    var next = C.nextItem(state.data, n);
    test('下一节课是高等数学', !!next && next.item.name === '高等数学(B)', next ? next.item.name : '无');
    test('Hero 渲染出课程名', !!$('#hero-slot .hero-course') && $('#hero-slot .hero-course').textContent.indexOf('高等数学') >= 0);
    test('时间线渲染 3 条', $$('#timeline .tl-item').length === 3);
    var weekNumber = C.semesterWeek(state.data.meta, n);
    test('第 8 周计算正确', weekNumber === 8, '第 ' + weekNumber + ' 周');
    test('本周视图标题正确', !!$('#week-title') && $('#week-title').textContent.indexOf('第 8 周') >= 0);
    test('周课表格子已渲染', $$('#week-scroll .wk-block').length >= 3, $$('#week-scroll .wk-block').length + ' 个课程块');
    test('课程列表渲染 9 门', $$('#course-list .course-card').length === 9);
    test('设置页已渲染', $$('#settings-root .panel').length >= 4);
    var ics = C.buildICS(state.data);
    test('ICS 生成有事件和闹钟', ics.events > 100 && ics.text.indexOf('BEGIN:VALARM') > 0, ics.events + ' 个事件');
    test('ICS 含签到提醒', ics.text.indexOf('TRIGGER:-PT2M') > 0);
    var reminders = C.buildReminders(state.data, C.addDays(n, -2), C.addDays(n, 3));
    test('提醒计划包含签到提醒', reminders.some(function (r) { return r.kind === 'sign'; }), reminders.length + ' 条提醒');
    test('单双周解析', C.parseWeeks('1-16单', 18).length === 8 && C.parseWeeks('2-16双', 18).length === 8);
    test('下一节课倒计时为正数', C.formatCountdown(next.item.start, n).ms > 0);
    test('主题已应用', !!document.documentElement.dataset.theme);
    test('皇室皮肤已应用', document.documentElement.dataset.skin === 'royal' && document.querySelector('.logo-royal img') != null);
    test('皇家文案已生效', !!document.querySelector('.tab[data-tab="today"] span') && document.querySelector('.tab[data-tab="today"] span').textContent.indexOf('今日') >= 0 && document.querySelector('#hero-slot .hero-kicker') != null && document.querySelector('#hero-slot .hero-kicker').textContent.indexOf('开讲') >= 0);
    test('皇家导师界面已就绪', !!document.getElementById('dlg-teacher') && !!document.getElementById('teacher-fab') && document.getElementById('teacher-dock') != null && !document.getElementById('teacher-dock').hidden);
    var oldSignMin = state.data.settings.signMin;
    if (window.__classtickTeacher) window.__classtickTeacher.try('签到提前 5 分钟');
    test('导师能听懂并修改设置', state.data.settings.signMin === 5, 'signMin=' + state.data.settings.signMin);
    state.data.settings.signMin = oldSignMin;
    saveData();
    test('英文皇室标注已渲染', $$('.h2-en').length >= 3 && !!$('.kicker-en') && !!$('.brand-eyebrow'));
    test('纹章动效层已就绪', !!$('.royal-aura') && !!$('.royal-dust'));
    test('导师多套服装已配置', ['court', 'star', 'rose', 'witch'].indexOf(state.data.settings.teacherOutfit) >= 0 && !!document.getElementById('teacher-art'));
    if (window.__classtickTeacher) window.__classtickTeacher.setOutfit('star');
    test('导师换装生效', (document.getElementById('teacher-art').getAttribute('src') || '').indexOf('full-star') >= 0);
    if (window.__classtickTeacher) window.__classtickTeacher.setOutfit('witch');
    test('魔女装可切换', (document.getElementById('teacher-art').getAttribute('src') || '').indexOf('full-witch') >= 0);
    if (window.__classtickTeacher) window.__classtickTeacher.setOutfit(state.data.settings.teacherOutfit || 'court');
    test('王廷元素已就绪', document.querySelectorAll('.court-card').length === 4 && !!document.querySelector('.brand-castle img') && !!document.getElementById('dlg-court'));
    test('行囊可在 Hero 勾选', (function () {
      var chip = document.querySelector('.hero-bring-chip');
      if (!chip) return false;
      var name = chip.dataset.item, day = chip.dataset.date;
      chip.click();
      var ok = !!(state.data.packed[day] && state.data.packed[day][name]) && !!document.querySelector('.hero-bring-chip.is-packed');
      var again = document.querySelector('.hero-bring-chip[data-item="' + name + '"]');
      if (again) again.click();
      return ok;
    })());
    test('AI 对话配置已就绪', state.data.settings.llmOn === false && !!document.querySelector('[data-setting="llmOn"]') && typeof window.__classtickTeacher.llm.ask === 'function');
    test('日程页已渲染', !!document.querySelector('#view-planner') && !!document.querySelector('#planner-list'));
    var packedTest = (function () {
      var chip = document.querySelector('#side-bring [data-action="toggle-packed"]');
      if (!chip) return false;
      var name = chip.dataset.item, day = chip.dataset.date;
      chip.click();
      var ok = !!(state.data.packed[day] && state.data.packed[day][name]) && !!document.querySelector('#side-bring .bring-chip.is-packed');
      var again = document.querySelector('#side-bring [data-action="toggle-packed"][data-item="' + name + '"]');
      if (again) again.click();
      return ok;
    })();
    test('今日行囊可勾选', packedTest);
    var dayTest = (function () {
      var days = document.querySelectorAll('#day-switch .ds-day');
      if (days.length < 7) return false;
      for (var di = 0; di < days.length; di++) {
        if (!days[di].classList.contains('is-active')) { days[di].click(); break; }
      }
      var ok = !!document.querySelector('#day-switch .ds-back');
      var back = document.querySelector('[data-action="goto-today"]');
      if (back) back.click();
      return ok;
    })();
    test('日期可切换朝程', dayTest);
    var taskTest = (function () {
      if (!window.__classtickPlanner) return false;
      var id = window.__classtickPlanner.add({ title: '自测作业', type: 'homework', due: C.ymd(now()), time: '23:59' });
      window.__classtickPlanner.render();
      var ok = !!(state.data.tasks || []).filter(function (t) { return t.id === id; })[0];
      window.__classtickPlanner.toggle(id);
      ok = ok && !!(state.data.tasks.filter(function (t) { return t.id === id; })[0] || {}).done;
      window.__classtickPlanner.remove(id);
      return ok;
    })();
    test('日程可新增与完成', taskTest);
    test('任务提醒可生成', (function () {
      var tid = window.__classtickPlanner.add({ title: '提醒自测', type: 'todo', due: C.ymd(C.addDays(now(), 1)), time: '12:00' });
      var list = C.buildTaskReminders(state.data, C.addDays(now(), -1), C.addDays(now(), 3));
      window.__classtickPlanner.remove(tid);
      return list.length > 0;
    })());
    test('导师窗口有关闭入口', !!document.querySelector('#dlg-teacher .teacher-foot [data-action="close-dialog"]') && !!document.querySelector('#dlg-teacher .teacher-head-actions [data-action="close-dialog"]'));
    document.querySelector('[data-action="show-about"]').click();
    var aboutBodyEl = document.getElementById('about-body');
    var aboutDlgEl = document.getElementById('dlg-about');
    var aboutScrollable = !!aboutBodyEl && aboutBodyEl.scrollHeight > aboutBodyEl.clientHeight + 4 && getComputedStyle(aboutBodyEl).overflowY === 'auto';
    var aboutMetrics = aboutBodyEl ? (aboutBodyEl.scrollHeight + '/' + aboutBodyEl.clientHeight) : 'no-body';
    if (aboutDlgEl && aboutDlgEl.open) aboutDlgEl.close();
    test('安装说明可滚动查看', aboutScrollable, aboutMetrics);
    test('AI 本地模型预设已就绪', !!document.querySelector('[data-setting="llmPreset"] option[value="ollama"]') && !!document.querySelector('[data-setting="llmPreset"] option[value="lmstudio"]'));
    test('表情帧已就绪', (function () {
      var img = document.getElementById('teacher-expression');
      if (!img) return false;
      if (window.__classtickTeacher) window.__classtickTeacher.setOutfit('court');
      setTeacherExpression('blink', 0);
      var ok = (img.getAttribute('src') || '').indexOf('full-blink') >= 0;
      setTeacherExpression(null);
      return ok;
    })());
    test('后台传令面板已就绪', !!document.querySelector('[data-action="push-enable"], [data-action="push-test"]') && !!document.querySelector('.push-panel'));
    test('页面无脚本异常', !window.__classtickError);

    var pass = results.filter(function (r) { return r.ok; }).length;
    var failed = results.filter(function (r) { return !r.ok; });
    var verdict = (pass === results.length ? 'PASS' : 'FAIL') + ' ' + pass + '/' + results.length;
    document.documentElement.dataset.selftest = verdict;
    document.title = 'SELFTEST ' + verdict;
    var out = document.createElement('pre');
    out.id = 'selftest-out';
    out.style.cssText = 'position:fixed;left:0;bottom:0;z-index:9999;background:#000;color:#0f0;font:11px/1.5 monospace;padding:8px;max-height:40vh;overflow:auto;white-space:pre-wrap;';
    out.textContent = 'SELFTEST ' + verdict + '\n' + results.map(function (r) {
      return (r.ok ? '✓' : '✗') + ' ' + r.name + (r.extra ? '  [' + r.extra + ']' : '');
    }).join('\n');
    document.body.appendChild(out);
    console.log('SELFTEST', verdict);
    return results;
  }

  // ============================================================ 启动

  function bindEvents() {
    document.addEventListener('pointerdown', makeRipple);
    $$('dialog.sheet').forEach(function (dlg) {
      dlg.addEventListener('click', function (event) {
        if (event.target === dlg) dlg.close();
      });
    });
    $$('.logo').forEach(function (logo) {
      logo.addEventListener('click', function (event) {
        sparkleBurst(event.clientX, event.clientY, 16);
        setTab('today');
      });
    });
    document.addEventListener('click', onClick);
    document.addEventListener('click', onColorPick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onSettingsChange);
    var file = $('#import-file');
    if (file) file.addEventListener('change', onImportFile);
    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.dataset.tab); });
    });
    $('#btn-install').addEventListener('click', function () { doInstall(); });
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      state.installPrompt = e;
      $('#btn-install').hidden = false;
    });
    window.addEventListener('appinstalled', function () {
      state.installPrompt = null;
      $('#btn-install').hidden = true;
      toast(T('课刻已入驻这台设备 🎉', '课刻已安装 🎉'));
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        // 回到前台时补一次：错过 10 分钟内的提醒仍会弹出
        tick();
      }
    });
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          if (state.data.settings.theme === 'auto') applyTheme();
        });
      } catch (e) { /* 老浏览器忽略 */ }
    }
    window.addEventListener('error', function (e) {
      window.__classtickError = (e && e.message) || 'error';
      var box = document.createElement('div');
      box.className = 'toast is-error';
      box.textContent = '脚本出错了：' + (e && e.message);
      var t = document.getElementById('toasts');
      if (t) t.appendChild(box);
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* 离线缓存失败不影响使用 */ });
  }

  function init() {
    state.data = loadData();
    state.fired = loadFired();
    state.notify = ('Notification' in window) ? Notification.permission : 'unsupported';

    var tabParam = params.get('tab');
    bindEvents();
    renderAll();
    setTab(tabParam && ['today', 'week', 'courses', 'planner', 'settings'].indexOf(tabParam) >= 0 ? tabParam : 'today');
    initTeacher();
    startBlinkLoop();
    registerServiceWorker();
    loadPushStatus();
    if (params.get('teacher') === '1') setTimeout(openTeacher, 320);
    if (params.get('expression')) setTimeout(function () { setTeacherExpression(params.get('expression'), 0); }, 900);
    if (params.get('court') === '1') setTimeout(function () {
      renderCourt();
      var courtDialog = $('#dlg-court');
      if (courtDialog) courtDialog.showModal();
    }, 320);

    // 小组件模式：去掉底部导航，加一个「展开完整版」
    if (widgetMode) {
      document.body.classList.add('widget-mode');
      var actions = $('.top-actions');
      if (actions) {
        var expand = document.createElement('button');
        expand.className = 'chip-btn accent';
        expand.setAttribute('data-action', 'open-full');
        expand.title = '打开完整版';
        expand.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        actions.appendChild(expand);
      }
    }

    state.now = now();
    checkReminders();
    setInterval(tick, 15000);

    if (state.selftest) {
      // 等一帧，确保布局完成
      requestAnimationFrame(function () {
        setTimeout(function () { runSelfTest(); }, 80);
      });
    }
  }

  // 供 QA / 自测使用的轻量测试钩子
  window.__classtickPush = {
    status: function () { return Object.assign({}, PUSH); },
    reload: loadPushStatus,
    sync: syncPushNow,
    data: pushData,
    enable: enablePush,
    disable: disablePush,
    test: testPush
  };

  window.__classtickPlanner = {
    add: function (raw) {
      var payload = Object.assign({ id: C.uid('t'), due: C.ymd(now()), type: 'homework' }, raw || {});
      var task = C.normalizeTasks([payload])[0];
      if (!task) return null;
      state.data.tasks.push(task);
      saveData();
      renderPlanner();
      return task.id;
    },
    remove: function (id) {
      state.data.tasks = (state.data.tasks || []).filter(function (t) { return t.id !== id; });
      saveData();
      renderPlanner();
    },
    toggle: toggleTask,
    render: renderPlanner,
    open: openTaskDialog,
    selectDate: setViewDate,
    filter: function (filter) { state.plannerFilter = filter; renderPlanner(); },
    packed: function (name, date) { togglePackedItem(name, date || now()); }
  };

  window.__classtickTeacher = {
    open: openTeacher,
    close: closeTeacher,
    ask: teacherRespond,
    try: function (text) { return teacherIntent(text); },
    state: teacherState,
    setExpression: setTeacherExpression,
    motion: teacherMotion,
    setOutfit: function (key) { if (!OUTFITS[key]) return false; state.data.settings.teacherOutfit = key; applyTeacherOutfit(false); return true; },
    cycleOutfit: cycleTeacherOutfit,
    decorate: decorateEnglish,
    llm: {
      ready: llmReady,
      ask: askLLM,
      test: testLLM,
      configure: function (patch) {
        Object.assign(state.data.settings, patch || {});
        saveData();
        updateTeacherAI();
        return state.data.settings;
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

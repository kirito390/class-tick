/*!
 * 课刻 ClassTick · 核心逻辑层
 * 纯函数，不碰 DOM：课表计算 / 周次解析 / 提醒计划 / ICS 导出
 * 浏览器中挂到 window.ClassTickCore，Node 中可 require（用于单元测试）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClassTickCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  var DAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'];
  var COLORS = ['tomato', 'teal', 'amber', 'sky', 'violet', 'olive', 'rose', 'sand', 'ink'];

  var DEFAULT_PERIODS = [
    ['08:00', '08:45'], ['08:55', '09:40'], ['10:00', '10:45'], ['10:55', '11:40'],
    ['13:30', '14:15'], ['14:25', '15:10'], ['15:20', '16:05'], ['16:15', '17:00'],
    ['18:30', '19:15'], ['19:25', '20:10'], ['20:20', '21:05'], ['21:15', '22:00']
  ].map(function (p, i) {
    return { n: i + 1, start: p[0], end: p[1] };
  });

  var DEFAULT_SETTINGS = {
    skin: 'royal',
    teacher: true,
    teacherOutfit: 'court',
    llmOn: false,
    llmPreset: 'deepseek',
    llmBase: 'https://api.deepseek.com/v1',
    llmModel: 'deepseek-chat',
    llmKey: '',
    theme: 'auto',
    digestOn: true,
    digestTime: '07:20',
    preOn: true,
    preMin: 20,
    signOn: true,
    signMin: 2,
    eveningOn: true,
    eveningTime: '21:30',
    signInUrl: '',
    taskRemindOn: true,
    taskRemindMin: 60,
    taskEveningOn: true,
    taskEveningTime: '20:30'
  };

  // ---------------------------------------------------------------- 基础工具

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function clampInt(v, min, max, dft) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) n = dft;
    return Math.max(min, Math.min(max, n));
  }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s == null ? '' : s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], da = +m[3];
    if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
    var d = new Date(y, mo - 1, da);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
    return d;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
  function diffDays(a, b) {
    return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
  }
  function mondayOf(d) { return addDays(startOfDay(d), 1 - weekdayOf(d)); }
  function minuteOfDay(d) { return d.getHours() * 60 + d.getMinutes(); }
  function hmToMin(hm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hm == null ? '' : hm).trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }
  function minToHm(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
  }
  function atMinute(date, min) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(min / 60), min % 60, 0, 0);
  }
  function weekdayOf(d) { var w = d.getDay(); return w === 0 ? 7 : w; }
  function dayName(day) { return DAY_NAMES[day - 1] || ''; }
  function dateLabel(d) { return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function shortDate(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
  function dayLabel(d) { return '周' + DAY_SHORT[weekdayOf(d) - 1]; }
  function relativeDayLabel(date, ref) {
    var n = diffDays(date, ref);
    if (n === 0) return '今天';
    if (n === 1) return '明天';
    if (n === 2) return '后天';
    if (n === -1) return '昨天';
    return dayName(weekdayOf(date));
  }
  function isSameDay(a, b) { return !!a && !!b && ymd(a) === ymd(b); }
  function normalizeColor(c) {
    c = String(c || '').toLowerCase();
    return COLORS.indexOf(c) === -1 ? COLORS[0] : c;
  }
  function uniq(arr) {
    var seen = {}, out = [];
    (arr || []).forEach(function (x) {
      var k = String(x);
      if (x != null && k !== '' && !seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  }

  // ---------------------------------------------------------------- 周次解析

  /**
   * 解析周次字符串，支持：
   *   1-16 / 1-16单 / 2-18双 / 单周 / 双周 / 1,3,5-9 / 空（=全部周）
   */
  function parseWeeks(spec, weeksCount) {
    var total = clampInt(weeksCount, 1, 60, 18);
    var all = [];
    for (var i = 1; i <= total; i++) all.push(i);
    if (spec == null) return all;
    var s = String(spec).trim();
    if (!s || s === '*' || s === '全周') return all;
    s = s.replace(/[，、；;]/g, ',')
      .replace(/[－–—~～]/g, '-')
      .replace(/周/g, '')
      .replace(/第/g, '');
    var picked = {};
    s.split(',').forEach(function (raw) {
      var token = raw.trim();
      if (!token) return;
      var mode = 0;
      if (/单/.test(token)) mode = 1;
      else if (/双/.test(token)) mode = 2;
      token = token.replace(/[单双（）()]/g, '');
      var m = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(token);
      var a, b;
      if (m) { a = +m[1]; b = +m[2]; }
      else {
        var one = /^(\d{1,2})$/.exec(token);
        if (!one) return;
        a = b = +one[1];
      }
      if (b < a) { var t = a; a = b; b = t; }
      a = Math.max(1, a); b = Math.min(total, b);
      for (var w = a; w <= b; w++) {
        if (mode === 1 && w % 2 === 0) continue;
        if (mode === 2 && w % 2 === 1) continue;
        picked[w] = true;
      }
    });
    var out = all.filter(function (w) { return picked[w]; });
    return out;
  }

  function weeksLabel(spec, weeksCount) {
    var s = String(spec == null ? '' : spec).trim();
    if (!s) return '每周';
    if (/^1-16$/.test(s)) return '1-16 周';
    var w = parseWeeks(spec, weeksCount);
    if (!w.length) return '无';
    if (w.length === clampInt(weeksCount, 1, 60, 18)) return '每周';
    return s;
  }

  // ---------------------------------------------------------------- 数据规范化

  function normalizePeriods(raw) {
    var src = Array.isArray(raw) && raw.length ? raw : DEFAULT_PERIODS;
    var out = [];
    for (var i = 0; i < src.length && out.length < 20; i++) {
      var p = src[i] || {};
      var start = hmToMin(p.start) == null ? null : minToHm(hmToMin(p.start));
      var end = hmToMin(p.end) == null ? null : minToHm(hmToMin(p.end));
      if (!start || !end) continue;
      if (hmToMin(end) <= hmToMin(start)) end = minToHm(hmToMin(start) + 45);
      out.push({ n: out.length + 1, start: start, end: end });
    }
    return out.length ? out : DEFAULT_PERIODS.slice();
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  }

  // ---------------------------------------------------------------- 行囊勾选 / 任务

  function normalizePacked(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).slice(0, 120).forEach(function (day) {
      if (!parseYmd(day)) return;
      var source = raw[day];
      if (!source || typeof source !== 'object' || Array.isArray(source)) return;
      var items = {};
      Object.keys(source).slice(0, 60).forEach(function (name) {
        var clean = String(name).trim().slice(0, 20);
        if (clean) items[clean] = true;
      });
      if (Object.keys(items).length) out[ymd(parseYmd(day))] = items;
    });
    return out;
  }

  var TASK_TYPES = ['homework', 'exam', 'todo', 'event'];

  function normalizeTasks(raw) {
    var out = [];
    (Array.isArray(raw) ? raw : []).forEach(function (task) {
      if (!task || typeof task !== 'object') return;
      var title = String(task.title || '').trim();
      if (!title) return;
      var due = parseYmd(task.due);
      if (!due) return;
      var timeMin = hmToMin(task.time);
      var remindMin = null;
      if (task.remindMin !== null && task.remindMin !== undefined && task.remindMin !== '') {
        remindMin = clampInt(task.remindMin, 0, 10080, 60);
      }
      out.push({
        id: String(task.id || '') || uid('t'),
        title: title.slice(0, 80),
        type: TASK_TYPES.indexOf(task.type) === -1 ? 'todo' : task.type,
        courseName: String(task.courseName || '').slice(0, 40),
        due: ymd(due),
        time: timeMin == null ? '' : minToHm(timeMin),
        note: String(task.note || '').slice(0, 300),
        priority: clampInt(task.priority, 1, 3, 2),
        done: task.done === true,
        doneAt: String(task.doneAt || ''),
        remindMin: remindMin,
        createdAt: String(task.createdAt || '') || new Date().toISOString()
      });
    });
    out.sort(function (a, b) {
      return (a.due + (a.time || '23:59')).localeCompare(b.due + (b.time || '23:59'));
    });
    return out.slice(0, 500);
  }

  function taskDueAt(task) {
    var day = parseYmd(task.due);
    if (!day) day = startOfDay(new Date());
    var min = hmToMin(task.time);
    if (min == null) min = 23 * 60 + 59;
    return atMinute(day, min);
  }

  function taskTypeLabel(type) {
    return { homework: '作业', exam: '考试', todo: '待办', event: '日程' }[type] || '待办';
  }

  function taskDescription(task) {
    var parts = [];
    if (task.courseName) parts.push(task.courseName);
    parts.push(dateLabel(parseYmd(task.due)) + ' ' + (task.time || '全天'));
    if (task.note) parts.push(task.note);
    return parts.join(' · ');
  }

  /** 某天截止的未完成任务 */
  function tasksDueOn(data, date) {
    var key = ymd(date);
    return (data.tasks || []).filter(function (task) {
      return !task.done && task.due === key;
    });
  }

  function taskLineFor(data, date, label) {
    var due = tasksDueOn(data, date);
    if (!due.length) return '';
    var names = due.map(function (task) {
      return '《' + task.title + '》' + (task.time || '全天');
    });
    return (label || '今天') + '还有 ' + due.length + ' 项 DDL：' + names.join('、') + '。';
  }

  /** 任务提醒计划（截止前 N 分钟 + 前一天晚间预告） */
  function buildTaskReminders(data, from, to) {
    var out = [];
    if (!data || !Array.isArray(data.tasks) || !data.settings) return out;
    var s = data.settings;
    var fromT = from.getTime();
    var toT = to.getTime();
    data.tasks.forEach(function (task) {
      if (task.done) return;
      var due = taskDueAt(task);
      if (s.taskRemindOn && task.remindMin != null) {
        var at = new Date(due.getTime() - task.remindMin * 60000);
        if (at.getTime() >= fromT && at.getTime() <= toT) {
          out.push({
            key: 'task|' + task.id + '|' + ymd(due),
            kind: 'task',
            at: at,
            task: task,
            title: taskTypeLabel(task.type) + '提醒 · ' + task.title,
            body: taskDescription(task)
          });
        }
      }
      if (s.taskEveningOn && hmToMin(s.taskEveningTime) != null) {
        var eve = atMinute(addDays(due, -1), hmToMin(s.taskEveningTime));
        if (eve.getTime() >= fromT && eve.getTime() <= toT) {
          out.push({
            key: 'task-eve|' + task.id + '|' + task.due,
            kind: 'task-eve',
            at: eve,
            task: task,
            title: '明日截止 · ' + task.title,
            body: taskDescription(task)
          });
        }
      }
    });
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  }

  function normalizeData(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var meta = src.meta || {};
    var semesterStart = parseYmd(meta.semesterStart) ? ymd(parseYmd(meta.semesterStart)) : ymd(mondayOf(new Date()));
    var data = {
      version: 1,
      meta: {
        name: String(meta.name || '我的课表').slice(0, 40),
        school: String(meta.school || '同济大学').slice(0, 40),
        semesterStart: semesterStart,
        weeks: clampInt(meta.weeks, 1, 30, 18)
      },
      periods: normalizePeriods(src.periods),
      settings: {},
      courses: [],
      checkins: (src.checkins && typeof src.checkins === 'object') ? src.checkins : {},
      packed: normalizePacked(src.packed),
      tasks: normalizeTasks(src.tasks)
    };

    var s = src.settings || {};
    data.settings = {
      skin: ['royal', 'classic'].indexOf(s.skin) === -1 ? 'royal' : s.skin,
      teacher: s.teacher !== false,
      teacherOutfit: ['court', 'star', 'rose'].indexOf(s.teacherOutfit) === -1 ? 'court' : s.teacherOutfit,
      llmOn: s.llmOn === true,
      llmPreset: String(s.llmPreset || 'deepseek').slice(0, 20),
      llmBase: String(s.llmBase || 'https://api.deepseek.com/v1').slice(0, 200),
      llmModel: String(s.llmModel || 'deepseek-chat').slice(0, 80),
      llmKey: String(s.llmKey || '').slice(0, 200),
      theme: ['auto', 'light', 'dark'].indexOf(s.theme) === -1 ? 'auto' : s.theme,
      digestOn: s.digestOn !== false,
      digestTime: hmToMin(s.digestTime) == null ? '07:20' : minToHm(hmToMin(s.digestTime)),
      preOn: s.preOn !== false,
      preMin: clampInt(s.preMin, 0, 120, 20),
      signOn: s.signOn !== false,
      signMin: clampInt(s.signMin, 0, 30, 2),
      eveningOn: s.eveningOn !== false,
      eveningTime: hmToMin(s.eveningTime) == null ? '21:30' : minToHm(hmToMin(s.eveningTime)),
      signInUrl: String(s.signInUrl || '').slice(0, 500),
      taskRemindOn: s.taskRemindOn !== false,
      taskRemindMin: clampInt(s.taskRemindMin, 0, 10080, 60),
      taskEveningOn: s.taskEveningOn !== false,
      taskEveningTime: hmToMin(s.taskEveningTime) == null ? '20:30' : minToHm(hmToMin(s.taskEveningTime))
    };

    var courses = Array.isArray(src.courses) ? src.courses : [];
    var seenIds = {};
    courses.forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      var name = String(c.name || '').trim();
      if (!name) return;
      var id = String(c.id || '') || uid('c');
      while (seenIds[id]) id = uid('c');
      seenIds[id] = true;
      var course = {
        id: id,
        name: name.slice(0, 40),
        teacher: String(c.teacher || '').slice(0, 30),
        color: normalizeColor(c.color),
        sessions: []
      };
      var sessions = Array.isArray(c.sessions) ? c.sessions : [];
      var sessionSeq = 0;
      sessions.forEach(function (ss) {
        if (!ss || typeof ss !== 'object') return;
        sessionSeq++;
        var day = clampInt(ss.day, 1, 7, 1);
        var start = clampInt(ss.start, 1, data.periods.length, 1);
        var end = clampInt(ss.end, start, data.periods.length, start);
        var room = String(ss.room || '').slice(0, 40);
        var bring = Array.isArray(ss.bring) ? ss.bring : String(ss.bring || '').split(/[,，、;；]/);
        bring = uniq(bring.map(function (x) { return String(x).trim().slice(0, 20); }).filter(Boolean)).slice(0, 12);
        course.sessions.push({
          id: String(ss.id || '') || (id + '-s' + sessionSeq),
          day: day,
          start: start,
          end: end,
          weeks: String(ss.weeks == null ? '' : ss.weeks).slice(0, 40),
          room: room,
          bring: bring
        });
      });
      if (!course.sessions.length) {
        course.sessions.push({ id: id + '-s1', day: 1, start: 1, end: 1, weeks: '', room: '', bring: [] });
      }
      data.courses.push(course);
    });

    return data;
  }

  function validateData(data) {
    var errors = [], warnings = [];
    if (!data || typeof data !== 'object') {
      errors.push('数据不是有效的对象');
      return { ok: false, errors: errors, warnings: warnings };
    }
    if (!Array.isArray(data.courses)) errors.push('缺少 courses 课程数组');
    if (!data.meta || !parseYmd(data.meta.semesterStart)) errors.push('学期开始日期无效');
    if (data.meta && !(clampInt(data.meta.weeks, 1, 30, 0) > 0)) errors.push('学期周数无效');
    if (Array.isArray(data.courses)) {
      var ids = {};
      data.courses.forEach(function (c, i) {
        if (!c.name) errors.push('第 ' + (i + 1) + ' 门课缺少名称');
        if (ids[c.id]) warnings.push('课程 id 重复：' + c.id);
        ids[c.id] = true;
        if (!Array.isArray(c.sessions) || !c.sessions.length) warnings.push('《' + c.name + '》没有排课时间');
        (c.sessions || []).forEach(function (s) {
          if (s.day < 1 || s.day > 7) errors.push('《' + c.name + '》的星期无效');
          if (s.start < 1 || s.end < s.start) errors.push('《' + c.name + '》的节次无效');
        });
      });
    }
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  // ---------------------------------------------------------------- 课表计算

  function periodOf(periods, n) {
    for (var i = 0; i < periods.length; i++) if (periods[i].n === n) return periods[i];
    return null;
  }

  function sessionTimes(periods, session) {
    var p1 = periodOf(periods, session.start);
    var p2 = periodOf(periods, session.end) || p1;
    if (!p1) return null;
    var startMin = hmToMin(p1.start);
    var endMin = hmToMin(p2.end);
    if (startMin == null) return null;
    if (endMin == null || endMin <= startMin) endMin = startMin + 45;
    return { startMin: startMin, endMin: endMin };
  }

  function sessionPeriodLabel(session) {
    if (session.start === session.end) return '第' + session.start + '节';
    return '第' + session.start + '-' + session.end + '节';
  }

  function semesterWeek(meta, date) {
    var start = parseYmd(meta.semesterStart);
    if (!start) return 1;
    return Math.floor(diffDays(date, start) / 7) + 1;
  }

  function semesterRange(meta) {
    var start = parseYmd(meta.semesterStart) || mondayOf(new Date());
    return { start: start, end: addDays(start, clampInt(meta.weeks, 1, 30, 18) * 7 - 1) };
  }

  function makeItem(course, session, date, times, week) {
    return {
      key: course.id + '|' + session.id,
      date: ymd(date),
      courseId: course.id,
      sessionId: session.id,
      name: course.name,
      teacher: course.teacher,
      color: course.color,
      room: session.room,
      bring: (session.bring || []).slice(),
      periodLabel: sessionPeriodLabel(session),
      startMin: times.startMin,
      endMin: times.endMin,
      start: atMinute(date, times.startMin),
      end: atMinute(date, times.endMin),
      week: week
    };
  }

  /** 某一天的全部课程（按开始时间排序） */
  function dayItems(data, date) {
    var out = [];
    if (!data || !Array.isArray(data.courses)) return out;
    var week = semesterWeek(data.meta, date);
    if (week < 1 || week > data.meta.weeks) return out;
    var wd = weekdayOf(date);
    data.courses.forEach(function (course) {
      (course.sessions || []).forEach(function (session) {
        if (session.day !== wd) return;
        if (parseWeeks(session.weeks, data.meta.weeks).indexOf(week) === -1) return;
        var times = sessionTimes(data.periods, session);
        if (!times) return;
        out.push(makeItem(course, session, date, times, week));
      });
    });
    out.sort(function (a, b) { return a.startMin - b.startMin || a.endMin - b.endMin; });
    return out;
  }

  function weekDayItems(data, week, dayOfWeek) {
    var range = semesterRange(data.meta);
    var date = addDays(range.start, (week - 1) * 7 + (dayOfWeek - 1));
    return dayItems(data, date);
  }

  /** 当前正在上的课 */
  function currentItem(data, now) {
    var items = dayItems(data, now);
    var m = minuteOfDay(now);
    for (var i = 0; i < items.length; i++) {
      if (items[i].startMin <= m && m < items[i].endMin) return items[i];
    }
    return null;
  }

  /**
   * 下一节课（今天还没开始的，或未来 14 天内最近的一节）
   * 返回 { item, state:'now'|'next', date }
   */
  function nextItem(data, now) {
    var cur = currentItem(data, now);
    if (cur) return { item: cur, state: 'now', date: now };
    var m = minuteOfDay(now);
    var today = dayItems(data, now);
    for (var i = 0; i < today.length; i++) {
      if (today[i].startMin > m) return { item: today[i], state: 'next', date: now };
    }
    for (var off = 1; off <= 14; off++) {
      var d = addDays(now, off);
      var items = dayItems(data, d);
      if (items.length) return { item: items[0], state: 'next', date: d };
    }
    return null;
  }

  function dayStatus(now) {
    var m = minuteOfDay(now);
    if (m < 6 * 60) return '深夜里，早点睡';
    if (m < 9 * 60) return '早上好，今天也要准时';
    if (m < 12 * 60) return '上午的课，加油';
    if (m < 14 * 60) return '午休时间，别忘了下午的课';
    if (m < 18 * 60) return '下午好，继续冲';
    if (m < 22 * 60) return '晚上好，留意明天的课';
    return '夜深了，明天见';
  }

  function dayStats(data, date) {
    var items = dayItems(data, date);
    var minutes = 0;
    items.forEach(function (it) { minutes += it.endMin - it.startMin; });
    return {
      count: items.length,
      minutes: minutes,
      first: items[0] || null,
      last: items.length ? items[items.length - 1] : null
    };
  }

  function weekStats(data, week) {
    var total = 0, days = {};
    for (var d = 1; d <= 7; d++) {
      var items = weekDayItems(data, week, d);
      days[d] = items.length;
      total += items.length;
    }
    return { count: total, days: days };
  }

  function unionBring(items) {
    var all = [];
    (items || []).forEach(function (it) { all = all.concat(it.bring || []); });
    return uniq(all);
  }

  function digestBody(items, label) {
    if (!items || !items.length) return (label || '今天') + '没有课，自由安排 🎈';
    var parts = items.map(function (it) {
      return minToHm(it.startMin) + ' ' + it.name + (it.room ? ' @ ' + it.room : '');
    });
    var bring = unionBring(items);
    var text = (label || '今天') + ' ' + items.length + ' 节课：' + parts.join('；') + '。';
    if (bring.length) text += ' 带好：' + bring.join('、');
    return text;
  }

  // ---------------------------------------------------------------- 提醒计划

  var MAX_REMIND_DAYS = 21;

  /** 生成 [from, to] 区间内所有该触发的提醒（含已过去的时间点，由调用方筛选） */
  function buildReminders(data, from, to) {
    var out = [];
    if (!data || !data.settings) return out;
    var s = data.settings;
    var start = startOfDay(from);
    var end = startOfDay(to);
    var span = diffDays(end, start);
    if (span < 0) return out;
    if (span > MAX_REMIND_DAYS) end = addDays(start, MAX_REMIND_DAYS);

    var digestMin = hmToMin(s.digestTime);
    var eveningMin = hmToMin(s.eveningTime);

    for (var cursor = new Date(start); diffDays(cursor, end) <= 0; cursor = addDays(cursor, 1)) {
      var items = dayItems(data, cursor);
      if (!items.length) continue;
      if (s.digestOn && digestMin != null) {
        out.push({
          key: 'digest|' + ymd(cursor),
          kind: 'digest',
          at: atMinute(cursor, digestMin),
          title: '今日课表 · ' + items.length + ' 节课',
          body: digestBody(items, '今天') + (taskLineFor(data, cursor, '今天') ? ' ' + taskLineFor(data, cursor, '今天') : ''),
          items: items
        });
      }
      if (s.eveningOn && eveningMin != null) {
        var tomorrow = addDays(cursor, 1);
        var tItems = dayItems(data, tomorrow);
        if (tItems.length) {
          out.push({
            key: 'evening|' + ymd(tomorrow),
            kind: 'evening',
            at: atMinute(cursor, eveningMin),
            title: '明天的课 · ' + tItems.length + ' 节',
            body: digestBody(tItems, '明天') + (taskLineFor(data, tomorrow, '明天') ? ' ' + taskLineFor(data, tomorrow, '明天') : ''),
            items: tItems
          });
        }
      }
      items.forEach(function (it) {
        if (s.preOn) {
          out.push({
            key: 'pre|' + it.key + '|' + it.date,
            kind: 'pre',
            at: new Date(it.start.getTime() - s.preMin * 60000),
            title: s.preMin > 0 ? ('还有 ' + s.preMin + ' 分钟上课') : '马上去上课',
            body: it.name + ' · ' + (it.room || '地点待定') + (it.bring.length ? ' ｜ 携带：' + it.bring.join('、') : ''),
            item: it
          });
        }
        if (s.signOn) {
          out.push({
            key: 'sign|' + it.key + '|' + it.date,
            kind: 'sign',
            at: new Date(it.start.getTime() - s.signMin * 60000),
            title: '该签到了 · ' + it.name,
            body: (it.room ? it.room + ' · ' : '') + '还有 ' + s.signMin + ' 分钟上课，打开签到入口',
            item: it
          });
        }
      });
    }
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  }

  // ---------------------------------------------------------------- 倒计时

  function formatCountdown(target, now) {
    var ms = Math.max(0, new Date(target).getTime() - new Date(now).getTime());
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var text;
    if (ms < 60000) text = '不到 1 分钟';
    else if (h > 0) text = h + ' 小时 ' + m + ' 分';
    else text = m + ' 分钟';
    return {
      ms: ms,
      hours: h,
      minutes: m,
      seconds: s,
      text: text,
      digits: h > 0 ? pad2(h) + ':' + pad2(m) : pad2(m) + ':' + pad2(s),
      urgent: ms <= 10 * 60000
    };
  }

  // ---------------------------------------------------------------- ICS 导出

  function icsEscape(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function utf8Length(str) {
    var n = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  function foldLine(line) {
    if (utf8Length(line) <= 75) return line;
    var out = [];
    var cur = '', curLen = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      var code = line.charCodeAt(i);
      var w = 1;
      if (code >= 0x80 && code < 0x800) w = 2;
      else if (code >= 0x800) w = 3;
      if (code >= 0xd800 && code <= 0xdbff) { ch = line.slice(i, i + 2); w = 4; i++; }
      if (curLen + w > 73) { out.push(cur); cur = ' '; curLen = 1; }
      cur += ch; curLen += w;
    }
    if (cur) out.push(cur);
    return out.join('\r\n');
  }

  function icsDateTime(date) {
    return '' + date.getFullYear() + pad2(date.getMonth() + 1) + pad2(date.getDate()) +
      'T' + pad2(date.getHours()) + pad2(date.getMinutes()) + '00';
  }

  function icsStamp(date) {
    return '' + date.getUTCFullYear() + pad2(date.getUTCMonth() + 1) + pad2(date.getUTCDate()) +
      'T' + pad2(date.getUTCHours()) + pad2(date.getUTCMinutes()) + pad2(date.getUTCSeconds()) + 'Z';
  }

  /**
   * 生成 .ics：每节课一个 VEVENT + 课前/签到两个 VALARM；可选每天早报事件
   * 返回 { text, events, filename }
   */
  function buildICS(data, options) {
    var opts = options || {};
    var now = opts.now ? new Date(opts.now) : new Date();
    var preMin = opts.preMin != null ? opts.preMin : (data.settings.preOn ? data.settings.preMin : 0);
    var signMin = opts.signMin != null ? opts.signMin : (data.settings.signOn ? data.settings.signMin : 0);
    var includeDigest = opts.includeDigest !== false && data.settings.digestOn;
    var digestMin = hmToMin(data.settings.digestTime);
    var range = semesterRange(data.meta);
    var stamp = icsStamp(now);
    var lines = [];
    var eventCount = 0;

    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//ClassTick//课刻 ClassTick//CN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push('X-WR-CALNAME:' + icsEscape('课刻 · ' + data.meta.name));
    lines.push('X-WR-TIMEZONE:Asia/Shanghai');

    function alarm(minutes, description) {
      if (minutes == null || minutes < 0) return;
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('TRIGGER:-PT' + Math.round(minutes) + 'M');
      lines.push('DESCRIPTION:' + icsEscape(description));
      lines.push('END:VALARM');
    }

    for (var cursor = new Date(range.start); diffDays(cursor, range.end) <= 0; cursor = addDays(cursor, 1)) {
      var items = dayItems(data, cursor);
      if (!items.length) continue;

      items.forEach(function (it) {
        if (eventCount >= 2000) return;
        var desc = [];
        if (it.teacher) desc.push('教师：' + it.teacher);
        desc.push(it.periodLabel);
        if (it.bring.length) desc.push('携带：' + it.bring.join('、'));
        desc.push('—— 课刻 ClassTick');
        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + it.courseId + '-' + it.sessionId + '-' + ymd(cursor).replace(/-/g, '') + '@classtick');
        lines.push('DTSTAMP:' + stamp);
        lines.push('DTSTART:' + icsDateTime(it.start));
        lines.push('DTEND:' + icsDateTime(it.end));
        lines.push('SUMMARY:' + icsEscape(it.name));
        if (it.room) lines.push('LOCATION:' + icsEscape(it.room));
        lines.push('DESCRIPTION:' + icsEscape(desc.join('\n')));
        alarm(preMin, '课前提醒：' + it.name + (it.room ? ' @ ' + it.room : ''));
        alarm(signMin, '签到提醒：' + it.name + ' 马上开始');
        lines.push('END:VEVENT');
        eventCount++;
      });

      if (includeDigest && digestMin != null && eventCount < 2000) {
        var digestDesc = ['今日 ' + items.length + ' 节课：'];
        items.forEach(function (it) {
          digestDesc.push('· ' + minToHm(it.startMin) + ' ' + it.name + (it.room ? ' @ ' + it.room : ''));
        });
        var bring = unionBring(items);
        if (bring.length) digestDesc.push('带好：' + bring.join('、'));
        var dStart = atMinute(cursor, digestMin);
        lines.push('BEGIN:VEVENT');
        lines.push('UID:digest-' + ymd(cursor).replace(/-/g, '') + '@classtick');
        lines.push('DTSTAMP:' + stamp);
        lines.push('DTSTART:' + icsDateTime(dStart));
        lines.push('DTEND:' + icsDateTime(new Date(dStart.getTime() + 15 * 60000)));
        lines.push('SUMMARY:' + icsEscape('今日课表 · ' + items.length + ' 节'));
        lines.push('DESCRIPTION:' + icsEscape(digestDesc.join('\n')));
        alarm(0, '出门前看一眼今天的课');
        lines.push('END:VEVENT');
        eventCount++;
      }
    }

    // 课程之外的任务 / DDL 也写进日历
    (data.tasks || []).forEach(function (task) {
      if (task.done || eventCount >= 2000) return;
      var due = taskDueAt(task);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:task-' + task.id + '@classtick');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART:' + icsDateTime(due));
      lines.push('DTEND:' + icsDateTime(new Date(due.getTime() + 30 * 60000)));
      lines.push('SUMMARY:' + icsEscape(taskTypeLabel(task.type) + '：' + task.title));
      lines.push('DESCRIPTION:' + icsEscape(taskDescription(task) + '\n—— 课刻 ClassTick'));
      if (task.remindMin != null) alarm(task.remindMin, taskTypeLabel(task.type) + '提醒：' + task.title);
      lines.push('END:VEVENT');
      eventCount++;
    });

    lines.push('END:VCALENDAR');
    var text = lines.map(foldLine).join('\r\n') + '\r\n';
    return {
      text: text,
      events: eventCount,
      filename: '课刻课表_' + data.meta.semesterStart.replace(/-/g, '') + '.ics'
    };
  }

  // ---------------------------------------------------------------- 导出

  return {
    DAY_NAMES: DAY_NAMES,
    DAY_SHORT: DAY_SHORT,
    COLORS: COLORS,
    DEFAULT_PERIODS: DEFAULT_PERIODS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    pad2: pad2,
    clampInt: clampInt,
    ymd: ymd,
    parseYmd: parseYmd,
    startOfDay: startOfDay,
    addDays: addDays,
    diffDays: diffDays,
    mondayOf: mondayOf,
    minuteOfDay: minuteOfDay,
    hmToMin: hmToMin,
    minToHm: minToHm,
    atMinute: atMinute,
    weekdayOf: weekdayOf,
    dayName: dayName,
    dateLabel: dateLabel,
    shortDate: shortDate,
    dayLabel: dayLabel,
    relativeDayLabel: relativeDayLabel,
    isSameDay: isSameDay,
    normalizeColor: normalizeColor,
    uniq: uniq,
    uid: uid,
    parseWeeks: parseWeeks,
    weeksLabel: weeksLabel,
    normalizePeriods: normalizePeriods,
    normalizeData: normalizeData,
    validateData: validateData,
    periodOf: periodOf,
    sessionTimes: sessionTimes,
    sessionPeriodLabel: sessionPeriodLabel,
    semesterWeek: semesterWeek,
    semesterRange: semesterRange,
    dayItems: dayItems,
    weekDayItems: weekDayItems,
    currentItem: currentItem,
    nextItem: nextItem,
    dayStatus: dayStatus,
    dayStats: dayStats,
    weekStats: weekStats,
    unionBring: unionBring,
    digestBody: digestBody,
    buildReminders: buildReminders,
    normalizePacked: normalizePacked,
    normalizeTasks: normalizeTasks,
    TASK_TYPES: TASK_TYPES,
    taskDueAt: taskDueAt,
    taskTypeLabel: taskTypeLabel,
    taskDescription: taskDescription,
    tasksDueOn: tasksDueOn,
    taskLineFor: taskLineFor,
    buildTaskReminders: buildTaskReminders,
    formatCountdown: formatCountdown,
    buildICS: buildICS,
    icsEscape: icsEscape,
    foldLine: foldLine
  };
});

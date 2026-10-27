/*!
 * 课刻 ClassTick · 核心逻辑单元测试
 * 运行：node tests/core.test.cjs
 */
'use strict';

const assert = require('node:assert');
const C = require('../assets/core.js');

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    failures.push({ name, message: err.message });
    console.log('  ✗ ' + name + '\n      ' + String(err.message).split('\n')[0]);
  }
}

function scenario(name, fn) {
  console.log('\n' + name);
  fn();
}

// 示例数据在 Node 里加载（seed.js 挂到 globalThis）
global.self = global;
require('../assets/seed.js');
const seed = C.normalizeData(global.ClassTickSeed);
const MON = '2026-10-26'; // 第 8 周周一
const FRI_W8 = '2026-10-30'; // 第 8 周周五（建筑制图是单周，所以不出现）
const FRI_W7 = '2026-10-23'; // 第 7 周周五（单周，建筑制图出现）
const SUN = '2026-10-25';

function at(dateStr, h, m) {
  const d = C.parseYmd(dateStr);
  d.setHours(h, m, 0, 0);
  return d;
}

scenario('一、日期与时间工具', () => {
  test('ymd / parseYmd 往返', () => {
    const d = C.parseYmd('2026-10-26');
    assert.strictEqual(C.ymd(d), '2026-10-26');
    assert.strictEqual(C.parseYmd('2026-13-01'), null);
    assert.strictEqual(C.parseYmd(''), null);
  });
  test('2026-10-26 是周一', () => {
    assert.strictEqual(C.weekdayOf(C.parseYmd('2026-10-26')), 1);
    assert.strictEqual(C.weekdayOf(C.parseYmd('2026-10-25')), 7);
    assert.strictEqual(C.weekdayOf(C.parseYmd('2026-11-01')), 7);
  });
  test('addDays / diffDays 跨月', () => {
    const a = C.parseYmd('2026-10-31');
    assert.strictEqual(C.ymd(C.addDays(a, 1)), '2026-11-01');
    assert.strictEqual(C.diffDays(C.parseYmd('2026-11-01'), a), 1);
    assert.strictEqual(C.diffDays(a, C.parseYmd('2026-11-01')), -1);
  });
  test('hmToMin / minToHm', () => {
    assert.strictEqual(C.hmToMin('08:00'), 480);
    assert.strictEqual(C.hmToMin('8:05'), 485);
    assert.strictEqual(C.hmToMin('24:00'), null);
    assert.strictEqual(C.hmToMin('abc'), null);
    assert.strictEqual(C.minToHm(480), '08:00');
    assert.strictEqual(C.minToHm(0), '00:00');
    assert.strictEqual(C.minToHm(1440), '00:00');
  });
  test('相对日期标签', () => {
    const ref = C.parseYmd(MON);
    assert.strictEqual(C.relativeDayLabel(C.parseYmd(MON), ref), '今天');
    assert.strictEqual(C.relativeDayLabel(C.parseYmd('2026-10-27'), ref), '明天');
    assert.strictEqual(C.relativeDayLabel(C.parseYmd('2026-10-28'), ref), '后天');
    assert.strictEqual(C.relativeDayLabel(C.parseYmd('2026-10-30'), ref), '周五');
  });
});

scenario('二、周次解析（单双周）', () => {
  test('空值 = 全部周', () => {
    assert.strictEqual(C.parseWeeks('', 18).length, 18);
    assert.strictEqual(C.parseWeeks(null, 18).length, 18);
  });
  test('1-16 连续周', () => {
    const weeks = C.parseWeeks('1-16', 18);
    assert.strictEqual(weeks.length, 16);
    assert.deepStrictEqual(weeks.slice(0, 3), [1, 2, 3]);
    assert.strictEqual(weeks[weeks.length - 1], 16);
  });
  test('1-16 单周', () => {
    assert.deepStrictEqual(C.parseWeeks('1-16单', 18), [1, 3, 5, 7, 9, 11, 13, 15]);
  });
  test('2-16 双周（含中文括号写法）', () => {
    assert.deepStrictEqual(C.parseWeeks('2-16双', 18), [2, 4, 6, 8, 10, 12, 14, 16]);
    assert.deepStrictEqual(C.parseWeeks('2-16（双）', 18), [2, 4, 6, 8, 10, 12, 14, 16]);
  });
  test('枚举 + 区间混合', () => {
    assert.deepStrictEqual(C.parseWeeks('1,3,5-9', 18), [1, 3, 5, 6, 7, 8, 9]);
  });
  test('超出总周数会被裁剪', () => {
    assert.strictEqual(C.parseWeeks('1-30', 18).length, 18);
    assert.deepStrictEqual(C.parseWeeks('17-20', 18), [17, 18]);
  });
  test('非法写法返回空数组', () => {
    assert.deepStrictEqual(C.parseWeeks('abc', 18), []);
    assert.deepStrictEqual(C.parseWeeks('0', 18), []);
  });
  test('weeksLabel 友好显示', () => {
    assert.strictEqual(C.weeksLabel('', 18), '每周');
    assert.strictEqual(C.weeksLabel('1-16', 18), '1-16 周');
    assert.strictEqual(C.weeksLabel('1-16单', 18), '1-16单');
  });
});

scenario('三、数据规范化与校验', () => {
  test('示例数据规范化后结构完整', () => {
    assert.ok(seed.meta);
    assert.strictEqual(seed.courses.length, 9);
    assert.strictEqual(seed.periods.length, 12);
    assert.ok(seed.courses[0].sessions.length >= 1);
    assert.ok(Array.isArray(seed.courses[0].sessions[0].bring));
  });
  test('缺字段时补默认值', () => {
    const d = C.normalizeData({ courses: [{ name: '只有名字' }] });
    assert.strictEqual(d.meta.weeks, 18);
    assert.strictEqual(d.meta.school, '同济大学');
    assert.strictEqual(d.courses[0].sessions.length, 1);
    assert.strictEqual(d.settings.digestTime, '07:20');
    assert.strictEqual(d.settings.skin, 'royal');
    assert.ok(C.parseYmd(d.meta.semesterStart));
  });
  test('皮肤设置只接受 royal / classic', () => {
    assert.strictEqual(C.normalizeData({ settings: { skin: 'classic' } }).settings.skin, 'classic');
    assert.strictEqual(C.normalizeData({ settings: { skin: 'neon' } }).settings.skin, 'royal');
    assert.strictEqual(C.normalizeData({}).settings.skin, 'royal');
  });
  test('非法数值被裁剪', () => {
    const d = C.normalizeData({
      meta: { weeks: 999 },
      settings: { preMin: -5, signMin: 0 },
      courses: [{ name: '测试', sessions: [{ day: 9, start: 0, end: 99, bring: '教材、计算器' }] }]
    });
    assert.strictEqual(d.meta.weeks, 30);
    assert.strictEqual(d.settings.preMin, 0);
    assert.deepStrictEqual(d.courses[0].sessions[0].bring, ['教材', '计算器']);
    assert.strictEqual(d.courses[0].sessions[0].day, 7);
    assert.strictEqual(d.courses[0].sessions[0].start, 1);
    assert.strictEqual(d.courses[0].sessions[0].end, d.periods.length);
  });
  test('重复课程 id 会被重新分配', () => {
    const d = C.normalizeData({
      courses: [{ id: 'dup', name: 'A' }, { id: 'dup', name: 'B' }]
    });
    assert.notStrictEqual(d.courses[0].id, d.courses[1].id);
  });
  test('validateData：合法数据通过', () => {
    const r = C.validateData(seed);
    assert.strictEqual(r.ok, true, r.errors.join('；'));
    assert.deepStrictEqual(r.errors, []);
  });
  test('validateData：缺课程名会报错', () => {
    const r = C.validateData(C.normalizeData({ courses: [{ name: '' }] }));
    assert.strictEqual(r.ok, true); // normalize 会直接过滤掉无名课程
    const bad = C.validateData({ meta: { semesterStart: '2026-09-07', weeks: 18 }, courses: [{ id: 'x', name: '', sessions: [] }] });
    assert.strictEqual(bad.ok, false);
    assert.ok(bad.errors.length > 0);
  });
  test('会话时间段计算', () => {
    const times = C.sessionTimes(seed.periods, { start: 1, end: 2 });
    assert.deepStrictEqual(times, { startMin: 480, endMin: 580 });
    const times2 = C.sessionTimes(seed.periods, { start: 9, end: 10 });
    assert.deepStrictEqual(times2, { startMin: 1110, endMin: 1210 });
  });
});

scenario('四、学期与课表计算', () => {
  test('第 8 周正确', () => {
    assert.strictEqual(C.semesterWeek(seed.meta, at(MON, 8, 0)), 8);
    assert.strictEqual(C.semesterWeek(seed.meta, C.parseYmd('2026-09-07')), 1);
    assert.strictEqual(C.semesterWeek(seed.meta, C.parseYmd('2026-10-25')), 7); // 周日属于第 7 周
    assert.strictEqual(C.semesterWeek(seed.meta, C.parseYmd('2026-11-01')), 8);
  });
  test('第 8 周周一有 3 节课且按时间排序', () => {
    const items = C.dayItems(seed, at(MON, 7, 0));
    assert.strictEqual(items.length, 3);
    assert.deepStrictEqual(items.map((i) => i.name), ['高等数学(B)', '大学物理', '设计概论']);
    assert.deepStrictEqual(items.map((i) => i.startMin), [480, 600, 1110]);
  });
  test('双周课只出现在双周', () => {
    const w8 = C.dayItems(seed, at(MON, 7, 0)).some((i) => i.name === '设计概论');
    const w9 = C.dayItems(seed, at('2026-11-02', 7, 0)).some((i) => i.name === '设计概论');
    assert.strictEqual(w8, true);
    assert.strictEqual(w9, false);
  });
  test('单周课只出现在单周', () => {
    const names = (d) => C.dayItems(seed, at(d, 7, 0)).map((i) => i.name);
    assert.strictEqual(names(FRI_W8).includes('建筑制图'), false);
    assert.strictEqual(names(FRI_W7).includes('建筑制图'), true);
    assert.deepStrictEqual(names(FRI_W7), ['程序设计基础', '体育（羽毛球）', '建筑制图']);
  });
  test('携带物品与地点进入 item', () => {
    const item = C.dayItems(seed, at(MON, 7, 0))[0];
    assert.deepStrictEqual(item.bring, ['教材', '作业本', '计算器']);
    assert.strictEqual(item.room, '南楼 114');
    assert.strictEqual(item.periodLabel, '第1-2节');
  });
  test('学期范围', () => {
    const range = C.semesterRange(seed.meta);
    assert.strictEqual(C.ymd(range.start), '2026-09-07');
    assert.strictEqual(C.diffDays(range.end, range.start), 18 * 7 - 1);
  });
  test('本周统计', () => {
    const stats = C.weekStats(seed, 8);
    assert.strictEqual(stats.count, 12);
    assert.strictEqual(stats.days[6], 0);
    assert.strictEqual(stats.days[1], 3);
  });
  test('今日统计', () => {
    const stats = C.dayStats(seed, at(MON, 7, 0));
    assert.strictEqual(stats.count, 3);
    assert.strictEqual(stats.minutes, 100 + 100 + 100);
    assert.strictEqual(stats.first.name, '高等数学(B)');
    assert.strictEqual(stats.last.name, '设计概论');
  });
});

scenario('五、下一节课与状态', () => {
  test('早上 07:40 下一节是高等数学', () => {
    const next = C.nextItem(seed, at(MON, 7, 40));
    assert.strictEqual(next.state, 'next');
    assert.strictEqual(next.item.name, '高等数学(B)');
  });
  test('08:20 正在上高等数学', () => {
    const next = C.nextItem(seed, at(MON, 8, 20));
    assert.strictEqual(next.state, 'now');
    assert.strictEqual(next.item.name, '高等数学(B)');
    assert.strictEqual(C.currentItem(seed, at(MON, 8, 20)).name, '高等数学(B)');
  });
  test('09:41 下一节是大学物理', () => {
    const next = C.nextItem(seed, at(MON, 9, 41));
    assert.strictEqual(next.item.name, '大学物理');
  });
  test('周日看下一节会跨到周一', () => {
    const next = C.nextItem(seed, at(SUN, 10, 0));
    assert.strictEqual(next.item.name, '高等数学(B)');
    assert.strictEqual(C.ymd(next.item.start), MON);
  });
  test('考完期末（学期结束后）没有下一节课', () => {
    const next = C.nextItem(seed, at('2027-02-01', 10, 0));
    assert.strictEqual(next, null);
  });
  test('空课表不崩溃', () => {
    const empty = C.normalizeData({ courses: [] });
    assert.deepStrictEqual(C.dayItems(empty, at(MON, 8, 0)), []);
    assert.strictEqual(C.nextItem(empty, at(MON, 8, 0)), null);
    assert.strictEqual(C.dayStats(empty, at(MON, 8, 0)).count, 0);
  });
  test('倒计时格式', () => {
    const cd = C.formatCountdown(new Date(Date.UTC(2026, 9, 26, 1, 20)), new Date(Date.UTC(2026, 9, 26, 1, 0)));
    assert.strictEqual(cd.minutes, 20);
    assert.strictEqual(cd.hours, 0);
    assert.ok(cd.text.includes('20'));
    const cd2 = C.formatCountdown(new Date(2026, 9, 26, 9, 40), new Date(2026, 9, 26, 8, 0));
    assert.strictEqual(cd2.hours, 1);
    assert.strictEqual(cd2.minutes, 40);
    assert.ok(cd2.urgent === false);
    const cd3 = C.formatCountdown(new Date(2026, 9, 26, 8, 5), new Date(2026, 9, 26, 8, 0));
    assert.strictEqual(cd3.urgent, true);
  });
});

scenario('六、提醒计划', () => {
  test('早报 / 课前 / 签到 / 晚间四类提醒齐全', () => {
    const list = C.buildReminders(seed, at(MON, 7, 0), at(MON, 12, 0));
    const kinds = new Set(list.map((r) => r.kind));
    assert.ok(kinds.has('digest'), '缺少早报');
    assert.ok(kinds.has('pre'), '缺少课前提醒');
    assert.ok(kinds.has('sign'), '缺少签到提醒');
    // 晚间预告属于同一天的 21:30，超出 12:00 范围，单独检查
    const evening = C.buildReminders(seed, at(MON, 20, 0), at(MON, 23, 0));
    assert.ok(evening.some((r) => r.kind === 'evening'), '缺少晚间预告');
  });
  test('高数的课前 20 分钟与签到 2 分钟时间点正确', () => {
    const list = C.buildReminders(seed, at(MON, 7, 0), at(MON, 9, 0));
    const pre = list.find((r) => r.kind === 'pre' && r.item.name === '高等数学(B)');
    const sign = list.find((r) => r.kind === 'sign' && r.item.name === '高等数学(B)');
    assert.strictEqual(C.ymd(pre.at), MON);
    assert.strictEqual(C.minuteOfDay(pre.at), 7 * 60 + 40);
    assert.strictEqual(C.minuteOfDay(sign.at), 7 * 60 + 58);
    assert.ok(sign.body.includes('签到'));
    assert.ok(pre.body.includes('南楼 114'));
    assert.ok(pre.body.includes('教材'));
  });
  test('没有课的日子不产生早报', () => {
    const list = C.buildReminders(seed, at(SUN, 6, 0), at(SUN, 23, 0));
    assert.strictEqual(list.filter((r) => r.kind === 'digest').length, 0);
  });
  test('提醒按时间排序且 key 唯一', () => {
    const list = C.buildReminders(seed, C.addDays(at(MON, 7, 0), -1), C.addDays(at(MON, 7, 0), 3));
    for (let i = 1; i < list.length; i++) assert.ok(list[i].at >= list[i - 1].at, '提醒没有排序');
    const keys = new Set(list.map((r) => r.key));
    assert.strictEqual(keys.size, list.length, '存在重复的提醒 key');
  });
  test('关闭提醒后不再生成', () => {
    const quiet = C.normalizeData(JSON.parse(JSON.stringify(seed)));
    quiet.settings.preOn = false;
    quiet.settings.signOn = false;
    quiet.settings.digestOn = false;
    quiet.settings.eveningOn = false;
    const list = C.buildReminders(quiet, at(MON, 7, 0), at(MON, 23, 0));
    assert.strictEqual(list.length, 0);
  });
  test('每日早报正文包含时间、地点、携带', () => {
    const list = C.buildReminders(seed, at(MON, 7, 0), at(MON, 8, 0));
    const digest = list.find((r) => r.kind === 'digest');
    assert.ok(digest.body.includes('08:00'));
    assert.ok(digest.body.includes('南楼 114'));
    assert.ok(digest.body.includes('计算器'));
    assert.ok(digest.title.includes('3'));
  });
});

scenario('七、ICS 日历导出', () => {
  const ics = C.buildICS(seed, { now: new Date(2026, 9, 25, 12, 0) });
  test('生成足够多的事件', () => {
    assert.ok(ics.events > 250, '事件数：' + ics.events);
    assert.strictEqual(ics.filename, '课刻课表_20260907.ics');
  });
  test('包含两个 VALARM（课前 20 分钟 + 课前 2 分钟）', () => {
    assert.ok(ics.text.includes('TRIGGER:-PT20M'));
    assert.ok(ics.text.includes('TRIGGER:-PT2M'));
    assert.ok(ics.text.includes('BEGIN:VALARM'));
  });
  test('每行不超过 75 个 UTF-8 字节（RFC 5545 折行）', () => {
    const lines = ics.text.split('\r\n');
    for (const line of lines) {
      const bytes = Buffer.byteLength(line, 'utf8');
      assert.ok(bytes <= 75, '超长行(' + bytes + ')：' + line.slice(0, 40));
    }
  });
  test('事件结构完整：UID/DTSTAMP/DTSTART/DTEND', () => {
    const events = ics.text.split('BEGIN:VEVENT').slice(1);
    assert.ok(events.length >= 250);
    for (const ev of events.slice(0, 30)) {
      assert.ok(/UID:/.test(ev));
      assert.ok(/DTSTAMP:\d{8}T\d{6}Z/.test(ev));
      assert.ok(/DTSTART:\d{8}T\d{4}00/.test(ev));
      assert.ok(/DTEND:\d{8}T\d{4}00/.test(ev));
      assert.ok(ev.includes('END:VEVENT'));
    }
  });
  test('特殊字符被转义', () => {
    assert.strictEqual(C.icsEscape('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  });
  test('签到提醒描述出现在第一个事件的闹钟里', () => {
    assert.ok(ics.text.includes('签到提醒：高等数学(B)'));
  });
  test('空课表也能生成合法日历', () => {
    const empty = C.normalizeData({ courses: [] });
    const out = C.buildICS(empty);
    assert.strictEqual(out.events, 0);
    assert.ok(out.text.includes('BEGIN:VCALENDAR'));
    assert.ok(out.text.trimEnd().endsWith('END:VCALENDAR'));
  });
  test('UID 唯一', () => {
    const uids = [...ics.text.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]);
    assert.strictEqual(new Set(uids).size, uids.length);
  });
});

scenario('八、边界与健壮性', () => {
  test('跨天 / 空聚会不会抛异常', () => {
    assert.deepStrictEqual(C.unionBring([]), []);
    assert.deepStrictEqual(C.unionBring([{ bring: ['a'] }, { bring: ['a', 'b'] }]), ['a', 'b']);
  });
  test('颜色名兜底', () => {
    assert.strictEqual(C.normalizeColor('not-a-color'), 'tomato');
    assert.strictEqual(C.normalizeColor('teal'), 'teal');
  });
  test('学期开始日期非法时回落到本周一', () => {
    const d = C.normalizeData({ meta: { semesterStart: 'not-a-date' } });
    const back = C.parseYmd(d.meta.semesterStart);
    assert.ok(back);
    assert.strictEqual(C.weekdayOf(back), 1);
  });
  test('课程时间冲突时不崩溃', () => {
    const conflict = C.normalizeData({
      courses: [
        { name: 'A', sessions: [{ day: 1, start: 1, end: 2 }] },
        { name: 'B', sessions: [{ day: 1, start: 2, end: 3 }] }
      ]
    });
    const items = C.dayItems(conflict, at(MON, 7, 0));
    assert.strictEqual(items.length, 2);
  });
  test('深拷贝：normalizeData 不修改入参', () => {
    const raw = JSON.parse(JSON.stringify(global.ClassTickSeed));
    const before = JSON.stringify(raw);
    C.normalizeData(raw);
    assert.strictEqual(JSON.stringify(raw), before);
  });
});


scenario('九、日程与行囊（v1.4）', () => {
  test('任务规范化与排序', () => {
    const tasks = C.normalizeTasks([
      { title: ' 报告 ', due: '2026-10-26', time: '23:59', type: 'homework', remindMin: 60, priority: 1 },
      { title: '考试', due: '2026-10-24', type: 'exam', priority: 9 },
      { title: '', due: '2026-10-26' },
      { title: '坏日期', due: 'not-a-date' }
    ]);
    assert.strictEqual(tasks.length, 2);
    assert.strictEqual(tasks[0].title, '考试');
    assert.strictEqual(tasks[0].type, 'exam');
    assert.strictEqual(tasks[0].priority, 3);
    assert.strictEqual(tasks[1].title, '报告');
    assert.strictEqual(tasks[1].remindMin, 60);
  });
  test('行囊勾选数据规范化', () => {
    const packed = C.normalizePacked({
      '2026-10-26': { '教材': true, '': true },
      'bad-day': { 'x': true }
    });
    assert.deepStrictEqual(Object.keys(packed), ['2026-10-26']);
    assert.deepStrictEqual(Object.keys(packed['2026-10-26']), ['教材']);
  });
  test('任务提醒：截止前 N 分钟', () => {
    const data = C.normalizeData(JSON.parse(JSON.stringify(seed)));
    data.tasks = C.normalizeTasks([{ title: '报告', due: MON, time: '23:59', remindMin: 60 }]);
    const list = C.buildTaskReminders(data, at(MON, 0, 0), at(MON, 23, 59));
    const hit = list.filter((r) => r.kind === 'task' && r.task.title === '报告')[0];
    assert.ok(hit, '应生成截止提醒');
    assert.strictEqual(hit.at.getHours(), 22);
    assert.strictEqual(hit.at.getMinutes(), 59);
  });
  test('任务提醒：前一日暮色预告', () => {
    const data = C.normalizeData(JSON.parse(JSON.stringify(seed)));
    data.tasks = C.normalizeTasks([{ title: '报告', due: MON, time: '23:59' }]);
    data.settings.taskEveningOn = true;
    data.settings.taskEveningTime = '20:30';
    const list = C.buildTaskReminders(data, at(SUN, 0, 0), at(MON, 0, 0));
    const eve = list.filter((r) => r.kind === 'task-eve')[0];
    assert.ok(eve, '应生成前晚预告');
    assert.strictEqual(eve.at.getHours(), 20);
    assert.strictEqual(eve.at.getMinutes(), 30);
  });
  test('早报正文包含当日 DDL', () => {
    const data = C.normalizeData(JSON.parse(JSON.stringify(seed)));
    data.tasks = C.normalizeTasks([{ title: '物理实验报告', due: MON, time: '23:59' }]);
    const list = C.buildReminders(data, at(MON, 0, 0), at(MON, 23, 59));
    const digest = list.filter((r) => r.kind === 'digest')[0];
    assert.ok(digest);
    assert.ok(digest.body.includes('物理实验报告'));
    assert.ok(digest.body.includes('DDL'));
  });
  test('任务写入 .ics 且带闹钟', () => {
    const data = C.normalizeData(JSON.parse(JSON.stringify(seed)));
    data.tasks = C.normalizeTasks([{ title: '实验报告', due: MON, time: '23:59', type: 'homework', remindMin: 30 }]);
    const out = C.buildICS(data);
    assert.ok(out.text.includes('SUMMARY:作业：实验报告'));
    assert.ok(/BEGIN:VALARM[\s\S]*TRIGGER:-PT30M[\s\S]*END:VALARM/.test(out.text));
    assert.ok(out.text.includes('UID:task-'));
  });
  test('已完成任务不产生提醒', () => {
    const data = C.normalizeData(JSON.parse(JSON.stringify(seed)));
    data.tasks = C.normalizeTasks([{ title: '完成项', due: MON, done: true }]);
    assert.strictEqual(C.buildTaskReminders(data, at(MON, 0, 0), at(MON, 23, 59)).length, 0);
  });
});

console.log('\n────────────────────────────────');
console.log('通过 ' + passed + ' 项，失败 ' + failures.length + ' 项');
if (failures.length) {
  failures.forEach((f) => console.log('  ✗ ' + f.name + '：' + f.message));
  process.exit(1);
}
console.log('全部通过 ✓');

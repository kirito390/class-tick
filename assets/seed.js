/*!
 * 课刻 ClassTick · 示例课表（同济大学 2026 秋季，可直接改成自己的）
 * 仅作演示：所有课程 / 地点 / 老师均为示例数据
 */
(function (root) {
  'use strict';

  function session(day, start, end, weeks, room, bring) {
    return { day: day, start: start, end: end, weeks: weeks || '', room: room || '', bring: bring || [] };
  }

  root.ClassTickSeed = {
    version: 1,
    meta: {
      name: '2026 秋 · 我的课表',
      school: '同济大学',
      semesterStart: '2026-09-07',
      weeks: 18
    },
    settings: {
      theme: 'auto',
      digestOn: true,
      digestTime: '07:20',
      preOn: true,
      preMin: 20,
      signOn: true,
      signMin: 2,
      eveningOn: true,
      eveningTime: '21:30',
      signInUrl: ''
    },
    courses: [
      {
        id: 'c-gaoshu', name: '高等数学(B)', teacher: '王老师', color: 'tomato',
        sessions: [
          session(1, 1, 2, '1-16', '南楼 114', ['教材', '作业本', '计算器']),
          session(3, 3, 4, '1-16', '南楼 114', ['教材', '作业本'])
        ]
      },
      {
        id: 'c-wuli', name: '大学物理', teacher: '李老师', color: 'teal',
        sessions: [
          session(1, 3, 4, '1-16', '北楼 302', ['教材', '实验报告', '计算器']),
          session(4, 1, 2, '1-16', '北楼 302', ['教材', '作业本'])
        ]
      },
      {
        id: 'c-chengxu', name: '程序设计基础', teacher: '张老师', color: 'sky',
        sessions: [
          session(2, 3, 4, '1-16', '综合楼 1002', ['笔记本电脑', '充电器']),
          session(5, 1, 2, '2-16', '机房 B204', ['校园卡', 'U 盘'])
        ]
      },
      {
        id: 'c-english', name: '大学英语', teacher: '陈老师', color: 'amber',
        sessions: [
          session(2, 1, 2, '1-16', '同文楼 210', ['教材', '耳机', '笔记本']),
          session(4, 5, 6, '1-16', '同文楼 210', ['教材', '耳机'])
        ]
      },
      {
        id: 'c-xiandai', name: '线性代数', teacher: '刘老师', color: 'violet',
        sessions: [
          session(3, 1, 2, '1-16', '南楼 208', ['教材', '作业本'])
        ]
      },
      {
        id: 'c-tiyu', name: '体育（羽毛球）', teacher: '赵老师', color: 'olive',
        sessions: [
          session(5, 3, 4, '1-16', '一二九体育场', ['球拍', '运动鞋', '水杯'])
        ]
      },
      {
        id: 'c-sizheng', name: '思想道德与法治', teacher: '孙老师', color: 'rose',
        sessions: [
          session(4, 3, 4, '1-16', '综合楼 305', ['教材'])
        ]
      },
      {
        id: 'c-zhitu', name: '建筑制图', teacher: '周老师', color: 'sand',
        sessions: [
          session(5, 5, 6, '1-16单', '建筑学院 A 楼 201', ['画板', 'A2 图纸', '绘图工具'])
        ]
      },
      {
        id: 'c-sheji', name: '设计概论', teacher: '陈老师', color: 'ink',
        sessions: [
          session(1, 9, 10, '2-16双', '综合楼报告厅', ['笔记本', '校园卡'])
        ]
      }
    ],
    packed: {},
    tasks: [
      { id: 't-gaoshu', title: '高数第二章习题', type: 'homework', courseName: '高等数学(B)', due: '2026-10-27', time: '23:59', note: '习题 2.1–2.3，拍照上传学习通', priority: 2, remindMin: 120 },
      { id: 't-wuli', title: '大学物理实验报告', type: 'homework', courseName: '大学物理', due: '2026-10-29', time: '20:00', note: '完成示波器实验的数据处理与误差分析', priority: 1, remindMin: 1440 },
      { id: 't-sheji', title: '设计概论小组展示', type: 'event', courseName: '设计概论', due: '2026-11-02', time: '10:00', note: '准备 5 分钟汇报与 3 页幻灯片', priority: 2, remindMin: 60 },
      { id: 't-cihui', title: '四级单词打卡', type: 'todo', due: '2026-10-26', time: '22:00', note: 'List 12–13', priority: 3, remindMin: 30 }
    ],
    checkins: {}
  };
})(typeof self !== 'undefined' ? self : this);

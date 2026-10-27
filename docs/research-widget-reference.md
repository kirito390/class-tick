# 课刻 ClassTick · 竞品与提醒能力调研（前期参考）

> 调研日期：2026-10-25　｜　范围：同类产品横评、PWA 可安装性、Web 提醒能力边界、`.ics` + `VALARM` 兜底方案、产品设计建议
> 结论先行：**纯前端（无服务器）能做出可安装的 PWA，但无法做出「关掉应用也会响」的可靠提醒，也无法进入 Android/iOS/Windows 三端的系统小组件位。**
> 因此产品定位应是「打开即见 + 可导出到系统日历」，把「准时响铃」这个承诺显式交给 `.ics` + `VALARM`。

---

## 0. 一页结论

| 问题 | 结论 | 依据 |
|---|---|---|
| 能不能做成可安装 PWA | 能。HTTPS + manifest（name/short_name、start_url、display、192/512 图标）即可；**当前 Chrome 判定条件里已不包含 service worker** | [web.dev 安装条件](https://web.dev/articles/install-criteria) |
| 关掉应用后还会不会提醒 | **不会**。没有 JS 在跑就没有定时器；Web Push 是唯一能在关闭状态下唤醒的能力，但它必须有服务端 | [MDN setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)、[MDN PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe) |
| 能不能用 Notification Triggers 定时 | **不能作为方案**。Chrome 已明确「开发终止」，仅实验 flag / origin trial，从未正式发布 | [Chrome 文档](https://developer.chrome.com/docs/web-platform/notification-triggers) |
| iOS 上能不能推 | 只有「已添加到主屏」的 Web App 能申请，且权限弹窗必须由用户手势触发，走 APNs | [WebKit 博客](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |
| 最可靠的跨设备提醒 | **导出 `.ics` → 导入系统日历 → `VALARM` 由系统日历触发**，离线、免服务端、三端一致 | [RFC 5545 §3.6.6](https://icalendar.org/iCalendar-RFC-5545/3-6-6-alarm-component.html)、[§3.8.6.3](https://icalendar.org/iCalendar-RFC-5545/3-8-6-3-trigger.html) |
| 能不能上系统桌面小组件 | **纯 Web 不行**。Android AppWidget、iOS WidgetKit、Windows Widgets Board 都要求原生/打包载体 | [Android](https://developer.android.com/develop/ui/views/appwidgets/overview)、[Apple](https://developer.apple.com/documentation/widgetkit)、[Windows](https://learn.microsoft.com/en-us/windows/apps/develop/widgets/web-widget-providers) |

---

## 1. 同类产品横评

### 1.1 横评表

| 产品 | 今日/周课表布局 | 上课提醒机制 | 课前签到/打卡 | 携带物品备注 | 桌面小组件形态 |
|---|---|---|---|---|---|
| **超级课程表**（App Store 2013 上架，国内最主流） | 日课表 / 周课表**可自由切换**；周视图按节次网格 | 课程提醒（App 内设定，本地通知）；另有「考试计划提醒」自动同步官网考试时间 | 弱：以「查课表」为主，签到非核心卖点（同类国内产品常以「空教室/成绩查询」为附加功能） | 备注字段存在，但不是产品主叙事 | **桌面小组件**，主打「一眼看今天/本周」，免打开 App |
| **WakeUp 课程表**（极简、轻量，主打早八） | 以周课表为主，支持多尺寸小组件展示「今日课程 / 下节课在哪 / 还有多久上课」 | **上课前自动提醒，提前时间可自由设置**（本地通知） | 无明确签到功能，卖点是「告别迟到与翘课」 | 无独立「携带物品」体系，靠课程备注 | **多尺寸动态桌面小组件 + 锁屏小组件**；另有日程管理模块 |
| **课程格子 / ClassUp**（Plokia 系，国际版 ClassUp） | 周课表 + 支持 **Week A/B（单双周）与 biweekly 课程**；单门课最多 10 个时间段 | 依赖系统本地通知；产品重心在「课表 + 笔记 + 任务」 | 无 | 用「@课程名」把笔记/待办挂到课程下（间接承担了备注职责） | **Widget：今日 / 本周 / 笔记**快速查看 |
| **系统自带日历**（iOS 日历 / Google 日历） | 日/周/月视图，非「课表格」，但可承载课程事件 | **最可靠**：系统级闹钟式提醒，可设多个提醒（如提前 1 小时 + 提前 10 分钟），可延后（snooze）；Google 日历桌面通知需浏览器保持打开并授权 | 无（需外部工具） | 事件「备注/描述」字段承载，可进通知正文 | 原生小组件（iOS 日历小组件、Android 日历小组件），系统级稳定 |
| **1timetable.app**（Web/PWA 优先的课表服务） | 日 × 节次网格，Mon–Fri / Mon–Sat / 自定义工作日 | 依赖原生外壳（其小组件为 App 提供），网页端本身不做定时提醒 | 无 | 每个格子上色 + 单元格级覆写 | 宣称 **Home & Lock Screen 小组件（Today / Full Grid / Multi-Summary / Live Activity + 灵动岛）**；网页端可免安装订阅（6 位分享码） |
| **Weeklie**（weeklytimetable.app，轻量原生） | 按 1–4 周循环填写，自动判断当前周 | 课前 + 截止前提醒（**一次性内购解锁**） | 无 | 教室/教师/类型/起止时间结构化字段 | iOS/Android 主屏今日课程 + Apple Watch + Siri |

> 说明：上表产品能力取自各自商店页/官网的公开描述（见第 5 节链接），属于厂商自述，未逐项实机验证。
>
> **存疑项（需复核）**：ClassUp（课程格子系）的 App Store 与 Google Play 页面在 2026-10-25 复查时**均返回 404**，疑已下架或更名；该行描述来自搜索引擎收录的商店文案快照，引用前请二次确认，因此第 5 节未给出其链接。

### 1.2 从横评里读出的四条共性

1. **「今日」是绝对主角。** 六款产品全部把「今天有什么课 / 下一节在哪 / 还有多久」作为小组件第一信息，周课表退居第二屏。这验证了课刻应把「今日」做成默认首页而不是周网格。
2. **课表类厂商的提醒几乎都是「本地通知 + 用户自选提前量」，没有一家为「叫醒」自建推送。** 提前量的常见档位是 5/10/15/20/30 分钟；「课前 20 分钟」是事实标准。唯一的「服务端」痕迹在别处：1timetable 的小组件靠服务端同步更新，系统日历靠各自的云（iCloud / Google）同步事件——**但触发提醒的仍是设备本地，不是推送**。
3. **签到/打卡在头部产品里是空白或弱功能。** WakeUp 用「防翘课」话术、ClassUp 完全没有——这是课刻可以切进去的差异点，但要清楚：**纯前端做不了「到点强制弹签到」**，只能做「课前 2 分钟的提醒 + 一键标记」。
4. **「携带物品」几乎没人做成结构化字段。** 大家要么塞课程备注，要么塞事件描述。课刻把它做成可复用的「课程装备清单」，并写进 `.ics` 的 `DESCRIPTION`，是低成本、高感知的差异化。

---

## 2. 平台与通知能力对照

### 2.1 可安装 PWA 的判定条件（以 Chrome 为准）

Chrome 触发 `beforeinstallprompt` 与浏览器内置安装入口的条件（[web.dev《What does it take to be installable?》，2024-09-19 更新](https://web.dev/articles/install-criteria)）：

| 条件 | 具体要求 |
|---|---|
| 未被安装过 | 该站点尚未安装 |
| 用户参与度启发式 | 用户**至少点击/触摸过页面一次**（跨会话累计即可）；**累计浏览时长 ≥ 30 秒** |
| 安全上下文 | **HTTPS**（`localhost` / `127.0.0.1` 开发环境例外） |
| Web App Manifest | 至少含 `short_name` 或 `name`；`icons` 含 **192px 与 512px**；`start_url`；`display` ∈ `fullscreen` / `standalone` / `minimal-ui` / `window-controls-overlay`；`prefer_related_applications` 不存在或为 `false` |
| Service Worker | **不在上述清单内**。历史上曾是硬性门槛，现行 Chromium 已不作为 `beforeinstallprompt` 的硬条件（离线、缓存、推送等能力仍需要它） |

补充事实：

- 满足条件**不等于**一定弹安装条——Chrome 还有自己的克制策略；反过来，**不满足条件用户也可能手动安装**（菜单里仍有安装项）。
- 最小可用 manifest：

```json
{
  "name": "课刻 ClassTick",
  "short_name": "课刻",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b6ef6",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
```

- **iOS 没有 `beforeinstallprompt`，也没有安装按钮。** 用户必须走「分享 → 添加到主屏幕」。iOS/iPadOS 16.4–18 上，`display` 必须是 `standalone` 或 `fullscreen`，否则只会存成书签、拿不到 Web Push（[WebKit 博客](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)）。因此课刻必须自己画一张「添加到主屏」的引导图，这是 iOS 上唯一入口。

### 2.2 通知能力边界对照

| 机制 | 触发前提 | 应用/标签页关闭时还能响吗 | 需要服务端 | 关键限制（官方口径） |
|---|---|---|---|---|
| 页面内 `setTimeout` / `setInterval` | 页面处于打开状态 | ❌ 不可能——JS 已停止 | 否 | Chrome 分级限流：可见时几乎准时；**隐藏但 <5 分钟或嵌套 <5 层 → 约 1 秒/次**；**隐藏 >5 分钟 + 静默 >30 秒 + 嵌套 ≥5 层 + 无 WebRTC → 约 1 分钟/次**（Chrome 88 起）。Firefox 桌面隐藏标签 1 秒；**Firefox Android 隐藏标签 15 分钟并可能直接卸载页面** |
| Web Notifications（`new Notification()`） | 页面打开 + 已授权 | ❌ | 否 | **在多数移动浏览器上构造器直接抛 `TypeError`**，官方建议改用 Service Worker 的 `showNotification()`；权限必须由用户手势发起；Chrome/Firefox 要求安全上下文；跨域 iframe 不允许申请 |
| `ServiceWorkerRegistration.showNotification()`（本地调用） | 需要有代码在跑（页面、或推送事件） | ❌ 没有唤醒源就不会执行 | 否 | SW 空闲即被终止；「到点自己醒来」这件事 Web 平台并不提供 |
| **Notification Triggers**（`showTrigger` + `TimestampTrigger`） | 实验特性 | 设计上可以，但**不可用** | 否 | **Chrome 已宣布开发终止**（「无法在各平台提供一致可靠的体验」），从未正式发布；仅 `#enable-experimental-web-platform-features` flag 或过期 origin trial 可试；且桌面端还要求 Chrome 正在运行 |
| **Web Push** | 已订阅 + 服务端发消息 | ✅ 唯一可行 | **✅ 必须** | `userVisibleOnly: true` 在 Chrome/Edge 是强制的，不设就 reject；`applicationServerKey` 用 VAPID 公钥，私钥在服务端；iOS 16.4+ **仅限已加入主屏的 Web App**，权限弹窗必须来自用户点击 |
| **`.ics` + `VALARM`** | 用户导入系统日历 | ✅ | ❌ | 依赖用户完成一次导入；此后由系统日历（含锁屏、勿扰、专注模式、Apple Watch）负责触发 |

### 2.3 结论：纯前端到底能覆盖到哪一步

以「没有服务器、没有原生壳」为前提，能力边界如下：

| 场景 | 纯前端能否做到 | 说明 |
|---|---|---|
| 打开课刻时看到今日课表、倒计时 | ✅ 完全可做 | 这是主战场 |
| 课刻窗口开着（前台或后台标签页）时，到点弹系统通知 | ⚠️ 尽力而为 | 桌面前台基本准时；后台标签页最坏被压到 1 分钟一次精度；移动端切后台/锁屏后基本失效（Firefox Android 可达 15 分钟） |
| 关掉课刻（或手机锁屏放着）后仍然准时响 | ❌ | 没有 JS 在跑；唯一出路是 Web Push（需要服务端）或交给系统日历 |
| iOS 上不加入主屏就收到推送 | ❌ | WebKit 明确规定只有主屏 Web App 可订阅 |
| 上系统桌面小组件 | ❌ | 三端都要求原生/打包载体（见 2.4） |

所以「提醒」这件事在纯前端下只能拆成两层：
**A 层（可承诺）**：`.ics` 导出 → 系统日历 → 准点响，跨设备一致。
**B 层（尽力而为）**：应用开着时的页面内提醒 + Web Notification，作为「人在电脑前」的即时补充。
把 A 层写成产品主路径、B 层写成增强，用户预期才不会崩。

### 2.4 系统桌面小组件的真实门槛

| 平台 | 载体要求 | 形态与技术 | 纯 Web 能否直接进入 |
|---|---|---|---|
| **Android AppWidget** | 需安装原生 APK，声明 `AppWidgetProvider` + `appwidget-provider` XML + RemoteViews 布局 | 桌面/启动器上的「信息型 / 集合型 / 控制型 / 混合型」组件；手势仅支持触摸与纵向滑动；`updatePeriodMillis` **不支持小于 30 分钟**（写 0 可关闭周期更新，改用 `WorkManager`/`AlarmManager`）；`BroadcastReceiver` 超 10 秒会被判无响应 | ❌（PWA 无法注册 AppWidget） |
| **iOS WidgetKit** | 需 App + Widget Extension（SwiftUI） | 主屏 / 今日视图 / 锁屏小组件，Mac 桌面、Watch Smart Stack；内容靠 **timeline（时间线）** 批量预排，系统按能耗策略刷新，也可用 APNs 推送刷新；Live Activities 走 ActivityKit | ❌ |
| **Windows 11 Widgets Board** | 需**打包的** widget provider 应用（Windows App SDK，MSIX） | 向 Widgets Board 推 Adaptive Cards JSON（`WidgetManager.UpdateWidget`）；**Web widget provider** 允许只给一个 `metadata.webUrl`，由系统在 WebView2 里渲染远程 HTML——但**仍然必须先有打包的 provider 应用**；且「feed provider」形态目前仅限 EEA 地区 | ❌（但 Web widget provider 是未来最接近的路径：只需要一个极薄的 MSIX 外壳 + 课刻网页） |
| **PWA 侧的现实替代** | 无需打包 | 安装后的独立窗口、任务栏/程序坞固定、`display: standalone` 全屏无地址栏；Android 可加桌面快捷方式 | ✅ 但**不是小组件**，是「一个常驻窗口」 |

> 对课刻的含义：第一阶段不要承诺「桌面小组件」，承诺「安装后像 App 一样常驻，一打开就是今天」。若后续要做真小组件，Windows 的 web widget provider 是投入产出比最高的一个（薄壳 + 复用现有网页），Android/iOS 则必须重写原生 UI。

### 2.5 为什么 `.ics` + `VALARM` 是最可靠的兜底

三条硬理由：

1. **它把定时责任转移给了操作系统。** 系统日历是闹钟级权限，锁屏、勿扰例外名单、Apple Watch 转发都由系统负责，与浏览器是否在跑、标签页是否被限流无关。
2. **零基础设施。** 纯前端就能生成文件（`Blob` + `URL.createObjectURL` + `<a download>`），不需要域名、不需要 VAPID 密钥、不需要推送服务，也不涉及隐私数据上传。
3. **跨端一致。** iOS 日历、Google 日历、Outlook、macOS 日历、国产 ROM 日历都实现了 RFC 5545 的 `VALARM`，语义相同。

#### VALARM 的结构（RFC 5545 §3.6.6）

- `VALARM` **必须**包含 `ACTION` 与 `TRIGGER`；只能出现在 `VEVENT` 或 `VTODO` 内，不能嵌套。
- 同一个事件**可以挂多个互相独立的 `VALARM`**——这正是「课前 20 分钟」+「课前 2 分钟签到」两条提醒的实现方式，不需要拆成两个事件。
- `ACTION:DISPLAY` 时**必须**同时有 `DESCRIPTION`（即通知正文，正好用来放「带什么」）。
- 需要重复提醒时，`DURATION` 与 `REPEAT` **必须同时出现**（只出现一个则不会重复）；`REPEAT` 是「首次之外的额外次数」。

#### TRIGGER 语法（RFC 5545 §3.8.6.3）

```
trigger = "TRIGGER" (trigrel / trigabs) CRLF

trigrel = *(
   ; OPTIONAL, 最多一次
   (";" "VALUE" "=" "DURATION") / (";" trigrelparam)
   ; OPTIONAL, 可多次
   (";" other-param)
 ) ":" dur-value

trigabs = *(
   ; REQUIRED, 最多一次
   (";" "VALUE" "=" "DATE-TIME")
   ; OPTIONAL, 可多次
   (";" other-param)
 ) ":" date-time
```

要点：

- **默认值类型是 `DURATION`，默认相对 `DTSTART`**（事件开始）。
- 用 `RELATED=END` 改为相对 `DTEND`；`RELATED=START` 是默认值。**`RELATED` 只在 `DURATION` 类型下合法**。
- **负值 = 提前，正值 = 延后。** 所以「课前 20 分钟」就是 `TRIGGER:-PT20M`。
- 绝对值写法必须 **UTC（结尾 `Z`）**：`TRIGGER;VALUE=DATE-TIME:20261026T000000Z`；绝对值 + 重复事件时，只在该绝对时刻触发。
- 相对 `START` 时 `DTSTART` 必须存在；相对 `END` 时必须有 `DTEND`（或 `DTSTART` + `DURATION`）。
- 官方三个示例：`TRIGGER:-PT15M`、`TRIGGER;RELATED=END:PT5M`、`TRIGGER;VALUE=DATE-TIME:19980101T050000Z`。

`dur-value` 的记忆法：`[-]P[nW | nD][T[nH][nM][nS]]` → `-PT20M`、`-PT2M`、`-P1D`、`-PT1H30M`。

#### 可直接照抄的事件样例（单条课程 + 双提醒）

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ClassTick//课刻 ClassTick//ZH-CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-TIMEZONE:Asia/Shanghai
BEGIN:VTIMEZONE
TZID:Asia/Shanghai
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0800
TZOFFSETTO:+0800
TZNAME:CST
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:classtick-20261026-3-4-gaoshu@classtick.app
DTSTAMP:20261025T120000Z
DTSTART;TZID=Asia/Shanghai:20261026T080000
DTEND;TZID=Asia/Shanghai:20261026T094000
SUMMARY:高等数学 A（第3-4节）
LOCATION:四教 302
DESCRIPTION:教师：王老师\n携带：教材、习题册、计算器、学生卡
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT20M
ACTION:DISPLAY
DESCRIPTION:20 分钟后上课：高等数学 A｜四教 302｜带教材、习题册、计算器
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2M
ACTION:DISPLAY
DESCRIPTION:该进教室并签到了：高等数学 A｜四教 302
END:VALARM
END:VEVENT
END:VCALENDAR
```

工程细节（都来自 RFC，别省）：

- **换行必须是 CRLF**；单行不超过 **75 字节**，超出用「CRLF + 一个空格」折行（UTF-8 中文按字节算，很容易超）。
- 文本里的 `\`、`;`、`,`、换行分别转义为 `\\`、`\;`、`\,`、`\n`。
- `DTSTAMP` 用 UTC（`Z`）；`DTSTART`/`DTEND` 建议带 `TZID` 并配 `VTIMEZONE`，这样跨时区/夏令时不会跑偏。
- `UID` 必须稳定且全局唯一——**同一个课程每次导出保持同一个 UID**，用户重新导入时才会「更新」而不是「复制一份」。
- 单双周：`RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;COUNT=8`（锚定 `DTSTART` 所在周为单/双周）。
- 停课/调休：`EXDATE;TZID=Asia/Shanghai:20261102T080000`。
- **但更稳的做法是「展开成具体日期」**：调休、补课、临时换教室会让 `RRULE` 变成谎言，而一条条独立 `VEVENT`（各自带 `UID`）在任何日历里都不会算错。代价只是文件大一点。

---

## 3. 可安装与提醒的实现路径

### 路径 A（一期必做）：可安装 + 打开即用 + `.ics` 兜底

1. `manifest.webmanifest` 按 2.1 最小集配置；用 `standalone`（同时兼容 iOS 16.4–18 的 Web App 判定）。
2. 注册一个最小 Service Worker：只为离线打开（cache-first 的 app shell）。**它不是为了可安装，也不是为了提醒**，别把提醒逻辑放进去。
3. 首屏 = 「今日」；第二个 Tab = 「本周」；第三个 = 「设置 / 导出」。
4. 「添加到主屏」引导：Chromium 用 `beforeinstallprompt` 存下事件、在设置页给一个「安装」按钮；iOS 用图文说明「分享 → 添加到主屏幕」。**不要在页面加载时就 `prompt()`**，会白白消耗一次机会。
5. 「同步到系统日历」按钮：前端生成 `.ics`（建议一次导出整学期），下载后引导用户用系统日历打开/导入；文案写清「导入后即使不打开课刻也会提醒」。

### 路径 B（二期，可选增强）：应用开着时的通知

1. 权限申请放在设置页一个明确的按钮里（必须是用户手势），并解释用途；被拒后不要反复骚扰。
2. 提醒调度用「**单个长定时器 + 到点重算**」，不要塞一堆 `setTimeout`：每次只 `setTimeout` 到「下一个提醒点」，触发后重新计算下一个。这样即使被限流延迟，也不会漏掉或错乱。
3. 每次页面重新可见（`visibilitychange` → `visible`）时**立刻校正**：把错过的提醒合并成一条「你错过了 N 条」，不要逐条补弹。
4. 移动端优先用 `registration.showNotification()` 而不是 `new Notification()`（后者在多数移动浏览器抛 `TypeError`）。
5. 桌面端可考虑 `navigator.wakeLock`（仅前台有效）——不要指望它解决后台问题。

### 路径 C（远期，需要服务端）：Web Push

只有走到这一步，才能承诺「关掉也能响」：

1. 服务端持有 **VAPID 私钥**，前端用公钥 `subscribe({ userVisibleOnly: true, applicationServerKey })`。
2. 服务端按 `endpoint` + `p256dh` + `auth` 加密并 POST 到推送服务；iOS 的 endpoint 在 `*.push.apple.com`（需在网络策略里放行）。
3. iOS 前提：用户已「添加到主屏」并从图标打开、且点击了订阅按钮。
4. 这是唯一需要后端、域名、密钥托管、订阅清理的路径；也是唯一能替代 `.ics` 的路径。一期不要做。

### 建议的取舍

| 承诺 | 一期 | 二期 | 三期 |
|---|---|---|---|
| 看课表 | ✅ | | |
| 可安装、离线 | ✅ | | |
| 准点提醒（关掉也响） | ✅ 用 `.ics` 交给系统日历 | | |
| 应用开着时的即时提醒 | | ✅ Web Notification | |
| 推送 | | | ✅ Web Push（需服务端） |
| 系统小组件 | | | Windows web widget（薄壳）/ 原生 |

---

## 4. 对课刻 ClassTick 的设计建议

### 建议 1：把「今日」做成唯一主角，早报是它的第一屏

竞品无一例外把「今天 / 下一节 / 还有多久」放在小组件首位（超级课程表、WakeUp、ClassUp、1timetable 都是）。课刻的「早报」不要做成需要点开的二级页，而应是**打开即见的一段话**：今天几节课、第一节几点在哪、要带什么、天气/带伞提示。

在无服务端前提下，「早报推送」只能有两种落地：①打开应用时呈现；②在 `.ics` 里放一条 **早上 07:30 的 `VEVENT`**（`SUMMARY:今天有 3 节课，8:00 高数 @四教302`，`VALARM` 设 `TRIGGER:PT0M`），由系统日历在固定时间弹出来。后者是纯前端唯一能「主动叫醒」的早报。

### 建议 2：默认「课前 20 分钟」为主提醒，且写成两条 VALARM 而不是一条

20 分钟是竞品事实标准（WakeUp 让用户自选提前量，头部产品档位集中在 5/10/15/20/30）。课刻应把它设为默认值并允许 5–60 分钟调节。落地时**一条 `VEVENT` 挂两个 `VALARM`**：`-PT20M`（「该出门了，带 X/Y/Z」）与 `-PT2M`（「该进教室签到了」）。RFC 明确允许多个独立 `VALARM`，这样用户在系统日历里看到的是同一节课的两条提醒，管理成本最低。

### 建议 3：签到做「2 分钟提醒 + 一键标记」，不要假装能强制打卡

纯前端无法验证用户是否真的在教室（定位、扫码都需要服务端或原生权限），所以别做「签到时窗 + 位置校验」这种承诺不了的机制。可行设计：课前 2 分钟提醒里带一个深链回课刻的「已到教室」按钮，本地记录出勤率，标注为「自我记录」。差异化在于**零摩擦**（一次点击）和**可见的连续出勤统计**，而不是真实性校验。

### 建议 4：「携带物品」做成课程级可复用清单，并写进 `DESCRIPTION`

竞品这块最弱（要么塞备注、要么没有）。建议：每门课维护一个装备清单（教材/习题册/计算器/学生卡/实验服），支持「每次都要」与「仅实验课」两类；生成 `.ics` 时拼进 `VALARM` 的 `DESCRIPTION`（受 75 字节折行约束，**提醒文案要短**，长清单放事件 `DESCRIPTION`）。这样即使用户只在系统日历里看，也能一眼知道带什么。

### 建议 5：单双周用「展开成具体日期」，调休/停课用「显式排除 + 手动调整」

单双周不要只依赖 `RRULE:INTERVAL=2`——一旦遇上调休补课、临时停课、换教室，递归规则就会持续生成错误事件，而用户很难在系统日历里逐条修正。更稳的策略：**导出时把整学期展开成一条条带日期和独立 `UID` 的 `VEVENT`**，`RRULE` 只作为「用户明确要求紧凑格式」时的可选项；停课用 `EXDATE` 或干脆不生成那天；调休/补课作为一次性事件追加。UI 上要有「本周是第几周 / 单周还是双周」的显式状态，这是国内高校课表最容易出错的地方，也是最容易赢得信任的地方。

> 额外一条产品层面的提醒：**把「提醒不准」这件事前置说明。** 设置页用一句人话写清「浏览器无法在应用关闭后叫醒你，请点这里同步到系统日历」。这比事后解释「为什么没响」便宜得多，也是竞品普遍回避、但用户真实痛点的地方。

---

## 5. 参考链接

**平台与规范（官方文档）**

1. web.dev — *What does it take to be installable?*（PWA 安装条件，2024-09-19 更新）<https://web.dev/articles/install-criteria>
2. Chrome for Developers — *Notification Triggers API*（含「开发已终止」声明）<https://developer.chrome.com/docs/web-platform/notification-triggers>
3. MDN — *Window: setTimeout()*（后台标签页限流分级，Chrome 88 intensive throttling）<https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout>
4. MDN — *Using the Notifications API*（用户手势、移动端构造器抛 `TypeError`、`showNotification()`）<https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API>
5. MDN — *PushManager: subscribe()*（`userVisibleOnly`、VAPID `applicationServerKey`）<https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe>
6. WebKit Blog — *Web Push for Web Apps on iOS and iPadOS*（16.4 起，仅主屏 Web App、用户手势、APNs）<https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>
7. RFC 5545 §3.6.6 — *Alarm Component (VALARM)*<https://icalendar.org/iCalendar-RFC-5545/3-6-6-alarm-component.html>
8. RFC 5545 §3.8.6.3 — *Trigger*<https://icalendar.org/iCalendar-RFC-5545/3-8-6-3-trigger.html>
9. RFC 5545 原文（IETF Datatracker）<https://datatracker.ietf.org/doc/html/rfc5545>
10. Android Developers — *App widgets overview*<https://developer.android.com/develop/ui/views/appwidgets/overview>
11. Android Developers — *Create an advanced widget*（`updatePeriodMillis` 不低于 30 分钟）<https://developer.android.com/develop/ui/views/appwidgets/advanced>
12. Apple Developer — *WidgetKit*<https://developer.apple.com/documentation/widgetkit>
13. Microsoft Learn — *Web widget providers*（Windows 11 Widgets Board，`metadata.webUrl`）<https://learn.microsoft.com/en-us/windows/apps/develop/widgets/web-widget-providers>

**系统日历（提醒兜底的落地对象）**

14. Apple 支持 — *在 iPhone 上为日历事件添加提醒*<https://support.apple.com/guide/iphone/create-and-edit-events-in-calendar-iph3d110f84/ios>
15. Apple 支持 — *在 Mac 上为日历事件设置提醒*（可设多个提醒、暂缓 9 分钟）<https://support.apple.com/guide/calendar/set-alerts-for-an-event-icl1012/mac>
16. Google 日历帮助 — *更改 Google 日历通知*<https://support.google.com/calendar/answer/37242>

**竞品（厂商公开页面）**

17. 超级课程表 — App Store 页面<https://apps.apple.com/us/app/%E8%B6%85%E7%BA%A7%E8%AF%BE%E7%A8%8B%E8%A1%A8-%E5%A4%A7%E5%AD%A6%E7%94%9F%E6%97%A9%E5%85%AB%E4%B8%8A%E8%AF%BE%E5%BF%85%E5%A4%87%E8%AF%BE%E8%A1%A8%E6%9E%81%E7%AE%80%E5%A5%BD%E7%94%A8/id573868981>
18. WakeUp 课程表 — App Store 页面<https://apps.apple.com/app/wakeup%E8%AF%BE%E7%A8%8B%E8%A1%A8-%E8%B6%85%E7%BA%A7%E5%A5%BD%E7%94%A8%E7%9A%84%E8%AF%BE%E7%A8%8B%E8%A1%A8/id1553402284>
19. 1timetable.app — 官网（Web/PWA 优先 + 主屏小组件 + Live Activity）<https://1timetable.app>
20. Weeklie — 课程表 App 介绍页<https://weeklytimetable.app/class-schedule-app>

> 课程格子 / ClassUp：其 App Store（`id555280127`）与 Google Play（`com.plokia.ClassUp`）页面在 2026-10-25 实测均返回 404，为满足「链接真实可访问」的要求，此处不列出失效链接。

---

## 附：本文档的取证说明

- 平台能力均取自**官方文档**（web.dev / Chrome for Developers / MDN / WebKit / IETF / Android / Apple / Microsoft），引用时已标注具体页面；带版本或日期的事实（Chrome 88、iOS 16.4、2024-09-19 更新等）均来自原文。
- 竞品功能取自**厂商自述**（App Store / Google Play / 官网），**未实机验证**；「签到」一栏的判断基于公开功能列表，若后续需要精确结论应补做真机截图核对。
- 第 5 节链接均来自本次实际抓取或检索命中的页面，其中绝大多数已直接打开确认（HTTP 200）；ClassUp 的两个商店页实测 404，已从列表移除并在第 1 节标注存疑。
- 未采用的传闻型说法：任何「iOS 某个版本起网页也能后台定时」的说法均无官方依据；Notification Triggers 虽有大量旧教程，但官方已声明终止，不要基于它做技术选型。
- 三个仍需实测确认的点（建议进入设计验证阶段再补）：① Chromium 桌面端 PWA 在**最小化窗口**（而非切换标签）时的定时器精度；② 国产 Android ROM 对后台 WebView/PWA 的额外限制；③ iOS 上 `showNotification()` 在**已安装但未申请推送权限**时的行为。

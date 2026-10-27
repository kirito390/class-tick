# 课刻 ClassTick ·「城堡与王廷」扩展方案

> 承接 [`royal-art-direction.md`](royal-art-direction.md)（调色、字体、五条不要做）与 [`royal-tutor.md`](royal-tutor.md)（艾莉丝设定与换装）。本文只定义新增的城堡徽记、骑士、国王、王后与艾莉丝「魔女装」的视觉、出图、落位、动效与文案；实现时仍以「时间、地点、课名、数字第一」为最高原则。
>
> 原始图已存在于 `assets/royal/raw/court/`（castle-crest / knight / king / queen）与 `assets/teacher/raw/witch.png`，出图参数见 `tools/court_assets_spec.json`。下文 prompt 为定稿版，重出图时以本文为准。

---

## 一、视觉方向

色调沿用深蓝 `--royal` + 鎏金 `--gold` + 羊皮纸 `--surface`，新增角色只在服饰点缀王室紫与深红，不引入新主色。线条为细而柔的动画线稿，阴影用两阶柔和赛璐璐加水彩晕染，高光偏暖金。人物以去底立绘贴入现有金线框，与 hero 城堡夜空同处一层光源（右上月光）。

参考《魔女之旅》的气质：旅人感、欧式石板小镇、魔女帽与扫帚的剪影、水彩般通透的晨昏天空。不做什么：不复制任何该作角色的脸、发型、服装配色或徽标；不幼态（头身比 ≥ 1:6.5，Q 版仅限既有悬浮头像）；不赛博、不霓虹、不机甲；不出现武器对峙或战斗场景。

---

## 二、GPT-Image-2 出图清单

通用参数：模型 `gpt-image-2`（Fucheers 通道 `/v1/images/generations`；魔女装需保持艾莉丝一致，走 `/v1/images/edits` 并以 `assets/teacher/raw/full.png` 作参考图）。纯白底便于 `process_*_assets.py` 四边 floodfill 去底。

| # | 用途 | 输出 | 尺寸 | 质量 | 接口 |
|---|---|---|---|---|---|
| 1 | 城堡纹章图标 | `assets/royal/raw/court/castle-crest.png` | 1024×1024 | high | generations |
| 2 | 骑士守卫 | `assets/royal/raw/court/knight.png` | 1024×1536 | high | generations |
| 3 | 国王 | `assets/royal/raw/court/king.png` | 1024×1536 | high | generations |
| 4 | 王后 | `assets/royal/raw/court/queen.png` | 1024×1536 | high | generations |
| 5 | 艾莉丝魔女装 | `assets/teacher/raw/witch.png` | 1024×1536 | high | edits（参考 `full.png`） |

预算：high 档每张约 0.3 美元额度；先用 medium 试构图，定稿再出 high。每条最多重出 2 次，仍不理想就改 prompt 而不是继续抽卡。

### 1. castle crest icon

```text
Anime illustration, soft watercolor, clean line art, European fantasy, elegant heraldic crest icon: a slender ivory castle with three pointed towers and blue slate roofs standing on a deep navy enamel escutcheon shield, fine antique gold filigree rim, a small gold crown above the shield, two tiny gold stars at the sides, subtle violet tint in the shadows, symmetrical and balanced, moderate detail that stays readable at 64px, bold clear silhouette, centered with generous margin, solid pure white background, no text, no letters, no watermark, no characters, no extra objects
```

### 2. knight guardian

```text
Anime illustration, soft watercolor, clean line art, European fantasy, elegant, one original royal knight guardian standing full body, centered, calm upright guard stance facing slightly toward the viewer, silver-blue ornate plate armor with fine gold trim, long deep navy cape with a gold-embroidered hem, right hand holding a tall ceremonial lance planted upright beside the body, left arm carrying a kite shield bearing a small ivory castle emblem, no helmet, short silver hair, composed gentle noble face, adult proportions, soft morning light from upper right, full body visible from head to boots, solid pure white background, no text, no watermark, no extra characters, no battle, no blood
```

### 3. king

```text
Anime illustration, soft watercolor, clean line art, European fantasy, elegant, one original king standing full body, centered, majestic yet approachable, handsome man in his late thirties with neat dark-gold hair and a short trimmed beard, warm steady eyes, ornate gold crown with small sapphires, deep crimson royal robe with gold embroidery and an ermine-trimmed mantle, navy undercoat, holding a slender gold scepter topped with a small star, upright dignified posture, not elderly, no wrinkles, soft light from upper right, full body visible from head to shoes, solid pure white background, no text, no watermark, no extra characters
```

### 4. queen

```text
Anime illustration, soft watercolor, clean line art, European fantasy, elegant, one original queen standing full body, centered, gentle and noble, graceful woman in her early thirties with long wavy honey-gold hair partly pinned up, soft amber eyes, delicate gold tiara crown with pearls, flowing ivory and dusty-rose court gown with fine gold embroidery, light navy shoulder veil, pearl necklace and gold earrings, hands holding a small closed fan in front, serene warm smile, adult proportions, soft light from upper right, full body visible from head to hem, solid pure white background, no text, no watermark, no extra characters
```

### 5. witch outfit for Elise

参考图：`assets/teacher/raw/full.png`（保持脸型、发色、瞳色、侧编辫一致）。

```text
Use the reference image for the same original character Elise: keep her face, silver-blonde long hair with a side braid, violet eyes, gentle composed expression and adult proportions exactly. Anime illustration, soft watercolor, clean line art, European fantasy, elegant, full body, centered. New outfit, original design: a white wide-brimmed pointed witch hat with a thin gold band and a small gold star charm, a long robe with a black-to-deep-violet gradient, the inner lining showing a soft starry night sky with tiny gold stars, a short navy capelet with a gold clasp, white gloves, brown traveling boots, holding a slim wooden broom with gold binding upright at her side, light breeze moving the hem, traveling witch mood, not childish, not copying any existing anime character or costume, solid pure white background, no text, no watermark, no extra characters, no background scenery
```

通用反面约束（追加在每条 prompt 末尾）：`no chibi, no child proportions, no cyberpunk, no neon, no glowing tech, no weapons pointed at viewer, no logos, no signature`。

---

## 三、组件落位方案

后处理沿用 Pillow 管线：四边 floodfill 去白底 → `trim` → 缩放 → WebP，输出到 `assets/royal/court/*.webp` 与 `assets/teacher/full-witch.webp`。

| 组件 | 素材 | 桌面（> 860px） | 手机（≤ 720px） | 降级 |
|---|---|---|---|---|
| Header 城堡徽记 | `castle-crest.webp`（输出 256×256，显示 40px） | 替换 `.brand` 内 SVG 方块 logo，保留 `.logo::after` 光泽 | 显示 32px，不额外加装饰 | `<img>` 加载失败时移除自身，回退现有 SVG；学院皮肤不显示 |
| Hero 左侧骑士 | `knight.webp`（max_h 720） | hero 宽 ≥ 760px 时以 `<img class="court-guard">` 绝对定位于左下，高度约为 hero 高 × 1.05，占左侧 ≤ 18%；`.hero-main` 加 `padding-left` 让位 | 隐藏 | 用 `<picture>` + 媒体查询，窄屏不下载；只保留城堡夜空 |
| Hero 右侧国王与王后 | `king.webp` + `queen.webp`（各 max_h 720） | 仅 hero 宽 ≥ 1080px 显示，并排置于 `.hero-side` 背后，叠加暗角渐变，保证倒计时对比度 ≥ 4.5:1；此档隐藏 `.hero::after` 皇冠避免重复 | 隐藏 | 宽度不足只显示骑士；全部失败只剩城堡背景 |
| Footer 王廷一行 | 头像裁切 `court-*-face.webp`（96×96，显示 22px） | `.foot-en` 上方一行：三枚金线圆形小像 +「王廷在侧 · The Court Attends」，点击打开王廷面板 | 头像 18px，隐藏英文 | 头像失败只显示文字 |
| 「王廷」收藏面板 | 全身立绘 + 徽记 | 设置页新增 `.panel`「王廷 · Royal Court」，4 卡网格（城堡/骑士/国王/王后），卡片 160×220，立绘 contain，底部名牌 + 铭文 | 横向滚动卡片带，单卡 132×184，`scroll-snap-type: x mandatory` | 素材未就绪时显示徽记剪影占位 + 名称 |
| 魔女换装入口 | `full-witch.webp`（max_h 1200） | `OUTFITS` 增加 `witch: { cn: '旅行魔女', en: 'Wandering Witch', file: 'full-witch.webp' }`；✦ 循环、设置下拉、`?outfit=witch` 预览；王廷面板底部加换装按钮 | 对话顶部横幅同步换装；按钮全宽 | 文件 404 时 `applyTeacherOutfit` 回退 `court`，提示「魔女装尚未备好」 |

层级规则：王廷立绘一律 `pointer-events: none`、`aria-hidden="true"`，z-index 低于 `.hero-main`，不得覆盖课名、时间、地点、签到按钮；小组件模式（`body.widget-mode`）全部不显示。夜堡主题下立绘加 `filter: brightness(.92)`，避免白色魔女帽在深底刺眼。

---

## 四、动效方案

只作用于装饰层，只动 `transform` / `opacity`，不触发布局；文字与数字不参与任何动画。

| keyframes | 对象 | 时长 | 缓动 | 说明 |
|---|---|---|---|---|
| `crest-glint` | header 徽记 | 9s infinite，延迟 3s | `ease-in-out` | 金色斜光扫过，0–80% 静止；与 `logo-shimmer` 二选一，不叠加 |
| `guard-in` | hero 骑士 / 国王 / 王后 | 600ms 一次 | `cubic-bezier(.2,.7,.3,1)` | 自 `translateY(12px)`、`opacity 0` 落位，依次延迟 0 / 120 / 240ms |
| `guard-breathe` | hero 立绘 | 8s infinite | `ease-in-out` | `scale(1 → 1.008)`，`transform-origin: 50% 100%`，与 `tutor-breathe` 错相 |
| `cape-sway` | 骑士 | 6s infinite | `ease-in-out` | `rotate(-.4deg ↔ .4deg)`，仅桌面 |
| `court-card-rise` | 王廷卡片 | 220ms | `ease-out` | hover / `:focus-visible` 上抬 3px，金线加亮 |
| `witch-sway` | 魔女装立绘 | 7s infinite | `ease-in-out` | `rotate(±.6deg)` 模拟旅途微风，替代该服装下的 `tutor-breathe` |
| `star-drift` | 魔女装舞台星点 | 12s infinite | `linear` | 复用 `.teacher-sparkle`，缓慢上飘，≤ 6 颗 |

- 循环动效周期 ≥ 6s、幅度 ≤ 1%，阅读时几乎察觉不到。
- `document.hidden` 时给 `html` 加 `.is-idle`，`court-*` / `guard-*` / `witch-*` 动画 `animation-play-state: paused`。
- `prefers-reduced-motion: reduce`：上述全部 `animation: none !important`，`guard-in` 直接显示终态；选择器并入 `royal-polish.css` 现有 reduced-motion 列表，换装淡入淡出为 0ms。
- 一次性动效 ≤ 600ms，交互反馈 ≤ 300ms，与艺术指导第 5 条一致。

---

## 五、皇家文案

| 角色 | 中文名 | 英文名 | 铭文 | Motto |
|---|---|---|---|---|
| 城堡 | 晨星堡 | Castle Morningstar | 灯火常明，为每一位晚归的学子 | A light kept for every late scholar |
| 骑士 | 银枪骑士 · 塞德里克 | Sir Cedric, the Silver Lance | 守住时间，便守住了承诺 | To guard the hour is to keep the word |
| 国王 | 奥瑞恩国王 | King Orion | 秩序始于准时 | Order begins with being on time |
| 王后 | 赛琳娜王后 | Queen Selene | 温柔亦是一种坚持 | Gentleness, too, is perseverance |
| 魔女 | 旅行魔女 · 艾莉丝 | Elise, the Wandering Witch | 每一节课，都是一段小小的旅程 | Every lesson is a small journey |

### 王廷面板文案

- 标题：王廷 · Royal Court
- 副句：晨星堡的王廷会在课表旁静静守候。他们不打扰，只在需要时出现。
- 晨星堡：课刻的城堡与纹章所在。你的每一份课表，都封存在这里的档案库中。
- 塞德里克：守在今日朝程旁的骑士。号角响起时，他提醒你按时启程。
- 奥瑞恩国王：偏爱井然有序的一周。王历排得整齐，便是他最满意的时候。
- 赛琳娜王后：照看行囊与日程的那一位。作业将至，她总愿意早一点轻声提醒。
- 旅行魔女 · 艾莉丝：艾莉丝出门游学时的装束。换了衣裳，她依旧是认真打理课表的导师。
- 换装按钮：为艾莉丝换上魔女装 · Dress as the Wandering Witch
- 换装台词：「换好了，殿下。今天的课，就当作一段旅程吧。」
- Footer：王廷在侧 · The Court Attends

约束沿用艺术指导：称谓只用「殿下」，不用「陛下」「朕」「臣」；王廷成员不发言、不推送通知，对话只属于艾莉丝。

---

## 六、验收清单

图片加载
- [ ] 新增 WebP 均 200 加载，并加入 `sw.js` 预缓存，离线可见
- [ ] hero 立绘与面板图使用 `loading="lazy"`、`decoding="async"`；首屏 preload 仍只有 `hero-castle.webp`
- [ ] 任一素材 404 按第三节降级，控制台无未捕获错误

透明底
- [ ] floodfill 后无白边、无白色晕圈（夜堡主题下放大 200% 检查）
- [ ] 魔女帽、王后礼服、铠甲高光等内部白色未被误抠
- [ ] `trim` 后四周留白 ≤ 8px

尺寸 / 体积上限
- [ ] `castle-crest.webp` 256×256，≤ 40 KB；若导出 `icons/` 512 PNG，≤ 120 KB
- [ ] `knight` / `king` / `queen` max_h 720，各 ≤ 90 KB
- [ ] `full-witch.webp` max_h 1200，≤ 160 KB（与现有礼服同级）
- [ ] 头像 96×96，各 ≤ 12 KB；新增素材合计 ≤ 500 KB

响应式
- [ ] 1440 / 1080 / 860 / 390 四档截图：课名、倒计时、签到按钮无遮挡
- [ ] ≤ 720px 不下载、不显示 hero 守卫；王廷面板横向滚动可 snap
- [ ] 小组件模式不出现任何王廷立绘

动效降级
- [ ] reduced-motion 下 `crest-*` / `court-*` / `guard-*` / `witch-*` / `cape-*` / `star-*` 动画均为 none
- [ ] 标签页隐藏时动画暂停；Performance 10s 采样 CPU 与接入前持平

IP 安全
- [ ] 角色均为原创设定；魔女装与《魔女之旅》主角逐项比对（帽型细节、配色组合、胸针、发型、脸）不雷同
- [ ] prompt、文案、文件名中不出现既有作品角色名或作品名（本文参考说明除外）
- [ ] README「设计与参考」与 AI 工具说明注明：立绘由 GPT-Image-2 按原创设定生成

可访问性
- [ ] 装饰立绘 `alt=""` + `aria-hidden="true"`；王廷卡片有可读名称（中文名 + 英文名）
- [ ] 卡片与换装按钮可 Tab 聚焦，`:focus-visible` 金线描边，点击区 ≥ 44px
- [ ] 立绘叠加区文字对比度 ≥ 4.5:1（浅色 / 夜堡 / 跟随系统）
- [ ] 换装结果经 `aria-live="polite"` 播报「已为艾莉丝换上 旅行魔女」

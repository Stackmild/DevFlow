# Route Anti-Patterns & Degeneration Signals — 纠偏系统

> Phase 1 选定路线后，必须查阅本文件中对应路线的退化信号。
> Phase 4 Anti-Degeneration Review 复检时再次引用。
> 每条 signal 统一 4 段结构：Signal → Why It Happens → Fix → Poka-yoke。

---

## 总则

> **负向约束优先**：若 route 的正面特征与 anti-pattern 规则冲突，以 anti-pattern guardrail 为优先。
> 先防退化，再谈高级感。

---

## §1. Analytical Command Center

### 1a. "Spreadsheet Skin"（电子表格皮肤）

**Signal** — 所有数据页面只有表格和简单数字卡，无 visual focal point，用户进入页面无从扫描
**Why It Happens** — "高密度"被误解为"把数据塞满"，density 成了不做设计的借口
**Fix** — 回到 Phase 2 North-Star，为 top-3 关键指标设计视觉突出方式（字号差异 ≥8px、色彩区分、位置优先），定义明确的 scan order
**Poka-yoke** — North-Star 模板第 3 字段（第一视觉焦点）和第 4 字段（信息层级）强制填写，不允许"均匀分布"

### 1b. "Dashboard Factory"（仪表盘工厂）

**Signal** — 页面机械排列 KPI 卡 + 图表，无叙事逻辑，用户不知道先看哪里。颜色只有灰+蓝，无语义色引导。
**Why It Happens** — 把 route 的"数据优先"理解为"图表越多越好"，忽略了信息优先级设计
**Fix** — 回到 Phase 2，在 North-Star 中定义首屏的叙事逻辑：用户进来要回答什么问题？最重要的答案在哪？
**Poka-yoke** — North-Star 第 1 字段（页面目标）必须是用户任务而非"展示数据"，第 5 字段（关键交互区域）必须有下钻路径

---

## §2. Executive Trust Console

### 2a. "PPT Dashboard"（演示文稿仪表盘）

**Signal** — 密度过低，一屏只有 2 个大数字，像演示而非工具。缺乏详细数据的下钻路径。
**Why It Happens** — "宽松留白"被误解为"尽量少放信息"，忽略了用户需要做决策而非纯浏览
**Fix** — 回到 Phase 1 检查"任务性质"——如果有操作/决策需求，首屏必须包含决策所需的全部关键信息（≥3 个有意义数据点）
**Poka-yoke** — North-Star 第 4 字段（信息层级）必须有 ≥3 层，第 11 字段（Real Content）验证首屏信息量

### 2b. "Luxury Void"（奢华空洞）

**Signal** — 留白面积 > 40% 但无功能性留白（分组/呼吸），所有文字用 serif 字体但实际内容是操作指令不是阅读内容
**Why It Happens** — 把"高可信度"等同于"高端奢华"，忽略了工具性
**Fix** — 回到 Phase 3，重新评估密度策略——留白必须有功能（分组、呼吸、引导视线），不是装饰
**Poka-yoke** — Token 段 density strategy 必须标注每个留白区域的功能性目的

---

## §3. Editorial Research Workspace

### 3a. "Blog Skin"（博客皮肤）

**Signal** — 看起来像个博客而非工具，没有操作入口，只有无限滚动的文字流。导航弱或不存在。
**Why It Happens** — "阅读优先"被误解为"只有阅读"，忽略了工具性交互（搜索、筛选、标注、导出）
**Fix** — 回到 Phase 2，在 North-Star 中确保除了阅读区之外，有明确的工具性交互区域（侧栏操作、顶部筛选、浮动工具条）
**Poka-yoke** — North-Star 第 5 字段（关键交互区域）必须列出 ≥2 个非阅读交互

### 3b. "Information Avalanche"（信息雪崩）

**Signal** — 文字层级 > 5 级但视觉区分不足，标题和正文长得太像，卡片和列表混用但无规律
**Why It Happens** — typography 权重高是正确的，但权重高不等于层级多——层级需要靠多手段（字号+色彩+空间+位置）拉开
**Fix** — 回到 Phase 3，将 typography scale 限制在 4-5 级，每级必须在 ≥2 个维度上有差异
**Poka-yoke** — Rubric Hierarchy Clarity 维度的 evidence 必须指出具体用了哪些手段拉层级

---

## §4. AI-native Copilot Surface

### 4a. "Chat + Empty Panel"（聊天+空面板）

**Signal** — 左边一个聊天窗，右边一个空白详情面板或占位画布。AI 生成内容没有视觉区分，看起来和用户输入一样。
**Why It Happens** — "双面板"被理解为只需要两个容器，忽略了面板间的关系设计和 AI 内容的视觉身份
**Fix** — 回到 Phase 2，North-Star 中必须定义：(1) 对话区和画布区的信息流关系 (2) AI 生成内容的视觉标记（背景色/边框/图标/渐变） (3) 画布区的非空默认状态
**Poka-yoke** — North-Star 第 7 字段（Route 具体体现）必须描述 AI 内容与人类内容的视觉差异

### 4b. "Gradient Soup"（渐变汤）

**Signal** — 过度使用柔和渐变和 blur 效果，界面像一张模糊的概念图，实际操作区域边界不清
**Why It Happens** — "柔和渐变"和"呼吸感"被滥用为全局装饰，而非功能性视觉元素
**Fix** — 回到 Phase 3，限制渐变使用范围：只在 AI 状态指示、brand moment、加载动效中使用，操作区域必须有清晰边界
**Poka-yoke** — Token 段必须明确 gradient 的使用场景白名单，默认禁止全局渐变背景

---

## §5. Consumer-light Utility

### 5a. "Toy App"（玩具应用）

**Signal** — 过度圆角（≥16px 全局）、过度柔和色、所有元素都像儿童教育 App，失去任何专业感
**Why It Happens** — "友好"被理解为"幼稚化"，忽略了轻工具仍需要传递可靠感
**Fix** — 回到 Phase 1，检查产品姿态——如果涉及金钱、健康、决策等场景，友好度需要与可靠感平衡
**Poka-yoke** — Route selection 的 Rejected Directions 中必须包含"过度幼稚化"作为被拒方向

### 5b. "Card Dump"（卡片倾倒）

**Signal** — 页面只有一种尺寸的卡片无限滚动，无分类、无层级、无焦点，像一个未排序的 feed
**Why It Happens** — "卡片流"被理解为"用卡片装所有内容"，忽略了信息结构
**Fix** — 回到 Phase 2，North-Star 中定义卡片的分类逻辑、置顶/高亮规则、不同类型卡片的视觉差异
**Poka-yoke** — North-Star 第 6 字段（组件风格差异点）必须包含至少 1 个卡片类型的差异化设计

---

## §6. Narrative Insight Desk

### 6a. "Chart Gallery"（图表画廊）

**Signal** — 页面是图表和文字的线性堆砌，图表之间无叙事关联，像 BI 工具的截图拼接
**Why It Happens** — "大面积图表"被误解为"图表越多越好"，忽略了"叙事驱动"的核心
**Fix** — 回到 Phase 2，每个图表在 North-Star 中必须有叙事上下文：它回答什么问题？和前后图表的逻辑关系是什么？
**Poka-yoke** — North-Star 第 11 字段（Real Content）必须包含图表的叙事引导文案（"为什么看这个"→图表→"所以意味着什么"）

### 6b. "Content Overload"（内容过载）

**Signal** — 单页内容过长（> 10 屏滚动），无目录导航，无进度指示，读者迷失位置
**Why It Happens** — 叙事内容天然长，但缺少结构化导航设计
**Fix** — 回到 Phase 3，增加目录导航、阅读进度条、跳转锚点、章节分隔
**Poka-yoke** — Screen Architecture 中必须定义长内容的导航策略

---

## §7. Operational Control Plane

### 7a. "Terminal Cosplay"（终端角色扮演）

**Signal** — 全页面等宽字体、全暗色背景、无 UI 组件，看起来像终端模拟器而非 GUI 管理面板
**Why It Happens** — "终端美学"被过度执行，忽略了 GUI 工具应有的可交互元素（按钮、筛选、分组）
**Fix** — 回到 Phase 1，确认用户并非都在终端环境工作——等宽字体限于 log/code 区域，其他区域用正常字体和 UI 组件
**Poka-yoke** — Token 段必须明确 monospace 字体的使用范围白名单

### 7b. "Status Color Soup"（状态色汤）

**Signal** — 页面上同时出现 > 5 种状态色，颜色含义不一致（同一颜色在不同位置表示不同状态），用户无法快速判断哪里有问题
**Why It Happens** — "状态色主导"被理解为"颜色越多表达越丰富"
**Fix** — 回到 Phase 3，限制状态色到 4 种以内（success/warning/error/info），建立一致的颜色→含义映射表
**Poka-yoke** — Token color 段必须有明确的语义色映射表，禁止同一颜色多义

---

## §通用. 跨路线通用退化信号

以下不论选了哪条路线都要检查（HC-8 引用此节）：

### U-1. Layout Uniformity（布局均一化）
**Signal** — 所有页面使用相同 layout skeleton（sidebar + content），无页面类型差异
**Why It Happens** — Shell 设计只做了一次，所有页面套同一个壳
**Fix** — 回到 Phase 3 Screen Architecture，至少区分 2 种页面类型的 shell 变体
**Poka-yoke** — North-Star 的不同页面必须展示不同的布局骨架

### U-2. Token-Component Gap（Token-组件脱节）
**Signal** — Token 定义了但组件规则没引用 token，组件描述用硬编码值
**Why It Happens** — Token 和组件由两次不同的"生成"产出，缺乏交叉引用
**Fix** — Phase 3 中，每个组件规则旁必须标注引用的 token
**Poka-yoke** — HC-5（token drift）检查

### U-3. Adjective-Only Expression（纯形容词表达层）
**Signal** — Expression Layer 描述全部是形容词（"柔和"/"精致"/"呼吸感"）而无具体视觉参数（颜色值、动效时长、出现位置）
**Why It Happens** — Expression Layer 被当成文案写，而非设计规范
**Fix** — Phase 3 中，每个表达层元素必须有 ≥1 个可量化或可定位的参数
**Poka-yoke** — Rubric Expression Control 维度要求 evidence 指向具体参数

### U-4. Rejected-Actual Convergence（拒绝方向与实际输出趋同）
**Signal** — Rejected Directions 写了 3 条但实际输出与"被拒绝"的方向无视觉差异
**Why It Happens** — Rejected Directions 被当成形式填写，实际设计未参考
**Fix** — Phase 4 Anti-Degen Review 中，逐条检查 Rejected Directions 是否真的被避免
**Poka-yoke** — North-Star 第 9 字段（禁止项）必须至少 1 条来自 Rejected Directions

### U-5. Default UI Kit Passthrough（UI 库直通）
**Signal** — 所有组件使用 UI 库默认值（默认 radius、默认 shadow、默认 padding），无任何路线化调整
**Why It Happens** — 组件层被视为"已经够好了"，没有按 route 做二次设计
**Fix** — Phase 3 组件规则中，≥3 个组件必须有明确的定制说明
**Poka-yoke** — HC-7 检查

# Design Route Library — 预置风格路线库

> 从 SKILL.md V2 Section F 提取。7 条路线作为起点参考，不是强制清单。
> 设计师可组合、变形或提出新路线。
> 选定路线后，必须查阅 `route-anti-patterns.md` 中对应路线的退化信号。

---

## 1. Analytical Command Center

**适合**：投后管理、金融监控、运营看板、数据分析平台
**不适合**：消费级应用、创意工具、社交产品

**视觉特征**：高密度、中性色主导、数据优先、直角或微圆、极简动效、信息层级靠留白和字重拉开
**典型 page shell**：宽 sidebar（可折叠）+ 多面板 dashboard + 顶部筛选栏 + 紧凑工具条
**风险**：容易变成冰冷的控制台，缺少人情味

**North-Star behavior hint**：North-Star 页面应体现「一屏内完成关键决策所需的全部信息扫描」——首屏必须有明确的 scan order（从左上角关键指标 → 右侧趋势图 → 下方明细表），而不是均匀铺满数字卡。

**退化信号交叉引用** → `route-anti-patterns.md` §1

---

## 2. Executive Trust Console

**适合**：C-level 看板、决策支持、合规审查、汇报工具
**不适合**：高频操作工具、开发者工具

**视觉特征**：宽松留白、大标题数字、品牌色克制使用、高可信度、稳定感、serif 或 semi-serif 可选
**典型 page shell**：宽幅 dashboard（max-width 较大）+ 紧凑侧栏或无侧栏 + 大面积 hero 区域 + 低密度卡片
**风险**：容易变成"PPT 式仪表盘"，密度过低失去实用性

**North-Star behavior hint**：North-Star 页面应体现「用最少的元素传递最关键的判断信息」——首屏只放 3-5 个 hero 级指标，每个指标有上下文（趋势、对比、状态），不是孤立大数字。下钻路径必须存在但不抢视觉。

**退化信号交叉引用** → `route-anti-patterns.md` §2

---

## 3. Editorial Research Workspace

**适合**：新闻聚合、AI 分析报告、研究工具、知识管理
**不适合**：纯交易系统、高频操作

**视觉特征**：阅读优先、杂志式排版、文字层级丰富、卡片+列式混合、内容密度 > 数据密度、typography 权重高
**典型 page shell**：三栏布局（目录/导航 + 主内容区 + 上下文面板）或双栏（导航 + 阅读区），主内容区 max-width 适中（680-780px），行高宽松
**风险**：信息过载、层级失控、像博客而非工具

**North-Star behavior hint**：North-Star 页面应体现「沉浸式阅读与结构化导航并存」——主区域用杂志级 typography（大标题、引用块、段落间距），侧面用紧凑目录/摘要卡辅助定位，不是把所有内容平铺在一个无限滚动列表里。

**退化信号交叉引用** → `route-anti-patterns.md` §3

---

## 4. AI-native Copilot Surface

**适合**：AI 助手、Chat+Canvas、生成式工具、Copilot 界面
**不适合**：纯数据看板、传统 CRUD 后台

**视觉特征**：双面板（对话+画布）、柔和渐变、呼吸感、AI 生成内容有视觉区分、suggestion card、confidence indicator
**典型 page shell**：左侧对话面板（固定宽度或可调）+ 右侧画布/工作区（弹性宽度）+ 顶部轻量工具条 + 底部输入区
**风险**：过度 AI 未来感、忽略实用性

**North-Star behavior hint**：North-Star 页面应体现「人机协作的空间感和节奏感」——对话区和画布区有清晰的视觉分界但不割裂，AI 生成内容有明确的视觉标记（不是只靠灰色气泡），画布区不能是空白占位——必须展示真实的工作内容。

**退化信号交叉引用** → `route-anti-patterns.md` §4

---

## 5. Consumer-light Utility

**适合**：菜谱、日常决策、个人工具、轻量记录
**不适合**：企业后台、金融系统

**视觉特征**：低密度、大圆角、暖色调或柔和色、生活化插图、友好排版、单列或双列卡片流
**典型 page shell**：单列居中（max-width 480-640px）或双列卡片网格 + 底部 tab 导航 + 顶部品牌 header
**风险**：过于轻松导致不专业

**North-Star behavior hint**：North-Star 页面应体现「轻松但有结构」——卡片流不是随意堆砌，每张卡有明确的信息层级（标题→描述→操作），空态用品牌插图而非通用 SVG，整体感觉是「用心设计的小工具」而不是「随便套了个 UI 库」。

**退化信号交叉引用** → `route-anti-patterns.md` §5

---

## 6. Narrative Insight Desk

**适合**：投研报告、洞察平台、深度分析、可视化叙事
**不适合**：操作密集型工具、配置管理

**视觉特征**：叙事驱动、大面积图表、时间线、上下文关联、editorial + data 混合、较强表达层
**典型 page shell**：宽幅内容区（max-width 900-1100px）+ 轻量侧栏（元数据/跳转）+ 大面积图表区域 + 叙事式段落
**风险**：内容编排复杂度高、维护成本大

**North-Star behavior hint**：North-Star 页面应体现「数据讲故事」——不是图表和文字分开罗列，而是图表嵌入叙事流中，每个图表有上下文引导（"为什么看这个"→图表→"所以意味着什么"），时间线不是装饰而是导航。

**退化信号交叉引用** → `route-anti-patterns.md` §6

---

## 7. Operational Control Plane

**适合**：DevOps 面板、系统监控、CI/CD、基础设施管理
**不适合**：面向非技术用户的产品

**视觉特征**：极高密度、等宽字体、暗色主题偏好、状态色主导、实时数据流、终端美学
**典型 page shell**：全宽布局 + 多 tab/panel 切换 + 状态栏（顶部或底部）+ 日志/终端区域 + 紧凑 sidebar
**风险**：对非技术用户极不友好

**North-Star behavior hint**：North-Star 页面应体现「信息密度高但有优先级」——不是把所有 log 和 metric 平铺，而是有明确的「当前最需要关注的事」区域（告警/异常优先），正常状态压缩显示，异常状态放大。等宽字体用在 log/code 区域，不是全页面。

**退化信号交叉引用** → `route-anti-patterns.md` §7

---

## 如何提出新路线

如果 7 条预置路线均不匹配，可自定义。要求：

1. 必须填写上述所有字段（适合/不适合/视觉特征/page shell/风险/North-Star hint）
2. 必须与至少 2 条现有路线做差异对比
3. 必须列出至少 2 个风险
4. 必须为新路线定义至少 2 个退化信号（参照 `route-anti-patterns.md` 的 4 段结构）

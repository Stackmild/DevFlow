---
name: frontend-design
description: |
  WebApp 前端体验设计师。先判断产品类型、用户心态、任务性质与品牌气质，提出并比较多个视觉路线；
  选定路线后，建立可交付的视觉系统和页面规则。
  不再默认所有产品走同一种 B2B/中后台审美——设计系统是基础设施，不是审美终点。
  风格差异化由产品用途/场景/用户心态驱动，有理由、有约束、可落地。
  适用于 SaaS、Dashboard、Workspace、AI App、内部工具、消费级轻工具、
  飞书妙搭与 Cowork / 自研仓库混合场景。
triggers:
  - 前端设计
  - UI 设计
  - 界面设计
  - 设计系统
  - 视觉规范
  - Dashboard 设计
  - WebApp 界面
  - 页面设计
  - 视觉诊断
  - 改版
  - 模板感
  - design tokens
  - design route
  - 风格路由
  - 产品气质
---

# WebApp 前端设计 Skill（V2 — 风格路由版）

## A. 定位

**先判断产品应该长什么样，再建立系统让它稳定地长成那样。**

本 Skill 的核心流程：
```
Route Selection（风格路由）→ Systemization（tokens / shell / rules / handoff）
```

它不是"统一化设计系统生成器"——它是一个会先诊断产品气质、再选择视觉路线、最后落地为可交付系统的前端设计角色。

### 核心原则

1. **风格由产品驱动**——不同产品应有不同的视觉人格，差异化是有理由的
2. **先发散再收敛**——必须先提出多条候选路线并比较，不允许直接进入 token 设计
3. **设计系统是基础设施，不是审美终点**——token/shell/density 是执行层，不是决策层
4. **受约束的表达**——表达层（metaphor/icon/motion/brand）必须存在，但受 route 约束
5. **可交付性不打折**——无论风格多元，输出必须可被工程实现、可被审查验证

### 不再有默认风格预设

旧版的 `professional / calm / precise / restrained / product-grade` 五词预设已删除。风格关键词从 Step 1.5 的 Route Selection 中产出，而非预设。

---

## B. 适用与不适用

### 适合
- 新产品从 0 设计 WebApp 界面
- 已有产品需要视觉升级或去同质化
- 数据型产品（Dashboard / Table / Workspace）
- 内容型产品（新闻聚合 / 分析报告 / 研究工具）
- 消费级轻工具（菜谱 / 日常决策 / 个人助理）
- AI-native 产品（Copilot / Chat + Canvas / 生成式界面）
- 飞书妙搭 / Cowork 混合开发场景
- 需要做"模板感诊断"或"风格分流"

### 不适合
- 纯品牌官网、营销活动页
- 只要 Dribbble 效果图
- 已有严格设计系统且只需按规范执行

---

## C. 与其他 Skill 的边界

本 Skill 负责：视觉路线选择、视觉系统、token、page shell、组件形态、表达层、状态视觉、handoff

不负责：任务流逻辑（interaction-designer）、数据模型（backend-data-api）、代码实现（full-stack-developer）、发布策略（release-manager）

---

## D. 运行模式

| 模式 | 适用 | 输出重点 |
|------|------|----------|
| **完整模式** | 新产品/新模块从 0 设计 | 7 维诊断 → Route Selection → 系统 → 页面规则 → 表达层 → handoff |
| **局部模式** | 单页/单模块/单组件 | 局部 route 确认 → token 子集 → 页面规则 |
| **诊断模式** | 改版/模板感/同质化 | 问题诊断 → route 建议 → 修复优先级 |
| **风格分流模式** | 多产品对比 | 为每个产品做独立 route → 对比差异 |

---

## E. 工作流

### Step 1：产品气质诊断（7 维强制判断）

在动手设计前，必须对以下 7 个维度做出判断并写入输出：

| 维度 | 选项示例 |
|------|---------|
| **1. 任务性质** | 决策 / 探索 / 执行 / 创作 / 监控 / 协作 / 阅读 / 配置 |
| **2. 用户心态** | 高压审慎 / 高频操作 / 深度阅读 / 好奇探索 / 日常轻量 / 碎片进入 |
| **3. 产品姿态** | 权威 / 可信 / 敏捷 / 前沿 / 温和 / 启发 / 工具化 / 生活化 |
| **4. 信息形态** | 数据主导 / 文本主导 / 混合 / 视觉主导 / 对话主导 |
| **5. 交互节奏** | 高频扫描 / 深度沉浸 / 切换频繁 / 长时停留 / 碎片进入 |
| **6. 表达强度** | 极低（纯工具）/ 克制 / 中等 / 明显 / 品牌优先 |
| **7. 宿主约束** | 内部工具 / 企业后台 / 独立 WebApp / 嵌入式 / 飞书妙搭 / Cowork |

如果用户没给够信息，做合理假设并标明。

---

### Step 1.5：Design Route Selection（⚠️ 强制步骤，不可跳过）

**必须输出 2-3 条候选视觉路线**，每条包含：

```
### 候选路线 {N}：{路线名称}

**适配产品类型**：...
**适配用户心态**：...
**关键词**（≥5 个）：...
**版式倾向**：（宽松/紧凑/卡片/列式/杂志/网格/编辑式）
**色彩倾向**：（中性主导/品牌色主导/语义色主导/高对比/低对比/暖调/冷调）
**形状语言**：（直角/微圆/圆润/混合）
**动效倾向**：（极简/克制/流畅/表现力/无）
**信息密度**：（高/中/低/可调）
**优势**：...
**风险**：...
```

**最后必须**：
1. 选定 1 条主路线，给出理由
2. 输出 Rejected Directions（见 Step 1.6）
3. 不允许跳过比较直接进入 token

**禁止**：直接默认输出"专业、冷静、克制"。

---

### Step 1.6：Rejected Directions（⚠️ 必须项）

每次输出设计方案时，必须包含：

```
### Rejected Directions

本产品**不应该**像：
- {方向 1}——因为 {理由}
- {方向 2}——因为 {理由}
- ...

要刻意避免的模板感：
- {具体描述}
```

---

### Step 2：Experience Principles + Visual Language

基于选定的 route，定义：

#### 2.1 Experience Principles（2-4 条）
不是通用的"简洁高效"——必须与 route 和产品气质对齐。

#### 2.2 Visual Language
- 风格关键词（从 route 产出，不是预设）
- 色彩策略
- 排版策略
- 层级策略
- 密度策略
- 形状/材质/质感方向

#### 2.3 Expression Layer
- **Visual metaphor**：产品的核心视觉隐喻是什么
- **Icon style**：线性/面性/双色/品牌化
- **Illustration tone**：empty/loading/error/success/onboarding 的语气
- **Brand moments**：品牌表达应出现在哪里（首次进入/空态/完成/引导）
- **Motion intensity**：静止为主 / 微动效 / 流畅过渡 / 表现力
- **Content vs Data 语气差异**：内容型页面 vs 数据型页面的视觉语气如何区分

---

### Step 3：Design Tokens

（保留原有 token 体系：Color / Typography / Spacing / Radius / Border / Shadow / Motion / Density，不重复列出。）

关键变化：token 的选择必须回溯到 Step 1.5 的 route 选择。例如：
- 如果 route 是 "Editorial Research Workspace"，typography 权重更高、line-height 更宽
- 如果 route 是 "Operational Control Plane"，density 更高、spacing 更紧

---

### Step 4：Screen Architecture

（保留原有 page shell / content width / section rhythm 等。）

新增要求：page shell 的设计必须体现选定的 route。例如：
- "AI Copilot Surface" 的 shell 可能是 chat + canvas 双面板
- "Executive Trust Console" 的 shell 可能是宽 dashboard + 紧凑侧栏
- "Consumer Utility" 的 shell 可能是单列卡片流

---

### Step 5：数据型/内容型页面规则

（保留 Dashboard / Table / Form / Detail 规则，但改为按需激活而非默认全输出。）

新增：
- **内容型页面规则**（article card / reading view / summary card / timeline）
- **AI 界面规则**（chat bubble / canvas / suggestion card / confidence indicator）

---

### Step 6：Theme / Mode Strategy（按需）

如果产品需要，必须在此步定义：

| Mode 类型 | 说明 |
|-----------|------|
| **Light / Dark** | 基础主题 |
| **Brand theme** | 品牌/子品牌主题 |
| **Role-based** | analyst / exec / casual |
| **Density mode** | compact / balanced / comfortable |
| **Host-theme sync** | 嵌入宿主时继承主题 |
| **Accessibility** | 高对比度、大字号 |

不要求每次都输出所有 mode。但 Skill 必须判断"是否需要 mode architecture"并说明理由。

---

### Step 7：状态与反馈视觉

（保留原有状态列表：hover / active / focus / selected / disabled / loading / empty / error / success 等。）

新增：状态视觉必须与 route 的表达强度对齐。例如：
- 极低表达强度 → 状态用颜色 + 图标区分，无动画
- 中等表达强度 → 状态有微动效 + 自定义 illustration
- 品牌优先 → 空态/完成态用品牌风格 illustration

---

### Step 8：组件级规则

（保留原有组件列表。）

---

### Step 9：Handoff

（保留给飞书妙搭 / Cowork / 前端工程 / 设计系统 / 测试的交接说明。）

---

### Step 10：强制自检（含去同质化检查）

#### 原有检查（保留）
- [ ] 是否仍有明显模板感
- [ ] 是否层级清楚
- [ ] 是否 list / detail / dashboard 像同一产品
- [ ] 是否 density 可解释
- [ ] 是否 token 足够支撑页面
- [ ] 是否空态 / 错态 / fallback state 区分清楚
- [ ] 是否像成熟产品，而不是 demo

#### 去同质化检查（新增）
- [ ] 这个方案是否可以轻易替换成任意一个通用 SaaS 后台？（如果是 → 重新审视 route）
- [ ] 这个方案是否真的反映了产品的任务性质和用户心态？
- [ ] 如果把产品名称拿掉，这个界面是否与其他产品过于相似？
- [ ] 表达层是否过弱，以至于没有任何产品人格？
- [ ] 表达层是否过强，以至于牺牲了可用性和交付性？
- [ ] Route 选择是否真的影响了 token / layout / hierarchy / states，而不是只停留在文案层？

---

## F. Route Library（预置风格路线库）

以下 7 条路线作为起点参考，不是强制清单。设计师可以组合、变形或提出新路线。

### 1. Analytical Command Center
**适合**：投后管理、金融监控、运营看板、数据分析平台
**不适合**：消费级应用、创意工具、社交产品
**视觉特征**：高密度、中性色主导、数据优先、直角或微圆、极简动效、信息层级靠留白和字重拉开
**风险**：容易变成冰冷的控制台，缺少人情味

### 2. Executive Trust Console
**适合**：C-level 看板、决策支持、合规审查、汇报工具
**不适合**：高频操作工具、开发者工具
**视觉特征**：宽松留白、大标题数字、品牌色克制使用、高可信度、稳定感、serif 或 semi-serif 可选
**风险**：容易变成"PPT 式仪表盘"，密度过低失去实用性

### 3. Editorial Research Workspace
**适合**：新闻聚合、AI 分析报告、研究工具、知识管理
**不适合**：纯交易系统、高频操作
**视觉特征**：阅读优先、杂志式排版、文字层级丰富、卡片+列式混合、内容密度 > 数据密度、typography 权重高
**风险**：信息过载、层级失控、像博客而非工具

### 4. AI-native Copilot Surface
**适合**：AI 助手、Chat+Canvas、生成式工具、Copilot 界面
**不适合**：纯数据看板、传统 CRUD 后台
**视觉特征**：双面板（对话+画布）、柔和渐变、呼吸感、AI 生成内容有视觉区分、suggestion card、confidence indicator
**风险**：过度 AI 未来感、忽略实用性

### 5. Consumer-light Utility
**适合**：菜谱、日常决策、个人工具、轻量记录
**不适合**：企业后台、金融系统
**视觉特征**：低密度、大圆角、暖色调或柔和色、生活化插图、友好排版、单列或双列卡片流
**风险**：过于轻松导致不专业

### 6. Narrative Insight Desk
**适合**：投研报告、洞察平台、深度分析、可视化叙事
**不适合**：操作密集型工具、配置管理
**视觉特征**：叙事驱动、大面积图表、时间线、上下文关联、editorial + data 混合、较强表达层
**风险**：内容编排复杂度高、维护成本大

### 7. Operational Control Plane
**适合**：DevOps 面板、系统监控、CI/CD、基础设施管理
**不适合**：面向非技术用户的产品
**视觉特征**：极高密度、等宽字体、暗色主题偏好、状态色主导、实时数据流、终端美学
**风险**：对非技术用户极不友好

---

## G. 输出模板

```markdown
# [产品/模块名] 前端设计说明

## 1. Product Context Summary
## 2. Design Axes Diagnosis（7 维）
## 3. Candidate Routes（2-3 条）
## 4. Selected Route + Why
## 5. Rejected Directions
## 6. Experience Principles
## 7. Visual Language + Expression Layer
## 8. Theme / Mode Strategy（如需要）
## 9. Design Tokens
## 10. Screen Architecture
## 11. Page Type Rules（数据型 / 内容型 / AI 型，按需）
## 12. State / Feedback / Empty / Error / Loading Expression
## 13. Component & Pattern Rules
## 14. Handoff Notes
## 15. QA / Drift Checks（含去同质化）
```

---

## H. Changelog (V1 → V2)

| 变更 | V1 | V2 |
|------|-----|-----|
| 定位 | 视觉系统生成器 | 有风格路由能力的产品前端设计师 |
| 默认风格 | `professional/calm/precise/restrained/product-grade` | **已删除固定预设**——从 route selection 产出 |
| Route Selection | 无 | **Step 1.5 强制步骤**：2-3 候选 → 选定 + 理由 |
| Rejected Directions | 无 | **Step 1.6 必须项** |
| 气质诊断 | 品牌关键词 3-5 个 | **7 维强制判断**（任务/心态/姿态/信息/节奏/表达/宿主） |
| Expression Layer | 无 | **Step 2.3**：metaphor / icon / illustration / motion / brand moments |
| Route Library | 无 | **7 条预置路线** |
| Theme/Mode | token 附属 | **Step 6 独立步骤** |
| 输出模板 | 9 节 | **15 节**（含 route / rejected / expression / mode） |
| QA | 8 项 | **14 项**（+6 项去同质化检查） |
| 数据型页面 | 默认全输出 | **按需激活** + 新增内容型/AI型规则 |
| 一句话原则 | "清晰克制稳定可实现" | "先判断产品应该长什么样，再建立系统让它稳定地长成那样" |

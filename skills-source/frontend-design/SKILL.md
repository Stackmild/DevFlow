---
name: frontend-design
description: |
  WebApp 前端体验设计师（V2.6 — 4-Phase Workflow Gate）。
  先判断产品类型、用户心态、任务性质与品牌气质，提出并比较多个视觉路线；
  选定路线后，通过 North-Star Screen 压到页面层，再建立可交付的视觉系统和页面规则。
  4-Phase 阻断式流程：Diagnosis → North-Star（硬 gate）→ System → Critique & Package。
  不再默认所有产品走同一种 B2B/中后台审美——设计系统是基础设施，不是审美终点。
  风格差异化由产品用途/场景/用户心态驱动，有理由、有约束、可落地。
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

# WebApp 前端设计 Skill（V2.6 — 4-Phase Workflow Gate）

## A. 定位

**先判断产品应该长什么样，再压到页面上验证，最后建立系统让它稳定地长成那样。**

```
Phase 1: Route Selection → Phase 2: North-Star（硬 gate）→ Phase 3: Systemization → Phase 4: Critique & Package
```

### 核心原则

1. **风格由产品驱动**——不同产品应有不同的视觉人格，差异化是有理由的
2. **先发散再收敛**——必须先提出多条候选路线并比较，不允许直接进入 token 设计
3. **设计系统是基础设施，不是审美终点**——token/shell/density 是执行层，不是决策层
4. **受约束的表达**——表达层（metaphor/icon/motion/brand）必须存在，但受 route 约束
5. **可交付性不打折**——无论风格多元，输出必须可被工程实现、可被审查验证
6. **质量有标尺**——每次输出必须通过 hard checks + rubric 自评，低分触发回流，hard fail 阻断通过
7. **负向约束优先**——anti-pattern guardrail 优先于正面风格追求；先防退化，再谈高级感
8. **交付有 contract**——每次产出必须附带 `frontend-design-package`（YAML 摘要），供上下游机械检查

### 不再有默认风格预设

旧版的 `professional / calm / precise / restrained / product-grade` 五词预设已删除。风格关键词从 Phase 1 的 Route Selection 中产出，而非预设。

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
| **完整模式** | 新产品/新模块从 0 设计 | 4-Phase 全流程 |
| **局部模式** | 单页/单模块/单组件 | Phase 1-2 必须，Phase 3-4 聚焦局部 |
| **诊断模式** | 改版/模板感/同质化 | Phase 1 诊断 → route 建议 → 修复优先级（Phase 2 可选） |
| **风格分流模式** | 多产品对比 | 为每个产品做独立 Phase 1 → 对比差异 |

---

## E. 4-Phase 工作流

### ⬇️ Phase 1 — Diagnosis & Routing

#### 1.1 产品气质诊断（7 维强制判断）

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

#### 1.2 Design Route Selection（⚠️ 强制，不可跳过）

**必须输出 2-3 条候选视觉路线**，每条包含：适配产品类型、适配用户心态、关键词（≥5）、版式/色彩/形状/动效/密度倾向、优势、风险。

参考路线库：`reference/design-route-library.md`（7 条预置路线）

**最后必须**：
1. 选定 1 条主路线，给出理由
2. 输出 Rejected Directions（本产品不应该像什么 + 理由）
3. 查阅 `reference/route-anti-patterns.md` 中选定路线的退化信号
4. 输出"本路线最易退化为 → {}" + 主动规避方式

**禁止**：直接默认输出"专业、冷静、克制"。不允许跳过比较直接进入 token。

#### CHECKPOINT（Phase 1 → 2 阻断点）

```
CHECKPOINT: Route selected: {路线名}. Rejected: {n} directions. Degeneration risks: {简述}.
```

**⚠️ 阻断规则**：Route 未选定 → 不得进入 Phase 2。

---

### ⬇️ Phase 2 — North-Star Blueprint（⚠️ 硬 Gate）

> 完整模式 / 局部模式下的硬阻断交付物。未完成 Phase 2 不得进入 Phase 3。
> 诊断模式下不强制，但建议对问题最严重的页面做 North-Star。

对每个产品/模块至少选 1 个关键页面，按 `templates/north-star-screen-template.md`（11 字段）产出 North-Star Screen Spec。

**选择标准**：最能体现 route 视觉人格、最容易在实现中退化的页面。

**局部模式**：当前设计的页面即为 North-Star 对象。

**关键要求**：
- 11 字段全部填写，不可省略
- Real Content 必须使用真实内容（禁止 placeholder → HF-2）
- Route 在页面上的具体体现（signature element）必须明确

#### CHECKPOINT（Phase 2 → 3 阻断点）

```
CHECKPOINT: North-Star complete — {n} screens defined. Real content: {pass/fail}.
```

**⚠️ 阻断规则**：North-Star 未完成 → 不得进入 Phase 3。不允许跳过 North-Star 直接给 token/component/layout/实现建议。

---

### ⬇️ Phase 3 — System & Component Translation

#### 3.1 Experience Principles + Visual Language

基于选定 route 定义 2-4 条体验原则（不是通用的"简洁高效"）。

Visual Language：风格关键词（从 route 产出）、色彩/排版/层级/密度/形状策略。

Expression Layer：visual metaphor、icon style、illustration tone、brand moments、motion intensity、content vs data 语气差异。

#### 3.2 Design Tokens

Token 体系（Color / Typography / Spacing / Radius / Border / Shadow / Motion / Density）从选定 route 推导。

**强制要求**：
- 每个 token 分类旁注明 route 回溯理由（一句话）
- Token 选择必须体现 route 的密度区间和字体权重偏好
- 禁止输出与 route 无关的通用 token 集

#### 3.3 Screen Architecture

Page shell 设计必须体现选定 route，输出中标注 route 对应关系。

#### 3.4 页面类型规则（按需激活）

- **数据型**：Dashboard / Table / Form / Detail
- **内容型**：article card / reading view / summary card / timeline
- **AI 型**：chat bubble / canvas / suggestion card / confidence indicator

#### 3.5 Theme / Mode Strategy（按需）

判断是否需要 Light/Dark、Brand theme、Role-based、Density mode、Host-theme sync、Accessibility，说明理由。

#### 3.6 状态与反馈视觉

hover / active / focus / selected / disabled / loading / empty / error / success。
状态视觉必须与 route 的表达强度对齐。

#### 3.7 组件级规则

关键组件（Button / Card / Table / Form / Navigation / Sidebar / Tabs / Chat）逐一说明 variant + size + state。

**强制要求**：
- ≥3 个组件必须有"与 UI 库默认值不同的路线化定制点"
- 禁止所有组件使用 UI 库默认值而无任何路线化调整
- 组件定制必须回溯到 route 和 expression layer

#### 3.8 Handoff

给飞书妙搭 / Cowork / 前端工程 / 设计系统 / 测试的交接说明。

#### CHECKPOINT（Phase 3 → 4 阻断点）

```
CHECKPOINT: System layer complete — {n} token categories, {n} custom component points.
```

**⚠️ 阻断规则**：系统层未产出 → 不得进入 Phase 4。

---

### ⬇️ Phase 4 — Critique & Gate

#### 4.1 Hard Checks

执行 `checklists/frontend-design-hard-checks.md` 中的 8 项检查（6 Blocking + 2 Quality）。

#### 4.2 Anti-Degeneration Review

对照 `reference/route-anti-patterns.md`，复检：
- 选定路线的 route-specific 退化信号是否被触发
- 跨路线通用退化信号匹配数量
- Rejected Directions 是否真的被避免（逐条检查）

#### 4.3 Rubric Self-Review

参照 `rubrics/design-quality-rubric.md` 的 8 个维度评分（1-5），每维度附 evidence basis。

**通过标准**：所有维度 ≥ 3，且至少 4 个维度 ≥ 4。

**Hard Fail（5 条，任一触发 → 不通过）**：HF-1 无 North-Star / HF-2 placeholder 内容 / HF-3 ≥3 退化信号 / HF-4 token drift / HF-5 关键状态缺失

**Low-Score Escalation**（8/8 维度全覆盖，见 rubric 文件）：低分 → 回退到对应 Phase 修正。

#### 4.4 Final Verdict

- **PASS** = hard_fail_ids 为空 且 所有 rubric ≥3 且 ≥4 维度 ≥4
- **FAIL-RETRY** = 可回退修复（有明确 retry_phase）
- **FAIL-ESCALATE** = 结构性问题需人工介入

#### 4.5 宿主平台约束自检（来源：dark-mode-001 复盘 PFL-019 / C-015）

在生成 design-spec 之前，若 handoff-packet 含 `host_platform_context`，必须执行以下检查：

1. **protected_host_files 检查**：读取 handoff-packet 的 `protected_host_files` 字段。对每个受保护文件，检查 design-spec 中是否有依赖该文件的能力点（如主题 Provider、全局样式注入、入口配置）。若有依赖 → 在 design-spec 中明确标注"⚠️ {文件名} 是宿主保护文件，相关能力必须下沉至可修改组件层（如 Layout.tsx）"，并提供替代实现路径。
2. **能力链可部署性验证**：对所有涉及"全局包裹"（ThemeProvider、ContextProvider、全局 class 注入）的设计决策，确认能力链终点在可修改文件中，不依赖宿主平台入口文件。
3. **cloud_build_only_deps 提示**：若 handoff-packet 含 `cloud_build_only_deps`，在 design-spec 的验收标准中注明"⚠️ 以下依赖本地不可验证，需在宿主平台首次构建后检查：{deps}"，避免 FSD 花大量时间本地探索。

> 若 handoff-packet 不含 `host_platform_context`（内部项目），此步骤跳过。

#### 4.6 产出前 Token 自检（P0-5，来源：amhub-insights-v1 复盘）

在生成 design-spec / frontend-design-package 之前，必须对照项目 `design/` 目录（visual-system.md / component-guidelines.md / tailwind-theme.css）做一次 token audit：
- 检查产出中引用的所有 CSS 变量是否在 token 定义中存在
- 检查是否有硬编码 rgba / color-mix / shadow 违反设计系统禁止项
- 检查 hover / selected / border token 是否与现有页面实现一致
- 不合规项必须在产出中标注并修正，**不能留给 ORC 或 reviewer 事后发现**

#### 4.6 生成 frontend-design-package

按 `templates/frontend-design-package.md` 的 YAML schema 生成 Package Summary，嵌入输出 Section 20。

**⚠️ 规则**：如果在 Phase 4 中触发 escalation 回退（回到 Phase 1/2/3 修正），回退完成后必须重新走 Phase 4 并重新生成 Package。

---

## F. Route Library（快速索引）

详细路线定义见 `reference/design-route-library.md`（7 条预置路线 + 适用/不适用/风险/North-Star hint）。

| # | 路线 | 一句话 |
|---|------|--------|
| 1 | Analytical Command Center | 高密度数据优先 |
| 2 | Executive Trust Console | 宽松高可信 |
| 3 | Editorial Research Workspace | 阅读优先杂志式 |
| 4 | AI-native Copilot Surface | 双面板柔和渐变 |
| 5 | Consumer-light Utility | 低密度暖色友好 |
| 6 | Narrative Insight Desk | 叙事驱动大面积图表 |
| 7 | Operational Control Plane | 极高密度终端美学 |

设计师可组合、变形或提出新路线。选定后必须查阅 `reference/route-anti-patterns.md`。

---

## G. 输出模板（4-Phase × 20 节）

```markdown
# [产品/模块名] 前端设计说明

## Phase 1: Diagnosis & Routing
### 1. Product Context Summary
### 2. Design Axes Diagnosis（7 维）
### 3. Candidate Routes（2-3 条）
### 4. Selected Route + Why
### 5. Rejected Directions
### 6. Anti-Degeneration Guardrails（退化预判 + 规避）

## Phase 2: North-Star Blueprint
### 7. North-Star Screen Spec（≥1 关键页面，real content，11 字段）

## Phase 3: System & Component
### 8. Experience Principles + Expression Layer
### 9. Design Tokens（回溯 route）
### 10. Screen Architecture
### 11. Page Type Rules（按需）
### 12. Theme / Mode Strategy（按需）
### 13. State / Feedback Expression
### 14. Component Rules（≥3 非默认定制点）
### 15. Handoff Notes
### 15b. 跨组件视觉和谐验证（MANDATORY — 任何路线都必须通过）

> ⚠️ **前置条件**：执行本节时，§9 Design Tokens 中的颜色草稿必须已完成——第 1 项检查（Nav/Sidebar × Content 对比度）依赖 token 颜色值，若 token 尚未产出则跳过对比度数值判断，仅做 tone family 方向性评估，并在输出中注明"待 token 确定后复验"。

选定视觉路线后、产出 design tokens 前，必须完成以下三项验证。**任一项未通过，路线方案不完整，需补充后才能进入 Phase 4。**

#### 1. Nav/Sidebar × Content 整体协调性

- 深色 nav + 浅色 content：nav 内文字/icon 对比度是否 ≥ WCAG AA（4.5:1）？过渡边界是否需要 separator？相邻区域是否属于同一 tone family？
- 反向同理
- **必须明确写出**：该路线为什么不会产生"像两个产品拼在一起"的割裂感

#### 2. 受限容器内的长标签策略（sidebar/nav < 200px）

| 情况 | 必须声明的策略 |
|------|--------------|
| 纯中文标签 > 6 字 | truncate + ellipsis？tooltip？折行最大几行？ |
| 混合中英文（如 `AI Coding学习库`） | 最大显示字数上限？折行 or ellipsis？ |
| 允许折行时 | 最大行数上限（建议 ≤ 2） |

#### 3. 整体 tone 一致性宣言

必须在输出中写明（选择适用的模板）：

> "该路线使用 [色调描述]，统一适用于 Nav/Sidebar/Content/Cards，不存在跨区域 tone 切换。"

或若刻意双色调：

> "Nav 使用 [色调 A]，Content 使用 [色调 B]，两者通过 [X 机制]（如统一品牌色 accent、separator 过渡、相同字体系统）形成协调整体，设计意图为 [原因]。"

> ⚠️ 此宣言将被下游 webapp-consistency-audit 作为视觉和谐审查的基准——审查员会对照此声明验证实现是否一致。

## Phase 4: Critique & Gate
### 16. Hard Checks Result（6 Blocking + 2 Quality）
### 17. Anti-Degeneration Review
### 18. Rubric Self-Review（8 维度 + evidence）
### 19. Final Verdict（PASS / FAIL-RETRY / FAIL-ESCALATE）
### 20. frontend-design-package（YAML summary contract）
```

> Section 20 是质量元数据，不是视觉规范。Phase F.5 backfill 不得将其写入 VISUAL-SYSTEM.md。

详细模板见 `templates/design-spec.md`。

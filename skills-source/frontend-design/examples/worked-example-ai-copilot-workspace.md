# Worked Example — AI Copilot Workspace

> 本文件展示 frontend-design V2.6 的端到端输出示例。
> 场景：为内部投研团队设计的 AI 辅助分析工具。
> 目的：让后续使用者看到所有新机制串起来后，最终产物长什么样。

---

## Phase 1: Diagnosis & Routing

### 1. Product Context Summary

**产品名称**：Research Copilot
**产品类型**：AI-native 投研辅助分析工具
**目标用户**：投资团队分析师（5-8 人），日常使用，非技术背景
**核心任务**：通过 AI 对话 + 结构化画布快速生成投研分析、对比公司数据、追踪投后异动
**已有设计约束**：嵌入 Cowork 平台运行，需继承基础主题

### 2. Design Axes Diagnosis（7 维）

| 维度 | 判断 | 依据 |
|------|------|------|
| 任务性质 | 探索 + 决策 | 分析师通过 AI 探索数据，最终做投资判断 |
| 用户心态 | 深度沉浸 + 高压审慎 | 投研场景需专注，错误判断有实际后果 |
| 产品姿态 | 可信 + 前沿 | 要传递专业可靠感，同时体现 AI 能力 |
| 信息形态 | 对话主导 + 数据混合 | AI 对话为主入口，输出混合文本和数据 |
| 交互节奏 | 深度沉浸 + 切换频繁 | 长时间使用，但在对话和画布间频繁切换 |
| 表达强度 | 克制 | 不是消费品，不需要强品牌表达，但需要比纯工具有更多 AI 身份感 |
| 宿主约束 | Cowork 平台 | 继承基础主题变量，但有独立视觉空间 |

### 3. Candidate Routes

#### 候选路线 A：AI-native Copilot Surface
**适配产品类型**：AI 助手、Chat+Canvas
**适配用户心态**：深度沉浸 + 探索
**关键词**：双面板、柔和渐变、AI 区分、呼吸感、suggestion card、confidence
**版式倾向**：双面板（对话+画布），弹性宽度分配
**色彩倾向**：中性色主导 + AI 状态渐变
**形状语言**：微圆（6-8px）
**动效倾向**：流畅过渡
**信息密度**：中（变化大，对话区松、画布区紧）
**优势**：天然适配核心交互模式
**风险**：退化为"左边聊天+右边空白"

#### 候选路线 B：Analytical Command Center
**适配产品类型**：数据分析平台
**适配用户心态**：高频扫描
**关键词**：高密度、中性色、数据优先、紧凑
**版式倾向**：多面板 dashboard
**色彩倾向**：中性主导
**形状语言**：直角或微圆
**动效倾向**：极简
**信息密度**：高
**优势**：数据展示能力强
**风险**：忽略了 AI 对话的核心交互，把 copilot 变成了带聊天窗的 dashboard

#### 候选路线 C：Editorial Research Workspace
**适配产品类型**：研究工具、知识管理
**适配用户心态**：深度阅读
**关键词**：阅读优先、杂志式排版、内容密度
**版式倾向**：三栏（导航+内容+上下文）
**色彩倾向**：低对比暖色
**形状语言**：微圆
**动效倾向**：克制
**信息密度**：中
**优势**：适合深度阅读分析报告
**风险**：对话交互被弱化，AI 变成纯内容展示工具

### 4. Selected Route + Why

**选定路线**：AI-native Copilot Surface
**选定理由**：核心交互是 AI 对话 + 结构化输出，双面板模式天然匹配。B 路线忽略对话核心，C 路线弱化了 AI 交互。投研数据通过画布区呈现，不需要独立 dashboard。

### 5. Rejected Directions

本产品**不应该**像：
- **传统投研后台**——因为核心交互不是表单/列表 CRUD，而是 AI 对话
- **通用聊天机器人**——因为不是纯对话，画布区有结构化输出，需要独立视觉空间
- **BI Dashboard**——因为数据是通过 AI 对话探索的，不是预设的静态看板

要刻意避免的模板感：
- 左右两栏等分 + 默认气泡的通用 chat UI
- 满屏统计卡 + 深色 header 的 dashboard 模板

### 6. Anti-Degeneration Guardrails

**本路线最易退化为** → "Chat + Empty Panel"（聊天+空面板）

来自 `route-anti-patterns.md` §4a：
- **Signal**：左边聊天窗，右边空白详情面板，AI 内容没有视觉区分
- **Why**：双面板被理解为两个容器，忽略了面板间关系和 AI 视觉身份

**主动规避方式**：
- 画布区必须有非空默认状态（最近分析卡片 + 快速入口）
- AI 生成内容必须有视觉标记（渐变底色 + 左侧彩条 + "AI 生成" 小标签）
- 对话和画布之间有联动高亮（选中对话消息 → 画布对应区域亮起）

```
CHECKPOINT: Route selected: AI-native Copilot Surface. Rejected: 3 directions. Degeneration risks: Chat+Empty Panel, uniform bubble style, no AI visual identity.
```

---

## Phase 2: North-Star Blueprint

### 7. North-Star Screen Spec — AI 分析对话页

**1. 页面目标**：分析师通过 AI 对话探索投研问题，并在画布区查看结构化分析输出

**2. 首屏布局骨架**：
```
┌─────────────────────────────────────────────────────┐
│  顶部工具条（轻量：产品名 + 当前分析主题 + 设置）    │
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  对话面板        │  画布区                          │
│  (固定 380px)    │  (弹性宽度)                      │
│                  │                                  │
│  [AI 消息]       │  [分析卡片：公司对比表]           │
│  [用户消息]      │  [图表：毛利率趋势]              │
│  [AI 消息+引用]  │  [摘要卡片：关键发现]            │
│                  │                                  │
├──────────────────┼──────────────────────────────────┤
│  [输入框 + 模板选择器]│                              │
└──────────────────┴──────────────────────────────────┘
```

**3. 第一视觉焦点**：画布区的最新分析卡片（占首屏右侧 60% 面积），通过更大字号标题 + 微妙阴影突出。用户进来应先看到"AI 给我的最新分析结果"，而不是对话历史。

**4. 信息层级**：
1. **画布区最新分析卡片标题** — heading-lg 20px 600, 深色文字, 居画布顶部
2. **AI 对话消息** — body-md 14px, 浅蓝渐变底色 + 左侧彩条, 对话面板内
3. **用户对话消息** — body-md 14px, 纯白底, 右对齐
4. **画布区辅助信息（数据来源、置信度）** — body-sm 13px, 灰色, 卡片底部

**5. 关键交互区域**：
- 输入框：hover 显示模板选择器浮层，click 聚焦输入
- 画布区分析卡片：hover 显示"展开/收起"操作栏，click 展开详细数据
- AI 消息中的引用标记：hover 高亮对应画布区内容，click 滚动到对应位置

**6. 组件风格差异点**：
- **对话气泡**：默认值（纯白圆角矩形）→ 定制后：AI 消息用 surface.ai-tint 渐变底 + 左侧 2px primary 彩条，用户消息保持纯白但右对齐。理由：route 要求 AI 内容有视觉区分。
- **分析卡片**：默认值（统一圆角白色卡片）→ 定制后：分主卡/辅卡两级。主卡有 shadow-md + heading-lg 标题 + 渐变顶边；辅卡只有 shadow-sm + body-md 标题。理由：route 要求画布区有信息层级。

**7. Route 具体体现（signature element）**：AI-native Copilot Surface 通过三个 signature element 体现：(1) 对话→画布的联动高亮（选中消息→画布区亮起）(2) AI 消息的渐变底色+左侧彩条 (3) 画布区分析卡片的双层级设计（主卡/辅卡）

**8. 最易退化点**：
- **画布区**：退化为空白占位或简单列表 → 防止方式：默认状态必须有"最近 3 个分析"卡片 + "快速开始"入口
- **AI 消息**：退化为与用户消息同样式的灰色气泡 → 防止方式：HC-7 检查中将 AI 气泡列为定制点之一

**9. 禁止项**：
- 禁止：画布区使用空白占位（"No data yet" + 通用插图）
- 禁止：AI 消息和用户消息使用完全相同的气泡样式
- 禁止：对话面板和画布区使用 50/50 等分（对话面板固定窄宽，画布区弹性宽）

**10. 实现优先级**：
- **P0**：双面板布局、AI/用户消息视觉区分、画布区分析卡片双层级、联动高亮
- **P1**：模板选择器浮层、置信度指示器、画布区拖拽排序

**11. Real Content**：
- **Real headline**："宁德时代 vs 比亚迪：Q3 毛利率对比分析"
- **Real support text**："基于最新季报数据，AI 已识别两家公司在电池业务毛利率上的 3 个关键差异点"
- **Real CTA**："查看完整对比" / "追问细节"
- **真实内容模块**：
  1. AI 对话消息："宁德时代 Q3 电池业务毛利率为 22.3%，同比下降 1.8pp，主要受碳酸锂价格波动影响..."
  2. 画布区主卡标题："毛利率趋势对比（2023Q1-2024Q3）"+ 折线图描述
  3. 画布区辅卡："关键发现：比亚迪的垂直整合策略使其毛利率波动幅度比宁德时代低 40%"

```
CHECKPOINT: North-Star complete — 1 screens defined. Real content: pass.
```

---

## Phase 3: System & Component（精简展示）

### 8-15: 系统层产出（本示例仅展示关键 token 子集）

**Token 最小集示例**：

| Token | 值 | Route 回溯 |
|-------|----|-----------|
| color.primary.500 | #6366F1（靛蓝） | Copilot Surface 需要科技感但不冰冷的主色 |
| color.surface.ai-tint | linear-gradient(135deg, #EEF2FF, #E0E7FF) | AI 内容视觉区分的核心 token |
| color.text.primary | #1E293B | 高可读性，深度沉浸场景 |
| radius-md | 8px | 微圆，介于严肃和友好之间 |
| space-4 | 16px | 对话面板标准内间距 |
| shadow-md | 0 4px 12px rgba(0,0,0,.08) | 画布区主卡片阴影 |
| font.heading-lg | 20px/28px, weight 600 | 画布区主卡标题，需要与对话区 body 拉开层级 |

**组件定制点**（≥3）：
1. **AI 对话气泡** — 默认：白色圆角 → 定制：surface.ai-tint 渐变底 + 左侧 2px primary 彩条（route: AI 内容视觉区分）
2. **画布分析卡片** — 默认：统一白色卡片 → 定制：主卡 shadow-md + 渐变顶边 vs 辅卡 shadow-sm（route: 画布区信息层级）
3. **输入框** — 默认：单行 input → 定制：多行 textarea + 底部模板选择器 chip 条（route: copilot 输入需要更多上下文空间）

```
CHECKPOINT: System layer complete — 7 token categories, 3 custom component points.
```

---

## Phase 4: Critique & Gate

### 16. Hard Checks Result

| HC | 检查项 | 类型 | 结果 | 备注 |
|----|--------|------|------|------|
| HC-1 | Route Selection | Blocking | pass | AI-native Copilot Surface 选定 |
| HC-2 | North-Star | Blocking | pass | 1 screen 完成 |
| HC-3 | Placeholder | Blocking | pass | Real content 全部使用真实投研数据 |
| HC-4 | Token 最小集 | Quality | pass | 7 类 token 覆盖 |
| HC-5 | Token Drift | Blocking | pass | 所有组件引用 token |
| HC-6 | 关键状态 | Blocking | pass | loading/empty/error/disabled 已定义 |
| HC-7 | 组件定制点 | Quality | pass | 3 个定制点 |
| HC-8 | 退化信号 | Blocking | pass | count: 0 |

**Blocking 结果**：全部 pass
**Quality 结果**：全部 pass

### 17. Anti-Degeneration Review

**选定路线退化信号复检**：
- "Chat + Empty Panel" — 未触发：画布区有默认内容（最近分析卡片）
- "Gradient Soup" — 未触发：渐变仅用于 AI 状态标识，操作区域边界清晰

**跨路线通用信号匹配数量**：0/5

**Rejected Directions 验证**：
- "传统投研后台" — 确已避免：无 CRUD 列表/表单模式
- "通用聊天机器人" — 确已避免：画布区有独立结构化输出
- "BI Dashboard" — 确已避免：数据通过 AI 对话探索，非预设看板

### 18. Rubric Self-Review

| 维度 | 得分 | Evidence Basis |
|------|------|---------------|
| Product Fit | 4 | Route 选择匹配 AI 对话+画布核心交互；7 维诊断全映射到视觉决策 |
| Hierarchy Clarity | 4 | 4 层信息层级用字号+底色+阴影+位置区分（North-Star 第 4 字段） |
| Originality / Anti-Generic | 4 | AI 气泡渐变底+彩条、主/辅卡双层级、联动高亮——3 个 signature element 可识别产品 |
| System Coherence | 4 | 7 类 token 全有 route 回溯，3 个组件定制点全引用 token |
| Visual Craft | 3 | 核心组件规则到位，辅助组件（toast/tooltip）规则待补 |
| Expression Control | 4 | 渐变仅用于 AI 标识+品牌 moment，motion 限于联动高亮，未过度 |
| Route Fidelity | 4 | 双面板/AI 区分/联动高亮全部体现在实现层 |
| Iteration Readiness | 4 | Token 语义化命名，组件规则模块化，主卡/辅卡可独立修改 |

**Hard Fail 检查**：通过（无 HF 触发）
**Rubric 判定**：PASS（所有 ≥3，7 个 ≥4）

### 19. Final Verdict

**Verdict**：PASS
**Implementation Ready**：true
**Retry Phase**：null

---

### Hard Fail 拦截示范

> 以下展示假设初版触发 HF-2 时的修正过程。

**假设初版 North-Star Section 11 写成了：**
```
- Real headline: "Welcome to Research Copilot"
- Real support text: "Your AI-powered research assistant"
- Real CTA: "Get Started"
```

**HC-3 扫描结果**：FAIL — 发现 "Welcome to" + "Get Started" + generic support text
**触发**：Hard Fail HF-2
**Phase 4 判定**：FAIL-RETRY, retry_phase = Phase 2

**修正动作**：回到 Phase 2，将 placeholder 替换为真实投研内容：
```
- Real headline: "宁德时代 vs 比亚迪：Q3 毛利率对比分析"
- Real support text: "基于最新季报数据，AI 已识别两家公司在电池业务毛利率上的 3 个关键差异点"
- Real CTA: "查看完整对比"
```

修正后重新走 Phase 4 → HC-3 pass → Package 重新生成。

---

### 20. frontend-design-package

> ⚠️ 本节是质量元数据，不是视觉规范。

```yaml
frontend_design_package:
  version: "v2.6"
  mode: "full"
  route_selected: "AI-native Copilot Surface"
  rejected_routes_count: 3
  north_star_count: 1
  real_content_pass: true
  degeneration_signal_count: 0

  hard_checks:
    HC-1: pass
    HC-2: pass
    HC-3: pass
    HC-4: pass
    HC-5: pass
    HC-6: pass
    HC-7: pass
    HC-8: pass

  hard_fail_ids: []

  rubric_scores:
    product_fit: 4
    hierarchy_clarity: 4
    originality_anti_generic: 4
    system_coherence: 4
    visual_craft: 3
    expression_control: 4
    route_fidelity: 4
    iteration_readiness: 4

  final_verdict: "PASS"
  implementation_ready: true
  retry_phase: null
```

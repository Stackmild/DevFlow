---
name: frontend-design
description: |
  WebApp 前端体验设计师（V2.7 — 4-Phase Workflow Gate）。
  先判断产品气质、用户心态与品牌气质，提出并比较多个视觉路线；
  选定路线后，通过 North-Star Screen 压到页面层，再建立可交付的视觉系统和页面规则。
  4-Phase 阻断式流程：Diagnosis → North-Star（硬 gate）→ System → Critique & Package。
  不再默认所有产品走同一种 B2B/中后台审美——设计系统是基础设施，不是审美终点。
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

# WebApp 前端设计 Skill（V2.7）

## 1. Skill 使命

先判断产品应该长什么样，再压到页面上验证，最后建立系统让它稳定地长成那样。

```
Phase 1: Diagnosis & Routing → Phase 2: North-Star（硬 gate）→ Phase 3: Systemization → Phase 4: Critique & Package
```

### 核心原则

1. 风格由产品驱动——不同产品应有不同的视觉人格
2. 先发散再收敛——必须先提出 2-3 条候选路线并比较，不允许直接进入 token 设计
3. 设计系统是基础设施，不是审美终点
4. 受约束的表达——表达层必须存在，但受 route 约束
5. 可交付性不打折——输出必须可被工程实现、可被审查验证
6. 质量有标尺——必须通过 hard checks + rubric 自评，低分触发回流，hard fail 阻断通过
7. 负向约束优先——anti-pattern guardrail 优先于正面风格追求
8. 交付有 contract——每次产出附带 `frontend-design-package`（YAML 摘要）

旧版 `professional / calm / precise / restrained / product-grade` 五词预设已删除。风格关键词从 Phase 1 产出。

---

## 2. 适用与不适用

| 适合 | 不适合 |
|------|--------|
| 新产品从 0 设计 WebApp 界面 | 纯品牌官网、营销活动页 |
| 已有产品视觉升级或去同质化 | 只要 Dribbble 效果图 |
| 数据型/内容型/AI-native 产品 | 已有严格设计系统且只需按规范执行 |
| 飞书妙搭 / Cowork 混合开发场景 | |

---

## 3. 边界

**负责**：视觉路线选择、视觉系统、token、page shell、组件形态、表达层、状态视觉、handoff

**不负责**：任务流逻辑（interaction-designer）、数据模型（backend-data-api）、代码实现（full-stack-developer）、发布策略（release-manager）

---

## 4. 输入要求

执行前确认（缺失则做合理假设并标注）：

- 产品类型、目标用户、核心任务
- 已有设计约束（宿主平台、设计系统、品牌规范）
- 上游 skill 输出：product-spec、architecture-spec、backend-contract（如有）
- 若 handoff-packet 含 `host_platform_context`，必须读取 `protected_host_files` 和 `cloud_build_only_deps`

---

## 5. 运行模式

| 模式 | 适用 | 输出重点 |
|------|------|----------|
| **完整模式** | 新产品/新模块从 0 设计 | 4-Phase 全流程 |
| **局部模式** | 单页/单模块/单组件 | Phase 1-2 必须，Phase 3-4 聚焦局部 |
| **诊断模式** | 改版/模板感/同质化 | Phase 1 诊断 → route 建议 → 修复优先级 |
| **风格分流模式** | 多产品对比 | 为每个产品做独立 Phase 1 → 对比差异 |

---

## 6. 4-Phase 工作流（阻断式）

### Phase 1 — Diagnosis & Routing

**强制**：7 维产品气质诊断（任务性质、用户心态、产品姿态、信息形态、交互节奏、表达强度、宿主约束）。

**强制**：输出 2-3 条候选视觉路线，每条含：适配产品类型、用户心态、关键词（≥5）、版式/色彩/形状/动效/密度倾向、优势、风险。

**必须**：选定 1 条主路线 + Rejected Directions + 退化预判 + 主动规避方式。

**禁止**：直接默认"专业、冷静、克制"。不允许跳过比较直接进入 token。

**阻断规则**：Route 未选定 → 不得进入 Phase 2。

### Phase 2 — North-Star Blueprint（硬 Gate）

至少选 1 个关键页面，按 `templates/north-star-screen-template.md`（11 字段）产出 North-Star Screen Spec。11 字段全部填写；Real Content 必须使用真实内容（禁止 placeholder → HF-2）；Route signature element 必须明确。

**阻断规则**：North-Star 未完成 → 不得进入 Phase 3。

### Phase 3 — System & Component Translation

基于选定 route 产出：
- 2-4 条体验原则（非通用"简洁高效"）
- Design Tokens（Color/Typography/Spacing/Radius/Border/Shadow/Motion/Density），每个分类注明 route 回溯理由
- Screen Architecture（page shell，标注 route 对应关系）
- Page Type Rules（数据型/内容型/AI 型，按需）
- Theme/Mode Strategy（按需）
- States（hover/active/focus/selected/disabled/loading/empty/error/success）
- Component Rules（≥3 个组件必须有"与 UI 库默认值不同的路线化定制点"）
- Handoff Notes（飞书妙搭 / Cowork / 前端工程 / 设计系统 / 测试）

**强制**：跨组件视觉和谐验证（Nav/Sidebar × Content 协调性、受限容器长标签策略、整体 tone 一致性宣言）。任一项未通过，需补充后才能进入 Phase 4。

**阻断规则**：系统层未产出 → 不得进入 Phase 4。

### Phase 4 — Critique & Gate

**Hard Checks**：执行 `checklists/frontend-design-hard-checks.md` 中的 8 项检查（6 Blocking + 2 Quality）。

**Anti-Degeneration Review**：对照 `reference/route-anti-patterns.md`，复检选定路线的退化信号、跨路线通用信号、Rejected Directions 是否被避免。

**Rubric Self-Review**：参照 `rubrics/design-quality-rubric.md` 的 8 个维度评分（1-5）。

**通过标准**：所有维度 ≥ 3，且至少 4 个维度 ≥ 4。

**Hard Fail（5 条，任一触发 → 不通过）**：
- HF-1：无 North-Star
- HF-2：placeholder 内容
- HF-3：≥3 退化信号
- HF-4：token drift
- HF-5：关键状态缺失

**Final Verdict**：
- **PASS** = hard_fail_ids 为空 且 所有 rubric ≥3 且 ≥4 维度 ≥4
- **FAIL-RETRY** = 可回退修复（有明确 retry_phase）
- **FAIL-ESCALATE** = 结构性问题需人工介入

**宿主平台约束自检**（handoff-packet 含 `host_platform_context` 时）：检查 protected_host_files、能力链可部署性、cloud_build_only_deps 提示。

**Token 自检**（P0-5）：产出前对照项目 `design/` 目录做 token audit（CSS 变量存在性、硬编码检查、状态一致性）。不合规项必须标注并修正，不能留给下游事后发现。

**Package 生成**：按 `templates/frontend-design-package.md` 生成 YAML summary。若触发 escalation 回退，回退完成后必须重新走 Phase 4 并重新生成 Package。

---

## 7. Route Library 快速索引

| # | 路线 | 一句话 |
|---|------|--------|
| 1 | Analytical Command Center | 高密度数据优先 |
| 2 | Executive Trust Console | 宽松高可信 |
| 3 | Editorial Research Workspace | 阅读优先杂志式 |
| 4 | AI-native Copilot Surface | 双面板柔和渐变 |
| 5 | Consumer-light Utility | 低密度暖色友好 |
| 6 | Narrative Insight Desk | 叙事驱动大面积图表 |
| 7 | Operational Control Plane | 极高密度终端美学 |

详细定义见 `reference/design-route-library.md`。选定后必须查阅 `reference/route-anti-patterns.md`。

---

## 8. 输出契约

标准输出按 `templates/design-spec.md` 的 4-Phase × 20 节结构，嵌入 `frontend-design-package`（Section 20）。

> Section 20 是质量元数据，不是视觉规范。Phase F backfill 不得将其写入 VISUAL-SYSTEM.md。

---

## 9. 一句话工作方式

> 先判断产品气质与视觉路线，再压到 North-Star 页面验证，最后建立系统；任何阶段未通过 checkpoint 都不得前进；风格差异化必须有理由、有约束、可落地。

---

## 外置参考

| 文件 | 使用时机 | 分级 |
|------|----------|------|
| `skills-source/frontend-design/reference/design-route-library.md` | Phase 1 路线选择 | Always read |
| `skills-source/frontend-design/reference/route-anti-patterns.md` | Phase 1 退化预判 + Phase 4 复检 | Always read |
| `skills-source/frontend-design/checklists/frontend-design-hard-checks.md` | Phase 4 Hard Checks | Always read |
| `skills-source/frontend-design/rubrics/design-quality-rubric.md` | Phase 4 Rubric 自评 | Always read |
| `skills-source/frontend-design/templates/north-star-screen-template.md` | Phase 2 North-Star 填写 | Template-only |
| `skills-source/frontend-design/templates/design-spec.md` | 最终输出结构 | Template-only |
| `skills-source/frontend-design/templates/frontend-design-package.md` | Phase 4 Package 生成 | Template-only |
| `skills-source/frontend-design/examples/worked-example-ai-copilot-workspace.md` | 需要完整参考时 | Conditional read |

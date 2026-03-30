# {产品/模块名} 前端设计说明

> 由 `frontend-design` skill V2.6 生成。
> 4-Phase 结构：Diagnosis & Routing → North-Star Blueprint → System & Component → Critique & Gate。

---

## Phase 1: Diagnosis & Routing

### 1. Product Context Summary

**产品名称**：
**产品类型**：
**目标用户**：
**核心任务**：
**已有设计约束**：

---

### 2. Design Axes Diagnosis（7 维）

| 维度 | 判断 | 依据 |
|------|------|------|
| 任务性质 | | |
| 用户心态 | | |
| 产品姿态 | | |
| 信息形态 | | |
| 交互节奏 | | |
| 表达强度 | | |
| 宿主约束 | | |

---

### 3. Candidate Routes（2-3 条）

#### 候选路线 A：{路线名称}
**适配产品类型**：
**适配用户心态**：
**关键词**（≥5 个）：
**版式倾向**：
**色彩倾向**：
**形状语言**：
**动效倾向**：
**信息密度**：
**优势**：
**风险**：

#### 候选路线 B：{路线名称}
{同上结构}

#### 候选路线 C：{路线名称}（可选）
{同上结构}

---

### 4. Selected Route + Why

**选定路线**：
**选定理由**：

---

### 5. Rejected Directions

本产品**不应该**像：
- {方向 1}——因为 {理由}
- {方向 2}——因为 {理由}

要刻意避免的模板感：
- {具体描述}

---

### 6. Anti-Degeneration Guardrails

**本路线最易退化为** → {退化方向}

**退化信号**（来自 route-anti-patterns.md）：
- {信号 1}
- {信号 2}

**主动规避方式**：
- {措施 1}
- {措施 2}

```
CHECKPOINT: Route selected: {路线名}. Rejected: {n} directions. Degeneration risks: {简述}.
```

---

## Phase 2: North-Star Blueprint

### 7. North-Star Screen Spec

> 按 `templates/north-star-screen-template.md`（11 字段）填写。至少 1 个关键页面。

#### {页面名称}

**1. 页面目标**：

**2. 首屏布局骨架**：

**3. 第一视觉焦点**：

**4. 信息层级**：
1.
2.
3.

**5. 关键交互区域**：

**6. 组件风格差异点**（≥2）：
-
-

**7. Route 具体体现（signature element）**：

**8. 最易退化点**（≥2）：
-
-

**9. 禁止项**（≥3）：
-
-
-

**10. 实现优先级**：
- P0：
- P1：

**11. Real Content**：
- **Real headline**：
- **Real support text**：
- **Real CTA**：
- **真实内容模块**：
  1.
  2.
  3.

```
CHECKPOINT: North-Star complete — {n} screens defined. Real content: {pass/fail}.
```

---

## Phase 3: System & Component

### 8. Experience Principles + Expression Layer

**Experience Principles**（2-4 条）：
1.
2.

**Visual Language**：
- 风格关键词（从 route 产出）：
- 色彩策略：
- 排版策略：
- 层级策略：
- 密度策略：
- 形状/材质/质感：

**Expression Layer**：
- Visual metaphor：
- Icon style：
- Illustration tone：
- Brand moments：
- Motion intensity：
- Content vs Data 语气差异：

---

### 9. Design Tokens（回溯 route）

#### Color Tokens
| Token | 值 | 用途 | Route 回溯 |
|-------|----|------|-----------|
| color.primary.500 | | | |
| color.semantic.success | | | |
| color.semantic.warning | | | |
| color.semantic.error | | | |
| color.surface.default | | | |
| color.surface.elevated | | | |
| color.text.primary | | | |
| color.text.secondary | | | |

#### Typography Scale
| 级别 | 字号 | 字重 | 行高 | Route 回溯 |
|------|------|------|------|-----------|
| heading-xl | | | | |
| heading-lg | | | | |
| body-md | | | | |
| label-md | | | | |

#### Spacing Scale
| Token | 值 | Route 回溯 |
|-------|----|-----------|
| space-2 | | |
| space-4 | | |
| space-6 | | |
| space-8 | | |

#### Radius / Border / Shadow
| 类型 | 值 | Route 回溯 |
|------|----|-----------|
| radius-sm | | |
| radius-md | | |
| shadow-sm | | |
| shadow-md | | |

---

### 10. Screen Architecture

**Page Shell**：
- 顶部导航高度：
- 侧边栏宽度（若有）：
- 主内容最大宽度：
- 主内容左右 padding：
- **Route 对应关系**：{shell 如何体现选定 route}

**First-view scan order**：
**模块分组规则**：

---

### 11. Page Type Rules（按需）

#### 数据型（按需激活）
- Dashboard：
- Data Table：
- Form：
- Detail：

#### 内容型（按需激活）
- Article card：
- Reading view：
- Summary card：

#### AI 型（按需激活）
- Chat bubble：
- Canvas：
- Suggestion card：

---

### 12. Theme / Mode Strategy（按需）

**是否需要 mode architecture**：{是/否}
**理由**：

{如需要，列出具体 mode：Light/Dark / Brand / Role / Density / Host-sync / Accessibility}

---

### 13. State / Feedback Expression

| 状态 | 视觉表达 | 颜色/图标 | Route 对齐说明 |
|------|---------|---------|---------------|
| loading | | | |
| empty | | | |
| error | | | |
| disabled | | | |
| hover | | | |
| active | | | |
| success | | | |

---

### 14. Component Rules（≥3 非默认定制点）

| 组件 | Variant | Size | 状态 | 路线化定制点 |
|------|---------|------|------|------------|
| Button | | | | |
| Card | | | | |
| Table | | | | |
| Form | | | | |
| Navigation | | | | |

**与 UI 库默认值不同的定制点**（≥3 个）：
1. {组件} — 默认: {X} → 定制: {Y}（理由: route {Z}）
2.
3.

---

### 15. Handoff Notes

#### 给飞书妙搭
-

#### 给 Cowork / 前端工程
- Token 进入 theme 方式：
- 禁止写死的值：
- 需封装的组件：

#### 给设计系统维护
- 需新增 token：
- 需新增 primitives：

#### 给测试/审查
- 最容易视觉漂移的页面：
- 必须 screenshot diff 的状态：

```
CHECKPOINT: System layer complete — {n} token categories, {n} custom component points.
```

---

## Phase 4: Critique & Gate

### 16. Hard Checks Result

| HC | 检查项 | 类型 | 结果 | 备注 |
|----|--------|------|------|------|
| HC-1 | Route Selection | Blocking | | |
| HC-2 | North-Star | Blocking | | |
| HC-3 | Placeholder | Blocking | | |
| HC-4 | Token 最小集 | Quality | | |
| HC-5 | Token Drift | Blocking | | |
| HC-6 | 关键状态 | Blocking | | |
| HC-7 | 组件定制点 | Quality | | |
| HC-8 | 退化信号 | Blocking | | count: |

**Blocking 结果**：
**Quality 结果**：

---

### 17. Anti-Degeneration Review

**选定路线退化信号复检**：
- {信号} — {触发/未触发}

**跨路线通用信号匹配数量**：{n}/5

**Rejected Directions 逐条验证**：
- {方向 1} — {确已避免/仍存在}

---

### 18. Rubric Self-Review（8 维度 + evidence）

| 维度 | 得分 | Evidence Basis |
|------|------|---------------|
| Product Fit | | |
| Hierarchy Clarity | | |
| Originality / Anti-Generic | | |
| System Coherence | | |
| Visual Craft | | |
| Expression Control | | |
| Route Fidelity | | |
| Iteration Readiness | | |

**Hard Fail 检查**：{通过 / 触发 HF-X}
**Rubric 判定**：{PASS / FAIL-RETRY(Phase X) / FAIL-ESCALATE}

---

### 19. Final Verdict

**Verdict**：{PASS / FAIL-RETRY / FAIL-ESCALATE}
**Implementation Ready**：{true / false}
**Retry Phase**：{Phase 1 / Phase 2 / Phase 3 / null}

---

### 20. frontend-design-package

> ⚠️ 本节是质量元数据，不是视觉规范。Phase F.5 backfill 不得将本节内容写入 VISUAL-SYSTEM.md。

```yaml
frontend_design_package:
  version: "v2.6"
  mode: ""
  route_selected: ""
  rejected_routes_count: 0
  north_star_count: 0
  real_content_pass: false
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
    product_fit: 0
    hierarchy_clarity: 0
    originality_anti_generic: 0
    system_coherence: 0
    visual_craft: 0
    expression_control: 0
    route_fidelity: 0
    iteration_readiness: 0

  final_verdict: ""
  implementation_ready: false
  retry_phase: null
```

---

*此模板由 `frontend-design` skill V2.6 提供。*

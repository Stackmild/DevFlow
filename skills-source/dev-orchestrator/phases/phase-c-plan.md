# Phase C — Plan

> 目标：设计方案（架构/交互/视觉）+ 实现计划（implementation-scope.md）

## PHASE C PROTOCOL

```
INPUT:
  - task.yaml: Phase B completed + Gate 1 decision = GO
  - artifacts/product-spec.md 存在且非空
  - decisions/gate-1.yaml 存在

ORCHESTRATOR_ROLE:
  - 运行 Capability Selector（MUST-DO action，不可跳过）
  - 按 selector 结果 dispatch 设计 sub-agents
  - 收集产出，确保 implementation-scope.md 由 sub-agent 产出
  - 不写设计 specs、不写 implementation-scope.md

SUB_AGENT_ROLE:
  - 设计 agents 产出 architecture-spec、backend-contract、interaction-spec、frontend-design-spec
  - Planner 产出 implementation-scope.md

MUST_PRODUCE:
  - artifacts/implementation-scope.md（MUST be produced by sub-agent）
  - Design artifacts per Capability Selector result
  - decisions/routing-decision-C.yaml
  - decisions/gate-2.yaml（或 gate-2-skip.yaml 如 Phase C 被 skip）
  - handoffs/ 中每个 dispatched skill 有对应 packet

EXIT_GATE:
  - implementation-scope.md 存在（verified source_skill metadata ≠ orchestrator）
  - routing-decision-C.yaml 存在
  - gate-2.yaml 存在且 decision = PROCEED（或 gate-2-skip.yaml 存在）
  - 每个 dispatched skill 有 handoff-packet
  - completed_stages 含每个完成的 skill
  - task.yaml live state 已更新（current_phase→phase_d_1）
  - EVENTS_REQUIRED 全部满足

EVENTS_REQUIRED:
  - skill_dispatched(each matched skill)
  - artifact_consumed(product-spec → each skill)
  - artifact_created(each design artifact)
  - skill_completed(each matched skill)
  - gate_requested(scope)
  - gate_decision(scope)
  - phase_completed(phase_c)
```

> **设计原则**: Capability Selector 的长期 source of truth 应逐步从 narrative docs 转向 machine-readable config（如 `routing/phase-c-selector.yaml`）。当前 selector 在本文档中以 narrative 形式承载，是第一轮过渡。

---

## Phase Entry Protocol

⚠️ GATE: `node scripts/devflow-gate.mjs enter_phase --task-dir {state_dir} --phase phase_c`

1. Read `task.yaml`（确认 Phase B completed 或 Gate 1 通过）
2. Read `artifacts/product-spec.md`（Phase B 产出）
3. Read 本文档

## Capability Selector

⚠️ **Phase 2 方向预告**：`../routing/phase-c-selector.yaml` 已包含 V1.0 config 规则，但**当前尚未激活为运行时真相源**（状态：P1 / not yet authoritative）。正式激活前，下方 narrative rules 仍为执行依据。

基于 task_type + scope tags，对照以下表选择 skill。

⚠️ **Capability Selector 是 MUST-DO action，不是参考建议。** 匹配结果写入 routing-decision-C.yaml 后，必须按匹配结果 dispatch。偏离匹配结果必须有 `deviations` 字段说明原因。

⚠️ **orchestrator 不可自己写 implementation-scope.md**——必须由 sub-agent 产出。违反此规则 = 违反铁律 #13。

```
IF task_type = new_feature:
  IF scope includes "data model" or "API" → spawn architect + backend-data-api
  IF scope includes "UI" or "interaction" → spawn interaction-designer
  IF scope includes "visual design" → spawn frontend-design
  ALWAYS → spawn planner sub-agent 产出 implementation-scope.md

IF task_type = feature_iteration:
  IF scope change ≥ 5 items OR includes new data model → spawn architect
  IF scope change < 5 items AND no new data model → spawn planner（轻量模式）
  ⚠️ orchestrator 不可自己写 implementation-scope.md

IF task_type = bugfix:
  SKIP Phase C → 写 skip rationale 到 decisions/
  Phase D 的 handoff-packet 中标注 scope-light-mode: true
  scope contract 由 Phase B 的 product-spec.md 代替
```

### Routing Decision 记录

Selector 输出**必须**写入 `decisions/routing-decision-C.yaml`：

```yaml
phase: C
task_type: "{task_type}"
scope_tags: ["{tag1}", "{tag2}"]
matched_skills: ["{skill1}", "{skill2}"]
skipped_skills:
  - skill: "{skill}"
    reason: "{为什么不调用}"
deviations: []       # 如果不 dispatch 某个匹配的 skill
decided_at: "{timestamp}"
```

## Sub-agent Dispatch

每次 spawn 前：
1. Read `./contracts/handoff-packet.md`（如首次）
2. 构造 handoff-packet → 写入 `handoffs/handoff-C-{skill}-{seq}.yaml`
3. 写 events.jsonl（skill_dispatched）
4. 写 events.jsonl（artifact_consumed —— 消费回执，记录 product-spec 被采纳）

### Sub-agent Prompt 模板

```
PART A：角色 + 任务 + 平台约束
+ task-brief + product-spec + platform_capabilities
+ "平台已提供 {X, Y, Z}，不需要为这些设计独立模块。"

PART B：完整 Skill 指令
PART C：上游 Artifact（只传相关的）
PART D：输出指令 + 标注格式
```

### Artifact 传递映射

| Sub-agent | 收到的上游 artifact |
|-----------|-------------------|
| architect | task-brief + product-spec |
| backend | task-brief + product-spec + architecture-spec |
| interaction | task-brief + product-spec + architecture-spec + backend-contract |
| frontend | task-brief + product-spec + architecture-spec + interaction-spec |
| planner | task-brief + product-spec + 所有已产出的设计 artifact |

### Phase Exit Condition（每个 skill 完成后）

1. 写入 `artifacts/{artifact-name}.md`（含 `<!-- source_skill: ... -->` 元数据）
2. 更新 task.yaml completed_stages
3. 检查 sub-agent 产出中的 `[ISSUE→X]` → 写入 `issues/`
4. 追加 changelog + events.jsonl（artifact_created + skill_completed）
5. **写 consumption receipt**：events.jsonl artifact_consumed（product-spec 被 adopted + adoption_impact）
6. 确认全部写入后，才 spawn 下一个 skill

⚠️ CONTINUITY: 最后一个 design skill 返回后，到 Gate 2 展示必须连续完成（artifact 写入 → events → task.yaml → pre-gate-check-2 → Gate 2 展示）。参见 `../protocols/write-through-actions.md §Sub-agent Return Continuity Protocol`。

## Pre-Gate 2 Self-Check

⚠️ Gate 2 展示前，必须执行 `../protocols/pre-gate-self-check.md` §2.2（PG2-1~8）。
必须写入 `decisions/pre-gate-check-2.yaml`。`result=blocked` 时 Gate 2 不展示。

## Gate 2：Scope & Architecture

所有设计 sub-agent 完成后、进入 Phase D 前，必须展示 Gate 2 供用户确认 scope。

### Gate 2 轻重判定规则

| 条件 | 展示模式 |
|------|---------|
| task_type IN [new_feature, design_only] | 完整版 |
| task_type = feature_iteration AND scope_items > 3 | 完整版 |
| task_type = feature_iteration AND scope_items ≤ 3 | 轻量版 |
| task_type IN [bugfix, hotfix] AND Phase C skipped | Gate 2 也 skip（需写 gate-2-skip.yaml） |
| task_type IN [bugfix, hotfix] AND Phase C 未 skip | 轻量版 |

### Gate 2 展示模板 — 完整版

```
## 📐 Gate 2 — Scope & Architecture

### Implementation Scope

**做什么**：
{从 implementation-scope.md 提取 in-scope 列表}

**不做什么**：
{out-of-scope 列表}

### Architecture Impact

| 维度 | 影响 |
|------|------|
| 涉及模块/文件 | {module list} |
| 新模块 | {yes/no + details} |
| 新数据模型/schema | {yes/no + details} |
| 新 API | {yes/no + details} |
| UI/交互变化 | {yes/no + details} |

### Design Artifacts

| Artifact | 产出 Skill | 状态 |
|----------|-----------|------|
| architecture-spec.md | web-app-architect | {✅ / 未产出 / skipped} |
| implementation-scope.md | planner | {✅ / 未产出} |

### 请选择

- **[PROCEED]** 确认方案，进入 Phase D
- **[RESCOPE]** 调整范围（回到 Phase C 重新设计）
- **[PAUSE]** 保存，稍后继续
```

### Gate 2 展示模板 — 轻量版

```
## 📐 Gate 2 — Scope Confirmation

**本轮范围**：{3-5 行摘要}
**主要变更文件**：{file list}
**新模块/新数据/新 API**：{无 / 有则列出}

- **[PROCEED]** 确认，进入执行
- **[RESCOPE]** 调整范围
```

### Gate 2 decision schema

```yaml
gate: 2
gate_type: scope
decision: PROCEED | RESCOPE | PAUSE
display_mode: full | lightweight
scope_item_count: {N}
new_modules: true | false
new_data_model: true | false
new_api: true | false
ui_changes: true | false
user_notes: ""
decided_at: "ISO 8601"
```

### Gate 2 skip 充要条件

Gate 2 可 skip，当且仅当以下**全部**为真：
1. Phase C 整体被 skip（`decisions/phase-skip-C-*.yaml` 已写入）
2. task_type IN [bugfix, hotfix]
3. scope_item_count ≤ 3
4. 无新模块、无新数据模型、无新 API

满足以上全部 → 写 `decisions/gate-2-skip.yaml`，不写 `gate-2.yaml`。
**不满足任一条件 → 必须展示 Gate 2（轻量或完整版）。**

```yaml
# gate-2-skip.yaml 最小字段规范
gate: 2
gate_type: scope
decision: SKIP
skip_reason: "{为什么 skip — 如 'Phase C 整体被 skip，bugfix 无独立设计阶段'}"
task_type: "{当前 task_type}"
scope_item_count: {N}
why_skip: "{为什么判定不需要人工 scope 确认 — 如 'bugfix，scope ≤3 项且无新模块/数据模型/API'}"
phase_c_skip_ref: "decisions/phase-skip-C-{skill}.yaml"
decided_at: "ISO 8601"
```

### Gate 2 RESCOPE 回流

RESCOPE → Phase C 不退出，重新 dispatch 设计 skill（新 handoff-packet，supersedes 前一个）。

**最大 RESCOPE 次数 = 1**：第二次 RESCOPE → 强制升级为 PAUSE，要求人工介入。
**PAUSE 恢复路径**：人工介入后从 Phase C 续接（重新 dispatch 设计 skill），不回退到 Phase B（Gate 1 方向已确认）。

### Gate 2 后必须执行

1. 写入 `decisions/gate-2.yaml`（或 `gate-2-skip.yaml`）
2. 追加 changelog + events.jsonl（gate_requested(scope) + gate_decision(scope)）

---

## Phase C Exit Checklist

```
⚠️ Phase C Exit Checklist:
- [ ] implementation-scope.md 写入 artifacts/（由 sub-agent 产出，非 orchestrator）
- [ ] decisions/routing-decision-C.yaml 写入
- [ ] decisions/gate-2.yaml 写入（或 gate-2-skip.yaml 如 Phase C 被 skip）
- [ ] handoffs/ 中有对应的 handoff-packet
- [ ] completed_stages 更新
- [ ] events.jsonl 有 gate_requested(scope) + gate_decision(scope) 事件
- [ ] events.jsonl 有 artifact_consumed receipt（product-spec → design skill）
- [ ] `decisions/pre-gate-check-2.yaml` 写入（或 gate-2-skip 场景下确认 PG2-8 通过）
```

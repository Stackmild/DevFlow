# DevFlow Event Protocol — Contracted Execution

> 本文档定义 events.jsonl 的事件结构和所有事件类型。
> Orchestrator 在 Phase -1 预加载本文档为 `$EVENT_PROTOCOL`。
> V2：加入 trace IDs（trace_id + span_id + parent_span_id）和因果关系字段。

---

## 1. 通用事件 Schema

每个事件占且仅占 events.jsonl 中的一行（JSON Lines 格式）。

### 核心字段

| 字段 | 必需 | 类型 | 说明 |
|------|------|------|------|
| `event_id` | required | string | 格式：`evt_{YYYYMMDD_HHMMSS}_{3位seq}`，seq 在同一 run 内递增 |
| `event_version` | required | string | 固定 `"2.0"` |
| `timestamp` | required | string | ISO 8601 |
| `task_id` | required | string | 所属 task |
| `run_id` | required | string | 所属 run（格式：`run_{task_id}_{YYYYMMDD}_{seq}`） |
| `actor_type` | required | enum | `orchestrator` / `sub_agent` / `human` / `monitor` |
| `actor_id` | required | string | 具体角色标识 |
| `event_type` | required | string | 见下方事件类型表 |
| `payload` | required | object | 事件类型特有的数据（见第 2 节） |

### Trace 字段

| 字段 | 必需 | 类型 | 说明 |
|------|------|------|------|
| `trace_id` | required | string | 整个 task 生命周期共享一个 trace_id（task 创建时生成，含 resume） |
| `span_id` | required | string | 每个 skill dispatch 一个 span_id；phase 级别也有 span |
| `parent_span_id` | optional | string | 嵌套 span 的父级（如 review span 的父级是 review-phase span） |

### 因果关系字段

| 字段 | 必需 | 类型 | 说明 |
|------|------|------|------|
| `caused_by_event_id` | optional | string | 这个事件由哪个事件触发（如 revision 由 review finding 触发） |
| `caused_by_issue_id` | optional | string | 如果事件由某个 issue 触发 |

### 关联对象字段

| 字段 | 必需 | 类型 | 说明 |
|------|------|------|------|
| `related_handoff_id` | optional | string | 关联的 handoff-packet ID |
| `related_change_package_id` | optional | string | 关联的 change-package ID |
| `upstream_refs` | optional | string[] | 使用 Reference Convention（见第 3 节） |
| `severity` | optional | enum | 仅异常事件需要 |

---

## 2.1 Canonical Event Type Enum（V4.3 — 闭集）

⚠️ **`event_type` 是闭集（closed enum）。** orchestrator 和所有 sub-agent 只允许使用以下值。任何不在此列表中的 event_type 视为 protocol violation（state-auditor CHECK-7 检测）。

| # | event_type | 类别 |
|---|-----------|------|
| 1 | `task_initialized` | lifecycle |
| 2 | `task_resumed` | lifecycle |
| 3 | `task_completed` | lifecycle |
| 4 | `phase_entered` | lifecycle |
| 5 | `phase_completed` | lifecycle |
| 6 | `phase_skipped` | lifecycle |
| 7 | `skill_dispatched` | dispatch |
| 8 | `skill_completed` | dispatch |
| 9 | `artifact_created` | artifact |
| 10 | `artifact_consumed` | artifact |
| 11 | `gate_requested` | gate |
| 12 | `gate_decision` | gate |
| 13 | `issue_raised` | issue |
| 14 | `issue_resolved` | issue |
| 15 | `risk_accepted` | issue |
| 16 | `handoff_created` | contract |
| 17 | `change_package_created` | contract |
| 18 | `continuation_initiated` | continuation |
| 19 | `inline_fallback` | fallback |
| 20 | `review_format_fallback` | fallback |
| 21 | `review_inline_fallback` | fallback |
| 22 | `state_conflict_detected` | conflict |
| 23 | `state_conflict_resolved` | conflict |
| 24 | `run_summary_emitted` | audit |
| 25 | `revision_applied` | audit |
| 26 | `known_gaps_collected` | audit |
| 27 | `unknown_action_detected` | audit |

### 禁止的别名

以下是 V4.2 试点中观察到的非标名称。如果 orchestrator 产出这些名称 → protocol violation：

| 非标名称 | 正确名称 | 说明 |
|----------|---------|------|
| `gate_b_presented` | `gate_requested` | gate_requested 统一用于所有 Gate |
| `gate_b_accepted` | `gate_decision` | gate_decision 统一用于所有 Gate |
| `phase_completed(phase_f)` 替代 task 完结 | `task_completed` | phase_completed 只记录 phase 级别完成，task 级别完成必须用 task_completed |
| `phase_skip` | `phase_skipped` | 正确名称带 -ed 后缀（V4.3 试点发现） |

---

## 2. 事件类型与 Required Payload Fields

### 生命周期事件

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `task_initialized` | task_id, is_resume(boolean) | task 被创建 |
| `task_resumed` | previous_run_id, resume_checkpoint, completed_stages_count, open_issues_count | 跨 session 恢复 |
| `task_completed` | final_status, total_stages, total_issues, total_gaps | task 完成 |
| `phase_entered` | phase, entry_conditions_met(boolean) | 进入一个新 phase（V4.3 新增） |

### Skill Dispatch 事件

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `skill_dispatched` | skill_name, handoff_id, stage | sub-agent 被 spawn（关联 handoff-packet） |
| `skill_completed` | skill, artifact, phase | sub-agent 执行完成 |
| `phase_completed` | phase | 一个 phase 整体完成 |
| `phase_skipped` | skill_name, skip_reason | 设计 phase 被跳过 |

### Artifact 事件

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `artifact_created` | artifact_id, artifact_type(`design`/`implementation`/`review`/`handoff`/`state`/`change_package`), source_skill | artifact 被创建 |
| `artifact_consumed` | artifact_id, consumed_by_skill, consumed_at_phase, adopted(boolean), adoption_impact(string), contract_conflicts(array), rejection_reason(string\|null) | artifact 被下游消费（消费回执） |

### Issue / Risk / Override 事件

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `issue_raised` | issue_id, object_family(`issue`/`risk`/`override`), source_skill, target_skill, severity | 对象被创建 |
| `issue_resolved` | issue_id, resolution(`revised`/`wont_fix`/`deferred`/`accepted_risk`) | 对象被关闭 |
| `risk_accepted` | risk_id, decision, decision_by | 风险被正式接受 |

### Gate 事件

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `gate_requested` | gate_type(`direction`/`scope`/`final`), presented_options | Gate 展示给用户 |
| `gate_decision` | gate_type, decision, user_notes | 用户做出 Gate 决策 |

### Handoff / Change Package 事件

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `handoff_created` | handoff_id, handoff_type, target_platform | handoff 文件生成 |
| `change_package_created` | package_id, revision_seq, files_count, unresolved_risks_count | change-package 被产出 |

### 审计与治理事件

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `run_summary_emitted` | total_events, total_anomalies, coverage(object) | post-run 审计摘要 |
| `revision_applied` | skill, revision_number, resolved_issue_id | 回流修订完成 |
| `known_gaps_collected` | gap_count | known gaps 归集完成 |
| `unknown_action_detected` | source_skill, raw_action_value | 审查产出未知 ACTION |

### Runtime Fallback 事件（V4.1 新增）

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `inline_fallback` | skill_name, attempt_count, first_spawn_result, second_spawn_result, rationale, content_scope, confidence(`low`/`medium`) | orchestrator 因 sub-agent 2 次失败后自行产出内容 |
| `review_format_fallback` | reviewer_name, expected_format(`yaml`), actual_format(`prose`/`partial_yaml`), extracted_findings_count | reviewer 未产出 YAML 但 orchestrator 提取了 findings |
| `review_inline_fallback` | reviewer_name, attempt_count, checklist_items_checked, confidence(`low`/`medium`) | reviewer 2 次失败后 orchestrator 做 checklist review |
| `continuation_initiated` | continuation_type(`re_enter_d`/`follow_up_task`/`light_patch`/`non_code_action`/`record_and_stop`/`multi_item`), trigger_description, decision_file, scope_delta | Gate 3 后续行协议启动（`multi_item` 用于标记整个 continuation 是多项处理） |

### State Conflict 事件（V4.2 新增）

| event_type | required payload fields | 说明 |
|------------|------------------------|------|
| `state_conflict_detected` | conflict_type(`phase_mismatch`/`issues_count_mismatch`/`completed_phases_mismatch`), conflicting_values(object), detected_at_phase | state 层之间不一致被发现 |
| `state_conflict_resolved` | conflict_type, resolution_method(`auto_repair`/`manual`), repaired_fields | 冲突被修复 |

---

## 3. Reference Convention

所有 `upstream_refs`、`evidence_refs` 和跨实体引用统一使用以下格式：

| Ref 类型 | 格式 | 示例 |
|---------|------|------|
| Artifact | `artifact:{artifact_id}` | `artifact:architecture-spec.md` |
| Issue | `issue:{issue_id}` | `issue:issue-001` |
| Risk | `risk:{risk_id}` | `risk:risk-001` |
| Override | `override:{override_id}` | `override:override-001` |
| Event | `event:{event_id}` | `event:evt_20260320_003` |
| Decision | `decision:{decision_id}` | `decision:gate-a` |
| Handoff Packet | `handoff:{handoff_id}` | `handoff:handoff-impl-fsd-001` |
| Change Package | `package:{package_id}` | `package:change-package-0` |
| State field | `state:{file}#{field_path}` | `state:task.yaml#platform_capabilities` |

---

## 4. ID 生成规则

### trace_id
- 格式：`trace_{task_id}`
- task 创建时生成，整个 task（含所有 resume）共享一个 trace_id
- 不随 run 变化

### span_id
- 格式：`span_{stage}_{skill}_{seq}`（如 `span_impl_fsd_001`）
- 每次 skill dispatch 生成新 span
- phase 级别也有 span（如 `span_review_phase_001`）
- span 可以嵌套（parent_span_id 指向父级）

### event_id
- 格式：`evt_{YYYYMMDD_HHMMSS}_{3位seq}`
- seq 在同一 run 内从 `001` 递增
- 任何恢复（Resume Flow）= 新 run_id，seq 从 `001` 重新开始

### run_id
- 格式：`run_{task_id}_{YYYYMMDD}_{seq}`
- 每次新 session 或 resume 生成新 run_id
- seq 从 `001` 开始，同一 task 多次 run 递增

### handoff_id
- 格式：`handoff-{stage}-{skill}-{seq}`（如 `handoff-impl-fsd-001`）
- seq 在同一 task 内递增
- re-spawn 时生成新 handoff_id，旧 id 通过 `supersedes_handoff_id` 关联

### package_id
- 格式：`change-package-{revision_seq}`（如 `change-package-0`）
- revision_seq 从 0 开始（首轮实现），每次 revision 递增

---

## 5. 写入规则

- events.jsonl 和 changelog.md **双写**——每个写 changelog 的位置同时写 events.jsonl
- **events.jsonl 先写，changelog.md 后写**——events.jsonl 是 canonical store
- **仅追加**（append-only），不修改不删除
- 每个事件占且仅占一行，行尾换行符
- 向后兼容：已有 task 无 events.jsonl 时，首次写事件时创建，从 seq=001 开始
- ⚠️ 禁止：把整个 events.jsonl 当 JSON 数组重写；禁止在一行中写多个事件

## 5.5 Semantic Minimum Set（V4.1 新增）

Phase Exit Gate 检查 **"是否所有 required 语义事件都存在？"** 而非 "是否有 N 行？"

| Phase | Required Semantic Events |
|-------|------------------------|
| A | `task_initialized`（兼做 `phase_entered(phase_a)`）, `phase_completed(phase_a)` |
| B | `phase_entered(phase_b)`, `skill_dispatched(PM)`, `skill_completed(PM)`, `artifact_created(product-spec)`, `gate_requested(direction)`, `gate_decision(direction)`, `phase_completed(phase_b)` |
| C | `phase_entered(phase_c)`, `skill_dispatched(each matched skill)`, `artifact_consumed(product-spec → each skill)`, `artifact_created(each design artifact)`, `skill_completed(each matched skill)`, `gate_requested(scope)`, `gate_decision(scope)`, `phase_completed(phase_c)` |
| D.1 | `phase_entered(phase_d)`, `skill_dispatched(fsd)`, `artifact_consumed(design → fsd)`, `artifact_created(change-package)`, `skill_completed(fsd)` |
| D.2 | `skill_dispatched(each reviewer)`, `artifact_consumed(change-package → reviewer)`, `artifact_created(each review-report)`, `issue_raised(each P0/P1 finding)` |
| D.3 | `gate_requested(final)`, `gate_decision(final)`, `known_gaps_collected` |
| F | `phase_entered(phase_f)`, `task_completed` |
| Gate 3 后 | `continuation_initiated`（如发生续行），continuation_type 区分 `re_enter_d` / `follow_up_task` / `light_patch` / `non_code_action` / `record_and_stop` / `multi_item` |

⚠️ Phase A 例外：`task_initialized` 兼做 `phase_entered(phase_a)`，不额外要求独立 `phase_entered` 事件。

⚠️ 所有 event_type 必须使用 §2.1 闭集中的 canonical name。非闭集名称 = protocol violation。

⚠️ "each" 表示对照 `decisions/routing-decision-{phase}.yaml` 中 `matched_skills` 列表逐一检查。

⚠️ D.2 的 `artifact_consumed(change-package → reviewer)` 是必须事件——reviewer 必须被证明拿到了 change-package 和上游设计 artifact。

---

## 6. 三层日志关系

| 层 | 文件 | 角色 | 格式 |
|----|------|------|------|
| canonical | events.jsonl | 权威事实源，支持 trace 查询和自动化审计 | JSON Lines |
| snapshot | task.yaml | 当前快照（理论上可从 events 重建） | YAML |
| summary | changelog.md | 人类可读摘要（理论上可从 events 生成） | Markdown |

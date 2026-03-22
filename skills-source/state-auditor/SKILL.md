---
name: state-auditor
description: |
  State Store 完整性审计 Skill（Stage 2）。
  在 orchestrator 完成 Gate 3（ACCEPT/ACCEPT_WITH_HANDOFF）后被 spawn，
  只读 state store，检查结构化证据的完整性和一致性，产出审计报告到 monitor/ 目录。
  不修改主链路任何文件，不审查代码质量（那是 code-reviewer 的职责）。
  Layer B（质量层），与 code-reviewer / consistency-audit 并列。
triggers:
  - state-auditor
  - state审计
  - 审计state
  - post-run audit
---

# State Auditor — State Store 完整性审计

## 角色

你是 **State Store 审计员**。你的唯一职责是检查 DevFlow 任务的 state store 是否完整、一致、可追溯。

你**不做**：
- 不审查代码质量（code-reviewer 的职责）
- 不审查设计一致性（consistency-audit 的职责）
- 不修改主链路文件（task.yaml / artifacts/ / issues/ / decisions/）
- 不做实时监控（Stage 4 的能力）
- 不做 policy enforcement（Stage 3 的能力）

---

## 输入契约

| 输入 | 来源 | 必需 |
|------|------|------|
| task_id | orchestrator prompt | ✅ |
| run_id | orchestrator prompt | ✅ |
| event-protocol.md | 预加载（`../dev-orchestrator/event-protocol.md`） | ✅ |

收到 task_id 后，自行读取 `orchestrator-state/{task_id}/` 下的所有文件。

---

## 7 项检查

### CHECK-1：task.yaml 关键字段填充率

检查以下 4 个字段是否非空（空列表 `[]` 或空字符串 `""` 视为未填充）：
- `platform_capabilities`
- `execution_plan`
- `completed_stages`
- `task_type`

结果：`{filled}/4`。未填充 → anomaly type=A6, severity=High。

### CHECK-2：completed_stages 与 artifacts/ 文件匹配

**正向检查**：`completed_stages` 中每个条目的 `artifact` 字段 → `artifacts/{artifact}` 文件是否存在且非空。
**反向检查**：`artifacts/` 中每个文件（排除 `.gitkeep`）→ 是否在 `completed_stages` 中注册。

不匹配 → anomaly type=A2, severity=High。

### CHECK-3：completed task 中 open blocker

如果 `task.yaml status = completed`：
- 读取 `issues/` 中所有 `.yaml` 文件
- 检查是否有 `severity: blocker` 且 `status ≠ resolved`

有 → anomaly type=A4-variant, severity=Critical。

### CHECK-4：completed task 中 pending handoff

如果 `task.yaml status = completed`：
- 检查 `pending_handoffs` 中是否有 `status: pending`

有 → anomaly type=A5, severity=Medium。

### CHECK-5：decisions/ 中 Gate 决策记录

- 检查 `decisions/gate-a.yaml` 是否存在且非空
- 如果 task 到达 Gate 3（status 为 completed/paused），检查 `decisions/gate-3.yaml` 是否存在且非空

缺失 → anomaly type=A1, severity=High。

### CHECK-6：events.jsonl 执行路径完整性

如果 `events.jsonl` 不存在 → anomaly severity=Info（"legacy task, no event log"），不记为 High。

如果存在，按以下逻辑匹配：
- 每个 `completed_stages` 条目 → 至少有 1 个 `skill_completed` 事件（匹配 skill 名）
- 每个 `artifacts/` 中的文件 → 至少有 1 个 `artifact_created` 事件（匹配 artifact_id）
- `decisions/` 中每个 gate 文件 → 至少有 1 对 `gate_requested` + `gate_decision` 事件

不匹配项 → anomaly description="event gap: {具体缺失}", severity=Medium。

### CHECK-7：events.jsonl 格式校验 + Canonical Enum 检测（V4.3 扩展）

逐行检查 events.jsonl：
- 每行是否为合法 JSON
- 每个合法 JSON 行是否有 `event_type` 和 `timestamp` 字段
- **V4.3 新增**：每个 `event_type` 值是否属于 `event-protocol.md §2.1 Canonical Event Type Enum` 闭集。非闭集名称（如 `gate_b_presented`、`gate_b_accepted`）→ anomaly type=A7, severity=High（"non-canonical event_type: {value}, expected: {canonical}"）

非法行数 / 总行数 → 如非法行 > 0，anomaly severity=High。

---

## 输出契约

### 人类可读版：`monitor/run-audit-{run_id}.md`

```markdown
# Run Audit Report

- **Task**: {task_id}
- **Run**: {run_id}
- **Audit Time**: {ISO 8601}
- **Task Status**: {status}

## Coverage Summary

| 项目 | 结果 |
|------|------|
| State 字段填充 | {N}/4 |
| Artifact 注册匹配 | {matched}/{total}（正向 {N}/{M}，反向 {N}/{M}） |
| Issue Lifecycle 完整 | {resolved}/{total} |
| Gate Decision 记录 | {found}/{expected} |
| Event 记录完整性 | {matched}/{expected}（如无 events.jsonl: "N/A - legacy task"） |
| Event 格式校验 | {valid_lines}/{total_lines} |

## Anomalies Found

| # | Type | Severity | Description | Evidence |
|---|------|----------|-------------|----------|
| 1 | {A1-A7} | {severity} | {描述} | {evidence ref} |

## Recommendations

- {建议列表}
```

### 机器可解析版：`monitor/run-audit-{run_id}.json`

```json
{
  "audit_id": "audit_{task_id}_{timestamp}",
  "task_id": "{task_id}",
  "run_id": "{run_id}",
  "audit_time": "{ISO8601}",
  "coverage_summary": {
    "state_field_fill": "{N}/4",
    "artifact_registration": "{matched}/{total}",
    "issue_lifecycle": "{resolved}/{total}",
    "decision_capture": "{found}/{expected}",
    "event_completeness": "{matched}/{expected}",
    "event_format": "{valid}/{total}"
  },
  "anomalies": [],
  "recommended_actions": []
}
```

---

## 自检清单

审计完成前，确认：
- [ ] 读取了 state store 所有相关文件（含 handoffs/、artifacts/change-package-*.yaml、decisions/routing-decision-*.yaml）
- [ ] 19 项 CHECK 全部执行（原 7 项 + CHECK-8 至 CHECK-19）
- [ ] anomalies 有 evidence ref（使用 Reference Convention）
- [ ] 产出了 .md 和 .json 两个文件到 monitor/
- [ ] 没有修改主链路的任何文件

### CHECK-8：Handoff Packet 完整性（Contracted Execution）

检查 `handoffs/` 目录中每个 `handoff-*.yaml` 文件：
- 是否有 `handoff_id` 和 `packet_created_at` 字段
- `input_artifacts[]` 是否每项都有 `generated_at`
- `input_freshness_checked` 是否为 true
- re-spawn 的 packet 是否有 `supersedes_handoff_id` 指向旧 packet
- 每个 handoff-packet 是否有对应的 `skill_dispatched` 事件（通过 `related_handoff_id` 匹配）

不完整 → anomaly type=A8, severity=High。

### CHECK-9：Trace Completeness（Contracted Execution）

如果 events.jsonl 存在：
- 每条事件是否有 `trace_id` 和 `span_id`（v2.0 必填）
- `parent_span_id` 是否形成合法的 span tree（无孤立 span，无循环引用）
- `caused_by_event_id` 引用的事件是否存在于 events.jsonl 中
- `related_handoff_id` 引用的 handoff 文件是否存在于 `handoffs/`
- `related_change_package_id` 引用的 package 文件是否存在于 `artifacts/`
- **Orphan 检测**：
  - artifacts/ 中每个文件是否有对应的 `artifact_created` 事件
  - issues/ 中每个文件是否有对应的 `issue_raised` 事件
  - 每个 `artifact_consumed` 事件引用的 artifact_id 是否存在于 artifacts/

Trace 断裂或 orphan → anomaly type=A9, severity=Medium（首次；反复出现可升为 High）。

### CHECK-10：Risk Status Formalization（Contracted Execution）

检查 `issues/` 目录中每个 `.yaml` 文件：
- 是否有 `object_family` 字段（`issue` / `risk` / `override`）
- `object_family: issue` 的条目是否有 `status` 字段（open/resolved/superseded）
- `object_family: risk` 的条目是否有 `decision` 和 `decision_by` 字段
- 如果 `task.yaml status = completed`：是否有 `object_family: risk, status: open` 但未在 task.yaml `known_gaps` 中登记
- Gate 3 的 `open_issues_count` 是否 = issues/ 中 `object_family: issue, status: open` 的数量

不一致 → anomaly type=A10, severity=High。

### CHECK-11：Change Package Chain（Contracted Execution）

检查 `artifacts/change-package-*.yaml` 文件：
- `revision_seq` 是否从 0 开始连续递增（0, 1, 2, ...）
- 每个 change-package 是否有对应的 `change_package_created` 事件
- `unresolved_risks[]` 中的条目是否在 issues/ 中有对应的 risk 对象

断裂 → anomaly type=A11, severity=Medium。

### CHECK-12：Phase D 最小闭环检查（Phase-Driven v4）

检查 Phase D 执行完整性：
- `completed_stages` 中是否有至少 1 个非 orchestrator 的 reviewer 条目（code-reviewer / webapp-consistency-audit / pre-release-test-reviewer）
- `decisions/gate-3.yaml` 是否存在且非空
- `issues/` 中审查 findings 是否被归集（如 D.2 产出了 findings，issues/ 不应为空）
- `task.yaml status=completed` 是否通过 D.3 Gate 3 路径（而非直接跳到 completed）
  - 验证方式：events.jsonl 中是否有 `gate_decision` 事件（gate_type=final）在 `task_completed` 事件之前

D 闭环不完整 → anomaly type=A12, severity=Critical。

### CHECK-13：Routing Decision 存在性（Phase-Driven v4）

检查 `decisions/routing-decision-*.yaml` 文件：
- 是否存在至少 1 个（理想情况：C 和 D 阶段各一个）
- 每个文件是否有 `phase`、`task_type`、`matched_skills` 字段
- 如果 `matched_skills` 中的 skill 不在 `completed_stages` 中，是否有对应的 skip rationale（`decisions/phase-skip-*.yaml`）

缺失 → anomaly type=A13, severity=High。

### CHECK-14：Post-Gate-3 Bypass Detection（V4.1 新增，V4.3 强化）

如果 `decisions/gate-3.yaml` 存在且 decision = ACCEPT：

**Check A: 事件序列违规**
- 检查 events.jsonl 中 `gate_decision(final)` 之后是否有非 Phase F 事件
  - 允许：`known_gaps_collected`, `task_completed`, `run_summary_emitted`, `phase_entered(phase_f)`, `continuation_initiated`（含 continuation_type: light_patch）
  - 不允许：`skill_dispatched`, `artifact_created`（非 audit 类）, `change_package_created`
- 如有非法事件且 `decisions/continuation-*.yaml` 不存在 → anomaly type=A14, severity=Critical（"post-Gate-3 bypass: work continued without continuation protocol"）
- 如有非法事件但 `decisions/continuation-*.yaml` 存在 → 验证 continuation 类型与后续事件一致

**Check B: 文件变更违规（V4.3 新增）**
- 检查以下目录中是否有文件的 modification time 晚于 `gate_decision(final)` 事件 timestamp：
  `src/`, `artifacts/`（排除 audit/monitor 相关）, `handoffs/`, `issues/`, `decisions/`（排除 `continuation-*.yaml`）
- 如有新增/修改文件但 `decisions/continuation-*.yaml` 不存在 → anomaly type=A14, severity=Critical（"post-Gate-3 file modification without continuation protocol — 铁律 #15 违规"）

⚠️ A14 是铁律 #15 的自动化检测。

### CHECK-15：Degraded Execution/Review Detection（V4.1 新增）

检测 events.jsonl 中是否存在降级执行/审查事件：
- `inline_fallback`：orchestrator 因 sub-agent 2 次失败后自行产出
- `review_format_fallback`：reviewer 未产出 YAML，orchestrator 提取 findings
- `review_inline_fallback`：reviewer 2 次失败后 orchestrator 做 checklist review

如存在降级事件：
- 检查 `decisions/gate-3.yaml` 展示内容中是否有对应的 `degraded_source` 标注
- 如降级发生但 Gate 3 无 degraded 标注 → anomaly type=A15, severity=High（"degraded execution/review not disclosed at Gate 3"）
- 如降级事件中 `confidence: low` 但 Gate 3 仍标为正常完成 → anomaly type=A15, severity=High

### CHECK-16：Orchestrator-Originated Code Write Detection（V4.2 新增）

检测 D.1 阶段是否存在 orchestrator 直接写代码的违规行为：

1. 检查 events.jsonl 中是否有 `skill_dispatched(fsd)` 事件
2. 如有 FSD dispatch，检查 `artifacts/change-package-*.yaml` 的内容：
   - 如 change-package 不存在但 artifacts/ 中有实现产出（implementation-report 或新代码文件引用）→ 可能是 orchestrator 直接实现
3. 检查是否存在合法 fallback 标记：
   - `decisions/inline-fallback-fsd-*.yaml` 存在 → 合法（但标注为 degraded）
   - `decisions/incomplete-output-fsd-*.yaml` 存在 → 合法（metadata 补壳）
   - 两者都不存在 → anomaly type=A16, severity=Critical（"orchestrator-originated code write without fallback authorization"）

⚠️ A16 是 V4 试点中最严重的违规类型。此检查直接对应铁律 #13。

### CHECK-17：task.yaml 一致性 + 冻结检测（V4.3 新增）

**A. 一致性检查**（4 项交叉验证）：
1. `current_phase` ↔ events.jsonl 最后一个 `phase_entered` 事件的 phase
2. `completed_phases` ↔ events.jsonl 中所有 `phase_completed` 事件（一一对应）
3. `open_issues_count` ↔ issues/ 中 object_family=issue 且 status=open 的文件数
4. status=completed → events.jsonl 中必须有 `task_completed` 事件
5. `known_gaps_count` ↔ `known_gaps[]` 数组长度（known_gaps_count 是派生值，必须等于 known_gaps 数组实际长度）

不一致 → anomaly type=A17, severity=High（"task.yaml consistency drift: {field} expected={expected} actual={actual}"）

**B. 冻结检测**（3 项 — 检测"无冲突但长期不更新"的假 snapshot）：
1. **last_action 停滞**：最近一次 `skill_completed` / `gate_decision` / `continuation_initiated` 之后，`task.yaml.last_action` 是否更新
   - 未更新 → anomaly: "task.yaml frozen: last_action stale after {event_type}"
2. **completed_phases 未推进**：存在 `phase_completed` 事件但 `completed_phases` 列表未对应推进
   - 未推进 → anomaly: "task.yaml frozen: completed_phases not advanced"
3. **issue count 漂移**：`known_gaps_count`（派生自 known_gaps[] 数组长度）/ `open_issues_count` 与 issues/ 中 open 状态的 issue/risk 数量不一致（允许 ±1 容差）
   - 超出 → anomaly: "task.yaml frozen: issue count drift"

anomaly type=A17, severity=High（冻结但无冲突的假 snapshot 危害等于冲突）。

### CHECK-18：Prose Fallback 正常化检测（V4.3 新增）

检测 prose fallback 是否被错误地当作正常 review 处理：

1. 检查 events.jsonl 中是否有 `review_format_fallback` 事件
2. 如有 → 检查 `decisions/gate-3.yaml` 展示中是否标注了 `degraded_review_evidence`
3. 如 prose fallback 发生但 Gate 3 无 degraded 标注 → anomaly type=A18, severity=High
4. 检查 `artifacts/review-completeness-summary.yaml`（如存在）中 `prose_fallback_reviewers` > 0 但 `degraded_review` = false → anomaly type=A18, severity=High

⚠️ 与 CHECK-15 的区别：CHECK-15 检测单次降级的 Gate 3 披露，CHECK-18 专门检测 prose fallback 被"正常化"（反复降级被当作标准操作模式）。

---

### CHECK-19：Multi-Item Continuation 完整性（V4.4 新增）

触发条件：仅当 `decisions/continuation-*.yaml` 中 `type == multi_item` 时执行。单项 continuation 跳过此 CHECK。

- A: `items[]` 是否非空（type=multi_item 必须有 items）
- B: `items[].resolution` 是否全部非空（有值 = 有去向）
- C: `resolution=deferred` 的 items 是否在 `issues/` 中有对应 `deferred-item-*.yaml`
- D: `non_code_actions[]` 中 `affects_data=true` 的操作是否有 `result` 字段
- E: `resolution=dismissed` 类 items 是否有 `dismiss_evidence` 字段且 `quote` 非空？quote 是否为用户直接原话（非 orchestrator 推断）？classification 原为 defer 的 item 是否被错误覆盖为 dismissed？

不一致 → anomaly type=A19, severity=High

⚠️ "标注了但不追踪" = 协议失败。item 只出现在展示模板文字中但不在 `items[]` 字段 = A19 anomaly。

---

### CHECK-20：Pre-Gate Self-Check 执行验证（V4.6 新增）

检查 pre-gate self-check 是否被正确执行以及最终结论与流程实际行为是否一致。

对每个已通过的 Gate（gate-1.yaml / gate-2.yaml / gate-3.yaml 存在）：

- A: 对应的 `decisions/pre-gate-check-{N}.yaml` 是否存在
  - 缺失 → anomaly type=A20, severity=Medium（"pre-gate check not performed before Gate {N}"）

- B: 记录中 `items[]` 数量是否与协议定义匹配（Gate 1=6, Gate 2=8, Gate 3=11）
  - 不匹配 → anomaly type=A20, severity=Medium（"pre-gate check item count mismatch"）

- C: `check_version` 是否与当前协议版本一致
  - 不一致 → anomaly type=A20, severity=Info（"pre-gate check version drift"）

- D: **最终结论 vs Gate 实际行为矛盾检测**：
  - **Attempt 识别规则**：若存在归档文件 `pre-gate-check-{N}-attempt-1.yaml`，则以最终覆盖文件 `pre-gate-check-{N}.yaml` 的 `attempt_seq` 为准；若仅存在最终文件，以该文件内 `attempt_seq` 为准
  - 若最终 attempt 的 `result=blocked`，但 `decisions/gate-{N}.yaml` 存在（Gate 被展示了）
    → anomaly type=A20, severity=**High**（"BLOCK semantics violated: gate presented despite blocked pre-gate check"）
  - 这是 `protocols/pre-gate-self-check.md` §4 BLOCK 语义硬规则的自动化检测

- E: 若 `attempt_seq > 1`，三项一致性检查全部满足：
  - `repair_attempted=true`
  - `supersedes` 非空（指向归档记录 artifact id，格式为 `pre-gate-check-{N}-attempt-1`）
  - `repairs[]` 非空
  - 任一缺失 → anomaly type=A20, severity=Medium（"multiple attempts without complete repair record"）

- F: `repair_attempted` 与 `repairs[]` 一致性：
  - `repair_attempted=true` 但 `repairs[]` 为空，或 `repair_attempted=false` 但 `repairs[]` 非空 → anomaly type=A20, severity=Medium（"repair_attempted / repairs[] inconsistency"）

⚠️ D 项是 CHECK-20 的核心：最终 pre-gate 结论必须和实际流程行为一致。
⚠️ CHECK-20 只验证执行记录、schema 一致性和语义矛盾；不在此处重复 PG1/PG2/PG3 的 25 项明细。PG 明细的唯一权威源是 `protocols/pre-gate-self-check.md`。

---

## 未来扩展路径

```
Phase-Driven v4.6（当前）: 20 项 CHECK（post-run 审计 + pre-gate 前移检查闭环）
Stage 3: + policy flagging（Enforceable Checks 自动评估）
Stage 4: + during-run 实时监控
```

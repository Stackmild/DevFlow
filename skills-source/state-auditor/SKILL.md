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

## Required References

执行审计前**必须**读取以下文件，否则不得产出审计报告。

| 路径 | 级别 | 说明 |
|------|------|------|
| `skills-source/state-auditor/reference/audit-checks.md` | Always | **CHECK-1 到 CHECK-20 完整判断标准**。唯一权威来源 |
| `skills-source/dev-orchestrator/event-protocol.md` | Always | Canonical Event Type Enum 闭集定义（CHECK-7 用） |
| `skills-source/dev-orchestrator/protocols/pre-gate-self-check.md` | Conditional | 仅当 task 到达 Gate 3 时读取（CHECK-20 用） |

---

## 20 项检查总览

| # | CHECK | Anomaly | Severity | 条件触发 |
|---|-------|---------|----------|----------|
| 1 | task.yaml 关键字段填充率 | A6 | High | 无条件 |
| 2 | completed_stages 与 artifacts/ 匹配 | A2 | High | 无条件 |
| 3 | completed task 中 open blocker | A4-variant | Critical | status=completed |
| 4 | completed task 中 pending handoff | A5 | Medium | status=completed |
| 5 | decisions/ 中 Gate 决策记录 | A1 | High | 无条件 |
| 6 | events.jsonl 执行路径完整性 | — | Medium | 无条件 |
| 7 | events.jsonl 格式 + Canonical Enum | A7 | High | 无条件 |
| 8 | Handoff Packet 完整性 | A8 | High | 无条件 |
| 9 | Trace Completeness | A9 | Medium | events.jsonl 存在 |
| 10 | Risk Status Formalization | A10 | High | 无条件 |
| 11 | Change Package Chain | A11 | Medium | 无条件 |
| 12 | Phase D 最小闭环 | A12 | Critical | 无条件 |
| 13 | Routing Decision 存在性 | A13 | High | 无条件 |
| 14 | Post-Gate-3 Bypass | A14 | Critical | gate-3=ACCEPT |
| 15 | Degraded Execution/Review | A15 | High | 发现降级事件 |
| 16 | Orchestrator 直接写代码 | A16 | Critical | FSD dispatch 后无 change-package |
| 17 | task.yaml 一致性 + 冻结 | A17 | High | 无条件 |
| 18 | Prose Fallback 正常化 | A18 | High | 发现 review_format_fallback |
| 19 | Multi-Item Continuation | A19 | High | type=multi_item |
| 20 | Pre-Gate Self-Check 执行验证 | A20 | Medium→High | 无条件 |

详细判断标准见 `./reference/audit-checks.md`。

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
| Artifact 注册匹配 | {matched}/{total} |
| Gate Decision 记录 | {found}/{expected} |
| Event 记录完整性 | {matched}/{expected} |
| Event 格式校验 | {valid_lines}/{total_lines} |

## Anomalies Found

| # | Type | Severity | Description | Evidence |
|---|------|----------|-------------|----------|
| 1 | {A1-A20} | {severity} | {描述} | {evidence ref} |

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
- [ ] 20 项 CHECK 全部执行（CHECK-1 至 CHECK-20）
- [ ] anomalies 有 evidence ref（使用 Reference Convention）
- [ ] 产出了 .md 和 .json 两个文件到 monitor/
- [ ] 没有修改主链路的任何文件

---

## 增量模式（Fix 8）：Phase 边界轻量审计

增量 auditor 不是 SKILL 被 spawn 的形式运行，而是由 enforcer 在 `events.jsonl` 写入 `phase_completed` 事件后**自动后台触发**。

### 触发机制

- **触发点**：enforcer 拦截到 `events.jsonl` 追加内容包含 `phase_completed` 事件
- **执行方式**：`node scripts/incremental-auditor.mjs --task-dir {path} [--phase {phase}]`
- **非阻塞**：使用 `spawn(detached)` 后台运行，超时 5 秒，失败不影响原写入
- **输出路径**：`{taskDir}/monitor/audit-incremental-{phase}-{seq}.yaml`

### 输出 Schema

```yaml
task_id: "{task_id}"
phase: "{phase}"
seq: {N}
since: "{latest_event_timestamp}"
checked_at: "{ISO8601}"
status: pass | warn | critical
critical_count: {N}
warn_count: {N}
issues:
  - check: {check_name}
    severity: critical
    detail: "{description}"
warnings:
  - check: {check_name}
    severity: warn
    detail: "{description}"
```

### 10 项增量检查

| # | 检查名 | 严重级别 | 说明 |
|---|--------|---------|------|
| 1 | `events_parse` | critical | events.jsonl 存在 JSON 解析失败行 |
| 2 | `snapshot_drift` | warn | task.yaml.current_phase ≠ events.jsonl 最新 phase_entered |
| 3 | `authorized_stale` | warn | dispatch_authorized permit 残留 >10 分钟未 finalize |
| 4 | `dispatch_consistency` | warn | dispatch_skill permit 数 ≠ skill_dispatched 事件数 |
| 5 | `gate_decision_consistency` | warn | gate-N.yaml 与 gate_decision 事件不一致 |
| 6 | `handoffs_vs_dispatch` | warn | handoffs/ 数量与 skill_dispatched 事件数差距 ≥3 |
| 7 | `open_blockers` | critical | Phase D/F 存在未解决 blocker |
| 8 | `required_artifacts` | warn | 当前 phase 缺少必需 artifact |
| 9 | `completed_integrity` | critical | task.yaml.status=completed 但缺少 phase_f / gate3 closeout 证据 |
| 10 | `manual_phase_bypass` | warn | phase 事件的 source 字段非 devflow-gate 或缺失 |

# State Conflict Resolution Protocol

> 当 `task.yaml`、`events.jsonl`、`decisions/`、`issues/` 之间出现不一致时的检测与处理流程。
> 冲突未解决前，不得继续推进 phase。

---

## 何时可能发生冲突

- task.yaml 说 current_phase=phase_c 但 events.jsonl 最后一条 phase_completed 是 phase_b
- decisions/ 有 gate-3.yaml（或旧 gate-b.yaml）但 events.jsonl 无 gate_decision 事件
- issues/ 有 3 个文件但 task.yaml open_issues_count=0

---

## 冲突检测

Phase Entry 时 orchestrator 读 task.yaml，如发现以下任一 → 触发 `state_conflict_detected`：
- current_phase 与 events.jsonl 最后 phase_completed 不一致
- open_issues_count 与 issues/ 目录文件数不一致
- completed_phases 列表与 events.jsonl 中 phase_completed 事件不一致

---

## 处理规则

| 场景 | 谁为准 | 行为 |
|------|--------|------|
| **审计/复盘** | events.jsonl + decisions/ | 以 canonical evidence 为准重建事实 |
| **继续执行** | task.yaml（但需修复） | 先修复 task.yaml 使其与 events/decisions 对齐，再继续 |
| **冲突无法自动修复** | 停止 | 写 `decisions/state-conflict-{seq}.yaml` + 通知用户 |

---

## 修复流程

如 state_conflict_detected → orchestrator **必须**：
1. 写 events.jsonl: `state_conflict_detected`（payload: conflict_type + conflicting_values）
2. 尝试自动修复 task.yaml（从 events.jsonl + decisions/ + issues/ 重建 live state）
3. 修复成功 → 写 events.jsonl: `state_conflict_resolved` → 继续
4. 修复失败 → 写 `decisions/state-conflict-{seq}.yaml` → 停止，通知用户

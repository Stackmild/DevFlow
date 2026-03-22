# Phase Resume — 跨 Session 状态恢复

> 触发条件：用户调用 @dev-orchestrator 并附带已存在的 task_id，或说"继续上次的任务"。

---

## Step R.1：检查是否为 Resume

检查 `orchestrator-state/{task_id}/task.yaml`：
- 存在且 status ≠ completed → 进入 Resume Flow
- 不存在 → 走 Phase A（新任务）
- status = completed → 提示"此 task 已完成，如需新任务请使用新 task_id"

## Step R.2：读取 State Snapshot

```
Read: task.yaml          → 当前状态
Read: events.jsonl       → 事件日志（如存在）
Read: artifacts/*        → 仅文件名 + 元数据头
Read: issues/*           → open issues
Read: decisions/*        → gate / skip / routing decisions
```

⚠️ 防御性解析：events.jsonl 逐行解析，跳过无法解析的行。

## Step R.3：确定 Checkpoint

| current_stage | 恢复点 |
|--------------|--------|
| phase_a | 从 Phase A 开始 |
| phase_b / gate_1 | 从 Phase B / Gate 1 开始 |
| phase_c | 从 Phase C 对应 skill 开始 |
| phase_d_execute | 从 D.1 开始 |
| phase_d_verify | 从 D.2 开始 |
| phase_d_gate_b | 从 D.3 开始 |
| paused | 展示摘要，询问用户 |

## Step R.4：生成新 run_id

生成新 run_id，更新 task.yaml。
双写 changelog + events.jsonl（task_resumed）。

## Step R.5：展示 Resume 摘要

```
## 任务恢复

**Task**: {task_id}
**上次状态**: {current_stage}
**已完成阶段**: {completed_stages}
**未解决 Issue**: {open issues}

请选择：
- [CONTINUE] 从恢复点继续
- [RESTART_PHASE] 重新执行当前阶段
- [PAUSE] 保存不继续
```

## Step R.6：跳转

根据选择跳转到对应 Phase。跳转前确认 Phase -1（预加载 Skill 指令）已完成。

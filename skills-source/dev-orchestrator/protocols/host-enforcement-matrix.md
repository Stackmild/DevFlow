# Host Enforcement Matrix

> 明确同一 DevFlow 规则在不同宿主环境中的 enforcement 强度差异。
> **不得把 Cowork-only 的 hook 强制描述为 universal guarantee**。

## 三宿主 Enforcement 差异

| 关键规则 | Cowork（Hook 激活） | Codex（无 Hook） | Manual（人工执行） |
|----------|---------------------|------------------|-------------------|
| Task spawn 必经 handoff | **Hard** — PreToolUse DENY | Operator discipline — 须手动检查 handoff packet | Advisory — 执行前对照协议 |
| Gate 展示必经 present_gate | **Hard** — PreToolUse DENY | Operator discipline — 须手动跑 `present_gate` | Advisory |
| Phase 事件只能由 transition 生成 | **Hard** — PreToolUse DENY | Operator discipline — 禁止手写 events | Advisory |
| Gate 3 后 state 写入需 continuation | **Hard** — PreToolUse + post_gate3_write | Operator discipline — 手动跑 `post_gate3_write` | Advisory |
| dispatch_skill prerequisite 检查 | **Hard** — PreToolUse DENY | Operator discipline — 手动跑 `dispatch_skill` | Advisory |
| complete_task 关闭检查 | **Hard** — PreToolUse DENY | Operator discipline — 手动跑 `complete_task` | Advisory |
| verify_state D1-D7 对账 | **Hard** — 每个非 bootstrap gate action 前自动 | Operator discipline — 手动跑 `verify_state` | Advisory |
| finalize_dispatches fallback | **Hard** — gate action 前自动 `--force` | Operator discipline — 手动补齐 | Advisory |

## Cowork Runtime Hard Gate 清单

以下写入在 Cowork 环境中被 `devflow-enforcer.mjs`（PreToolUse / PostToolUse / UserPromptSubmit hook）自动拦截：

| 写入路径模式 | 自动触发 | 失败行为 |
|---|---|---|
| Task tool spawn | 校验 task_id / handoff_id / skill / packet / artifacts | 新任务 **DENY**，legacy WARN |
| `decisions/gate-{1,2,3}.yaml` | `present_gate --gate N` | **DENY** |
| `task.yaml` status=completed | `complete_task` | **DENY** |
| `events.jsonl` 手写 `phase_completed` / `phase_entered` | — | **DENY** |
| `handoffs/handoff-*`（含 skill_name） | `dispatch_skill --skill S --phase P` | **DENY** |
| Gate 3 后 orchestrator-state/ 任意写入 | `post_gate3_write` | **DENY** |

## Codex / Manual 手动命令清单

无 hook 环境下，orchestrator 或操作者必须在对应动作前手动执行：

```bash
# 初始化
node scripts/devflow-gate.mjs bootstrap --task-id {id} --project-path {path} --devflow-root {path} --module-slug {slug}

# Phase 进入
node scripts/devflow-gate.mjs enter_phase --task-dir {state_dir} --phase {phase_d_1|phase_d_2|phase_d_3|phase_f}

# Skill dispatch
node scripts/devflow-gate.mjs dispatch_skill --task-dir {state_dir} --skill {skill} --phase {phase}

# Gate 展示
node scripts/devflow-gate.mjs present_gate --task-dir {state_dir} --gate {1|2|3}

# Phase 切换（原子写 phase_completed + phase_entered）
node scripts/devflow-gate.mjs transition --task-dir {state_dir} --from {P1} --to {P2}

# Gate 3 后写入
node scripts/devflow-gate.mjs post_gate3_write --task-dir {state_dir} --target-path {path}

# 关闭任务
node scripts/devflow-gate.mjs complete_task --task-dir {state_dir}

# 状态对账
node scripts/devflow-gate.mjs verify_state --task-dir {state_dir}

# Fallback finalize（Cowork 由 gate action 前自动执行；Codex/Manual 需手动）
node scripts/devflow-gate.mjs finalize_dispatches --task-dir {state_dir} --force
```

> **无 hook 时，以上命令的 `allowed: false` 仍输出 violations，但不会自动阻止工具调用**。操作者必须按输出停止并修复，不得无视 violations 继续。

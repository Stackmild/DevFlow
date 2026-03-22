# Phase F — Closeout

> 目标：state 收尾 + 审计 + 下一轮候选。自动化执行，不需要人类判断。

## PHASE F PROTOCOL

```
INPUT:
  - task.yaml: Gate 3 decision = ACCEPT（decisions/gate-3.yaml 或兼容旧 gate-b.yaml 存在）
  - OR: Gate 1 decision = DEFER-TASK（走 DEFER-TASK 简化路径）
  - OR: Continuation Protocol Path 2 (FOLLOW-UP) 引导当前任务 closeout
  - OR: Continuation Protocol Path 3 (RECORD AND STOP) 引导当前任务 closeout

ORCHESTRATOR_ROLE:
  - 从 issues/ 聚合 known gaps
  - 可选 spawn state-auditor
  - 提取下一轮候选
  - 标记 task 为 completed
  - 不产出新的专业内容

SUB_AGENT_ROLE:
  - state-auditor（可选）产出审计报告

MUST_PRODUCE:
  - task.yaml: known_gaps 聚合自 issues/
  - task.yaml: status = completed
  - artifacts/next-version-candidates.md（如有候选）

EXIT_GATE:
  - task.yaml known_gaps 反映 issues/ 中所有未解决项
  - task.yaml status = completed
  - task.yaml live state: current_phase = phase_f, completed_phases 含 phase_f
  - EVENTS_REQUIRED 全部满足

EVENTS_REQUIRED:
  - known_gaps_collected
  - task_completed
```

---

### ⚠️ Phase F 是 task completion 的唯一合法路径

- `status: completed` **只能**通过 Phase F 写入（铁律 #10 具体化）
- 不存在"Gate 3 ACCEPT 后直接标记 completed"的路径——必须经过 F.1-F.4
- 如果用户在 Gate 3 后请求额外工作 → 走续行协议（`../contracts/continuation-protocol.md`），不跳过 Phase F
- 续行协议 Path 2（FOLLOW-UP）和 Path 3（RECORD AND STOP）都会先进入 Phase F 关闭当前任务
- **DEFER-TASK 简化路径**：Gate 1 decision = DEFER-TASK → 走 F.1 + F.5 简化路径（跳过 F.2/F.3）

---

## Phase Entry Protocol

1. Read `task.yaml`（确认 Gate 3 ACCEPT 或 Gate 1 DEFER-TASK）
2. Read `issues/` 目录中所有文件
3. Read 本文档

## Step F.1：归集 Known Gaps

1. 从 issues/ 中读取所有 status ≠ resolved 的条目
2. 按 object_family 分类（issue / risk / override）
3. 写入 task.yaml known_gaps

## Step F.2：Spawn state-auditor

⚠️ **Phase F 不要求第一轮强制 spawn**。但如果 spawn：

- 传入 task_id + run_id
- state-auditor 独立读取 state store
- 产出 `monitor/run-audit-{run_id}.md` + `monitor/run-audit-{run_id}.json`
- orchestrator 读取审计摘要，向用户展示

## Step F.3：提取下一轮候选

从审查 findings、known_gaps、reviewer suggestions 中提取改进候选：
→ 写入 `artifacts/next-version-candidates.md`

## Step F.4：更新最终状态

1. task.yaml status → completed
2. 追加 changelog（task_completed）
3. events.jsonl（task_completed）

## Step F.5：Continuity Layer 回填（V4.3 新增）

⚠️ 如 `task.yaml.project_id` 存在且 `{devflow_root}/projects/{project_id}/` 目录存在：

> **路径规则（V4.5 显式化）**：所有 continuity 文件路径使用 `{devflow_root}/projects/{project_id}/`，不依赖 CWD 相对路径。`devflow_root` 来源：`task.yaml.devflow_root`（通过 §4.9 fallback 规则：task.yaml → devflow-config.yaml → CWD 检测）。

1. **更新 ROADMAP.md**：
   - 读取 `{devflow_root}/projects/{project_id}/ROADMAP.md`
   - 按 Task ID 列反向查找当前 task 对应的 deliverable → 更新 status 为 `done`
   - 将 `artifacts/next-version-candidates.md` 中的候选项吸收到 ROADMAP Next Up（status=`pending`）
   - 追加更新日志条目

2. **更新 DEFERRED.md**：
   - 从 task.yaml known_gaps 中筛选 deferred 类项
   - 每条写入 `{devflow_root}/projects/{project_id}/DEFERRED.md`，格式：`id / item / severity / source_task_id / source_ref / deferred_reason / status`
   - `source_ref` 使用 Reference Convention 格式（`gap:{id}` / `issue:{id}` 等）
   - 追加更新日志条目

如 `project_id` 不存在或 continuity 文件不存在 → 跳过（不阻塞 Phase F 完成）。

## Phase F Exit Checklist

```
⚠️ Phase F Exit Checklist:
- [ ] task.yaml known_gaps 已从 issues/ 聚合
- [ ] task.yaml status = completed
- [ ] task.yaml.completed_phases 包含 phase_f 条目（铁律 #8 硬条件）
- [ ] next-version-candidates.md 写入 artifacts/（如有）
- [ ] events.jsonl 有 task_completed 事件
- [ ] （V4.3）如 project_id 存在：ROADMAP.md 已更新 + DEFERRED.md 已回填
```

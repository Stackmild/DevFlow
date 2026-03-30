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

⚠️ GATE: `node scripts/devflow-gate.mjs enter_phase --task-dir {state_dir} --phase phase_f`

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

## Step F.3.5：Closeout Integrity Check（BLOCKING — status=completed 写入前的硬闸门）

在执行 Step F.4（写入 `status=completed`）之前，必须通过以下一致性检查。
任一 BLOCK 级失败 → **不允许写入 completed** → 写 `closeout_blocked` 事件 → 停在 Phase F 等待补齐。

| # | 检查 | 失败时 |
|---|------|--------|
⚠️ **遗留任务兼容性**：CI-1/CI-2 仅对**新创建的 task**（本协议实施后产生）强制执行。如果 resume 一个已完成（status=completed）的旧 task 进行后续操作，CI 检查基于旧 task 的实际 events.jsonl 内容判断，不应 BLOCK 正常已完成状态。

| CI-1 | events.jsonl 包含 `phase_completed(phase_d)` | **BLOCK** — Phase D 未正式关闭 |
| CI-2 | events.jsonl 包含 `phase_entered(phase_f)` | **BLOCK** — Phase F 未正式进入 |
| CI-3 | task.yaml.completed_phases 包含 phase_d | **BLOCK** — Iron Law #8 违反 |
| CI-4 | issues/ 中所有 P0/P1 issue status = resolved 或 known_gap | **BLOCK** — open P0/P1 不允许 completed |
| CI-5a | task.yaml.open_issues_count 与 issues/ 实际 open 数不一致，**仅为派生计数偏差**（underlying issue state 本身正确） | **WARN** — 自动修正 count 后继续 |
| CI-5b | issues/ 中某 issue 应为 resolved（events.jsonl 有 revision_applied 事件但 status ≠ resolved）但仍为 open，**underlying state 本身不一致** | **BLOCK** — issue state 不一致，需补齐 resolution |
| CI-6 | 如 project_id 存在：ROADMAP.md 已更新（F.5 已执行） | **WARN** — 执行 F.5 后继续 |
| CI-7 | 如 project_id 存在：DEFERRED.md 已回填（如有 known_gaps） | **WARN** — 执行 F.5 后继续 |

**BLOCK 级失败处理**：写 events.jsonl `closeout_blocked` 事件（payload 包含失败检查项 ID）；不写 task_completed；不写 status=completed；输出："Phase F closeout 被阻断：{原因}，需补齐后才能关闭 task。"

**WARN 级失败处理**：自动修正（count 对齐 / 执行 F.5），修正后重新检查，全部通过后继续。

⚠️ GATE: `node scripts/devflow-gate.mjs complete_task --task-dir {state_dir}`

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

3. **更新 VISUAL-SYSTEM.md**（如 Phase C 有 frontend-design 产出）：

   ```
   IF VISUAL-SYSTEM.md 不存在（首次任务）：
     → orchestrator 将 artifacts/frontend-design-spec.md 的视觉规范部分
       直接写入 {devflow_root}/projects/{project_id}/VISUAL-SYSTEM.md（v1.0）
     → 文件头部标注：source_task_id + created_at

   IF VISUAL-SYSTEM.md 已存在（后续任务）：
     → spawn component-library-maintainer（或 frontend-design，按 scope 决定）
     → handoff 包含：现有 VISUAL-SYSTEM.md 路径 + artifacts/frontend-design-spec.md 路径
     → objective: "将本次增量规范合并到现有 VISUAL-SYSTEM.md，产出合并后的完整文档"
     → expected_output: 合并后的 VISUAL-SYSTEM.md 全文
     → orchestrator 落盘，文件头部追加：updated_by_task + updated_at
   ```

   **失败处理**：sub-agent 未返回结构化产出 → 写入 known_gap（type: design_system_update_failed），不 block task completion。

4. **更新 COMPONENTS.md**（如本次有组件新增/修改，且 component-library-maintainer 在 Phase C 未被触发）：

   ```
   IF COMPONENTS.md 不存在：
     → orchestrator 从 artifacts/frontend-design-spec.md 中提取组件列表
     → 写入 {devflow_root}/projects/{project_id}/COMPONENTS.md 初版
     → 标注 source_task_id + created_at

   IF COMPONENTS.md 已存在
      AND decisions/routing-decision-C.yaml 中 component_library_maintainer_dispatched == false：
     → spawn component-library-maintainer
     → handoff 包含：现有 COMPONENTS.md 路径 + artifacts/frontend-design-spec.md 路径
     → objective: "将本次新增/修改的组件合并到现有 COMPONENTS.md（新增组件标注 experimental）"
     → expected_output: 更新后的 COMPONENTS.md 全文
     → orchestrator 落盘
   ```

   **失败处理**：同 VISUAL-SYSTEM.md 失败处理。

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
- [ ] （V4.6）如 Phase C 有 frontend-design 产出：VISUAL-SYSTEM.md 已更新或写入 known_gap
- [ ] （V4.6）如有组件变更：COMPONENTS.md 已更新或写入 known_gap
```

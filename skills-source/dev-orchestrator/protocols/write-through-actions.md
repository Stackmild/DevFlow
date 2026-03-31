# Write-Through Action Templates

> orchestrator 最高频的 4 类执行单元。每次执行时**按模板完成全部步骤**，不允许拆开或跳过。
> 每类动作必须原子完成：事件写入 + artifact/decision 写入 + task.yaml 更新。

⚠️ **全局注释**：Template 中的 task.yaml 字段清单是 **per-action** 的——只列出该动作必须更新的字段。Phase 转换字段（`current_phase` 推进、`completed_phases` 追加）在 **Phase Exit Checklist** 中执行，不在 Template 内部。

⚠️ **Template C 时序说明**：铁律 #15（Pre-Action Check）适用于 Template C **完成之后**的用户交互轮次。Template C 内部的 gate 记录步骤（events.jsonl + decisions/ + task.yaml）不受铁律 #15 约束——它们是 gate 记录本身的原子步骤。

---

## Template A: `dispatch_skill`

触发：每次 spawn sub-agent 前。

```
0. ⚠️ GATE（V6.0）: node scripts/devflow-gate.mjs dispatch_skill --task-dir {state_dir} --skill {skill} --phase {phase}
   allowed: false → 停止，不得 spawn；allowed: true → 继续（permit 已自动写入 .permits/）
1. 写 handoffs/handoff-{stage}-{skill}-{seq}.yaml    ← handoff packet
2. 写 events.jsonl: skill_dispatched                   ← 捎带写入
3. 写 events.jsonl: artifact_consumed —— 以下场景必须写入（不是"如有"）：
   - D.1: artifact_consumed(implementation-scope→fsd)（或 product-spec→fsd 如 C skip）
   - D.2: artifact_consumed(change-package→reviewer)（每个 reviewer 一条）
   - 其他 phase: artifact_consumed(上游 design artifact→matched skill)
   不写 = Phase Exit Gate 失败（§5.5 required semantic events 缺失）
4. 更新 task.yaml（以下字段全部 MUST 更新）：
   - current_focus = "waiting for {skill}"
   - last_action = "dispatched {skill} via handoff-{id}"
   - next_action = "collect {skill} output → validate → persist"
```

---

## Template B: `record_review`

触发：每个 reviewer spawn 前 + 完成后。

```
0a. ⚠️ GATE（V6.0）: node scripts/devflow-gate.mjs dispatch_skill --task-dir {state_dir} --skill {reviewer} --phase phase_d
    allowed: false → 停止；allowed: true → 继续（permit 已自动写入 .permits/）
0b. ⚠️ Reviewer Handoff Packet 构造（MANDATORY — **blocking gate**：handoff 不存在 = reviewer 不 spawn）：
   此规则**不分首轮/续行/轻量/完整**。RE-ENTER D 的 reviewer handoff 与首轮同级。
   写 handoffs/handoff-D2-{reviewer}-{seq}.yaml
   复用通用 handoff-packet.md schema，D.2 专用映射：
   - input_artifacts → change-package + 上游 design artifact（每个有 generated_at）
   - constraints → change_package_ref + expected_consumption（reviewer 应检查哪些 artifact）
   - known_gaps → missing_artifacts（空列表也必须声明）
   - expected_outputs → review-report.yaml (per contracts/review-report.md schema)

1. 写 events.jsonl: skill_dispatched + artifact_consumed(change-package→reviewer)
   ⚠️ MANDATORY: artifact_consumed(change-package→reviewer) 必须写入

---（reviewer spawn 并返回产出后）---

2. 验证 artifacts/{reviewer}-report.yaml 存在 + 6 项字段验证
3. 写 artifacts/{reviewer}-report.yaml + .md            ← reviewer 产出
4. 写 events.jsonl: artifact_created(review-report)      ← 捎带写入
5. 从 report 提取 severity≥P1 findings → 写 issues/     ← 原子步骤（不延后）
6. 写 events.jsonl: issue_raised（每个 P0/P1 finding）   ← 捎带写入
7. 更新 task.yaml（以下字段全部 MUST 更新）：
   - last_action = "recorded {reviewer} review: verdict={verdict}"
   - open_issues_count = {issues/ 中 status=open 的 issue 计数}
   - known_gaps_count: # 派生值 — 消费层从 known_gaps[] 动态计算，不再人工维护
   - unresolved_risks = [{从 reviewer report 提取的未解决风险}]
```

---

## Template C: `record_gate_decision`

触发：Gate 1、Gate 2 或 Gate 3 用户做出选择后。

```
0. ⚠️ GATE（V6.0）: node scripts/devflow-gate.mjs present_gate --task-dir {state_dir} --gate {N}
   allowed: false → 停止，不得展示 Gate；allowed: true → 继续（permit 已自动写入 .permits/）
1. 写 events.jsonl: gate_requested                       ← 先落证据
   ⚠️ gate_requested 必须在 gate_decision 之前写入，两者成对出现。
   缺 gate_requested 的 gate_decision = §5.5 semantic events 缺失。
2. 写 decisions/gate-{1|2|3}.yaml                        ← decision record
3. 写 events.jsonl: gate_decision                        ← 捎带写入
4. 更新 task.yaml（以下字段全部 MUST 更新）：
   - last_action = "gate {1|2|3} decision: {decision}"
   - next_action = "{下一步行动}"
   - completed_phases += {当前 phase 的 completion record}（如 phase 因 gate 而完结）
   - status = "{如 Gate 3 ACCEPT 且无续行 → 进 phase_f}"
5. ⚠️ HARD GATE（铁律 #15）:
   如 Gate 3 ACCEPT 后用户请求额外工作：
   → HALT 所有文件操作
   → 读取 ../contracts/continuation-protocol.md §Pre-Action Check
   → 以固定模板输出检查结果
   → 通过后走 Template D（record_continuation）
   → 未通过 → 展示四选项等待用户选择
   不可跳过 Pre-Action Check 直接操作文件。
```

---

## Template D: `record_continuation`

触发：Gate 3 后用户请求额外工作，Pre-Action Check 完成后。

```
1. 生成 scope delta 摘要（新请求 vs implementation-scope.md）
2. 判断请求是否 multi-item（≥2 个独立请求）：
   - 单项 → 以 §Pre-Action Check 单项模板输出 + 五选项，等待用户选择
   - 多项 → 以 §Multi-Item 处理协议模板输出 + 逐条分类 + 分组确认
3. 写 decisions/continuation-{seq}.yaml：
   - 单项 → 现有 schema（type: re_enter_d / follow_up / light_patch / non_code_action / record_and_stop）
   - 多项 → multi-item schema（type: multi_item, items: [...], non_code_actions: [...]）
4. 写 events.jsonl: continuation_initiated               ← 捎带写入
5. 更新 task.yaml（以下字段全部 MUST 更新）：
   - current_phase = "{re_enter → phase_d_1 | follow_up → phase_f | light_patch → (unchanged) | non_code_action → (unchanged) | record_and_stop → phase_f}"
   - current_focus = "continuation: {type} — {描述}"
   - last_action = "continuation protocol: {type}"
   - next_action = "{下一步行动}"
6. 按路径执行：
   RE-ENTER D → 回到 D.1（handoff-packet 构造 → fsd spawn）
   FOLLOW-UP  → 当前任务进 Phase F, 新建 task_id
   LIGHT-PATCH → 执行限定修改 + 写 patch-note → 进 Phase F
   NON-CODE-ACTION → 执行外部操作 + 写 non_code_actions[].result
   RECORD AND STOP → 写 issues/risk 或 override, 进 Phase F
   MULTI-ITEM → 按 items[] 分组执行各 path + 写 item resolution table
```

---

## §Sub-agent Return Continuity Protocol

Write-through templates 定义了单个写操作的原子性。本节定义跨操作的流程连续性。

### 规则

当任何 sub-agent 返回产出后，orchestrator 必须不间断地完成从"收集产出"到"下一个合法暂停点"的完整链路：

1. 收集 sub-agent 产出
2. 执行对应的 write-through template（Template A/B/C/D）
3. 如果触发了 pre-gate self-check → 执行 self-check → 写 `decisions/pre-gate-check-{n}.yaml`
4. 如果下一步是 Gate 展示 → 展示 Gate
5. 如果下一步是 dispatch 另一个 sub-agent → 构造 handoff + dispatch

步骤 1→5 之间**不允许插入"等待用户输入"**。

### 合法暂停点（仅这两种）

1. Gate 展示完成，等待用户选择（GO / PROCEED / ACCEPT / REVISE / PAUSE）
2. 明确需要用户补充信息（如缺少环境变量值、部署凭证等）

### 各 Phase 的具体链路

| 链路 | 起点 | 终点（合法暂停点） |
|------|------|-------------------|
| Phase B | PM sub-agent 返回 | Gate 1 展示 |
| Phase C | 最后一个 design skill 返回 | Gate 2 展示 |
| Phase D.1→D.2 | FSD 返回 | D.2 reviewer dispatch 完成 |
| Phase D.2→D.3 | reviewer 返回 | Gate 3 展示 |
| Phase D.3→F | Gate 3 ACCEPT | Phase F 完成（task_completed 写入） |

**Phase D（三步不可拆分闭环）**：
- D.1 FSD 返回 → 写 change-package → routing-decision-D → handoff-D2 → dispatch reviewer(s)
- D.2 reviewer 返回 → record_review → 提取 issues → review-completeness-summary → pre-gate-check-3 → Gate 3 展示
- Gate 3 ACCEPT → record_gate → phase_completed(phase_d) → phase_entered(phase_f) → Phase F 执行 → task_completed

### 违反后果

如果 orchestrator 在非法暂停点停止，恢复后必须从停顿点继续完成整个链路，不得跳过中间步骤。

---

## §Post-Closeout Idle State

`task_completed` 写入后，orchestrator 进入 **IDLE 状态**。

### 识别条件

**主证据（单独足够触发 IDLE）**：
- events.jsonl 有 `task_completed` 事件

**辅助佐证（确认已走合法 closeout 路径，三选一即满足）**：
- decisions/ 有 `gate-3.yaml`（标准 Gate 3 ACCEPT 路径）
- decisions/ 有 `gate-b.yaml`（旧版任务兼容字段，新任务不会生成此文件）
- decisions/ 有任意 `continuation-*.yaml`（经历 continuation re-entry 后关闭的任务）

**两种触发场景均适用**：
1. **当前 session**：orchestrator 刚写完 `task_completed` 事件 → 立即进入 IDLE
2. **新 session / 恢复**：读到 events.jsonl 有 `task_completed` → 识别为 IDLE

### IDLE 状态规则

1. **禁止直接执行任何工作**：任何涉及代码/设计/配置写入的请求，不论大小，都不得直接进入执行模式
2. **新请求只有两条合法出口**：
   - **续行协议**：Pre-Action Check → 展示 5 条路径 → 用户选择 → 写 `decisions/continuation-{seq}.yaml` → 执行
   - **新 task**：引导用户发起 `@dev-orchestrator {新任务描述}` 作为独立 task
3. **明确告知用户**：IDLE 状态下主动说明"当前 task 已完成，请选择续行方式或发起新任务"

### 违反后果

IDLE 状态下直接写代码 / 修改文件 = Gate 3 续行硬门槛规则违反（铁律 §Gate 3 后续协议）。
devflow-gate 的 `post_gate3_write` 在 task state dir 内提供硬拦截；项目代码文件写入仍依赖此 IDLE 规则。

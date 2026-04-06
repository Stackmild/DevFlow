# Phase B — Roadmap

> 目标：problem-framing + outcome-definition + scope decision + 验收标准 + 版本目标收敛

## PHASE B PROTOCOL

```
INPUT:
  - task.yaml: Phase A completed（completed_phases 含 phase_a）
  - artifacts/task-brief.md 存在且非空

ORCHESTRATOR_ROLE:
  - Dispatch PM sub-agent（Mode A 或 B）
  - 收集 PM 产出，汇总为 product-spec.md
  - 展示 Gate 1，记录决策
  - 不做 problem-framing 或 scope 分析

SUB_AGENT_ROLE:
  - PM 产出问题诊断、改进目标、scope 决策、验收标准

MUST_PRODUCE:
  - artifacts/product-spec.md（由 PM sub-agent 产出，orchestrator 汇总）
  - decisions/gate-1.yaml
  - decisions/routing-decision-B.yaml
  - handoffs/handoff-B-pm-{seq}.yaml（每次 PM dispatch 前）

EXIT_GATE:
  - product-spec.md 存在于 artifacts/
  - gate-1.yaml 存在且 decision = GO
  - routing-decision-B.yaml 存在
  - completed_stages 含 PM skill 条目
  - task.yaml live state 已更新（current_phase→phase_c）
  - EVENTS_REQUIRED 全部满足

EVENTS_REQUIRED:
  - skill_dispatched(product-manager)
  - skill_completed(product-manager)
  - artifact_created(product-spec)
  - gate_requested(direction)
  - gate_decision(direction)
  - phase_completed(phase_b)
```

---

## Phase Entry Protocol

⚠️ GATE: `node "{devflow_root}/scripts/devflow-gate.mjs" enter_phase --task-dir {state_dir} --phase phase_b`

0. **⚠️ Project Discovery pre-step（V4.3 Continuity Layer）**：
   - 检查 `task.yaml.project_id` 是否存在
   - 如不存在（历史 task 或遗漏）→ 列出 `projects/` 目录 → 提示用户选择或创建 → 写回 `task.yaml.project_id`
   - Phase Resume 时同样检查：`task.yaml.project_id` 不存在 → 触发绑定流程
   - **必须先完成 project_id 绑定，然后才能读 ROADMAP**
0.1 **壳目录检查（V4.5 External Repo Support）**：
   - 读取 `task.yaml.project_path`（Phase A.0 已写入）
   - IF `project_path` 非空（外部项目）AND `{devflow_root}/projects/{project_id}/` 不存在：
     - 创建 `{devflow_root}/projects/{project_id}/`
     - 输出说明："已创建 continuity 目录 projects/{project_id}/，用于存放 ROADMAP 和 DEFERRED"
   - IF `project_path` 为空（内部项目）→ 不触发壳目录逻辑，沿用现有行为
   - **禁止在 Step 0（binding）之前创建壳目录**
0.5 **PROJECT-BRIEF 检查**：
   - 如 `{devflow_root}/projects/{project_id}/PROJECT-BRIEF.md` 不存在：
     - 提示用户："该项目尚无 PROJECT-BRIEF，建议创建。PROJECT-BRIEF 回答：产品是什么、面向谁、核心价值、当前不做什么。是否现在创建？"
     - 用户选择创建 → spawn PM sub-agent 产出 PROJECT-BRIEF（轻量，10-20 行）
     - 用户选择跳过 → 记录 `project_continuity_status: incomplete` 在 task.yaml，不阻塞
   - 如已存在 → 读取（纳入 PM sub-agent 的输入上下文）
1. Read `task.yaml`（确认 Phase A completed）
2. Read `artifacts/task-brief.md`（Phase A 产出）
3. Read `{devflow_root}/projects/{project_id}/ROADMAP.md`（如存在 → 确认 task 在 current/next milestone 内；如不存在 → 提示创建但不阻塞）
   > 读取后，确认当前 task 在 ROADMAP 的 current milestone 或 next up 范围内。如不在，向用户说明并建议调整（不阻塞，但必须明确提示）。
4. Read `{devflow_root}/projects/{project_id}/DEFERRED.md`（如存在 → 检查是否有与本 task 相关的延后项）
5. Read 本文档

## PM 调用模式

⚠️ **平台限制**：sub-agent 不可嵌套 spawn Agent tool。orchestrator 必须分步 spawn PM。

### PM Dispatch Handoff Packet（V4.1 新增）

每次 spawn PM 前，**必须**写入 `handoffs/handoff-B-pm-{seq}.yaml`：
- objective: PM 的具体任务（problem-framing / outcome-definition / prioritization）
- input_artifacts: task-brief.md（含 generated_at）
- constraints: task_type 约束 + platform_capabilities 约束
- expected_outputs: 结构化问题诊断 / 改进目标 / scope 决策

> Mode A 分 3 步 spawn PM，每步都需要新的 handoff-packet（seq 递增）。
> "无 packet = 无 spawn，无例外。"

### PM Mode 选择（Phase 2 配置化）

| Mode | 适用 task_type | Dispatch 次数 |
|------|---------------|--------------|
| Mode A（完整） | `new_feature`, `design_only` | 3（problem-framing → outcome-definition → prioritization） |
| Mode B（轻量） | `feature_iteration`, `bugfix`, `review_existing` | 1（problem-framing + prioritization） |
| Skip | `hotfix` | 0（hotfix 无 PM 决策空间，直接 Phase C/D） |

### 模式 A（完整 PM 流程——new_feature / design_only）

1. **Spawn PM**（prompt 包含 problem-framing 指令 + task-brief + 当前产品状态）
   → 产出：结构化问题诊断
2. **Spawn PM**（prompt 包含 outcome-definition 指令 + 步骤 1 结果）
   → 产出：改进目标 + 验收标准
3. **Spawn PM**（prompt 包含 prioritization 指令 + 步骤 1-2 结果）
   → 产出：scope 决策 + 批次划分
4. **Orchestrator 汇总** → `artifacts/product-spec.md`

### 模式 B（轻量 PM——bugfix）

1. **Spawn PM**（单次，包含 problem-framing + prioritization）
   → 产出：问题列表 + 优先级
2. **Orchestrator 汇总** → `artifacts/product-spec.md`

### PM 输出 contract

- 问题列表 + 优先级 + 验收标准
- 改动范围（改什么 / 不改什么）
- 回归风险
- 验收标准分两类：
  - **功能性**（不依赖技术方案，Gate 1 确认）
  - **技术性**（标注 "pending Phase C 确认"，Phase C 后定稿）

⚠️ CONTINUITY: PM 返回后，到 Gate 1 展示必须连续完成（product-spec 写入 → events → task.yaml → pre-gate-check-1 → Gate 1 展示）。参见 `../protocols/write-through-actions.md §Sub-agent Return Continuity Protocol`。

## Pre-Gate 1 Self-Check

⚠️ Gate 1 展示前，必须执行 `../protocols/pre-gate-self-check.md` §2.1（PG1-1~6）。
必须写入 `decisions/pre-gate-check-1.yaml`。`result=blocked` 时 Gate 1 不展示。

## Gate 1：Direction & Roadmap

展示给用户：
```
## 🚦 Gate 1 — Direction & Roadmap

### PM 分析

**任务类型**: {task_type}
**核心问题**: {problem-framing 摘要}
**Scope**: {scope 摘要}
**验收标准**: {列表}

### Roadmap 定位

**Project**: {project_id}
**当前 Milestone**: {ROADMAP current milestone 摘要，如 ROADMAP 不存在则标注 "ROADMAP 未创建"}
**Task 定位**: {current_milestone / next_up / backlog / roadmap_outside}
**方向一致性**: {aligned / tangential / roadmap_outside}
{如有 DEFERRED 相关项}: **相关延后项**: {deferred items}
{如有优先级冲突}: **⚠️ 优先级冲突**: {description}

### 请选择

- **[GO]** 方向和 roadmap 定位均确认，进入 Phase C
- **[ADJUST]** 调整 scope 或优先级（回到 PM 阶段）
- **[DEFER-TASK]** 此任务应延后（进入 Phase F → DEFERRED）
- **[PAUSE]** 保存，稍后继续
```

### Continuity 影响结论（硬规则）

> Gate 1 不只是"展示 continuity 读取结果"。ROADMAP / PROJECT-BRIEF / DEFERRED 信息**必须参与 Gate 1 的最终结论**。

orchestrator 在形成 Gate 1 建议时，必须将 continuity 信息纳入判断：
- `roadmap_outside` → 建议应倾向 DEFER-TASK 或 ADJUST，不应默认 GO
- 与 current milestone 冲突 → 必须在 ⚠️ 标注中说明冲突，建议中体现
- 与 DEFERRED 中已有项重复 → 必须指出重复，由用户决定是复用还是新做
- ROADMAP 不存在 → 不阻塞，但必须标注 "ROADMAP 未创建，无法验证 milestone 定位"

如果 continuity 信号全部正常（task 在 current milestone、无冲突、无重复），则正常推荐 GO——不需要人工制造冲突。

### Gate 1 decision schema

```yaml
gate: 1
gate_type: direction
decision: GO | ADJUST | DEFER-TASK | PAUSE
roadmap_position: current_milestone | next_up | backlog | roadmap_outside | no_roadmap
milestone_context: "{milestone 名称或 N/A}"
user_notes: ""
decided_at: "ISO 8601"
```

### Gate 1 ADJUST 回流

ADJUST 时回到 Phase B（不回 Phase A），re-spawn PM 调整 scope。

### Gate 1 DEFER-TASK 路径

如用户选择 DEFER-TASK：
1. 写入 `issues/deferred-task.yaml`：
   ```yaml
   # 写入路径：issues/deferred-task.yaml（与其他 issue/risk 文件同目录）
   object_family: deferred_task
   task_id: "{当前 task_id}"
   reason: "{用户给出的延后理由}"
   roadmap_ref: "{ROADMAP 中的对应条目，如有}"
   deferred_at: "ISO 8601"
   original_request: "{用户原始请求摘要}"
   ```
2. events.jsonl 写入 `gate_decision(direction, DEFER-TASK)` 事件
3. 进入 Phase F **简化路径**（不经过 Phase C/D，不触发 Gate 2/Gate 3）：
   - Phase F 入口识别：`decisions/gate-1.yaml` 中 `decision = DEFER-TASK` → 走 DEFER-TASK closeout
   - F.1：从 `issues/deferred-task.yaml` 聚合到 `task.yaml.known_gaps`
   - F.5：写入 `projects/{project_id}/DEFERRED.md`（source_ref: `deferred-task:{task_id}`）
   - 跳过 F.2（state-auditor）和 F.3（next-version-candidates）
   - task.yaml status → completed

### Gate 1 后必须执行

1. 写入 `decisions/gate-1.yaml`（含 roadmap_position + milestone_context 字段）
2. 写入 `decisions/routing-decision-B.yaml`（记录 PM 调用模式 A/B + scope 匹配结果）
3. 追加 changelog + events.jsonl（gate_requested + gate_decision）

## Phase B Exit Checklist

```
⚠️ Phase B Exit Checklist:
- [ ] product-spec.md 写入 artifacts/（由 PM sub-agent 产出）
- [ ] decisions/gate-1.yaml 写入（含 roadmap_position + milestone_context 字段）
- [ ] decisions/routing-decision-B.yaml 写入
- [ ] ROADMAP 读取检查：
      - ROADMAP 存在且已读取并在 Gate 1 展示 → ✅
      - ROADMAP 存在但未读取 → ❌ EXIT FAIL（阻塞，必须读取后重新展示 Gate 1）
      - ROADMAP 不存在 → N/A（不阻塞，记录 roadmap_position = no_roadmap）
- [ ] 如 projects/{project_id}/PROJECT-BRIEF.md 不存在 → project_continuity_status 已记录
- [ ] completed_stages 更新（PM skill 条目）
- [ ] events.jsonl 有 skill_completed + gate_requested(direction) + gate_decision(direction) 事件
- [ ] `decisions/pre-gate-check-1.yaml` 写入
```

## Hotfix 跳过 Phase B

如 task_type = hotfix → 写 skip rationale：
```yaml
# decisions/phase-skip-B.yaml
skipped: "Phase-B"
rationale: "hotfix 任务，问题已由用户直接定义，不需要 PM 分析"
why_safe: "scope 极小（单一 bug fix），风险由 D 阶段 review 覆盖"
accepted_risk: "无正式验收标准，依赖 D.3 Gate 3 人工确认"
affected_contracts: ["product-spec.md 不存在"]
```

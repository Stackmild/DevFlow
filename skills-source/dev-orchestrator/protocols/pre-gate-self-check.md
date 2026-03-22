# Pre-Gate Self-Check Protocol

> 每个 Gate 展示前，orchestrator 必须执行本协议中对应 Gate 的结构性检查。
> 本协议是 25 项检查（PG1/PG2/PG3）的**唯一权威定义处**——phase doc 和 SKILL.md 仅引用，不复制。
> 设计原则：纯结构性检查（无 LLM 语义判断），不替代 Phase F state-auditor 的完整审计。
> 本版采用偏保守分级；第一轮试点后，基于真实误报/漏报和实际阻断效果校准 WARN/BLOCK 级别。

---

## §1 执行流程

```
Gate 展示前 → 执行 pre-gate self-check（attempt_seq=1）
  │
  ├─ PASS / PASS_WITH_WARNINGS
  │   → 写 decisions/pre-gate-check-{N}.yaml
  │   → 展示 Gate（WARN 时顶部加警告）
  │
  └─ BLOCKED
      ├─ 有 BLOCK 项属于允许自修复范围（§5）
      │   → 执行自修复（最多一次）
      │   → 重跑检查（attempt_seq=2，repair_attempted=true）
      │   ├─ PASS/WARN → 写记录，展示 Gate
      │   └─ 仍 BLOCKED → 写记录，停止，展示 BLOCKED 结果
      │
      └─ 全部 BLOCK 项均不可自修复
          → 写记录，立即停止，展示 BLOCKED 结果
```

⚠️ **最多自动重跑一次**。attempt_seq > 2 不允许。

⚠️ **混合场景**：若同时存在可自修复和不可自修复的 BLOCK 项 → 修复可修复项 → 重跑检查 → 不可修复项仍为 BLOCK → 最终结果仍为 `blocked`。不允许因部分修复成功就跳过不可修复项。

---

## §2 检查清单

### §2.1 Gate 1 前（6 项）

| ID | 检查内容 | 来源 CHECK | 级别 |
|----|---------|-----------|------|
| PG1-1 | task.yaml `task_type` + `platform_capabilities` 非空 | CHECK-1 | BLOCK |
| PG1-2 | `artifacts/product-spec.md` 存在且非空 | CHECK-2 | BLOCK |
| PG1-3 | `completed_stages` 包含 PM skill 条目 | CHECK-2 | BLOCK |
| PG1-4 | `decisions/routing-decision-B.yaml` 存在且含 `phase`/`task_type`/`matched_skills` | CHECK-13 | BLOCK |
| PG1-5 | events.jsonl 含 `skill_dispatched(PM)` + `skill_completed(PM)` + `artifact_created(product-spec)` | CHECK-6 | WARN |
| PG1-6 | 无未解决的 `state_conflict_detected` 事件（无对应 `state_conflict_resolved`） | CHECK-17 | BLOCK |

### §2.2 Gate 2 前（8 项）

| ID | 检查内容 | 来源 CHECK | 级别 |
|----|---------|-----------|------|
| PG2-1 | `decisions/gate-1.yaml` 存在且 `decision: GO` | CHECK-5 | BLOCK |
| PG2-2 | `artifacts/implementation-scope.md` 存在且非空（Phase C 未 skip 时） | CHECK-2 | BLOCK |
| PG2-3 | `implementation-scope.md` 的 `source_skill` 元数据 ≠ `orchestrator` | CHECK-16 | BLOCK |
| PG2-4 | `decisions/routing-decision-C.yaml` 存在且含 `phase`/`task_type`/`matched_skills` | CHECK-13 | BLOCK |
| PG2-5 | routing-decision-C 每个 matched_skill：`completed_stages` 有条目 OR 有 `decisions/phase-skip-*.yaml` | CHECK-13 | BLOCK |
| PG2-6 | `handoffs/` 每个已 dispatch 的 skill 有对应 handoff packet | CHECK-8 | WARN |
| PG2-7 | events.jsonl 含 `gate_decision(direction)` 事件 | CHECK-6 | WARN |
| PG2-8 | 若 Phase C skip：`decisions/gate-2-skip.yaml` 存在且含 `gate`/`skip_reason`/`task_type`/`scope_item_count`/`why_skip` | CHECK-5 | BLOCK |

⚠️ PG2-8 通过时 Gate 2 本身也 skip——自检记录确认 skip 合法性。

### §2.3 Gate 3 前（11 项）

| ID | 检查内容 | 来源 CHECK | 级别 |
|----|---------|-----------|------|
| PG3-1 | `artifacts/change-package-*.yaml` 至少存在一个 | CHECK-11 | BLOCK |
| PG3-2 | change-package `revision_seq` 从 0 连续递增 | CHECK-11 | WARN |
| PG3-3 | change-package 6 个 NORMAL 质量字段非空（`files_touched`/`diff_summary`/`tests_run`/`upstream_contract_checks`/`unresolved_risks`/`scope_flags`） | CHECK-1 | WARN |
| PG3-4 | `completed_stages` 含至少 1 个独立 reviewer 条目（非 orchestrator） | CHECK-12 | BLOCK |
| PG3-5 | `artifacts/` 至少有 1 个 `*-report.yaml`（或 fallback 记录） | CHECK-12 | BLOCK |
| PG3-6 | `decisions/gate-2.yaml`（或 `gate-2-skip.yaml`）存在 | CHECK-5 | BLOCK |
| PG3-7 | `decisions/routing-decision-D.yaml` 存在 | CHECK-13 | BLOCK |
| PG3-8 | `issues/` 中无 `severity: blocker, status ≠ resolved` | CHECK-3 | BLOCK |
| PG3-9 | `artifacts/review-completeness-summary.yaml` 存在 | CHECK-12 | WARN |
| PG3-10 | 若 events.jsonl 含 `inline_fallback` / `review_inline_fallback` / `review_format_fallback`：确认 Gate 展示计划包含 degraded 标注 | CHECK-15 | WARN |
| PG3-11 | events.jsonl 含 `skill_dispatched(fsd)` | CHECK-16 | BLOCK |

---

## §3 BLOCK/WARN 分类原则

**BLOCK**（Gate 前置条件未成立，Gate 不展示）：
- 缺失 Gate 展示依赖的必要 artifact（用户无法做出知情决策）
- 缺失前序 Gate 的决策记录（结构性先决条件链断裂）
- 铁律违规可被结构检测到（#9 审查独立性、#13 orchestrator 不写代码）
- 未解决的 P0 blocker（Gate 3）

**WARN**（Gate 正常展示，但顶部标注警告）：
- 事件轨迹缺口（events.jsonl 缺条目）——用户仍能决策，但可追溯性受损
- handoff packet 覆盖不足——流程合规问题，非内容问题
- change-package 质量字段不完整——artifact 存在但可能偏薄
- review-completeness-summary 缺失——信息性，非阻塞性
- 降级执行的 Gate 展示标注缺失——用户应知情但仍可决策

⚠️ 本版先采用偏保守分级。第一轮试点后，基于误报（不该 BLOCK 的 BLOCK 了）和漏报（该 BLOCK 的没拦住）校准。

---

## §4 BLOCK 语义（硬规则）

当 pre-gate self-check 最终结果为 `blocked` 时：

1. **不展示 Gate 正文**
2. **不展示 Gate 决策选项**（GO / PROCEED / ACCEPT 等）
3. **不让用户误以为已进入该 Gate**

`blocked` 不是"Gate 页面里带红字警告"——是 **Gate 前置条件未成立，Gate 本身尚未出现**。

只展示以下内容：

```
## ⛔ Pre-Gate {N} Self-Check: BLOCKED

| # | Check | Result | Detail |
|---|-------|--------|--------|
| PG{N}-1 | {描述} | PASS | OK |
| PG{N}-2 | {描述} | BLOCK | {具体缺失} |
| ... | ... | ... | ... |

### 缺失项
- PG{N}-X: {什么缺了，为什么这是 BLOCK}

### 已尝试自修复
- {否 — 此 BLOCK 项不属于允许自修复范围}
  或
- {是 — 修复了 {文件}，依据 {上游证据}；重跑后仍 BLOCK 因为 {原因}}

### 推荐行动
- {重新 dispatch {skill} / 补写 {文件} / 回退到 Phase {X} / ...}
```

WARN 时 Gate 正常展示，顶部加一行：
```
> ⚠️ Pre-Gate Self-Check: PASS with {N} warnings
> - PG{N}-X: {警告内容}
```

---

## §5 自修复边界（硬规则）

### 允许自修复——同时满足两个条件：

1. **orchestrator 自己负责写入的文件**    ← metadata / index / bookkeeping 类
   - routing-decision-{phase}.yaml
   - changelog.md 条目
   - task.yaml 字段（completed_stages、current_phase 等）

2. **已有充分上游执行证据**               ← 能够证明真实执行已发生
   - 证据来源：`skill_dispatched + skill_completed + completed_stages + phase context`
   - `artifact_created(...)` 事件不是所有场景下的硬前提——若 dispatch/completion/completed_stages 已足以证明阶段真实完成，可允许补写对应 metadata
   - 但若连"真实执行已发生"都不能证明，则不得修复
   - 例：events.jsonl 有 `skill_dispatched(PM)` + `skill_completed(PM)`，completed_stages 含 PM 条目，但 `routing-decision-B.yaml` 漏写 → 可自修复（即使 `artifact_created(product-spec)` 事件缺失，只要 artifact 文件本身存在）

### 明确禁止自修复——以下行为视为伪造证据，一律禁止：

- ❌ 补造 skill artifact（product-spec、implementation-scope、change-package、review-report 等）
- ❌ 补造 reviewer 或 FSD 的 dispatch/completion 事件
- ❌ 在没有真实执行证据时反推 gate decision
- ❌ 补造 handoff-packet
- ❌ 任何带有"编造既成事实"性质的修复

**一句话**：可以补漏写的 orchestrator-owned metadata；不可以伪造本应由其他阶段或 skill 真实产出的证据。

### 判定规则

如果 orchestrator 不确定某个修复是否属于"允许"范围，**默认不修复，向用户展示 BLOCKED**。

---

## §6 自动重跑限制

- 每次 Gate 展示前，自动跑一次 pre-gate self-check
- 若 BLOCK 且有项属于允许自修复范围：**最多自动自修复一次 + 重跑一次**
- 若重跑后仍 BLOCKED：立即停止，展示 blocked 结果 + 推荐行动
- **不做无限重试**。attempt_seq 最大值为 2

---

## §7 修复映射表

| Gate | BLOCK 场景 | 推荐行动 |
|------|-----------|---------|
| Gate 1 | PM artifact 缺失（PG1-2/3） | 重新 dispatch PM sub-agent |
| Gate 1 | routing-decision-B 缺失（PG1-4） | 自修复（如有执行证据）或补写 |
| Gate 1 | state conflict 未解决（PG1-6） | 执行 `../protocols/state-conflict-resolution.md` |
| Gate 2 | Gate 1 决策缺失（PG2-1） | **致命错误**——不应到达此步，PAUSE + 人工介入 |
| Gate 2 | implementation-scope 缺失（PG2-2） | 重新 dispatch 设计 sub-agent |
| Gate 2 | orchestrator 产出 scope（PG2-3） | 铁律 #13 违规——重新 dispatch sub-agent（新 handoff-packet） |
| Gate 2 | matched_skill 未完成/未 skip（PG2-5） | 完成 dispatch 或写 phase-skip 文件 |
| Gate 2 | gate-2-skip 文件不完整（PG2-8） | 补完 skip 文件字段 |
| Gate 3 | change-package 缺失（PG3-1） | 重新 dispatch FSD（回 D.1） |
| Gate 3 | 无独立 reviewer（PG3-4/5） | dispatch reviewer（回 D.2） |
| Gate 3 | Gate 2 决策缺失（PG3-6） | **致命错误**——PAUSE |
| Gate 3 | P0 blocker 未解决（PG3-8） | 展示 blocker 列表，建议 REVISE |
| Gate 3 | FSD 未 dispatch（PG3-11） | 回 D.1，从头 dispatch FSD |

---

## §8 自检记录 Schema

写入 `decisions/pre-gate-check-{N}.yaml`：

```yaml
check_id: "pre-gate-check-{N}"
check_version: "1.0"           # 与本协议版本对应
gate: {1|2|3}
gate_type: "{direction|scope|final}"
task_id: "{task_id}"
checked_at: "{ISO 8601}"

# — 重跑与覆盖 —
attempt_seq: 1                 # 本 Gate 第几次自检（从 1 开始，最大 2）
repair_attempted: false        # 在当前 attempt 开始前，是否已实际执行过一次修复动作
                               # ⚠️ 不是"本次检查发现存在可修复项"——是"上一轮 blocked 后，已实际修复过，所以第二轮标为 true"
supersedes: ""                 # 若 attempt_seq > 1，填上一次 attempt 归档记录的 artifact id
                               # 例："pre-gate-check-1-attempt-1"（指向归档文件名，不是泛泛逻辑 check_id）

# — 结果 —
result: "pass" | "pass_with_warnings" | "blocked"
block_count: 0
warn_count: 0

items:
  - id: "PG{N}-1"
    result: "pass" | "warn" | "block"
    detail: "{OK 或具体发现}"
    source_check: "CHECK-{X}"
  # ...（该 Gate 的全部检查项）

# — 仅当 repair_attempted=true —
repairs:
  - target: "{修复了什么文件/字段}"
    evidence: "{上游证据来源}"  # 如 "events.jsonl skill_completed(PM) at line 12"
```

⚠️ **artifact_id 命名规则**：`artifact_id = 文件名去后缀`。即 `pre-gate-check-1`（最终记录）和 `pre-gate-check-1-attempt-1`（归档记录）。`artifact_created` 事件 payload 和 `supersedes` 字段必须使用此 id。

⚠️ **validation rule**：`repair_attempted=true` IFF `repairs[]` 非空。两者不一致视为 schema 违规（CHECK-20 检查）。

⚠️ 事件写入：`artifact_created(artifact_type: state, artifact_id: pre-gate-check-{N})`——复用现有 canonical enum，不扩展。artifact_created 事件在检查完成后写入，不计入被检查的事件范围。

⚠️ 同一 Gate 若有多次 attempt，每次都写独立事件。

⚠️ **归档规则（非可选）**：若发生 attempt 2，则 attempt 1 **必须归档**为 `pre-gate-check-{N}-attempt-1.yaml`；最终 attempt 覆盖 `pre-gate-check-{N}.yaml`。不保留"可选归档"的模糊空间。

---

## §9 与 state-auditor 的关系

本协议是前移检查，不替代 state-auditor 的完整审计。

- state-auditor CHECK-1~19 继续在 Phase F 执行完整审计
- state-auditor 新增 CHECK-20 验证本协议的执行记录（见 state-auditor SKILL.md）
- 如果 pre-gate check 未拦住某个问题（漏报），state-auditor 仍会捕获——两层防线

---

## §10 校准策略

本版 WARN/BLOCK 分级为**偏保守初始值**。

第一轮试点后评估：
- **误报率**：哪些 BLOCK 不应阻塞（应降级为 WARN）
- **漏报率**：哪些 WARN 应该阻塞（应升级为 BLOCK）
- **拦截率**：Phase F state-auditor 发现的结构性 High/A 类遗漏中，有多少本应被 pre-gate check 提前拦下

基于试点数据调整，不在纸面阶段过度优化。

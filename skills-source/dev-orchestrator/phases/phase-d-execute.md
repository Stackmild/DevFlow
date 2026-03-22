# Phase D — Execute + Verify + Gate

> D 是一个不可拆分的执行闭环。进入 D = 必须完成 D.1→D.2→D.3。
> orchestrator 无法在 D.1 完成后跳过 D.2/D.3。

## PHASE D PROTOCOL

```
INPUT:
  - task.yaml: Phase C completed（或 C skip rationale 存在于 decisions/）
  - artifacts/implementation-scope.md（如 C 正常完成）或 artifacts/product-spec.md（如 C skip）
  - 所有 Phase C design artifacts listed in completed_stages

ORCHESTRATOR_ROLE:
  - 构造 handoff-packets，dispatch FSD 和 reviewers
  - 持久化 sub-agent 产出（artifacts, issues, events）
  - 管理回流循环
  - 展示 Gate 3
  - 不写代码、不写设计文档、不写审查报告

SUB_AGENT_ROLE:
  D.1: full-stack-developer 产出 change-package（MANDATORY）+ implementation report（RECOMMENDED）
  D.2: reviewer(s) 产出结构化 review reports（YAML + MD）

MUST_PRODUCE:
  D.1: artifacts/change-package-{seq}.yaml (MANDATORY), artifacts/implementation-report.md (RECOMMENDED)
  D.2: artifacts/{reviewer}-report.yaml（每个 reviewer）, issues/ 中覆盖所有 P0/P1 findings
  D.3: decisions/gate-3.yaml

⚠️ V4.3: change-package 是 D 阶段的 canonical implementation contract。
  reviewer / Gate 3 / state-auditor / downstream protocol 的机器消费对象统一以 change-package 为准。
  implementation-report 如存在，仅作人类阅读辅助，不得替代 change-package 作为机器消费输入。

EXIT_GATE:
  D.1→D.2: change-package 存在 + FSD 条目 in completed_stages + semantic events present
  D.2→D.3: ≥1 reviewer spawned + review reports exist + P0/P1 finding 覆盖率 100% + semantic events present
  D.3→F: gate-3.yaml written + all blockers resolved + task.yaml live state updated

EVENTS_REQUIRED:
  D.1: skill_dispatched(fsd), artifact_consumed(design→fsd), artifact_created(change-package), skill_completed(fsd)
  D.2: skill_dispatched(each reviewer), artifact_consumed(change-package→reviewer), artifact_created(each review-report), issue_raised(each P0/P1)
  D.3: gate_requested(final), gate_decision(final), known_gaps_collected
```

---

## Phase Entry Protocol

1. Read `task.yaml`（确认 Phase C completed 或 C skip rationale 存在）
2. Read `artifacts/implementation-scope.md`（如 Phase C 未 skip）或 `artifacts/product-spec.md`（如 C skip）
3. Read 本文档

---

## D.1 — Execute

### Capability Selector（实现）

通常只 spawn **full-stack-developer**。

### Sub-agent Dispatch

1. Read `./contracts/handoff-packet.md`
2. 构造 handoff-packet → `handoffs/handoff-D1-fsd-{seq}.yaml`
   - `input_artifacts` 引用 Phase C 产出（含 generated_at）
   - `input_freshness_checked: true`
3. events.jsonl（skill_dispatched）
4. events.jsonl（artifact_consumed —— Phase C artifact 消费回执）
   - `adopted: true`
   - `adoption_impact: "{C 的 design/scope 如何约束了本次实现}"`

### fsd 完成后

1. Read `./contracts/change-package.md`
2. fsd 必须产出 **change-package**（MANDATORY）；**implementation-report**（RECOMMENDED，不阻塞 D.2）
3. 写入 `artifacts/change-package-{seq}.yaml`；如有 impl-report → 写入 `artifacts/implementation-report.md`
4. ⚠️ orchestrator 检查 change-package 中的 `involves_external_sources` 字段 → 如为 `true` → 记录到 reviewer handoff 的 constraints 中 `data_source_authenticity_required: true`
4. 更新 completed_stages
5. 检查 Upstream Issues → 如有 BLOCKER，回流
6. events.jsonl（artifact_created + skill_completed + change_package_created）

### D.1 Exit Condition

```
⚠️ D.1 → D.2 Gate（blocking — 适用于首轮 + 所有 RE-ENTER 轮次，不区分）:
- [ ] artifacts/change-package-{seq}.yaml 存在且通过 NORMAL 最小质量门槛（见下方）
      ⚠️ change-package 不存在 = D.1 Exit FAIL，禁止进入 D.2
- [ ] change-package 使用 canonical 字段名（对照 contracts/change-package.md）：
      files_touched（非 files_changed）、diff_summary（非 summary）、
      tests_run、upstream_contract_checks、unresolved_risks
- [ ] completed_stages 有 full-stack-developer 条目
- [ ] EVENTS_REQUIRED（D.1）全部满足
- [ ] task.yaml live state 已更新（current_phase=phase_d_2）
- [ ] （RECOMMENDED）artifacts/implementation-report.md 存在 — 缺失不阻塞
```

### D.1 Runtime Fallback Classification（V4.1 新增，V4.3 收紧）

判定基于 **artifact 文件存在性 + 最小质量门槛**，不依赖 sub-agent 自报：

| 分类 | 判定条件 | 行为 |
|------|---------|------|
| **NORMAL** | `change-package-{seq}.yaml` 存在 + 通过最小质量门槛（见下表） | 收集 → artifacts/ → 进入 D.2 |
| **INCOMPLETE** | change-package 存在但未通过质量门槛（如 files_touched 为空、diff_summary 占位） | Re-spawn FSD（narrowed prompt 只补缺失字段）→ 2nd 也不合格 → orchestrator **仅补 metadata 壳** |
| **FAILED** | change-package 不存在，且 Agent tool 无有效返回 | Re-spawn（scope 缩小）→ 2nd 也失败 → INLINE_FALLBACK（见 SKILL.md §Runtime-Aware Dispatch Protocol）|

**D.1 NORMAL 最小质量门槛（V4.3 新增）**：

| 字段 | NORMAL 最低要求 |
|------|----------------|
| `files_touched` | 非空列表（≥1 项） |
| `diff_summary` | 非空 + 不含占位文本（"TBD" / "TODO" / "placeholder"） |
| `tests_run` | 每项为 `pass` / `fail` / `skip`；或显式 `not_run` + `reason` |
| `upstream_contract_checks` | 每项为 `aligned` / `deviated` / `no_contract`；或显式 `not_checked` + `reason` |
| `unresolved_risks` | 显式 `[]`（无风险）或列表（每项有 risk + severity） |
| `scope_flags` | 5 boolean 字段全部显式填写（不允许缺失或 null） |

不满足任一条件 → INCOMPLETE（非 NORMAL），触发 re-spawn 或 fallback。

Reviewer 若发现 `files_touched`、`diff_summary`、`scope_flags` 三者之间存在不一致（如 files_touched 含 index.html 但 scope_flags.ui=false），应在 review report 中明确标注。

> **Gate 3 摘要规则**：如 implementation-report 不存在，orchestrator 在 Gate 3 展示时必须从 change-package 的 `files_touched` + `diff_summary` 合成人类可读摘要。

**INCOMPLETE fallback 白名单（只补壳，不补脑）**：

orchestrator 允许补写：`files_touched`, `artifacts_present`, `tests_observed`, `fallback_reason`, `degraded_source: fsd_incomplete_output`, `requires_extra_review: true`

orchestrator **禁止**补写：设计意图、变更理由、自我评审、upstream_contract_checks、实现层面的主观解释

> **原则**: fallback 只能补 metadata，不得补 semantic reasoning。

---

## D.2 — Verify

### Reviewer Selector

⚠️ **Phase 2: Config-Driven Reviewer Selection**

orchestrator 必须读取 `../routing/phase-d-reviewer-selector.yaml` 执行 reviewer 选择。
下方 narrative rules 作为**人类可读说明文档**保留，但**不再是运行时执行依据**。

`decisions/routing-decision-D.yaml` 必须包含：
- `config_rule_matched`: 命中的 rule_id（如 `rule_ui` / `rule_data` / `rule_authenticity` / `shortcut_bugfix`）
- 如无命中 → `config_rule_matched: none` + `fallback_reason` + `fallback_review_set`

> **V4.3 试点验证备注**: selector config 结构已接入运行，但当前主要验证到 fallback 路径；conditional 命中路径仍需下一轮试点验证。

---

#### Narrative Rules（说明文档，非执行依据）

⚠️ **审查必须由独立 sub-agent 执行。orchestrator 不可自审。**

```
ALWAYS: code-reviewer（所有产出代码/配置变更的任务）

IF change includes UI / 前端行为 / interaction 变化:
  + webapp-consistency-audit

IF change includes data model / schema / API 变更:
  + pre-release-test-reviewer

IF change is pure bugfix / 小修复:
  code-reviewer only

IF change is full feature with UI + data:
  code-reviewer + webapp-consistency-audit + pre-release-test-reviewer
```

Reviewer Selector 结果写入 `decisions/routing-decision-D.yaml`。

### Data/Source Authenticity 触发规则（V4.3 新增）

```
IF 任务满足以下任一条件 → code-reviewer 必须启用 Data/Source Authenticity 检查（Layer 5a）：
- 涉及外部 URL / feed / source link（RSS, API endpoint, web scraping target）
- 涉及冷启动 seeded content（首次初始化的样例 / 示范 / 种子数据）
- 涉及抓取 / 聚合 / 展示外部内容（content aggregation pipeline）
- 涉及来源真实性会影响产品语义（用户看到的内容来自外部源）
```

触发判定由 orchestrator 在构造 reviewer handoff-packet 时执行（基于 task-brief + implementation-scope 中的数据源描述）。判定结果写入 reviewer handoff 的 constraints 字段：`data_source_authenticity_required: true/false`。

### Reviewer Dispatch（V4.1 强化 + V4.2 补充）

每个 reviewer：
1. 构造 handoff-packet → `handoffs/handoff-D2-{reviewer}-{seq}.yaml`
   - **必须包含**：change-package 引用（artifact_id + generated_at）、上游 design artifact 引用、已知 issues 列表
   - `expected_output_format: review-report.yaml (per contracts/review-report.md schema)`
   - **V4.2 新增** `available_artifacts`: 列出所有可供 reviewer 参考的上游 artifact
   - **V4.2 新增** `expected_consumption`: 列出 reviewer 应当检查的 artifact（如 change-package + backend-contract + implementation-scope）
2. Read `./contracts/review-report.md`（Review Contract v2 格式）
3. 同时写 events.jsonl（`skill_dispatched` + `artifact_consumed(change-package→reviewer)`）
4. Reviewer 必须产出结构化报告：`artifacts/{reviewer}-report.yaml` + `.md`

### Reviewer Output Validation（V4.1 新增，6 项验证）

Reviewer spawn 完成后，orchestrator **必须验证**：
1. `artifacts/{reviewer}-report.yaml` 存在且可解析为合法 YAML
2. YAML 中 `context_pulled` 非空
3. YAML 中 `contracts_checked` 非空
4. YAML 中 `verdict` 存在（accept / request_changes / accept_with_known_gaps）
5. 如 verdict=request_changes → `risks_by_severity` 中至少 1 条 critical/high finding
6. **V4.2 新增**: 检查 `missing_artifacts` 字段——reviewer 应声明哪些预期应看但未看到的 artifact

验证失败 → 进入 D.2 Runtime Fallback（见下方）。

> `missing_artifacts` 格式（reviewer report YAML 中新增可选字段）：
> ```yaml
> missing_artifacts:
>   - artifact_id: "backend-contract.md"
>     expected_for: "验证 data model 变更是否符合设计"
>     impact: "无法验证 schema 变更的设计合规性"
> ```
> 此字段用于事后解释"reviewer 为什么没抓到某个问题"。

### D.2 Runtime Fallback Classification（V4.1 新增）

| 分类 | 判定条件 | 行为 |
|------|---------|------|
| **NORMAL** | `{reviewer}-report.yaml` 存在 + 通过 5 项验证 | 持久化 → **立即执行 issues/ 提取原子步骤** |
| **INCOMPLETE** | prose 但不是 YAML / YAML 缺必填字段 | orchestrator 从 prose 提取 findings → issues/ → `review_format_fallback` 事件 → **必须满足降级继续条件** |
| **FAILED** | Reviewer 未完成 | Re-spawn → 2nd 也失败 → checklist review + `review_inline_fallback` 事件 → Gate 3 ⚠️ |

**D.2 prose fallback 降级继续条件**：

prose fallback 允许继续的前提，必须满足其一：
1. 至少有**另一个** reviewer 正常输出了 schema 合格的 YAML report
2. Gate 3 自动进入 `degraded_review_evidence` 状态，展示时标注哪个 reviewer 落入 fallback

> prose fallback 是保底，不是等价替代。不可把 prose fallback 当作与正常 review 等效的"通过"。

### issues/ 提取原子步骤（V4.1 新增）

Reviewer report 落盘后，**立即**执行（不可延迟到 D.2 Exit）：
1. 从 `{reviewer}-report.yaml` 的 `risks_by_severity` 中提取所有 severity≥P1 的 findings
2. 每个 finding → 写入 `issues/{family}-{seq}.yaml`（可 batch 为 `issues/review-batch-{reviewer}-{seq}.yaml`）
3. 每个 finding 必须有 `finding_id → issue_ref` 映射
4. 同时写 events.jsonl（每个 P0/P1 finding 一条 `issue_raised`）
5. 如 reviewer 落入 prose fallback → orchestrator 从 prose 手动提取 findings，同样写入 issues/

> 数据源建议：reviewer report YAML 的 `risks_by_severity` 字段可直接作为 issues/ 的数据源——提取是格式转换，不是语义判断。

### Issue/Risk 对象分类

- P0/P1 findings → `issues/issue-{seq}.yaml`（object_family: issue）
- known_gaps_if_accepted → `issues/gap-{seq}.yaml`（object_family: risk）
- override 决策 → `issues/override-{seq}.yaml`（object_family: override）

Read `./contracts/risk-status.md` 获取 schema。

### 回流循环

```
reviewer: [verdict: request_changes]
  → 写入 issues/issue-{seq}.yaml
  → 构造新 handoff-packet（supersedes_handoff_id 指向旧 packet）
    open_issues 包含触发 rework 的 finding
  → re-spawn fsd
  → fsd 产出新 change-package（revision_seq 递增）
    upstream_contract_checks 标注对 finding 的响应（consumption receipt 链 2）
  → 更新 issues/ status=resolved
  → events.jsonl（issue_resolved + revision_applied，caused_by_issue_id 指向 finding）
  → 继续到下一个 reviewer
```

### 三档修订制

| 档位 | 条件 | 行为 |
|------|------|------|
| 绿区 | 每 skill ≤1 次，全局 ≤2 次 | 自动修订 |
| 黄区 | 每 skill 第 2 次 或 全局第 3 次 | 暂停 warning |
| 红区 | 每 skill ≥3 次 或 全局 ≥5 次 | 强制停止 |

### Review Completeness Summary（V4.2 新增）

D.2 全部 reviewer 完成后、进入 D.3 Gate 3 前，orchestrator 必须生成一个结构化的 review summary 写入 `artifacts/review-completeness-summary.yaml`：

```yaml
total_reviewers: 3
normal_yaml_reviewers: 2
prose_fallback_reviewers: 1
inline_fallback_reviewers: 0
high_severity_findings: 5         # P0+P1 findings 总数
issue_risk_coverage:              # 每个 high-severity finding 的 disposition
  - finding_id: "F001"
    disposition: issue_ref         # issue_ref | risk_ref | false_positive
  - finding_id: "F002"
    disposition: risk_ref
unresolved_findings: 0
consumed_artifacts:
  - artifact_id: "change-package-0.yaml"
    consumed_by: [code-reviewer, pre-release-test-reviewer]
  - artifact_id: "implementation-scope.md"
    consumed_by: [code-reviewer]
missing_artifacts:
  - artifact_id: "frontend-design-spec.md"
    expected_for: "验证视觉一致性"
degraded_review: false
```

> 此 summary 在 Gate 3 展示中直接引用，也可作为 dashboard 数据源。

### D.2 Exit Condition（V4.1 重写）

```
⚠️ D.2 → D.3 Gate:
- [ ] ≥1 reviewer sub-agent 被 spawn（非 orchestrator 自审）
- [ ] review report 存在于 artifacts/（至少有 YAML 或 fallback 记录）
- [ ] **Finding 覆盖率 100%**: 所有 severity≥P1 的 findings 必须有 issue_ref / risk_ref / 或显式 false_positive 标注
      （交叉验证：reviewer report 中 P1+ findings 数 ≤ issues/ 中对应记录数）
- [ ] decisions/routing-decision-D.yaml 存在
- [ ] EVENTS_REQUIRED（D.2）全部满足（含 artifact_consumed(change-package→reviewer)）
- [ ] 如有 fallback：review_format_fallback 或 review_inline_fallback 事件已写入
- [ ] task.yaml live state 已更新（current_phase=phase_d_3）
```

---

## D.3 — Gate 3

### 前置验证

⚠️ Gate 3 展示前必须确认：
1. events.jsonl 存在且有 D.1+D.2 事件
2. decisions/gate-1.yaml 存在
3. artifacts/ 中有 change-package
4. issues/ 中所有 object_family:issue + severity:blocker 的条目 status=resolved

### Known Gaps 自动归集

1. 读取 issues/ 中所有 status ≠ resolved 的条目
2. P0 blocker 未 resolved → 禁止进入 Gate 3
3. P1/P2 → 写入 task.yaml known_gaps
4. events.jsonl（known_gaps_collected）

### Gate 3 展示

⚠️ **从 state store 读取，不从会话记忆拼接。**

```
## 🏁 Gate 3 — Final Acceptance

**产出 Artifacts**（从 completed_stages 读取）:
{列表}
**审查结果**: {reviewer verdicts}
**Issue 记录**: 总计 {N}，已解决 {N}，known_gaps {N}
**Known Gaps**: {列表}

请选择：
- [ACCEPT] 全部接受
- [REVISE] 指定返工部分
- [PAUSE] 保存
```

### Gate 3 后必须执行

1. 写入 `decisions/gate-3.yaml`（7 个字段全部必填；兼容旧任务 `gate-3.yaml`）
2. events.jsonl（gate_requested(final) + gate_decision(final)）
3. 如 ACCEPT → 进入 Phase F
4. ⚠️ **如用户在 ACCEPT 后请求额外工作** → 铁律 #15 生效 → 执行 `../contracts/continuation-protocol.md` §Pre-Action Check → 以固定模板输出结果 → 通过后走 write-through Template D。不可跳过 Pre-Action Check 直接操作任何文件。

### Phase D Exit Sequence（V4.3 硬规则）

Gate 3 决策写入后，必须按以下严格顺序完成 Phase D 退出：

1. `gate_decision(final)` event 写入 ← 已完成（Gate 3 展示时写入）
2. `phase_completed(phase_d)` event 写入 ← **必须在此步骤完成**
3. task.yaml.completed_phases 追加 phase_d 条目（铁律 #8）
4. `phase_entered(phase_f)` event 写入 ← 只有步骤 2-3 完成后才允许

> ⚠️ `gate_decision(final)` 后直接写 `phase_entered(phase_f)` = Phase D Exit FAIL。
> 这是 state-auditor CHECK-14 的检查项。

### D.3 Exit Condition

```
⚠️ Phase D Exit Checklist:
- [ ] decisions/gate-3.yaml 写入（7 字段完整，open_issues_count 与 issues/ 目录一致）
- [ ] change-package 存在于 artifacts/（通过 D.1 NORMAL 质量门槛）
- [ ] change-package scope_flags 5 字段全部显式填写
- [ ] review reports 存在于 artifacts/
- [ ] artifacts/review-completeness-summary.yaml 存在（D.2 产出）
- [ ] Finding 覆盖率：所有 P0/P1 findings 有 issue_ref/risk_ref/false_positive
- [ ] routing-decision-D.yaml 存在
- [ ] phase_completed(phase_d) event 已写入（在 gate_decision 之后、phase_entered(phase_f) 之前）
- [ ] EVENTS_REQUIRED（D.1+D.2+D.3）全部满足
- [ ] task.yaml live state 已更新（current_phase→phase_f）
- [ ] task.yaml.completed_phases 包含 phase_d 条目（铁律 #8 硬条件）
```

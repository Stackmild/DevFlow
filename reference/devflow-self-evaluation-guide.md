# DevFlow 自评指南

> 每次 DevFlow 试点/验证任务完成后的标准复盘框架。
> 版本：v1.3（v1.0 首次建立；v1.1 增加 handoff/change-package/trace/review-contract 检查；v1.2 从"结构存在"推进到"机制有效"；v1.3 强化 change-package 为 mandatory 检查、canonical event type 闭集检查、reviewer handoff 完整性、task.yaml 冻结检测）

---

## 1. 适用范围

本指南适用于以下场景：
- DevFlow orchestrator 完成一个开发任务（到达 Gate 3 或中途暂停）后的复盘
- 新版 skill 指令上线后的首次试跑验证
- 跨 session 恢复后的完整性检查

**不适用于**：
- 纯产品 bug 修复复盘（那是 incident review，不是 DevFlow 自评）
- skill 本身的能力评估（那是 skill benchmark）

---

## 2. 评估对象判定

每次评估前，必须先回答：**这次评估的对象到底是什么？**

| 任务性质 | 默认评估对象 | 产品结果的权重 |
|---------|------------|--------------|
| DevFlow 试点/验证任务 | **DevFlow 系统能力** | 低（产品 bug 只作为症状） |
| 正式产品开发（DevFlow 已稳定后） | 产品质量 + DevFlow 执行质量 | 中 |
| Hotfix / 紧急修复 | 产品修复效果 | 高 |

**默认规则**：
> 若本次任务是 DevFlow 试点/验证任务，则默认评估对象是 DevFlow 系统能力，而非产品本身。产品 bug 只能作为"DevFlow 失效的症状"引用，不能作为评估主线。

---

## 3. 评估优先级

评估时的注意力分配：

```
Layer 5: State / Issue / Decision / Recovery Evidence  ← 试点任务中最重要
Layer 4: Artifact Consumption / Contract Integrity      ← 试点任务中最重要
Layer 3: Artifact Quality                               ← 重要
Layer 2: Stage Execution                                ← 基础
Layer 1: Task Outcome                                   ← 试点任务中权重最低
```

**核心原则**：在 DevFlow 试点中，Layer 4-5 比 Layer 1 更重要。一个"产品做完了但 DevFlow 没留下可审计证据"的任务，评价应低于"产品有残缺但 DevFlow 闭环完整"的任务。

---

## 4. 分层评估框架

### Layer 1: Task Outcome（任务结果）

回答：产品/功能是否按要求交付？

| 检查项 | 含义 |
|--------|------|
| 功能完成度 | scope 中的改进项是否全部实现？ |
| 已知缺陷 | 有多少 bug 在交付后被发现？严重度分布？ |
| 用户满意度 | Gate 3 是 ACCEPT 还是 REVISE？ |

### Layer 2: Stage Execution（阶段执行）

回答：DevFlow 的每个阶段是否被正确执行？

| 检查项 | 含义 |
|--------|------|
| PM 阶段 | sub-skill 是否被正确调用（不是 orchestrator 替代）？ |
| 设计阶段 | 应调用的 skill 是否被调用？跳过是否有记录？ |
| 实现阶段 | fsd 是否收到了完整的上游 artifact？ |
| 审查阶段 | reviewer 是否独立 spawn？报告深度是否达标？ |
| Gate A/B | 决策是否被持久化？数据是否准确？ |

### Layer 3: Artifact Quality（产出质量）

回答：每个 artifact 的内容质量是否达标？

| 检查项 | 含义 |
|--------|------|
| 结构完整性 | artifact 是否按 skill 指令要求的格式输出？ |
| 内容深度 | 覆盖度是否与任务复杂度匹配？（行数可作为弱提示但不是判定标准；主标准是关键字段是否非空、evidence 是否覆盖高严重度 findings） |
| 可消费性 | artifact 的格式是否能被下游 agent 直接消费？ |

### Layer 4: Artifact Consumption / Contract Integrity（消费链与契约完整性）

回答：artifact 是否真的被下游消费并约束了行为？contract 是否显式存在？

| 检查项 | 含义 |
|--------|------|
| 消费证据 | 下游 artifact 中是否可追溯到上游 artifact 的具体内容？ |
| 行为改变 | 消费是否改变了下游 agent 的行为（vs 忽略）？ |
| contract 显式化 | 上下游之间的输入/输出格式是否被文件化？ |
| contract 检查 | review 是否检查了 design-impl contract？ |

### Layer 4.5: Handoff Packet / Change Package（交接与变更包）

> v1.1 新增。评估 sub-agent 调用和实现变更是否有结构化的输入-输出对象。

回答：每次 sub-agent 调用是否有显式交接？每次实现变更是否有可审阅的变更包？

| 检查项 | 含义 |
|--------|------|
| handoff-packet 存在性 | 每次 skill dispatch 前是否有 handoff-packet 文件？ |
| handoff-packet 完整性 | packet 是否包含 handoff_id、objective、required_inputs（含 version）、input_artifacts（含 generated_at）、constraints、expected_outputs、exit_checks？ |
| handoff-packet 新鲜度 | packet 的 input_artifacts 是否引用了最新版本？input_freshness_checked 是否为 true？ |
| handoff-packet 返工链路 | re-spawn 时是否生成了新 packet（有新 handoff_id）？supersedes_handoff_id 是否指向旧 packet？ |
| change-package 存在性 | 实现完成后是否有 change-package（而非只有散文 report）？ |
| change-package 可审阅性 | package 是否包含 files_touched、upstream_contract_checks、unresolved_risks、rollback_notes？ |
| change-package chain 连续性 | revision_seq 是否连续（0 → 1 → 2...）？每次 revision 是否有新 package？ |
| change-package 风险流转 | unresolved_risks 是否进入了 issues/ 中的 risk 对象？ |
| reviewer 基于 change-package | reviewer 是否显式引用了 change-package（而非只看代码文件）？ |
| 回流时关联 prior evidence | re-spawn 时 handoff-packet 是否引用了对应的 issue / prior review finding / change-package？ |

### Layer 5: State / Issue / Decision / Trace Evidence（系统证据与 Trace）

> v1.1 修订：从"Recovery Evidence"升级为"Trace Evidence"，强调 trace completeness 而非仅事件存在性。

回答：state store 是否足以支撑 trace 重建、post-run 分析和审计？

| 检查项 | 含义 |
|--------|------|
| trace completeness | events.jsonl 是否具备 trace_id + span_id + parent_span_id？能否从 events 重建完整的 span tree？ |
| causality links | caused_by_event_id / caused_by_issue_id 是否填充？能否追溯"revision 由哪个 finding 触发"、"rework 对应哪个 issue"？ |
| handoff/package 关联 | related_handoff_id / related_change_package_id 是否填充？能否关联 dispatch→artifact→review→revision→gate？ |
| event-artifact 关联 | 每条 artifact_created / artifact_consumed 事件是否引用了 artifact_refs？ |
| event-issue 关联 | 每条 issue_raised / issue_resolved 事件是否引用了 issue_refs？ |
| event-decision 关联 | 每条 gate_decision / phase_skipped 事件是否引用了对应 decisions/ 文件？ |
| orphan detection | 是否存在 orphan event（有 event 但无对应 artifact/issue/handoff）？orphan artifact（有文件但无 created 事件）？orphan issue（有 issue 但无 raised 事件）？ |
| task.yaml 同步性 | completed_stages / open_issues / known_gaps 是否与实际一致？ |
| issue lifecycle | issues/ 是否有记录？issue / risk / override 三类对象是否正确区分？是否有 open→resolve 的完整生命周期？ |
| decision 持久化 | Gate 决策、skip 决策是否全部写入 decisions/？ |
| trace chain 可重建性 | 只看 state store（不看对话），能否按 trace 重建 dispatch→artifact→review→revision→gate 完整链路？ |
| post-run 审计支持 | trace 是否能支持 state-auditor 做自动化完整性检查？ |

---

## 5. Checklist

### A. 目标层 [TO]

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| A1 | 这次任务原本要验证什么 DevFlow 能力？ | [PO] |
| A2 | 成功判据是产品完成还是机制完成？ | [PO] |
| A3 | 评估报告是否按正确的成功判据来评价？ | [PO] |

### B. 编排层 [OR]

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| B1 | orchestrator 是否调用了应调用的 skill？ | [OC] |
| B2 | 有没有 parent agent 偷做 sub-skill 的事（如自己写 PM 诊断）？ | [OC] |
| B3 | skip 是否被显式记录在 decisions/ 中（不只是 changelog 注释）？ | [OC] |
| B4 | skip 是否有合理准入条件（如 scope≤3 项且无新数据模型）？ | [OC] |
| B5 | 每个 phase 完成后是否更新了 task.yaml 的 completed_stages？ | [SC] |

### C. Artifact 层 [AR]

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| C1 | 每个关键阶段是否产出 artifact？ | [AP] |
| C2 | artifact 是否被注册到 state（completed_stages 中有 artifact 路径）？ | [AP] |
| C3 | artifact 是否被后续 agent 显式消费？ | [AC] |
| C4 | 消费是否有证据（下游产出中引用了上游内容）？ | [AC] |
| C5 | 消费是否改变了下游行为（vs 存在但被忽略）？ | [AC] |
| C6 | 哪些 artifact 是"装饰性"的（存在但未起控制作用）？ | [AC] |
| C7 | events.jsonl 中是否有 `artifact_consumed` 事件（含 adopted + adoption_impact）？（不依赖 artifact 文件头标注） | [AC] |

### D. Contract 层 [CO]

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| D1 | 上下游 contract 是否显式存在（文件化）？ | [CI] |
| D2 | 还是只存在于 parent agent 的临时上下文中？ | [CI] |
| D3 | 关键 contract 是否被 review 检查？ | [CI] [RE] |
| D4 | design → impl 之间的偏离是否在 implementation-scope 中显式登记？ | [CI] |
| D5 | Automation prompt 与代码之间的 contract 是否被验证？ | [CI] |

### E. Issue 层 [IS]

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| E1 | 是否有 issue 进入 issues/ 目录？ | [IL] |
| E2 | issue 是否有完整生命周期（open → route → revise → resolve / known_gap）？ | [IL] |
| E3 | issue 是否有 owner、状态、关闭依据？ | [IL] |
| E4 | review 提到的 P0/P1 问题是否回流到 issues/？ | [IL] |
| E5 | 关闭的 issue 是否有对应的 events.jsonl 事件？ | [IL] [SC] |

### F. State / Trace 层 [ST]

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| F1 | task.yaml 的 status 是否准确反映实际？ | [SC] |
| F2 | completed_stages 是否包含所有已完成的 skill？ | [SC] |
| F3 | open_issues / known_gaps 是否与 issues/ 目录一致？ | [SC] |
| F4 | events.jsonl 行数是否 ≥ changelog 事件数？ | [SC] |
| F5 | Gate 决策是否全部持久化到 decisions/？ | [SC] |
| F6 | events.jsonl 是否具备 trace_id + span_id + parent_span_id，能否重建 span tree？ | [SC] |
| F7 | events 是否有 caused_by_event_id / caused_by_issue_id，能否追溯因果链？ | [SC] |
| F7a | events 是否有 related_handoff_id / related_change_package_id，能否关联到对应执行对象？ | [SC] |
| F7b | 是否存在 orphan event / orphan artifact / orphan issue（有对象但无对应事件，或反过来）？ | [SC] |
| F8 | 只靠 state store（不翻对话），能否做 post-run 分析？ | [RA] |
| F9 | 只靠 state store，能否 resume 中断的任务？ | [RA] |

### G-1. Handoff / Change Package 层 [HC] （v1.1 新增）

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| H1 | 每次 skill dispatch 前是否有 handoff-packet 文件？ | [OC] [CI] |
| H2 | handoff-packet 是否包含 handoff_id、required_inputs（含 version）、input_artifacts（含 generated_at）、constraints、expected_outputs、exit_checks？ | [CI] |
| H3 | handoff-packet 是否引用了最新版本的 artifact？input_freshness_checked 是否为 true？ | [CI] |
| H4 | re-spawn 时是否生成了新 packet（新 handoff_id + supersedes_handoff_id 指向旧 packet）？ | [OC] [CI] |
| H5 | re-spawn 的 packet 是否引用了对应的 issue / prior review finding / change-package？ | [CI] |
| H6 | 实现完成后是否有 change-package（MANDATORY）？是否存在"只有 implementation-report 没有 change-package"的违规？change-package 是否通过 D.1 NORMAL 最小质量门槛（files_touched 非空、diff_summary 非占位、tests_run 显式、upstream_checks 显式、risks 显式）？ | [AP] [CI] |
| H7 | change-package 是否包含 upstream_contract_checks 和 unresolved_risks？ | [CI] |
| H8 | change-package 的 revision_seq 是否连续？每次 revision 是否有新 package？ | [CI] |
| H9 | change-package 的 unresolved_risks 是否进入了 issues/ 中的 risk 对象？ | [IL] |
| H10 | reviewer 是否显式引用了 change-package（而非只看代码文件）？ | [RE] |
| H11 | D.2 reviewer 的 handoff-packet 中是否有 change_package_ref + expected_consumption + missing_artifacts 字段？（V4.3 新增） | [CI] |

### G-2. 风险层 [RI]

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| G1 | 哪些风险被验证了（通过测试或 review）？ | [RE] |
| G2 | 哪些风险被跳过但没有建模？ | [RA] |
| G3 | 是否存在 accepted risk 未记录在 task.yaml？ | [RA] |
| G4 | 是否存在 incomplete validation 未记录？ | [RA] |
| G5 | 是否存在 pending follow-up 未记录？ | [RA] |

### G-3. Continuation Protocol 层 [CP]（v1.3 新增）

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| CP1 | Gate 3 ACCEPT 后是否有额外工作请求？ | [OC] |
| CP2 | 如有额外工作，是否走了续行协议（三条路径之一）？ | [OC] [CI] |
| CP3 | 续行协议的 `decisions/continuation-{seq}.yaml` 是否存在？ | [SC] |
| CP4 | 如走 RE-ENTER D → change-package revision_seq 是否递增？新 handoff-packet 是否生成？ | [CI] |
| CP5 | 如走 FOLLOW-UP → 当前任务是否进入 Phase F closeout？新 task_id 是否创建？ | [OC] [SC] |
| CP6 | 如走 RECORD AND STOP → issues/ 中是否有对应的 risk/override 记录？ | [IL] |
| CP7 | 是否存在 Gate 3 后的 ad-hoc 工作（不在任何续行路径中）？ | [OC]（此项出现 = 严重违规） |
| CP8 | multi-item 请求是否逐条分类且每条有 item_id？ | [OC] [SC] |
| CP9 | 所有 items 是否都有 resolution（非空）？ | [IL] [SC] |
| CP10 | deferred items 是否有对应 issues/deferred-item-*.yaml？ | [IL] |
| CP11 | non_code_action items 是否有 result 记录？ | [SC] |

### G-4. Runtime Fallback 层 [RF]（v1.3 新增）

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| RF1 | 是否有 inline_fallback 事件？如有，rationale 是否充分？ | [OC] |
| RF2 | inline_fallback 是否在 2 次 spawn 失败后才触发（而非首选）？ | [OC] |
| RF3 | inline_fallback 产出的内容是否在 Gate 3 展示时标注了 ⚠️ 标记？ | [RE] [SC] |
| RF4 | review_format_fallback 发生时，orchestrator 提取的 findings 是否写入 issues/？ | [IL] |

### G-5. State Backbone 层 [SB]（v1.3 新增）

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| SB1 | task.yaml 的 current_phase 是否与实际执行 phase 一致？ | [SC] |
| SB2 | task.yaml 的 completed_phases 是否包含所有已完成 phase（含 completed_at + key_artifact）？ | [SC] |
| SB3 | task.yaml 的 open_issues_count 是否与 issues/ 中 open issue 数量一致？ | [SC] |
| SB4 | 任何 phase transition 前后 task.yaml 是否被更新？ | [SC] [RA] |
| SB5 | 如果只看 task.yaml（不看 events.jsonl 或对话），能否判断当前任务在哪个 phase？ | [RA] |

### G-6. Semantic Events 层 [SE]（v1.3 新增）

| # | 检查项 | Scoring 维度 |
|---|--------|-------------|
| SE1 | events.jsonl 是否只使用 canonical event type enum 中的名称（对照 event-protocol.md §2.1）？是否有非法别名（如 gate_b_presented）？ | [SC] |
| SE2 | 缺失的 semantic event 是否有对应的 fallback 事件记录？非闭集 event_type 是否被 state-auditor CHECK-7 检测？ | [SC] |
| SE3 | 每个 skill_dispatched 事件是否有对应的 skill_completed 事件？每个 phase_entered 是否有 phase_completed？ | [SC] |

> v1.3 新增维度说明：[CP] [RF] [SB] [SE] 检查项归入已有的 [OC]/[CI]/[SC]/[IL]/[RE]/[RA] 评分维度，不单独设权重。

---

## 6. Scoring Rubric

### 维度代码映射

| 代码 | 维度 | 权重（试点任务） |
|------|------|----------------|
| [OC] | Orchestration Correctness | 15% |
| [AP] | Artifact Production | 10% |
| [AC] | Artifact Consumption | 15% |
| [CI] | Contract Integrity | 15% |
| [RE] | Review Effectiveness | 10% |
| [IL] | Issue Lifecycle Closure | 10% |
| [SC] | State Completeness | 10% |
| [RA] | Recovery / Audit Readiness | 10% |
| [PO] | Product Outcome | 5% |

### 判定条件设计原则

- **基于"预期行为是否发生"**，不基于绝对数量
- A = 预期行为全部发生且可追溯；F = 预期行为完全缺失
- B/C/D 是中间梯度，按"发生比例"和"缺失是否有记录"区分

### 核心 3 维度详细判定

#### [AC] Artifact Consumption — A/B/C/D/F

| 等级 | 判定条件 | 场景示例 |
|------|---------|---------|
| **A** | 所有预期传递链（由 skill 指令定义）100% 可追溯；每个 artifact 有 events.jsonl 中的 consumption receipt（adopted=true + adoption_impact 非空）；消费改变了下游行为 | architect spec 被 fsd 引用并约束了代码结构；reviewer 对标 spec 发现偏差 |
| **B** | 80%+ 传递链可追溯；偶有 artifact 缺消费标注但实际被使用；有文档化的 skip rationale 解释缺失的链 | PM spec 被 fsd 消费但 reviewer 未引用；跳过的 design artifact 有记录 |
| **C** | 50%+ 传递链可追溯；部分 artifact 存在但无消费证据；缺失的链无结构化记录 | PM spec 存在但只被 orchestrator 汇总，未被下游 skill 消费 |
| **D** | <50% 传递链可追溯；大量 artifact 是"装饰性"的 | 多数 artifact 存在但无任何消费证据 |
| **F** | 无法追溯任何消费证据；artifact 只是文件，不是系统证据 | 所有 artifact 都只是"产出后放着" |

**常见误判**：把"artifact 文件存在"判为 B/C。文件存在 ≠ 被消费。必须有下游引用证据。

#### [CI] Contract Integrity — A/B/C/D/F

| 等级 | 判定条件 | 场景示例 |
|------|---------|---------|
| **A** | 所有跨 skill 的 contract 都有显式文件（design spec、API skeleton 等）；偏离在 implementation-scope 中登记；review 对标 contract 检查 | architect 输出 spec → fsd 在 impl-scope 中标注采纳/降级/跳过 → reviewer 对标检查 |
| **B** | 核心 contract 存在（如 architecture-spec）；非核心可能缺失但有 skip rationale；review 引用了可用的 contract | 有 architecture-spec 但无 interaction-spec；缺失有记录 |
| **C** | 部分 contract 存在但不完整；跳过的 contract 有简短记录但无风险评估 | implementation-scope 内嵌了架构决策但不是正式的 architecture-spec |
| **D** | contract 几乎不存在；只有 orchestrator 的隐性理解在维持上下游衔接 | 设计阶段跳过，无 skip rationale，fsd 和 reviewer 在零 contract 下工作 |
| **F** | 无任何显式 contract；上下游完全靠 parent agent 的临时上下文连接 | 所有设计决策都在对话中口头完成，无文件沉淀 |

**常见误判**：把 implementation-scope.md 当作 architecture-spec。impl-scope 是 orchestrator 写的"做什么"清单，不是 architect 写的"为什么这样做"的设计文档。

#### [IL] Issue Lifecycle Closure — A/B/C/D/F

| 等级 | 判定条件 | 场景示例 |
|------|---------|---------|
| **A** | 所有 review findings (P0/P1) 写入 issues/；每个 issue 有 open→route→resolve/known_gap 生命周期；events.jsonl 有对应事件 | 5 个 findings → 5 个 issue 文件 → 3 resolved + 2 known_gap |
| **B** | 大部分 findings 写入 issues/；lifecycle 基本完整但可能缺 events 记录 | 4/5 findings 有 issue 记录，1 个遗漏 |
| **C** | 部分 findings 写入 issues/ 但 lifecycle 不完整（缺 resolve 记录） | issues/ 有文件但 status 未更新 |
| **D** | issues/ 有少量记录但大部分 findings 未进入 | 5 findings 只有 1 个写入 issues/ |
| **F** | issues/ 为空；所有问题处理都在对话上下文中完成，无结构化记录 | issues/ 空目录 |

**常见误判**：把"问题被修复了"判为 B/C。修复不等于 lifecycle 完整——"问题被处理了但 issues/ 为空"仍然是 F。

### 其他 6 维度简要判定

| 维度 | A 的核心条件 | F 的核心条件 |
|------|-------------|-------------|
| [OC] | 所有应调用的 skill 被调用；skip 有结构化记录；orchestrator 未替代 sub-skill | orchestrator 完全跳过 skill 层，自己做所有工作 |
| [AP] | 每个阶段产出符合 skill 指令格式的 artifact；注册到 state | 关键阶段无 artifact 产出 |
| [RE] | **主标准**：context_pulled 非空 + contracts_checked 非空 + 高严重度 findings 有 evidence + missing_tests 已声明 + verdict 与 findings/risk 一致 + verdict 真正改变了后续执行。**弱提示**：行数偏短可提示深度不足但不单独判定 | context_pulled 为空或未声明；contracts_checked 为空；findings 无 evidence；verdict 与 findings 矛盾；review 存在但未改变任何后续行为 |
| [SC] | task.yaml 全字段与实际同步；events.jsonl 覆盖全部事件；decisions/ 完整 | task.yaml 多字段过期；events.jsonl 中断；decisions/ 不完整 |
| [RA] | 只靠 state store 能重建 80%+ 执行过程；能 resume 中断任务 | state store 无法支撑任何 post-run 分析 |
| [PO] | 产品功能按 scope 交付；无 P0 bug | 产品功能大量缺失；多个 P0 bug |

---

## 7. 常见误判

### 结构性误判（从 DevFlow 设计原理可推导）

| # | 误判 | 正确理解 | 后果 |
|---|------|---------|------|
| M1 | 把"产出了 artifact"当成"artifact 生效" | artifact 必须被下游消费且改变行为才算生效 | 高估 Layer 3/4 |
| M2 | 把"Gate 展示了信息"当成"Gate 约束了执行" | Gate 约束力 = 决策改变了后续行为 + 数据准确 | 高估 Gate 有效性 |
| M3 | 把"code review 存在"当成"review 有效" | review 有效 = context_pulled 非空 + contracts_checked 非空 + 高严重度 findings 有 evidence + verdict 改变了后续行为。行数不是主标准 | 高估审查质量 |
| M3a | 把行数当成 review 有效的代理指标 | 行数只是弱提示。一个 100 行但 context_pulled 为空的 review 不比 30 行但有完整证据的 review 更有效 | 形式主义 |
| M4 | 把"state store 非空"当成"state 可审计" | 可审计 = 只靠 state 能重建执行过程 + 数据与实际一致 | 高估 Stage 2 就绪度 |
| M5 | 把"产品功能完成"当成"DevFlow 进步" | DevFlow 进步 = 机制闭环建立，不是产品做完了 | 评价口径错位 |
| M6 | 把"bug 数量少"当成"质量高" | bug 少可能是"没测到"而非"质量好" | 虚假自信 |
| M7 | 把"orchestrator 的口头汇总"当成"系统证据" | 系统证据 = 写入 state store 的结构化数据 | 对话依赖症 |

### 经验性误判（从 news-digest-v3 观察到，待后续试点验证）

| # | 误判 | 观察来源 | 待验证 |
|---|------|---------|--------|
| M8 | 把"changelog 完整"当成"events.jsonl 完整" | V3 试点中 changelog 21 行但 events.jsonl 只有 10 行 | 下次试点对比 |
| M9 | 把"PM 产出质量高"当成"PM 对下游有控制力" | V3 试点中 PM artifact 106 行但未被 reviewer 消费 | 需要追踪消费链 |
| M10 | 把"implementation-scope 存在"当成"design contract 存在" | V3 试点中 impl-scope 由 orchestrator 而非 architect 产出 | 需区分 scope vs spec |
| M11 | 把"5 项修复已应用"当成"issue lifecycle 运行" | V3 试点中修复了 5 项但 issues/ 为空 | 需检查 issues/ 目录 |
| M12 | 把"Gate 3 ACCEPT"当成"所有问题已解决" | V3 试点 Gate 3 open_issues=0 但实际有 P0+P1 bug | 需交叉验证 Gate 3 数据 |
| M13 | 把 `consumed_by` 标注当成 artifact 消费成立 | V3 试点中 product-improvement-spec.md 标注 consumed_by=architect(pending)，但 architect 被跳过 | 需检查 consumption receipt（adopted + impact） |
| M14 | 把 changelog / events 存在当成 trace 可评分、可审计 | V3 试点中 events.jsonl 存在但中断于 Phase 0，无 trace_id / span_id | 需验证 trace completeness（能否从 events 重建执行顺序） |
| M15 | 把"reviewer 被 spawn 了"当成"review 有上下文" | V3 试点中 reviewer 被独立 spawn（铁律通过）但缺少 design artifact 作为基准 | 需检查 handoff-packet 的 input_artifacts 是否完整 |
| M16 | 把"有 implementation report"当成"变更可审阅" | V3 试点中 implementation-report 是散文描述（77 行），不是结构化 change-package | 需检查 change-package 是否存在且包含 upstream_contract_checks |
| M17 | 把 consumption receipt 存在当成消费已生效 | receipt 中 adopted=true 但 adoption_impact 为空 → 形式上消费但实际没有改变行为 | 需检查 adoption_impact 非空且下游产出中有对应行为改变证据 |
| M18 | 把 events.jsonl 非空当成 trace 可评分 | events 存在但缺少 parent_span_id / caused_by 链接 → 无法重建因果关系 → trace 不可评分 | 需验证 span tree 可重建性和 orphan 检测 |
| M19 | 把 Gate ACCEPT 当成所有已知风险都已解决 | Gate 3 accept 时可能有 accepted_risk / known_gap / deferred_fix 对象仍为 open → accept ≠ 风险为零 | 需检查 issues/ 中 risk 类对象的 open 数量 |
| M20 | 把"Gate 3 后直接改代码"当成"任务继续" | Gate 3 后所有工作必须走续行协议（RE-ENTER D / FOLLOW-UP / RECORD AND STOP），否则是系统逃逸 | 高估 [OC]，遗漏 bypass |
| M21 | 把"inline_fallback 事件存在"当成"问题已解决" | inline_fallback 意味着 sub-agent 失败了 2 次，这本身是一个需诊断的信号 | 遗漏 skill 失效的根因分析 |
| M22 | 把"task.yaml 非空"当成"state backbone 有效" | 如果 current_phase 仍停在 phase_b 而实际已到 phase_d → state backbone 失效 | 高估 [SC] |

---

## 8. 输出模板

每次自评必须同时输出两类结论：

### 类别 A：产品/任务结论（简短）

```markdown
## 产品结论

- 功能完成度：{N}/{M} 项
- 已知缺陷：{P0: N, P1: N, P2: N}
- Gate 3 决策：{ACCEPT / REVISE / PAUSE}
- 一句话评价：{...}
```

### 类别 B：DevFlow 系统结论（主体）

```markdown
## DevFlow 系统结论

### 这次验证了什么
- {已验证的机制和能力}

### 没验证到什么
- {因跳过/缺失/降级而未被验证的机制}

### 哪些机制仍然是假闭环
- {文件存在但未被消费、Gate 存在但未约束、review 存在但未发现问题的情况}

### Scoring Summary

| 维度 | 等级 | 关键证据 |
|------|------|---------|
| [OC] Orchestration Correctness | {A-F} | {一句话证据} |
| [AP] Artifact Production | {A-F} | {...} |
| [AC] Artifact Consumption | {A-F} | {...} |
| [CI] Contract Integrity | {A-F} | {...} |
| [RE] Review Effectiveness | {A-F} | {...} |
| [IL] Issue Lifecycle Closure | {A-F} | {...} |
| [SC] State Completeness | {A-F} | {...} |
| [RA] Recovery / Audit Readiness | {A-F} | {...} |
| [PO] Product Outcome | {A-F} | {...} |

### 传递链分析摘要

| # | 传递链 | 状态 | 断裂点 |
|---|--------|------|--------|
| {N} | {描述} | {consumed-and-used / not-consumed / ...} | {如有} |

### 下一轮应优先修什么
- P0：{...}
- P1：{...}
```

---

## 9. 试点任务的特殊说明

当任务明确标注为"DevFlow 试点"或"DevFlow 验证"时，以下额外规则生效：

### 额外检查项

| # | 检查项 | 原因 |
|---|--------|------|
| S1 | 本次试点打算验证哪些 Stage 1/2/3 的能力？ | 试点有明确的系统验证目标 |
| S2 | 这些能力是否有对应的验证判据（来自架构设计文档）？ | 不能事后定义成功标准 |
| S3 | 验证判据是否全部通过？哪些未通过？ | 这才是试点的核心评价 |
| S4 | 未通过的判据，根因是 skill 指令问题、orchestrator 编排问题、还是平台限制？ | 区分可修复的问题和结构性限制 |
| S5 | 本次试点对 DevFlow 架构设计有什么修正建议？ | 试点的目的就是发现设计与现实的偏差 |

### 试点评分权重调整

试点任务中，[PO] Product Outcome 的权重从 5% 降至"仅供参考"；[AC] Artifact Consumption 和 [CI] Contract Integrity 的权重各提升到 20%。

### 试点"机制有效性"验证（v1.2 新增）

> 从"结构存在"推进到"机制有用"。在试点评估中，额外执行以下两项验证：

#### 验证 1：Downstream Behavior Change

抽一条关键链路，检查上游 artifact 被消费后，下游行为是否真的改变：
- review finding → 是否真的改变了 rework packet / change-package？
- design artifact → 是否真的约束了 files_touched / implementation decision？
- Gate A 决策 → 是否真的触发了对应的 skill dispatch？

判定：如果 consumption receipt 存在（adopted=true）但下游产出中找不到行为改变的证据 → 消费是假消费。

#### 验证 2：Review Catch Effectiveness

在试点验证时，允许设计一个"应当被 reviewer 发现"的已知 contract defect / risk：
- 检查 reviewer 是否抓到
- 如果没抓到，诊断原因：是 context 缺失（handoff-packet 不完整）、contract 缺失（设计阶段被跳过）、还是 review skill 本身失效
- 记录结果到试点报告的 Stage 验证结果中

### 试点报告的必备章节

除标准输出模板外，试点报告必须额外包含：
1. **Architecture Design 对齐分析** — 本次执行与架构设计文档的偏差列表
2. **Stage 验证结果** — 按架构文档的 Stage 判据逐项标注 pass/fail
3. **下次试点的验证目标** — 基于本次发现，下次试点应优先验证什么
4. **Downstream Behavior Change 验证结果** — 至少 1 条链路的行为改变追踪
5. **Review Catch Effectiveness 验证结果** — reviewer 是否抓到了预设的已知缺陷

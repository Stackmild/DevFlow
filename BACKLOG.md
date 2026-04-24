# DevFlow Backlog

> 最后更新：2026-04-12（DevFlow Enforcer Phase 1 收尾）  
> 用途：记录已讨论但暂缓、以及候选评估的补强项。不是执行计划，是决策记录。  
> 新增/变更规则：每次补强结束后更新，字段必须完整（priority / status / reason_deferred / complexity_budget_risk / truth_source_risk / next_trigger）。

---

## A. 已实现，待观察

> 目标：跑真实任务，观察副作用、填报质量、有无 schema 膨胀倾向。

| 项目 | 实现时间 | 说明 |
|------|---------|------|
| `completion_status` | 2026-04-05 | change-package + review-report 末尾加 4 值枚举 + completion_note。规则：blocked/needs_context 触发 early-exit；done/done_with_concerns 仍走 artifact 兜底 |
| `debug_closure` | 2026-04-05 | change-package 条件块，触发条件：task_type in [bugfix, hotfix]。closure check 而非 investigation 协议，4 个固定字段封顶 |
| `verification_boundary` | 2026-04-05 | change-package 条件块，触发条件：execution_plan 有 host_target 非空 / cloud_validation_required: true / delivery_readiness 存在。Gate 3 汇总声明，≤3 条/≤15 字硬约束 |

| DevFlow Enforcer Phase 1 | 2026-04-12 | Hook 路由器（`scripts/devflow-enforcer.mjs`）通过 Cowork PreToolUse/UserPromptSubmit hook 自动触发 devflow-gate.mjs 6 个 action（含 transition 原子转换）。已知边界：continuation 存在性检查，不校验 type 兼容性 |

**观察重点**：
- `completion_note` 是否出现超长写法（>2 句）
- `verification_boundary` 数组是否有膨胀倾向（条目数 > 3）
- `debug_closure` 对 FSD 的认知负担是否在可接受范围内
- Enforcer deny/allow 比例是否合理，是否出现误拦（非 DevFlow 文件被拦截）
- continuation_required deny 是否在正确场景触发（Gate 3 后且无 continuation 时才触发）

---

## B. 已讨论，明确暂缓

| 项目 | priority | status | reason_deferred | complexity_budget_risk | truth_source_risk | next_trigger |
|------|----------|--------|----------------|----------------------|-------------------|-------------|
| `routing_hints`（4 字段版） | P2 | deferred | 容易从 advisory 滑成隐性路由引擎；`involves_ui` 与 `scope_flags.ui` 语义重叠；下游消费者扩散风险高 | 子 Skill 外溢（多个 Phase prompt 依赖） | 高：与 scope_flags 形成平行真相源 | 观察到 ORC 在真实任务里分流质量明显不够，且无法通过更简单的字段解决时 |
| `task_focus`（1 字段简化版） | P1 | deferred | 比 routing_hints 克制，但仍可能成为新路由变量；当前先跑 Schema Signal Patch，看是否真的需要 | 低（单消费者设计）| 低 | Schema Signal Patch 跑 3-5 个任务后，若 ORC 分流仍有明显问题再评估 |
| 独立 `host_constraints` 块 | P2 | deferred | 与现有 `host_platform_context`、`protected_host_files`、`execution_plan`、`verification_boundary` 重叠，会制造多套宿主平台约束真相源 | Schema（3 处重叠） | 高 | 重新设计时先整合现有字段，不新增独立块 |
| `handoff_audience` | P1 | deferred | 有价值（宿主平台/human/agent 交接语义清晰），但不适合 P0 阶段 | Schema（需确认放在 handoff-packet 还是 continuation-protocol） | 低 | 下一轮涉及宿主平台 handoff 优化时 |
| 四阶段 debugging protocol | — | will_not_do | 解决的是"不会调试"问题，而非实际痛点；复杂度远高于 debug_closure；需要新增子协议文件 | ORC + 子 Skill 双层（3 个改动点） | 无 | 不进入后续评估 |
| 两阶段 review（spec compliance → code quality） | P2 | deferred | 有价值但属于更深层审查协议改造；当前 code-reviewer 5 层框架已能覆盖大部分场景 | 子 Skill（code-reviewer 内部重构） | 低（单 skill 内部） | 发现 spec compliance 与 code quality 混淆导致漏审时 |
| Gate 2 语义重构 | P2 | deferred | 会改变现有 PROCEED 语义；收益不足以覆盖主流程扰动；增加 Gate 决策字段会加重用户负担 | ORC（Gate 2 语义改变） | 无 | 多次出现"Gate 2 PROCEED 后发现方向错了"的模式后 |
| 条件化 Gate 检查矩阵 | P2 | deferred | 需要先有稳定的路由信号（task_focus 等）支撑，当前信号不足 | Gate 脚本（devflow-gate.mjs） | 无 | task_focus 或等效信号稳定后 |
| 完整 method taxonomy | — | will_not_do | 会显著加厚 ORC 认知负担；分类错误代价高；routing_hints 已经是简化版，不应升级回完整体系 | ORC（Phase A 强制决策） | 高（与 task_type 竞争） | 不进入后续评估 |
| TDD / Git worktree / 重型 workflow discipline | — | will_not_do | 不适合 Cowork 宿主环境；飞书妙搭场景无本地 Git；TDD 循环成本高 | — | — | 不进入后续评估 |
| 新增独立子协议文件体系 | — | will_not_do | 复杂度不是下沉而是转移，子协议膨胀风险高；本轮已验证不需要 | 子协议（膨胀风险） | — | 不进入后续评估 |

---

## C. 候选评估（后续按复杂度预算逐项评估）

| 项目 | priority | status | 价值 | complexity_budget_risk | truth_source_risk | next_trigger |
|------|----------|--------|------|----------------------|-------------------|-------------|
| `host_platform_context` 整合升级（条件必填） | P1 | candidate | 把 protected_host_files 从可选升级为条件必填；整合现有字段而非新增块 | Schema（1 行条件注释升级） | 低（整合不新增） | 下一轮有飞书妙搭宿主平台任务时 |
| 轻量路由信号（`task_focus` 单字段） | P1 | candidate | 5 值闭合枚举，单消费者（devflow-gate.mjs），不给 Phase prompt 广泛消费 | Gate 脚本（单消费者） | 低 | Schema Signal Patch 观察期后，若 ORC 分流质量不足 |
| `handoff_audience` | P1 | candidate | 明确 handoff 给人/宿主平台/agent，减少 Gate 3 后交接歧义 | Schema（handoff-packet 或 continuation-protocol 加 1 字段） | 低 | continuation-protocol 涉及跨平台交接的任务出现时 |
| 两阶段 review（code-reviewer 内部重构） | P2 | candidate | Pass 1 spec compliance + Pass 2 code quality，分层不混用 | 子 Skill（code-reviewer 内部，ORC 零改动） | 无 | 发现 spec 合规与代码质量混淆漏审时 |
| 条件化 Gate 检查 | P2 | candidate | 让 review-only / handoff-only 任务跳过不适用的 Gate 检查项 | Gate 脚本（读取 task_focus 做条件跳过） | 无 | task_focus 稳定后配套实现 |
| Gate 2 语义补强（design_direction_summary） | P2 | candidate | 让 frontend-design 在产出里加一句话方向总结，Gate 2 自然呈现而非新增决策字段 | 子 Skill（frontend-design 输出 +1 字段） | 无 | 多次出现设计方向在 Gate 2 后被推翻时 |
| change-audit / side-effect audit 模板化 | P1 | candidate | 把每轮补强前的 3 维复杂度审计（ORC/子 Skill/Schema）固化为轻量检查清单 | 参考文档（reference/ 加 1 个模板文件） | 无 | 下次讨论新补强项时直接用 |
| DevFlow Enforcer Phase 2：continuation type 兼容性校验 | P2 | candidate | NON-CODE / RECORD-STOP 类型的 continuation 不应允许 project_path 源码写入；Phase 1 只校验存在性，不校验类型。需读取 `latestContinuation().type` 并按类型判断写入权限 | enforcer（`scripts/devflow-enforcer.mjs` 1 处修改） | 无 | 观察到 NON-CODE continuation 后仍有源码写入 deny 未触发时 |
| host-platform 语义整合（`verification_boundary` + `host_platform_context` 对齐） | P2 | candidate | 两个字段目前语义邻近但不冲突，长期需要明确边界 | Schema（注释说明，不改字段） | 低（有 verification_boundary 触发条件设计说明兜底） | 出现"不知道该填哪个"的实际混淆时 |
| 提取 PHASE_ORDER/GATE_FOR_PHASE/BACKFLOW 共享常量 | P2 | candidate | `enter-phase.mjs` 和 `transition.mjs` 各维护一份阶段常量，GATE_FOR_PHASE 已出现内容差异（transition 是 superset）。提取到 `scripts/lib/phase-constants.mjs` 统一 import，消除漂移风险 | Gate 脚本（新增 1 个共享模块，改 2 个 import） | 无 | 任一文件的常量被修改时（change-audit ca-enforcer-gate-6fix-001 L1+L2 medium） |

---

## D. 组织原则

**下次评估某个候选项前，必须先回答：**

1. 对 ORC 主 Skill 加了几行？
2. 几个子 Skill 需要同步改？
3. 是否创造了新的 truth source？
4. 新字段是否有闭合约束（枚举封顶 / 数组限长 / 条件触发）？

4 个答案都在预算内才做，否则先简化再提。

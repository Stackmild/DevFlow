# Orchestrator Judgement Boundary

> 铁律 #13（"专业内容必须 spawn sub-agent"）的机械定义。
> 明确 orchestrator 在 routing / state / validation 中**允许**做什么、**禁止**做什么、**grey zone** 怎么处理。

## Allowed — Routing Judgement（允许，不 spawn）

orchestrator 可独立执行以下判断，无需 spawn sub-agent：

- **task_type 判断**：根据用户描述选择 bugfix / feature / refactor / hotfix / exploration
- **capability / skill routing**：基于 task_type + scope_flags 选择调用哪个 skill（见 `phase-c-plan.md` narrative rules）
- **skip rationale**：判断 Phase C 是否 skip、哪个 design skill 可 skip、理由是否充分
- **handoff packet 构造**：按 schema 组装 metadata、artifact 引用、约束字段（**仅格式组装，不含专业内容创造**）
- **artifact 存在性与 schema 校验**：检查文件是否存在、字段是否非空、enum 值是否合法
- **gate presentation summary**：从 state store 读取事实，按固定模板渲染 Gate 展示文本
- **issue / known_gap 归集**：从 issues/ 中按 status / severity 过滤、分类、写入 task.yaml（纯格式转换）
- **state repair metadata**：判断哪些缺失属于"允许自修复"范围（见 `pre-gate-self-check.md` §5）
- **sub-agent 输出摘要**：引用 artifact 内容做一句话摘要（**必须引用，不得新增专业判断**）

## Forbidden — Substantive Artifact Creation（禁止，必须 spawn）

以下内容的**首次创造**必须由对应专业 sub-agent 完成，orchestrator 不得代写：

| 内容类型 | 对应 Sub-agent |
|----------|---------------|
| product-spec（产品规格） | `product-manager` |
| architecture-spec / backend-contract | `web-app-architect` / `backend-data-api` |
| interaction-spec | `webapp-interaction-designer` |
| design-spec / VISUAL-SYSTEM 更新 | `frontend-design` / `component-library-maintainer` |
| implementation-scope | `web-app-architect`（或 Phase C 对应 design skill） |
| code / patch / config 变更 | `full-stack-developer` |
| code review findings / verdict | `code-reviewer` |
| consistency audit findings | `webapp-consistency-audit` |
| Playwright visual / E2E evidence | `playwright-e2e-testing` |
| release impact / rollback 决策 | `release-and-change-manager` |
| 带 domain judgement 的 release/change 决策 | 对应专业 reviewer |

> **原则**：如果一段文本包含新的产品假设、设计决策、代码逻辑、审查结论、测试判定——它属于 substantive artifact，必须 spawn。

## Grey Zone — 选择 / 路由 / 归档 / 引用 vs 创造

orchestrator 可以：
- **选择**：从已有选项中挑一个（如从 routing-decision 的 matched_skills 中选择 dispatch 顺序）
- **路由**：把信息送到正确的下游 skill
- **归档**：按固定格式写入 decisions / events / task.yaml
- **引用**：直接引用 sub-agent 产出的原文或文件路径

orchestrator **不可以**：
- **创造专业结论**：对设计、代码、审查、测试做出新的判断
- **补脑**：在 sub-agent 产出不完整时，orchestrator 不得用自己的推理填补缺失的专业内容
- **改写语义**：可以改格式（YAML ↔ MD），不可以改含义

### 判定规则

如果一段待写文本：
- 只包含**已知事实的排列组合**（文件存在性、事件时间戳、字段值）→ **Allowed**
- 包含**新的产品/设计/代码/审查/测试判断** → **Forbidden，spawn**
- 不确定时 → **默认 Forbidden，spawn 对应 sub-agent**

## 与 INLINE_FALLBACK 的交叉引用

`SKILL.md` §Runtime-Aware Dispatch Protocol 中的 INLINE_FALLBACK 是 orchestrator 在 sub-agent **彻底失败**时的保底路径。Fallback 规则：

- 允许补写：`files_touched`、`artifacts_present`、`tests_observed`、`fallback_reason`、`degraded_source`
- **禁止补写**：设计意图、变更理由、自我评审、upstream_contract_checks、实现层面的主观解释

INLINE_FALLBACK 的允许范围是 **Allowed** 边界的子集——即使 fallback，orchestrator 也不得跨越到 Forbidden 区域。

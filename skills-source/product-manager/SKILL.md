---
name: product-manager
description: |
  产品管理技能包主入口。识别任务类型、按默认路由策略选择子 skill 或组合路径，缺信息时先澄清或先做 problem-framing/outcome；禁止在条件不满足时直接写 PRD。适用于 PRD、问题澄清、机会判断、用户研究综合、outcome 与指标、优先级、roadmap、launch 决策等。
triggers:
  - product-manager
  - 产品管理
  - 产品分析
  - PRD
---

# Product Manager（主入口 / 编排层）

本 skill 是 Product Manager Skill 包的主入口。职责是**识别当前任务属于哪类 PM 工作**、**按默认路由策略选择子 skill 或组合路径**、在缺信息时先澄清或先做 discovery/problem-framing/outcome，在需求质量差时先重构问题而非顺从地产出文档；**禁止在不满足条件时直接写完整 PRD**。子 skills 作为工作流模块，由本 skill 按需引用。

---

## Best for

- 问题澄清与机会判断
- 用户研究与洞察综合
- Outcome 定义与成功指标
- 假设识别与验证设计
- 优先级排序与 trade-off 说明
- PRD / one-pager / design brief 等文档产出
- Roadmap 现实性检查
- Launch 决策与 post-launch review

---

## Not for / When NOT to use

- 用户已明确指定「直接按某子 skill 执行」且不需要编排时，可单独引用该子 skill，不必经主 skill 路由。
- 纯执行类任务（如只做格式整理、只做翻译）不适用本包。

---

## 默认路由策略（硬规则）

收到任何请求时，先做**任务分类**与**前置判断**，再决定调用哪个子 skill 或组合路径。以下为必须执行的规则，非建议。

**必须 Read `./reference/routing-guide.md` 获取完整前置判断五要素、默认路由规则表与常见组合路径。**

### 默认禁止原则

**在以下任一情况成立时，不得直接写完整 PRD：**

- 用户只给了一个 feature 想法，没有可陈述的「要解决的问题」
- 没有明确目标用户（谁、在什么情境下）
- 没有说明成功标准或可观测结果
- 关键约束缺失（如时间、资源、依赖未提及且影响范围与优先级）

若上述情况存在，必须先输出：**缺失项清单**、**建议先执行的子 skill（或澄清问题）**，并仅在用户补足或确认后再考虑进入 prd-writing。

---

## Required inputs

- 用户的请求或当前任务描述（可为一句话、一段话或已有材料）。

---

## Optional inputs

- 已有文档（PRD 草稿、访谈记录、指标定义等）
- 业务/产品上下文（若用户已提供）

---

## Default assumptions when context is missing

- 若用户未说明「已做过问题澄清/已定义 outcome」，则**不假定**问题与目标已清晰；按前置判断决定是否先走 problem-framing 或 outcome-definition。
- 若用户直接说「写个 PRD」，仍执行前置判断与默认禁止原则，不默认进入 prd-writing。

---

## Core workflow

1. **解析请求**：识别用户当前任务类型（写 PRD、澄清问题、定义指标、排序、roadmap、launch 等）。
2. **前置判断**：若涉及 PRD/方案/roadmap，按「默认路由策略」做五类判断。详见 `./reference/routing-guide.md`。
3. **路由决策**：
   - 若触犯「默认禁止原则」→ 输出缺失项清单 + 建议先执行的子 skill 或澄清问题；不进入 prd-writing。
   - 若问题/目标/范围不清 → 选择对应子 skill 或组合路径，并说明「建议先执行 X，再考虑 Y」。
   - 若已满足 prd-writing 前提 → 可引用 prd-writing，并可在输出中说明「基于当前问题与目标，进入 PRD 撰写」。
4. **引用子 skill**：按需读取并执行 `skills/<子 skill 名>/SKILL.md` 的 Core workflow 与 Output contract；不在此处重复子 skill 的正文内容。
5. **输出前自检**：执行 `./reference/checklists.md` §输出前自检清单。

---

## Output contract

本 skill 的输出随路由结果不同而不同：

- **当触犯默认禁止原则时**：输出须包含「Task framing」「缺失项清单」「Recommendation（建议先执行的子 skill 或澄清问题）」「Open questions / Next step」。
- **当路由到某一子 skill 时**：输出为该子 skill 的 Output contract；整体可沿用公共骨架（Task framing, Evidence, Assumptions, **Inference**（若有从输入推导出的中间判断，须显式标注，不得混同为 Evidence）, Analysis, Recommendation, Open questions / Next step），但不替代该子 skill 的专属结构。
- **当路由到组合路径时**：先说明本轮执行的步骤与顺序，再按顺序产出各步输出；最后可附「Next step」（下一步建议执行的子 skill）。

---

## Quality bar / Acceptance criteria

- 未在触犯默认禁止原则时产出完整 PRD。
- 路由理由与前置判断可被复现（读者能看出「为何先走 problem-framing 而非直接写 PRD」）。
- 输出中事实、推断（Inference）与假设被区分标注（若有）。
- 自检清单已执行且无遗漏。

---

## 外置参考

> 以下文件在对应节点**必须 Read**。

| 文件 | 使用时机 |
|------|---------|
| `./reference/routing-guide.md` | 执行前置判断与路由决策前 |
| `./reference/checklists.md` | 输出前自检 + 用户澄清时 |
| `./reference/pitfalls-and-examples.md` | 输出前自检后，对比自身输出形态 |

---

## Related skills / Handoff rules

- **problem-framing**：当问题定义不清或仅有 feature 想法时，先引用 `skills/problem-framing/SKILL.md`；其产出可作为 outcome-definition 与 prd-writing 的输入。
- **outcome-definition**：当目标或指标模糊时，引用 `skills/outcome-definition/SKILL.md`；其产出可作为 prd-writing 中 goals/metrics 的输入。
- **prd-writing**：仅在问题、目标、范围相对清晰且未触犯默认禁止原则时引用 `skills/prd-writing/SKILL.md`；若 prd-writing 的前置条件不满足，应 handoff 回 problem-framing 或 outcome-definition。
- 其他子 skills（discovery-synthesis、assumption-mapping、experiment-design、prioritization、roadmap-reality-check、launch-review）：按默认路由规则与常见组合路径在需要时引用对应 `skills/<名>/SKILL.md`。

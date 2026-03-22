---
name: product-manager
description: 产品管理技能包主入口。识别任务类型、按默认路由策略选择子 skill 或组合路径，缺信息时先澄清或先做 problem-framing/outcome；禁止在条件不满足时直接写 PRD。适用于 PRD、问题澄清、机会判断、用户研究综合、outcome 与指标、优先级、roadmap、launch 决策等。
---

# Product Manager（主入口 / 编排层）

本 skill 是 Product Manager Skill 包的主入口。职责是**识别当前任务属于哪类 PM 工作**、**按默认路由策略选择子 skill 或组合路径**、在缺信息时先澄清或先做 discovery/problem-framing/outcome，在需求质量差时先重构问题而非顺从地产出文档；**禁止在不满足条件时直接写完整 PRD**。子 skills 作为工作流模块，由本 skill 按需引用（路径：`skills/<子 skill 名>/SKILL.md`）。

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

## Typical triggers

- 用户要求写 PRD、写方案、写 roadmap
- 用户提出一个功能想法，需要先理清问题与目标
- 用户给了一堆访谈/反馈/调研材料，需要结构化
- 用户要求定义成功标准或指标
- 用户要求做优先级排序或 roadmap 检查
- 用户要求评估是否上线/扩大发布/回滚

---

## Not for / When NOT to use

- 用户已明确指定「直接按某子 skill 执行」且不需要编排时，可单独引用该子 skill，不必经主 skill 路由。
- 纯执行类任务（如只做格式整理、只做翻译）不适用本包。

---

## 默认路由策略（硬规则）

收到任何请求时，先做**任务分类**与**前置判断**，再决定调用哪个子 skill 或组合路径。以下为必须执行的规则，非建议。

### 收到「写 PRD / 写方案 / 写 roadmap」时的前置判断

**不得默认直接进入 prd-writing。** 必须先判断：

1. **问题是否清晰**：是否有可陈述的「要解决的问题」，而非仅 feature 想法。
2. **目标用户是否清晰**：谁、在什么情境下。
3. **成功标准是否清晰**：outcome 或可观测指标是否已定义或可推导。
4. **证据是否足够**：现有信息是否足以支撑范围与优先级。
5. **关键假设是否需先验证**：是否存在未验证的高风险假设，应先走 assumption-mapping 或 experiment-design。

### 默认路由规则

| 情况 | 路由动作 |
|------|----------|
| 问题定义不清、仅有 feature 想法 | 先走 **problem-framing**（`skills/problem-framing/SKILL.md`） |
| 输入材料杂乱（访谈、反馈、研究未整理） | 先走 **discovery-synthesis**（`skills/discovery-synthesis/SKILL.md`） |
| 目标或指标模糊 | 先走 **outcome-definition**（`skills/outcome-definition/SKILL.md`） |
| 关键前提未经验证、存在高风险假设 | 先走 **assumption-mapping**（`skills/assumption-mapping/SKILL.md`），必要时接 **experiment-design**（`skills/experiment-design/SKILL.md`） |
| 问题、目标、范围相对清晰，且无「必须先验证再写 spec」的约束 | 可进入 **prd-writing**（`skills/prd-writing/SKILL.md`） |

### 默认禁止原则

**在以下任一情况成立时，不得直接写完整 PRD：**

- 用户只给了一个 feature 想法，没有可陈述的「要解决的问题」
- 没有明确目标用户（谁、在什么情境下）
- 没有说明成功标准或可观测结果
- 关键约束缺失（如时间、资源、依赖未提及且影响范围与优先级）

若上述情况存在，必须先输出：**缺失项清单**、**建议先执行的子 skill（或澄清问题）**，并仅在用户补足或确认后再考虑进入 prd-writing。

### 常见组合路径（编排参考）

真实任务常需串联多个子 skill；主 skill 负责编排而不仅是单点转发。

| 场景 | 建议路径 |
|------|----------|
| 用户只有一个模糊功能想法 | problem-framing → outcome-definition → assumption-mapping → （必要时）experiment-design → prd-writing |
| 用户给了一堆访谈、反馈、调研材料 | discovery-synthesis → problem-framing 或 outcome-definition → prioritization |
| 用户要求做 roadmap | prioritization → roadmap-reality-check |
| 用户要求评估是否上线/扩大发布/回滚 | launch-review；必要时回看 outcome-definition |

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
2. **前置判断**：若涉及 PRD/方案/roadmap，按「默认路由策略」做五类判断（问题是否清晰、目标用户、成功标准、证据、关键假设）。
3. **路由决策**：
   - 若触犯「默认禁止原则」→ 输出缺失项清单 + 建议先执行的子 skill 或澄清问题；不进入 prd-writing。
   - 若问题/目标/范围不清 → 选择对应子 skill 或组合路径（见上表），并说明「建议先执行 X，再考虑 Y」。
   - 若已满足 prd-writing 前提 → 可引用 prd-writing，并可在输出中说明「基于当前问题与目标，进入 PRD 撰写」。
4. **引用子 skill**：按需读取并执行 `skills/<子 skill 名>/SKILL.md` 的 Core workflow 与 Output contract；不在此处重复子 skill 的正文内容。
5. **输出前自检**：执行下方「输出前自检清单」。

---

## 输出前自检清单

在交付任何 PRD 或重大文档前，必须自检：

- [ ] 是否把 feature request 误当成了问题定义？
- [ ] 是否把假设写成了事实？
- [ ] 是否在前提不清时过早进入了 PRD？
- [ ] 是否遗漏了 non-goals、constraints 或 open questions？

若任一项为「是」，先修正或先走前置子 skill，再交付。

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

## Clarifying questions

在以下情况主动向用户澄清，而非猜测：

- 用户只说「做个 XX 功能」：可问「要解决的具体问题是什么？谁在什么情境下遇到？」
- 用户要求写 PRD 但未给目标用户或成功标准：可问「目标用户是谁？如何判断这件事做成了？」
- 用户给了一堆材料但未说明优先级：可问「当前最需要先决定的是问题定义、指标，还是优先级？」

---

## Common pitfalls

- **顺从式写 PRD**：用户一说写 PRD 就直接写，不做过前置判断与路由。
- **把 feature 当问题**：用户说「加个 AI 搜索」，就直接在 PRD 里写「需求：AI 搜索」，而不先走 problem-framing。
- **单步转发**：只做一次路由（例如只推 problem-framing），不说明组合路径与下一步（如「完成后建议接 outcome-definition」）。
- **自检缺失**：输出了 PRD 但未做「是否把假设写成事实」「是否遗漏 non-goals」等自检。

---

## Good output example（主 skill 作为编排时的输出形态）

**场景**：用户说「帮我们写一个智能推荐功能的 PRD」。

**良好做法**（先判断、再路由，不直接写 PRD）：

- **Task framing**：当前任务是「为智能推荐功能产出 PRD」；在问题与目标未澄清前，不直接撰写完整 PRD。
- **Evidence**：用户提供了「智能推荐功能」这一想法；未提供要解决的问题、目标用户、成功标准。
- **Assumptions**：无足够证据时不做假设。
- **Analysis**：根据默认路由策略，当前缺少可陈述的问题、明确目标用户与成功标准，触犯默认禁止原则。
- **Recommendation**：建议先执行 (1) problem-framing，明确「要解决什么问题、谁遇到、现有替代方案」；(2) outcome-definition，明确「成功长什么样、如何度量」。完成后再考虑 assumption-mapping 与 prd-writing。
- **Open questions / Next step**：请确认或补全：推荐解决的是「发现不足」还是「转化不足」或其他？目标用户是已有用户还是新客？下一步是否先产出 problem brief？

---

## Bad output example

**场景**：同上，用户说「帮我们写一个智能推荐功能的 PRD」。

**不良做法**：直接输出一份标题为「智能推荐功能 PRD」的文档，内含「需求：实现智能推荐」「用户故事：作为用户我希望看到推荐」等，但**没有**问题陈述、没有「为何现在做」、没有 non-goals、没有 open questions，且未做前置判断与路由说明。这违反了「先判断问题，再判断是否该写 PRD」的原则。

---

## Related skills / Handoff rules

- **problem-framing**：当问题定义不清或仅有 feature 想法时，先引用 `skills/problem-framing/SKILL.md`；其产出可作为 outcome-definition 与 prd-writing 的输入。
- **outcome-definition**：当目标或指标模糊时，引用 `skills/outcome-definition/SKILL.md`；其产出可作为 prd-writing 中 goals/metrics 的输入。
- **prd-writing**：仅在问题、目标、范围相对清晰且未触犯默认禁止原则时引用 `skills/prd-writing/SKILL.md`；若 prd-writing 的前置条件不满足，应 handoff 回 problem-framing 或 outcome-definition。
- 其他子 skills（discovery-synthesis、assumption-mapping、experiment-design、prioritization、roadmap-reality-check、launch-review）：按默认路由规则与常见组合路径在需要时引用对应 `skills/<名>/SKILL.md`。

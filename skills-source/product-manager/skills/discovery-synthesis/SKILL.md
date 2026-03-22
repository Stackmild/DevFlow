---
name: discovery-synthesis
description: 将访谈、反馈、用户原话、研究笔记、support ticket、调研摘要等杂乱输入整理为结构化洞察。识别模式、反常信号、用户原话、痛点聚类、机会区域、仍不确定之处；区分 evidence 与 inference，不直接把研究材料变成功能列表。
---

# Discovery Synthesis

本 skill 将**杂乱的发现类输入**（访谈、反馈、用户原话、研究笔记、support ticket、调研摘要等）整理为**结构化洞察**，产出：关键模式、反常信号、用户原话、痛点聚类、机会区域、仍不确定之处。**不**直接把研究材料变成功能列表或需求；**不**替代 prioritization 或 PRD。输出中必须显式区分 Evidence（来自材料的直接事实）与 Inference（从材料推导出的判断），不把少量样本包装成确定结论；须能识别 sample bias、recency bias、loudest user bias。

---

## Best for

- 用户给了一堆未整理的访谈记录、反馈汇总、调研笔记
- 需要从零散材料中提炼模式与机会，尚未到写 PRD 或排优先级
- 需要区分「用户说了什么」与「我们推断出什么」

---

## Typical triggers

- 用户说「帮我们整理一下这些访谈/反馈」
- 主 skill 因「输入材料杂乱」路由到 discovery-synthesis
- 需要为 problem-framing 或 prioritization 提供结构化输入

---

## Not for / When NOT to use

- 材料已结构化、只需做问题框定或指标定义时，用 problem-framing 或 outcome-definition，不必先做 discovery-synthesis。
- 需要做多候选排序时，用 prioritization；本 skill 不产出优先级或 roadmap。
- 需要写 PRD 时，本 skill 只提供洞察输入，不替代 prd-writing。

---

## Required inputs

- 至少包含：访谈记录、用户反馈、研究笔记、support ticket、调研摘要等**原始或半原始发现类材料**（可为多段文本、列表或摘录）。若完全没有此类材料，无法执行本 skill，应先向用户索取或说明无法做 synthesis。

---

## Optional inputs

- 材料来源说明（如访谈对象、时间、样本量）
- 已有业务假设或待验证问题

---

## Default assumptions when context is missing

- 输入常常是**杂乱、矛盾、偏样本**的；不假定材料已代表全体用户或真实分布。
- **用户原话 ≠ 普遍结论**；**高频反馈 ≠ 高价值问题**；**大客户/声量大的用户 ≠ 全体用户需求**。输出中须显式提醒并标注推断与不确定。
- 证据不足时，不自动把几条访谈总结成「用户都需要 X」；须分层写出 evidence、inference、uncertainty。

---

## Core workflow

1. **通读与标注来源**：通读输入材料，标注来源类型与样本量（若可知）；若样本量极小或来源单一，在输出中标出「样本局限」。
2. **提取用户原话**：摘录能代表痛点或机会的**原文引用**，放入 Evidence；不改写为结论句。
3. **识别模式**：归纳重复出现的主题、行为或诉求；每项标出依据（来自哪几条材料），并区分「多次出现」与「仅单次出现」。
4. **识别反常信号**：与主旋律不一致的反馈、矛盾点、意外发现；单独列出，避免被主流叙事淹没。
5. **痛点聚类**：按主题聚类痛点或阻碍；每类注明是 Evidence（原话/行为可直接支撑）还是 Inference（需推断）；标出样本覆盖不足的类别。
6. **机会区域**：从模式与痛点推导出的机会方向；**必须**标为 Inference，并说明依据与不确定性。
7. **仍不确定之处**：无法从当前材料得出结论的问题、需补充调研的点、可能的偏差（sample/recency/loudest user bias）。
8. **输出分层**：按 Task framing, Evidence, Assumptions, Inference, Analysis, Recommendation, Open questions / Next step 组织；Analysis 内包含模式、反常信号、原话、痛点聚类、机会、不确定。

---

## Output contract

输出须采用以下结构，并显式体现 Evidence、Inference、Assumptions 的边界。

| 层 | 内容要求 |
|----|----------|
| **Task framing** | 本输出是发现材料的综合洞察，不是功能列表或 PRD；边界为「从材料中能看出什么、不能看出什么」。 |
| **Evidence** | 从材料中直接得到的事实：用户原话摘录、可计数的行为或反馈分布（若已知）；不含推断。 |
| **Assumptions** | 综合时采用的、尚未验证的假设（若存在，如「我们假设受访者代表核心用户」）。 |
| **Inference** | 从材料推导出的中间判断（如「可能说明用户更在意 X」）；须显式标注为 Inference，不得混同为 Evidence。 |
| **Analysis** | 本 skill 核心产出：见下「必含项」。 |
| **Recommendation** | 明确建议，不超过 3 条（如：建议先补某类用户访谈；建议接 problem-framing 对某痛点做问题框定）。 |
| **Open questions / Next step** | 仍不确定之处、建议下一步（如接 problem-framing / outcome-definition / prioritization）。 |

**必含项（Analysis 内）**：

- **关键模式**：重复出现的主题或行为；注明依据与出现次数/来源数。
- **反常信号**：与主旋律不一致、矛盾或意外发现。
- **用户原话**：在材料允许时，摘录有代表性的原文引用（可放在 Evidence，在 Analysis 中引用）。若材料有限，应如实说明样本或篇幅不足，而不是为满足格式凑数；重点是代表性与证据价值，不是固定条数。
- **痛点聚类**：按主题聚类的痛点；每类标 Evidence 或 Inference。
- **机会区域**：从模式与痛点推导出的机会方向；标为 Inference，并写清依据与不确定性。
- **仍不确定之处**：当前材料无法回答的问题、可能的偏差（sample bias、recency bias、loudest user bias）。

---

## Quality bar / Acceptance criteria

- 输出中**没有**把几条访谈直接总结成「用户都需要某功能」式的确定结论；若有推断，已标为 Inference 并说明依据。
- 用户原话以摘录形式出现，未改写为结论句；若有原话则注重代表性，材料不足时已说明而非凑数。
- 至少区分了 Evidence 与 Inference；Analysis 内边界清楚。
- 已列出「仍不确定之处」或偏差风险；无「无」敷衍。
- 未产出功能列表或优先级排序；若有机会方向，标为推断并建议后续步骤（如 problem-framing、prioritization）。

---

## Clarifying questions

在以下情况主动向用户澄清：

- 材料无来源或样本量：这些访谈/反馈来自多少用户、哪些类型？是否有明显偏样本（如只来自大客户）？
- 材料极少：当前材料是否足以做综合？是否计划补充更多来源？
- 目标不清：综合后主要用于问题框定、指标定义，还是优先级讨论？以便推荐下一步。

---

## Common pitfalls

- **原话当结论**：把用户说的「希望有 X」直接写成「用户需要 X 功能」，不区分陈述与推断。
- **高频当高价值**：把出现次数多的反馈等同于高价值问题，不追问样本是否偏、是否代表关键用户。
- **大客户当全体**：把大客户或声量大的用户诉求当成全体用户需求。
- **忽略反常信号**：只归纳主流，忽略矛盾或少数但重要的反馈。
- **直接产出功能列表**：跳过问题框定与优先级，把发现变成需求列表；本 skill 只产出洞察，不替代 prioritization 或 prd-writing。

---

## Good output example

**输入**：5 份访谈记录，用户多为「使用搜索功能的中小团队管理员」。

**良好输出（节选）**：

- **Task framing**：本输出为发现综合，不包含功能列表或 PRD；样本为 5 位中小团队管理员，存在样本局限。
- **Evidence**：原话摘录——「每次都要点好几层才能找到那个配置」；「我们的人不会用高级搜索，只能靠我找」；「希望有个地方能存我常找的」……（共 5 条，略）。
- **Assumptions**：当前假设受访者能代表「会主动用搜索的管理员」；未覆盖从不使用搜索的用户。
- **Inference**：从上述原话与行为可推断——**查找成本高**与**希望有快捷入口**是反复出现的主题；但「希望有地方存常找的」仅 1 人提及，不能推断为普遍需求。
- **关键模式**： (1) 多步操作才能到达目标（4/5 人）；(2) 依赖管理员个人作为「人肉搜索」（3/5 人）。**反常信号**：1 人表示「现有就够了」，与其他人形成对比。
- **痛点聚类**：查找效率、权限/能力集中在一人；每类有原话支撑，标 Evidence；「希望个性化快捷入口」仅 1 人，标 Inference、样本不足。
- **机会区域**：缩短路径或提供快捷入口（Inference，依据为多人口头诉求；需验证是否愿意为此改变行为）。**仍不确定**：不用的用户为何不用？样本偏「已用搜索的人」，存在 sample bias。
- **Recommendation**：建议对「查找效率」做 problem-framing；并补 1～2 个「不用搜索」的用户访谈以降低偏差。
- **Open questions / Next step**：是否接 problem-framing 对核心痛点做问题定义，或先补样本再综合？

---

## Bad output example

**输入**：同上，5 份访谈。

**不良输出（节选）**：

- **用户需求总结**：用户都需要更快的搜索路径；用户希望有个人收藏/快捷入口功能；用户对当前搜索体验不满。
- **建议**：做「快捷入口」功能和「搜索路径缩短」需求。

问题在于：把 5 条访谈直接总结成「用户都需要」的确定结论；未区分原话与推断；未标注样本局限与偏差；未列出反常信号（1 人表示够用）；未写「仍不确定之处」；直接产出功能建议，越过 problem-framing 与 prioritization。此类输出易放大偏样本结论，且无法支撑后续决策。

---

## Related skills / Handoff rules

- **problem-framing**：综合完成后，若需把某类痛点或机会转化为「要解决的问题」，交给 problem-framing。路径：`skills/problem-framing/SKILL.md`。典型时机：机会区域已列出，需明确问题陈述与目标用户时。
- **outcome-definition**：若需把机会或痛点转化为可观测的 outcome 与指标，交给 outcome-definition。路径：`skills/outcome-definition/SKILL.md`。
- **prioritization**：若需在多个机会或主题间做取舍，交给 prioritization；本 skill 不产出排序或 roadmap。路径：`skills/prioritization/SKILL.md`。
- **prd-writing**：本 skill 不替代 PRD；洞察可作为 PRD 的输入，但写 PRD 需先有问题、目标、范围，由主 skill 或 problem-framing / outcome-definition 前置。

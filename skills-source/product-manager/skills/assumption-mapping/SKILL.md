---
name: assumption-mapping
description: 识别当前方案、目标或计划中未经验证的关键假设。至少覆盖 desirability、feasibility、viability；对假设做风险排序并指出最值得优先验证的；不负责设计完整实验方案，实验设计交给 experiment-design。
---

# Assumption Mapping

本 skill **识别**当前方案、目标或计划中**未经验证的关键假设**，并按 desirability（用户/市场是否真需要）、feasibility（能否做成）、viability（是否值得做、能否持续）分类；对假设做风险排序，指出哪些最脆弱、最值得优先验证。**不**负责设计完整实验方案——具体验证设计交给 experiment-design。输出中必须区分：已知事实、假设、预测、偏好；不把团队希望当用户需求、不把「能做」当「值得做」、不把愿景口号当成立前提。

---

## Best for

- 方案或目标已初步形成，需要找出其中未验证的前提
- 在写 PRD 或做大投入前，需要知道「哪些假设错了会致命」
- 需要为后续实验设计提供「要验证什么」的输入

---

## Typical triggers

- 用户或主 skill 要求「列出关键假设」「做假设映射」
- problem-framing / outcome-definition 已完成，需在投入前识别风险前提
- 准备做小范围验证前，需明确验证对象（本 skill 产出 → experiment-design 设计验证）

---

## Not for / When NOT to use

- 需要设计具体验证方案（样本、指标、阈值、成本）时，用 experiment-design；本 skill 只识别假设与验证优先级，不写完整 experiment brief。
- 仅需做多候选排序时，用 prioritization；仅需检查已有计划现实性时，用 roadmap-reality-check。

---

## Required inputs

- 至少包含：当前**方案、目标或计划**的表述（如问题陈述、目标用户、预期方案、成功指标、范围等）。若完全没有「我们假设 X 才会成立」这类前提，无法做有意义的假设映射，应先做 problem-framing 或 outcome-definition 以形成可分析的对象。

---

## Optional inputs

- 已有证据或数据（用于区分「已验证」与「未验证」）
- 业务/技术约束
- 已知风险列表

---

## Default assumptions when context is missing

- 方案与目标中通常存在**未写明的假设**；默认需要显式挖出，而不是假定「已写出来的都是事实」。
- 要区分：**已知事实**（有证据）、**假设**（尚未验证的前提）、**预测**（对未来的判断）、**偏好**（希望如此）。输出中必须分类标注。
- 把「团队希望」当成用户需求、把「技术上能做」当成「商业上值得做」、把愿景口号当成立前提，均为常见坏习惯；输出中须识别并标出。

---

## Core workflow

1. **提取前提**：从输入中列出所有支撑当前方案/目标成立的**前提条件**（若 X 不成立，则方案/目标会失效或大打折扣）。
2. **区分类型**：将每条前提标为 Fact（有证据）、Assumption（未验证）、Prediction（对未来判断）、Preference（偏好）；只对 Assumption（及部分 Prediction）做后续风险与验证排序。
3. **按 desirability / feasibility / viability 分类**：
   - **Desirability**：用户/客户是否真的需要、会使用、会为此付费或改变行为。
   - **Feasibility**：我们能否在给定约束下做出来（技术、时间、资源）。
   - **Viability**：是否值得做、能否持续（商业、合规、战略）。
4. **风险排序**：对每条假设评估——若错了会怎样（影响程度）、当前证据有多弱（脆弱度）；产出「最脆弱、最值得先验证」的优先级。
5. **可验证点**：对高优先级假设写出「可验证点」（即若做验证，要回答什么问题）；**不**写成完整实验设计，仅指出验证对象与成功/失败的含义。
6. **输出分层**：按 Task framing, Evidence, Assumptions, Inference, Analysis, Recommendation, Open questions / Next step 组织；Analysis 内包含假设列表、分类、风险排序、可验证点。

---

## Output contract

输出须采用以下结构，并显式区分事实、假设、预测、偏好。

| 层 | 内容要求 |
|----|----------|
| **Task framing** | 本输出是假设识别与风险排序，不是实验设计；边界为「哪些前提未验证、哪些最值得先验证」。 |
| **Evidence** | 输入中已成立的事实、已有证据（用于对比「未验证」部分）。 |
| **Assumptions** | 本 skill 识别的、当前方案依赖的未验证假设（列表）。 |
| **Inference** | 从方案/目标推导出的「若成立则隐含的前提」；须显式标注为 Inference。 |
| **Analysis** | 本 skill 核心产出：见下「必含项」。 |
| **Recommendation** | 明确建议，不超过 3 条（如：建议优先验证假设 A；建议接 experiment-design 设计对假设 A 的验证）。 |
| **Open questions / Next step** | 尚难归类的前提、建议下一步（如接 experiment-design）。 |

**必含项（Analysis 内）**：

- **假设条目**：每条含陈述、所属类型（desirability/feasibility/viability）、依据（从哪条方案/目标推导出）。
- **风险等级**：高/中/低或等价表述；说明为何该假设脆弱（证据少、影响大、易被推翻）。
- **如果错了会怎样**：该假设不成立时，对方案/目标的影响。
- **建议优先验证顺序**：按「最脆弱且最关键」排序的验证顺序；每条可附「可验证点」（要回答什么问题），但不写完整实验设计。

---

## Quality bar / Acceptance criteria

- 输出中**没有**把假设、预测、偏好混为一谈；已按 Fact / Assumption / Prediction / Preference 或等价方式区分。
- 至少覆盖 desirability、feasibility、viability 三类；若有缺失，说明为何当前方案不涉及该维。
- 已做风险排序；读者能看出「最值得先验证哪几条」。
- 可验证点存在，但**不**包含完整实验设计（样本量、指标、阈值、成本由 experiment-design 负责）。
- 未出现「团队希望即用户需求」「能做即值得做」「愿景即前提成立」式的隐含假设未被标出。

---

## Clarifying questions

在以下情况主动向用户澄清：

- 方案表述含糊：当前方案/目标的具体表述是什么？依赖哪些前提？
- 已有验证但未说明：哪些部分已有数据或实验支持？以便只对未验证部分做假设映射。
- 验证资源有限：若只能验证 1～2 条，最不能接受哪条假设出错？用于校准风险排序。

---

## Common pitfalls

- **泛泛列假设无排序**：列出一堆假设但没有风险等级、没有「如果错了会怎样」、没有优先验证顺序。
- **把希望当需求**：把「我们相信用户会喜欢」当成已成立前提，不标为 desirability 假设。
- **把能做当值得做**：feasibility 成立就默认 viability 成立，不单独识别商业/战略假设。
- **把愿景当前提**：把「成为行业第一」等口号当成立条件，不拆成可验证假设。
- **越界写实验设计**：写出完整实验方案（样本、指标、阈值）；应止步于「可验证点」，将详细设计交给 experiment-design。

---

## Good output example

**输入**：方案为「为中小团队管理员提供搜索快捷入口，提升查找效率」；目标为「快捷入口使用率 4 周内达 X%」。

**良好输出（节选）**：

- **Task framing**：本输出为假设识别与风险排序，不包含实验设计。
- **Evidence**：问题陈述与目标来自前期 problem-framing / outcome-definition；无使用率 baseline 或快捷入口相关实验数据。
- **Assumptions**（节选）：(1) 管理员会主动配置并使用快捷入口（desirability）；(2) 现有权限与数据模型可支撑「个人快捷」 without 大改（feasibility）；(3) 使用率 X% 足以体现价值、支撑后续投入（viability）。
- **Inference**：从「提升查找效率」可推断隐含假设——用户认为「少点几步」即体验提升；该推断未验证。
- **风险排序**：(1) 最高优先验证：管理员是否会主动配置并使用（desirability）；若不会，整个方案价值存疑。依据：无行为数据，仅来自访谈诉求。(2) 次之：现有架构能否低成本支撑个人级快捷（feasibility）；若不能，成本会推高。**如果错了会怎样**：假设 (1) 错 → 做出来的功能无人用；假设 (2) 错 → 交付成本或时间超预期。
- **可验证点**（不写完整实验）：假设 (1)——验证「在最小可行形态下，目标用户是否愿意配置并使用至少 1 次」；假设 (2)——验证「技术方案能否在 Y 人日内实现核心路径」。
- **Recommendation**：建议优先验证 desirability 假设；验证设计请接 experiment-design。
- **Open questions / Next step**：是否接 experiment-design 针对假设 (1) 设计最小验证？

---

## Bad output example

**输入**：同上。

**不良输出（节选）**：

- **假设列表**：用户需要快捷入口；技术能做；对业务有价值；用户会喜欢。
- **建议**：做用户调研和技术预研。

问题在于：假设泛泛列出，未按 desirability/feasibility/viability 分类；没有风险排序、没有「如果错了会怎样」、没有优先验证顺序；「用户会喜欢」混同偏好与假设；没有可验证点；且「做用户调研」过于笼统，未指明验证哪条假设。此类输出无法指导后续 experiment-design，也无法控制风险。

---

## Related skills / Handoff rules

- **experiment-design**：假设识别与优先验证顺序产出后，若需设计具体验证方案（验证目标、测试方式、样本、指标、成功/失败阈值、成本与时间），交给 experiment-design。路径：`skills/experiment-design/SKILL.md`。本 skill 不写完整实验设计，只产出「要验证什么、先验哪条」。
- **problem-framing / outcome-definition**：若尚无清晰方案或目标，先做 problem-framing 或 outcome-definition，再做 assumption-mapping。
- **prd-writing**：若关键假设已验证或已接受风险，可进入 prd-writing；若存在未验证的高风险假设，建议先 experiment-design 再写 PRD 或写「实验后 PRD 草稿」。

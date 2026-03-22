---
name: outcome-definition
description: 把 feature 请求或模糊目标改写为清晰的 outcome 与 success metrics。区分 north-star/local metric、leading/lagging、baseline/target，识别 measurement risk 与 vanity metric 风险。
---

# Outcome Definition

本 skill 将**功能请求或模糊目标**改写为**可观测的 outcome（结果变化）**与**成功指标**，并区分 north-star / local metric、leading / lagging、baseline / target，标出 measurement risk 与 vanity metric 风险。不产出功能列表或 PRD，只产出「做成什么样算成功、如何测量」。

---

## Best for

- 用户说「要做 XX 功能」但未定义成功标准
- 目标被表述为「提升体验」「提升活跃」「更好用」等不可观测说法
- 需要为后续 PRD 或实验设计提供可测量的目标

---

## Typical triggers

- 用户要求定义成功指标、OKR 或 KPI
- 主 skill 因「目标或指标模糊」路由到 outcome-definition
- problem-framing 已完成，需要把「要解决的问题」转为可测量结果

---

## Not for / When NOT to use

- 问题尚未框定（不知为谁解决什么问题）时，应先做 problem-framing，再做 outcome-definition。
- 仅需做多候选排序（prioritization）或检查已有计划现实性（roadmap-reality-check）时，不适用本 skill。

---

## Required inputs

- 至少其一：(1) 要解决的问题陈述或 (2) 功能/产品方向描述。若两者皆无，无法定义有意义的 outcome，应先向用户索取或先做 problem-framing。

---

## Optional inputs

- 已有指标或数据（当前 baseline、历史趋势）
- 业务/产品上下文（战略重点、资源约束）
- problem brief 或问题框定产出

---

## Default assumptions when context is missing

- 用户常把 **output**（做了什么东西）或 **activity**（做了多少事）当目标；本 skill 强调 **outcome**（用户/业务结果发生了什么变化）。
- 若用户只说「提升体验」「提升活跃」，默认需要拆成可观测的结果变化与具体指标，并标出 measurement risk。
- 存在 vanity metric 风险（如只看点击不看完成率、只看 DAU 不看关键行为质量）时，必须在输出中显式指出。

---

## Core workflow

1. **区分 outcome / output / activity**：从输入中识别用户真正关心的**结果变化**（outcome），与单纯的「交付物」（output）或「动作量」（activity）区分开；若混在一起，在输出中分别列出并标注。
2. **North-star 或局部目标**：确定一个可解释的、与业务/用户价值直接相关的主指标（north-star），或在本项目范围内的局部目标（local metric）；写清定义与为何选它。
3. **Leading / lagging**：列出与主指标相关的 leading indicators（先于结果发生、可更快观测）和 lagging indicators（结果本身或滞后指标）；说明如何用 leading 做过程纠偏。
4. **Baseline / target**：若有数据，写出当前 baseline 与目标 target（含时间范围）；若无，标「待建立 baseline」并建议测量方式。
5. **Measurement risks**：列出可能影响指标可信度的因素（如样本偏差、周期、外部因素、指标定义歧义）；标注 vanity metric 风险（例如仅用点击率而忽略完成率、仅用 DAU 而忽略关键行为）。
6. **标注证据、推断与假设**：输出中区分哪些来自输入（Evidence）、哪些是从输入推导出的中间判断（Inference）、哪些是假设（Assumption）、哪些待验证。

---

## Output contract

输出默认采用以下结构；可在此基础上增加本 skill 专属段落。

| 层 | 内容要求 |
|----|----------|
| **Task framing** | 本输出是 outcome 与指标定义，不是功能列表或 PRD；边界为「成功长什么样、如何测量」。 |
| **Evidence** | 从输入中得到的事实、已有指标或数据引用。 |
| **Assumptions** | 当前采用的、尚未验证的假设（如「我们假设 X 与留存相关」）。 |
| **Inference** | 从输入推导出的中间判断（如从「更愿意用」推导出的可观测结果方向）；须显式标注为 Inference，不得混同为 Evidence。Analysis 内应区分 Evidence、Inference、Assumption、Recommendation 的边界。 |
| **Analysis** | 本 skill 核心产出：见下「必含项」。 |
| **Recommendation** | 明确建议，不超过 3 条（如：建议先建立 baseline 再设 target；建议补充 X 指标以降低 vanity 风险）。 |
| **Open questions / Next step** | 还缺什么、建议下一步（如接 assumption-mapping 或 prd-writing）。 |

**必含项（Analysis 内）**：

- **Outcome 陈述**：一句或一段描述「成功时，用户/业务结果会发生什么可观测变化」。
- **North-star 或 local metric**：主指标定义、为何选它、与 outcome 的关系。
- **Leading / lagging indicators**：至少各 1 个，并说明用途（纠偏 vs 最终结果）。
- **Baseline / target**：当前值（若有）与目标值（含时间窗口）；若无则标「待建立」并说明如何测。
- **Measurement risks**：可能影响测量可信度的因素；若有 vanity metric 风险必须写出。

---

## Quality bar / Acceptance criteria

- 目标**不是**「提升用户体验」「提升活跃度」等不可观测表述；已拆成具体结果变化与可测量指标。
- Outcome 与 output/activity 被区分；若存在混用，已在输出中标注。
- 至少包含 north-star 或 local metric、leading/lagging、baseline/target、measurement risks 中的必要项；缺失项标「待补充」。
- Vanity metric 风险若存在，已显式写出。

---

## Clarifying questions

在以下情况主动向用户澄清：

- 目标只有「提升体验/活跃」：具体希望用户行为或业务结果发生什么变化？如何用数据判断「提升了」？
- 只有 output 描述（如「上线搜索功能」）：上线后，成功如何定义？是搜索次数、找到率、还是后续转化？
- 指标很多但无主次：哪个指标是决策用的主指标？哪些是过程指标？

---

## Common pitfalls

- **空泛目标**：把「提升用户体验」「提升活跃度」直接当目标，不拆成可观测结果与指标。
- **Output 当 outcome**：把「完成 XX 功能上线」当成功标准，而不是「用户/业务结果发生 Y 变化」。
- **只写指标名不写定义**：如只写「DAU」「转化率」，不写口径、分子分母、时间窗口，导致后续无法一致测量。
- **忽略 vanity metric**：选用易被刷高、与真实价值脱节的指标（如仅点击、仅 DAU），且未在输出中标注风险。
- **不写 baseline**：只有 target 没有当前值，无法判断改进幅度与测量可行性。

---

## Good output example

**输入**：用户说「我们想提升推荐模块的体验，让用户更愿意用」。

**良好输出（节选）**：

- **Task framing**：本输出为 outcome 与指标定义，不包含功能方案。
- **Evidence**：用户表述为「提升推荐模块体验」「更愿意用」；可推断关心的是使用意愿或使用深度。
- **Assumptions**：假设「更愿意用」可体现为使用频率或关键行为完成率；待与业务确认是否与留存/转化挂钩。
- **Outcome 陈述**：成功时，**带推荐场景的目标用户**在**单位周期内完成「从推荐入口到有效转化」的占比**提升（有效转化需业务定义：如加购、下单、或某关键动作）。
- **North-star（本项目）**：推荐带来的转化占比（推荐入口 → 定义好的转化动作，在同一周期内）。选它因为与「更愿意用」和业务结果直接相关。
- **Leading**：推荐曝光后的点击率、点击到转化漏斗各步转化率；用于迭代中快速判断是否在改善。
- **Lagging**：推荐转化占比、该部分用户的留存/复购（视业务选一个）；用于周期末判断是否真正改善。
- **Baseline**：待建立。建议用最近 2～4 周数据，按当前推荐逻辑统计「推荐入口 → 转化」占比及漏斗各步。
- **Target**：在 baseline 建立后设定（例如「4 周内推荐转化占比 +X%」）；时间窗口与幅度需与业务对齐。
- **Measurement risks**：若仅用点击率，存在 vanity 风险（点击高不一定转化高）；因此主指标用转化占比。外部大促或改版可能干扰，需在分析时做同期对比或分群。
- **Recommendation**：建议先拉取 2～4 周 baseline，再定 target；并与业务确认「有效转化」口径。
- **Open questions / Next step**：转化口径确认后，可接 assumption-mapping 或 prd-writing。

---

## Bad output example

**输入**：同上，「我们想提升推荐模块的体验，让用户更愿意用」。

**不良输出（节选）**：

- **目标**：提升推荐模块用户体验，提升用户活跃度。
- **指标**：DAU 提升、点击率提升。

问题在于：目标仍是不可观测的「提升体验」「提升活跃度」；指标「DAU」「点击率」未定义口径、无 baseline、无 target；未区分 outcome 与 output/activity；未说明 leading/lagging；未提及 measurement risk，且「点击率」「DAU」易成 vanity metric（点击高、DAU 高未必代表「更愿意用」或业务结果变好）。此类输出无法指导后续设计与实验。

---

## Related skills / Handoff rules

- **problem-framing**：若问题尚未框定，应先做 problem-framing，再做 outcome-definition。路径：`skills/problem-framing/SKILL.md`。
- **prd-writing**：outcome 与指标定义完成后，可作为 PRD 中 goals、success metrics 的输入。路径：`skills/prd-writing/SKILL.md`。
- **assumption-mapping**：若指标或 outcome 依赖未验证的假设（如「我们假设点击率与留存相关」），可接 assumption-mapping 做假设识别与验证设计。

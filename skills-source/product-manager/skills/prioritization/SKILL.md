---
name: prioritization
description: 在多个候选事项之间做取舍，产出排序逻辑、trade-off、机会成本、明确不做什么及带理由的建议。可引用 RICE/ICE/Kano/战略契合等，但不机械套公式；不负责检查已形成 roadmap 的时间与资源现实性，那是 roadmap-reality-check 的职责。
---

# Prioritization

本 skill 在**多个候选事项之间做取舍**，产出：候选列表、排序逻辑、不确定性/敏感度、机会成本、**明确不做什么**、带理由的建议。不是只做「打分排序表」；须体现 why now、why not now、依赖关系、战略一致性，并能识别「看起来高分但不该做」的项。可引用 RICE、ICE、Kano、战略契合等框架，但**不能机械套公式**；须说明打分逻辑与 trade-off。**不**负责检查已形成的 roadmap 的时间线与资源现实性——那是 roadmap-reality-check 的职责。

---

## Best for

- 有多条候选（功能、项目、主题）需要排序或取舍
- 需要说清「为什么做这个、不做那个」「机会成本是什么」
- 需要为 roadmap 或季度计划提供优先级输入

---

## Typical triggers

- 用户要求「排个优先级」「做 RICE/ICE」「决定先做哪几个」
- discovery-synthesis 或 problem-framing 产出了多个机会，需取舍
- 主 skill 在组合路径中路由到 prioritization（如「做 roadmap」前先 prioritization）

---

## Not for / When NOT to use

- 需要检查**已形成的**阶段性计划、发布时间或路线图是否脱离现实（依赖、容量、验证前置）时，用 roadmap-reality-check；本 skill 不负责现实性检查。
- 仅有单一候选、无需取舍时，本 skill 无发挥空间；可说明「当前无多候选，无需排序」。

---

## Required inputs

- 至少包含：**候选事项列表**（功能、项目、主题等，可为简略描述）。若只有 1 条或 0 条，无法做取舍，应先向用户索取或先通过 discovery / problem-framing 产出候选。

---

## Optional inputs

- 战略或目标上下文（用于战略契合度判断）
- 资源或时间约束
- 已有评分或偏好（R、I、C、E 等若已部分存在）

---

## Default assumptions when context is missing

- 优先级不是「谁分高谁先做」；须结合依赖、战略、机会成本、why now 综合判断；可能存在「分数高但不该先做」或「分数不高但应先做」的项。
- **必须**写出「明确不做什么」及理由；否则易变成「都要做」的愿望清单。
- 若采用 RICE/ICE 等，数字仅为输入之一；最终建议须有 reasoning，不能只贴分数表。

---

## Core workflow

1. **确认候选列表**：列出所有参与排序的候选；若有遗漏或边界不清，在输出中标出。
2. **确定排序维度**：根据上下文选择维度（如 impact、confidence、effort、strategic fit、urgency、dependency）；可引用 RICE/ICE/Kano，但须说明为何用这些维度、权重或取舍逻辑。
3. **打分或定性排序**：对每项按维度评估；标注**不确定性**（如「impact 估计为高，但置信度中」）与**敏感度**（若某维变化，排序是否会变）。
4. **依赖与顺序**：标出项与项之间的依赖（A 依赖 B 则 B 通常需先做）；标出与战略或目标的契合度。
5. **机会成本**：做 A 意味着暂不做 B/C；显式写出「因选 X 而暂不做的项」及简要理由。
6. **What we are explicitly not doing**：列出本期/本轮**明确不做的**候选及原因（资源、战略、时机、验证未完成等）。
7. **Recommendation with reasoning**：给出排序或推荐顺序，并写清理由（综合分数、依赖、战略、why now/why not now）；不超过 3 条核心建议。
8. **输出分层**：按 Task framing, Evidence, Assumptions, Inference, Analysis, Recommendation, Open questions / Next step 组织；Analysis 内包含候选、维度、排序逻辑、机会成本、不做什么。

---

## Output contract

输出须采用以下结构，并确保「不做什么」与「理由」明确。

| 层 | 内容要求 |
|----|----------|
| **Task framing** | 本输出是优先级与取舍，不是 roadmap 现实性检查；边界为「多候选间排序与建议」。 |
| **Evidence** | 输入中的候选列表、已有约束或战略表述。 |
| **Assumptions** | 排序时采用的假设（如「我们假设资源固定」「假设战略重点为 X」）。 |
| **Inference** | 从分数或维度推导出的中间判断（如「A 与 B 接近，但因依赖故 A 优先」）；须显式标注。 |
| **Analysis** | 本 skill 核心产出：见下「必含项」。 |
| **Recommendation** | 明确建议，不超过 3 条；每条带理由（why now、trade-off、机会成本等）。 |
| **Open questions / Next step** | 不确定的排序、建议下一步（如接 roadmap-reality-check 做时间线检查）。 |

**必含项（Analysis 内）**：

- **Candidate list**：参与排序的候选及简要描述。
- **Ranking logic**：采用的维度、权重或取舍规则；若用 RICE/ICE 等，写出公式或逻辑，并说明不确定性（如 confidence 低时如何对待）。
- **Uncertainty / Sensitivity**：哪些项或维度不确定性高；若某维变化，排序是否会变。
- **Opportunity cost**：因选择当前优先项而暂不做的项及原因。
- **What we are explicitly not doing**：本期/本轮明确不做的**主要落选项**及原因。应覆盖所有主要落选候选；若候选较少则逐项说明即可。重点是「为什么现在不做」，不强行凑数量，避免为满足条数而写低质量落选项。
- **Recommendation with reasoning**：推荐顺序或 Top N，及理由（依赖、战略、why now、why not now）。

---

## Quality bar / Acceptance criteria

- 输出中**没有**仅呈现一张分数表而无 trade-off、无「不做什么」、无 reasoning。
- 排序逻辑可复现；读者能理解「为何 A 在 B 前」。
- 已写出「明确不做什么」及原因；主要落选项均有「为什么现在不做」的说明，无「都要做」或含糊带过；无为凑数而写的低质量落选项。
- 若存在依赖或战略考量，已纳入建议理由；无机械「按分数从高到低」。
- 不确定性或敏感度已标注；无「所有估计都确定」的隐含假设。

---

## Clarifying questions

在以下情况主动向用户澄清：

- 候选不清：参与排序的完整列表是什么？是否有隐式候选未列出？
- 战略或目标不明：当前阶段最看重什么（增长、留存、效率、合规等）？用于校准 strategic fit。
- 资源约束不明：时间或人力上限？用于判断「不做什么」与机会成本。

---

## Common pitfalls

- **机械套 RICE/ICE**：只贴 R、I、C、E 分数和总分，不解释 trade-off、不写不做什么、不考虑依赖与战略。
- **高分当高优先**：忽略「为什么现在做」「为什么暂不做那个」；分数高但时机或依赖不满足时仍应说明。
- **不写机会成本**：不说明做 A 意味着不做 B/C，导致资源被默认为无限。
- **不写不做什么**：只给出「要做」的列表，不明确「不做」的项，导致边界模糊、期望膨胀。
- **忽略依赖**：A 依赖 B 却把 A 排在 B 前；或未说明「因依赖故 B 先做」。

---

## Good output example

**输入**：5 个候选——快捷入口、搜索排序优化、报表导出、权限细粒度、API 开放。资源约束：本季度最多 2 个大项。

**良好输出（节选）**：

- **Task framing**：本输出为多候选取舍与建议，不包含 roadmap 时间线现实性检查。
- **Evidence**：5 个候选如上；约束为本季度最多 2 个大项；战略重点为「提升核心管理员效率」。
- **Assumptions**：假设「大项」指 1 人月以上；战略重点已与利益相关方对齐。
- **Candidate list**：（略）。
- **Ranking logic**：采用 impact（对核心管理员效率）× confidence（实现把握）× strategic fit（与战略一致程度），除以 effort（人月）；高 impact 但 confidence 低的项降一档。**Uncertainty**：快捷入口的 impact 依赖前期验证结果，当前为「中高」；API 开放的 strategic fit 存在分歧，标为不确定。
- **Opportunity cost**：若选快捷入口 + 搜索排序，则本季度不做报表导出、权限细粒度、API 开放；其中报表导出为多部门呼声高但战略契合中，机会成本为「可能影响他部门满意度」。
- **What we are explicitly not doing**：本季度不做报表导出（延后至下季度，因资源与战略优先）；不做权限细粒度（与当前战略优先级不符）；不做 API 开放（战略未定且 effort 大，建议先定策略再排）。
- **Recommendation with reasoning**：(1) 快捷入口优先——与战略一致、验证通过、effort 可控；why now：验证结论刚出，趁热落地。(2) 搜索排序优化次之——与快捷入口同属「找得到、找得快」，可共用部分能力；依赖：部分依赖搜索接口稳定，已与技术对齐。(3) 其余三项明确本期不做，理由见上。
- **Open questions / Next step**：API 开放的战略定位确认后，可重新排入下季度；建议本排序输出后接 roadmap-reality-check 检查两项目的时间与依赖是否可行。

---

## Bad output example

**输入**：同上，5 个候选。

**不良输出（节选）**：

- **RICE 打分表**：快捷入口 R=8 I=8 C=7 E=2 → 28；搜索排序 R=7 I=8 C=8 E=3 → 22.4；……（仅表格）
- **结论**：按分数排序，本季度做快捷入口和搜索排序。

问题在于：只有分数表，没有 trade-off 说明、没有机会成本、没有「明确不做什么」及原因、没有 why now/why not now、没有依赖或战略说明；若资源或战略变化，读者无法复现或调整判断。此类输出无法支撑决策沟通，也易被当成「算出来的结果」而非「需要理解的取舍」。

---

## Related skills / Handoff rules

- **roadmap-reality-check**：优先级与建议产出后，若需检查**已形成的**阶段性计划、发布时间或路线图是否脱离现实（依赖、顺序、容量、验证前置），交给 roadmap-reality-check。路径：`skills/roadmap-reality-check/SKILL.md`。边界：prioritization 负责「多候选间取舍」；roadmap-reality-check 负责「已有计划/时间线的现实性」，不负责排序。
- **discovery-synthesis / problem-framing**：若候选来自发现或问题框定，其产出可作为本 skill 的输入；本 skill 不替代发现或问题定义。
- **outcome-definition**：若候选与目标或指标未对齐，可先做 outcome-definition 再排序，以便用统一标准评估 impact。
- **prd-writing**：排序后选定的项，在问题与范围清晰时可进入 prd-writing；本 skill 不写 PRD。

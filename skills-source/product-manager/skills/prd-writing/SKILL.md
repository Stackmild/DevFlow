---
name: prd-writing
description: 在问题、目标、范围相对清晰时撰写 PRD。必须包含 problem、users、goals/non-goals、stories 或 flows、scope、edge cases、metrics、dependencies、risks、open questions、launch notes；不把未验证假设写成确定需求。前置条件不满足时 handoff 回 problem-framing 或 outcome-definition。
---

# PRD Writing

本 skill 在**问题、目标、范围相对清晰**的前提下，产出高质量 PRD（Product Requirements Document）。PRD 必须包含：problem、users、goals/non-goals、user stories 或 flows、scope、edge cases、metrics、dependencies、risks、open questions、launch notes。**不得**把未经验证的假设写成确定需求；**不得**在前置信息缺失时硬写完整 PRD。若不满足使用前提，应 handoff 回 problem-framing 或 outcome-definition，而非强行产出文档。

---

## 使用前提（Entry conditions）

**只有在以下条件均相对满足时，才应使用本 skill：**

- 已有可陈述的**问题定义**（要解决什么问题），而非仅有 feature 想法。
- **目标用户**清晰（谁、在什么情境下）。
- **成功标准**或可观测的 outcome/metrics 已定义或可从已有材料推导。
- **范围边界**有初步共识（本期做哪些、不做哪些）。

若任一项明显缺失，**先执行前置子 skill 或向用户澄清**，再考虑写 PRD。本 skill 不替代 problem-framing 与 outcome-definition。

---

## Handoff 规则（前置不满足时）

- **问题未定义、仅有 feature 想法** → Handoff 到 **problem-framing**（`skills/problem-framing/SKILL.md`），待问题框定后再写 PRD。
- **目标或指标模糊** → Handoff 到 **outcome-definition**（`skills/outcome-definition/SKILL.md`），待 outcome 与 metrics 明确后再写 PRD。
- **问题与目标都有，但范围完全不清** → 先输出「范围澄清问题」或建议与利益相关方对齐 scope，再写 PRD；或在 PRD 中把 scope 写成「待定」并列出 open questions。

---

## Best for

- 问题已框定、目标与指标已定义，需要一份完整的需求文档供研发与协作
- 主 skill 路由到 prd-writing（前置判断已通过、未触犯默认禁止原则）
- 需要明确本期边界、non-goals、风险与开放问题

---

## Typical triggers

- 用户要求「写 PRD」「写需求文档」，且已提供或可推导出问题、用户、成功标准
- problem-framing 与 outcome-definition（或等价输入）已完成，需要落成 PRD 结构

---

## Not for / When NOT to use

- 用户只给了一个 feature 想法，没有可陈述的问题、没有目标用户、没有成功标准 → **不要**直接写 PRD；先走 problem-framing / outcome-definition。
- 关键假设未验证、需先做实验再定范围时 → 先做 assumption-mapping 或 experiment-design，再写 PRD 或写「实验后的 PRD 草稿」。

---

## Required inputs

- **问题陈述**（要解决什么问题）或可推导出问题的材料（如 problem brief）。
- **目标用户**（谁、在什么情境下）。
- **成功标准或 outcome/metrics**（至少主指标或可观测目标），或可推导自 outcome-definition 产出。
- **范围边界**的初步信息（本期做/不做什么），可为「待定」但需在 PRD 中显式标出。

---

## Optional inputs

- 已有 user stories、流程图或功能列表
- 技术约束、依赖、已知风险
- 上线计划或发布策略

---

## Default assumptions when context is missing

- 若用户未提供 non-goals，PRD 中必须有一节「Non-goals」；通常应列出若干条本期明确不做的内容；若确实很少，须说明为何当前边界已足够清晰，不得写「无」或机械凑数。
- 若存在未验证的假设（如「用户会愿意用 XX」），必须在 PRD 中标为 **Assumption** 或放入 **Open questions**，不得写成确定需求。
- 不把「未来可能要做」的内容写进本期 scope，除非明确标为「Out of scope / 后续迭代」。

---

## Core workflow

1. **确认使用前提**：检查是否具备问题定义、目标用户、成功标准、范围边界；若不满足，执行 Handoff 规则，不继续写完整 PRD。
2. **Problem & Users**：在 PRD 开头写清问题陈述与目标用户（谁、什么情境）；与 problem-framing 产出或输入对齐。
3. **Goals / Non-goals**：列出本期要达成的目标（与 outcome/metrics 对齐）；**必须**列出 non-goals（本期明确不做的）；通常若干条，若确实很少须说明理由，不得写「无」或凑数。
4. **User stories 或 flows**：按用户价值组织功能或流程；可写 user stories 或关键 flow，并标出与 goal 的对应关系。
5. **Scope**：明确本期 in scope 与 out of scope；若有「待定」项，放入 Open questions。
6. **Edge cases & 边界**：至少列出 3～5 类边界/异常（如空状态、失败、权限、限流、数据迁移）；不写「无」。
7. **Metrics**：与 outcome-definition 对齐；写清主指标、baseline/target、测量方式；标出 measurement risks 若存在。
8. **Dependencies / Constraints**：上下游依赖、技术或资源约束、时间约束。
9. **Risks**：技术、业务、资源或假设风险；每项标出缓解思路或「待应对」。
10. **Open questions**：未决项、待澄清、待验证假设；通常应有若干条；若确实很少，须说明为何当前未决项有限，不得写「无」或机械凑数。
11. **Launch notes**：发布策略、灰度、回滚、沟通或运营要点。
12. **自检**：是否把假设写成了需求？是否把「未来可能做」塞进了本期 scope？是否遗漏 non-goals 或 open questions？

---

## Output contract

PRD 文档必须包含以下章节；输出整体可沿用公共骨架（Task framing, Evidence, Assumptions, Inference（若有从输入推导出的中间判断须显式标注）, Analysis, Recommendation, Open questions / Next step），但 PRD 本体结构如下。

| 章节 | 内容要求 |
|------|----------|
| **Problem** | 可验证的问题陈述；与 problem-framing 对齐。 |
| **Users** | 目标用户（谁、什么情境）；可含 persona 或 segment 简述。 |
| **Goals** | 本期要达成的目标；与 outcome/metrics 对齐。 |
| **Non-goals** | **必含**。本期明确不做的；通常若干条，若很少须说明理由，避免 scope creep。 |
| **User stories / Flows** | 按价值组织的功能或流程；可 Given/When/Then 或列表。 |
| **Scope** | In scope / Out of scope；若有待定，在 Open questions 中说明。 |
| **Edge cases** | 至少 3～5 类（空状态、失败、权限、限流、数据等）。 |
| **Metrics** | 主指标、baseline/target、测量方式；measurement risks 若存在。 |
| **Dependencies / Constraints** | 上下游、技术/资源/时间约束。 |
| **Risks** | 风险项与缓解或待应对。 |
| **Open questions** | **必含**。未决项、待澄清或待验证假设；若确实很少须说明为何，未验证假设可放此处。 |
| **Launch notes** | 发布策略、灰度、回滚、沟通要点。 |

未经验证的假设在文档中**必须**标为「Assumption」或列入 Open questions，不得写成确定需求。

---

## Quality bar / Acceptance criteria

- 使用前提已检查；不满足时已 handoff 或显式说明缺失项，未强行写完整 PRD。
- 文档包含 Problem、Users、Goals、**Non-goals**、Scope、Edge cases、Metrics、Dependencies、Risks、**Open questions**、Launch notes；无「无」敷衍。
- 假设与确定需求被区分；假设未写成「需求」。
- 本期 scope 与「未来可能做」被区分；无偷偷扩大 scope。
- 自检项（假设当需求、遗漏 non-goals/open questions）已执行。

---

## Clarifying questions

在以下情况主动向用户澄清：

- 问题或用户不清：建议先做 problem-framing，或请提供问题陈述与目标用户。
- 成功标准不清：建议先做 outcome-definition，或请提供主指标与 target。
- 范围不清：本期明确做哪些、不做哪些？是否有时间/资源上限？
- 没有 non-goals：请列出本期明确不做的条目；若确实很少，说明为何边界已清晰，避免写「无」或凑数。

---

## Common pitfalls

- **把模糊愿景当需求**：写很多「希望」「愿景」式句子，没有可执行、可验收的需求。
- **把推测当确定范围**：未验证的假设写成「需求：用户会……」；应标为 Assumption 或 Open question。
- **把「未来可能做」塞进本期 scope**：本期 scope 膨胀，或与 non-goals 矛盾。
- **不写 edge cases**：只写 happy path，不写空状态、失败、权限、限流等，导致实现阶段才发现缺口。
- **不写 non-goals 或 open questions**：写「无」或省略，导致边界不清、未决项被遗忘；**必须**有 non-goals 与 open questions 节；若确实很少须说明理由，不得机械凑数。

---

## Good output example（PRD 结构节选）

**前提**：问题已框定（用户找内容慢、相关度低），目标用户与 outcome 已定义。

**良好做法（节选）**：

- **Problem**：站内用户在有明确信息需求时，通过现有搜索/浏览路径找到高相关结果耗时长、步骤多，导致放弃或满意度低。目标用户：带明确信息需求的站内用户（见 Users）。
- **Goals**：本期实现「推荐入口 → 有效转化」占比提升（见 Metrics）；提升推荐结果相关性可衡量指标（如 CTR、转化率）。
- **Non-goals**：本期不做个性化算法大改版；不做跨端统一推荐策略；不做推荐解释性功能。  
- **Scope**：In scope：推荐接口与排序策略本期可调参数、埋点与指标看板。Out of scope：新数据源接入、多业务线推荐策略。
- **Edge cases**：无推荐结果时的 fallback；接口超时/降级策略；新用户冷启动策略；数据延迟时的展示规则。
- **Open questions**：(1) 有效转化口径是否与运营一致，待确认；(2) 冷启动样本量不足时是否用全局兜底，待定；(3) 灰度比例与周期待与发布对齐。
- **Risks**：依赖推荐服务稳定性；若 baseline 未建立，target 可能需迭代中调整。——假设与未决项均标出，non-goals 与 scope 边界清楚。

---

## Bad output example（PRD 结构节选）

**不良做法**：

- 无 **Problem** 节，直接写「需求：实现智能推荐功能」。
- **Goals** 写「提升用户体验」「提升活跃」，无与 outcome 对齐的可测量目标。
- **无 Non-goals**，或写「无」。
- **Scope** 含糊（「做推荐相关功能」），且混入「后续可能做个性化大改」未标为 out of scope。
- **无 Edge cases**，或写「暂无」。
- **Open questions** 写「无」。
- 未验证的假设（如「用户会喜欢新推荐」）写在需求里，未标为 Assumption。

问题在于：需求很多，但问题定义缺失、non-goals 缺失、开放问题缺失、假设被当成确定需求、边界不清。此类 PRD 无法稳定指导研发与协作，且易导致 scope creep。

---

## Related skills / Handoff rules

- **problem-framing**：问题未定义或仅有 feature 想法时，先执行 `skills/problem-framing/SKILL.md`，再写 PRD。
- **outcome-definition**：目标或指标模糊时，先执行 `skills/outcome-definition/SKILL.md`，再写 PRD。
- **assumption-mapping / experiment-design**：若关键假设未验证、需先小范围验证再定 PRD 范围时，先做假设识别或实验设计，再写 PRD 或「实验后 PRD 草稿」。
- 主 skill 在路由到本 skill 前会做前置判断与默认禁止检查；若主 skill 已说明「建议先走 problem-framing / outcome-definition」，应遵循该建议而非直接写 PRD。

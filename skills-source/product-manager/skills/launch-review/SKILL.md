---
name: launch-review
description: 支持 launch/expand/rollback/hold 决策。产出证据摘要、指标读out、预期 vs 实际、用户信号、明确建议与下一步；必要时回看 outcome-definition 以对齐成功标准。
---

# Launch Review

本 skill 支持**上线 / 扩大发布 / 回滚 / 暂缓**的决策，产出：证据摘要、指标读out、预期 vs 实际、用户信号（行为或反馈）、**明确建议**（launch/expand/rollback/hold）与下一步动作。不负责制定 roadmap 或优先级；不负责写 PRD。若成功标准或指标定义不清，应先回看 outcome-definition 以对齐「如何判断成与败」。输出中须区分 Evidence（数据、现象）、Inference（从数据推导出的判断）、Recommendation（决策建议）。

---

## Best for

- 功能或实验已小范围运行，需决定是否全量、扩大、回滚或暂缓
- 需要基于数据与用户信号做发布决策，而非凭感觉
- 需要一份可追溯的「我们为什么这样决定」的摘要

---

## Typical triggers

- 用户要求「评估是否该上线/放量」「是否该回滚」「做一次 launch review」
- 主 skill 在组合路径中路由（如「评估是否上线/扩大发布/回滚」→ launch-review；必要时回看 outcome-definition）
- 灰度或 A/B 已有结果，需形成决策与下一步

---

## Not for / When NOT to use

- 尚未有可观测的试运行或灰度结果时，本 skill 可基于已有证据做「证据不足、建议先收集 X」的输出，但不替代 experiment-design 或实际跑实验。
- 需要做多候选取舍或 roadmap 现实性检查时，用 prioritization 或 roadmap-reality-check；本 skill 只做发布相关决策。
- 需要定义成功标准或指标时，用 outcome-definition；本 skill 在指标已定义的前提下做读out 与建议。

---

## Required inputs

- 至少包含：**与发布决策相关的证据**——可为指标数据、灰度/实验结论、用户反馈、异常或事故描述等。若完全没有可参考的证据，无法做有意义的 review，应先说明「证据不足」并建议需补什么，而非强行给出 launch/rollback 建议。

---

## Optional inputs

- 上线前的成功标准或目标（来自 outcome-definition 或 PRD）
- 已知约束（合规、资源、时间窗口）
- 历史 baseline 或对照

---

## Default assumptions when context is missing

- 决策应基于**证据**而非偏好；若证据不足，输出中须显式标出并建议补足，不默认「可以上」或「应该撤」。
- 预期 vs 实际须可对照；若事前未定义预期或成功标准，在输出中注明「缺少事前定义」并建议后续与 outcome-definition 对齐。
- 用户信号包含行为数据与定性反馈；不把单条反馈当普遍结论，须标注样本与局限。

---

## Core workflow

1. **确认决策范围**：本次要决定的是 launch（首次全量）、expand（扩大灰度）、rollback（回滚）、还是 hold（暂缓、观察）？明确决策对象与时间窗口。
2. **证据摘要**：汇总与决策相关的数据与现象（指标、灰度结果、报错、反馈）；区分「已发生的事实」与「解读」；若证据缺失，列明缺失项。
3. **指标读out**：若有事前定义的目标或成功标准，按指标逐项读out（当前值、对照、趋势）；若无事前定义，注明并建议与 outcome-definition 对齐。
4. **预期 vs 实际**：事前预期（或目标）与当前实际的对比；哪些达成、哪些未达成、哪些尚未可测；差距原因若可知则简要说明。
5. **用户信号**：用户行为或反馈中与决策相关的信号（如使用率、投诉、表扬）；注明样本与局限，不把少数反馈当普遍结论。
6. **Recommendation**：给出明确建议——launch / expand / rollback / hold；每条带理由（依据证据与指标）；不超过 3 条核心建议。
7. **Next action**：建议的下一步（如「全量发布并设监控」「回滚后做根因分析」「再观察 1 周后复评」）；若有依赖（如需补数据、需对齐标准），写明。
8. **输出分层**：按 Task framing, Evidence, Assumptions, Inference, Analysis, Recommendation, Open questions / Next step 组织；Analysis 内包含上述各项。

---

## Output contract

输出须采用以下结构，并确保建议可执行、可追溯。

| 层 | 内容要求 |
|----|----------|
| **Task framing** | 本输出是发布决策支持，不是 roadmap 或 PRD；边界为「基于当前证据建议 launch/expand/rollback/hold」。 |
| **Evidence** | 与决策相关的数据、现象、灰度结论、用户反馈摘要；不含主观解读。 |
| **Assumptions** | 解读时采用的假设（如「我们假设当前样本代表目标用户」）。 |
| **Inference** | 从数据推导出的判断（如「指标未达预期，可能因 X」）；须显式标注。 |
| **Analysis** | 本 skill 核心产出：见下「必含项」。 |
| **Recommendation** | 明确建议：launch / expand / rollback / hold，及理由；不超过 3 条。 |
| **Open questions / Next step** | 决策后的下一步动作；若证据不足或标准不清，建议补什么、与谁对齐。 |

**必含项（Analysis 内）**：

- **证据摘要**：与决策相关的关键数据与现象；若缺失，列明缺失项。
- **指标读out**：事前定义的目标或成功标准 vs 当前值；若无事前定义，注明并建议后续对齐。
- **预期 vs 实际**：达成 / 未达成 / 未可测；差距原因若可知则简述。
- **用户信号**：行为或反馈中与决策相关的部分；样本与局限说明。
- **Recommendation**：launch / expand / rollback / hold + 理由。
- **Next action**：建议的下一步动作；依赖或待办若有则列出。**若建议为 expand 或 hold，须包含**：复评窗口（何时再评）、触发切换决策的条件（如达到 X 则全量/回滚，或出现 Y 则回滚）。

---

## Quality bar / Acceptance criteria

- 建议**明确**（launch/expand/rollback/hold），且与证据、指标、预期 vs 实际可对应；无「再看看」式含糊建议。
- 证据与推断已区分；读者能看出哪些是数据、哪些是解读。
- 若证据不足或成功标准未定义，已注明并建议补足或回看 outcome-definition；未在证据不足时强行给出发布建议。
- Next action 具体可执行；无空泛「持续监控」而无责任人或时间点。若建议为 expand 或 hold，Next action 须包含复评窗口与触发切换决策的条件。

---

## Clarifying questions

在以下情况主动向用户澄清：

- 证据零散：当前有哪些可用的指标、灰度结果或反馈？时间窗口是什么？
- 成功标准不清：事前是否定义过「什么算成功」？若否，是否需先与 outcome-definition 对齐？
- 决策权不清：谁有权做 launch/rollback？是否有不可移动的发布窗口？

---

## Common pitfalls

- **建议含糊**：不明确写 launch/expand/rollback/hold，只写「建议观察」「再收集数据」而不给决策倾向。
- **证据当结论**：把数据罗列后不给出明确建议，或把单条反馈当决策依据而不标样本局限。
- **忽略预期**：不对比事前目标与实际，无法判断「成与败」。
- **成功标准缺失**：事前未定义成功标准却做「是否达标」的判断；应先注明缺失并建议与 outcome-definition 对齐。
- **Next action 空泛**：写「持续监控」而无责任人、无复评时间点、无回滚条件；建议 expand/hold 时未写复评窗口或触发切换条件。

---

## Good output example

**输入**：快捷入口灰度 2 周，30 人中有 14 人在 2 周内使用至少 1 次；事前成功阈值为 ≥40%。

**良好输出（节选）**：

- **Task framing**：本输出为对「快捷入口是否扩大发布」的决策支持。
- **Evidence**：灰度 30 人、2 周；使用至少 1 次的比例 = 14/30 ≈ 46.7%。事前成功阈值 ≥40%。
- **Assumptions**：假设灰度样本代表目标管理员；自愿者可能略偏积极。
- **Inference**：46.7% 超过 40% 阈值，可推断「在获得已配置快捷入口后会使用」的假设得到支持；但样本小，扩大后可能回落。
- **指标读out**：目标「使用至少 1 次 ≥40%」→ 实际 46.7%，达成。无负面反馈或异常。
- **预期 vs 实际**：达成事前定义的成功标准；未出现预期外的稳定性或体验问题。
- **用户信号**：无集中投诉；2 人主动表示「找东西快了」。样本小，定性信号仅作参考。
- **Recommendation**：建议 **expand**——在保持监控的前提下扩大到 100 人、再观察 1 周；理由：达到成功阈值、无负面信号，但样本仍小，分阶段扩大可控制风险。
- **Next action**：(1) 将灰度扩大到 100 人，1 周内复评。(2) 若 1 周内使用率维持 ≥35% 且无 P0 问题，则建议全量发布。(3) 与运维确认监控与回滚开关就绪。
- **Open questions / Next step**：全量发布时的沟通与培训是否已排期？建议在 expand 阶段同步准备。

---

## Bad output example

**输入**：同上。

**不良输出（节选）**：

- **数据**：30 人里 14 人用了。
- **结论**：效果不错，建议上线。

问题在于：未写预期 vs 实际（是否达 40% 阈值）；未明确建议是 launch/expand/rollback/hold；未写 Next action（谁在何时复评、回滚条件）；未标样本局限。此类输出无法支撑可追溯的发布决策。

---

## Related skills / Handoff rules

- **outcome-definition**：若成功标准或指标事前未定义，应先回看 outcome-definition 对齐「如何判断成与败」；本 skill 在标准已定义的前提下做读out 与建议。路径：`skills/outcome-definition/SKILL.md`。
- **experiment-design**：若当前决策对象来自某次实验，实验设计由 experiment-design 负责；本 skill 基于实验结果做发布决策，不设计实验。
- **roadmap-reality-check**：若发布计划涉及多阶段或依赖其他交付，时间线与依赖可由 roadmap-reality-check 检查；本 skill 不负责整体 roadmap 现实性。
- **prioritization**：多候选的取舍用 prioritization；本 skill 只做单次发布相关的 launch/expand/rollback/hold 决策。

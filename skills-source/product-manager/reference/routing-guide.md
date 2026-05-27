# Product Manager — Routing Guide

> 外置自 `skills-source/product-manager/SKILL.md` §默认路由策略。
> 使用时 Read 本文件，获取完整前置判断与组合路径参考。

---

## 前置判断五要素

收到「写 PRD / 写方案 / 写 roadmap」时，必须先判断：

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

---

## 常见组合路径

| 场景 | 建议路径 |
|------|----------|
| 用户只有一个模糊功能想法 | problem-framing → outcome-definition → assumption-mapping → （必要时）experiment-design → prd-writing |
| 用户给了一堆访谈、反馈、调研材料 | discovery-synthesis → problem-framing 或 outcome-definition → prioritization |
| 用户要求做 roadmap | prioritization → roadmap-reality-check |
| 用户要求评估是否上线/扩大发布/回滚 | launch-review；必要时回看 outcome-definition |

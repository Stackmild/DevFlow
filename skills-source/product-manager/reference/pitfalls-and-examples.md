# Product Manager — Pitfalls & Output Examples

> 外置自 `skills-source/product-manager/SKILL.md` §Common pitfalls / Good output / Bad output。
> 使用时 Read 本文件，获取 anti-pattern 与输出形态参考。

---

## Common pitfalls

- **顺从式写 PRD**：用户一说写 PRD 就直接写，不做过前置判断与路由。
- **把 feature 当问题**：用户说「加个 AI 搜索」，就直接在 PRD 里写「需求：AI 搜索」，而不先走 problem-framing。
- **单步转发**：只做一次路由（例如只推 problem-framing），不说明组合路径与下一步（如「完成后建议接 outcome-definition」）。
- **自检缺失**：输出了 PRD 但未做「是否把假设写成事实」「是否遗漏 non-goals」等自检。

---

## Good output example

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

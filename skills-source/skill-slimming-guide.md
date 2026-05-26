# DevFlow Skill Slimming Guide

本指南定义 DevFlow 第二轮 skill 瘦身的边界。目标是降低 `SKILL.md` 的运行时阅读负担，不削弱 DevFlow 的 gate、phase、handoff、review contract 或 state 审计语义。

---

## 1. 标准结构

每个 `SKILL.md` 默认保留以下小节：

1. `Role`：一句话说明身份与责任边界。
2. `Use / Do Not Use`：何时使用、何时转交其他 skill。
3. `Inputs`：必需输入、可选输入、缺失输入时的处理。
4. `Minimal Workflow`：最小执行路径，按步骤列出。
5. `Outputs`：必产 artifact、verdict/action、写入位置。
6. `Required References`：执行时按需读取的外置文件。
7. `Hard Rules`：不可违反的硬规则和阻断条件。
8. `Self-Check`：交付前必须确认的短清单。

不要求每个 skill 逐字使用这些标题，但主文件必须覆盖这些职责。

---

## 2. 必须留在主文件的内容

以下内容不能只放到 reference 中：

- 角色边界：本 skill 做什么、不做什么、何时回抛。
- Use / Do Not Use：触发入口和转交条件。
- 最小执行流程：agent 不读其他文件也能知道下一步顺序。
- 必产 artifact：文件名、写入位置、是否阻断。
- verdict / action / Gate 语义：例如 `REQUEST_CHANGES`、`ACCEPT`、`PAUSE`。
- 硬阻断条件：缺少输入、缺少证据、contract 失败时必须停止的场景。
- 触发式反模式：看到某种情况必须主动提醒的规则。
- 行为锚点：会直接影响 LLM 行为的短原则，例如执行前先看约束、不要自审、不要越权改 contract。

判断标准：如果外置后 agent 很可能不会主动触发这条规则，则保留在 `SKILL.md`。

---

## 3. 应外置的内容

以下内容优先移出 `SKILL.md`：

- 完整 YAML / JSON schema。
- 长 checklist 和细粒度检查项。
- 长输出模板和报告样板。
- good / bad examples。
- 领域规则百科，例如 API 命名细则、migration 细则、设计 route 库。
- 大段反模式解释，主文件只留触发式摘要。
- 阶段性细则和 write-through 样板。

外置内容应进入既有目录优先级：

1. `contracts/`：schema、字段语义、跨 skill contract。
2. `templates/`：输出模板、报告模板。
3. `reference/`：领域规则、检查表、例子、反模式库。
4. `protocols/` 或 `phases/`：orchestrator 专用流程协议。

---

## 4. Required References 分级

`SKILL.md` 中的引用必须分级，避免默认全读。

| 分级 | 何时读取 | 典型内容 |
|---|---|---|
| Always read | 执行本 skill 前必须读 | 核心 contract、事件协议、不可省略的阶段协议 |
| Conditional read | 触发条件满足时读 | 飞书 local code、deploy、iframe、AI/import、schema migration |
| Template only | 产出对应 artifact 时读 | markdown 报告模板、YAML 输出模板、示例 |

写法要求：

- 每条引用必须写路径。
- Conditional read 必须写触发条件。
- Template only 不得被描述为 Always read。
- 路径必须相对当前 skill 目录可解析，或明确写 `../dev-orchestrator/...`。

---

## 5. 行数预算

行数预算是治理指标，不是压缩竞赛。

| 类型 | 建议预算 | 说明 |
|---|---:|---|
| 普通核心 skill | 180-320 行 | 先保证行为锚点，再减少模板和长规则 |
| 轻量/路由型 skill | 120-180 行 | 适合 PM 子 skill、纯入口 skill |
| `dev-orchestrator` | 最多 500 行 | 主控例外；不为行数牺牲 gate / state / dispatch 记忆 |
| `backend-data-api` | 最多 500 行 | 领域规则密集；允许分阶段瘦身 |

任何低于上述预算的压缩都必须先证明不会降低行为质量。任何超出预算的 skill 必须说明哪些 P0 规则必须留在主文件。

---

## 6. 行为等价要求

瘦身只能改变文档布局，不能改变协议语义。

- 不删除 Gate、phase、handoff、review、change-package、state audit 规则。
- 不把硬阻断改成建议。
- 不把必填字段改成可选字段。
- 不改变 verdict/action 的含义。
- 不新增未讨论的流程分支。
- 不让同一 schema/checklist/gate action 出现多个权威版本。

唯一权威来源规则：

- `change-package` 字段以 `dev-orchestrator/contracts/change-package.md` 为准。
- review report 字段以 `dev-orchestrator/contracts/review-report.md` 为准。
- state audit checks 必须只有一个完整来源。
- gate action 列表以 `scripts/devflow-gate.mjs` 和对应 checks 模块为准。

---

## 7. 瘦身验收 checklist

每次瘦身完成后检查：

- [ ] `wc -l` 不超过该 skill 的目标预算，或已说明例外原因。
- [ ] `Required References` 中所有路径存在。
- [ ] 被外置的 schema / checklist / template 有唯一权威来源。
- [ ] 主文件仍保留角色边界、最小流程、必产 artifact、硬阻断、verdict/action 语义。
- [ ] 约束词保留率达标：对原文件中的 `必须|禁止|不允许|Gate|handoff|artifact|schema|verdict|CHECK` 做 grep 基线对比，P0 语义不得丢失。
- [ ] `bash scripts/sync-skills.sh` 可成功同步。
- [ ] 至少跑 1 个与该 skill 相关的回归或 smoke，确认 agent 会按 `Required References` 读取必要文件。

若回归发现 agent 跳读 Always read reference，停止继续瘦身并回退该 skill。

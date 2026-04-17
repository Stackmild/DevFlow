# DevFlow — 多 Agent 开发工作流系统

DevFlow 是面向非专业开发者的、基于 **Claude Cowork** 的半自动开发工作流。由一个 orchestrator 按照固定的阶段骨架（定义 → 产品分析 → 设计 → 执行+审查 → 收尾），在每个阶段自动调度合适的专业 skill，人类只在3个决策点介入。项目级 continuity layer（ROADMAP、视觉规范、组件清单等）让产品方向、设计语言和架构决策跨任务延续，每次任务不从零开始；任务级 state store 则让每次执行可审计、可恢复、可纠错。

## 快速开始

### 安装与使用

1. 在本地新建一个空文件夹（命名为 `DevFlow` 或任意名称）
2. 用 Cowork 打开这个文件夹作为工作区
3. 将以下安装指令粘贴进 Cowork 对话框，直接发送：

> 请帮我安装 DevFlow。GitHub 仓库地址：https://github.com/Stackmild/DevFlow.git
> 请克隆到当前目录，然后把 skills-source/ 下的所有 skill 安装为全局 skill。

4. Cowork 完成后，重启 Cowork 或在设置里将 skills 关掉再打开
5. 输入 `@dev-orchestrator {你的任务描述}` 开始

orchestrator 会自动创建任务目录、调度 skill、在每个 Gate 暂停等你决策。

### 在其他项目中使用 DevFlow

在DevFlow workspace中开展的项目默认放在 DevFlow 目录内的 `projects/` 文件夹。

如果你的项目代码已经有自己独立的文件夹，也可以使用 DevFlow 来继续开发，不需要任何手动配置：

1. 在 Cowork 中打开**你的项目文件夹**
2. 直接输入 `@dev-orchestrator {任务描述}` 即可

Orchestrator 会检测到当前不在 DevFlow 目录内，主动询问你的 DevFlow 目录路径，然后自动创建配置文件。之后任务管理数据存到 DevFlow 那边，代码修改在你的项目文件夹中进行。

---

## 工作原理

### 阶段驱动的工作流

DevFlow 的核心是 **Phase（阶段）**，在不同阶段，orchestrator 会根据任务类型自动选择合适的 skill 执行。流程为 Phase A → B → C → D → F，其中 B/C/D 各有一个人类决策 Gate，如下表所示：

| 阶段 | 做什么 | 自动调用的 Skill | 人类决策 |
|------|--------|-----------------|----------|
| **Phase A** | 任务定义、repo 识别、类型判断 | orchestrator 自动完成 | — |
| **Phase B** | 产品分析、Roadmap 绑定 | `product-manager` | **Gate 1** 方向 |
| **Phase C** | 架构 + 后端 + 交互 + 前端设计 | `web-app-architect` `backend-data-api` `webapp-interaction-designer` `frontend-design`（按需） | **Gate 2** Scope |
| **Phase D** | D.1 编码 → D.2 审查 → D.3 验收 | `full-stack-developer` → `code-reviewer` + 条件审查员 | **Gate 3** 验收 |
| **Phase F** | known_gaps 归集、ROADMAP/DEFERRED 回填 | `state-auditor`（可选） | — |

> 条件审查员：当改动涉及 UI 时自动加入 `webapp-consistency-audit`，涉及数据/API 时加入 `pre-release-test-reviewer`。

### 非线性：回流与修订

DevFlow 的每个 Gate 和审查节点都支持回流：

| 回流节点 | 触发 | 回流目标 | 次数限制 |
|----------|------|----------|----------|
| Gate 1 ADJUST | 方向需要调整 | 回 Phase B，重新产品分析 | 无硬性上限 |
| Gate 2 RESCOPE | scope 需要重新设计 | 回 Phase C，重新设计 | **最多 1 次**；第 2 次强制暂停 |
| D.2 审查发现问题 | reviewer 发现 issue | 回 D.1，FSD 修订代码 | 三档制（见下） |
| Gate 3 REVISE | 最终验收未通过 | 走 continuation 路径重进 D | 无硬性上限 |

**三档修订制**（D.2→D.1 回流的自动保护）：

| 档位 | 触发条件 | 行为 |
|------|----------|------|
| 🟢 绿区 | 每 skill ≤ 1 次修订 且 全局 ≤ 2 次 | 自动修订，继续流程 |
| 🟡 黄区 | 某 skill 第 2 次 或 全局第 3 次 | 暂停并警告，等用户决策 |
| 🔴 红区 | 某 skill ≥ 3 次 或 全局 ≥ 5 次 | 强制停止 |

### 执行模式

每个 scope item 会被分配一种执行模式：

| 模式 | 说明 |
|------|------|
| `platform` | 平台能力直接完成（AI 推理、搜索、MCP），不写代码 |
| `code` | 由 `full-stack-developer` 写代码 |
| `handoff` | 交给飞书妙搭（cloud_config 页面配置 / local_code_sync 代码同步） |

---

## DevFlow的持久化机制

### 项目级 Continuity Layer

跨任务维护项目的"大图"——让每次任务不是从零开始，而是在项目上下文中推进：

- **PROJECT-BRIEF** — 项目定位与核心目标
- **ROADMAP.md** — 里程碑与待办事项，任务完成时自动回填
- **DEFERRED.md** — 被推迟的需求，附带来源和推迟原因
- **VISUAL-SYSTEM.md** — 项目视觉系统（Design Token、颜色、字体、间距规则）；首次涉及 UI 的任务由 frontend-design 建立，后续任务在 Phase F 合并更新
- **COMPONENTS.md** — 项目组件清单与 API（可复用组件、状态、Props 规范）；由 component-library-maintainer 维护

`reference/design-standards-template.md` 提供 DevFlow 级别的设计规范模板，作为各项目 VISUAL-SYSTEM.md 的起点。

### 任务级 State Store

每个任务在 `orchestrator-state/{task_id}/` 下维护完整的执行记录：

- **events.jsonl** — 时序事件日志（canonical 时间真相）
- **task.yaml** — 任务当前状态快照
- **artifacts/** — 每个阶段的设计文档、实现报告
- **decisions/** — 所有 Gate 的人类决策记录（gate-1/2/3.yaml）
- **issues/** — 审查中发现的问题

此外，每个 Gate 展示前，orchestrator 会静默执行一批结构性完整性检查（Pre-Gate Self-Check，共 27 项分布在三个 Gate 前：6+8+13）。正常情况下用户完全感知不到，只有有问题时才会拦截——质量保障不是事后审计，而是**每个决策点前都有把关，不拉长正常流程**。Phase F 的 state-auditor 仍作为 post-run 完整审计（20 项 CHECK），形成"前置拦截 + 事后审计"的双保险。

V6.0 将 `devflow-gate` 薄控制层从 3-action 扩展到 **5-action**：在 Phase 进入、sub-agent dispatch、Gate 展示、Gate 3 后写操作、以及任务完成前做 **action authorization**（事前拦截）。新增的 `dispatch_skill` 和 `present_gate` 两个 action 配合 permit 证据链（`.permits/`）和下游反压，让关键推进动作默认经过门禁，大幅提升协议执行的稳定性。

**Phase 1 Enforcer（2026-04-12）**：`scripts/devflow-enforcer.mjs` 作为 Cowork PreToolUse / UserPromptSubmit hook，把 devflow-gate.mjs 的 5 个 action 从"ORC 主动调用"升级为**文件写入时自动触发**，关键拦截点（gate decision 写入、task 完成、handoff dispatch、phase 进入、Gate 3 后写入）不再依赖 LLM 记忆。

**当前已硬化的门禁**：
- `enter_phase`：阶段顺序 + 阶段前置 artifact（Phase B task-brief、Phase C product-spec、Phase D implementation-scope/change-package）
- `present_gate`：Gate 1/2/3 前置决策 + 必需 artifact + 上游 permit backpressure
- `complete_task`：Gate 3、Phase D/F events、open blockers、permit/event 一致性
- `dispatch_skill`：稳定 prerequisite 硬拦；设计引用缺失仍保留 warning，不升为 block

**设计与变更说明**：
- `devflow-gate` 是约束判断层，`devflow-enforcer` 是写入时自动触发的 hook 路由层
- 阶段顺序、Gate 展示、任务完成和关键前置产物缺失现在都能被机械拦住
- 设计引用缺失仍保持 warning，不升级为 hard block
- `.permits/` 是可选证据链；Gate / complete-task 会使用它做 backpressure 和一致性检查

---

### 改进 DevFlow

DevFlow仍是early build产品，你可以从如下角度：

**1. 适配你的开发环境**

Orchestrator 在每次任务启动时会读取 `reference/` 下的宿主平台认知文档，以此判断平台能力边界和任务分工。如果你使用的开发工具或协作平台与默认描述不同，直接修改这些文档即可——orchestrator 会自动适应你的实际环境。

**2. 评估 DevFlow 的实际表现**

完成一次开发任务后，可以让 DevFlow 参考 [`reference/devflow-self-evaluation-guide.md`](reference/devflow-self-evaluation-guide.md) 对自身在本次任务中的表现进行评估，包括阶段执行质量、artifact 完整性、Gate 决策合理性等。评估结果可以直接指导你改进 skill 定义或流程规则。

**3. 调用阶段性自迭代复盘（Beta Skill）**

DevFlow 内置了一个旁路 skill [`@DevFlow-self-improve`](skills-source/devflow-self-improve/SKILL.md)，可在一批任务完成后手动触发，完成两件事：
1. **治理复盘**：基于 state store、regression 断言和 session 对话记录，自动完成流程健康度检测，输出 findings 分流和修复建议
2. **产品负面经验沉淀**：把开发中发现的"产品假设被证伪、平台限制、LLM 行为边界"等经验，结构化写入 `product-failure-library` / `product-constraints-ledger` / `product-playbook`

完成后，DevFlow可以根据上述发现提出他对自身的迭代建议。

触发方式：`@DevFlow-self-improve`（默认全量盘点）或 `@DevFlow-self-improve mode=A task=<id>`（单任务复盘）。

**4. 改动上线前跑 change-audit**

如果你修改了 DevFlow 的协议、skill 或工作流定义，建议运行 `@change-audit` 做结构性改动审计。它会自动调用 L1 设计审计 + L2 契约审计，输出 `go / go_with_conditions / revise / block` 裁决，帮你发现结构性缺口和 contract 破坏风险。

---

## 仓库结构

**Git 仓库内容（clone 后可见）：**

```
DevFlow/
├── CLAUDE.md              # 项目级指令（AI 读取）
├── README.md              # 本文件
├── skills-source/         # 核心 Skill 定义（13 个）
│   ├── dev-orchestrator/  # 编排器（含 phases/、contracts/、routing/）
│   ├── product-manager/   # 产品管理（含 9 个子 skill）
│   ├── web-app-architect/ # 架构设计
│   ├── full-stack-developer/ # 全栈开发
│   ├── code-reviewer/     # 代码审查
│   ├── ...                # 其余核心 skills
│   └── test/              # DevFlow 实验性 Skill（不入核心工作流）
│       ├── change-audit/             # 结构性改动准入审计（parent）
│       ├── change-audit-l1-design-review/   # L1 设计审计 sub-skill
│       └── change-audit-l2-contract-review/ # L2 契约审计 sub-skill
├── reference/             # 系统参考文档
└── scripts/
    ├── sync-skills.sh         # Skill 维护者同步工具
    ├── devflow-gate.mjs       # 薄控制层主入口（V6.0，5-action）
    ├── devflow-enforcer.mjs   # Hook 路由器：PreToolUse/UserPromptSubmit 自动执行层（Phase 1）
    └── lib/                   # Gate action 检查模块 + enforcer 辅助函数
```

**本地目录（运行时自动创建，不入仓库）：**

```
DevFlow/
├── orchestrator-state/          # 任务状态层（orchestrator 自动创建）
│   └── {task_id}/
│       ├── task.yaml            # 任务快照
│       ├── artifacts/           # 各阶段产出
│       ├── decisions/           # Gate 决策记录（gate-1/2/3.yaml）
│       ├── issues/              # 审查发现的问题
│       ├── handoffs/            # 外部交接文件
│       ├── .permits/            # devflow-gate 通过记录（V5.0）
│       ├── changelog.md         # 人类可读日志
│       └── events.jsonl         # 结构化时序事件日志
├── projects/                    # 你的项目代码（内部项目）
└── docs/                        # 你的个人开发笔记
```

---

## 参考文档

| 文档 | 说明 |
|------|------|
| [Cowork 宿主平台理解](reference/cowork-as-host-platform.md) | Cowork 的能力边界与平台优先原则 |
| [飞书妙搭宿主平台理解](reference/feishu-miaoda-as-host-platform.md) | 飞书妙搭的数据/用户边界与 handoff 协作模式 |
| [试点评估框架](reference/devflow-self-evaluation-guide.md) | 评估 DevFlow 试点效果的标准化框架 |

---

# DevFlow — Phase-Driven Multi-Agent Development Workflow

DevFlow is a **phase-driven multi-agent development workflow system** built on **Claude Cowork** Skills.

An orchestrator follows a fixed phase skeleton — Define → Product Analysis → Design → Execute+Review → Closeout — automatically dispatching specialized skills at each phase. Humans intervene at only **3 decision gates**. The project-level continuity layer (ROADMAP, visual system, component inventory, etc.) carries product direction, design language, and architectural decisions across tasks so every task builds on what came before — not from scratch. The task-level state store makes every execution **traceable, auditable, and recoverable**.

## How It Works

| Phase | What happens | Skills dispatched | Human gate |
|-------|-------------|-------------------|------------|
| **A** | Task definition, repo discovery | orchestrator (auto) | — |
| **B** | Product analysis, roadmap binding | `product-manager` | **Gate 1** Direction |
| **C** | Architecture + backend + interaction + frontend design | design skills (as needed) | **Gate 2** Scope |
| **D** | D.1 Implement → D.2 Review → D.3 Accept | `full-stack-developer` → reviewers | **Gate 3** Acceptance |
| **F** | Closeout, roadmap backfill | `state-auditor` (optional) | — |

## Non-Linear Flow: Backflow & Revision

DevFlow is not a purely sequential pipeline — every gate and review node supports backflow:

| Backflow point | Trigger | Returns to | Limit |
|----------------|---------|------------|-------|
| Gate 1 ADJUST | Direction needs rethinking | Phase B (re-run product analysis) | No hard limit |
| Gate 2 RESCOPE | Scope needs redesign | Phase C (re-run design) | **Max 1×**; 2nd forces PAUSE |
| D.2 review findings | Reviewer finds issues | D.1 (FSD revises code) | 3-tier throttle (below) |
| Gate 3 REVISE | Final acceptance fails | Re-enter D via continuation protocol | No hard limit |

**3-tier revision throttle** (protects D.2→D.1 loops from spiraling):

| Tier | Condition | Action |
|------|-----------|--------|
| 🟢 Green | Per-skill ≤ 1 revision AND global ≤ 2 | Auto-revise, continue |
| 🟡 Yellow | Same skill 2nd time OR global 3rd | Pause + warn, await decision |
| 🔴 Red | Same skill ≥ 3× OR global ≥ 5× | Hard stop |

## What Makes It Different

- **Project Continuity Layer**: PROJECT-BRIEF, ROADMAP, DEFERRED, VISUAL-SYSTEM.md (design tokens + visual rules), COMPONENTS.md (component API + reuse inventory) — maintained across tasks; a `design-standards-template.md` provides the DevFlow-level starting point for each project's visual system
- **Task State Store**: Full audit trail per task — events.jsonl, task.yaml, artifacts, decisions
- **Pre-Gate Self-Check**: 27 checks distributed across 3 gates (6 + 8 + 13), run silently — invisible in the happy path, only fires when something is wrong
- **devflow-gate v2** (V6.0): 5-action gate covering phase transitions, sub-agent dispatch, Human Gate presentation, post-Gate-3 writes, and task completion — permit evidence chain (`.permits/`) + downstream backpressure makes bypassing the protocol detectable at the next mandatory checkpoint
- Every sub-agent gets clear context; every decision is recorded and recoverable

## Quick Start

1. Create an empty folder on your machine
2. Open it in Cowork as your workspace
3. Paste the following into Cowork and send:

> Please install DevFlow. Repo: https://github.com/Stackmild/DevFlow.git
> Clone it here, then install all skills from skills-source/ as global skills.

4. After Cowork finishes, restart Cowork or toggle skills off/on in settings
5. Type `@dev-orchestrator your task description` to start

**Using with another project**: Open your project folder in Cowork and call `@dev-orchestrator` — it will detect it's not a DevFlow directory, ask for the path, and set everything up automatically.

## Improving DevFlow

DevFlow is designed to be adaptable, self-evaluating, and iteratable. Four paths:

**1. Adapt to your environment** — Edit the platform docs in `reference/` (e.g. `cowork-as-host-platform.md`). Orchestrator reads them at task start to understand capability boundaries.

**2. Evaluate DevFlow's performance** — After completing a task, ask DevFlow to evaluate itself using [`reference/devflow-self-evaluation-guide.md`](reference/devflow-self-evaluation-guide.md) — covering phase execution quality, artifact completeness, and gate decision quality.

**3. Run change-audit before modifying DevFlow** — Before changing protocols, skills, or workflow definitions, run `@change-audit` for structural admission auditing. It calls L1 design review + L2 contract review and outputs `go / go_with_conditions / revise / block`.

> **Note**: Passing change-audit only means "approved to enter implementation" — it does not mean the change is fully validated.

**4. Periodic self-iteration retrospective (Beta Skill)** — `@DevFlow-self-improve` is a side-channel, manually-triggered skill that does not enter the ORC main flow. Trigger it after a batch of tasks to run two layers:
- **Governance review**: sync conversation records, run regression assertions, output findings triage (real issues / legacy / data gaps) + fix suggestions
- **Product lesson extraction**: distill negative product experience (hallucinated URLs, platform constraints, LLM boundaries, etc.) into `product-failure-library` / `product-constraints-ledger` / `product-playbook`

Trigger: `@DevFlow-self-improve` (Mode B full review) or `@DevFlow-self-improve mode=A task=<id>` (single task). Skill definition: [`skills-source/devflow-self-improve/SKILL.md`](skills-source/devflow-self-improve/SKILL.md).

## Reference

See [`reference/`](reference/) for system documentation.

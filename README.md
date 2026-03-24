# DevFlow — 多 Agent 开发工作流系统

DevFlow 是一个基于 **Claude Cowork** Skills 体系构建的**阶段驱动（Phase-Driven）多 Agent 半自动开发工作流系统**。

一个 orchestrator 按照固定的阶段骨架（定义 → 产品分析 → 设计 → 执行+审查 → 收尾），在每个阶段自动调度合适的专业 skill（sub-agent），人类只在 **3 个决策点** 介入。所有过程通过项目级 continuity layer 和任务级 state store 实现**可追踪、可审计、可纠错**。

---

## 工作原理

### 阶段驱动的工作流

DevFlow 的核心是 **Phase（阶段）**，不是 Skill。每个阶段定义了"做什么"，orchestrator 根据任务类型自动选择合适的 skill 去执行。流程为 Phase A → B → C → D → F，其中 B/C/D 各有一个人类决策 Gate，如下表所示：

| 阶段 | 做什么 | 自动调用的 Skill | 人类决策 |
|------|--------|-----------------|----------|
| **Phase A** | 任务定义、repo 识别、类型判断 | orchestrator 自动完成 | — |
| **Phase B** | 产品分析、Roadmap 绑定 | `product-manager` | **Gate 1** 方向 |
| **Phase C** | 架构 + 后端 + 交互 + 前端设计 | `web-app-architect` `backend-data-api` `webapp-interaction-designer` `frontend-design`（按需） | **Gate 2** Scope |
| **Phase D** | D.1 编码 → D.2 审查 → D.3 验收 | `full-stack-developer` → `code-reviewer` + 条件审查员 | **Gate 3** 验收 |
| **Phase F** | known_gaps 归集、ROADMAP/DEFERRED 回填 | `state-auditor`（可选） | — |

> 条件审查员：当改动涉及 UI 时自动加入 `webapp-consistency-audit`，涉及数据/API 时加入 `pre-release-test-reviewer`。

### 非线性：回流与修订

DevFlow 不是纯串行流程——每个 Gate 和审查节点都支持回流：

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

## DevFlow与普通工作流的差异

DevFlow 的核心差异在于两层持久化机制：

### 项目级 Continuity Layer

跨任务维护项目的"大图"——让每次任务不是从零开始，而是在项目上下文中推进：

- **PROJECT-BRIEF** — 项目定位与核心目标
- **ROADMAP.md** — 里程碑与待办事项，任务完成时自动回填
- **DEFERRED.md** — 被推迟的需求，附带来源和推迟原因

### 任务级 State Store

每个任务在 `orchestrator-state/{task_id}/` 下维护完整的执行记录：

- **events.jsonl** — 时序事件日志（canonical 时间真相）
- **task.yaml** — 任务当前状态快照
- **artifacts/** — 每个阶段的设计文档、实现报告
- **decisions/** — 所有 Gate 的人类决策记录（gate-1/2/3.yaml）
- **issues/** — 审查中发现的问题

此外，每个 Gate 展示前，orchestrator 会静默执行一批结构性完整性检查（Pre-Gate Self-Check，共 27 项分布在三个 Gate 前：6+8+13）。正常情况下用户完全感知不到，只有有问题时才会拦截——质量保障不是事后审计，而是**每个决策点前都有把关，不拉长正常流程**。Phase F 的 state-auditor 仍作为 post-run 完整审计（20 项 CHECK），形成"前置拦截 + 事后审计"的双保险。

V5.0 新增 `devflow-gate` 薄控制层：一个外部 node 脚本，在 Phase 进入、Gate 3 后写操作、以及任务完成前做 **action authorization**（事前拦截），补上 pre-gate check 只能在 Gate 时运行的盲区。

---

## 快速开始

### 前置条件

- Claude Cowork

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

默认情况下，DevFlow 管理的项目放在 DevFlow 目录内的 `projects/` 文件夹。

如果你的项目代码已经有自己独立的文件夹，也可以让 DevFlow 来管理它，不需要任何手动配置：

1. 在 Cowork 中打开**你的项目文件夹**
2. 直接输入 `@dev-orchestrator {任务描述}` 即可

Orchestrator 会检测到当前不在 DevFlow 目录内，主动询问你的 DevFlow 目录路径，然后自动创建配置文件。之后任务管理数据存到 DevFlow 那边，代码修改在你的项目文件夹中进行。

### 改进 DevFlow 本身

DevFlow 的设计是可适配、可自评、可迭代的。以下是三个层次的改进路径：

**1. 适配你的开发环境**

Orchestrator 在每次任务启动时会读取 `reference/` 下的宿主平台认知文档，以此判断平台能力边界和任务分工。如果你使用的开发工具或协作平台与默认描述不同，直接修改这些文档即可——orchestrator 会自动适应你的实际环境。

**2. 评估 DevFlow 的实际表现**

完成一次开发任务后，可以让 DevFlow 参考 [`reference/devflow-self-evaluation-guide.md`](reference/devflow-self-evaluation-guide.md) 对自身在本次任务中的表现进行评估，包括阶段执行质量、artifact 完整性、Gate 决策合理性等。评估结果可以直接指导你改进 skill 定义或流程规则。

**3. 改动上线前跑 change-audit**

如果你想修改 DevFlow 的协议、skill 或工作流定义，建议在正式改动前运行 `@change-audit` 做结构性改动准入审计。它会自动调用 L1 设计审计 + L2 契约审计，输出 `go / go_with_conditions / revise / block` 裁决，帮你在实现前发现结构性缺口和 contract 破坏风险。

> **注意**：通过 change-audit 仅代表"允许进入实现"，不代表改动已完整验证。

---

## 核心原则

- **平台优先** — 先用宿主平台能力（AI 推理、搜索、MCP），写代码是最后手段
- **阶段驱动** — Phase 是骨架，Skill 是阶段内的能力模块
- **Orchestrator 是主控者** — 持有最多上下文，负责路由和状态管理，不是文件搬运工
- **审查独立性** — Orchestrator 不能自我审查，reviewer 必须独立调度
- **不默认重型路线** — 不主动引入 Docker / PostgreSQL / Redis / 完整 Web 框架
- **双平台协作** — Cowork（开发编排）+ 飞书妙搭（企业应用承载），按数据/用户边界分工

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
    ├── sync-skills.sh     # Skill 维护者同步工具
    ├── devflow-gate.mjs   # 薄控制层主入口（V5.0）
    └── lib/               # Gate action 检查模块
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

An orchestrator follows a fixed phase skeleton — Define → Product Analysis → Design → Execute+Review → Closeout — automatically dispatching specialized skills at each phase. Humans intervene at only **3 decision gates**. All processes are **traceable, auditable, and recoverable** through a project-level continuity layer and task-level state store.

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

- **Project Continuity Layer**: PROJECT-BRIEF, ROADMAP, DEFERRED maintained across tasks
- **Task State Store**: Full audit trail per task — events.jsonl, task.yaml, artifacts, decisions
- **Pre-Gate Self-Check**: 27 checks distributed across 3 gates (6 + 8 + 13), run silently — invisible in the happy path, only fires when something is wrong
- **devflow-gate v1** (V5.0): External node script providing action authorization before phase transitions, post-Gate-3 writes, and task completion — a half-hard gate that complements pre-gate auditing with upfront enforcement
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

## Reference

See [`reference/`](reference/) for system documentation.

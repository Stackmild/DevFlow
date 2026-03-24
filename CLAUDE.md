# DevFlow — 多 Agent 开发工作流系统

## 项目简介

DevFlow 是一个运行在 Cowork 宿主平台上的**阶段驱动（Phase-Driven）多 Agent 半自动开发工作流系统**。它按照固定的阶段骨架（定义 → 产品分析 → 设计 → 执行+审查 → 收尾），在每个阶段自动调度合适的专业 skill（sub-agent），完成"设计 → 实现 → 审查"闭环。

支持 Cowork 内部项目与**外部独立 repo**（V4.5）的混合场景，也支持飞书妙搭 cloud_config 与 local_code_sync 两种 handoff 模式。

## 核心原则

1. **Cowork 是宿主平台，不是普通开发机**——先探索平台已有能力（AI 推理、搜索抓取、MCP、自动化），再决定哪些需要写代码
2. **能用平台能力的不自建**——不重复造抓取层、AI 调用层、调度层
3. **parent agent 是主控者**——持有最多上下文，做中间判断，不是纯文件路由器
4. **写代码是最后手段**——platform > sub-agent > handoff > code
5. **飞书妙搭是外部宿主平台，不是简单 handoff target**——它有自己的数据边界（飞书数据对象）和用户边界（飞书企业权限），任务分工基于宿主边界判断而非简单强弱对比
6. **Handoff 按类型分类**——UI/Page、Data/Object、Workflow/Connector、Permission/Role、AI Assistant

## 仓库结构（Git tracked）

```
DevFlow/
├── CLAUDE.md                    # 本文件：项目级指令
├── README.md                    # 项目说明
├── skills-source/               # Skill 源文件
│   ├── dev-orchestrator/        # 编排器
│   ├── product-manager/         # 产品管理（含 9 个子 skill）
│   ├── web-app-architect/       # 架构设计
│   ├── backend-data-api/        # 后端/API 设计
│   ├── webapp-interaction-designer/  # 交互设计
│   ├── frontend-design/         # 前端设计
│   ├── full-stack-developer/    # 执行型开发
│   ├── code-reviewer/           # 代码审查
│   ├── webapp-consistency-audit/ # 一致性审计
│   ├── pre-release-test-reviewer/ # 发布前测试
│   ├── state-auditor/           # State Store 审计
│   ├── release-and-change-manager/ # 发布管理
│   ├── component-library-maintainer/ # 组件维护
│   └── test/                    # DevFlow 实验性 Skill（非核心工作流）
│       ├── change-audit/             # 结构性改动准入审计（parent）
│       ├── change-audit-l1-design-review/   # L1 设计审计 sub-skill
│       └── change-audit-l2-contract-review/ # L2 契约审计 sub-skill
├── reference/                   # 系统参考文档
│   ├── cowork-as-host-platform.md
│   ├── feishu-miaoda-as-host-platform.md
│   └── devflow-self-evaluation-guide.md
├── scripts/
│   ├── sync-skills.sh           # Skill 维护者同步工具
│   ├── devflow-gate.mjs         # 薄控制层主入口（V5.0）
│   └── lib/
│       ├── state-reader.mjs     # State store 读取工具
│       └── checks/              # Gate action 检查模块
│           ├── enter-phase.mjs
│           ├── post-gate3.mjs
│           └── complete-task.mjs
└── reference/                   # 系统参考文档（同前）
```

## 本地目录（.gitignored，各自维护）

以下目录由 orchestrator 运行时使用，不入仓库。首次运行任务时会自动创建。

```
DevFlow/
├── orchestrator-state/          # 任务状态层（orchestrator 自动创建）
│   └── {task_id}/               # 每个任务一个目录
│       ├── task.yaml            # 任务快照（当前状态）
│       ├── artifacts/           # 各阶段产出
│       ├── issues/              # issue 记录
│       ├── decisions/           # 人类决策记录（gate-1/2/3.yaml）
│       ├── handoffs/            # 外部交接文件
│       ├── monitor/             # state-auditor 审计产出
│       ├── .permits/            # devflow-gate 通过记录（V5.0，可选证据）
│       ├── changelog.md         # 追加式日志（人类可读）
│       └── events.jsonl         # 结构化事件日志（canonical 时序记录）
├── projects/                    # 你的项目代码（内部项目）
├── docs/                        # 你的个人开发笔记
└── .env                         # 环境变量（如需要）
```

> **外部 repo 模式**：如果在 DevFlow 目录外的独立 repo 中调用 orchestrator，Phase A.0 会通过 `devflow-config.yaml` 自动发现 devflow_root，并将 `project_path` 指向外部 repo。整个任务生命周期内 project_path 不变。

## 工作流（Phase-Driven v4）

DevFlow 的核心是 **Phase（阶段）**，不是 Skill。每个阶段定义了"做什么"，orchestrator 根据任务类型自动选择合适的 skill 去执行。

```
@dev-orchestrator {任务描述}
  ↓
Phase A: 任务定义 + 外部/内部 repo 识别（A.0）+ 任务类型判断
  ↓
Phase B: 产品分析（PM） + Roadmap 绑定
  → Gate 1：方向确认（GO / ADJUST / DEFER-TASK / PAUSE）
  ↓
Phase C: 设计阶段（按需调度：architect → backend → interaction → frontend）
         [bugfix/hotfix 可跳过 Phase C → 写 phase-skip-C.yaml]
  → Gate 2：Scope & 架构确认（PROCEED / RESCOPE / PAUSE）
  ↓
Phase D（不可分割的三步）：
  D.1 执行（full-stack-developer → change-package 必填）
  D.2 审查（code-reviewer + 条件审查员，基于 scope_flags 路由）
  D.3 收尾
  → Gate 3：最终验收（ACCEPT / REVISE / PAUSE）
  ↓
Phase F: 收尾（known_gaps 归集 → ROADMAP/DEFERRED 回填 → state-auditor 可选）
```

### 各阶段的 Skill 调度

| 阶段 | 调用的 Skill | 说明 |
|------|-------------|------|
| **Phase A** | orchestrator 自动 | 任务定义、repo 识别、类型判断 |
| **Phase B** | `product-manager` | 问题分析、outcome 定义、Roadmap 绑定 |
| **Phase C** | `web-app-architect` `backend-data-api` `webapp-interaction-designer` `frontend-design` | 按需调度，bugfix 可跳过 |
| **Phase D.1** | `full-stack-developer` | 执行编码，产出 change-package |
| **Phase D.2** | `code-reviewer` + 条件审查员 | UI 改动加 `webapp-consistency-audit`，数据/API 改动加 `pre-release-test-reviewer` |
| **Phase F** | `state-auditor`（可选） | State Store 完整性审计 |

## 回流与修订机制

DevFlow 不是纯串行流程，每个 Gate 和审查节点都支持回流：

| 回流节点 | 触发条件 | 回流目标 | 次数限制 |
|----------|----------|----------|----------|
| **Gate 1 ADJUST** | 方向需要调整 | 回 Phase B，重新 spawn PM 调整 scope | 无硬性上限 |
| **Gate 2 RESCOPE** | scope 需要重新设计 | 回 Phase C，重新 dispatch 设计 skill（新 handoff-packet supersedes 旧 packet） | **最多 1 次**；第 2 次强制升级为 PAUSE |
| **D.2 审查发现问题** | reviewer 发现 issue，触发 `revision_applied` | 回 D.1，re-spawn FSD，change-package revision_seq 递增 | 三档修订制（见下） |
| **Gate 3 REVISE** | 最终验收未通过，指定返工部分 | 走 continuation-protocol `re_enter_d` 路径，完整 D 循环 + Gate 3 重展示 | 无硬性上限 |

### 三档修订制（D.2→D.1 回流限制）

| 档位 | 触发条件 | 行为 |
|------|----------|------|
| 🟢 绿区 | 每 skill ≤ 1 次修订，全局 ≤ 2 次 | 自动修订，继续流程 |
| 🟡 黄区 | 某 skill 第 2 次修订，或全局第 3 次 | 暂停 + warning，等用户决策 |
| 🔴 红区 | 某 skill ≥ 3 次修订，或全局 ≥ 5 次 | 强制停止 |

> PAUSE 恢复后从当前阶段续接（不退回已确认的 Gate）。

## 三个 Human Gate

| Gate | 触发时机 | 用户选项 | 决策记录 |
|------|----------|----------|----------|
| **Gate 1** 方向 | Phase B 完成后 | GO / ADJUST / DEFER-TASK / PAUSE | `decisions/gate-1.yaml` |
| **Gate 2** Scope | Phase C 完成后 | PROCEED / RESCOPE / PAUSE | `decisions/gate-2.yaml` |
| **Gate 3** 验收 | Phase D.3 完成后 | ACCEPT / REVISE / PAUSE | `decisions/gate-3.yaml` |

> Gate 2 允许最多 1 次 RESCOPE；第 2 次强制 PAUSE。
> Gate 3 ACCEPT 是唯一合法进入 Phase F 的路径。
> Gate 3 ACCEPT 后如需继续操作，必须走 continuation-protocol（5 条路径）。

### Pre-Gate Self-Check

每个 Gate 展示前，orchestrator 会**静默、自动**地执行一批结构性完整性检查（源自 state-auditor 的 CHECK 项前移）。这些检查**不会拉长流程**——正常情况下用户完全感知不到，只有检查失败时才会打断并告知原因。

27 项检查分布在三个 Gate 前（6 + 8 + 13），而非每个 Gate 前都跑 27 项：

> Gate 3 前 13 项包含 V4.5 新增的 PG3-12/13（deploy/publish task 的 build/typecheck 强制验证）。

| Gate | 检查项数 | 检查示例 |
|------|---------|---------|
| Gate 1 前 | 6 项 | task.yaml 关键字段非空、product-spec 存在、routing-decision 存在 |
| Gate 2 前 | 8 项 | Gate 1 决策存在、implementation-scope 存在且非 orchestrator 产出、设计 skill 全部完成 |
| Gate 3 前 | 13 项 | change-package 存在、至少 1 个独立 reviewer 完成、无未解决 blocker、deploy task 的 build/typecheck 验证 |

检查结果：
- **PASS** — Gate 正常展示，用户无感知
- **WARN** — Gate 正常展示，顶部加警告提示
- **BLOCK** — Gate 被阻止，展示具体原因；允许一次自动修复尝试，仍失败则停止

Phase F 的 state-auditor 仍作为 post-run 完整审计（20 项 CHECK），其中 CHECK-20 会验证 pre-gate self-check 是否真的执行了——形成"前置拦截 + 事后审计"的双保险。

### devflow-gate 薄控制层（V5.0）

Pre-Gate Self-Check 是 state auditing（事后审计）——如果 ORC 直接跳过 Gate 本身，这些检查根本不会运行。

V5.0 引入了 `scripts/devflow-gate.mjs`，在 3 个最危险动作前做 **action authorization（事前拦截）**：

| 动作 | 何时调用 | 防什么 |
|------|---------|--------|
| `enter_phase --phase {P}` | 写 `phase_entered` 事件之前 | Phase 跳过（如跳过 Phase C 直接进 D） |
| `post_gate3_write --target-path {path}` | Gate 3 ACCEPT 后写非 Phase F 允许文件前 | Gate 3 后系统逃逸（ad-hoc 写入） |
| `complete_task` | 写 `task.yaml status=completed` 之前 | 假 closeout（缺 events、有 open blocker） |

这是**半硬闸门**：调用了 → 脚本给出 machine-readable ALLOW/BLOCK；绕过了 → permit 缺失，后续 auditor 可发现。它不是完整外部状态机，但把需要记住的协议从 50+ 条压到 1 个命令 + 3 个 subcommand。

```bash
# 示例：进入 Phase D 前调用
node scripts/devflow-gate.mjs enter_phase --task-dir orchestrator-state/{task_id} --phase phase_d
```

详见 `scripts/devflow-gate.mjs` 和 SKILL.md §Universal Gate Rule。

## 两层持久化

### 项目级 Continuity Layer

跨任务维护项目的"大图"，让每次任务不是从零开始：

- **PROJECT-BRIEF** — 项目定位与核心目标
- **ROADMAP.md** — 里程碑与待办，任务完成时自动回填
- **DEFERRED.md** — 被推迟的需求，附来源和推迟原因

Phase B 自动读取 ROADMAP 并将当前任务绑定到里程碑；Phase F 完成时回填交付状态和新增待办。

### 任务级 State Store

每个任务在 `orchestrator-state/{task_id}/` 下维护完整的执行记录：

- **events.jsonl** — 时序事件日志（canonical 时间真相，争议以此为准）
- **task.yaml** — 当前状态快照（最后更新）
- **artifacts/** — 各阶段产出（设计文档、实现报告、审查报告）
- **decisions/** — 所有 Gate 的人类决策记录
- **issues/** — 审查中发现的问题

**写入顺序**：events.jsonl 先落 → artifact/decision 文件 → task.yaml 最后更新。

## 执行模式（三分）

| Mode | 含义 |
|------|------|
| `platform` | 平台能力直接完成（AI 推理、WebFetch、MCP），不写代码 |
| `code` | 需要 full-stack-developer 写代码 |
| `handoff` | 交给外部平台（飞书妙搭 cloud_config 或 local_code_sync） |

## 关键约束

- **不默认走重型路线**——没有用户明确要求，不引入 Docker / PostgreSQL / Redis / 完整 Web 框架
- **修订三档制**——绿区（自动）→ 黄区（warning）→ 红区（强制停止）
- **硬上线限制**——破坏性 migration、权限变更、大 schema 变更必须标注 ⚠️
- **审查独立性**——orchestrator 不能自我审查（铁律 #9）
- **状态写入顺序**——events.jsonl 先落 → artifact/decision → task.yaml 最后更新

## 快速开始

1. 在本地新建一个空文件夹
2. 用 Cowork 打开这个文件夹
3. 粘贴以下内容发送：
   > 请帮我安装 DevFlow。GitHub 仓库地址：https://github.com/Stackmild/DevFlow.git
   > 请克隆到当前目录，然后把 skills-source/ 下的所有 skill 安装为全局 skill。
4. Cowork 完成后，重启 Cowork 或 toggle skills
5. 输入 `@dev-orchestrator {你的任务描述}` 启动工作流

> orchestrator 会自动创建 `orchestrator-state/{task_id}/` 目录管理任务状态。

### 在其他项目 repo 中使用 DevFlow

如果你想用 DevFlow 管理另一个 repo 的开发任务：

1. 在 Cowork 中打开你的项目目录
2. 输入 `@dev-orchestrator {任务描述}`

Orchestrator 检测到当前不是 DevFlow 目录时，会主动询问你的 DevFlow 目录路径，并自动创建 `devflow-config.yaml`。之后任务状态存到 DevFlow 的 `orchestrator-state/`，代码修改在你的项目目录中执行。

### 改进 DevFlow 本身

DevFlow 的设计是可适配、可自评、可迭代的。以下是三个层次的改进路径：

**1. 适配你的开发环境：修改宿主平台文档**

Orchestrator 在每次任务启动时会读取 `reference/` 下的宿主平台认知文档（`cowork-as-host-platform.md`、`feishu-miaoda-as-host-platform.md`），以此判断平台能力边界和任务分工。如果你使用的开发工具、平台能力或外部协作平台与默认描述不同，可以直接修改这些文档，orchestrator 会自动适应你的实际环境。

**2. 评估 DevFlow 的实际表现并改进**

完成一次开发任务后，可以让 DevFlow 参考 `reference/devflow-self-evaluation-guide.md` 对自身在本次任务中的表现进行评估——包括阶段执行质量、artifact 完整性、Gate 决策合理性等维度。评估结果可以直接指导你对 skill 定义或流程规则的改进。

**3. 改动上线前跑 change-audit**

如果你想修改 DevFlow 的协议、skill 或工作流定义，建议在正式改动前运行 `@change-audit` 做结构性改动准入审计。该 skill 会自动调用 L1 设计审计 + L2 契约审计，输出 `go / go_with_conditions / revise / block` 裁决，帮助在实现前发现结构性缺口和 contract 破坏风险。该 skill 位于 `skills-source/test/change-audit/`。

> **注意**：通过 change-audit 仅代表"允许进入实现"，不代表改动已完整验证。

**4. 手动触发阶段性自迭代复盘（Beta Skill）**

`@DevFlow-self-improve` 是一个旁路手动触发的自迭代 skill（Beta），不接 ORC 主流程，不影响日常开发链路稳定性。建议在一批任务完成后手动触发，分两层执行：
- **治理复盘层**：增量同步对话记录、跑 regression 断言、输出 findings 分流（真实问题 / 历史遗留 / 数据不足）+ 修复建议
- **产品经验沉淀层**：提炼负面产品经验（URL 杜撰、平台限制、LLM 边界等），更新 `product-failure-library.jsonl`、`product-constraints-ledger.md`、`product-playbook.md`

触发方式：`@DevFlow-self-improve`（Mode B 全量）或 `@DevFlow-self-improve mode=A task=<id>`（单任务复盘）。Skill 定义位于 `skills-source/devflow-self-improve/SKILL.md`。

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
│   └── component-library-maintainer/ # 组件维护
├── reference/                   # 系统参考文档
│   ├── cowork-as-host-platform.md
│   ├── feishu-miaoda-as-host-platform.md
│   └── devflow-self-evaluation-guide.md
└── scripts/
    └── sync-skills.sh           # Skill 维护者同步工具
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

1. Clone 本仓库
2. 在 Cowork 中打开 DevFlow 目录
3. 让 Cowork 安装 `skills-source/` 下的所有 skill
4. 输入 `@dev-orchestrator {你的任务描述}` 启动工作流

> orchestrator 会自动创建 `orchestrator-state/{task_id}/` 目录管理任务状态。

### 在其他项目 repo 中使用 DevFlow

如果你想用 DevFlow 管理另一个 repo 的开发任务：

1. 在 Cowork 中打开你的项目目录
2. 输入 `@dev-orchestrator {任务描述}`

Orchestrator 检测到当前不是 DevFlow 目录时，会主动询问你的 DevFlow 目录路径，并自动创建 `devflow-config.yaml`。之后任务状态存到 DevFlow 的 `orchestrator-state/`，代码修改在你的项目目录中执行。

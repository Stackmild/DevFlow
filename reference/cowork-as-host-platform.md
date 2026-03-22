# Cowork 作为宿主平台——Orchestrator 的基础认知

> 本文档是 dev-orchestrator 和 full-stack-developer 的**前置认知层**。
> 两个 skill 在做任何技术判断之前，必须先基于本文档的理解来思考。

---

## 1. Cowork 应该被理解成什么

### 不是什么

| 错误理解 | 会导致什么 |
|---------|----------|
| "一台普通本地开发机" | 默认所有东西都自己装、自己跑、自己维护 |
| "一个能跑脚本的终端" | 把所有逻辑塞进脚本，忽略平台已有能力 |
| "一个 IDE + 一点 AI 辅助" | 把 AI 当成自动补全工具，而非核心执行力 |
| "一台需要部署应用的服务器" | 默认走 full-app 路线，发明不必要的基础设施 |

### 是什么

**Cowork 是一个 AI-native 宿主平台（host platform）。**

它的本质特征是：

1. **内置大模型能力**——不需要外接 API 就能做推理、分类、摘要、生成
2. **内置 skill 体系**——专业能力以 skill 形式预装，可被 orchestrator 编排
3. **内置 agent 能力**——parent agent 可以 spawn sub-agent，形成协作
4. **内置工具链**——文件读写、搜索、代码编辑等作为 tool 原生可用
5. **可扩展（MCP）**——通过 MCP 接入外部数据源、搜索引擎、API
6. **可自动化**——定时任务、信号触发、cron 调度
7. **可持久化**——文件系统作为状态层，跨会话可恢复

**类比**：Cowork 更像是一个"具备 AI 推理能力的操作系统"，而不是"一台装了开发工具的电脑"。你在 macOS 上不会自己重写文件系统；同理，在 Cowork 上不应该自己重写它已有的能力。

---

## 2. 为什么不能把 Cowork 简化成"本地脚本环境"

### 简化理解导致的系统性偏差

如果把 Cowork 理解成"本地脚本 + 自己调外部 API"，会导致：

| 偏差 | 具体表现 | 已暴露的例子 |
|------|---------|------------|
| **重复造模型调用层** | full-stack-developer 默认要求配 Claude API key + 自建 AI Gateway 模块 | 新闻聚合器 Phase 1 设计了 `ai-gateway` 模块，但 Cowork 本身就有大模型能力 |
| **重复造抓取基础设施** | 默认引入 RSS parser + 并发控制 + 重试机制 | 新闻聚合器设计了 BullMQ + 重试队列，但 Cowork 可能已有搜索/抓取 MCP |
| **重复造调度系统** | 默认引入 BullMQ / node-cron + Redis | Cowork 自带 Automation Service（cron + signal 触发） |
| **重复造状态管理** | 默认引入 PostgreSQL / Prisma / 完整 ORM | Cowork 的文件系统 + 简单 SQLite 对大多数内部工具足够 |
| **重复造认证系统** | 默认引入 NextAuth / GitHub OAuth | Cowork 本身就是受控环境，用户已登录 |
| **忽视 parent agent 能力** | 把 orchestrator 当成纯文件路由器，不利用它的推理判断能力 | orchestrator 只传递 artifact 文件，不自己做中间判断 |

### 根因

这些偏差的根因是同一个：

> **把 Cowork 理解成"空白环境"，然后从零开始建设所有基础设施。**

正确的理解应该是反过来的：

> **Cowork 是"已装满能力的环境"，你的任务是识别哪些能力已有、哪些真的需要补。**

---

## 3. 正确的设计思路：先探索，再裁剪

### 原则 1：先探索宿主平台能力边界，再决定技术方案

不要先假定技术栈，再去套环境。
应该先了解环境提供什么，再决定还缺什么。

```
❌ 错误顺序：
  "这个任务需要 RSS 抓取 → 用 rss-parser 库 → 需要并发控制 → 用 p-limit → 需要定时 → 用 node-cron"

✅ 正确顺序：
  "这个任务需要定期获取 RSS 内容"
  → Cowork 有搜索/抓取能力吗？（WebFetch / MCP 工具）
  → 有 → 用平台能力，不装额外库
  → 没有 → 写最小脚本补这一块
```

### 原则 2：能用平台能力的，不自建

| 需求 | 先检查平台是否已有 | 只有平台没有时才自建 |
|------|-----------------|-------------------|
| AI 推理/摘要/分类 | parent agent 本身就能做；sub-agent 也能做 | 只有需要批量离线处理时才考虑外部 API |
| 信息抓取 | WebFetch / MCP 搜索工具 | 只有平台工具不支持的特殊格式才写 parser |
| 定时触发 | Automation Service (cron/signal) | 只有平台调度不满足时才用 node-cron |
| 数据持久化 | 文件系统（JSON/Markdown/YAML） | 只有需要复杂查询时才用 SQLite |
| 认证 | 平台已有登录体系 | 几乎不需要自建 |
| 任务状态 | orchestrator state store（文件） | 不需要数据库 |

### 原则 3：parent agent 是主控者，不是文件路由器

在 Cowork 中，parent agent（即 orchestrator）拥有：
- 当前任务的全部上下文
- 所有上游 artifact 的内容理解
- 大模型推理能力
- 工具调用能力

因此它不仅仅是"把 A 文件传给 B skill"的路由器。它可以：

- **自己做中间判断**：比如"这个任务的 AI 处理部分，不需要单独的 AI Gateway 模块，parent agent 自己就能做"
- **自己做轻量聚合**：比如"把 5 个 feed 的内容汇总成一个结构，不需要 sub-agent"
- **决定分工粒度**：比如"这个任务小到不需要 spawn architect，直接跳到 backend"

### 原则 4：sub-agent 做局部专业工作，不做全局判断

Sub-agent 的价值在于：
- 在特定领域比 parent agent 更专业（因为加载了 skill 指令）
- 可以独立处理一个完整的子问题
- 产出结构化的 artifact 供下游消费

但 sub-agent 不应该：
- 自己决定整体技术方案
- 假定宿主平台没有某种能力
- 引入 parent agent 没有授权的外部依赖

### 原则 5：本地代码/脚本只做"平台能力真的覆盖不了"的部分

写代码是最后手段，不是默认手段。

```
能力需求来了
     │
     ▼
平台（parent agent / sub-agent / 工具 / MCP）能做吗？
     ├─ 能 → 用平台能力
     └─ 不能
          │
          ▼
     飞书妙搭能做吗？
          ├─ 能 → generate_handoff
          └─ 不能
               │
               ▼
          写最小代码补这一块
```

### 原则 6：不要把"能力探索"变成另一种硬编码

能力探索不是写一个固定的 checklist 说"Cowork 有这 5 种能力"。
而是在每次任务开始时，orchestrator 根据当前环境的实际工具和 MCP 可用性，动态判断：

- 当前会话里有哪些工具可用？
- 当前有哪些 MCP 服务已接入？
- 当前 skill 体系里有哪些 skill 已安装？
- 基于以上，这次任务的哪些环节可以由平台承担？

这意味着不同的 Cowork 实例、不同的 MCP 配置、不同的 skill 安装状态，会导致不同的任务分工方案。这是正确的——它应该是动态的，不是写死的。

---

## 4. 对 orchestrator 和 full-stack-developer 的具体影响

### 对 dev-orchestrator

| 之前 | 之后 |
|------|------|
| Phase 0 判断 `environment_mode`（固定枚举） | Phase 0 先做**能力边界探索**：当前平台有什么工具/MCP/skill 可用，然后动态决定任务分工 |
| 用 `cowork_local_static` / `cowork_local_script` 等标签约束技术栈 | 用"平台能力→还缺什么→补什么"的思路约束技术栈 |
| full-stack-developer 收到的是一个固定 mode 标签 | full-stack-developer 收到的是"平台已覆盖 X/Y/Z，你只需要补 A/B" |

### 对 full-stack-developer

| 之前 | 之后 |
|------|------|
| 根据 `environment_mode` 选择技术栈 | 根据 orchestrator 传来的"平台能力清单 + 剩余需补项"决定写什么代码 |
| 默认引入完整依赖树（rss-parser, p-limit, better-sqlite3...） | 只引入平台确实不提供的部分的最小依赖 |
| 把 AI 处理设计成独立模块 + 外部 API | 先问"parent agent 自己能不能做这件事" |
| 把定时任务设计成 node-cron + 自管理 | 先问"平台 Automation Service 能不能承担" |

---

## 5. Cowork 与飞书妙搭的关系：双平台分工

> 完整的飞书妙搭平台认知：`feishu-miaoda-as-host-platform.md`

Cowork 不是唯一的宿主平台。飞书妙搭也是一个宿主平台——但它们的**宿主边界、数据边界、生态边界不同**。

### 不是"谁更强"

❌ "Cowork AI 更强，飞书妙搭页面更强"
✅ "它们各自能触达的数据边界和用户边界不同"

### 分工逻辑

```
任务主要依赖什么宿主边界？
├── 内部数据、代码库、AI 编排、MCP → Cowork 承载
├── 飞书用户访问、企业权限、飞书数据对象 → 飞书妙搭承载
└── 两边都涉及 → Cowork 主控编排 + 按需生成分类 handoff
```

### Handoff 不是一个笼统文件

面向飞书妙搭的 handoff 应按类型分开：UI/Page、Data/Object、Workflow/Connector、Permission/Role、AI Assistant。详见 `feishu-miaoda-as-host-platform.md` 第 5 节。

---

## 6. 这不是能力说明书

**重要区分**：本文档不是在列举"Cowork 有哪些能力"。

本文档的目的是建立一种**思维方式**：

> 在 AI-native 宿主平台上做开发工具，先理解平台，再决定补什么。
> 涉及外部宿主平台（飞书妙搭）时，基于宿主边界判断分工，不是简单强弱对比。

具体的能力清单会随 Cowork 版本、MCP 配置、skill 安装状态而变化。
飞书妙搭的能力也在持续演进。
这里定义的是**怎么思考**，不是**具体有什么**。

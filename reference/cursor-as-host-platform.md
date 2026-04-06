# Cursor 作为宿主环境——DevFlow Orchestrator 的基础认知

> 本文档供 **cursor-integration** 分支下的 `dev-orchestrator` 使用。与 `cowork-as-host-platform.md` 并列：在 Cursor 中以前者为准做能力判断，后者仅作跨平台对照。

---

## 1. Cursor 应该被理解成什么

**Cursor 是基于 VS Code 的编辑器，内嵌 Agent（对话式多轮工具调用）能力。**

典型能力包括：

| 能力 | 说明 |
|------|------|
| 大模型推理 | Agent 对话内直接推理、生成、摘要，无需自架「AI Gateway」才能起步 |
| Skills | `SKILL.md` 形式的可发现工作流与领域指令（全局 `~/.cursor/skills` 或项目内） |
| Subagents | 独立上下文的子代理，可并行；用于逼近 DevFlow 的「专业 sub-agent」隔离 |
| 工具链 | 读文件、改代码、终端命令、Git、（可选）MCP、浏览器自动化等 |
| 工作区 | 以文件夹为 workspace；常打开**业务仓库**，而 DevFlow 中央目录在另一绝对路径 |

**类比**：把 Cursor 当成「带强 Agent 的开发环境」，而不是「只有 shell 的空白机」。先清点环境里**已经能调用什么工具与 MCP**，再决定要不要新增服务、队列、定时器。

---

## 2. 与 Cowork 的关键差异（DevFlow 落地时必须记住）

| 维度 | Cowork（原文档假设） | Cursor（本环境） |
|------|---------------------|------------------|
| Sub-agent | 平台内 spawn，模型与工具由宿主管理 | 使用 **Subagents** + **@Skill**；由父 Agent 显式委派 |
| 自动化 / cron | 可能有 Automation Service | **默认没有**；需标为 handoff、缩小 MVP，或用户自建 runner |
| 当前工作目录 | 常与 DevFlow 根一致 | 常为**外部业务仓**；**禁止**依赖 `cwd` 调用 `node scripts/devflow-gate.mjs` |
| `devflow_root` | 可与 workspace 相同 | 必须为 **DevFlow 克隆目录的绝对路径**（见 `task.yaml` / `devflow-config.yaml`） |

---

## 3. 正确的设计思路（与 Cowork 版同构）

1. **先探索再裁剪**：终端能跑什么、已配哪些 MCP、浏览器/MCP 能否抓公开信息——再决定要不要新库、新服务。
2. **平台优先**：能靠 Agent + 工具 + MCP 完成的，不必先写完整后台。
3. **专业隔离**：PM / 设计 / 实现 / 审查 应通过 **Subagent 或独立 @Skill 轮次** 完成；父 Agent（orchestrator）只做路由、handoff 包、落盘与 Gate。
4. **协议硬约束**：`devflow-gate` 五 action、`events.jsonl` / `task.yaml`、三 Gate 决策文件——不因「在 Cursor 里更方便」而跳过。

---

## 4. `devflow_root` 在 Cursor 下的硬性规则

- `devflow_root` **必须**指向本仓库（DevFlow）根目录：含 `scripts/devflow-gate.mjs`、`skills-source/`、`reference/`。
- **不要**把 `devflow_root` 设为编辑器缓存目录、插件目录或仅含 `.cursor` 的路径。
- 业务代码在**外部仓库**时：在该仓库根放置 `devflow-config.yaml`，其中 `devflow_root` 指向上述 DevFlow 绝对路径；详见本仓库 `README-CURSOR.md`。

---

## 5. 本文档不是什么

不是「Cursor 全量功能列表」（随版本变）。任务是：**在不确定时，默认先查当前 workspace 与 MCP 配置里实际可用的工具**，再写方案。

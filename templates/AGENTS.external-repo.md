# DevFlow（Cursor）— 外部业务仓库

将本文件复制到**业务仓库根目录**并重命名为 `AGENTS.md`（或合并进现有 `AGENTS.md`）。把下面的绝对路径改成你的 DevFlow 克隆路径。

## 固定路径

- **devflow_root**: `/绝对路径/DevFlow`

## Gate（必须绝对路径）

编排器在调用薄控制层时**不得**使用 `node scripts/devflow-gate.mjs`（当前 Cursor workspace 可能不是 DevFlow 根目录）。

正确示例：

```text
node "/绝对路径/DevFlow/scripts/devflow-gate.mjs" enter_phase --task-dir "/绝对路径/DevFlow/orchestrator-state/<task_id>" --phase phase_b
```

`task_id` 与 `state_dir` 以当次任务的 `task.yaml` 为准。

## 角色边界

- **父 Agent（@dev-orchestrator）**：Phase 路由、state 写入、`devflow-gate`、Gate 展示、handoff 落盘。
- **Subagents / @Skill**：PM、设计、FSD、Reviewer 等专业正文；避免父会话越权代写。

## 发现 DevFlow 根目录

本仓库根目录应包含 `devflow-config.yaml`：

```yaml
devflow_root: "/绝对路径/DevFlow"
```

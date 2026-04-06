# DevFlow on Cursor（cursor-integration）

本分支在官方 DevFlow 协议基础上，为 **Cursor** 补齐：**与 `cwd` 无关的 `devflow-gate` 路径**、**Cursor 宿主说明**、**Skills / Subagents 安装脚本** 与 **内外部项目混用** 模板。

## 1. 一次性设置

1. 将本仓库放在固定绝对路径（即 `devflow_root`），例如 `~/DevFlow` 或本机的 `.../claw-code/DevFlow`。
2. 安装 Node.js（`devflow-gate` 无 npm 依赖）。
3. 同步 Skills 到 Cursor：

   ```bash
   cd /绝对路径/DevFlow
   bash scripts/sync-skills-cursor.sh        # 核心 + product-manager 子 skills + devflow-self-improve
   bash scripts/sync-skills-cursor.sh --all  # 另含 test/ 下 change-audit 等
   ```

4. 安装 DevFlow 对齐的 **Subagents**（拷贝到全局 `~/.cursor/agents`）：

   ```bash
   bash scripts/install-cursor-subagents.sh
   ```

5. 重启 Cursor 或刷新 Skills / Agents。

6. 新任务在对话中使用：`@dev-orchestrator` + 任务描述。父 Agent 在派发专业工作时应 **调用对应 Subagent**（或单独开对话 `@` 对应 Skill），避免在同一上下文内替代 PM/Reviewer 写专业正文。

## 2. 与上游同步（你自行 Fork 后）

若你在 GitHub 上 **Fork** 了官方仓库，建议：`origin` 指向你的 Fork（`git push` 目标），`upstream` 固定为官方，用于拉取更新：

```bash
git remote add upstream https://github.com/Stackmild/DevFlow.git   # 若尚未添加
git fetch upstream
git checkout cursor-integration
git merge upstream/main
# 冲突高发区：dev-orchestrator、phases、protocols 中的 gate 字符串与 reference
```

解决冲突后重新执行 `sync-skills-cursor.sh` 与（如有变更）`install-cursor-subagents.sh`。

## 3. 内部项目（代码在 DevFlow 内）

- 代码目录：`{devflow_root}/projects/{project_id}/`
- Cursor 可打开 `devflow_root` 或该子目录。
- `task.yaml` 中 `project_path` 可为空；`devflow_root` 为本仓库绝对路径。
- **任何** gate 命令必须使用：

  `node "{devflow_root}/scripts/devflow-gate.mjs" ...`

  将 `{devflow_root}` 替换为真实绝对路径（与 `task.yaml` 一致）。

## 4. 外部业务仓库（混用）

在**业务仓库根目录**创建 `devflow-config.yaml`（可被 Phase A 读取）。可从模板复制：[templates/devflow-config.external-repo.yaml](templates/devflow-config.external-repo.yaml)。

```yaml
devflow_root: "/绝对路径/到你的/DevFlow克隆"
```

推荐在同一仓库复制 [templates/AGENTS.external-repo.md](templates/AGENTS.external-repo.md) 为 `AGENTS.md`（或合并进现有规则），避免 Agent 使用相对路径调用 gate。

业务仓库的 `project_path` 由 orchestrator 写入 `task.yaml`（为该仓库根绝对路径）。

## 5. 外部仓库 `AGENTS.md`

直接使用模板文件 [templates/AGENTS.external-repo.md](templates/AGENTS.external-repo.md)：复制到业务仓库根目录并改名为 `AGENTS.md`，替换其中的绝对路径。

## 6. 验收清单（简版）

- [ ] `bash scripts/sync-skills-cursor.sh` 无报错，`~/.cursor/skills/dev-orchestrator` 存在。
- [ ] `node "/绝对路径/DevFlow/scripts/devflow-gate.mjs"` 无参数运行时打印 Usage 并以非 0 退出。
- [ ] 新建任务后出现 `orchestrator-state/<task_id>/`，且 gate 调用使用**绝对路径**。
- [ ] Gate 1/2/3 有 `decisions/gate-*.yaml`；`.permits/` 在允许的 gate 动作后出现文件。

## 7. 参考文档

- 宿主能力：[reference/cursor-as-host-platform.md](reference/cursor-as-host-platform.md)
- 编排器 Skill：`skills-source/dev-orchestrator/SKILL.md`
- Subagent 定义源文件：`cursor-pack/agents/`（安装脚本会复制到 `~/.cursor/agents`）

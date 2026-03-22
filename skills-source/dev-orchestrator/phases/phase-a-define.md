# Phase A — Define

> 目标：intake + capability scan + task typing + 初步约束识别

## PHASE A PROTOCOL

```
INPUT:
  - 用户通过 @dev-orchestrator 触发任务
  - 无前置 phase 要求

ORCHESTRATOR_ROLE:
  - 初始化 state store
  - 预加载 skill 指令
  - 探索平台能力边界
  - 判断 task_type
  - 写入 task-brief.md

SUB_AGENT_ROLE: 无（Phase A 不 spawn sub-agent）

MUST_PRODUCE:
  - artifacts/task-brief.md
  - task.yaml（initialized with task_type + platform_capabilities + live state）
  - events.jsonl（至少 2 条事件）
  - changelog.md（初始条目）

EXIT_GATE:
  - artifacts/task-brief.md 存在且非空
  - task.yaml 已初始化（task_type + current_phase=phase_a）
  - EVENTS_REQUIRED 全部满足
  - task.yaml live state 已更新（current_phase→phase_b, next_action）

EVENTS_REQUIRED:
  - task_initialized
  - phase_completed(phase_a)
```

---

## Phase Entry Protocol

1. Read `task.yaml`（如存在 → 进入 Resume Flow，见 `phase-resume.md`）
2. 如果是新任务 → 初始化 state store

## Step A.0：Discovery（V4.5 External Repo Support）

确定 DevFlow 中央目录和代码仓位置。此步骤在 State Store 初始化前执行。

```
A.0 Discovery:
  1. CWD 是否是 DevFlow 根目录？

     检测函数 is_devflow_root(path)：
       a) path 包含 skills-source/ 目录？
       b) path 包含 CLAUDE.md 且前 5 行任意一行含 "# DevFlow"？
       判定：a AND b → true

     判定条件（满足以下任一组合）：
       - CWD 包含 orchestrator-state/ 目录 AND is_devflow_root(CWD)
         → 直接认定（有历史任务 + 身份验证通过）
         → detection_method = "direct_with_history"
       - is_devflow_root(CWD)（无 orchestrator-state/ 但身份验证通过）
         → 认定为首次运行
         → detection_method = "direct_first_run"
       - CWD 包含 skills-source/ 但 CLAUDE.md 缺失或不含 "# DevFlow"
         → 向用户确认："检测到 skills-source/ 目录，但未找到 DevFlow 标识。
           当前目录是否是你的 DevFlow 工作区？"
         → 用户确认 YES → 认定为 DevFlow 根（detection_method = "user_confirmed"）
         → 用户确认 NO → 走外部 repo 路径

     → YES（DevFlow 根目录）：
       devflow_root = CWD
       project_path = ""（空，表示内部项目，由 Phase B binding 确定具体位置）

     → NO（非 DevFlow 根目录）：
       → 尝试读 CWD/devflow-config.yaml
       → 读取成功：
           devflow_root = devflow-config.yaml.devflow_root
           → 验证：is_devflow_root(devflow_root)
             → 验证失败 → 告知用户："该路径不是有效的 DevFlow 目录"，重新询问
           project_path = CWD
           detection_method = "external_config"
       → 读取失败（文件不存在或不可读）：
           向用户说明："当前目录不是 DevFlow 工作区，也没有找到 devflow-config.yaml。
           请告诉我你的 DevFlow 目录的完整路径，我来帮你创建配置文件。"
           → 等待用户提供路径
           → 验证：is_devflow_root(用户提供的路径)
             → 验证失败 → 告知用户路径无效，重新询问
           → 在 CWD 创建 devflow-config.yaml，写入：
               devflow_root: "{用户提供的路径}"
           → devflow_root = 用户提供的路径
           → project_path = CWD
           → detection_method = "external_manual"

  2. 写入 task.yaml: devflow_root, project_path, detection_method
  3. 写入 events.jsonl: task_initialized 事件中包含 detection_method 字段
  4. project_path 在此步确定后不再变更（immutable for task lifetime）
```

**CWD 检测门控**：只检测 CWD 直接子目录，不做递归查找。is_devflow_root() 要求 skills-source/ AND CLAUDE.md 同时存在且 CLAUDE.md 前 5 行含 "# DevFlow"，排除偶然同名目录的误判。

**project_path 唯一规则**：
- `project_path = ""`（空）= 内部项目，代码位置由 Phase B 的 `project_id` 推导为 `{devflow_root}/projects/{project_id}/`
- `project_path = "/absolute/path"` = 外部项目，代码在此路径，continuity 壳在 `{devflow_root}/projects/{project_id}/`

---

## Step A.1：初始化 State Store

创建目录结构：
```
orchestrator-state/{task_id}/
├── task.yaml
├── artifacts/
├── issues/
├── decisions/
├── handoffs/
├── monitor/
├── changelog.md
└── events.jsonl
```

生成 `run_id`，写入 task.yaml。
双写 changelog + events.jsonl（`task_initialized`）。

## Step A.2：预加载 Skill 指令

并行 Read（全部同时发出）：

**必读**：
- `../web-app-architect/SKILL.md`
- `../backend-data-api/SKILL.md`
- `../webapp-interaction-designer/SKILL.md`
- `../frontend-design/SKILL.md`
- `../full-stack-developer/SKILL.md`
- `../code-reviewer/SKILL.md`
- `../webapp-consistency-audit/SKILL.md`
- `../pre-release-test-reviewer/SKILL.md`
- `./cowork-as-host-platform.md`
- `./feishu-miaoda-as-host-platform.md`
- `./event-protocol.md`

**按需**：
- `../product-manager/SKILL.md`（需求模糊时）

Checkpoint：至少 11 项全部 ✅ 后才可继续。

## Step A.3：探索平台能力边界

（内部思考）：
1. 我自己能做什么？
2. 当前有哪些 MCP 服务可用？
3. 当前有哪些 skill 已安装？
4. 平台有哪些自动化能力？
5. 本次任务的哪些环节由平台直接承担？

## Step A.4：判断 task_type

### Task Type Decision Tree（Phase 2 新增）

按以下顺序判定，首个匹配即确定：

| # | 条件 | task_type |
|---|------|-----------|
| 1 | 用户明确说 bug / fix / 修复 / broken | `bugfix` |
| 2 | 用户明确说 hotfix / 紧急 / urgent / 生产问题 | `hotfix` |
| 3 | scope ≤ 3 项 AND 不涉及新模块 AND 不涉及新数据模型 | `feature_iteration` |
| 4 | 涉及新模块 OR 新数据模型 OR 新 API OR scope > 5 项 | `new_feature` |
| 5 | 默认（不确定时） | `feature_iteration`（Gate 1 时用户可调整） |

```
TASK_TYPE: {new_feature / feature_iteration / bugfix / hotfix / review_existing / design_only}
```

## Step A.5：写入 task-brief + 更新 task.yaml

⚠️ **Phase A 只产出 task-brief.md**，包含：
- task_type
- platform_capabilities
- 初步约束

**不做**：problem framing、outcome definition、scope decision（这些在 Phase B）。

写入 `artifacts/task-brief.md` + 更新 task.yaml（status=in_progress, current_stage=phase_b）。

## Phase A Exit Checklist

```
⚠️ Phase A Exit Checklist:
- [ ] task-brief.md 写入 artifacts/
- [ ] task.yaml 初始化完成（task_type + platform_capabilities）
- [ ] events.jsonl 有 task_initialized + phase_completed 事件
- [ ] changelog.md 有对应条目
```

### task_type 差异化

| task_type | A 阶段行为 |
|-----------|-----------|
| new_feature | 完整 A.1-A.5 |
| feature_iteration | 完整 A.1-A.5 |
| bugfix | A.2 可只加载必要 skill；A.3 简化 |
| hotfix | 最简——仅 A.1(初始化) + A.4(typing) + A.5(brief) |

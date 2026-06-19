# DevFlow — 多 Agent 开发工作流系统

DevFlow 是运行在 Cowork 宿主平台上的阶段驱动多 Agent 半自动开发工作流系统。它按固定骨架推进：定义 -> 产品分析 -> 设计 -> 执行 + 审查 -> 收尾。Orchestrator 负责调度专业 sub-skill，人类只在 Gate 1/2/3 做关键决策。

v6.1 重点是状态机硬化：bootstrap 强制初始化、Task spawn 必经 handoff、phase 切换原子写入、Gate permit 反压、`verify_state` D1-D7 对账、PostToolUse fallback、增量审计。

## 快速开始

1. 新建空文件夹，用 Cowork 打开。
2. 在 Cowork 发送：

   > 请帮我安装 DevFlow。GitHub 仓库地址：https://github.com/Stackmild/DevFlow.git  
   > 请克隆到当前目录，然后把 skills-source/ 下的所有 skill 安装为全局 skill。

3. 重启 Cowork 或重新启用 skills。
4. 确认 Cowork hook 已注册：
   - `PreToolUse` matcher: `Write|Edit|MultiEdit|Task`
   - `PostToolUse` matcher: `Task`
   - `UserPromptSubmit`
   - hook command 指向 `scripts/devflow-enforcer.mjs`
5. 输入 `@dev-orchestrator {任务描述}` 启动。

没有 hook，DevFlow 仍能运行 skill，但 v6.1 的强制门禁不会完整生效。Cowork 上为 hook 硬拦截（PreToolUse/PostToolUse DENY）；Codex / manual 环境下退化为 operator discipline（需手动跑 gate 命令）+ advisory 协议。宿主差异详见 `skills-source/dev-orchestrator/protocols/host-enforcement-matrix.md`。

## 外部 repo 模式

在其他项目目录中打开 Cowork 并调用 `@dev-orchestrator`。Orchestrator 会识别当前不是 DevFlow 根目录，询问 DevFlow 路径，并创建 `devflow-config.yaml`。任务状态保存在 DevFlow 的 `orchestrator-state/`，代码修改发生在外部项目目录。

新任务会通过 `bootstrap` 写入：

- `task_id`
- `project_path`
- `devflow_root`
- `protocol_version: 2`
- `current_phase: phase_a`
- `started_at`
- `module_slug`

## 工作流

Canonical phase 名称：

| Phase | 说明 | 主要 skill | Human Gate |
|---|---|---|---|
| `phase_a` | 任务定义、repo 识别、bootstrap | orchestrator | - |
| `phase_b` | 产品分析、Roadmap 绑定 | `product-manager` | Gate 1 |
| `phase_c` | 设计阶段 | `web-app-architect`, `backend-data-api`, `webapp-interaction-designer`, `frontend-design` | Gate 2 |
| `phase_d_1` | 执行 | `full-stack-developer` | - |
| `phase_d_2` | 审查 | `code-reviewer` + 条件审查员（UI 改动时追加 `webapp-consistency-audit`、`playwright-e2e-testing`） | - |
| `phase_d_3` | 收尾准备 | orchestrator | Gate 3 |
| `phase_f` | 最终收尾、回填、审计 | `state-auditor` 条件必选（normal closeout 必选；DEFER-TASK/legacy resume/record-only 可跳过，须写 skip decision+reason） | - |

读取端兼容 legacy `phase_d`，写入端只允许 canonical `phase_d_1/2/3`。

## Gate 与回流

| Gate | 触发时机 | 用户选项 | 决策文件 |
|---|---|---|---|
| Gate 1 | Phase B 完成后 | GO / ADJUST / DEFER-TASK / PAUSE | `decisions/gate-1.yaml` |
| Gate 2 | Phase C 完成后 | PROCEED / RESCOPE / PAUSE | `decisions/gate-2.yaml` |
| Gate 3 | Phase D.3 完成后 | ACCEPT / REVISE / PAUSE | `decisions/gate-3.yaml` |

回流规则：

- Gate 1 ADJUST -> 回 `phase_b`
- Gate 2 RESCOPE -> 回 `phase_c`，最多 1 次；第 2 次 PAUSE
- D.2 审查问题 -> 回 `phase_d_1`
- Gate 3 REVISE -> continuation protocol 重进 `phase_d_1`

## State Store

每个任务目录：`orchestrator-state/{task_id}/`

```
task.yaml              # 当前状态快照
events.jsonl           # canonical 事件时序
artifacts/             # 阶段产出
decisions/             # Gate / routing / continuation 决策
handoffs/              # handoff packet，文件名 = {handoff_id}.yaml
issues/                # 审查问题
monitor/               # incremental audit 输出
.permits/              # gate / dispatch / transition 证据
.journal/              # transition crash recovery journal
```

`.permits/` 在 v6.1 不是可选装饰。新任务中，permit 写失败会 BLOCK；Gate 和 closeout 会使用 permit 做 backpressure。

## devflow-gate v6.1

`scripts/devflow-gate.mjs` 是薄控制层。当前 action：

| Action | 用途 |
|---|---|
| `bootstrap` | 初始化任务目录、`task.yaml`、首条事件、bootstrap permit |
| `enter_phase` | 检查是否允许进入 phase |
| `post_gate3_write` | Gate 3 ACCEPT 后写入约束 |
| `complete_task` | closeout 前检查，并写回 `status: completed` / `completed_at` |
| `dispatch_skill` | sub-skill dispatch prerequisite 检查 |
| `present_gate` | Gate 展示前检查，上游 permit backpressure；Gate 3 额外验证 E2E 报告内容、scope ↔ report reconciliation、scope flag 防漏 |
| `transition` | 原子写 `phase_completed` + `phase_entered`，更新 `task.yaml.current_phase` |
| `verify_state` | D1-D7 状态机一致性对账 |
| `finalize_dispatches` | PostToolUse fallback，把 `dispatch_authorized-*` finalize 为 `dispatch_skill-*` |

示例：

```bash
node scripts/devflow-gate.mjs bootstrap \
  --task-id my-task \
  --project-path /path/to/project \
  --devflow-root /path/to/DevFlow \
  --module-slug my-module

node scripts/devflow-gate.mjs transition \
  --task-dir orchestrator-state/my-task \
  --from phase_c \
  --to phase_d_1

node scripts/devflow-gate.mjs verify_state \
  --task-dir orchestrator-state/my-task
```

## Enforcer Hook

`scripts/devflow-enforcer.mjs` 由 Cowork hook 调用。

| Hook / 写入 | 行为 |
|---|---|
| Task tool spawn | 校验 `task_id`、`handoff_id`、skill、handoff packet、input artifacts；新任务失败即 DENY |
| `decisions/gate-{1,2,3}.yaml` | 自动跑 `present_gate` |
| `task.yaml status=completed` | 自动跑 `complete_task` |
| `events.jsonl` 手写 `phase_completed` / `phase_entered` | DENY；phase 事件只能由 `transition` 生成 |
| Gate 3 后写 state/project | 要求 continuation |
| `phase_completed` 成功写入后 | 后台触发 incremental auditor |

Cowork Agent tool 当前不触发 PostToolUse。DevFlow 因此在 gate action 前强制运行 `finalize_dispatches --force` 逻辑，补齐 `skill_dispatched` event 和 finalized `dispatch_skill-*` permit。

## Task Spawn Handoff

专业 sub-skill spawn 必须经过 handoff packet：

- prompt 包含 `task_id`
- prompt 包含 `handoff_id`
- 文件存在：`handoffs/{handoff_id}.yaml`
- packet 内 `skill_name` 匹配 prompt 中解析出的 skill（优先级：@mention > `skill_name:` > `subagent_type:`）
- `input_artifacts` 文件存在，size/hash 校验通过
- 同一 `handoff_id` 已 finalized 后不能复用

完整协议见 `skills-source/dev-orchestrator/protocols/spawn-via-handoff.md`。

PreToolUse 通过后写：

- `.permits/dispatch_authorized-{skill}-{auth_id}.json`
- `events.jsonl` event: `skill_dispatch_authorized`

Fallback finalize 后写：

- `.permits/dispatch_skill-{skill}-{handoff_id}-{sha}.json`
- `events.jsonl` event: `skill_dispatched`

## Verify State

`verify_state` 在每个非 bootstrap gate action 前自动运行。D1-D7：

| Check | 含义 |
|---|---|
| D1 | `phase_a` 但项目产出已有多个 spec，状态漂移 |
| D2 | Gate summary 存在但 gate decision 缺失 |
| D3 | 非 paused 任务长时间无事件 |
| D4 | dispatch authorized 长期未 finalized |
| D5 | 合规自宣称与 handoff/permit 证据矛盾 |
| D6 | finalized dispatch permit 数与 `skill_dispatched` event 不一致 |
| D7 | `task.yaml.current_phase` 与最新 `phase_entered` 不一致 |

Critical issue 会 BLOCK 后续 gate action。

## Incremental Auditor

`scripts/incremental-auditor.mjs` 在 phase 边界轻量运行。触发点：enforcer 观察到 `phase_completed`。输出：

`orchestrator-state/{task_id}/monitor/audit-incremental-{phase}-{seq}.yaml`

特点：

- 非阻塞
- 5 秒超时
- 检查 events parse、snapshot drift、dispatch residue、permit/event 一致性、Gate decision/event 一致性、handoff 数、open blocker、required artifact、closeout 证据、manual bypass

## 开发与验证

常用验证：

```bash
node scripts/lint-naming.mjs
rg --files -g '*.mjs' scripts | xargs -n1 node --check
node scripts/smoke-devflow-hardening.mjs
```

当前基线：`smoke-devflow-hardening.mjs` 59/59 PASS。

## 关键文件

```
scripts/devflow-gate.mjs
scripts/devflow-enforcer.mjs
scripts/incremental-auditor.mjs
scripts/smoke-devflow-hardening.mjs
scripts/lint-naming.mjs
scripts/lib/checks/bootstrap.mjs
scripts/lib/checks/dispatch-skill-task.mjs
scripts/lib/checks/finalize-dispatches.mjs
scripts/lib/checks/verify-state.mjs
scripts/lib/checks/validate-inputs.mjs
scripts/lib/atomic.mjs
scripts/lib/journal.mjs
scripts/lib/phase-aliases.mjs
skills-source/dev-orchestrator/protocols/naming-canonical.md
skills-source/dev-orchestrator/protocols/bootstrap-and-transition.md
RELEASE-NOTES-v6.1.md
```

## Known Limitation

Cowork Agent tool 目前不触发 PostToolUse。DevFlow 已通过 `finalize_dispatches` fallback 补齐状态机证据，但真实任务中仍建议观察：

- `monitor/task-spawn-samples.jsonl`
- `monitor/task-spawn-warnings.jsonl`
- `monitor/audit-incremental-*.yaml`

## 参考

| 文档 | 说明 |
|---|---|
| `RELEASE-NOTES-v6.1.md` | v6.1 hardening 说明 |
| `reference/cowork-as-host-platform.md` | Cowork 能力边界 |
| `reference/feishu-miaoda-as-host-platform.md` | 飞书妙搭 handoff 边界 |
| `reference/devflow-self-evaluation-guide.md` | DevFlow 自评框架 |
| `skills-source/dev-orchestrator/protocols/naming-canonical.md` | canonical 词表 |

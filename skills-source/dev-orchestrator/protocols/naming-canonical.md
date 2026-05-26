# DevFlow Naming Canonical — 机器核证唯一词表

> 所有命名以代码/原文为准，不靠肉眼。更新此文件后必须跑 `scripts/lint-naming.mjs` 全仓校验。

---

## Phase 名称（Canonical）

| canonical | 含义 | 别名（读取端兼容） |
|-----------|------|-------------------|
| `phase_a` | 任务定义 | — |
| `phase_b` | 产品分析 | — |
| `phase_c` | 设计阶段 | — |
| `phase_d_1` | 执行（D.1） | `phase_d` → 读时 normalize 为 `phase_d_1` |
| `phase_d_2` | 审查（D.2） | — |
| `phase_d_3` | 收尾（D.3） | — |
| `phase_f` | 最终收尾 | — |

**写入端只允许 canonical**；读取端透过 `normalizePhase()` 兼容别名。

---

## task.yaml 字段（Canonical）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `current_phase` | string | 当前阶段（**不是** `current_stage`） |
| `project_path` | string | 项目根目录绝对路径（外部 repo 模式必需） |
| `devflow_root` | string | DevFlow 仓库根目录绝对路径 |
| `protocol_version` | number | 协议版本（≥2 为新任务，缺为 legacy） |
| `task_id` | string | 任务标识 |
| `started_at` | string | ISO 8601 时间戳 |
| `module_slug` | string | 模块/功能 slug（verify_state 扫描业务产出的匹配依据） |
| `completed_phases` | string[] | 已完成阶段列表 |
| `status` | string | `initialized` / `in_progress` / `completed` |

---

## Permit 前缀（Canonical）

| 前缀 | 含义 | 文件模式 |
|------|------|----------|
| `dispatch_skill-` | skill dispatch 已完成（finalized） | `dispatch_skill-{skill}-{handoff_id}-{sha}.json` |
| `dispatch_authorized-` | PreToolUse Task hook 通过授权（未 finalized） | `dispatch_authorized-{skill}-{auth_id}.json` |
| `bootstrap-` | 任务初始化 permit | `bootstrap-{task_id}.permit` |
| `transition-` | phase 切换 permit | `transition-{from}-{to}-{ts}.permit` |

---

## event_type（Canonical，闭集）

见 `event-protocol.md §2.1`。本表只列**新增/易错**项：

| # | event_type | 类别 |
|---|-----------|------|
| 7 | `skill_dispatched` | dispatch（PostToolUse 成功 finalize 后写入） |
| 8 | `skill_completed` | dispatch |
| 29 | `skill_dispatch_authorized` | dispatch（PreToolUse 授权时写入；不代表 sub-agent 已成功执行） |
| 30 | `skill_dispatch_failed` | dispatch（PostToolUse Task 失败/取消时写入） |

**严禁变体**（state-auditor CHECK-7 报 A7 anomaly）：
- 驼峰：`skillDispatchAuthorized`
- kebab：`skill-dispatch-authorized`
- 缩写：`dispatch_authorized` / `skill_authorized`
- 漏后缀：`skill_dispatch_authorize`

---

## handoff 文件名

- **文件名**：`{handoff_id}.yaml`（**不是** `handoff-{handoff_id}.yaml`，避免双前缀）
- **handoff_id 格式**：`handoff-{stage}-{skill}-{seq}`（例：`handoff-D1-fsd-001`）

# Spawn via Handoff — Task 子 Agent 调度协议

> 适用范围：orchestrator 通过 Cowork Agent tool 调度 DevFlow 专业 sub-skill 时。

---

## 1. Cowork Agent type ≠ DevFlow skill name

Cowork Agent tool 的 `subagent_type` 是**运行时 agent 类型**（如 `"claude"`），不是 DevFlow skill 名称。

DevFlow skill 名称（如 `full-stack-developer`、`code-reviewer`）必须在 prompt 正文中显式声明。Enforcer 解析 resolved skill name 后，才会触发 handoff 校验和 permit 记录。

| 字段 | 含义 | 示例 |
|------|------|------|
| `subagent_type` | Cowork 运行时 agent 类型 | `"claude"` |
| `@skill-name` | DevFlow 目标 skill（推荐写法） | `@full-stack-developer` |
| `skill_name:` | DevFlow 目标 skill（替代写法） | `skill_name: code-reviewer` |

**错误**：`subagent_type: "full-stack-developer"` → Cowork 会报错 "Agent type not found"。

---

## 2. 正确 Task spawn 约定

prompt 正文必须同时包含：

1. `task_id: {id}` — 对应 `orchestrator-state/{task_id}/` 目录
2. `handoff_id: {id}` — 对应 `handoffs/{handoff_id}.yaml` 文件
3. `@skill-name` 或 `skill_name: skill-name` — DevFlow 目标 skill

**最小正确示例**：

```yaml
# prompt 正文
task_id: my-task-001
handoff_id: handoff-D1-fsd-001
@full-stack-developer

请按 handoff packet 执行实现。
```

```yaml
# handoffs/handoff-D1-fsd-001.yaml
skill_name: full-stack-developer
phase: phase_d_1
input_artifacts:
  - path: /absolute/path/to/implementation-scope.md
    declared_size: 1234
    declared_hash: a1b2c3...
```

---

## 3. Resolved skill name 解析优先级

Enforcer 按以下优先级从 prompt 中解析实际 skill（高到低）：

1. **@mention** — prompt 中的 `@skill-name`（如 `@full-stack-developer`）
2. **`skill_name:`** — prompt 中的 `skill_name: "skill-name"`
3. **handoff packet `skill_name`** — `handoffs/{handoff_id}.yaml` 中的 `skill_name`
4. **`toolInput.subagent_type` fallback** — 仅当值本身是 canonical sub-skill 时才使用

解析结果不在 `SUB_SKILLS` 集合中时，视为**非 DevFlow dispatch**，不触发 handoff 校验（通用 claude agent 放行）。

---

## 4. Handoff packet 文件名规则

- **正确**：`handoffs/{handoff_id}.yaml`
- **错误**：`handoffs/handoff-{handoff_id}.yaml`（双前缀）

`handoff_id` 本身可含 `handoff-` 前缀（如 `handoff-D1-fsd-001`），但文件路径**不再额外加** `handoff-`。

---

## 5. dispatch_authorized vs dispatch_skill permit 语义

| Permit 类型 | 写入时机 | 含义 | 文件名模式 |
|-------------|---------|------|-----------|
| `dispatch_authorized` | **PreToolUse**（Task spawn 前） | 授权通过，允许 spawn | `dispatch_authorized-{skill}-{auth_id}.json` |
| `dispatch_skill` | **PostToolUse** 或 `finalize_dispatches` | spawn 实际完成，证据 finalized | `dispatch_skill-{skill}-{handoff_id}-{sha}.json` |

**关键**：PreToolUse 只写 `dispatch_authorized`，不写 `dispatch_skill`。`dispatch_skill` 必须在 Agent tool 返回后（PostToolUse）或通过 `finalize_dispatches --force` 补齐。

---

## 6. PostToolUse 不触发时的 fallback

Cowork Agent tool **当前不触发 PostToolUse**。因此 `dispatch_authorized` permit 不会自动 finalize 为 `dispatch_skill`。

DevFlow 在后续 gate action 前自动执行 `finalize_dispatches --force`：

```bash
node scripts/devflow-gate.mjs finalize_dispatches --task-dir {state_dir} --force
```

该命令将未 finalized 的 `dispatch_authorized-*` 重命名为 `dispatch_skill-*`，并补写 `skill_dispatched` event。幂等——重复执行不 duplication。

---

## 7. 常见失败例

| 失败现象 | 根因 | 修复 |
|----------|------|------|
| "Agent type 'full-stack-developer' not found" | `subagent_type` 填了 DevFlow skill 名 | 改为 `subagent_type: "claude"`，skill 名放 prompt |
| Enforcer DENY: MISSING_HANDOFF_ID | prompt 缺少 `handoff_id` | 补写 `handoff_id: {id}` |
| Enforcer DENY: INPUT_ARTIFACT_INVALID | `declared_size` / `declared_hash` 与实际文件不匹配 | 重新计算并更新 handoff packet |
| Permit 文件名为 `dispatch_authorized-claude-...` | skill 解析失败，fallback 到 `subagent_type` | 检查 prompt 是否含 `@skill` 或 `skill_name:` |
| verify_state D6 告警 | finalized permit 数与 `skill_dispatched` event 不一致 | 运行 `finalize_dispatches --force` |

---

## 8. 最小正确示例（端到端）

**Step 1 — 构造 handoff packet**：

```bash
mkdir -p orchestrator-state/my-task/handoffs
cat > orchestrator-state/my-task/handoffs/handoff-D1-fsd-001.yaml << 'EOF'
skill_name: full-stack-developer
phase: phase_d_1
input_artifacts:
  - path: /abs/path/to/implementation-scope.md
    declared_size: 1234
    declared_hash: a1b2c3d4...
EOF
```

**Step 2 — 调用 Agent tool（Cowork 模式）**：

```yaml
subagent_type: "claude"
prompt: |
  task_id: my-task
  handoff_id: handoff-D1-fsd-001
  @full-stack-developer

  请读取 handoff packet 并执行实现。
```

**Step 3 — Enforcer 自动行为**：

- PreToolUse：解析 skill = `full-stack-developer` → 校验 handoff / artifact → 写 `dispatch_authorized-full-stack-developer-{auth_id}.json`
- PostToolUse：Cowork 不触发 → 无自动 finalize
- Gate action 前：`finalize_dispatches --force` → 重命名为 `dispatch_skill-full-stack-developer-handoff-D1-fsd-001-{sha}.json` + 补 `skill_dispatched` event

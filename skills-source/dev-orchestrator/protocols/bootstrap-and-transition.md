# Bootstrap & Transition Protocol

> 强制初始化 + Phase 切换原子写协议。

---

## 1. Bootstrap（任务初始化）

**命令**：

```bash
node scripts/devflow-gate.mjs bootstrap \
  --task-id {auto-or-user} \
  --project-path {detected} \
  --devflow-root {auto-from-config} \
  --module-slug {user-provided} \
  --authoritative-spec {optional-path} \
  --expected-artifact-globs {optional-list}
```

**原子步骤**：

1. 校验 task_id 唯一
2. 创建 task_dir + 子目录（artifacts/ decisions/ handoffs/ issues/ .permits/ monitor/ .journal/）
3. 写 task.yaml，必填字段：
   - `task_id`, `project_path`, `devflow_root`
   - `protocol_version: 2`
   - `status: initialized`
   - `current_phase: phase_a`
   - `started_at`（ISO timestamp）
   - `module_slug`
   - `authoritative_spec`（可选）
   - `expected_artifact_globs`（可选）
4. 写 events.jsonl 第一条 `task_initialized`
5. 写 `.permits/bootstrap-{task_id}.permit`
   - **新任务（protocol_version >= 2）permit 写失败 BLOCK**
6. 输出 ALLOW + task_dir

**前置条件**：
- 未调用 bootstrap 直接 spawn sub-agent → enforcer 在 PreToolUse Task hook 阶段 DENY
- 未调用 bootstrap 直接写 task_dir 文件 → enforcer DENY

---

## 2. Transition（Phase 切换原子写）

**命令**：

```bash
node scripts/devflow-gate.mjs transition \
  --task-dir {task_dir} \
  --from {phase} \
  --to {phase}
```

**原子步骤**（journal-based）：

1. 取文件锁 `{task_dir}/.lock`
2. 写 transaction journal `{task_dir}/.journal/transition-{ts}.json`
   - 含 pending events 列表 + before/after task.yaml 状态
3. **events.jsonl 单次 appendFileSync**（不 read+rewrite）
4. **task.yaml tmp+rename**（read-modify-write）
5. 删 journal + 释放锁

**verify_state --repairable**：
- journal 残留 → 检查 events.jsonl 是否已含 pending events：
  - 含全部 → commit task.yaml，删 journal
  - 完全不含 → 删 journal（视为未开始）
  - 部分含 → BLOCK，要求人工介入

**锁规则**：
- `open(O_CREAT | O_EXCL)` 零依赖
- 锁文件写入 JSON：`{ pid, started_at, action }`
- stale 检查：mtime >= 5 分钟 + pid 不存在（`process.kill(pid, 0)` 抛 ESRCH）→ 视为 stale，删除重试
- 粒度：先全局 task lock，观察并发争用后决定是否细分

---

## 3. Phase Alias 规则

| 读取端兼容 | 写入端禁止 |
|------------|-----------|
| `phase_d` → `phase_d_1`（legacy 映射） | 只允许 canonical `phase_d_1` |

使用 `normalizePhase()`（`scripts/lib/phase-aliases.mjs`）做读取端 fallback。

---

## 4. Enforcer 硬化

| 写入动作 | 触发条件 | 行为 |
|----------|---------|------|
| 写 task_dir 文件但 task_dir 不存在 | PreToolUse | DENY，提示 bootstrap |
| 写 task.yaml 中 current_phase 字段 | PreToolUse | DENY，提示用 transition action |
| permit 写失败（protocol_version >= 2）| bootstrap / transition / dispatch | BLOCK |
| hook 脚本崩溃（关键动作）| Task spawn / decisions/gate-N.yaml / task.yaml status=completed | DENY（修复 6C）|
| hook 脚本崩溃（其他写入）| 普通 Edit/Write | ALLOW + warning |

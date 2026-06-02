# DevFlow v6.1 Release Notes — State Machine Hardening

## Summary

This release hardens DevFlow's state machine enforcement, closes bypass channels discovered during AM Hub V7.2 post-mortem, and adds continuous incremental auditing. All changes are additive/retro-compatible; legacy tasks remain grandfathered.

## New Capabilities

### 1. Bootstrap Mandatory Initialization (Fix 2)
- New `bootstrap` gate action initializes tasks with `protocol_version: 2`, `module_slug`, `project_path`, `started_at`
- Creates full task directory structure: `artifacts/`, `decisions/`, `handoffs/`, `issues/`, `.permits/`, `monitor/`, `.journal/`
- New task ID uniqueness validation

### 2. Task Spawn Handoff Enforcement (Fix 3 Stage 3)
- PreToolUse Task hook: validates `task_id`, `handoff_id`, `subagent_type` against canonical skill list
- New tasks (`protocol_version >= 2`) DENY spawn without `task_id` or `handoff_id`
- Duplicate `handoff_id` spawn DENY after finalized permit exists
- Legacy tasks WARN instead of DENY

### 3. PostToolUse Fallback / Immediate Auto-Finalize (Fix 3 fallback)
- `finalize_dispatches` module scans pending `dispatch_authorized-*` permits and finalizes them
- Called with `force: true` before every gate action (`present_gate`, `transition`, `complete_task`, `verify_state`, `dispatch_skill`)
- Writes `skill_dispatched` event + `dispatch_skill-*` permit; cleans up `dispatch_authorized-*`
- Idempotent: re-running does not duplicate permits or events

### 4. Verify State D1–D7 (Fix 5)
- New `verify_state` gate action detects state machine anomalies:
  - **D1**: Spec drift (`phase_a` but >= 3 business specs)
  - **D2**: Gate decision missing but handoff summary exists
  - **D3**: Zombie task (last event > 1h ago, not paused)
  - **D4**: Dispatch authorized but not finalized (> 10 min)
  - **D5**: Compliance claim without permits/handoffs
  - **D6**: Dispatch permit count ≠ skill_dispatched events
  - **D7**: Snapshot drift (`task.yaml.current_phase` ≠ latest `phase_entered` event)
- Automatically run before every non-bootstrap gate action as precheck

### 5. Transition Journal + Lock (Fix 6)
- `transition` uses journal-based atomicity:
  1. Write journal to `.journal/transition-{ts}.json`
  2. Append `phase_entered` event to `events.jsonl`
  3. Update `task.yaml` via tmp + rename
  4. Clean up journal
- File lock (`O_CREAT | O_EXCL`) on `{task_dir}/.lock` with stale detection (5 min threshold + ESRCH check)
- `verify_state --repairable` can recover from crashed transitions

### 6. Gate 2 Permit BLOCK (Fix 7)
- Gate 2 presentation now BLOCKS if design skill dispatch permits are missing
- Respects skip paths: `decisions/phase-skip-C-*.yaml` → ALLOW
- Protocol version aware: new tasks BLOCK, legacy tasks WARN

### 7. Incremental Auditor (Fix 8)
- Runs non-blocking audit after each `phase_completed` event
- 10 checks: events parse, snapshot drift, dispatch residue, permit/event consistency, Gate decision consistency, handoff count, open blockers, required artifacts, completed closeout, manual bypass
- Output: `monitor/audit-incremental-{phase}-{seq}.yaml`
- 5-second timeout; failure does not block phase transition

### 8. Hand-Written Phase Event Block (Fix C)
- Enforcer DENYs direct writes of `phase_completed` / `phase_entered` to `events.jsonl`
- All phase events must go through `devflow-gate.mjs transition`

### 9. Complete Task Snapshot Writeback (Fix B)
- `complete_task` now atomically writes `task.yaml.status: completed` + `completed_at`

## Protocol Hardening

- **Naming canonical**: `scripts/lint-naming.mjs` validates all code references against `protocols/naming-canonical.md`
- **Phase aliases**: `scripts/lib/phase-aliases.mjs` normalizes `phase_d` → `phase_d_1` for legacy tasks
- **Event protocol**: Added `skill_dispatch_authorized` (29) and `skill_dispatch_failed` (30) to closed enum
- **Permit write failure**: New tasks BLOCK on permit write failure; legacy tasks WARN
- **Dispatch skill event**: `dispatch-skill.mjs` now writes `skill_dispatched` event on success
- **Present gate event**: `present-gate.mjs` now writes `gate_decision` event on success

## Skill Slimming

10 个核心普通 skill 完成瘦身（第一轮）。策略：SKILL.md 保留触发入口 + 最小执行流 + 硬规则 + 必读清单；完整 schema / checklist / template / examples / 反模式外置到 `reference/` 或 `templates/`。

| Skill | Before | After | Delta |
|-------|--------|-------|-------|
| backend-data-api | 797 | 141 | -82% |
| pre-release-test-reviewer | 489 | 173 | -65% |
| web-app-architect | 467 | 165 | -65% |
| webapp-interaction-designer | 488 | 180 | -63% |
| state-auditor | 422 | 196 | -54% |
| webapp-consistency-audit | 378 | 173 | -54% |
| code-reviewer | 403 | 200 | -50% |
| frontend-design | 364 | 200 | -45% |
| product-manager | 203 | 126 | -38% |
| full-stack-developer | 491 | 317 | -35% |
| **Total** | **4,502** | **1,871** | **-58%** |

- 新建 18 个外置 reference / template 文件
- 全部 13 个普通 skill ≤ 500 行（dev-orchestrator 单独排期）
- 未瘦身：dev-orchestrator (499)、devflow-self-improve (286)、release-and-change-manager (245)、component-library-maintainer (201)

## DevOrchestrator Protocol Sync

第一轮 skill slimming 结束后发现 dev-orchestrator/SKILL.md 存在 6 项协议漂移。通过非破坏性编辑 + 等量删除修复，SKILL.md 维持 499 行 ≤500：

1. **V6.0 → V6.1 9-action gate**：bootstrap / enter_phase / dispatch_skill / present_gate / transition / post_gate3_write / complete_task / verify_state / finalize_dispatches
2. **Cowork Agent dispatch 约定**：`subagent_type=claude` + prompt 中 `@skill` + finalize_dispatches fallback
3. **verify_state D1-D7**：状态机漂移检测简述写入 State Backbone Protocol
4. **Canonical phase_d_1-3**：write-side 统一为 `phase_d_1` / `phase_d_2` / `phase_d_3`，transition 替代手写 phase_completed/entered
5. **Phase A bootstrap 引用**：首次运行说明加入 bootstrap action 引用
6. **外置协议参考表**：补全 `bootstrap-and-transition.md`

## Known Limitations

- Cowork Agent tool does **not** trigger PostToolUse. `finalize_dispatches --force` fallback 已覆盖全部 gate action 前调用，36/36 smoke tests 验证通过，生产环境运行稳定。
- 外置 reference 文件后 LLM 运行时是否真按 Required References 读取，无持续量化监控数据。
- dev-orchestrator 行数瘦身（499 行）仍待排期，需专门 design review + 回归验证。
- Skill 瘦身 pilot 证据中，frontend-design 的引用显性 grep 验证仅命中 3/8 文件（行为等价但显性不足）。

## Files Changed

### Core State Machine (15 files)
- `.gitignore`
- `scripts/devflow-enforcer.mjs`
- `scripts/devflow-gate.mjs`
- `scripts/lib/canonical-state-reader.mjs`
- `scripts/lib/checks/bootstrap.mjs`
- `scripts/lib/checks/complete-task.mjs`
- `scripts/lib/checks/dispatch-skill.mjs`
- `scripts/lib/checks/dispatch-skill-task.mjs`
- `scripts/lib/checks/enter-phase.mjs`
- `scripts/lib/checks/finalize-dispatches.mjs`
- `scripts/lib/checks/present-gate.mjs`
- `scripts/lib/checks/transition.mjs`
- `scripts/lib/checks/validate-inputs.mjs`
- `scripts/lib/checks/verify-state.mjs`
- `scripts/lib/state-reader.mjs`

### Auditing & Protocol (12 files)
- `scripts/analyze-task-samples.mjs`
- `scripts/incremental-auditor.mjs`
- `scripts/lib/atomic.mjs`
- `scripts/lib/dedup.mjs`
- `scripts/lib/journal.mjs`
- `scripts/lib/phase-aliases.mjs`
- `scripts/lint-naming.mjs`
- `scripts/smoke-devflow-hardening.mjs`
- `skills-source/dev-orchestrator/event-protocol.md`
- `skills-source/dev-orchestrator/phases/phase-a-define.md`
- `skills-source/dev-orchestrator/protocols/bootstrap-and-transition.md`
- `skills-source/dev-orchestrator/protocols/naming-canonical.md`

### Skill Slimming Round 1 (30 files)
- `skills-source/skill-slimming-guide.md`
- `skills-source/state-auditor/SKILL.md` + `reference/audit-checks.md`
- `skills-source/code-reviewer/SKILL.md` + `reference/review-checks.md`
- `skills-source/pre-release-test-reviewer/SKILL.md` + `reference/test-checks.md`
- `skills-source/product-manager/SKILL.md` + `reference/routing-guide.md` + `reference/checklists.md` + `reference/pitfalls-and-examples.md`
- `skills-source/web-app-architect/SKILL.md` + `reference/workflow-steps.md` + `reference/decision-heuristics.md` + `reference/pitfalls-and-smells.md` + `reference/spec-template.md`
- `skills-source/backend-data-api/SKILL.md` + `reference/data-api-checks.md` + `reference/contract-template.md` + `reference/pitfalls-and-examples.md`
- `skills-source/frontend-design/SKILL.md`
- `skills-source/webapp-interaction-designer/SKILL.md` + `reference/interaction-checks.md` + `reference/interaction-spec-template.md` + `reference/pitfalls-and-examples.md`
- `skills-source/webapp-consistency-audit/SKILL.md` + `reference/consistency-checks.md` + `reference/report-template.md` + `reference/pitfalls-and-examples.md`
- `skills-source/full-stack-developer/SKILL.md`
- `reports/skill-slimming-closeout-report.md`

### DevOrchestrator Protocol Sync (3 files)
- `skills-source/dev-orchestrator/SKILL.md`
- `skills-source/dev-orchestrator/protocols/spawn-via-handoff.md`
- `AGENTS.md` (pointer conversion)

### Reports
- `reports/skill-slimming-closeout-report.md`
- `RELEASE-NOTES-v6.1.md` (this file)

### Playwright Coverage Gate (6 files)
- `skills-source/playwright-e2e-testing/references/visual-test-scope.yaml` (NEW)
- `skills-source/playwright-e2e-testing/references/yaml-schema.md` (EXTENDED)
- `skills-source/playwright-e2e-testing/references/dod-validator.ts` (HARDENED)
- `scripts/lib/checks/present-gate.mjs` (EXTENDED: Check 6 + Check 7)
- `scripts/smoke-devflow-hardening.mjs` (Tests 41–46)

## Verification

- `lint-naming.mjs`: PASS
- `node --check` all 28 `.mjs` files: PASS
- `smoke-devflow-hardening.mjs`: 46/46 PASS
- `sync-skills.sh`: 13/13 PASS
- `SKILL.md` line count: 499 (at budget)
- E2E micro task: full DevFlow cycle (bootstrap → A→B→C→D1→D2→D3→F → complete) with `verify_state` PASS

## Playwright E2E Source Restoration & Gate 3 Hardening (2026-05-28)

- Restored `skills-source/playwright-e2e-testing/` from global skills (351 lines, within budget)
- `scripts/sync-skills.sh` now covers 14/14 core skills including `playwright-e2e-testing`
- Gate 3 (`present-gate.mjs`) hardened for `rule_ui` matches:
  - Requires `dispatch_skill-webapp-consistency-audit-*` permit
  - Requires `dispatch_skill-playwright-e2e-testing-*` permit
  - Requires `artifacts/e2e-visual-test-report.yaml`
  - `decisions/reviewer-skip-playwright-e2e-testing.yaml` allows bypass with WARN
  - New tasks (`protocol_version >= 2`) missing permit/report → **BLOCK**
  - Legacy tasks → **WARN**
- Added 4 smoke tests (Test 37–40) covering rule_ui BLOCK/ALLOW/WARN paths
- Smoke baseline updated: 40/40 PASS

## Playwright Coverage Gate Upgrade (v6.1.x)

将 Gate 3 的 `rule_ui` 检查从"permit + report 存在性"升级为"E2E 报告内容验证 + UI 变更覆盖完整性 + scope flag 防漏"。

### 新增输入契约

- `artifacts/visual-test-scope.yaml` — 声明本次变更涉及哪些 UI surface、需要测哪些 viewport/state/interaction
- Schema: `changed_surfaces[].{surface_id, type, file_paths, required_viewports, required_states, interactions_to_test, is_new}`

### E2E 报告 Schema 扩展

`artifacts/e2e-visual-test-report.yaml` 新增 Coverage Gate v1.0 字段：
- `expected_visual_targets` — 应测目标清单
- `coverage_trace` — 每个目标的实际测试覆盖路径 + `result: PASS|FAIL|NOT_COVERED`
- `untested_targets` — 未覆盖目标（空 = 合规）
- `coverage_summary` — `expected_count / covered_count / missing_count / coverage_percent`
- `definition_of_done` 新增 Q13–Q16（coverage trace / untested targets / missing count / expected targets）

### Gate 3 新增检查项

**Check 6 — E2E Report Content Validation**（`rule_ui` 且存在 e2e report 时触发）：
- 报告可读（YAML parseable）
- `reporter: "playwright-e2e-testing"`
- `completion_status: "COMPLETE"`
- `merge_recommendation: "ALLOW"`
- DoD Q* 全部为 `PASS` 或 `N/A`
- `expected_visual_targets` 非空
- `untested_targets` 为空
- `coverage_summary.missing_count === 0`
- 每个 expected target 都有 coverage trace 且 `result !== "NOT_COVERED"`
- `reviewer-skip-playwright-e2e-testing.yaml` 可跳过 Check 6

**Check 7 — Scope Flag Leak Prevention**：
- 读取最新 `change-package-*.yaml` 的 `files_touched` 和 `scope_flags`
- 若 `files_touched` 命中 UI 路径模式（`.tsx?` 组件页、`css/scss`、`.vue`、tailwind、public/assets 图片等）且 `scope_flags.ui === false && interaction === false`：
  - 新任务 → **BLOCK**（`scope_flag_leak`）
  - 遗留任务 → WARN

### DoD Validator 硬化

`skills-source/playwright-e2e-testing/references/dod-validator.ts` 新增 Q13–Q16：
- Q13: `coverage_trace` 无 `NOT_COVERED`
- Q14: `untested_targets` 为空
- Q15: `missing_count === 0`
- Q16: `expected_visual_targets` 非空

### Smoke Tests 扩展

新增 6 个测试（Test 41–46）：
- Test 41: 畸形 YAML report → BLOCK
- Test 42: `completion_status: INCOMPLETE` → BLOCK
- Test 43: `coverage_trace` 含 `NOT_COVERED` → BLOCK
- Test 44: `untested_targets` 非空 → BLOCK
- Test 45: 完整合规报告 → ALLOW
- Test 46: UI 文件但 `scope_flags.ui=false` + `interaction=false` → BLOCK

Smoke baseline: **46/46 PASS**

## Scope Reconciliation (v6.1.x patch)

将 Gate 3 的 `rule_ui` 检查从"E2E 报告自证"升级为"scope ↔ report 交叉验证"。新增 `artifacts/visual-test-scope.yaml` 输入契约，要求 scope 中声明的每个 changed surface 必须在 E2E 报告中有对应覆盖。

### 新增输入契约

- `artifacts/visual-test-scope.yaml` — 声明本次变更涉及哪些 UI surface、需要测哪些 viewport/state/interaction
- Schema: `changed_surfaces[].{surface_id, type, file_paths, required_viewports, required_states, interactions_to_test, is_new}`

### Gate 3 新增检查项（Check 8）

| Step | Check | 失败行为 |
|---|---|---|
| 8a | `visual-test-scope.yaml` 存在性 | BLOCK `rule_ui_visual_scope_missing` |
| 8b | scope YAML 可解析 + `changed_surfaces` 非空 | BLOCK `scope_parseable` / `scope_surfaces_empty` |
| 8c | DoD Q1–Q16 全存在 + 值在 schema 允许集合中 | BLOCK `e2e_dod_incomplete` / `e2e_dod_value_invalid` |
| 8d | scope ↔ report reconciliation (R2/R3/R4) | BLOCK `scope_surface_uncovered` / `scope_target_not_covered` / `scope_is_new_viewport_missing` / `scope_is_new_state_missing` |

**DoD 值约束（schema-allowed）:**
- 必须为 `PASS`: Q1, Q2, Q3, Q5, Q6, Q7, Q8, Q14, Q15, Q16
- 可为 `PASS` 或 `N/A`: Q4, Q9, Q10, Q11, Q12, Q13
- 任何 `FAIL` → BLOCK（已有 FAIL scanner 覆盖）
- 任何缺失或值越界 → BLOCK

**Reconciliation 规则:**
- **R2**: 每个 `changed_surfaces[].surface_id` 必须出现在至少一个 `expected_visual_targets[].surface_id` 中
- **R3**: 每个 `expected_visual_targets[].target_id` 必须在 `coverage_trace` 中有对应项且 `result !== "NOT_COVERED"`
- **R4**: `is_new=true` surfaces 的所有 effective required viewports/states/interactions 必须在 coverage trace 的并集中被覆盖（effective set = surface 级值 ?? root 级默认值）

所有新检查：新任务 (`protocol_version >= 2`) → **BLOCK**；遗留任务 → **WARN**。`reviewer-skip-playwright-e2e-testing.yaml` 跳过 8a–8d，但不跳过 Check 7 (`scope_flag_leak`，独立运行)。

### Smoke Tests 扩展

新增 5 个测试（Test 47–50）：
- Test 47: 无 `visual-test-scope.yaml` → BLOCK `rule_ui_visual_scope_missing`
- Test 48: scope 有 2 surfaces、report 只覆盖 1 → BLOCK `scope_surface_uncovered`
- Test 49a: `is_new=true` + required viewport 未覆盖 → BLOCK `scope_is_new_viewport_missing`
- Test 49b: `is_new=true` + required state 未覆盖 → BLOCK `scope_is_new_state_missing`
- Test 50: `is_new=true` + 全部覆盖 + DoD Q1–Q16 完整 → ALLOW

Smoke baseline: **51/51 PASS**

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

## Known Limitations

- Cowork Agent tool does **not** trigger PostToolUse. Current system relies on `finalize_dispatches --force` fallback before every gate action. This works correctly in practice (verified by E2E), but is a platform-level limitation.
- Real PreToolUse Task hook interception requires Cowork to actually fire the hook on Agent tool spawns. The logic is fully implemented and tested via synthetic smoke tests; production validation requires observing a real task.

## Files Changed

### Modified (13 files)
- `.gitignore`
- `scripts/devflow-enforcer.mjs`
- `scripts/devflow-gate.mjs`
- `scripts/lib/canonical-state-reader.mjs`
- `scripts/lib/checks/complete-task.mjs`
- `scripts/lib/checks/dispatch-skill.mjs`
- `scripts/lib/checks/enter-phase.mjs`
- `scripts/lib/checks/present-gate.mjs`
- `scripts/lib/checks/transition.mjs`
- `scripts/lib/state-reader.mjs`
- `skills-source/dev-orchestrator/event-protocol.md`
- `skills-source/dev-orchestrator/phases/phase-a-define.md`
- `skills-source/state-auditor/SKILL.md`

### New (15 files)
- `scripts/analyze-task-samples.mjs`
- `scripts/incremental-auditor.mjs`
- `scripts/lib/atomic.mjs`
- `scripts/lib/checks/bootstrap.mjs`
- `scripts/lib/checks/dispatch-skill-task.mjs`
- `scripts/lib/checks/finalize-dispatches.mjs`
- `scripts/lib/checks/validate-inputs.mjs`
- `scripts/lib/checks/verify-state.mjs`
- `scripts/lib/dedup.mjs`
- `scripts/lib/journal.mjs`
- `scripts/lib/phase-aliases.mjs`
- `scripts/lint-naming.mjs`
- `scripts/smoke-devflow-hardening.mjs`
- `skills-source/dev-orchestrator/protocols/bootstrap-and-transition.md`
- `skills-source/dev-orchestrator/protocols/naming-canonical.md`

### Not Staged (excluded from commit)
- `.claude/settings.json` — runtime environment configuration
- `AGENTS.md` — pending user confirmation on origin/purpose
- `.smoke-tmp/` — pure runtime temporary directory
- `smoke-tests/` — smoke test target repo (runtime-created during E2E)

## Verification

- `lint-naming.mjs`: PASS
- `node --check` all 28 `.mjs` files: PASS
- `smoke-devflow-hardening.mjs`: 32/32 PASS
- `SKILL.md` line count: 500 (at budget)
- E2E micro task: full DevFlow cycle (bootstrap → A→B→C→D1→D2→D3→F → complete) with `verify_state` PASS

#!/usr/bin/env node
// devflow-gate.mjs — DevFlow v2 薄控制层（半硬闸门）
// 6 actions: enter_phase / post_gate3_write / complete_task / dispatch_skill / present_gate / transition
// Zero npm dependencies. ~320 lines total across all modules.

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readEvents } from './lib/state-reader.mjs';
import { check as checkEnterPhase } from './lib/checks/enter-phase.mjs';
import { check as checkPostGate3 } from './lib/checks/post-gate3.mjs';
import { check as checkCompleteTask } from './lib/checks/complete-task.mjs';
import { check as checkDispatchSkill } from './lib/checks/dispatch-skill.mjs';
import { check as checkPresentGate } from './lib/checks/present-gate.mjs';
import { check as checkTransition } from './lib/checks/transition.mjs';
import { check as checkBootstrap } from './lib/checks/bootstrap.mjs';
import { check as checkVerifyState } from './lib/checks/verify-state.mjs';
import { finalizeDispatches } from './lib/checks/finalize-dispatches.mjs';

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const DEVFLOW_ROOT = resolve(SCRIPT_DIR, '..');
const STATE_DIR = join(DEVFLOW_ROOT, 'orchestrator-state');

// --- Argument parsing ---
const args = process.argv.slice(2);
const action = args[0];

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

function usage() {
  console.error(`Usage:
  node devflow-gate.mjs bootstrap --task-id <id> --project-path <path> --devflow-root <path> --host-platform <cowork|codex> [--module-slug <slug>] [--authoritative-spec <path>] [--expected-artifact-globs <globs>]
  node devflow-gate.mjs enter_phase --task-dir <path> --phase <phase>
  node devflow-gate.mjs post_gate3_write --task-dir <path> --target-path <path>
  node devflow-gate.mjs complete_task --task-dir <path>
  node devflow-gate.mjs dispatch_skill --task-dir <path> --skill <skill> --phase <phase> [--host-platform <cowork|codex>] [--dispatch-backend <cowork_skill|codex_multi_agent|manual>] [--dispatch-mode <true_subagent|role_emulation|user_explicit_skill_invocation>] [--degraded-independence <true|false>]
  node devflow-gate.mjs present_gate --task-dir <path> --gate <1|2|3>
  node devflow-gate.mjs transition --task-dir <path> --from <phase> --to <phase>
  node devflow-gate.mjs verify_state --task-dir <path>
  node devflow-gate.mjs finalize_dispatches --task-dir <path> [--timeout-ms <ms>] [--force]

Actions:
  bootstrap          Initialize a new DevFlow task (Fix 2)
  enter_phase        Check if ORC can enter a new phase
  post_gate3_write   Check if a write is allowed after Gate 3 ACCEPT
  complete_task      Check if ORC can mark task as completed
  dispatch_skill     Check if ORC can dispatch a sub-agent skill (V6.0)
  present_gate       Check if ORC can present a Human Gate (V6.0)
  transition         Atomically transition between phases (write events + update task.yaml)
  verify_state       Detect state machine anomalies (Fix 5)
  finalize_dispatches  Finalize pending dispatch_authorized permits (PostToolUse fallback)

Exit codes:
  0 = allowed
  1 = rejected (violations found)
  2 = script error`);
  process.exit(2);
}

if (!action || !['bootstrap', 'enter_phase', 'post_gate3_write', 'complete_task', 'dispatch_skill', 'present_gate', 'transition', 'verify_state', 'finalize_dispatches'].includes(action)) {
  usage();
}

// bootstrap does not require --task-dir; all others do
let resolvedTaskDir;
if (action !== 'bootstrap') {
  const taskDir = getArg('task-dir');
  if (!taskDir) {
    console.error('Error: --task-dir is required');
    process.exit(2);
  }

  resolvedTaskDir = resolve(taskDir);
  if (!existsSync(resolvedTaskDir)) {
    console.error(`Error: task directory not found: ${resolvedTaskDir}`);
    process.exit(2);
  }
}

// --- Execute check ---
let result;

try {
  const eventsData = resolvedTaskDir ? readEvents(resolvedTaskDir) : { events: [], warnings: [], corruptLineCount: 0 };

  // Fix 5: verify_state pre-audit for all non-bootstrap gate actions
  if (action !== 'bootstrap' && action !== 'verify_state' && resolvedTaskDir) {
    const audit = checkVerifyState(resolvedTaskDir, eventsData);
    if (!audit.allowed) {
      result = {
        allowed: false,
        action,
        params: { precheck: 'verify_state' },
        reason: `verify_state failed: ${audit.reason || 'state consistency check failed'}`,
        violations: audit.violations || [],
        warnings: [...eventsData.warnings, ...(audit.warnings || [])],
      };
    } else if (audit.issues && audit.issues.length > 0) {
      eventsData.warnings.push(...audit.issues.map(i => `[verify_state] ${i}`));
    }
  }

  if (!result) switch (action) {
    case 'bootstrap': {
      const taskId = getArg('task-id');
      const projectPath = getArg('project-path') || process.cwd();
      const devflowRoot = getArg('devflow-root') || DEVFLOW_ROOT;
      const hostPlatform = getArg('host-platform');
      const moduleSlug = getArg('module-slug');
      const authoritativeSpec = getArg('authoritative-spec');
      const expectedArtifactGlobs = getArg('expected-artifact-globs');
      const targetTaskDir = join(STATE_DIR, taskId);
      result = checkBootstrap(targetTaskDir, {
        taskId,
        projectPath,
        devflowRoot,
        hostPlatform,
        moduleSlug,
        authoritativeSpec,
        expectedArtifactGlobs,
      });
      break;
    }
    case 'enter_phase': {
      const phase = getArg('phase');
      if (!phase) { console.error('Error: --phase is required for enter_phase'); process.exit(2); }
      result = checkEnterPhase(resolvedTaskDir, phase, eventsData);
      break;
    }
    case 'post_gate3_write': {
      const targetPath = getArg('target-path');
      if (!targetPath) { console.error('Error: --target-path is required for post_gate3_write'); process.exit(2); }
      result = checkPostGate3(resolvedTaskDir, targetPath, eventsData);
      break;
    }
    case 'complete_task': {
      result = checkCompleteTask(resolvedTaskDir, eventsData);
      break;
    }
    case 'dispatch_skill': {
      const skill = getArg('skill');
      const phase = getArg('phase');
      if (!skill) { console.error('Error: --skill is required for dispatch_skill'); process.exit(2); }
      if (!phase) { console.error('Error: --phase is required for dispatch_skill'); process.exit(2); }
      const runtime = {
        host_platform: getArg('host-platform'),
        dispatch_backend: getArg('dispatch-backend'),
        dispatch_mode: getArg('dispatch-mode'),
        degraded_independence: getArg('degraded-independence'),
      };
      result = checkDispatchSkill(resolvedTaskDir, skill, phase, eventsData, runtime);
      break;
    }
    case 'present_gate': {
      const gate = getArg('gate');
      if (!gate) { console.error('Error: --gate is required for present_gate'); process.exit(2); }
      result = checkPresentGate(resolvedTaskDir, gate, eventsData);
      break;
    }
    case 'transition': {
      const from = getArg('from');
      const to = getArg('to');
      if (!from) { console.error('Error: --from is required for transition'); process.exit(2); }
      if (!to) { console.error('Error: --to is required for transition'); process.exit(2); }
      result = checkTransition(resolvedTaskDir, from, to, eventsData);
      break;
    }
    case 'verify_state': {
      result = checkVerifyState(resolvedTaskDir, eventsData);
      break;
    }
    case 'finalize_dispatches': {
      const timeoutMsStr = getArg('timeout-ms');
      const timeoutMs = timeoutMsStr ? Number(timeoutMsStr) : undefined;
      const force = args.includes('--force');
      const fdResult = finalizeDispatches(resolvedTaskDir, { timeoutMs, force });
      result = {
        allowed: fdResult.errors.length === 0,
        action: 'finalize_dispatches',
        params: { timeoutMs, force },
        finalized: fdResult.finalized,
        skipped: fdResult.skipped,
        already: fdResult.already,
        errors: fdResult.errors,
      };
      break;
    }
  }
} catch (err) {
  console.error(`Script error: ${err.message}`);
  process.exit(2);
}

// --- Auto-finalize pending dispatches (PostToolUse fallback) ---
// Cowork does NOT send PostToolUse for Agent tool spawns.
// After key gate actions, scan for stale dispatch_authorized-* permits
// and finalize them so verify_state / present_gate sees consistent state.
// Immediate auto-finalize (force mode): Cowork does NOT send PostToolUse for
// Agent tool spawns, so pending dispatch_authorized-* permits would never
// finalize on their own.  We force-finalize before every gate action so
// that present_gate / transition / complete_task see consistent permits.
const AUTO_FINALIZE_ACTIONS = new Set([
  'present_gate', 'transition', 'verify_state', 'complete_task', 'dispatch_skill',
]);
if (AUTO_FINALIZE_ACTIONS.has(action) && resolvedTaskDir) {
  try {
    const fdResult = finalizeDispatches(resolvedTaskDir, { force: true });
    if (fdResult.finalized > 0 || fdResult.errors.length > 0) {
      result._finalize_dispatches = fdResult;
    }
  } catch {
    // Non-blocking: don't fail the gate action because of finalize cleanup
  }
}

// --- Write permit file ---
// Naming convention (V6.0): {action}-{discriminator}-{ts}.json
// where discriminator encodes the key parameter to make permits identifiable by glob:
//   enter_phase:      enter_phase-{phase}-{ts}.json       (e.g. enter_phase-phase_d_1-...)
//   dispatch_skill:   dispatch_skill-{skill}-{ts}.json    (e.g. dispatch_skill-code-reviewer-...)
//   present_gate:     present_gate-gate-{N}-{ts}.json     (e.g. present_gate-gate-3-...)
//   post_gate3_write: post_gate3_write-{ts}.json          (no discriminator — path not useful for glob)
//   complete_task:    complete_task-{ts}.json             (no discriminator — singleton per task)
// Note: enter_phase naming changed in V6.0 (was enter_phase-{ts}.json in V5.0).
//
// Fix 6B: permit write failure is BLOCK for new tasks (protocol_version >= 2), WARN for legacy.
if (result.allowed && resolvedTaskDir) {
  try {
    const permitsDir = join(resolvedTaskDir, '.permits');
    if (!existsSync(permitsDir)) mkdirSync(permitsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const permit = { ...result, checked_at: new Date().toISOString() };
    const params = result.params || {};
    const discriminator = params.from_phase
      ? `-${params.from_phase}-${params.to_phase}`
      : params.skill
        ? `-${params.skill}`
        : params.gate
          ? `-gate-${params.gate}`
          : params.phase
            ? `-${params.phase}`
            : params.task_id
              ? `-${params.task_id}`
              : '';
    const permitName = `${action}${discriminator}-${ts}.json`;
    writeFileSync(join(permitsDir, permitName), JSON.stringify(permit, null, 2));
  } catch (writeErr) {
    // Determine if this is a new task (protocol_version >= 2)
    const taskYaml = (() => {
      try {
        const content = readFileSync(join(resolvedTaskDir, 'task.yaml'), 'utf8');
        const m = content.match(/^protocol_version:\s*["']?([^"'\s]+)/m);
        return m ? m[1] : '0';
      } catch { return '0'; }
    })();
    const isNewTask = Number(taskYaml) >= 2;

    if (isNewTask) {
      result.allowed = false;
      result.violations = result.violations || [];
      result.violations.push({
        check: 'permit_write',
        severity: 'BLOCK',
        detail: `Permit write failed: ${writeErr.message}. New tasks (protocol_version >= 2) require permit evidence.`,
      });
      result.reason = (result.reason ? result.reason + '; ' : '') + `Permit write failed: ${writeErr.message}`;
    } else {
      result.warnings = result.warnings || [];
      result.warnings.push(`Failed to write permit file (grandfathered for legacy tasks): ${writeErr.message}`);
    }
  }
}

// --- Output ---
console.log(JSON.stringify(result, null, 2));
process.exit(result.allowed ? 0 : 1);

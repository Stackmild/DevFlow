#!/usr/bin/env node
// devflow-gate.mjs — DevFlow v2 薄控制层（半硬闸门）
// 5 actions: enter_phase / post_gate3_write / complete_task / dispatch_skill / present_gate
// Zero npm dependencies. ~320 lines total across all modules.

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { readEvents } from './lib/state-reader.mjs';
import { check as checkEnterPhase } from './lib/checks/enter-phase.mjs';
import { check as checkPostGate3 } from './lib/checks/post-gate3.mjs';
import { check as checkCompleteTask } from './lib/checks/complete-task.mjs';
import { check as checkDispatchSkill } from './lib/checks/dispatch-skill.mjs';
import { check as checkPresentGate } from './lib/checks/present-gate.mjs';

// --- Argument parsing ---
const args = process.argv.slice(2);
const action = args[0];

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

function usage() {
  console.error(`Usage:
  node devflow-gate.mjs enter_phase --task-dir <path> --phase <phase>
  node devflow-gate.mjs post_gate3_write --task-dir <path> --target-path <path>
  node devflow-gate.mjs complete_task --task-dir <path>
  node devflow-gate.mjs dispatch_skill --task-dir <path> --skill <skill> --phase <phase>
  node devflow-gate.mjs present_gate --task-dir <path> --gate <1|2|3>

Actions:
  enter_phase        Check if ORC can enter a new phase
  post_gate3_write   Check if a write is allowed after Gate 3 ACCEPT
  complete_task      Check if ORC can mark task as completed
  dispatch_skill     Check if ORC can dispatch a sub-agent skill (V6.0)
  present_gate       Check if ORC can present a Human Gate (V6.0)

Exit codes:
  0 = allowed
  1 = rejected (violations found)
  2 = script error`);
  process.exit(2);
}

if (!action || !['enter_phase', 'post_gate3_write', 'complete_task', 'dispatch_skill', 'present_gate'].includes(action)) {
  usage();
}

const taskDir = getArg('task-dir');
if (!taskDir) {
  console.error('Error: --task-dir is required');
  process.exit(2);
}

const resolvedTaskDir = resolve(taskDir);
if (!existsSync(resolvedTaskDir)) {
  console.error(`Error: task directory not found: ${resolvedTaskDir}`);
  process.exit(2);
}

// --- Execute check ---
let result;

try {
  const eventsData = readEvents(resolvedTaskDir);

  switch (action) {
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
      result = checkDispatchSkill(resolvedTaskDir, skill, phase, eventsData);
      break;
    }
    case 'present_gate': {
      const gate = getArg('gate');
      if (!gate) { console.error('Error: --gate is required for present_gate'); process.exit(2); }
      result = checkPresentGate(resolvedTaskDir, gate, eventsData);
      break;
    }
  }
} catch (err) {
  console.error(`Script error: ${err.message}`);
  process.exit(2);
}

// --- Write permit file ---
// Naming convention (V6.0): {action}-{discriminator}-{ts}.json
// where discriminator encodes the key parameter to make permits identifiable by glob:
//   enter_phase:      enter_phase-{phase}-{ts}.json       (e.g. enter_phase-phase_d-...)
//   dispatch_skill:   dispatch_skill-{skill}-{ts}.json    (e.g. dispatch_skill-code-reviewer-...)
//   present_gate:     present_gate-gate-{N}-{ts}.json     (e.g. present_gate-gate-3-...)
//   post_gate3_write: post_gate3_write-{ts}.json          (no discriminator — path not useful for glob)
//   complete_task:    complete_task-{ts}.json             (no discriminator — singleton per task)
// Note: enter_phase naming changed in V6.0 (was enter_phase-{ts}.json in V5.0).
if (result.allowed) {
  try {
    const permitsDir = join(resolvedTaskDir, '.permits');
    if (!existsSync(permitsDir)) mkdirSync(permitsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const permit = { ...result, checked_at: new Date().toISOString() };
    const params = result.params || {};
    const discriminator = params.skill
      ? `-${params.skill}`
      : params.gate
        ? `-gate-${params.gate}`
        : params.phase
          ? `-${params.phase}`
          : '';
    const permitName = `${action}${discriminator}-${ts}.json`;
    writeFileSync(join(permitsDir, permitName), JSON.stringify(permit, null, 2));
  } catch {
    // Permit write failure is non-blocking
    result.warnings = result.warnings || [];
    result.warnings.push('Failed to write permit file (non-blocking)');
  }
}

// --- Output ---
console.log(JSON.stringify(result, null, 2));
process.exit(result.allowed ? 0 : 1);

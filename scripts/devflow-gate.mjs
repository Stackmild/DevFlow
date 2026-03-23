#!/usr/bin/env node
// devflow-gate.mjs — DevFlow v1 薄控制层（半硬闸门）
// 3 actions: enter_phase / post_gate3_write / complete_task
// Zero npm dependencies. ~280 lines total across all modules.

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { readEvents } from './lib/state-reader.mjs';
import { check as checkEnterPhase } from './lib/checks/enter-phase.mjs';
import { check as checkPostGate3 } from './lib/checks/post-gate3.mjs';
import { check as checkCompleteTask } from './lib/checks/complete-task.mjs';

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

Actions:
  enter_phase        Check if ORC can enter a new phase
  post_gate3_write   Check if a write is allowed after Gate 3 ACCEPT
  complete_task      Check if ORC can mark task as completed

Exit codes:
  0 = allowed
  1 = rejected (violations found)
  2 = script error`);
  process.exit(2);
}

if (!action || !['enter_phase', 'post_gate3_write', 'complete_task'].includes(action)) {
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
  }
} catch (err) {
  console.error(`Script error: ${err.message}`);
  process.exit(2);
}

// --- Write permit file (optional, v1 降级版) ---
if (result.allowed) {
  try {
    const permitsDir = join(resolvedTaskDir, '.permits');
    if (!existsSync(permitsDir)) mkdirSync(permitsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const permit = { ...result, checked_at: new Date().toISOString() };
    writeFileSync(join(permitsDir, `${action}-${ts}.json`), JSON.stringify(permit, null, 2));
  } catch {
    // Permit write failure is non-blocking
    result.warnings = result.warnings || [];
    result.warnings.push('Failed to write permit file (non-blocking)');
  }
}

// --- Output ---
console.log(JSON.stringify(result, null, 2));
process.exit(result.allowed ? 0 : 1);

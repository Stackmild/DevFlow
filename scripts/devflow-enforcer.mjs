#!/usr/bin/env node
// devflow-enforcer.mjs — Hook-based DevFlow enforcement router (V2)
//
// Called by Cowork hooks (PreToolUse / UserPromptSubmit).
// Routes file-write events to devflow-gate.mjs actions:
//   present_gate / complete_task / dispatch_skill / enter_phase / post_gate3_write
//
// Zero npm dependencies. Reads stdin JSON from hook system.
// Exit 0 always — hook errors are non-fatal by Cowork design.
// Blocking is done via hookSpecificOutput.permissionDecision = "deny".

import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  parseSimpleYaml,
  hasGate3Accept,
  hasContinuationDecision,
  resolveTaskFromPath,
  resolveTaskGlobalScan,
} from './lib/state-reader.mjs';

// ── Constants ─────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const DEVFLOW_ROOT = resolve(SCRIPT_DIR, '..');
const GATE_SCRIPT = join(SCRIPT_DIR, 'devflow-gate.mjs');
const STATE_DIR = join(DEVFLOW_ROOT, 'orchestrator-state');

// ── Stdin + args ──────────────────────────────────────────────────────────────

function readStdin() {
  try {
    // In ESM, require() is not available. Use readFileSync('/dev/stdin') on Unix.
    // Falls back to empty on Windows or if stdin is not piped.
    return readFileSync('/dev/stdin', 'utf8');
  } catch {
    return '{}';
  }
}

function getEventArg() {
  const idx = process.argv.indexOf('--event');
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

// ── Output ────────────────────────────────────────────────────────────────────

function output(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
  process.exit(0);
}

function deny(message) {
  output({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
    },
    systemMessage: message,
  });
}

function info(message) {
  output({ systemMessage: message });
}

function allow() {
  output({});
}

// ── Tool input normalization ──────────────────────────────────────────────────

function normalizeToolInput(raw) {
  return {
    filePath:  raw.file_path  || raw.filepath  || raw.path || '',
    content:   raw.content    || '',
    oldString: raw.old_string || raw.oldstring || '',
    newString: raw.new_string || raw.newstring || '',
  };
}

// ── Gate check invocation ─────────────────────────────────────────────────────

/**
 * Call devflow-gate.mjs with given action and return hook-compatible output.
 * Gate exit codes: 0 = allowed, 1 = rejected, 2 = script error.
 */
function runGateCheck(action, taskDir, extraArgs) {
  const args = [GATE_SCRIPT, action, '--task-dir', taskDir, ...extraArgs];
  try {
    const raw = execFileSync('node', args, { encoding: 'utf8', timeout: 4000 });
    const result = JSON.parse(raw);
    if (result.allowed) {
      if (result.warnings && result.warnings.length > 0) {
        return { systemMessage: `DevFlow Gate (${action}): ${result.warnings.join('; ')}` };
      }
      return {};
    }
    // Gate returned allowed=false — should not happen on exit 0, but handle gracefully
    return {
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' },
      systemMessage: `DENY (${action}): ${result.reason || 'gate check failed'}`,
    };
  } catch (err) {
    // exit code 1 = rejected (normal deny path)
    if (err.status === 1 && err.stdout) {
      try {
        const result = JSON.parse(err.stdout);
        return {
          hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' },
          systemMessage: `DENY (${action}): ${result.reason || 'gate check rejected'}`,
        };
      } catch { /* fall through to degraded */ }
    }
    // exit code 2 or crash → non-fatal allow + warning
    return {
      systemMessage: `DevFlow Enforcer: ${action} check error (${err.message || 'unknown'}). Proceeding with caution.`,
    };
  }
}

// ── Extract appended lines from events.jsonl content ──────────────────────────

/**
 * For events.jsonl writes, extract the newly appended lines.
 * - Edit tool: newString contains only the appended content.
 * - Write tool: content is the full file; take last N non-empty lines.
 */
function extractAppendedLines(toolInput, maxLines = 5) {
  if (toolInput.newString) return toolInput.newString;
  if (!toolInput.content) return '';
  const lines = toolInput.content.split('\n').filter(l => l.trim());
  return lines.slice(-maxLines).join('\n');
}

// ── PreToolUse handler ────────────────────────────────────────────────────────

function handlePreWrite(rawToolInput) {
  const toolInput = normalizeToolInput(rawToolInput);
  const { filePath } = toolInput;
  if (!filePath) return allow();

  // Resolve task from file path (P1 → P2 → P3, no P4)
  const task = resolveTaskFromPath(filePath, STATE_DIR);
  if (!task) return allow(); // Not a DevFlow-related write

  // ── 1B. project_path writes — hard deny after Gate 3 without continuation ──
  if (!filePath.includes('orchestrator-state/')) {
    if (hasGate3Accept(task.dir) && !hasContinuationDecision(task.dir)) {
      return deny(
        `DENY (continuation_required): 任务 ${task.id} 已通过 Gate 3 ACCEPT，` +
        `但尚未建立 continuation decision。\n` +
        `修改项目代码前，必须先执行 continuation protocol：\n` +
        `1. Pre-Action Check → 2. 分类五条路径 → 3. 写入 decisions/continuation-{seq}.yaml`
      );
    }
    // Phase 1 known boundary: only checks continuation *existence*, not type/path compatibility.
    // e.g. a NON-CODE continuation does not authorize source code writes, but this enforcer
    // does not read continuation type and will allow the write.
    // Phase 2 TODO: read latestContinuation(task.dir).type and block incompatible writes
    // (NON-CODE / RECORD-STOP types should not allow project_path source writes).
    return allow(); // Normal development or continuation exists
  }

  // ── 1A. orchestrator-state/ writes ──

  // Extract relative path within task dir
  const relPath = filePath.replace(/.*orchestrator-state\/[^/]+\//, '');

  // Gate decision file → present_gate
  const gateMatch = relPath.match(/^decisions\/gate-([123])\.yaml$/);
  if (gateMatch) {
    return output(runGateCheck('present_gate', task.dir, ['--gate', gateMatch[1]]));
  }

  // task.yaml with status=completed → complete_task
  if (relPath === 'task.yaml') {
    const incoming = toolInput.content || toolInput.newString;
    if (incoming) {
      const parsed = parseSimpleYaml(incoming);
      if (parsed.status === 'completed') {
        return output(runGateCheck('complete_task', task.dir, []));
      }
    }
    return allow(); // task.yaml write without status=completed
  }

  // handoff file → dispatch_skill (parse skill_name + phase from content)
  if (relPath.startsWith('handoffs/handoff-')) {
    const incoming = toolInput.content || toolInput.newString;
    if (incoming) {
      const parsed = parseSimpleYaml(incoming);
      const skill = parsed.skill_name;
      const phase = parsed.phase || parsed.stage || 'unknown';
      if (skill) {
        return output(runGateCheck('dispatch_skill', task.dir, ['--skill', skill, '--phase', phase]));
      }
    }
    // Cannot parse handoff content → allow with warning
    return info('DevFlow Enforcer: handoff file written but skill_name not parseable. Skipping dispatch_skill check.');
  }

  // events.jsonl with phase_entered → enter_phase
  if (relPath === 'events.jsonl') {
    const appended = extractAppendedLines(toolInput);
    for (const line of appended.split('\n')) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line);
        if (evt.event_type === 'phase_entered' && evt.payload && evt.payload.phase) {
          return output(runGateCheck('enter_phase', task.dir, ['--phase', evt.payload.phase]));
        }
      } catch {
        // Check if line contains phase_entered text but failed JSON parse
        if (line.includes('phase_entered')) {
          return deny(
            'DENY (enter_phase): events.jsonl 中检测到 phase_entered 事件但 JSON 解析失败。' +
            '请确保 phase_entered 事件为合法 JSON 且包含 payload.phase 字段。'
          );
        }
      }
    }
    // events.jsonl write without phase_entered — check post_gate3_write if applicable
    if (hasGate3Accept(task.dir)) {
      return output(runGateCheck('post_gate3_write', task.dir, ['--target-path', filePath]));
    }
    return allow();
  }

  // All other orchestrator-state/ files — post_gate3_write if Gate 3 is accepted
  if (hasGate3Accept(task.dir)) {
    return output(runGateCheck('post_gate3_write', task.dir, ['--target-path', filePath]));
  }

  return allow();
}

// ── UserPromptSubmit handler ──────────────────────────────────────────────────

function handleUserPrompt() {
  // P4: global scan for in_progress tasks
  const task = resolveTaskGlobalScan(STATE_DIR);
  if (!task) return allow();
  if (!hasGate3Accept(task.dir)) return allow();
  if (hasContinuationDecision(task.dir)) return allow();

  return info(
    `⚠️ DevFlow Enforcer: 任务 ${task.id} 已通过 Gate 3 ACCEPT。\n` +
    `根据 continuation protocol，后续操作必须先执行 Pre-Action Check：\n` +
    `1. 判断用户请求是否需要实质性工作\n` +
    `2. 分类为五条路径（RE-ENTER / FOLLOW-UP / LIGHT-PATCH / NON-CODE / RECORD-STOP）\n` +
    `3. 写入 decisions/continuation-{seq}.yaml\n` +
    `在完成上述步骤前，不得修改源代码或创建新 artifact。`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

try {
  const event = getEventArg();
  const stdinRaw = readStdin();
  let input;
  try {
    input = JSON.parse(stdinRaw);
  } catch {
    input = {};
  }

  if (event === 'pre-write') {
    handlePreWrite(input.tool_input || input.toolinput || {});
  } else if (event === 'user-prompt') {
    handleUserPrompt();
  } else {
    allow();
  }
} catch (err) {
  // Top-level safety net — never crash, never block on error
  try {
    output({ systemMessage: `DevFlow Enforcer: unexpected error (${err.message}). Proceeding.` });
  } catch {
    process.exit(0);
  }
}

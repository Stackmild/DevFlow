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

import { execFileSync, spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync, appendFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  parseSimpleYaml,
  hasGate3Accept,
  hasContinuationDecision,
  resolveTaskFromPath,
  resolveTaskGlobalScan,
  checkStateConsistency,
} from './lib/state-reader.mjs';
import { fingerprint, tryLock, cleanStaleLocks } from './lib/dedup.mjs';
import {
  parseTaskSpawn,
  resolveTaskDir,
  resolveLegacyTaskDir,
  validateTaskSpawn,
  stage3Check,
  writeDispatchAuthorized,
  finalizeDispatch,
  failDispatch,
  SUB_SKILLS,
  appendWarnings,
  appendPostTask,
} from './lib/checks/dispatch-skill-task.mjs';

// ── Constants ─────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const DEVFLOW_ROOT = resolve(SCRIPT_DIR, '..');
const GATE_SCRIPT = join(SCRIPT_DIR, 'devflow-gate.mjs');
const STATE_DIR = join(DEVFLOW_ROOT, 'orchestrator-state');

function collectStateDirs() {
  const envOverride = process.env.DEVFLOW_STATE_OVERRIDE;
  if (envOverride) {
    const overrideDir = resolve(envOverride);
    if (existsSync(overrideDir)) return [overrideDir];
  }
  const dirs = [];
  if (existsSync(STATE_DIR)) dirs.push(STATE_DIR);
  const cwd = process.cwd();
  const cwdStateDir = join(cwd, 'orchestrator-state');
  if (cwdStateDir !== STATE_DIR && existsSync(cwdStateDir)) {
    dirs.push(cwdStateDir);
  }
  return dirs;
}

const ALL_STATE_DIRS = collectStateDirs();

// Clean stale dedup locks on startup (Fix 1: cross-process dedup)
cleanStaleLocks(30000);

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

function debug(message) {
  return { systemMessage: `DevFlow Enforcer: ${message}` };
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

function isTaskToolInput(raw) {
  return Boolean(
    raw.prompt || raw.description || raw.subagent_type || raw.subagentType ||
    raw.run_in_background !== undefined
  );
}

function normalizeToolInput(raw) {
  return {
    filePath:  raw.file_path  || raw.filepath  || raw.path || '',
    content:   raw.content    || '',
    oldString: raw.old_string || raw.oldstring || '',
    newString: raw.new_string || raw.newstring || '',
  };
}

// ── Gate check invocation ─────────────────────────────────────────────────────

// Critical gate actions: script errors must DENY (Fix 6C), not silently allow.
const CRITICAL_ACTIONS = new Set([
  'present_gate', 'complete_task', 'dispatch_skill',
  'enter_phase', 'post_gate3_write', 'transition',
]);

/**
 * Call devflow-gate.mjs with given action and return hook-compatible output.
 * Gate exit codes: 0 = allowed, 1 = rejected, 2 = script error.
 *
 * Fix 6C: critical actions on script crash → DENY; non-critical → allow + warning.
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
    // exit code 2 or crash
    if (CRITICAL_ACTIONS.has(action)) {
      return {
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' },
        systemMessage: `DENY (${action}): critical gate check error (${err.message || 'unknown'}). Cannot proceed without verification.`,
      };
    }
    // non-critical → non-fatal allow + warning
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

const SAMPLES_PATH = join(DEVFLOW_ROOT, 'monitor', 'task-spawn-samples.jsonl');

function appendSample(eventType, rawToolInput) {
  try {
    mkdirSync(join(DEVFLOW_ROOT, 'monitor'), { recursive: true });
    const prompt = rawToolInput.prompt || rawToolInput.description || '';
    const taskIdMatch = prompt.match(/task_id:\s*([\w-]+)/);
    const handoffIdMatch = prompt.match(/handoff_id:\s*([\w-]+)/);
    const subagentType = rawToolInput.subagent_type || rawToolInput.subagentType || '';
    const sample = {
      ts: new Date().toISOString(),
      event: eventType,
      keys: Object.keys(rawToolInput || {}),
      prompt_len: prompt.length,
      has_task_id: !!taskIdMatch,
      has_handoff_id: !!handoffIdMatch,
      subagent_type: subagentType,
      has_tool_use_id: !!rawToolInput.tool_use_id,
      tool_name: rawToolInput.tool_name || null,
    };
    appendFileSync(SAMPLES_PATH, JSON.stringify(sample) + '\n', 'utf8');
  } catch {
    // Sampling failure is non-blocking
  }
}

function handlePreTask(rawToolInput) {
  appendSample('pre-task', rawToolInput);
  const prompt = rawToolInput.prompt || rawToolInput.description || '';
  const toolSkill = rawToolInput.subagent_type || rawToolInput.subagentType || '';
  const parsed = parseTaskSpawn(prompt, toolSkill);
  const { taskId, handoffId, skill } = parsed;

  // Not a DevFlow sub-skill dispatch — allow silently
  if (!skill || !SUB_SKILLS.has(skill)) {
    return allow();
  }

  let taskDir = taskId ? resolveTaskDir(taskId, ALL_STATE_DIRS) : null;

  // Fix 3 Stage 3 legacy fallback: prompt missing task_id but exactly one legacy task in progress → bind
  let resolvedTaskId = taskId;
  if (!taskId && !taskDir) {
    const fallback = resolveLegacyTaskDir(ALL_STATE_DIRS);
    if (fallback) {
      resolvedTaskId = fallback.taskId;
      taskDir = fallback.taskDir;
    }
  }

  // Fix 3 Stage 3: validate + deny for new tasks, warn for legacy
  const validation = validateTaskSpawn(parsed, { taskDir, stateDirs: ALL_STATE_DIRS });
  const check = stage3Check(validation, { taskDir });

  if (!check.ok) {
    // Stage 3 BLOCK — new task with violations
    appendWarnings(taskDir || DEVFLOW_ROOT, validation.warnings, {
      event: 'pre-task',
      taskId,
      handoffId,
      skill,
      prompt_len: prompt.length,
      stage: 'stage3-block',
    }, { fallbackDir: DEVFLOW_ROOT });
    return deny(
      `DENY (dispatch_skill): task_id=${taskId || '(missing)'} handoff_id=${handoffId || '(missing)'} skill=${skill}\n` +
      `PreToolUse 校验失败，以下是未通过的检查项:\n` +
      validation.warnings.map(w => `  - ${w}`).join('\n')
    );
  }

  if (validation.warnings.length > 0) {
    // Legacy task — WARN only, still allow
    appendWarnings(taskDir || DEVFLOW_ROOT, validation.warnings, {
      event: 'pre-task',
      taskId: resolvedTaskId || taskId,
      handoffId,
      skill,
      prompt_len: prompt.length,
      stage: 'stage3-legacy-warn',
    }, { fallbackDir: DEVFLOW_ROOT });
    info(
      `⚠️ Task spawn WARN [Fix 3 Stage 3 legacy]: task_id=${resolvedTaskId || taskId || '(missing)'} handoff_id=${handoffId || '(missing)'} skill=${skill}\n` +
      validation.warnings.map(w => `  - ${w}`).join('\n')
    );
  }

  // All checks passed — write dispatch_authorized permit + event
  const toolUseId = rawToolInput.tool_use_id || rawToolInput.toolUseId || null;
  writeDispatchAuthorized(taskDir || DEVFLOW_ROOT, {
    taskId: resolvedTaskId || taskId,
    handoffId,
    skill,
    toolUseId,
  });

  info(
    `Task spawn authorized [Fix 3 Stage 3]: task_id=${resolvedTaskId || taskId || '(missing)'} handoff_id=${handoffId || '(missing)'} skill=${skill}`
  );
  return allow();
}

function handlePostTask(rawToolInput) {
  appendSample('post-task', rawToolInput);

  const prompt = rawToolInput.prompt || rawToolInput.description || '';
  const toolSkill = rawToolInput.subagent_type || rawToolInput.subagentType || '';
  const parsed = parseTaskSpawn(prompt, toolSkill);
  const { taskId, handoffId, skill } = parsed;

  // Not a DevFlow sub-skill dispatch — allow silently
  if (!skill || !SUB_SKILLS.has(skill)) {
    return allow();
  }

  const taskDir = taskId ? resolveTaskDir(taskId, ALL_STATE_DIRS) : null;

  // Determine success vs failure from PostToolUse payload
  const cancelled = rawToolInput.cancelled === true;
  const hasError = Boolean(rawToolInput.error) || Boolean(rawToolInput.tool_result?.error);
  const success = !cancelled && !hasError;

  const toolUseId = rawToolInput.tool_use_id || rawToolInput.toolUseId || null;

  if (success) {
    const finalized = finalizeDispatch(taskDir || DEVFLOW_ROOT, {
      toolUseId,
      taskId,
      handoffId,
      skill,
      packetContent: prompt,
    });
    if (finalized) {
      info(`Task spawn finalized [Fix 3 Stage 3]: task_id=${taskId} handoff_id=${handoffId} skill=${skill}`);
    } else {
      info(`Task spawn PostToolUse observed but no matching dispatch_authorized permit found: task_id=${taskId} handoff_id=${handoffId} skill=${skill}`);
    }
  } else {
    failDispatch(taskDir || DEVFLOW_ROOT, {
      toolUseId,
      taskId,
      handoffId,
      skill,
    });
    info(`Task spawn failed/cancelled [Fix 3 Stage 3]: task_id=${taskId} handoff_id=${handoffId} skill=${skill} reason=${cancelled ? 'cancelled' : 'error'}`);
  }

  appendPostTask(taskDir || DEVFLOW_ROOT, {
    event: 'post-task',
    taskId,
    handoffId,
    skill,
    prompt_len: prompt.length,
    success,
  });

  return allow();
}

function handlePreWrite(rawToolInput) {
  // Route Task tool to dedicated handler (Fix 1 + Fix 3)
  if (isTaskToolInput(rawToolInput)) {
    return handlePreTask(rawToolInput);
  }
  const toolInput = normalizeToolInput(rawToolInput);
  const { filePath } = toolInput;
  if (!filePath) return allow();

  // Resolve task from file path (P1 → P2 → P3, no P4)
  const task = resolveTaskFromPath(filePath, ALL_STATE_DIRS);
  if (!task) {
    info(`no task matched for write path ${filePath}`); // Not a DevFlow-related write — exits
    return;
  }

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
    info(`continuation exists for ${task.id}, project write allowed`); // Normal development or continuation exists — exits
    return;
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

  // events.jsonl writes — phase events must go through devflow-gate transition
  if (relPath === 'events.jsonl') {
    const appended = extractAppendedLines(toolInput);
    for (const line of appended.split('\n')) {
      if (!line.trim()) continue;
      // Fix C: block handwritten phase_completed — only transition command may write this
      if (line.includes('phase_completed')) {
        return deny(
          'DENY (transition_required): events.jsonl 中检测到 phase_completed 事件。' +
          'phase_completed 只能通过 `node devflow-gate.mjs transition` 命令生成，不得手写。'
        );
      }
      try {
        const evt = JSON.parse(line);
        if (evt.event_type === 'phase_entered' && evt.payload && evt.payload.phase) {
          return output(runGateCheck('enter_phase', task.dir, ['--phase', evt.payload.phase]));
        }
      } catch {
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

    // Fix 8: trigger incremental auditor when phase_completed is appended
    const hasPhaseCompleted = appended.split('\n').some(l => l.includes('"phase_completed"'));
    if (hasPhaseCompleted) {
      triggerIncrementalAudit(task.dir);
    }

    return allow();
  }

  // All other orchestrator-state/ files — post_gate3_write if Gate 3 is accepted
  if (hasGate3Accept(task.dir)) {
    return output(runGateCheck('post_gate3_write', task.dir, ['--target-path', filePath]));
  }

  // Nudge: change-package written → remind D.2 must follow
  if (relPath.match(/^artifacts\/change-package-.*\.yaml$/)) {
    return info(
      'DevFlow Nudge: change-package 已产出。' +
      '根据 write-through-actions.md §Sub-agent Return Continuity Protocol，' +
      '下一步必须：routing-decision-D → handoff-D2 → dispatch reviewer(s)。' +
      '不得跳过 D.2 直接进入 Gate 3 或 Phase F。'
    );
  }

  return allow();
}

// ── UserPromptSubmit handler ──────────────────────────────────────────────────

function handleUserPrompt() {
  // P4: global scan for in_progress tasks
  const task = resolveTaskGlobalScan(ALL_STATE_DIRS);
  if (!task) return allow();

  // Layer 2: state consistency check (omission detection — SC-1 through SC-4)
  const consistency = checkStateConsistency(task.dir);
  if (consistency.issues.length > 0) {
    return info(
      `⚠️ DevFlow State Check: 任务 ${task.id} 状态异常\n` +
      consistency.issues.map(i => `  - ${i}`).join('\n')
    );
  }

  // Layer 1: Gate 3 continuation enforcement (existing)
  if (!hasGate3Accept(task.dir)) return allow();
  if (hasContinuationDecision(task.dir)) {
    info(`user prompt observed; continuation already present for ${task.id}`);
    return;
  }

  return info(
    `⚠️ DevFlow Enforcer: 任务 ${task.id} 已通过 Gate 3 ACCEPT。\n` +
    `根据 continuation protocol，后续操作必须先执行 Pre-Action Check：\n` +
    `1. 判断用户请求是否需要实质性工作\n` +
    `2. 分类为五条路径（RE-ENTER / FOLLOW-UP / LIGHT-PATCH / NON-CODE / RECORD-STOP）\n` +
    `3. 写入 decisions/continuation-{seq}.yaml\n` +
    `在完成上述步骤前，不得修改源代码或创建新 artifact。`
  );
}

// ── Fix 8: Incremental auditor trigger (non-blocking) ───────────────────────

const AUDITOR_SCRIPT = join(SCRIPT_DIR, 'incremental-auditor.mjs');

function triggerIncrementalAudit(taskDir) {
  try {
    const child = spawn('node', [AUDITOR_SCRIPT, '--task-dir', taskDir], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // Non-blocking: audit failure must not interrupt the original write
  }
}

// ── Cross-process dedup fingerprint ────────────────────────────────────────────

const DEDUP_EVENTS = new Set(['pre-write', 'post-task']);

function makeFingerprint(event, input) {
  if (!DEDUP_EVENTS.has(event)) return null;
  const toolInput = input.tool_input || input.toolinput || {};

  if ((event === 'pre-write' || event === 'post-task') && isTaskToolInput(toolInput)) {
    const prompt = toolInput.prompt || toolInput.description || '';
    const taskIdMatch = prompt.match(/task_id:\s*([\w-]+)/);
    const handoffIdMatch = prompt.match(/handoff_id:\s*([\w-]+)/);
    return fingerprint({
      toolName: event === 'post-task' ? 'PostTask' : 'Task',
      toolUseId: toolInput.tool_use_id || toolInput.toolUseId || '',
      taskId: taskIdMatch ? taskIdMatch[1] : '',
      handoffId: handoffIdMatch ? handoffIdMatch[1] : '',
      skillName: toolInput.subagent_type || toolInput.subagentType || '',
    });
  }

  const ni = normalizeToolInput(toolInput);
  return fingerprint({
    toolName: event === 'post-task' ? 'PostTask' : (toolInput.tool_name || 'Write/Edit'),
    filePath: ni.filePath,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

let event = null;
let input = {};

try {
  event = getEventArg();
  const stdinRaw = readStdin();
  try {
    input = JSON.parse(stdinRaw);
  } catch {
    input = {};
  }

  // Cross-process dedup: if another hook process already handled this event, silently allow (Fix 1)
  const fp = makeFingerprint(event, input);
  if (fp) {
    const { isFirst } = tryLock(fp);
    if (!isFirst) {
      allow(); // exits process; return unnecessary
    }
  }

  if (event === 'pre-write') {
    handlePreWrite(input.tool_input || input.toolinput || {});
  } else if (event === 'user-prompt') {
    handleUserPrompt();
  } else if (event === 'post-task') {
    handlePostTask(input.tool_input || input.toolinput || {});
  } else {
    allow();
  }
} catch (err) {
  // Fix 6C: critical path errors (Task tool spawn) → DENY instead of silent allow.
  // Use safe defaults: event/input may have been partially mutated by try block.
  const safeEvent = (typeof event === 'string' && event) ? event : null;
  const safeInput = (typeof input === 'object' && input !== null) ? input : {};
  const rawToolInput = safeInput.tool_input || safeInput.toolinput || {};
  const isCriticalPath = safeEvent === 'pre-write' && isTaskToolInput(rawToolInput);
  if (isCriticalPath) {
    try {
      output({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' },
        systemMessage: `DENY (critical path): unexpected error during Task tool enforcement (${err.message}).`,
      });
    } catch {
      process.exit(0);
    }
  }
  // Top-level safety net — never crash, never block on error (non-critical)
  try {
    output({ systemMessage: `DevFlow Enforcer: unexpected error (${err.message}). Proceeding.` });
  } catch {
    process.exit(0);
  }
}

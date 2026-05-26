// dispatch-skill-task.mjs — Task spawn validation for Fix 3 Stage 2/3
// Zero npm dependencies. Pure node:fs + node:path.
// Stage 2 (WARN-only): validates prompt, handoff packet, duplicate dispatch.
// Stage 3 (BLOCK): same checks but returns BLOCK instead of WARN.

import { existsSync, readFileSync, readdirSync, appendFileSync, mkdirSync, writeFileSync, unlinkSync, renameSync as fsRenameSync, statSync as fsStatSync } from 'fs';
import { join, basename } from 'path';
import { validateInputs } from './validate-inputs.mjs';
import { readTaskYaml, appendEvents } from '../state-reader.mjs';

export const SUB_SKILLS = new Set([
  'web-app-architect', 'backend-data-api', 'frontend-design', 'webapp-interaction-designer',
  'full-stack-developer', 'code-reviewer', 'webapp-consistency-audit', 'pre-release-test-reviewer',
  'playwright-e2e-testing', 'component-library-maintainer', 'product-manager', 'state-auditor',
  'release-and-change-manager', 'change-audit-l1-design-review', 'change-audit-l2-contract-review',
]);

const HANDOFF_ID_RE = /handoff_id:\s*([\w-]+)/;
const TASK_ID_RE = /task_id:\s*([\w-]+)/;
const SKILL_RE = /(?:subagent_type|skill|subagentType):\s*["']?([\w-]+)/;

export function parseTaskSpawn(prompt, toolSkill) {
  const taskIdMatch = prompt.match(TASK_ID_RE);
  const handoffIdMatch = prompt.match(HANDOFF_ID_RE);
  const skillMatch = prompt.match(SKILL_RE);
  return {
    taskId: taskIdMatch ? taskIdMatch[1] : null,
    handoffId: handoffIdMatch ? handoffIdMatch[1] : null,
    skill: toolSkill || (skillMatch ? skillMatch[1] : null),
  };
}

export function resolveTaskDir(taskId, stateDirs) {
  for (const sd of stateDirs) {
    if (!existsSync(sd)) continue;
    const td = join(sd, taskId);
    if (existsSync(join(td, 'task.yaml'))) return td;
  }
  return null;
}

export function findHandoffPacket(taskDir, handoffId) {
  const p = join(taskDir, 'handoffs', `${handoffId}.yaml`);
  if (!existsSync(p)) return null;
  try { return readFileSync(p, 'utf8'); }
  catch { return null; }
}

export function parseHandoffSkillName(packetContent) {
  const m = packetContent.match(/^skill_name:\s*["']?([\w-]+)/m);
  return m ? m[1] : null;
}

export function hasFinalizedDispatchPermit(taskDir, handoffId) {
  const dir = join(taskDir, '.permits');
  if (!existsSync(dir)) return false;
  const files = readdirSync(dir);
  return files.some(f => f.startsWith('dispatch_skill-') && f.includes(handoffId));
}

export function validateTaskSpawn({ taskId, handoffId, skill }, { taskDir, stateDirs }) {
  const warnings = [];
  const checks = [];

  // 1. task_id
  if (!taskId) {
    warnings.push('MISSING_TASK_ID: prompt 中未找到 task_id — Stage 2 WARN，Stage 3 将 DENY');
  } else {
    checks.push('task_id_present');
    if (!taskDir) {
      warnings.push(`TASK_NOT_FOUND: task_id=${taskId} 未在任何 state dir 中找到`);
    } else {
      checks.push('task_dir_exists');
    }
  }

  // 2. handoff_id
  if (!handoffId) {
    warnings.push('MISSING_HANDOFF_ID: prompt 中未找到 handoff_id — Stage 2 WARN，Stage 3 将 DENY');
  } else {
    checks.push('handoff_id_present');
  }

  // 3. skill
  if (!skill) {
    warnings.push('MISSING_SKILL: prompt 中未找到 subagent_type/skill');
  } else if (!SUB_SKILLS.has(skill)) {
    warnings.push(`UNKNOWN_SKILL: subagent_type="${skill}" 不在 canonical sub-skill 列表中`);
  } else {
    checks.push('skill_known');
  }

  // 4. handoff packet
  let packet = null;
  if (taskDir && handoffId) {
    packet = findHandoffPacket(taskDir, handoffId);
    if (!packet) {
      warnings.push(`MISSING_HANDOFF_PACKET: handoffs/${handoffId}.yaml 不存在`);
    } else {
      checks.push('handoff_exists');
      const packetSkill = parseHandoffSkillName(packet);
      if (packetSkill && packetSkill !== skill) {
        warnings.push(`SKILL_MISMATCH: handoff packet skill_name="${packetSkill}" ≠ subagent_type="${skill}"`);
      } else if (packetSkill) {
        checks.push('skill_matches');
      }
    }

    // 5. duplicate dispatch
    if (hasFinalizedDispatchPermit(taskDir, handoffId)) {
      warnings.push(`DUPLICATE_DISPATCH: handoff_id=${handoffId} 已有 finalized dispatch_skill permit — 重复 spawn`);
    } else {
      checks.push('not_duplicate');
    }

    // 6. input_artifacts (lightweight — only warn, do not block in Stage 2)
    if (packet) {
      const iv = validateInputs(packet);
      if (!iv.ok && iv.errors.length > 0) {
        warnings.push(`INPUT_ARTIFACT_INVALID: ${iv.errors.join('; ')}`);
      } else if (iv.warnings.length > 0) {
        warnings.push(`INPUT_ARTIFACT_WARNING: ${iv.warnings.join('; ')}`);
      } else {
        checks.push('input_artifacts_valid');
      }
    }
  }

  return { warnings, checks, taskId, handoffId, skill, taskDir };
}

export function appendWarnings(taskDir, warnings, meta = {}, { fallbackDir } = {}) {
  const targetDir = taskDir || fallbackDir;
  if (!targetDir) return;
  const monitorDir = join(targetDir, 'monitor');
  mkdirSync(monitorDir, { recursive: true });
  const entry = {
    ts: new Date().toISOString(),
    source: 'dispatch-skill-task-stage2',
    ...meta,
    warnings,
  };
  appendFileSync(join(monitorDir, 'task-spawn-warnings.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
}

export function appendPostTask(taskDir, meta = {}) {
  if (!taskDir) return;
  const monitorDir = join(taskDir, 'monitor');
  mkdirSync(monitorDir, { recursive: true });
  const entry = {
    ts: new Date().toISOString(),
    source: 'dispatch-skill-task-post',
    ...meta,
  };
  appendFileSync(join(monitorDir, 'task-spawn-samples.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
}

// ── Stage 3: harden to BLOCK (deny) ──────────────────────────────────────────

function isNewTask(taskDir) {
  const task = readTaskYaml(taskDir);
  if (!task) return false;
  const pv = task.protocol_version;
  return pv && Number(pv) >= 2;
}

export function stage3Check(validation, { taskDir }) {
  const newTask = taskDir ? isNewTask(taskDir) : null;
  // If skill is not in SUB_SKILLS, we never block (not a DevFlow dispatch)
  // This is handled upstream in enforcer
  if (validation.warnings.length === 0) {
    return { ok: true, newTask, reason: 'all checks passed' };
  }
  // Cannot determine task → default deny for safety (likely new task with missing task_id)
  if (newTask === null || newTask === true) {
    return { ok: false, newTask, reason: 'Stage 3 BLOCK (protocol_version>=2 or unknown): ' + validation.warnings.join('; ') };
  }
  return { ok: true, newTask, reason: 'legacy task — WARN only: ' + validation.warnings.join('; ') };
}

/**
 * Scan state dirs for exactly one in-progress legacy task (protocol_version < 2 or missing).
 * Returns { taskDir, taskId } or null if not exactly one.
 */
export function resolveLegacyTaskDir(stateDirs) {
  const candidates = [];
  for (const sd of stateDirs) {
    const statePath = basename(sd) === 'orchestrator-state' ? sd : join(sd, 'orchestrator-state');
    if (!existsSync(statePath)) continue;
    let entries;
    try { entries = readdirSync(statePath, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const taskDir = join(statePath, e.name);
      const taskYamlPath = join(taskDir, 'task.yaml');
      if (!existsSync(taskYamlPath)) continue;
      const task = readTaskYaml(taskDir);
      if (!task) continue;
      if (task.status === 'completed') continue;
      const pv = task.protocol_version;
      if (pv && Number(pv) >= 2) continue; // new task, not legacy
      candidates.push({ taskDir, taskId: task.task_id || e.name });
    }
  }
  if (candidates.length === 1) return candidates[0];
  return null;
}

function sha8(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).slice(0, 8);
}

export function writeDispatchAuthorized(taskDir, { taskId, handoffId, skill, toolUseId }) {
  if (!taskDir) return null;
  const permitsDir = join(taskDir, '.permits');
  mkdirSync(permitsDir, { recursive: true });
  const ts = Date.now();
  const authId = toolUseId ? `${toolUseId}-${ts}` : `${handoffId || 'no-handoff'}-${ts}`;
  const permit = {
    action: 'dispatch' + '_authorized',
    task_id: taskId,
    handoff_id: handoffId,
    skill,
    tool_use_id: toolUseId || null,
    authorized_at: new Date().toISOString(),
  };
  const fileName = `dispatch_authorized-${skill}-${authId}.json`;
  writeFileSync(join(permitsDir, fileName), JSON.stringify(permit, null, 2));

  // Write skill_dispatch_authorized event
  const event = {
    event_type: 'skill_dispatch_authorized',
    payload: { task_id: taskId, handoff_id: handoffId, skill, tool_use_id: toolUseId || null, auth_id: authId },
    timestamp: permit.authorized_at,
    source: 'devflow-enforcer',
  };
  appendEvents(taskDir, [event]);
  return authId;
}

export function findAuthorizedPermit(taskDir, { toolUseId, taskId, handoffId, skill }) {
  if (!taskDir) return null;
  const permitsDir = join(taskDir, '.permits');
  if (!existsSync(permitsDir)) return null;
  const files = readdirSync(permitsDir).filter(f => f.startsWith('dispatch' + '_authorized-'));
  if (files.length === 0) return null;

  // Exact match by tool_use_id
  if (toolUseId) {
    const exact = files.find(f => f.includes(toolUseId));
    if (exact) return exact;
  }

  // Fallback: nearest 60s by mtime for same skill+handoff
  const now = Date.now();
  let best = null;
  let bestDiff = Infinity;
  for (const f of files) {
    const m = f.match(/^dispatch_authorized-([^-]+)-(.+)\.json$/);
    if (!m) continue;
    const [, fSkill, rest] = m;
    if (fSkill !== skill) continue;
    const p = join(permitsDir, f);
    const mtime = existsSync(p) ? (statSync(p).mtimeMs || 0) : 0;
    const diff = now - mtime;
    if (diff < bestDiff && diff <= 60000) {
      bestDiff = diff;
      best = f;
    }
  }
  return best;
}

function statSync(path) {
  try { return fsStatSync(path); }
  catch { return { mtimeMs: 0 }; }
}

export function finalizeDispatch(taskDir, { toolUseId, taskId, handoffId, skill, packetContent }) {
  if (!taskDir) return false;
  const permitsDir = join(taskDir, '.permits');
  const authFile = findAuthorizedPermit(taskDir, { toolUseId, taskId, handoffId, skill });
  if (!authFile) return false;

  // Rename to dispatch_skill-{skill}-{handoffId}-{sha8}.json
  const hashSuffix = packetContent ? sha8(packetContent) : 'nopacket';
  const ts = Date.now();
  const finalName = `dispatch_skill-${skill}-${handoffId || 'no-handoff'}-${hashSuffix}-${ts}.json`;
  try {
    const oldPath = join(permitsDir, authFile);
    const newPath = join(permitsDir, finalName);
    renameSync(oldPath, newPath);
  } catch {
    // Fallback: copy then delete
    try {
      const content = readFileSync(join(permitsDir, authFile), 'utf8');
      writeFileSync(join(permitsDir, finalName), content);
      unlinkSync(join(permitsDir, authFile));
    } catch { return false; }
  }

  const event = {
    event_type: 'skill_dispatched',
    payload: { task_id: taskId, handoff_id: handoffId, skill, tool_use_id: toolUseId || null },
    timestamp: new Date().toISOString(),
    source: 'devflow-enforcer',
  };
  appendEvents(taskDir, [event]);
  return true;
}

export function failDispatch(taskDir, { toolUseId, taskId, handoffId, skill }) {
  if (!taskDir) return false;
  const permitsDir = join(taskDir, '.permits');
  const authFile = findAuthorizedPermit(taskDir, { toolUseId, taskId, handoffId, skill });
  if (authFile) {
    try { unlinkSync(join(permitsDir, authFile)); } catch { /* ignore */ }
  }

  const event = {
    event_type: 'skill_dispatch_failed',
    payload: { task_id: taskId, handoff_id: handoffId, skill, tool_use_id: toolUseId || null },
    timestamp: new Date().toISOString(),
    source: 'devflow-enforcer',
  };
  appendEvents(taskDir, [event]);
  return true;
}

function renameSync(oldPath, newPath) {
  try { fsRenameSync(oldPath, newPath); }
  catch { throw new Error('rename failed'); }
}

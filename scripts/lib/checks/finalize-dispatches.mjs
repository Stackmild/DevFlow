// finalize-dispatches.mjs — PostToolUse fallback for Cowork missing PostTask hook
//
// Context: Cowork does NOT trigger PostToolUse for Agent tool spawns.
// This means dispatch_authorized-* permits written at PreToolUse never get
// automatically renamed to dispatch_skill-* by PostToolUse finalize.
//
// This module scans pending authorized permits and finalizes them after a
// configurable timeout, writing skill_dispatched events.
//
// Idempotent: re-running does not duplicate events or permits.

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { readTaskYaml, appendEvents } from '../state-reader.mjs';

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

function parsePermitName(name) {
  // dispatch_authorized-{skill}-{authId}.json
  const m = name.match(/^dispatch_authorized-([^-]+)-(.+)\.json$/);
  if (!m) return null;
  return { skill: m[1], authId: m[2] };
}

function parseAuthId(authId) {
  // {handoffId}-{sha8}-{tsMs}  or  {toolUseId}-{tsMs}
  const lastDash = authId.lastIndexOf('-');
  if (lastDash === -1) return { handoffId: authId, sha8: null, tsMs: 0 };
  const tsStr = authId.slice(lastDash + 1);
  const tsMs = Number(tsStr);
  if (Number.isNaN(tsMs)) {
    // Could be tool_use_id-{ts} format where tool_use_id itself has dashes
    // Handoff format: handoff-D1-fsd-001-{sha8}-{tsMs}
    // Try to find the numeric timestamp at the end
    const tsMatch = authId.match(/-([0-9]{13,})$/);
    if (tsMatch) {
      const ts = Number(tsMatch[1]);
      const prefix = authId.slice(0, authId.lastIndexOf(tsMatch[0]));
      // prefix ends with -{sha8}
      const shaDash = prefix.lastIndexOf('-');
      if (shaDash > 0) {
        const sha8 = prefix.slice(shaDash + 1);
        const handoffId = prefix.slice(0, shaDash);
        return { handoffId, sha8, tsMs: ts };
      }
      return { handoffId: prefix, sha8: null, tsMs: ts };
    }
    return { handoffId: authId, sha8: null, tsMs: 0 };
  }
  const rest = authId.slice(0, lastDash);
  const shaDash = rest.lastIndexOf('-');
  if (shaDash > 0) {
    const sha8 = rest.slice(shaDash + 1);
    const handoffId = rest.slice(0, shaDash);
    return { handoffId, sha8, tsMs };
  }
  return { handoffId: rest, sha8: null, tsMs };
}

function hasFinalizedPermit(permitsDir, skill, handoffId) {
  if (!existsSync(permitsDir)) return false;
  const files = readdirSync(permitsDir);
  return files.some(f => f.startsWith(`dispatch_skill-${skill}-${handoffId}-`));
}

function eventAlreadyLogged(events, eventType, payloadMatcher) {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.event_type === eventType && payloadMatcher(e.payload)) return true;
  }
  return false;
}

function runtimeFromPermit(task, permit = {}) {
  const runtime = {};
  for (const field of ['host_platform', 'dispatch_backend', 'dispatch_mode', 'degraded_independence']) {
    if (permit[field] !== undefined && permit[field] !== null && permit[field] !== '') {
      runtime[field] = permit[field];
    }
  }
  if (!runtime.host_platform && task?.host_platform) {
    runtime.host_platform = String(task.host_platform).trim();
  }
  if (runtime.host_platform === 'codex') {
    if (!runtime.dispatch_backend) runtime.dispatch_backend = 'codex_multi_agent';
    if (!runtime.dispatch_mode) runtime.dispatch_mode = 'true_subagent';
    if (runtime.degraded_independence === undefined) runtime.degraded_independence = false;
  }
  return runtime;
}

/**
 * Scan and finalize pending dispatch_authorized permits.
 *
 * @param {string} taskDir
 * @param {Object} opts
 * @param {number} [opts.timeoutMs] — age threshold in ms (default 30000)
 * @param {boolean} [opts.force] — finalize regardless of age (for smoke tests)
 * @returns {{finalized: number, skipped: number, already: number, errors: string[]}}
 */
export function finalizeDispatches(taskDir, { timeoutMs = DEFAULT_TIMEOUT_MS, force = false } = {}) {
  const permitsDir = join(taskDir, '.permits');
  if (!existsSync(permitsDir)) {
    return { finalized: 0, skipped: 0, already: 0, errors: [] };
  }

  const files = readdirSync(permitsDir).filter(f => f.startsWith('dispatch_authorized-'));
  if (files.length === 0) {
    return { finalized: 0, skipped: 0, already: 0, errors: [] };
  }

  const task = readTaskYaml(taskDir);
  const taskId = task?.task_id || null;
  const now = Date.now();
  const errors = [];
  let finalized = 0;
  let skipped = 0;
  let already = 0;

  // Read events once for idempotency checks
  const eventsFile = join(taskDir, 'events.jsonl');
  let events = [];
  if (existsSync(eventsFile)) {
    events = readFileSync(eventsFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  }

  for (const file of files) {
    const permitPath = join(permitsDir, file);
    let permit;
    try {
      permit = JSON.parse(readFileSync(permitPath, 'utf8'));
    } catch (e) {
      errors.push(`Corrupt permit ${file}: ${e.message}`);
      continue;
    }

    // Prefer permit JSON fields over filename parsing (skill names contain dashes)
    const skill = permit.skill || (parsePermitName(file)?.skill) || null;
    const authId = permit.auth_id || (parsePermitName(file)?.authId) || null;
    if (!skill || !authId) {
      errors.push(`Cannot determine skill/authId from permit ${file}`);
      continue;
    }

    const parsed = parseAuthId(authId);
    const handoffId = permit.handoff_id || parsed.handoffId || null;
    const sha8 = permit.handoff_sha || parsed.sha8 || 'fallback';
    const runtimePayload = runtimeFromPermit(task, permit);

    // Check if already finalized (by permit file existence)
    if (handoffId && hasFinalizedPermit(permitsDir, skill, handoffId)) {
      already++;
      // Clean up stale authorized permit
      try { unlinkSync(permitPath); } catch { /* ignore */ }
      continue;
    }

    // Check if already logged as dispatched (by event log)
    const authIdInEvent = permit.auth_id || authId;
    if (eventAlreadyLogged(events, 'skill_dispatched', p =>
      p?.skill === skill &&
      (p?.handoff_id === handoffId || p?.auth_id === authIdInEvent)
    )) {
      already++;
      try { unlinkSync(permitPath); } catch { /* ignore */ }
      continue;
    }

    // Age check
    const authorizedAt = permit.authorized_at ? new Date(permit.authorized_at).getTime() : 0;
    const age = now - authorizedAt;
    if (!force && age < timeoutMs) {
      skipped++;
      continue;
    }

    // Finalize
    const ts = Date.now();
    const finalName = `dispatch_skill-${skill}-${handoffId || 'nohandoff'}-${sha8}-${ts}.json`;
    const finalPath = join(permitsDir, finalName);

    // Write finalized permit (copy content, add finalized_at)
    const finalPermit = {
      ...permit,
      action: 'dispatch_skill',
      status: 'dispatched',
      finalized_at: new Date().toISOString(),
      finalized_by: 'finalize_dispatches_fallback',
      ...runtimePayload,
    };

    try {
      writeFileSync(finalPath, JSON.stringify(finalPermit, null, 2));
      unlinkSync(permitPath);
    } catch (e) {
      errors.push(`Failed to finalize ${file}: ${e.message}`);
      continue;
    }

    // Write event
    const event = {
      event_type: 'skill_dispatched',
      payload: {
        task_id: taskId,
        handoff_id: handoffId,
        skill,
        tool_use_id: permit.tool_use_id || null,
        auth_id: authIdInEvent,
        finalized_by: 'finalize_dispatches_fallback',
        ...runtimePayload,
      },
      timestamp: new Date().toISOString(),
      source: 'devflow-gate',
    };

    try {
      appendEvents(taskDir, [event]);
      events.push(event); // Update in-memory for subsequent idempotency
      finalized++;
    } catch (e) {
      errors.push(`Failed to log event for ${file}: ${e.message}`);
      // Rollback: delete finalized permit to avoid inconsistent state
      try { unlinkSync(finalPath); } catch { /* ignore */ }
    }
  }

  return { finalized, skipped, already, errors };
}

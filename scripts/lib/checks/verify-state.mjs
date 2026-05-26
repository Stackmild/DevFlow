// verify-state.mjs — State machine consistency detector (Fix 5)
// Command: node scripts/devflow-gate.mjs verify_state --task-dir {dir}
//
// Reads task.yaml, events.jsonl, permits, handoffs, decisions, artifacts,
// and optionally project_path docs/specs/ for external evidence.
// Outputs D1-D6 anomalies. Exit code 1 if critical issues found.

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve, basename } from 'path';
import {
  readEvents,
  readTaskYaml,
  scanPermits,
  currentPhaseFromEvents,
  findEvents,
  decisionExists,
} from '../state-reader.mjs';

// ── Helper: glob-like matching (no minimatch dep) ──────────────────────────
function matchGlob(path, pattern) {
  if (pattern.includes('*') || pattern.includes('?')) {
    const re = new RegExp('^' + pattern.replace(/\*\*/g, '<<<DOUBLESTAR>>>').replace(/\*/g, '[^/]*').replace(/\?/g, '.').replace(/<<<DOUBLESTAR>>>/g, '.*') + '$');
    return re.test(path);
  }
  return path === pattern || basename(path) === pattern;
}

// ── D1: Spec drift detector ───────────────────────────────────────────────
function checkD1(taskDir, task, projectPath, expectedGlobs, authoritativeSpec, moduleSlug, taskId) {
  const issues = [];
  const specRoots = [];
  if (projectPath && existsSync(join(projectPath, 'docs', 'specs'))) {
    specRoots.push(join(projectPath, 'docs', 'specs'));
  }
  if (projectPath && existsSync(join(projectPath, 'docs', 'handoff'))) {
    specRoots.push(join(projectPath, 'docs', 'handoff'));
  }

  let specCount = 0;
  const startedAt = task.started_at ? new Date(task.started_at).getTime() : 0;

  for (const root of specRoots) {
    if (!existsSync(root)) continue;
    for (const file of readdirSync(root)) {
      const p = join(root, file);
      try {
        const s = statSync(p);
        if (s.mtimeMs < startedAt) continue; // pre-existing
      } catch { continue; }

      let isMatch = false;
      if (authoritativeSpec && matchGlob(p, authoritativeSpec)) isMatch = true;
      if (expectedGlobs && expectedGlobs.some(g => matchGlob(p, g))) isMatch = true;
      if (moduleSlug && file.includes(moduleSlug)) isMatch = true;
      if (taskId && file.includes(taskId)) isMatch = true;

      // Content scan (first 200 lines) as fallback
      if (!isMatch && (moduleSlug || taskId)) {
        try {
          const head = readFileSync(p, 'utf8').split('\n').slice(0, 200).join('\n');
          if (moduleSlug && head.includes(moduleSlug)) isMatch = true;
          if (taskId && head.includes(taskId)) isMatch = true;
        } catch { /* ignore unreadable */ }
      }

      if (isMatch) specCount++;
    }
  }

  const currentPhase = task.current_phase || currentPhaseFromEvents(readEvents(taskDir).events);
  if (currentPhase === 'phase_a' && specCount >= 3) {
    issues.push(`D1: current_phase=phase_a but ${specCount} business spec files found in project_path/docs — severe state drift`);
  }
  return issues;
}

// ── D2: Gate decision vs handoff summary mismatch ─────────────────────────
function checkD2(taskDir) {
  const issues = [];
  const decisionsDir = join(taskDir, 'decisions');
  const handoffDir = join(taskDir, 'handoffs');

  for (const n of ['1', '2', '3']) {
    const hasGate = decisionExists(taskDir, `gate-${n}.yaml`);
    const hasSummary = existsSync(handoffDir) && readdirSync(handoffDir).some(f => f.includes(`gate-${n}-summary`));
    if (!hasGate && hasSummary) {
      issues.push(`D2: decisions/gate-${n}.yaml missing but handoffs/ contains gate-${n}-summary — Gate decision never written to task_dir`);
    }
  }
  return issues;
}

// ── D3: Zombie task detector ────────────────────────────────────────────────
function checkD3(taskDir, events) {
  const issues = [];
  if (events.length === 0) return issues;
  const last = events[events.length - 1];
  const lastTs = last.timestamp ? new Date(last.timestamp).getTime() : 0;
  const hoursAgo = (Date.now() - lastTs) / (1000 * 60 * 60);

  const task = readTaskYaml(taskDir) || {};
  const isSuspended = task.status === 'suspended' || task.status === 'paused';
  if (!isSuspended && hoursAgo > 1) {
    issues.push(`D3: last event ${hoursAgo.toFixed(1)}h ago but task status=${task.status || 'unknown'} (not paused) — possible zombie`);
  }
  return issues;
}

// ── D4: Dispatch leak detector ──────────────────────────────────────────────
function checkD4(taskDir, events) {
  const issues = [];
  const authorized = findEvents(events, 'skill_dispatch_authorized');
  const dispatched = findEvents(events, 'skill_dispatched');
  const failed = findEvents(events, 'skill_dispatch_failed');
  const finalizedCount = dispatched.length + failed.length;

  // Only report if gap > 0 and last authorized event > 10 min ago
  const gap = authorized.length - finalizedCount;
  if (gap > 0 && authorized.length > 0) {
    const lastAuth = authorized[authorized.length - 1];
    const lastAuthTs = lastAuth.timestamp ? new Date(lastAuth.timestamp).getTime() : 0;
    const minutesAgo = (Date.now() - lastAuthTs) / (1000 * 60);
    if (minutesAgo > 10) {
      issues.push(`D4: ${gap} skill dispatch(s) authorized but not finalized (dispatched=${dispatched.length}, failed=${failed.length}) for >10min — PostToolUse may be missing`);
    }
  }
  return issues;
}

// ── D5: Self-claim vs evidence mismatch ─────────────────────────────────────
function checkD5(taskDir, events) {
  const issues = [];
  // Search for self-claim events (e.g. iron_law_compliance or similar claims)
  const claims = events.filter(e =>
    e.event_type === 'compliance_check' ||
    (e.payload?.note && /铁律|iron.*law|compliance|all.*rules.*passed/i.test(String(e.payload.note)))
  );
  const hasPermits = scanPermits(taskDir).length > 0;
  const handoffDir = join(taskDir, 'handoffs');
  const hasHandoffs = existsSync(handoffDir) && readdirSync(handoffDir).length > 0;

  if (claims.length > 0 && !hasPermits && !hasHandoffs) {
    issues.push('D5: compliance/iron-law claim in events but .permits/ and handoffs/ are empty — self-claim contradicts evidence');
  }
  return issues;
}

// ── D6: Internal consistency — permits vs events ───────────────────────────
function checkD6(taskDir, events) {
  const issues = [];
  const permits = scanPermits(taskDir);
  const dispatchSkillPermits = permits.filter(p => p.startsWith('dispatch_skill-'));
  const dispatchedEvents = findEvents(events, 'skill_dispatched');

  if (dispatchSkillPermits.length !== dispatchedEvents.length) {
    issues.push(
      `D6: dispatch_skill permit count (${dispatchSkillPermits.length}) ≠ skill_dispatched events (${dispatchedEvents.length}) — internal consistency broken`
    );
  }
  return issues;
}

// ── D7: Snapshot drift — task.yaml.current_phase vs latest phase_entered event ─
function checkD7(taskDir, events, task) {
  const issues = [];
  const latestPhaseEntered = [...events].reverse().find(e => e.event_type === 'phase_entered');
  const eventPhase = latestPhaseEntered?.payload?.phase || null;
  const snapshotPhase = task.current_phase || null;

  if (eventPhase && snapshotPhase && eventPhase !== snapshotPhase) {
    issues.push(
      `D7: snapshot drift — task.yaml.current_phase="${snapshotPhase}" but latest phase_entered event="${eventPhase}" — task.yaml stale or events.jsonl tampered`
    );
  }
  return issues;
}

// ── Main check function ─────────────────────────────────────────────────────
export function check(taskDir, eventsData) {
  const { events, warnings: readWarnings } = eventsData;
  const task = readTaskYaml(taskDir) || {};
  const issues = [];
  const warnings = [...readWarnings];

  const projectPath = task.project_path || null;
  const expectedGlobsRaw = task.expected_artifact_globs || null;
  const expectedGlobs = expectedGlobsRaw
    ? expectedGlobsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : null;
  const authoritativeSpec = task.authoritative_spec || null;
  const moduleSlug = task.module_slug || null;
  const taskId = task.task_id || null;

  issues.push(...checkD1(taskDir, task, projectPath, expectedGlobs, authoritativeSpec, moduleSlug, taskId));
  issues.push(...checkD2(taskDir));
  issues.push(...checkD3(taskDir, events));
  issues.push(...checkD4(taskDir, events));
  issues.push(...checkD5(taskDir, events));
  issues.push(...checkD6(taskDir, events));
  issues.push(...checkD7(taskDir, events, task));

  const critical = issues.filter(i => !i.startsWith('D3:')); // D3 is warning-level
  const hasCritical = critical.length > 0;

  return {
    allowed: !hasCritical,
    action: 'verify_state',
    params: {},
    ...(hasCritical
      ? { reason: issues.join('; '), violations: critical.map(d => ({ check: d.slice(0, 2), severity: 'BLOCK', detail: d })) }
      : { checks_passed: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].filter(c => !issues.some(i => i.startsWith(c))) }
    ),
    issues,
    warnings,
  };
}

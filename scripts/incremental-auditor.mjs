#!/usr/bin/env node
// incremental-auditor.mjs — Fix 8: lightweight phase-boundary state audit
//
// Triggered by enforcer after phase_completed events are written.
// Non-blocking: 5s timeout, failures recorded but do not block original write.
// Outputs YAML to monitor/audit-incremental-{phase}-{seq}.yaml
//
// Usage:
//   node scripts/incremental-auditor.mjs --task-dir {path} [--phase {phase}]

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  readEvents,
  readTaskYaml,
  scanPermits,
  scanIssueBlockers,
  findEvents,
  currentPhaseFromEvents,
} from './lib/state-reader.mjs';

// ── Argument parsing ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}
const taskDir = getArg('task-dir');
const phaseArg = getArg('phase');

if (!taskDir || !existsSync(taskDir)) {
  console.error('Error: --task-dir required and must exist');
  process.exit(2);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoNow() { return new Date().toISOString(); }

function latestEventTimestamp(events) {
  if (events.length === 0) return null;
  const last = events[events.length - 1];
  return last.timestamp || null;
}

function minutesSince(ts) {
  if (!ts) return Infinity;
  return (Date.now() - new Date(ts).getTime()) / (1000 * 60);
}

function countFiles(dir, filter = () => true) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => f !== '.gitkeep' && filter(f)).length;
}

function nextAuditSeq(taskDir, phase) {
  const monitorDir = join(taskDir, 'monitor');
  if (!existsSync(monitorDir)) return 1;
  const prefix = `audit-incremental-${phase}-`;
  const files = readdirSync(monitorDir).filter(f => f.startsWith(prefix) && f.endsWith('.yaml'));
  let max = 0;
  for (const f of files) {
    const m = f.match(/-(\d+)\.yaml$/);
    if (m) max = Math.max(max, parseInt(m[1]));
  }
  return max + 1;
}

// ── 10 Incremental Checks ──────────────────────────────────────────────────

function checkEventsParse(eventsData) {
  if (eventsData.corruptLineCount > 0) {
    return {
      ok: false,
      severity: 'critical',
      detail: `events.jsonl has ${eventsData.corruptLineCount} corrupt line(s)`,
    };
  }
  if (eventsData.warnings.length > 0 && eventsData.warnings[0] !== 'events.jsonl not found') {
    return {
      ok: false,
      severity: 'warn',
      detail: `events.jsonl warnings: ${eventsData.warnings.join('; ')}`,
    };
  }
  return { ok: true };
}

function checkSnapshotDrift(task, events) {
  const evtPhase = currentPhaseFromEvents(events);
  const snapPhase = task?.current_phase || null;
  if (evtPhase && snapPhase && evtPhase !== snapPhase) {
    return {
      ok: false,
      severity: 'warn',
      detail: `snapshot drift: task.yaml.current_phase="${snapPhase}" vs events.jsonl latest="${evtPhase}"`,
    };
  }
  return { ok: true };
}

function checkAuthorizedStale(taskDir) {
  const permits = scanPermits(taskDir);
  const authPermits = permits.filter(p => p.startsWith('dispatch_authorized-'));
  if (authPermits.length === 0) return { ok: true };

  const stale = [];
  for (const name of authPermits) {
    try {
      const content = readFileSync(join(taskDir, '.permits', name), 'utf8');
      const permit = JSON.parse(content);
      const ageMin = minutesSince(permit.authorized_at);
      if (ageMin > 10) stale.push({ name, ageMin: Math.round(ageMin) });
    } catch { /* ignore unreadable */ }
  }
  if (stale.length > 0) {
    return {
      ok: false,
      severity: 'warn',
      detail: `${stale.length} dispatch_authorized permit(s) stale >10min: ${stale.map(s => s.name).join(', ')}`,
    };
  }
  return { ok: true };
}

function checkDispatchPermitEventConsistency(taskDir, events) {
  const permits = scanPermits(taskDir);
  const dispatchPermits = permits.filter(p => p.startsWith('dispatch_skill-'));
  const dispatchedEvents = findEvents(events, 'skill_dispatched');
  if (dispatchPermits.length !== dispatchedEvents.length) {
    return {
      ok: false,
      severity: 'warn',
      detail: `dispatch_skill permits (${dispatchPermits.length}) ≠ skill_dispatched events (${dispatchedEvents.length})`,
    };
  }
  return { ok: true };
}

function checkGateDecisionEventConsistency(taskDir, events) {
  const decisionsDir = join(taskDir, 'decisions');
  if (!existsSync(decisionsDir)) return { ok: true };

  const issues = [];
  for (const n of ['1', '2', '3']) {
    const hasFile = existsSync(join(decisionsDir, `gate-${n}.yaml`));
    const hasEvt = events.some(e => e.event_type === 'gate_decision' && String(e.payload?.gate) === n);
    if (hasFile && !hasEvt) {
      issues.push(`gate-${n}.yaml exists but no gate_decision event`);
    }
    if (!hasFile && hasEvt) {
      issues.push(`gate_decision event for gate ${n} but decisions/gate-${n}.yaml missing`);
    }
  }
  if (issues.length > 0) {
    return { ok: false, severity: 'warn', detail: issues.join('; ') };
  }
  return { ok: true };
}

function checkHandoffsVsDispatch(taskDir, events) {
  const handoffCount = countFiles(join(taskDir, 'handoffs'), f => f.endsWith('.yaml'));
  const dispatchedEvents = findEvents(events, 'skill_dispatched');
  // Allow slight mismatch (e.g. handoff written but dispatch not yet finalized), but flag large gaps
  const gap = Math.abs(handoffCount - dispatchedEvents.length);
  if (gap >= 3) {
    return {
      ok: false,
      severity: 'warn',
      detail: `handoffs (${handoffCount}) vs skill_dispatched events (${dispatchedEvents.length}) gap=${gap} — dispatch evidence may be incomplete`,
    };
  }
  return { ok: true };
}

function checkOpenBlockers(taskDir, events, task) {
  const { blockers } = scanIssueBlockers(taskDir);
  if (blockers.length === 0) return { ok: true };

  // Determine if we're "in a subsequent phase" where blockers shouldn't exist silently
  const evtPhase = currentPhaseFromEvents(events);
  const snapPhase = task?.current_phase;
  const phase = evtPhase || snapPhase;
  const isPostD = phase && (phase.startsWith('phase_d_') || phase === 'phase_f');

  if (isPostD) {
    return {
      ok: false,
      severity: 'critical',
      detail: `${blockers.length} open blocker(s) in Phase ${phase}: ${blockers.map(b => b.file).join(', ')}`,
    };
  }
  return {
    ok: false,
    severity: 'warn',
    detail: `${blockers.length} open blocker(s): ${blockers.map(b => b.file).join(', ')}`,
  };
}

function checkRequiredArtifacts(taskDir, events, task) {
  const phase = currentPhaseFromEvents(events) || task?.current_phase;
  if (!phase) return { ok: true };

  const required = [];
  if (phase === 'phase_c' || phase.startsWith('phase_d_') || phase === 'phase_f') {
    // After phase_b, product-spec should exist
    if (!existsSync(join(taskDir, 'artifacts', 'product-spec.md')) &&
        !existsSync(join(taskDir, 'artifacts', 'product-spec.yaml'))) {
      required.push('product-spec');
    }
  }
  if (phase.startsWith('phase_d_') || phase === 'phase_f') {
    if (!existsSync(join(taskDir, 'artifacts', 'implementation-scope.md')) &&
        !existsSync(join(taskDir, 'artifacts', 'implementation-scope.yaml'))) {
      required.push('implementation-scope');
    }
  }
  if (phase === 'phase_d_2' || phase === 'phase_d_3' || phase === 'phase_f') {
    const hasCP = existsSync(join(taskDir, 'artifacts')) &&
      readdirSync(join(taskDir, 'artifacts')).some(f => /^change-package-.*\.yaml$/.test(f));
    if (!hasCP) required.push('change-package');
  }

  if (required.length > 0) {
    return {
      ok: false,
      severity: 'warn',
      detail: `Phase ${phase} missing required artifact(s): ${required.join(', ')}`,
    };
  }
  return { ok: true };
}

function checkCompletedStatusIntegrity(taskDir, events, task) {
  const isCompleted = task?.status === 'completed';
  if (!isCompleted) return { ok: true };

  // completed status must have closeout evidence
  const hasCloseoutPhaseF = findEvents(events, 'phase_entered', { phase: 'phase_f' }).length > 0;
  const hasGate3 = events.some(e => e.event_type === 'gate_decision' && String(e.payload?.gate) === '3');

  if (!hasCloseoutPhaseF || !hasGate3) {
    return {
      ok: false,
      severity: 'critical',
      detail: `task.yaml.status=completed but missing closeout evidence (phase_f=${hasCloseoutPhaseF}, gate3=${hasGate3})`,
    };
  }
  return { ok: true };
}

function checkManualPhaseBypass(events) {
  const issues = [];
  for (const e of events) {
    if (e.event_type === 'phase_completed' || e.event_type === 'phase_entered') {
      const source = e.source || e.payload?.source;
      if (source && source !== 'devflow-gate' && source !== 'devflow-gate-transition') {
        issues.push(`event ${e.event_type} (phase=${e.payload?.phase}) has non-canonical source="${source}"`);
      }
      // If no source at all on phase events written after Fix 3 — suspicious but not critical
      if (!source && e.timestamp) {
        const evtTs = new Date(e.timestamp).getTime();
        const cutoff = new Date('2026-05-01T00:00:00Z').getTime(); // approximate Fix 3 deploy
        if (evtTs > cutoff) {
          issues.push(`event ${e.event_type} (phase=${e.payload?.phase}) missing source field — possible manual write`);
        }
      }
    }
  }
  if (issues.length > 0) {
    return { ok: false, severity: 'warn', detail: issues.join('; ') };
  }
  return { ok: true };
}

// ── Main audit ───────────────────────────────────────────────────────────────

function runAudit(taskDir, phase) {
  const task = readTaskYaml(taskDir);
  const taskId = task?.task_id || null;
  const eventsData = readEvents(taskDir);
  const { events } = eventsData;

  const checks = [
    { name: 'events_parse', fn: () => checkEventsParse(eventsData) },
    { name: 'snapshot_drift', fn: () => checkSnapshotDrift(task, events) },
    { name: 'authorized_stale', fn: () => checkAuthorizedStale(taskDir) },
    { name: 'dispatch_consistency', fn: () => checkDispatchPermitEventConsistency(taskDir, events) },
    { name: 'gate_decision_consistency', fn: () => checkGateDecisionEventConsistency(taskDir, events) },
    { name: 'handoffs_vs_dispatch', fn: () => checkHandoffsVsDispatch(taskDir, events) },
    { name: 'open_blockers', fn: () => checkOpenBlockers(taskDir, events, task) },
    { name: 'required_artifacts', fn: () => checkRequiredArtifacts(taskDir, events, task) },
    { name: 'completed_integrity', fn: () => checkCompletedStatusIntegrity(taskDir, events, task) },
    { name: 'manual_phase_bypass', fn: () => checkManualPhaseBypass(events) },
  ];

  const issues = [];
  const warnings = [];
  let criticalCount = 0;
  let warnCount = 0;

  for (const check of checks) {
    const result = check.fn();
    if (!result.ok) {
      const entry = { check: check.name, severity: result.severity, detail: result.detail };
      if (result.severity === 'critical') {
        criticalCount++;
        issues.push(entry);
      } else {
        warnCount++;
        warnings.push(entry);
      }
    }
  }

  const status = criticalCount > 0 ? 'critical' : (warnCount > 0 ? 'warn' : 'pass');
  const auditPhase = phase || currentPhaseFromEvents(events) || task?.current_phase || 'unknown';
  const seq = nextAuditSeq(taskDir, auditPhase);
  const checkedAt = isoNow();

  // Write YAML output
  const monitorDir = join(taskDir, 'monitor');
  mkdirSync(monitorDir, { recursive: true });
  const auditFile = join(monitorDir, `audit-incremental-${auditPhase}-${seq}.yaml`);

  const yamlLines = [
    `task_id: "${taskId || 'unknown'}"`,
    `phase: "${auditPhase}"`,
    `seq: ${seq}`,
    `since: "${latestEventTimestamp(events) || 'unknown'}"`,
    `checked_at: "${checkedAt}"`,
    `status: ${status}`,
    `critical_count: ${criticalCount}`,
    `warn_count: ${warnCount}`,
    'issues:',
    ...(issues.length > 0
      ? issues.map(i => `  - check: ${i.check}\n    severity: ${i.severity}\n    detail: "${i.detail}"`)
      : ['  []']),
    'warnings:',
    ...(warnings.length > 0
      ? warnings.map(w => `  - check: ${w.check}\n    severity: ${w.severity}\n    detail: "${w.detail}"`)
      : ['  []']),
  ];

  writeFileSync(auditFile, yamlLines.join('\n') + '\n', 'utf8');

  return {
    task_id: taskId,
    phase: auditPhase,
    seq,
    since: latestEventTimestamp(events),
    checked_at: checkedAt,
    status,
    critical_count: criticalCount,
    warn_count: warnCount,
    issues,
    warnings,
    audit_file: auditFile,
  };
}

// ── Run ──────────────────────────────────────────────────────────────────────
const result = runAudit(taskDir, phaseArg);
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'critical' ? 1 : 0);

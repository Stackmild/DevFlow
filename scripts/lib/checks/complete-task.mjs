// complete-task.mjs — Gate check: can ORC mark task as completed?
// Prevents: fake closeout (V2.0: task.yaml says completed but events missing)

import { findEvents, decisionExists, scanIssueBlockers, scanPermits } from '../state-reader.mjs';

export function check(taskDir, { events, corruptLineCount, warnings: readWarnings }) {
  const violations = [];
  const warnings = [...readWarnings];
  const checksPass = [];

  // --- Check 1: Gate 3 ACCEPT exists ---
  const gate3Exists = decisionExists(taskDir, 'gate-3.yaml') || decisionExists(taskDir, 'gate-b.yaml');
  if (!gate3Exists) {
    violations.push({ check: 'gate3_accept', severity: 'BLOCK', detail: 'No gate-3.yaml or gate-b.yaml found in decisions/' });
  } else {
    checksPass.push('gate3_accept');
  }

  // --- Check 2: phase_completed(phase_d) event exists ---
  const phaseDCompleted = findEvents(events, 'phase_completed', { phase: 'phase_d' }).length > 0;
  if (!phaseDCompleted) {
    if (corruptLineCount > 0) {
      violations.push({ check: 'phase_d_completed', severity: 'BLOCK', detail: `phase_completed(phase_d) not found; events.jsonl has ${corruptLineCount} corrupt line(s) — cannot confirm Phase D completion` });
    } else {
      violations.push({ check: 'phase_d_completed', severity: 'BLOCK', detail: 'phase_completed(phase_d) event not found in events.jsonl' });
    }
  } else {
    checksPass.push('phase_d_completed');
  }

  // --- Check 3: phase_entered(phase_f) event exists ---
  const phaseFEntered = findEvents(events, 'phase_entered', { phase: 'phase_f' }).length > 0;
  if (!phaseFEntered) {
    if (corruptLineCount > 0) {
      violations.push({ check: 'phase_f_entered', severity: 'BLOCK', detail: `phase_entered(phase_f) not found; events.jsonl has ${corruptLineCount} corrupt line(s) — cannot confirm Phase F entry` });
    } else {
      violations.push({ check: 'phase_f_entered', severity: 'BLOCK', detail: 'phase_entered(phase_f) event not found in events.jsonl' });
    }
  } else {
    checksPass.push('phase_f_entered');
  }

  // --- Check 4: No open blockers ---
  const { blockers, warnings: issueWarnings } = scanIssueBlockers(taskDir);
  warnings.push(...issueWarnings);

  if (blockers.length > 0) {
    const details = blockers.map(b => `${b.file}: severity=${b.severity}, status=${b.status}`).join('; ');
    violations.push({ check: 'no_open_blockers', severity: 'BLOCK', detail: `${blockers.length} open blocker(s): ${details}` });
  } else {
    checksPass.push('no_open_blockers');
  }

  // --- Check 5: known_gaps_collected event (WARN only) ---
  const gapsCollected = findEvents(events, 'known_gaps_collected').length > 0;
  if (!gapsCollected) {
    warnings.push('known_gaps_collected event not found — Phase F known gaps aggregation may be incomplete');
  } else {
    checksPass.push('known_gaps_collected');
  }

  // --- Check 6 (V6.0): present_gate permit for Gate 3 ---
  // Backward-compat design: if gate-3.yaml/gate-b.yaml exists but no present_gate permit,
  // this is either:
  //   (a) V5.0 legacy task — Gate 3 completed before present_gate gate was introduced
  //   (b) permit write failure — present_gate was called but .permits/ write failed silently
  //       (devflow-gate.mjs permit write is non-blocking by design)
  // In both cases the gate decision file confirms Gate 3 was legitimately passed → WARN, not BLOCK.
  // Only BLOCK when neither a gate decision file nor a permit exists (truly ungated path).
  const permits = scanPermits(taskDir);
  const hasGate3Permit = permits.some(p => p.startsWith('present_gate-gate-3-'));
  const hasGateBPermit = permits.some(p => p.startsWith('present_gate-gate-b-'));
  const hasAnyPresentGatePermit = hasGate3Permit || hasGateBPermit;
  if (!hasAnyPresentGatePermit) {
    if (gate3Exists) {
      // Gate decision confirmed present: legacy path or permit write failure — degrade to WARN
      warnings.push(
        'present_gate permit for Gate 3 not found in .permits/ — ' +
        'V5.0 legacy task or permit write failure (gate-3.yaml present, Gate 3 decision confirmed)'
      );
    } else {
      // No gate decision AND no permit: genuinely ungated — BLOCK
      violations.push({
        check: 'present_gate_permit',
        severity: 'BLOCK',
        detail: 'No present_gate permit and no gate-3.yaml found — Gate 3 must be both presented through devflow-gate present_gate and recorded before task completion',
      });
    }
  } else {
    checksPass.push('present_gate_permit');
  }

  // --- Check 7 (V6.0): dispatch permit count vs skill_dispatched events (WARN only) ---
  // Flags cases where skill_dispatched events outnumber dispatch_skill permits,
  // indicating some dispatches bypassed the gate. WARN (not BLOCK) because permit
  // files could be missing due to .permits/ write failure (non-blocking per V5.0 design).
  const dispatchPermits = permits.filter(p => p.startsWith('dispatch_skill-'));
  const dispatchEvents = events.filter(e => e.event_type === 'skill_dispatched');
  if (dispatchPermits.length < dispatchEvents.length) {
    warnings.push(
      `dispatch_skill permits (${dispatchPermits.length}) < skill_dispatched events (${dispatchEvents.length}) — ` +
      'some dispatches may have bypassed the gate or permit write failed'
    );
  } else {
    checksPass.push('dispatch_permit_count');
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    action: 'complete_task',
    params: {},
    ...(allowed
      ? { checks_passed: checksPass }
      : { reason: violations.map(v => v.detail).join('; '), violations }),
    warnings,
  };
}

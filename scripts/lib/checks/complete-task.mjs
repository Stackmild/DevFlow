// complete-task.mjs — Gate check: can ORC mark task as completed?
// Prevents: fake closeout (V2.0: task.yaml says completed but events missing)

import { findEvents, decisionExists, scanIssueBlockers } from '../state-reader.mjs';

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

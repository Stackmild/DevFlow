// transition.mjs — Atomic phase transition: validate + write events + update task.yaml
// Replaces 5+ discrete LLM writes with a single command call.

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  findEvents,
  currentPhaseFromEvents,
  decisionExists,
  appendEvents,
  updateTaskYamlFields,
  parseSimpleYaml,
} from '../state-reader.mjs';

const PHASE_ORDER = { phase_a: 1, phase_b: 2, phase_c: 3, phase_d: 4, phase_f: 5 };

const GATE_FOR_PHASE = {
  phase_c: [['gate-1.yaml', 'gate-1']],
  phase_d: [['gate-2.yaml', 'gate-2'], ['gate-2-skip.yaml', 'gate-2-skip']],
  phase_f: [['gate-3.yaml', 'gate-3'], ['gate-b.yaml', 'gate-b']],
};

const BACKFLOW = { ADJUST: 'phase_b', RESCOPE: 'phase_c', REVISE: 'phase_d' };

export function check(taskDir, fromPhase, toPhase, { events, warnings: readWarnings }) {
  const violations = [];
  const warnings = [...readWarnings];
  const checksPass = [];
  const from = fromPhase.startsWith('phase_') ? fromPhase : `phase_${fromPhase}`;
  const to = toPhase.startsWith('phase_') ? toPhase : `phase_${toPhase}`;

  // T-1: Both phases must be known
  if (!PHASE_ORDER[from] || !PHASE_ORDER[to]) {
    return {
      allowed: false, action: 'transition', params: { from_phase: from, to_phase: to },
      reason: `Unknown phase: from=${from}, to=${to}`,
      violations: [{ check: 'valid_phases', severity: 'BLOCK', detail: `Both phases must be in [${Object.keys(PHASE_ORDER).join(', ')}]` }],
      warnings,
    };
  }

  // T-2: Direction check (forward or legal backflow)
  const isForward = PHASE_ORDER[to] > PHASE_ORDER[from];
  let isLegalBackflow = false;
  if (!isForward) {
    const gateDecisions = findEvents(events, 'gate_decision');
    for (const gd of gateDecisions) {
      const decision = gd.payload?.decision?.toUpperCase();
      if (BACKFLOW[decision] === to) { isLegalBackflow = true; break; }
    }
    if (!isLegalBackflow && to === 'phase_d') {
      const continuations = findEvents(events, 'continuation_initiated');
      if (continuations.some(c => c.payload?.type === 're_enter_d')) isLegalBackflow = true;
    }
  }
  if (!isForward && !isLegalBackflow) {
    violations.push({ check: 'direction', severity: 'BLOCK', detail: `Backward transition ${from}→${to} without legal backflow (ADJUST/RESCOPE/REVISE/re_enter_d)` });
  } else {
    checksPass.push('direction');
  }

  // T-3: Current phase matches fromPhase
  const currentPhase = currentPhaseFromEvents(events);
  if (currentPhase && currentPhase !== from) {
    violations.push({ check: 'current_phase_match', severity: 'BLOCK', detail: `Current phase from events is ${currentPhase}, not ${from}` });
  } else if (!currentPhase) {
    warnings.push(`No phase_entered event found — assuming ${from} is correct`);
    checksPass.push('current_phase_match');
  } else {
    checksPass.push('current_phase_match');
  }

  // T-4: Gate decision exists for target phase (forward only)
  if (isForward) {
    const gateFiles = GATE_FOR_PHASE[to];
    if (gateFiles) {
      const gateFound = gateFiles.some(([file]) => decisionExists(taskDir, file));
      if (!gateFound) {
        violations.push({ check: 'gate_decision', severity: 'BLOCK', detail: `Gate decision required for ${to}: need one of [${gateFiles.map(g => g[0]).join(', ')}]` });
      } else {
        checksPass.push('gate_decision');
      }
    } else {
      checksPass.push('gate_decision');
    }
  } else {
    checksPass.push('gate_decision');
  }

  // T-5: No duplicate transition (phase_completed for fromPhase should not already exist for forward)
  if (isForward) {
    const alreadyCompleted = findEvents(events, 'phase_completed', { phase: from });
    if (alreadyCompleted.length > 0) {
      violations.push({ check: 'no_duplicate', severity: 'BLOCK', detail: `phase_completed(${from}) already recorded — transition already happened` });
    } else {
      checksPass.push('no_duplicate');
    }
  } else {
    checksPass.push('no_duplicate');
  }

  if (violations.length > 0) {
    return {
      allowed: false, action: 'transition', params: { from_phase: from, to_phase: to },
      reason: violations.map(v => v.detail).join('; '), violations, warnings,
    };
  }

  // ── All checks passed — atomic write ──
  const now = new Date().toISOString();
  appendEvents(taskDir, [
    { event_type: 'phase_completed', payload: { phase: from }, timestamp: now, source: 'devflow-gate-transition' },
    { event_type: 'phase_entered', payload: { phase: to }, timestamp: now, source: 'devflow-gate-transition' },
  ]);

  const taskYaml = parseSimpleYaml(readFileSync(join(taskDir, 'task.yaml'), 'utf8'));
  const completedPhases = taskYaml.completed_phases ? `${taskYaml.completed_phases},${from}` : from;
  updateTaskYamlFields(taskDir, { current_phase: to, completed_phases: completedPhases });

  return {
    allowed: true, action: 'transition', params: { from_phase: from, to_phase: to },
    checks_passed: checksPass, warnings,
    wrote: { events: ['phase_completed', 'phase_entered'], task_yaml: ['current_phase', 'completed_phases'] },
  };
}

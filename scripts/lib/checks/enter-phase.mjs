// enter-phase.mjs — Gate check: can ORC enter this phase?
// Prevents: phase skip (V2.1 disaster)

import { findEvents, currentPhaseFromEvents, decisionExists, readTaskYaml } from '../state-reader.mjs';

const PHASE_ORDER = { phase_a: 1, phase_b: 2, phase_c: 3, phase_d: 4, phase_f: 5 };
const PREDECESSOR = { phase_b: 'phase_a', phase_c: 'phase_b', phase_d: 'phase_c', phase_f: 'phase_d' };
const GATE_FOR_PHASE = {
  phase_c: [['gate-1.yaml', 'gate-1']],
  phase_d: [['gate-2.yaml', 'gate-2'], ['gate-2-skip.yaml', 'gate-2-skip']],
  phase_f: [['gate-3.yaml', 'gate-3'], ['gate-b.yaml', 'gate-b']],
};

// Legal backflow: gate decisions that allow re-entering an earlier phase
const BACKFLOW = {
  ADJUST: 'phase_b',
  RESCOPE: 'phase_c',
  REVISE: 'phase_d',
};

export function check(taskDir, targetPhase, { events, corruptLineCount, warnings: readWarnings }) {
  const violations = [];
  const warnings = [...readWarnings];
  const checksPass = [];

  // Normalize phase name
  const phase = targetPhase.startsWith('phase_') ? targetPhase : `phase_${targetPhase}`;

  if (!PHASE_ORDER[phase]) {
    return { allowed: false, reason: `Unknown phase: ${phase}`, violations: [{ check: 'valid_phase', severity: 'BLOCK', detail: `Phase ${phase} not in known phases` }], warnings };
  }

  // --- Check 1+2: Predecessor completed or skipped ---
  const pred = PREDECESSOR[phase];
  if (pred) {
    const predCompleted = findEvents(events, 'phase_completed', { phase: pred }).length > 0;
    const predSkipped = decisionExists(taskDir, `phase-skip-${pred}`);

    if (!predCompleted && !predSkipped) {
      // Check if this is corrupt-line-affected
      if (corruptLineCount > 0) {
        violations.push({ check: 'predecessor_complete', severity: 'BLOCK', detail: `No phase_completed(${pred}) found; events.jsonl has ${corruptLineCount} corrupt line(s) — cannot confirm predecessor completion` });
      } else {
        violations.push({ check: 'predecessor_complete', severity: 'BLOCK', detail: `No phase_completed(${pred}) in events.jsonl and no phase-skip-${pred} in decisions/` });
      }
    } else {
      checksPass.push('predecessor_complete');
    }
  } else {
    checksPass.push('predecessor_complete'); // phase_a has no predecessor
  }

  // --- Check 3: Gate decision exists ---
  const gateFiles = GATE_FOR_PHASE[phase];
  if (gateFiles) {
    const gateFound = gateFiles.some(([file]) => decisionExists(taskDir, file));
    if (!gateFound) {
      violations.push({ check: 'gate_exists', severity: 'BLOCK', detail: `Required gate decision not found for ${phase}: need one of [${gateFiles.map(g => g[0]).join(', ')}]` });
    } else {
      checksPass.push('gate_exists');
    }
  } else {
    checksPass.push('gate_exists'); // phase_a/phase_b don't need prior gate
  }

  // --- Check 3.5: phase-specific artifact prerequisites (hard block) ---
  const artifacts = findEvents(events, 'artifact_written');
  const taskYaml = readTaskYaml(taskDir) || {};
  if (phase === 'phase_b') {
    const hasTaskBrief = decisionExists(taskDir, 'task-brief.md') || artifacts.some(a => a.payload?.artifact === 'task-brief.md') || Boolean(taskYaml.task_brief_ready);
    if (!hasTaskBrief) {
      violations.push({ check: 'phase_b_artifact', severity: 'BLOCK', detail: 'task-brief artifact not found — Phase B must produce task-brief before entering later phases' });
    } else {
      checksPass.push('phase_b_artifact');
    }
  }
  if (phase === 'phase_c') {
    const hasProductSpec = decisionExists(taskDir, 'product-spec.md') || artifacts.some(a => a.payload?.artifact === 'product-spec.md') || Boolean(taskYaml.product_spec_ready);
    if (!hasProductSpec) {
      violations.push({ check: 'phase_c_artifact', severity: 'BLOCK', detail: 'product-spec artifact not found — Phase C requires product-spec before design work' });
    } else {
      checksPass.push('phase_c_artifact');
    }
    const hasDesignSpec = decisionExists(taskDir, 'DESIGN-SPEC.md') || decisionExists(taskDir, 'design-spec.md') || Boolean(taskYaml.design_spec_ready);
    if (!hasDesignSpec) {
      warnings.push('design spec not found — Phase C can proceed, but design context may be incomplete');
    } else {
      checksPass.push('phase_c_design_spec');
    }
  }
  if (phase === 'phase_d') {
    const hasScope = decisionExists(taskDir, 'implementation-scope.md') || artifacts.some(a => /^implementation-scope.*\.md$/.test(a.payload?.artifact || '')) || Boolean(taskYaml.implementation_scope_ready);
    if (!hasScope) {
      violations.push({ check: 'phase_d_artifact', severity: 'BLOCK', detail: 'implementation-scope artifact not found — Phase D requires implementation-scope before execution' });
    } else {
      checksPass.push('phase_d_artifact');
    }
    const hasChangePackage = decisionExists(taskDir, 'change-package.yaml') || artifacts.some(a => /^change-package-.*\.yaml$/.test(a.payload?.artifact || '')) || Boolean(taskYaml.change_package_ready);
    if (!hasChangePackage) {
      violations.push({ check: 'phase_d_change_package', severity: 'BLOCK', detail: 'change-package artifact not found — Phase D requires change-package before execution' });
    } else {
      checksPass.push('phase_d_change_package');
    }
  }

  // --- Check 4: No regression (unless legal backflow) ---
  const currentPhase = currentPhaseFromEvents(events);
  if (currentPhase && PHASE_ORDER[currentPhase] && PHASE_ORDER[phase] < PHASE_ORDER[currentPhase]) {
    // Regression detected — check if legal backflow
    let backflowAllowed = false;

    // Check gate decision backflow (ADJUST/RESCOPE/REVISE)
    const gateDecisions = findEvents(events, 'gate_decision');
    for (const gd of gateDecisions) {
      const decision = gd.payload?.decision?.toUpperCase();
      if (BACKFLOW[decision] === phase) {
        backflowAllowed = true;
        break;
      }
    }

    // Check continuation re-enter
    if (!backflowAllowed && phase === 'phase_d') {
      const continuations = findEvents(events, 'continuation_initiated');
      if (continuations.some(c => c.payload?.type === 're_enter_d')) {
        backflowAllowed = true;
      }
    }

    if (!backflowAllowed) {
      violations.push({ check: 'no_regression', severity: 'BLOCK', detail: `Phase regression: current=${currentPhase}, target=${phase}. No legal backflow (ADJUST/RESCOPE/REVISE/re_enter_d) found.` });
    } else {
      checksPass.push('no_regression');
    }
  } else {
    checksPass.push('no_regression');
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    action: 'enter_phase',
    params: { phase },
    ...(allowed
      ? { checks_passed: checksPass }
      : { reason: violations.map(v => v.detail).join('; '), violations }),
    warnings,
  };
}

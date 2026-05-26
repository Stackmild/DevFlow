// enter-phase.mjs — Gate check: can ORC enter this phase?
// Prevents: phase skip (V2.1 disaster)

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { findEvents, currentPhaseFromEvents, decisionExists, readTaskYaml } from '../state-reader.mjs';
import { normalizePhase } from '../phase-aliases.mjs';

const PHASE_ORDER = { phase_a: 1, phase_b: 2, phase_c: 3, phase_d_1: 4, phase_d_2: 5, phase_d_3: 6, phase_f: 7 };
const PREDECESSOR = { phase_b: 'phase_a', phase_c: 'phase_b', phase_d_1: 'phase_c', phase_d_2: 'phase_d_1', phase_d_3: 'phase_d_2', phase_f: 'phase_d_3' };
const GATE_FOR_PHASE = {
  phase_c: [['gate-1.yaml', 'gate-1']],
  phase_d_1: [['gate-2.yaml', 'gate-2'], ['gate-2-skip.yaml', 'gate-2-skip']],
  phase_f: [['gate-3.yaml', 'gate-3'], ['gate-b.yaml', 'gate-b']],
};

// Legal backflow: gate decisions that allow re-entering an earlier phase
const BACKFLOW = {
  ADJUST: 'phase_b',
  RESCOPE: 'phase_c',
  REVISE: 'phase_d_1',
};

export function check(taskDir, targetPhase, { events, corruptLineCount, warnings: readWarnings }) {
  const violations = [];
  const warnings = [...readWarnings];
  const checksPass = [];

  // Normalize phase name (legacy alias → canonical)
  const phase = normalizePhase(targetPhase.startsWith('phase_') ? targetPhase : `phase_${targetPhase}`);

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
  const artifactsDir = join(taskDir, 'artifacts');
  const artifactExists = (file) => existsSync(join(artifactsDir, file));
  const artifactMatches = (pattern) => existsSync(artifactsDir) && readdirSync(artifactsDir).some(f => pattern.test(f));
  if (phase === 'phase_b') {
    const hasTaskBrief = artifactExists('task-brief.md');
    if (!hasTaskBrief) {
      violations.push({ check: 'phase_b_artifact', severity: 'BLOCK', detail: 'artifacts/task-brief.md not found — Phase B must produce task-brief before entering later phases' });
    } else {
      checksPass.push('phase_b_artifact');
    }
    // Consistency warning if events/yaml claim the file exists but it does not
    if (!hasTaskBrief && (artifacts.some(a => a.payload?.artifact === 'task-brief.md') || Boolean(taskYaml.task_brief_ready))) {
      warnings.push('events.jsonl or task.yaml claims task-brief.md exists but file not found on disk — state inconsistency');
    }
  }
  if (phase === 'phase_c') {
    const hasProductSpec = artifactExists('product-spec.md');
    if (!hasProductSpec) {
      violations.push({ check: 'phase_c_artifact', severity: 'BLOCK', detail: 'artifacts/product-spec.md not found — Phase C requires product-spec before design work' });
    } else {
      checksPass.push('phase_c_artifact');
    }
    if (!hasProductSpec && (artifacts.some(a => a.payload?.artifact === 'product-spec.md') || Boolean(taskYaml.product_spec_ready))) {
      warnings.push('events.jsonl or task.yaml claims product-spec.md exists but file not found on disk — state inconsistency');
    }
    const hasDesignSpec = artifactExists('DESIGN-SPEC.md') || artifactExists('design-spec.md');
    if (!hasDesignSpec) {
      warnings.push('design spec not found — Phase C can proceed, but design context may be incomplete');
    } else {
      checksPass.push('phase_c_design_spec');
    }
  }
  if (phase === 'phase_d_1') {
    const hasScope = artifactMatches(/^implementation-scope.*\.md$/);
    if (!hasScope) {
      violations.push({ check: 'phase_d1_artifact', severity: 'BLOCK', detail: 'implementation-scope artifact not found in artifacts/ — Phase D.1 requires implementation-scope before execution' });
    } else {
      checksPass.push('phase_d1_artifact');
    }
    if (!hasScope && (artifacts.some(a => /^implementation-scope.*\.md$/.test(a.payload?.artifact || '')) || Boolean(taskYaml.implementation_scope_ready))) {
      warnings.push('events.jsonl or task.yaml claims implementation-scope exists but file not found on disk — state inconsistency');
    }
  }
  if (phase === 'phase_d_2') {
    const hasChangePackage = artifactMatches(/^change-package-.*\.yaml$/) || artifactExists('change-package.yaml');
    if (!hasChangePackage) {
      violations.push({ check: 'phase_d2_artifact', severity: 'BLOCK', detail: 'change-package artifact not found in artifacts/ — Phase D.2 requires change-package before review' });
    } else {
      checksPass.push('phase_d2_artifact');
    }
    if (!hasChangePackage && (artifacts.some(a => /^change-package-.*\.yaml$/.test(a.payload?.artifact || '')) || Boolean(taskYaml.change_package_ready))) {
      warnings.push('events.jsonl or task.yaml claims change-package exists but file not found on disk — state inconsistency');
    }
  }

  // --- Check 4: No regression (unless legal backflow) ---
  const currentPhase = currentPhaseFromEvents(events);

  // --- Check 4.5: project_path empty warning (external project P2 match) ---
  if (phase === 'phase_a' || phase === 'phase_b') {
    if (!taskYaml.project_path && taskYaml.devflow_root && taskYaml.devflow_root !== process.cwd()) {
      warnings.push(
        'project_path 为空且 devflow_root 指向外部目录 — enforcer P2 路径匹配将失败，' +
        '建议在 task.yaml 中填写 project_path 指向项目根目录'
      );
    }
  }

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
    if (!backflowAllowed && phase === 'phase_d_1') {
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

// dispatch-skill.mjs — Gate check: can ORC dispatch this skill?
// Prevents: dispatching reviewer without change-package, FSD without implementation-scope
// V6.0: new action for devflow-gate.mjs (Layer-2 upgrade)

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { findEvents, decisionExists } from '../state-reader.mjs';

// --- Prerequisite matrix (hardcoded contract) ---
// Convention: decision names use .yaml suffix to match decisionExists() canonical form.
const PREREQS = {
  'full-stack-developer': {
    check: 'artifact_glob',
    dir: 'artifacts',
    glob: /^implementation-scope.*\.md$/,
    detail: 'implementation-scope*.md not found in artifacts/ — implementation-scope must exist before dispatching FSD',
  },
  'code-reviewer': {
    check: 'artifact_glob',
    dir: 'artifacts',
    glob: /^change-package-.*\.yaml$/,
    detail: 'change-package-*.yaml not found in artifacts/ — change-package must exist before dispatching code-reviewer',
  },
  'webapp-consistency-audit': {
    check: 'artifact_glob',
    dir: 'artifacts',
    glob: /^change-package-.*\.yaml$/,
    detail: 'change-package-*.yaml not found in artifacts/ — change-package must exist before dispatching webapp-consistency-audit',
  },
  'pre-release-test-reviewer': {
    check: 'artifact_glob',
    dir: 'artifacts',
    glob: /^change-package-.*\.yaml$/,
    detail: 'change-package-*.yaml not found in artifacts/ — change-package must exist before dispatching pre-release-test-reviewer',
  },
  'release-and-change-manager': {
    check: 'artifact_glob',
    dir: 'artifacts',
    glob: /^change-package-.*\.yaml$/,
    detail: 'change-package-*.yaml not found in artifacts/ — change-package must exist before dispatching release-and-change-manager',
  },
  'state-auditor': {
    check: 'event',
    event_type: 'phase_completed',
    payload: { phase: 'phase_d' },
    detail: 'phase_completed(phase_d) event not found — Phase D must complete before dispatching state-auditor',
  },
  'product-manager': {
    check: 'artifact_exact',
    dir: 'artifacts',
    file: 'task-brief.md',
    detail: 'artifacts/task-brief.md not found — task-brief must exist before dispatching product-manager',
  },
  // Design skills: all require Gate 1 decision (gate-1.yaml, with .yaml suffix per decisionExists contract)
  'web-app-architect':            { check: 'decision', name: 'gate-1.yaml', detail: 'gate-1.yaml not found in decisions/ — Gate 1 must pass before dispatching design skills' },
  'frontend-design':              { check: 'decision', name: 'gate-1.yaml', detail: 'gate-1.yaml not found in decisions/ — Gate 1 must pass before dispatching design skills' },
  'backend-data-api':             { check: 'decision', name: 'gate-1.yaml', detail: 'gate-1.yaml not found in decisions/ — Gate 1 must pass before dispatching design skills' },
  'webapp-interaction-designer':  { check: 'decision', name: 'gate-1.yaml', detail: 'gate-1.yaml not found in decisions/ — Gate 1 must pass before dispatching design skills' },
  'component-library-maintainer': { check: 'decision', name: 'gate-1.yaml', detail: 'gate-1.yaml not found in decisions/ — Gate 1 must pass before dispatching component-library-maintainer' },
};

const KNOWN_SKILLS = Object.keys(PREREQS);

export function check(taskDir, skill, phase, { events, warnings: readWarnings }) {
  const violations = [];
  const warnings = [...readWarnings];
  const checksPass = [];

  // --- Check 0: Known skill ---
  // Unknown skills pass through with a warning — new skills added to DevFlow don't break the gate
  if (!KNOWN_SKILLS.includes(skill)) {
    warnings.push(`Unknown skill "${skill}" — no prerequisite checks defined for this skill, allowing dispatch`);
    return {
      allowed: true,
      action: 'dispatch_skill',
      params: { skill, phase },
      checks_passed: ['unknown_skill_passthrough'],
      warnings,
    };
  }

  // --- Check 1: Prerequisite artifact / event / decision ---
  const prereq = PREREQS[skill];

  switch (prereq.check) {
    case 'artifact_glob': {
      const dir = join(taskDir, prereq.dir);
      if (!existsSync(dir)) {
        violations.push({ check: 'prerequisite_artifact', severity: 'BLOCK', detail: prereq.detail });
        break;
      }
      const found = readdirSync(dir).some(f => prereq.glob.test(f));
      if (!found) {
        violations.push({ check: 'prerequisite_artifact', severity: 'BLOCK', detail: prereq.detail });
      } else {
        checksPass.push('prerequisite_artifact');
      }
      break;
    }
    case 'artifact_exact': {
      const filePath = join(taskDir, prereq.dir, prereq.file);
      if (!existsSync(filePath)) {
        violations.push({ check: 'prerequisite_artifact', severity: 'BLOCK', detail: prereq.detail });
      } else {
        checksPass.push('prerequisite_artifact');
      }
      break;
    }
    case 'event': {
      const found = findEvents(events, prereq.event_type, prereq.payload).length > 0;
      if (!found) {
        violations.push({ check: 'prerequisite_event', severity: 'BLOCK', detail: prereq.detail });
      } else {
        checksPass.push('prerequisite_event');
      }
      break;
    }
    case 'decision': {
      // Pass name with .yaml suffix — matches decisionExists() canonical form
      if (!decisionExists(taskDir, prereq.name)) {
        violations.push({ check: 'prerequisite_decision', severity: 'BLOCK', detail: prereq.detail });
      } else {
        checksPass.push('prerequisite_decision');
      }
      break;
    }
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    action: 'dispatch_skill',
    params: { skill, phase },
    ...(allowed
      ? { checks_passed: checksPass }
      : { reason: violations.map(v => v.detail).join('; '), violations }),
    warnings,
  };
}

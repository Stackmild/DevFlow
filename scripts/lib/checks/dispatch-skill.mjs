// dispatch-skill.mjs — Gate check: can ORC dispatch this skill?
// Prevents: dispatching reviewer without change-package, FSD without implementation-scope
// V6.0: new action for devflow-gate.mjs (Layer-2 upgrade)

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { findEvents, decisionExists } from '../state-reader.mjs';

/**
 * Read the latest change-package YAML from artifacts/ and check if scope_flags.ui = true.
 * Returns true if ui flag is explicitly set to true, false otherwise (including if no file found).
 * Uses regex — no YAML parser needed, zero deps.
 */
function changePackageHasUiFlag(taskDir) {
  const artifactsDir = join(taskDir, 'artifacts');
  if (!existsSync(artifactsDir)) return false;
  const cpFiles = readdirSync(artifactsDir)
    .filter(f => /^change-package-.*\.yaml$/.test(f))
    .sort()
    .reverse(); // highest revision_seq first
  if (cpFiles.length === 0) return false;
  try {
    const content = readFileSync(join(artifactsDir, cpFiles[0]), 'utf8');
    // Match: scope_flags: ... ui: true  (within ~300 chars of scope_flags key)
    return /scope_flags[\s\S]{0,300}ui:\s*true/m.test(content);
  } catch {
    return false;
  }
}

/**
 * Check if scope_flags uses canonical field names (ui, interaction, data_model, schema, api).
 * Returns { valid: boolean, detail: string|null }.
 */
const CANONICAL_SCOPE_FLAGS = ['ui', 'interaction', 'data_model', 'schema', 'api'];

function checkScopeFlagsCanonical(taskDir) {
  const artifactsDir = join(taskDir, 'artifacts');
  if (!existsSync(artifactsDir)) return { valid: true, detail: null };
  const cpFiles = readdirSync(artifactsDir)
    .filter(f => /^change-package-.*\.yaml$/.test(f))
    .sort()
    .reverse();
  if (cpFiles.length === 0) return { valid: true, detail: null };
  try {
    const content = readFileSync(join(artifactsDir, cpFiles[0]), 'utf8');
    const sfMatch = content.match(/^scope_flags:\s*\n((?:[ \t]+\S.*\n?)*)/m);
    if (!sfMatch) return { valid: false, detail: 'scope_flags block not found in change-package' };
    const sfBlock = sfMatch[1];
    const foundKeys = [...sfBlock.matchAll(/^\s+(\w+):/gm)].map(m => m[1]);
    const missing = CANONICAL_SCOPE_FLAGS.filter(k => !foundKeys.includes(k));
    const extra = foundKeys.filter(k => !CANONICAL_SCOPE_FLAGS.includes(k));
    if (missing.length > 0 || extra.length > 0) {
      return {
        valid: false,
        detail: `scope_flags uses non-canonical keys — missing: [${missing.join(', ')}], extra: [${extra.join(', ')}]. ` +
                `Canonical keys are: ${CANONICAL_SCOPE_FLAGS.join(', ')}`,
      };
    }
    return { valid: true, detail: null };
  } catch {
    return { valid: true, detail: null };
  }
}

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

  // --- Check 1.5 (Schema Signal Patch): scope_flags canonical field name validation ---
  // Canonical keys: ui, interaction, data_model, schema, api (per change-package.md)
  // Non-canonical names (has_frontend_changes etc.) → WARN
  const REVIEWER_LIKE = ['code-reviewer', 'webapp-consistency-audit', 'pre-release-test-reviewer'];
  if (REVIEWER_LIKE.includes(skill) && violations.length === 0) {
    const sfResult = checkScopeFlagsCanonical(taskDir);
    if (sfResult.valid) {
      checksPass.push('scope_flags_canonical');
    } else {
      warnings.push(`scope_flags canonical check: ${sfResult.detail}`);
    }
  }

  // --- Check 2 (V6.0): scope_flags.ui routing check for code-reviewer ---
  // When code-reviewer is dispatched and change-package scope_flags.ui=true,
  // webapp-consistency-audit should also be dispatched (PFL-017: dark-mode-001 retrospective).
  // WARN only — code-reviewer dispatch is not blocked; this is a routing reminder.
  if (skill === 'code-reviewer' && violations.length === 0) {
    if (changePackageHasUiFlag(taskDir)) {
      warnings.push(
        'change-package scope_flags.ui=true detected — webapp-consistency-audit should also be dispatched for this UI change ' +
        '(PFL-017: large UI/theme/layout changes require consistency audit; omitting it caused Known Gaps in dark-mode-001)'
      );
    } else {
      checksPass.push('scope_flags_ui_check');
    }
  }

  // --- Check 3: Design refs awareness for FSD dispatch (two-stage trigger) ---
  // Stage 1: scope mentions UI content.
  // Stage 2: project has design files (DESIGN-SPEC.md or design/ dir) but scope lacks a
  //          "设计规范参考" section — meaning design context won't reach FSD.
  // Does NOT fire for projects without design files → no false positives on design-less repos.
  // Severity: WARN (dispatch not blocked; ORC can still add refs to handoff before spawning FSD).
  if (skill === 'full-stack-developer' && violations.length === 0) {
    const scopeFiles = existsSync(join(taskDir, 'artifacts'))
      ? readdirSync(join(taskDir, 'artifacts')).filter(f => /^implementation-scope.*\.md$/.test(f))
      : [];
    if (scopeFiles.length > 0) {
      try {
        const scopeContent = readFileSync(join(taskDir, 'artifacts', scopeFiles[0]), 'utf8');
        const mentionsUI = /front.?end|前端|UI|页面|component|组件|css|style|tailwind/i.test(scopeContent);
        const hasDesignRefSection = /设计规范参考|must_read_refs|DESIGN.SPEC/i.test(scopeContent);
        if (mentionsUI && !hasDesignRefSection) {
          // Stage 2: bounded discovery — check if project actually has design files
          let projectPath = null;
          const taskYaml = join(taskDir, 'task.yaml');
          if (existsSync(taskYaml)) {
            const tc = readFileSync(taskYaml, 'utf8');
            const ppMatch = tc.match(/project_path:\s*["']?([^\n"']+)/);
            if (ppMatch) projectPath = ppMatch[1].trim();
          }
          if (projectPath && (existsSync(join(projectPath, 'DESIGN-SPEC.md')) || existsSync(join(projectPath, 'design')))) {
            warnings.push(
              'implementation-scope mentions UI content and project has design files (DESIGN-SPEC.md / design/), ' +
              'but scope has no "设计规范参考" section — FSD will lack design context. ' +
              'Ensure handoff includes project_design_context.must_read_refs ' +
              '(PFL-029: FSD ignored 9 design files in amhub-ac-v22 → 13+ post-Gate3 fixes)'
            );
          }
        } else if (mentionsUI && hasDesignRefSection) {
          checksPass.push('design_refs_in_scope');
        }
      } catch { /* non-fatal — scope read failure does not block dispatch */ }
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

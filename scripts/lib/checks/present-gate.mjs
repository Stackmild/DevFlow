// present-gate.mjs — Gate check: can ORC present a Human Gate?
// Prevents: showing Gate without pre-gate self-check evidence, or without upstream dispatch permits
// V6.0: new action for devflow-gate.mjs (Layer-2 upgrade)

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { decisionExists, scanPermits, readTaskYaml } from '../state-reader.mjs';

// Canonical reviewer skill names — used for Gate 3 report glob AND permit checks.
// Only these skills produce *-report.yaml artifacts per review-report.md schema.
// Using an explicit list prevents `implementation-report.yaml` or other non-review
// artifacts from falsely satisfying the Gate 3 review report check.
const REVIEWER_SKILLS = [
  'code-reviewer',
  'webapp-consistency-audit',
  'pre-release-test-reviewer',
  'playwright-e2e-testing',
];

// Glob for review report artifacts: {reviewer}-report.yaml
// playwright-e2e-testing uses a non-standard filename (e2e-visual-test-report.yaml)
const REVIEWER_REPORT_ALIASES = {
  'playwright-e2e-testing': 'e2e-visual-test-report.yaml',
};
function isReviewerReport(filename) {
  if (REVIEWER_SKILLS.some(skill => filename === `${skill}-report.yaml`)) return true;
  return Object.values(REVIEWER_REPORT_ALIASES).includes(filename);
}

export function check(taskDir, gate, { warnings: readWarnings }) {
  const violations = [];
  const warnings = [...readWarnings];
  const checksPass = [];
  const gateNum = String(gate);

  // Validate gate number up front
  if (!['1', '2', '3'].includes(gateNum)) {
    return {
      allowed: false,
      action: 'present_gate',
      params: { gate: gateNum },
      reason: `Unknown gate number: ${gateNum}`,
      violations: [{ check: 'valid_gate', severity: 'BLOCK', detail: `Gate must be 1, 2, or 3 — got: ${gateNum}` }],
      warnings,
    };
  }

  // --- Check 1: pre-gate-check-{N}.yaml exists in decisions/ ---
  // Convention: pass filename with .yaml to match decisionExists() canonical form
  const preGateFile = `pre-gate-check-${gateNum}.yaml`;
  if (!decisionExists(taskDir, preGateFile)) {
    violations.push({
      check: 'pre_gate_check_exists',
      severity: 'BLOCK',
      detail: `decisions/${preGateFile} not found — run pre-gate self-check and write the decision file before presenting Gate ${gateNum}`,
    });
  } else {
    checksPass.push('pre_gate_check_exists');
  }

  const taskYaml = readTaskYaml(taskDir) || {};

  // --- Check 2: Gate-specific required artifacts ---
  const artifactsDir = join(taskDir, 'artifacts');
  const artifactsExist = existsSync(artifactsDir);

  if (gateNum === '1') {
    // Gate 1: product-spec.md must exist
    const hasSpec = artifactsExist && existsSync(join(artifactsDir, 'product-spec.md')) || Boolean(taskYaml.product_spec_ready);
    if (!hasSpec) {
      violations.push({ check: 'gate_artifact', severity: 'BLOCK', detail: 'artifacts/product-spec.md not found — PM must produce product-spec before Gate 1' });
    } else {
      checksPass.push('gate_artifact_product_spec');
    }
    const hasBrief = artifactsExist && existsSync(join(artifactsDir, 'task-brief.md')) || Boolean(taskYaml.task_brief_ready);
    if (!hasBrief) {
      violations.push({ check: 'gate_artifact_task_brief', severity: 'BLOCK', detail: 'artifacts/task-brief.md not found — task-brief must exist before Gate 1' });
    } else {
      checksPass.push('gate_artifact_task_brief');
    }
  } else if (gateNum === '2') {
    // Gate 2: implementation-scope*.md OR gate-2-skip.yaml
    const hasScope = artifactsExist && readdirSync(artifactsDir).some(f => /^implementation-scope.*\.md$/.test(f)) || Boolean(taskYaml.implementation_scope_ready);
    const hasSkip = decisionExists(taskDir, 'gate-2-skip.yaml');
    if (!hasScope && !hasSkip) {
      violations.push({ check: 'gate_artifact', severity: 'BLOCK', detail: 'Neither implementation-scope*.md in artifacts/ nor gate-2-skip.yaml in decisions/ found' });
    } else {
      checksPass.push('gate_artifact_scope_or_skip');
    }
    const hasProductSpec = artifactsExist && existsSync(join(artifactsDir, 'product-spec.md')) || Boolean(taskYaml.product_spec_ready);
    if (!hasProductSpec) {
      violations.push({ check: 'gate_artifact_product_spec', severity: 'BLOCK', detail: 'artifacts/product-spec.md not found — product-spec must exist before Gate 2' });
    } else {
      checksPass.push('gate_artifact_product_spec');
    }
  } else if (gateNum === '3') {
    // Gate 3: implementation-scope, design context, change-package, and reviewer report
    const hasScope = artifactsExist && readdirSync(artifactsDir).some(f => /^implementation-scope.*\.md$/.test(f)) || Boolean(taskYaml.implementation_scope_ready);
    if (!hasScope) {
      violations.push({ check: 'gate_artifact_scope', severity: 'BLOCK', detail: 'implementation-scope artifact not found — Gate 3 requires implementation-scope context before presentation' });
    } else {
      checksPass.push('gate_artifact_scope');
    }
    const hasDesign = artifactsExist && (existsSync(join(artifactsDir, 'DESIGN-SPEC.md')) || existsSync(join(artifactsDir, 'design-spec.md'))) || Boolean(taskYaml.design_spec_ready);
    if (!hasDesign) {
      warnings.push('design spec not found — Gate 3 can proceed, but design context may be incomplete');
    } else {
      checksPass.push('gate_artifact_design_spec');
    }
    const hasCP = artifactsExist && readdirSync(artifactsDir).some(f => /^change-package-.*\.yaml$/.test(f)) || Boolean(taskYaml.change_package_ready);
    if (!hasCP) {
      violations.push({ check: 'gate_artifact_change_package', severity: 'BLOCK', detail: 'No change-package-*.yaml found in artifacts/' });
    } else {
      checksPass.push('gate_artifact_change_package');
    }
    // Gate 3: at least one reviewer report ({reviewer}-report.yaml from REVIEWER_SKILLS)
    // Using explicit whitelist, not wildcard, to avoid false matches from implementation-report.yaml etc.
    const hasReport = artifactsExist && readdirSync(artifactsDir).some(f => isReviewerReport(f));
    if (!hasReport) {
      violations.push({
        check: 'gate_artifact_review_report',
        severity: 'BLOCK',
        detail: `No reviewer report found in artifacts/ — expected one of: ${REVIEWER_SKILLS.map(s => `${s}-report.yaml`).join(', ')}`,
      });
    } else {
      checksPass.push('gate_artifact_review_report');
    }
  }

  // --- Check 3: Upstream dispatch permit backpressure ---
  // Verifies that dispatch_skill gate was called before key skills were dispatched.
  const permits = scanPermits(taskDir);

  if (gateNum === '1') {
    // PM permit — BLOCK: product-manager must have gone through dispatch gate
    const hasPM = permits.some(p => p.startsWith('dispatch_skill-product-manager-'));
    if (!hasPM) {
      violations.push({
        check: 'upstream_permit_pm',
        severity: 'BLOCK',
        detail: 'No dispatch_skill permit for product-manager found in .permits/ — PM must be dispatched through devflow-gate dispatch_skill',
      });
    } else {
      checksPass.push('upstream_permit_pm');
    }

  } else if (gateNum === '2') {
    // Design skill permits — WARN only (first round).
    // NOTE: This is a COARSE check: "at least one design skill has a dispatch permit".
    // It does NOT verify that every skill listed in routing-decision-C has a permit.
    // Full per-skill validation (reading routing-decision-C and matching each matched_skill)
    // is deferred to second round when routing patterns are stable enough to avoid false BLOCKs.
    const DESIGN_SKILL_PREFIXES = [
      'dispatch_skill-web-app-architect-',
      'dispatch_skill-frontend-design-',
      'dispatch_skill-backend-data-api-',
      'dispatch_skill-webapp-interaction-designer-',
      'dispatch_skill-component-library-maintainer-',
    ];
    const hasAnyDesign = permits.some(p => DESIGN_SKILL_PREFIXES.some(prefix => p.startsWith(prefix)));
    if (!hasAnyDesign) {
      warnings.push('No dispatch_skill permit found for any design skill in .permits/ — design skills should be dispatched through devflow-gate (WARN only; not verifying all routing-decision-C matched skills)');
    } else {
      checksPass.push('upstream_permit_design_coarse');
    }

  } else if (gateNum === '3') {
    // FSD permit — BLOCK
    const hasFSD = permits.some(p => p.startsWith('dispatch_skill-full-stack-developer-'));
    if (!hasFSD) {
      violations.push({
        check: 'upstream_permit_fsd',
        severity: 'BLOCK',
        detail: 'No dispatch_skill permit for full-stack-developer found in .permits/ — FSD must be dispatched through devflow-gate dispatch_skill',
      });
    } else {
      checksPass.push('upstream_permit_fsd');
    }
    // Any reviewer permit — BLOCK
    const hasReviewer = permits.some(p => REVIEWER_SKILLS.some(skill => p.startsWith(`dispatch_skill-${skill}-`)));
    if (!hasReviewer) {
      violations.push({
        check: 'upstream_permit_reviewer',
        severity: 'BLOCK',
        detail: `No dispatch_skill permit for any reviewer found in .permits/ — at least one of [${REVIEWER_SKILLS.join(', ')}] must be dispatched through devflow-gate`,
      });
    } else {
      checksPass.push('upstream_permit_reviewer');
    }
    // webapp-consistency-audit permit — WARN when FSD dispatched but consistency-audit missing.
    // Dark-mode-001 retrospective (PFL-017): large UI color system changes require consistency-audit
    // but ORC can easily omit it. This is WARN (not BLOCK) because routing rules allow exceptions
    // (e.g. pure backend changes with scope_flags.ui=false). Second round can upgrade to conditional BLOCK
    // once change-package scope_flags are read by the gate script.
    const hasFSDPermit = permits.some(p => p.startsWith('dispatch_skill-full-stack-developer-'));
    const hasConsistencyAudit = permits.some(p => p.startsWith('dispatch_skill-webapp-consistency-audit-'));
    if (hasFSDPermit && !hasConsistencyAudit) {
      warnings.push(
        'FSD was dispatched but no dispatch_skill permit for webapp-consistency-audit found in .permits/ — ' +
        'if this change touches UI/theme/layout, webapp-consistency-audit should also be dispatched (dark-mode-001 retrospective: PFL-017)'
      );
    } else if (hasConsistencyAudit) {
      checksPass.push('upstream_permit_consistency_audit');
    }

    // --- Check 4 (Schema Signal Patch): Reviewer dispatch downgrade detection ---
    // If routing-decision-D matched a rule that implies reviewers,
    // but a reviewer appears in skipped_reviewers without a formal skip decision,
    // warn about manual dispatch downgrade (PFL-028: amhub-phase1-ia retrospective).
    // V1.1: RULE_IMPLIES_REVIEWER upgraded to arrays (rule_ui now implies both
    // webapp-consistency-audit and playwright-e2e-testing).
    const RULE_IMPLIES_REVIEWER = {
      'rule_ui': ['webapp-consistency-audit', 'playwright-e2e-testing'],
      'rule_data': ['pre-release-test-reviewer'],
    };
    const rdPath = join(taskDir, 'decisions', 'routing-decision-D.yaml');
    if (existsSync(rdPath)) {
      try {
        const rdContent = readFileSync(rdPath, 'utf8');
        const ruleMatch = rdContent.match(/config_rule_matched:\s*["']?(\w+)/);
        if (ruleMatch) {
          const matchedRule = ruleMatch[1];
          const impliedReviewers = RULE_IMPLIES_REVIEWER[matchedRule] || [];
          const skippedMatches = [...rdContent.matchAll(/- skill:\s*["']?([^\s"'\n]+)/g)];
          const skippedSkills = skippedMatches.map(m => m[1]);
          for (const impliedReviewer of impliedReviewers) {
            if (skippedSkills.includes(impliedReviewer)) {
              const hasSkipDecision = decisionExists(taskDir, `reviewer-skip-${impliedReviewer}`);
              if (!hasSkipDecision) {
                warnings.push(
                  `routing-decision-D matched ${matchedRule} (implies ${impliedReviewer}), ` +
                  `but ${impliedReviewer} was manually skipped without a reviewer-skip-*.yaml decision file. ` +
                  `To skip a matched reviewer, write decisions/reviewer-skip-${impliedReviewer}.yaml with rationale.`
                );
              } else {
                checksPass.push('reviewer_skip_decision_exists');
              }
            }
          }
        }
      } catch {
        // Non-fatal — routing-decision-D parse failure does not block Gate 3
        warnings.push('routing-decision-D.yaml could not be read for reviewer downgrade check');
      }
    }
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    action: 'present_gate',
    params: { gate: gateNum },
    ...(allowed
      ? { checks_passed: checksPass }
      : { reason: violations.map(v => v.detail).join('; '), violations }),
    warnings,
  };
}

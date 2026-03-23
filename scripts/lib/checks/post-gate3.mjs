// post-gate3.mjs — Gate check: is this write allowed after Gate 3 ACCEPT?
// Prevents: Gate 3 post-escape (V2.0: 7 unauthorized writes)

import { decisionExists, latestContinuation } from '../state-reader.mjs';

// Phase F allowed list (precise enumeration within task state dir)
const PHASE_F_ALLOWED = [
  'task.yaml',
  'changelog.md',
  'events.jsonl',
  'artifacts/next-version-candidates.md',
];
const PHASE_F_ALLOWED_PREFIXES = [
  'monitor/run-audit-',
];

// Continuation decision files are always allowed to create
const CONTINUATION_PATTERN = /^decisions\/continuation-\d+\.yaml$/;

// Type → allowed path patterns within task state dir
const CONTINUATION_COMPAT = {
  re_enter_d:      [/^artifacts\//, /^handoffs\//, /^issues\//],
  follow_up:       [], // only Phase F allowed files
  light_patch:     [/^artifacts\/patch-note-/],
  non_code_action: [], // no state store writes
  record_and_stop: [/^issues\//],
};

function isPhaseFAllowed(targetPath) {
  if (PHASE_F_ALLOWED.includes(targetPath)) return true;
  return PHASE_F_ALLOWED_PREFIXES.some(prefix => targetPath.startsWith(prefix));
}

export function check(taskDir, targetPath, { warnings: readWarnings }) {
  const violations = [];
  const warnings = [...readWarnings];
  const checksPass = [];

  // Normalize path to be relative to task dir
  const relPath = targetPath.replace(/^.*orchestrator-state\/[^/]+\//, '');

  // --- Check 1: Is Gate 3 ACCEPT recorded? ---
  const gate3Exists = decisionExists(taskDir, 'gate-3.yaml') || decisionExists(taskDir, 'gate-b.yaml');
  if (!gate3Exists) {
    // Not in post-Gate 3 environment — this gate doesn't apply
    return { allowed: true, action: 'post_gate3_write', params: { target_path: relPath }, checks_passed: ['not_post_gate3'], warnings };
  }
  checksPass.push('gate3_confirmed');

  // --- Check 2: Phase F allowed list ---
  if (isPhaseFAllowed(relPath)) {
    checksPass.push('phase_f_allowed');
    return { allowed: true, action: 'post_gate3_write', params: { target_path: relPath }, checks_passed: checksPass, warnings };
  }

  // --- Check 3: Continuation decision file itself ---
  if (CONTINUATION_PATTERN.test(relPath)) {
    checksPass.push('continuation_self_write');
    return { allowed: true, action: 'post_gate3_write', params: { target_path: relPath }, checks_passed: checksPass, warnings };
  }

  // --- Check 4: Has continuation decision? ---
  const cont = latestContinuation(taskDir);
  if (!cont.exists) {
    violations.push({ check: 'continuation_exists', severity: 'BLOCK', detail: `Gate 3 ACCEPT recorded but no continuation decision found. Cannot write ${relPath} without continuation protocol.` });
    return { allowed: false, action: 'post_gate3_write', params: { target_path: relPath }, reason: violations[0].detail, violations, warnings };
  }
  checksPass.push('continuation_exists');

  // --- Check 5: Continuation type compatibility ---
  if (!cont.type) {
    // Type extraction failed (continuation-*.yaml exists but type field unparseable).
    // Per v1 design spec: "提取失败 → 降级为 ALLOW + WARN" — this is intentional:
    // the continuation file's EXISTENCE (Check 4) already cleared the primary authorization.
    // Parse failure is a state hygiene problem, not an authorization failure.
    // Rationale: being too strict here would BLOCK legitimate Phase F work when
    // continuation files are hand-written or have minor formatting differences.
    // This degradation is explicitly logged so auditors/humans can investigate.
    warnings.push(`DEGRADED: continuation file ${cont.filename} — type field not parseable. Allowed based on file existence. Review continuation file format.`);
    checksPass.push('continuation_compat_degraded');
    return { allowed: true, action: 'post_gate3_write', params: { target_path: relPath }, checks_passed: checksPass, warnings };
  }

  const compatPatterns = CONTINUATION_COMPAT[cont.type];
  if (!compatPatterns) {
    // Unknown type value — same conservative rationale as above: degrade rather than BLOCK.
    // Type values come from ORC output; unknown values shouldn't hard-BLOCK the entire
    // continuation flow, but must be visible for auditing.
    warnings.push(`DEGRADED: continuation type="${cont.type}" not in known types [${Object.keys(CONTINUATION_COMPAT).join(', ')}]. Allowed based on file existence. Review continuation type.`);
    checksPass.push('continuation_compat_degraded');
    return { allowed: true, action: 'post_gate3_write', params: { target_path: relPath }, checks_passed: checksPass, warnings };
  }

  // follow_up + non_code_action: only Phase F allowed files (already checked above → BLOCK)
  if (compatPatterns.length === 0) {
    violations.push({ check: 'continuation_compat', severity: 'BLOCK', detail: `Continuation type=${cont.type} does not allow writing ${relPath} in task state dir.` });
    return { allowed: false, action: 'post_gate3_write', params: { target_path: relPath }, reason: violations[0].detail, violations, warnings };
  }

  const pathCompatible = compatPatterns.some(pattern => pattern.test(relPath));
  if (!pathCompatible) {
    violations.push({ check: 'continuation_compat', severity: 'BLOCK', detail: `Path ${relPath} not compatible with continuation type=${cont.type}. Allowed patterns: ${compatPatterns.map(p => p.source).join(', ')}` });
    return { allowed: false, action: 'post_gate3_write', params: { target_path: relPath }, reason: violations[0].detail, violations, warnings };
  }

  checksPass.push('continuation_compat');
  return { allowed: true, action: 'post_gate3_write', params: { target_path: relPath }, checks_passed: checksPass, warnings };
}

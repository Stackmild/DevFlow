// present-gate.mjs — Gate check: can ORC present a Human Gate?
// Prevents: showing Gate without pre-gate self-check evidence, or without upstream dispatch permits
// V6.0: new action for devflow-gate.mjs (Layer-2 upgrade)

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { decisionExists, scanPermits, readTaskYaml, readYamlList, appendEvents } from '../state-reader.mjs';

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

// ── Check 6/8 helpers: E2E report & scope parsing ─────────────────────────

function extractYamlBlock(text, key) {
  const lines = text.split('\n');
  let startIdx = -1;
  let baseIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === key + ':' || trimmed.startsWith(key + ':')) {
      startIdx = i;
      baseIndent = lines[i].search(/\S/);
      break;
    }
  }
  if (startIdx === -1) return null;
  const block = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const rawIndent = line.search(/\S/);
    if (rawIndent === -1) { block.push(line); continue; }
    if (rawIndent <= baseIndent) break;
    block.push(line);
  }
  return block;
}

function parseListField(text, key) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(key + ': [')) {
      const m = trimmed.match(new RegExp(key + ': \\[(.*?)\\]'));
      if (m) return m[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    if (trimmed === key + ':') {
      const items = [];
      for (let j = i + 1; j < lines.length; j++) {
        const l2 = lines[j].trim();
        if (!l2.startsWith('- ')) break;
        items.push(l2.replace(/^- \s*/, '').replace(/^["']|["']$/g, ''));
        i = j;
      }
      return items.length > 0 ? items : null;
    }
  }
  return null;
}

function parseRootRequiredViewports(scopeText) {
  const block = extractYamlBlock(scopeText, 'required_viewports');
  if (!block) return [];
  const names = [];
  for (const line of block) {
    const trimmed = line.trim();
    const m = trimmed.match(/^name:\s*["']?([^"'\n#]+)/);
    if (m) names.push(m[1].trim());
  }
  return names;
}

function parseRootRequiredStates(scopeText) {
  return parseListField(scopeText, 'required_states') || [];
}

function parseChangedSurfaces(scopeText) {
  const block = extractYamlBlock(scopeText, 'changed_surfaces');
  if (!block) return null;
  const entries = [];
  let current = null;
  for (const line of block) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (current) entries.push(current);
      current = { text: line + '\n' };
    } else if (current) {
      current.text += line + '\n';
    }
  }
  if (current) entries.push(current);
  return entries.map(e => {
    const text = e.text;
    const sid = text.match(/surface_id:\s*["']?([^"'\n#]+)/);
    const type = text.match(/type:\s*["']?([^"'\n#]+)/);
    const isNew = text.match(/is_new:\s*(true|false)/i);
    return {
      surface_id: sid ? sid[1].trim() : '',
      type: type ? type[1].trim() : '',
      file_paths: parseListField(text, 'file_paths') || [],
      required_viewports: parseListField(text, 'required_viewports'),
      required_states: parseListField(text, 'required_states'),
      interactions_to_test: parseListField(text, 'interactions_to_test'),
      is_new: isNew ? isNew[1].toLowerCase() === 'true' : false,
    };
  });
}

function parseExpectedVisualTargets(reportText) {
  const block = extractYamlBlock(reportText, 'expected_visual_targets');
  if (!block) return null;
  const entries = [];
  let current = null;
  for (const line of block) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (current) entries.push(current);
      current = { text: line + '\n' };
    } else if (current) {
      current.text += line + '\n';
    }
  }
  if (current) entries.push(current);
  return entries.map(e => {
    const text = e.text;
    const tid = text.match(/target_id:\s*["']?([^"'\n#]+)/);
    const sid = text.match(/surface_id:\s*["']?([^"'\n#]+)/);
    return {
      target_id: tid ? tid[1].trim() : '',
      surface_id: sid ? sid[1].trim() : '',
      viewports_required: parseListField(text, 'viewports_required') || [],
      states_required: parseListField(text, 'states_required') || [],
      interactions_required: parseListField(text, 'interactions_required') || [],
    };
  });
}

function parseCoverageTrace(reportText) {
  const block = extractYamlBlock(reportText, 'coverage_trace');
  if (!block) return null;
  const entries = [];
  let current = null;
  for (const line of block) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (current) entries.push(current);
      current = { text: line + '\n' };
    } else if (current) {
      current.text += line + '\n';
    }
  }
  if (current) entries.push(current);
  return entries.map(e => {
    const text = e.text;
    const tid = text.match(/target_id:\s*["']?([^"'\n#]+)/);
    const result = text.match(/result:\s*["']?([^"'\n#]+)/);
    return {
      target_id: tid ? tid[1].trim() : '',
      test_files: parseListField(text, 'test_files') || [],
      screenshots: parseListField(text, 'screenshots') || [],
      baselines: parseListField(text, 'baselines') || [],
      diff_paths: parseListField(text, 'diff_paths') || [],
      baseline_reason: (text.match(/baseline_reason:\s*["']?([^"'\n#]+)/) || [null, ''])[1].trim(),
      new_baseline_reason: (text.match(/new_baseline_reason:\s*["']?([^"'\n#]+)/) || [null, ''])[1].trim(),
      viewports_covered: parseListField(text, 'viewports_covered') || [],
      states_covered: parseListField(text, 'states_covered') || [],
      interactions_covered: parseListField(text, 'interactions_covered') || [],
      result: result ? result[1].trim() : '',
    };
  });
}

function parseHtmlReportPath(reportText) {
  const m = reportText.match(/html_report_path:\s*["']?([^"'\n#]+)/);
  return m ? m[1].trim() : '';
}

function parseVisualDiffArtifacts(reportText) {
  const block = extractYamlBlock(reportText, 'visual_diff_artifacts');
  if (!block) return [];
  const entries = [];
  let current = null;
  for (const line of block) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (current) entries.push(current);
      current = { text: line + '\n' };
    } else if (current) {
      current.text += line + '\n';
    }
  }
  if (current) entries.push(current);
  return entries.map(e => {
    const text = e.text;
    const test = text.match(/test:\s*["']?([^"'\n#]+)/);
    return {
      test: test ? test[1].trim() : '',
      expected_path: (text.match(/expected_path:\s*["']?([^"'\n#]+)/) || [null, ''])[1].trim(),
      actual_path: (text.match(/actual_path:\s*["']?([^"'\n#]+)/) || [null, ''])[1].trim(),
      diff_path: (text.match(/diff_path:\s*["']?([^"'\n#]+)/) || [null, ''])[1].trim(),
    };
  }).filter(e => e.test || e.diff_path);
}

function parseDoDMap(reportText) {
  const block = extractYamlBlock(reportText, 'definition_of_done');
  if (!block) return {};
  const map = {};
  for (const line of block) {
    const trimmed = line.trim();
    const m = trimmed.match(/^(Q\d+_[^:]+):\s*["']?([^"'\n#]+)/);
    if (m) {
      map[m[1]] = m[2].trim();
    }
  }
  return map;
}

function validateDoDCompleteness(reportText, isNewTask) {
  const dod = parseDoDMap(reportText);
  const violations = [];
  const warnings = [];
  const checksPass = [];

  // Check Q1-Q16 all present
  const missing = [];
  for (let i = 1; i <= 16; i++) {
    const found = Object.keys(dod).some(k => k.startsWith('Q' + i + '_'));
    if (!found) missing.push('Q' + i);
  }
  if (missing.length > 0) {
    const detail = `definition_of_done missing keys: ${missing.join(', ')}`;
    if (isNewTask) {
      violations.push({ check: 'e2e_dod_incomplete', severity: 'BLOCK', detail });
    } else {
      warnings.push(detail);
    }
  } else {
    checksPass.push('e2e_dod_complete');
  }

  // Validate values per schema
  const mustPass = ['Q1','Q2','Q3','Q5','Q6','Q7','Q8','Q14','Q15','Q16'];
  const mayBeNa = ['Q4','Q9','Q10','Q11','Q12','Q13'];
  const invalid = [];
  for (const [key, value] of Object.entries(dod)) {
    const qm = key.match(/^(Q\d+)_/);
    if (!qm) continue;
    const q = qm[1];
    const upper = value.toUpperCase();
    if (mustPass.includes(q)) {
      if (upper !== 'PASS') invalid.push(`${key}=${value}`);
    } else if (mayBeNa.includes(q)) {
      if (upper !== 'PASS' && upper !== 'N/A') invalid.push(`${key}=${value}`);
    }
  }
  if (invalid.length > 0) {
    const detail = `definition_of_done has invalid values: ${invalid.join(', ')}`;
    if (isNewTask) {
      violations.push({ check: 'e2e_dod_value_invalid', severity: 'BLOCK', detail });
    } else {
      warnings.push(detail);
    }
  } else {
    checksPass.push('e2e_dod_values_valid');
  }

  return { violations, warnings, checksPass };
}

function reconcileScopeWithReport(scopeText, reportText, isNewTask) {
  const violations = [];
  const warnings = [];
  const checksPass = [];

  const surfaces = parseChangedSurfaces(scopeText);
  const targets = parseExpectedVisualTargets(reportText);
  const trace = parseCoverageTrace(reportText);

  if (!surfaces || !targets || !trace) {
    return { violations, warnings, checksPass };
  }

  const rootViewports = parseRootRequiredViewports(scopeText);
  const rootStates = parseRootRequiredStates(scopeText);

  // R2: every changed_surfaces surface_id must appear in at least one expected_visual_targets
  const targetSurfaceIds = new Set(targets.map(t => t.surface_id));
  let r2Fail = false;
  for (const surface of surfaces) {
    if (!targetSurfaceIds.has(surface.surface_id)) {
      r2Fail = true;
      const detail = `Scope surface "${surface.surface_id}" not found in expected_visual_targets`;
      if (isNewTask) {
        violations.push({ check: 'scope_surface_uncovered', severity: 'BLOCK', detail });
      } else {
        warnings.push(detail);
      }
    }
  }
  if (!r2Fail) checksPass.push('scope_surface_covered');

  // R3: every expected_visual_targets target_id must have coverage_trace with result !== NOT_COVERED
  const traceByTarget = new Map();
  for (const t of trace) {
    traceByTarget.set(t.target_id, t);
  }
  let r3Fail = false;
  for (const target of targets) {
    const t = traceByTarget.get(target.target_id);
    if (!t || t.result === 'NOT_COVERED') {
      r3Fail = true;
      const detail = `Target "${target.target_id}" missing coverage or result=NOT_COVERED`;
      if (isNewTask) {
        violations.push({ check: 'scope_target_not_covered', severity: 'BLOCK', detail });
      } else {
        warnings.push(detail);
      }
    }
  }
  if (!r3Fail) checksPass.push('scope_targets_covered');

  // R4: is_new=true surfaces must have all required viewports/states covered
  for (const surface of surfaces) {
    if (!surface.is_new) continue;

    const effectiveViewports = surface.required_viewports !== null ? surface.required_viewports : rootViewports;
    const effectiveStates = surface.required_states !== null ? surface.required_states : rootStates;

    // Find all targets for this surface
    const surfaceTargets = targets.filter(t => t.surface_id === surface.surface_id);
    if (surfaceTargets.length === 0) continue;

    // Coverage via trace
    const coveredViewports = new Set();
    const coveredStates = new Set();
    for (const t of surfaceTargets) {
      const tr = traceByTarget.get(t.target_id);
      if (!tr || tr.result === 'NOT_COVERED') continue;
      for (const v of tr.viewports_covered) coveredViewports.add(v);
      for (const s of tr.states_covered) coveredStates.add(s);
    }

    for (const vp of effectiveViewports) {
      if (!coveredViewports.has(vp)) {
        const detail = `is_new surface "${surface.surface_id}" missing required viewport "${vp}" in coverage`;
        if (isNewTask) {
          violations.push({ check: 'scope_is_new_viewport_missing', severity: 'BLOCK', detail });
        } else {
          warnings.push(detail);
        }
      }
    }

    for (const st of effectiveStates) {
      if (!coveredStates.has(st)) {
        const detail = `is_new surface "${surface.surface_id}" missing required state "${st}" in coverage`;
        if (isNewTask) {
          violations.push({ check: 'scope_is_new_state_missing', severity: 'BLOCK', detail });
        } else {
          warnings.push(detail);
        }
      }
    }
  }

  return { violations, warnings, checksPass };
}

// ── Check 9 helper: Evidence Gate ─────────────────────────────────────────
function validateEvidence(reportText, projectPath, isNewTask) {
  const violations = [];
  const warnings = [];
  const checksPass = [];

  // project_path 缺失
  if (!projectPath) {
    const detail = 'project_path is missing — cannot verify evidence file existence on disk';
    if (isNewTask) violations.push({ check: 'evidence_project_path_missing', severity: 'BLOCK', detail });
    else warnings.push(detail);
  }

  const trace = parseCoverageTrace(reportText);
  if (!trace || trace.length === 0) return { violations, warnings, checksPass };

  const targets = parseExpectedVisualTargets(reportText);
  const targetInteractionsRequired = new Map();
  if (targets) {
    for (const t of targets) {
      targetInteractionsRequired.set(t.target_id, t.interactions_required || []);
    }
  }

  const htmlReportPath = parseHtmlReportPath(reportText);
  const visualDiffs = parseVisualDiffArtifacts(reportText);

  for (const entry of trace) {
    if (entry.result !== 'PASS') continue;

    // test_files non-empty
    if (!entry.test_files || entry.test_files.length === 0) {
      const detail = `Target "${entry.target_id}" result=PASS but test_files is empty`;
      if (isNewTask) violations.push({ check: 'evidence_test_files_empty', severity: 'BLOCK', detail });
      else warnings.push(detail);
    } else {
      checksPass.push('evidence_test_files');
    }

    // test_files exist (if projectPath available)
    if (projectPath && entry.test_files && entry.test_files.length > 0) {
      let allExist = true;
      for (const f of entry.test_files) {
        const fullPath = join(projectPath, f);
        if (!existsSync(fullPath)) {
          allExist = false;
          const detail = `Target "${entry.target_id}" test file missing: ${f}`;
          if (isNewTask) violations.push({ check: 'evidence_test_file_missing', severity: 'BLOCK', detail });
          else warnings.push(detail);
        }
      }
      if (allExist) checksPass.push('evidence_test_files_exist');
    }

    // screenshots non-empty
    if (!entry.screenshots || entry.screenshots.length === 0) {
      const detail = `Target "${entry.target_id}" result=PASS but screenshots is empty`;
      if (isNewTask) violations.push({ check: 'evidence_screenshots_empty', severity: 'BLOCK', detail });
      else warnings.push(detail);
    } else {
      checksPass.push('evidence_screenshots');
    }

    // screenshots files exist (if projectPath available)
    if (projectPath && entry.screenshots && entry.screenshots.length > 0) {
      let allExist = true;
      for (const s of entry.screenshots) {
        const fullPath = join(projectPath, s);
        if (!existsSync(fullPath)) {
          allExist = false;
          const detail = `Target "${entry.target_id}" screenshot file missing: ${s}`;
          if (isNewTask) violations.push({ check: 'evidence_screenshot_missing', severity: 'BLOCK', detail });
          else warnings.push(detail);
        }
      }
      if (allExist) checksPass.push('evidence_screenshots_exist');
    }

    // baselines non-empty OR baseline_reason / new_baseline_reason
    const hasBaselines = entry.baselines && entry.baselines.length > 0;
    const hasBaselineReason = entry.baseline_reason && entry.baseline_reason.length > 0;
    const hasNewBaselineReason = entry.new_baseline_reason && entry.new_baseline_reason.length > 0;
    if (!hasBaselines && !hasBaselineReason && !hasNewBaselineReason) {
      const detail = `Target "${entry.target_id}" result=PASS but no baselines and no baseline_reason/new_baseline_reason`;
      if (isNewTask) violations.push({ check: 'evidence_baseline_missing', severity: 'BLOCK', detail });
      else warnings.push(detail);
    } else {
      checksPass.push('evidence_baseline');
    }

    // baselines exist (if projectPath available)
    if (projectPath && entry.baselines && entry.baselines.length > 0) {
      let allExist = true;
      for (const b of entry.baselines) {
        const fullPath = join(projectPath, b);
        if (!existsSync(fullPath)) {
          allExist = false;
          const detail = `Target "${entry.target_id}" baseline file missing: ${b}`;
          if (isNewTask) violations.push({ check: 'evidence_baseline_file_missing', severity: 'BLOCK', detail });
          else warnings.push(detail);
        }
      }
      if (allExist) checksPass.push('evidence_baselines_exist');
    }

    // html_report_path field present OR visual_diff_artifacts at least one entry OR per-entry diff_paths
    const hasHtmlReportField = htmlReportPath.length > 0;
    const hasVisualDiffs = visualDiffs && visualDiffs.length > 0;
    const entryHasDiffPaths = entry.diff_paths && entry.diff_paths.length > 0;
    if (!hasHtmlReportField && !hasVisualDiffs && !entryHasDiffPaths) {
      const detail = `Target "${entry.target_id}" result=PASS but no html_report_path, visual_diff_artifacts, or diff_paths`;
      if (isNewTask) violations.push({ check: 'evidence_report_or_diff_missing', severity: 'BLOCK', detail });
      else warnings.push(detail);
    } else {
      checksPass.push('evidence_report_or_diff');
    }

    // diff_paths exist (if projectPath available)
    if (projectPath && entry.diff_paths && entry.diff_paths.length > 0) {
      let allExist = true;
      for (const d of entry.diff_paths) {
        const fullPath = join(projectPath, d);
        if (!existsSync(fullPath)) {
          allExist = false;
          const detail = `Target "${entry.target_id}" diff file missing: ${d}`;
          if (isNewTask) violations.push({ check: 'evidence_diff_file_missing', severity: 'BLOCK', detail });
          else warnings.push(detail);
        }
      }
      if (allExist) checksPass.push('evidence_diff_paths_exist');
    }

    // interactions coverage
    const requiredInteractions = targetInteractionsRequired.get(entry.target_id) || [];
    if (requiredInteractions.length > 0) {
      const covered = new Set(entry.interactions_covered || []);
      const missing = requiredInteractions.filter(i => !covered.has(i));
      if (missing.length > 0) {
        const detail = `Target "${entry.target_id}" missing required interactions: ${missing.join(', ')}`;
        if (isNewTask) violations.push({ check: 'evidence_interactions_missing', severity: 'BLOCK', detail });
        else warnings.push(detail);
      } else {
        checksPass.push('evidence_interactions');
      }
    }
  }

  // report-level html_report_path existence
  if (projectPath && htmlReportPath.length > 0) {
    const fullPath = join(projectPath, htmlReportPath);
    if (!existsSync(fullPath)) {
      const detail = `HTML report file missing: ${htmlReportPath}`;
      if (isNewTask) violations.push({ check: 'evidence_html_report_missing', severity: 'BLOCK', detail });
      else warnings.push(detail);
    } else {
      checksPass.push('evidence_html_report_exists');
    }
  }

  // report-level visual_diff_artifacts file existence
  if (projectPath && visualDiffs && visualDiffs.length > 0) {
    let allExist = true;
    for (const vd of visualDiffs) {
      for (const field of ['expected_path', 'actual_path', 'diff_path']) {
        const p = vd[field];
        if (p) {
          const fullPath = join(projectPath, p);
          if (!existsSync(fullPath)) {
            allExist = false;
            const detail = `visual_diff_artifacts ${field} missing: ${p}`;
            if (isNewTask) violations.push({ check: 'evidence_visual_diff_file_missing', severity: 'BLOCK', detail });
            else warnings.push(detail);
          }
        }
      }
    }
    if (allExist) checksPass.push('evidence_visual_diff_files_exist');
  }

  return { violations, warnings, checksPass };
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
    // --- Fix 7: Gate 2 design skill permits — per-skill BLOCK validation ---
    // Skip path: Phase C entirely skipped or Gate 2 itself skipped
    const hasSkip = decisionExists(taskDir, 'gate-2-skip.yaml');
    const phaseCSkipped = decisionExists(taskDir, 'phase-skip-phase_c') || decisionExists(taskDir, 'phase-skip-C');
    if (hasSkip || phaseCSkipped) {
      checksPass.push(hasSkip ? 'gate_2_skipped' : 'phase_c_skipped');
    } else {
      const rdPath = join(taskDir, 'decisions', 'routing-decision-C.yaml');
      if (!existsSync(rdPath)) {
        const isNewTask = taskYaml.protocol_version && Number(taskYaml.protocol_version) >= 2;
        if (isNewTask) {
          violations.push({
            check: 'routing_decision_C',
            severity: 'BLOCK',
            detail: 'decisions/routing-decision-C.yaml not found — new tasks (protocol_version >= 2) require routing-decision-C before Gate 2',
          });
        } else {
          warnings.push('decisions/routing-decision-C.yaml not found — legacy task, permitting Gate 2 with WARN');
        }
      } else {
        const matchedSkills = readYamlList(rdPath, 'matched_skills') || [];
        const skippedSkillsRaw = readYamlList(rdPath, 'skipped_skills') || [];
        // Normalize skipped_skills (may be simple strings or "skill: name" objects)
        const skippedSkills = skippedSkillsRaw.map(s => {
          const m = s.match(/^skill:\s*(\S+)/);
          return m ? m[1] : s;
        });
        const requiredSkills = matchedSkills.filter(s => !skippedSkills.includes(s));
        const missing = [];
        for (const skill of requiredSkills) {
          const hasPermit = permits.some(p => p.startsWith(`dispatch_skill-${skill}-`));
          if (!hasPermit) missing.push(skill);
        }
        if (missing.length > 0) {
          violations.push({
            check: 'upstream_permit_design',
            severity: 'BLOCK',
            detail: `Missing dispatch_skill permits for design skills: ${missing.join(', ')} — each matched_skill in routing-decision-C must have a permit in .permits/`,
          });
        } else {
          checksPass.push('upstream_permit_design_per_skill');
        }
      }
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

    // --- Check 5: Gate 3 rule_ui Playwright hardening ---
    // When routing-decision-D matches rule_ui, both webapp-consistency-audit
    // and playwright-e2e-testing must have dispatch permits AND e2e report
    // must exist. reviewer-skip-playwright-e2e-testing.yaml allows bypass.
    const rdPathUI = join(taskDir, 'decisions', 'routing-decision-D.yaml');
    if (existsSync(rdPathUI)) {
      try {
        const rdContentUI = readFileSync(rdPathUI, 'utf8');
        const ruleMatchUI = rdContentUI.match(/config_rule_matched:\s*["']?(\w+)/);
        if (ruleMatchUI && ruleMatchUI[1] === 'rule_ui') {
          const isNewTask = taskYaml.protocol_version && Number(taskYaml.protocol_version) >= 2;
          const hasSkipPlaywright = decisionExists(taskDir, 'reviewer-skip-playwright-e2e-testing');

          // webapp-consistency-audit permit
          const hasWCA = permits.some(p => p.startsWith('dispatch_skill-webapp-consistency-audit-'));
          if (!hasWCA) {
            const detail = 'routing-decision-D matched rule_ui but no dispatch_skill permit for webapp-consistency-audit found in .permits/';
            if (isNewTask) {
              violations.push({ check: 'rule_ui_wca_permit', severity: 'BLOCK', detail });
            } else {
              warnings.push(detail);
            }
          } else {
            checksPass.push('rule_ui_wca_permit');
          }

          // playwright-e2e-testing permit
          const hasPlaywrightPermit = permits.some(p => p.startsWith('dispatch_skill-playwright-e2e-testing-'));
          if (!hasPlaywrightPermit && !hasSkipPlaywright) {
            const detail = 'routing-decision-D matched rule_ui but no dispatch_skill permit for playwright-e2e-testing found in .permits/';
            if (isNewTask) {
              violations.push({ check: 'rule_ui_playwright_permit', severity: 'BLOCK', detail });
            } else {
              warnings.push(detail);
            }
          } else if (hasPlaywrightPermit) {
            checksPass.push('rule_ui_playwright_permit');
          }

          // e2e-visual-test-report.yaml artifact
          const hasE2EReport = artifactsExist && existsSync(join(artifactsDir, 'e2e-visual-test-report.yaml'));
          if (!hasE2EReport && !hasSkipPlaywright) {
            const detail = 'routing-decision-D matched rule_ui but artifacts/e2e-visual-test-report.yaml not found';
            if (isNewTask) {
              violations.push({ check: 'rule_ui_e2e_report', severity: 'BLOCK', detail });
            } else {
              warnings.push(detail);
            }
          } else if (hasE2EReport) {
            checksPass.push('rule_ui_e2e_report');
          }

          if (hasSkipPlaywright) {
            checksPass.push('reviewer_skip_playwright_decision_exists');
          }

          // --- Check 6: E2E report content validation ---
          if (hasE2EReport && !hasSkipPlaywright) {
            const e2eReportPath = join(artifactsDir, 'e2e-visual-test-report.yaml');
            let reportText;
            try {
              reportText = readFileSync(e2eReportPath, 'utf8');
            } catch {
              violations.push({ check: 'e2e_report_parseable', severity: 'BLOCK', detail: 'e2e-visual-test-report.yaml could not be read' });
              reportText = null;
            }

            if (reportText) {
              // Reporter check
              const reporterMatch = reportText.match(/reporter:\s*["']?([^"'\n#]+)/);
              const reporter = reporterMatch ? reporterMatch[1].trim() : '';
              if (reporter !== 'playwright-e2e-testing') {
                const detail = `reporter must be "playwright-e2e-testing", got: "${reporter || 'missing'}"`;
                if (isNewTask) {
                  violations.push({ check: 'e2e_reporter', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else {
                checksPass.push('e2e_reporter_valid');
              }

              // Completion status
              const csMatch = reportText.match(/completion_status:\s*["']?([^"'\n#]+)/);
              const cs = csMatch ? csMatch[1].trim() : '';
              if (cs !== 'COMPLETE') {
                const detail = `completion_status must be "COMPLETE", got: "${cs || 'missing'}"`;
                if (isNewTask) {
                  violations.push({ check: 'e2e_completion_status', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else {
                checksPass.push('e2e_completion_status_valid');
              }

              // Merge recommendation
              const mrMatch = reportText.match(/merge_recommendation:\s*["']?([^"'\n#]+)/);
              const mr = mrMatch ? mrMatch[1].trim() : '';
              if (mr !== 'ALLOW') {
                const detail = `merge_recommendation must be "ALLOW", got: "${mr || 'missing'}"`;
                if (isNewTask) {
                  violations.push({ check: 'e2e_merge_recommendation', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else {
                checksPass.push('e2e_merge_recommendation_valid');
              }

              // DoD FAIL scan
              const dodMap = parseDoDMap(reportText);
              const failKeys = Object.entries(dodMap)
                .filter(([, v]) => v.toUpperCase() === 'FAIL')
                .map(([k]) => k);
              if (failKeys.length > 0) {
                const detail = `definition_of_done has FAIL values: ${failKeys.join(', ')}`;
                if (isNewTask) {
                  violations.push({ check: 'e2e_dod_fail', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else {
                checksPass.push('e2e_dod_no_fail');
              }

              // expected_visual_targets non-empty
              const targets = parseExpectedVisualTargets(reportText);
              if (!targets || targets.length === 0) {
                const detail = 'expected_visual_targets is empty or missing';
                if (isNewTask) {
                  violations.push({ check: 'e2e_expected_targets_empty', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else {
                checksPass.push('e2e_expected_targets_present');
              }

              // untested_targets empty
              const untestedBlock = extractYamlBlock(reportText, 'untested_targets');
              const untestedHasItems = untestedBlock && untestedBlock.some(l => l.trim().startsWith('- '));
              if (untestedHasItems) {
                const detail = 'untested_targets is not empty';
                if (isNewTask) {
                  violations.push({ check: 'e2e_untested_targets', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else {
                checksPass.push('e2e_untested_targets_empty');
              }

              // coverage_summary.missing_count === 0
              const mcMatch = reportText.match(/missing_count:\s*(\d+)/);
              const mc = mcMatch ? parseInt(mcMatch[1], 10) : null;
              if (mc !== null && mc !== 0) {
                const detail = `coverage_summary.missing_count must be 0, got: ${mc}`;
                if (isNewTask) {
                  violations.push({ check: 'e2e_missing_count', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else if (mc === 0) {
                checksPass.push('e2e_missing_count_zero');
              }

              // coverage_trace no NOT_COVERED
              const trace = parseCoverageTrace(reportText);
              if (trace) {
                const notCovered = trace.filter(t => t.result === 'NOT_COVERED');
                if (notCovered.length > 0) {
                  const detail = `coverage_trace has NOT_COVERED entries: ${notCovered.map(t => t.target_id).join(', ')}`;
                  if (isNewTask) {
                    violations.push({ check: 'e2e_coverage_not_covered', severity: 'BLOCK', detail });
                  } else {
                    warnings.push(detail);
                  }
                } else {
                  checksPass.push('e2e_coverage_all_covered');
                }
              }
            }
          }

          // --- Check 7: Scope flag leak ---
          {
            const cpFiles = artifactsExist ? readdirSync(artifactsDir).filter(f => /^change-package-.*\.yaml$/.test(f)) : [];
            if (cpFiles.length > 0) {
              const latestCP = cpFiles.sort().pop();
              const cpPath = join(artifactsDir, latestCP);
              try {
                const cpText = readFileSync(cpPath, 'utf8');

                const uiPatterns = [/\.tsx?$/, /\.css$/, /\.scss$/, /\.vue$/, /tailwind/, /public\/assets/, /\/components\//, /\/pages\//];
                const hasUIFiles = uiPatterns.some(p => p.test(cpText));

                const sfMatch = cpText.match(/ui:\s*(true|false)/);
                const interactionMatch = cpText.match(/interaction:\s*(true|false)/);
                const uiFlag = sfMatch ? sfMatch[1] === 'true' : null;
                const interactionFlag = interactionMatch ? interactionMatch[1] === 'true' : null;

                if (hasUIFiles && uiFlag === false && interactionFlag === false) {
                  const detail = 'UI files detected in change-package but scope_flags.ui=false and interaction=false';
                  if (isNewTask) {
                    violations.push({ check: 'scope_flag_leak', severity: 'BLOCK', detail });
                  } else {
                    warnings.push(detail);
                  }
                } else {
                  checksPass.push('scope_flags_consistent');
                }
              } catch {
                // Non-fatal
              }
            }
          }

          // --- Check 8: Scope reconciliation ---
          if (!hasSkipPlaywright) {
            const scopePath = join(artifactsDir, 'visual-test-scope.yaml');
            let scopeText = null;
            if (!existsSync(scopePath)) {
              const detail = 'rule_ui matched but artifacts/visual-test-scope.yaml is missing';
              if (isNewTask) {
                violations.push({ check: 'rule_ui_visual_scope_missing', severity: 'BLOCK', detail });
              } else {
                warnings.push(detail);
              }
            } else {
              scopeText = readFileSync(scopePath, 'utf8');
              const surfaces = parseChangedSurfaces(scopeText);
              if (surfaces === null) {
                const detail = 'visual-test-scope.yaml could not be parsed';
                if (isNewTask) {
                  violations.push({ check: 'scope_parseable', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else if (surfaces.length === 0) {
                const detail = 'rule_ui matched but changed_surfaces is empty';
                if (isNewTask) {
                  violations.push({ check: 'scope_surfaces_empty', severity: 'BLOCK', detail });
                } else {
                  warnings.push(detail);
                }
              } else {
                checksPass.push('scope_present');
              }
            }

            if (hasE2EReport && scopeText) {
              const reportText = readFileSync(join(artifactsDir, 'e2e-visual-test-report.yaml'), 'utf8');
              const dodResult = validateDoDCompleteness(reportText, isNewTask);
              violations.push(...dodResult.violations);
              warnings.push(...dodResult.warnings);
              checksPass.push(...dodResult.checksPass);

              const r = reconcileScopeWithReport(scopeText, reportText, isNewTask);
              violations.push(...r.violations);
              warnings.push(...r.warnings);
              checksPass.push(...r.checksPass);
            }

            // --- Check 9: Evidence Gate ---
            if (hasE2EReport) {
              const projectPath = taskYaml.project_path || null;
              const reportText = readFileSync(join(artifactsDir, 'e2e-visual-test-report.yaml'), 'utf8');
              const ev = validateEvidence(reportText, projectPath, isNewTask);
              violations.push(...ev.violations);
              warnings.push(...ev.warnings);
              checksPass.push(...ev.checksPass);
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }
  }

  const allowed = violations.length === 0;

  // Write gate_decision event on successful present_gate to keep events.jsonl in sync
  if (allowed) {
    try {
      appendEvents(taskDir, [{
        event_type: 'gate_decision',
        payload: { gate: gateNum },
        timestamp: new Date().toISOString(),
        source: 'devflow-gate-present_gate',
      }]);
    } catch {
      // Non-blocking: permit is canonical evidence; event is best-effort audit trail
    }
  }

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

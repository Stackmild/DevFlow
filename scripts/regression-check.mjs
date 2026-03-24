#!/usr/bin/env node
// regression-check.mjs — DevFlow自迭代系统 Step 3
// 读 normalized facts，按3阶段（applicability → data-sufficiency → pass/fail）跑断言。
// 输出: per-task 断言结果 + 聚合报告 + (可选) evaluation YAML
//
// CLI:
//   node scripts/regression-check.mjs --all
//   node scripts/regression-check.mjs --cohort task1,task2,...
//   node scripts/regression-check.mjs --emit-evaluation   (同时写 monitor/evaluation-*.yaml)
//   node scripts/regression-check.mjs --save-baseline     (写 _derived/regression-baseline-{date}.json)
// Zero npm dependencies.

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, basename } from 'path';

const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const DEVFLOW_ROOT = resolve(SCRIPT_DIR, '..');
const STATE_DIR   = join(DEVFLOW_ROOT, 'orchestrator-state');
const DERIVED_DIR = join(STATE_DIR, '_derived');
const NORM_DIR    = join(DERIVED_DIR, 'normalized');

const args = process.argv.slice(2);
const EMIT_EVAL      = args.includes('--emit-evaluation');
const SAVE_BASELINE  = args.includes('--save-baseline');

// ─── 断言元数据 ──────────────────────────────────────────────────────────────
// 每条断言必须声明 requires_coverage (parse_coverage分项)
// not_applicable_for_schema 只用于协议层不适用（高门槛），不用于数据不足

const ASSERTIONS = [
  {
    id: 'change-package-required',
    level: 'MUST',
    description: '到达 Phase D 的任务必须有 change-package artifact',
    introduced_in_version: 'v4.3',
    hard_enforce_from_version: 'v4.3',
    applies_to_status: ['completed'],
    applies_to_task_type: null,      // null = all
    not_applicable_for_schema: [],   // 高门槛原则：不因 schema 排除，用 coverage 控制
    requires_coverage: ['artifacts'],
    legacy_tolerated: false,
  },
  {
    id: 'gate-3-accept-required',
    level: 'MUST',
    description: '已完成任务必须有 Gate 3 ACCEPT 决策',
    introduced_in_version: 'v3.0',
    hard_enforce_from_version: 'v3.0',
    applies_to_status: ['completed'],
    applies_to_task_type: null,
    not_applicable_for_schema: [],
    requires_coverage: ['decisions'],
    legacy_tolerated: false,
  },
  {
    id: 'gate-1-before-phase-d',
    level: 'MUST',
    description: '进入 Phase D 的任务必须有 Gate 1 决策（或有效跳过记录）',
    introduced_in_version: 'v3.0',
    hard_enforce_from_version: 'v4.0',
    applies_to_status: null,        // null = all statuses
    applies_to_task_type: null,
    not_applicable_for_schema: [],
    requires_coverage: ['decisions'],
    legacy_tolerated: false,
  },
  {
    id: 'review-artifact-required',
    level: 'MUST',
    description: '已完成任务必须有至少一份 code-review 或 audit 报告 artifact',
    introduced_in_version: 'v4.0',
    hard_enforce_from_version: 'v4.0',
    applies_to_status: ['completed'],
    applies_to_task_type: null,
    not_applicable_for_schema: [],
    requires_coverage: ['artifacts'],
    legacy_tolerated: false,
  },
  {
    id: 'no-open-p0-at-completion',
    level: 'MUST',
    description: '已完成任务不得有 open P0 blocker issue',
    introduced_in_version: 'v4.0',
    hard_enforce_from_version: 'v4.0',
    applies_to_status: ['completed'],
    applies_to_task_type: null,
    not_applicable_for_schema: [],
    requires_coverage: ['issues'],
    legacy_tolerated: false,
  },
];

// ─── 断言逻辑（阶段3：pass/fail 判定）────────────────────────────────────────

const EVALUATORS = {

  'change-package-required': (fact) => {
    // Only applies if task actually entered Phase D
    const enteredPhaseD = (fact.canonical_events || [])
      .some(e => e.event_type === 'phase_entered' && e.phase === 'phase_d');
    if (!enteredPhaseD) {
      return { result: 'not_applicable', stage_reached: 'applicability',
               reason: 'No phase_entered(phase_d) event — Phase D was not entered' };
    }
    const hasChangePkg = (fact.canonical_artifacts || [])
      .some(a => a.name && a.name.toLowerCase().startsWith('change-package'));
    if (hasChangePkg) return { result: 'pass' };
    return {
      result: 'fail',
      reason: 'Task entered Phase D but no change-package artifact found in artifacts/',
    };
  },

  'gate-3-accept-required': (fact) => {
    const gate3 = (fact.canonical_decisions || [])
      .find(d => d.gate_id === 'gate-3' || d.gate_id === 'gate-b');
    if (!gate3) {
      return { result: 'fail', reason: 'gate-3.yaml (or gate-b.yaml) not found in decisions/' };
    }
    const decision = gate3.decision?.toUpperCase();
    if (decision === 'ACCEPT') return { result: 'pass' };
    return { result: 'fail', reason: `gate-3 decision="${gate3.decision}", expected ACCEPT` };
  },

  'gate-1-before-phase-d': (fact) => {
    // First: does this task actually reach phase D?
    const hasPhaseD = (fact.canonical_artifacts || [])
      .some(a => a.name && a.name.toLowerCase().startsWith('change-package'))
      || (fact.canonical_events || [])
      .some(e => e.event_type === 'phase_entered' && e.phase === 'phase_d')
      || (fact.canonical_decisions || [])
      .some(d => d._source_file && d._source_file.startsWith('gate-3'));

    if (!hasPhaseD) {
      return { result: 'not_applicable', stage_reached: 'applicability',
               reason: 'Task has no evidence of reaching Phase D' };
    }

    // Has gate-1 decision?
    const gate1 = (fact.canonical_decisions || [])
      .find(d => d.gate_id === 'gate-1' || d.gate_id === 'gate-a');
    if (gate1) return { result: 'pass' };

    // Has explicit gate-1-skip record?
    const skip = (fact.canonical_decisions || [])
      .find(d => d._source_file && /gate-1-skip|gate-a-skip/i.test(d._source_file));
    if (skip) return { result: 'pass' };

    return {
      result: 'fail',
      reason: 'Task reached Phase D but no gate-1.yaml or gate-1-skip.yaml in decisions/',
    };
  },

  'review-artifact-required': (fact) => {
    // Only applies if task actually entered Phase D
    const enteredPhaseD = (fact.canonical_events || [])
      .some(e => e.event_type === 'phase_entered' && e.phase === 'phase_d');
    if (!enteredPhaseD) {
      return { result: 'not_applicable', stage_reached: 'applicability',
               reason: 'No phase_entered(phase_d) event — Phase D was not entered' };
    }
    const REVIEW_PATTERNS = /review|audit|consistency|prerelease|pre-release/i;
    const hasReview = (fact.canonical_artifacts || [])
      .some(a => a.name && REVIEW_PATTERNS.test(a.name));
    if (hasReview) return { result: 'pass' };
    return {
      result: 'fail',
      reason: 'Task entered Phase D but no review/audit artifact found (expected code-review-report or consistency-audit-report)',
    };
  },

  'no-open-p0-at-completion': (fact) => {
    const openP0 = (fact.canonical_issues || [])
      .filter(i => i.severity_tier === 'P0' && i.status && !/resolved|known_gap/i.test(i.status));
    if (openP0.length === 0) return { result: 'pass' };
    return {
      result: 'fail',
      reason: `${openP0.length} open P0 blocker(s): ${openP0.map(i => i.issue_id || i._source_file).join(', ')}`,
    };
  },
};

// ─── 3阶段断言执行 ────────────────────────────────────────────────────────────

function runAssertion(assertion, fact) {
  const { id, applies_to_status, applies_to_task_type,
          not_applicable_for_schema, requires_coverage } = assertion;

  // ── 阶段1: Applicability (协议适用性) ─────────────────────────────────────
  const status    = fact.canonical_task_meta?.status;
  const taskType  = fact.canonical_task_meta?.task_type;
  const family    = fact.schema_detection?.schema_family;
  const coverage  = fact.parse_coverage || {};

  if (applies_to_status && !applies_to_status.includes(status)) {
    return { assertion_id: id, result: 'not_applicable', stage_reached: 'applicability',
             reason: `task status="${status}", assertion applies to ${applies_to_status.join('/')}` };
  }
  if (applies_to_task_type && !applies_to_task_type.includes(taskType)) {
    return { assertion_id: id, result: 'not_applicable', stage_reached: 'applicability',
             reason: `task_type="${taskType}", assertion applies to ${applies_to_task_type.join('/')}` };
  }
  if (not_applicable_for_schema.includes(family)) {
    return { assertion_id: id, result: 'not_applicable', stage_reached: 'applicability',
             reason: `schema_family="${family}" is explicitly excluded from this assertion` };
  }

  // ── 阶段2: Data Sufficiency (数据充分性) ─────────────────────────────────
  for (const cov of requires_coverage) {
    if (coverage[cov] === 'none') {
      return { assertion_id: id, result: 'unknown', stage_reached: 'data_sufficiency',
               reason: `parse_coverage.${cov}=none — required data not available (schema drift or missing file)` };
    }
  }

  // ── 阶段3: Pass/Fail 判定 ──────────────────────────────────────────────────
  const evalFn = EVALUATORS[id];
  if (!evalFn) {
    return { assertion_id: id, result: 'unknown', stage_reached: 'evaluation',
             reason: `No evaluator implemented for ${id}` };
  }

  const evalResult = evalFn(fact);
  // Evaluator may short-circuit with not_applicable (e.g. didn't reach phase D)
  if (evalResult.result === 'not_applicable') {
    return { assertion_id: id, ...evalResult,
             stage_reached: evalResult.stage_reached || 'evaluation' };
  }
  return { assertion_id: id, level: assertion.level,
           stage_reached: 'evaluation', ...evalResult };
}

// ─── 单任务检查 ───────────────────────────────────────────────────────────────

function checkTask(fact) {
  const results = ASSERTIONS.map(a => runAssertion(a, fact));

  const must   = results.filter(r => ASSERTIONS.find(a => a.id === r.assertion_id)?.level === 'MUST');
  const should = results.filter(r => ASSERTIONS.find(a => a.id === r.assertion_id)?.level === 'SHOULD');

  const count = (arr, res) => arr.filter(r => r.result === res).length;

  const summary = {
    must_total:           must.length,
    must_applicable:      count(must, 'pass') + count(must, 'fail') + count(must, 'unknown'),
    must_pass:            count(must, 'pass'),
    must_fail:            count(must, 'fail'),
    must_unknown:         count(must, 'unknown'),
    must_not_applicable:  count(must, 'not_applicable'),
    should_total:           should.length,
    should_applicable:      count(should, 'pass') + count(should, 'fail') + count(should, 'unknown'),
    should_pass:            count(should, 'pass'),
    should_fail:            count(should, 'fail'),
    should_unknown:         count(should, 'unknown'),
    should_not_applicable:  count(should, 'not_applicable'),
  };

  return {
    task_id:      fact.task_id,
    schema_family: fact.schema_detection?.schema_family,
    task_type:    fact.canonical_task_meta?.task_type,
    status:       fact.canonical_task_meta?.status,
    results,
    summary,
    failed_assertions: results.filter(r => r.result === 'fail'),
  };
}

// ─── Evaluation YAML 生成 ─────────────────────────────────────────────────────

function emitEvaluationYaml(taskResult, fact, devflowVersion = 'v5.1') {
  const monitorDir = join(STATE_DIR, fact.task_id, 'monitor');
  if (!existsSync(monitorDir)) mkdirSync(monitorDir, { recursive: true });

  const taskId   = fact.task_id;
  const today    = new Date().toISOString().slice(0, 10);
  const rs       = taskResult.summary;
  const failList = taskResult.failed_assertions
    .map(f => `  - assertion_id: "${f.assertion_id}"\n    level: "MUST"\n    reason: "${f.reason?.replace(/"/g, "'")||''}"`)
    .join('\n');

  const yaml = [
    `# Auto-generated by regression-check.mjs — human scores require manual fill-in`,
    `evaluation_id: "eval-${taskId}-${today}"`,
    `evaluator: "regression-check-auto"`,
    `devflow_version: "${devflowVersion}"`,
    `task_id: "${taskId}"`,
    `task_type: "${fact.canonical_task_meta?.task_type || 'unknown'}"`,
    `evaluated_at: "${new Date().toISOString()}"`,
    `schema_family_at_time: "${fact.schema_detection?.schema_family || 'unknown'}"`,
    ``,
    `# ── 9维度评分 (需人工填写) ──────────────────────────────────────────────`,
    `scores:`,
    `  OC: { grade: "pending", evidence: "" }`,
    `  AP: { grade: "pending", evidence: "" }`,
    `  AC: { grade: "pending", evidence: "" }`,
    `  CI: { grade: "pending", evidence: "" }`,
    `  RE: { grade: "pending", evidence: "" }`,
    `  IL: { grade: "pending", evidence: "" }`,
    `  SC: { grade: "pending", evidence: "" }`,
    `  RA: { grade: "pending", evidence: "" }`,
    `  PO: { grade: "pending", evidence: "" }`,
    ``,
    `weighted_score: null  # 待人工评分后计算`,
    ``,
    `# ── 关键发现（来自 regression fail）──────────────────────────────────────`,
    `key_findings:`,
    taskResult.failed_assertions.length > 0
      ? taskResult.failed_assertions.map((f, i) =>
          `  - id: "F${i+1}"\n    category: "regression_fail"\n    severity: "P1"\n    description: "${(f.reason||f.assertion_id).replace(/"/g, "'")}"`
        ).join('\n')
      : `  []`,
    ``,
    `# ── 回归断言结果（自动填入）────────────────────────────────────────────────`,
    `regression_check_results:`,
    `  schema_family: "${taskResult.schema_family}"`,
    `  run_at: "${new Date().toISOString()}"`,
    `  must_total: ${rs.must_total}`,
    `  must_applicable: ${rs.must_applicable}`,
    `  must_pass: ${rs.must_pass}`,
    `  must_fail: ${rs.must_fail}`,
    `  must_unknown: ${rs.must_unknown}`,
    `  must_not_applicable: ${rs.must_not_applicable}`,
    `  should_total: ${rs.should_total}`,
    `  should_applicable: ${rs.should_applicable}`,
    `  should_pass: ${rs.should_pass}`,
    `  should_fail: ${rs.should_fail}`,
    `  should_unknown: ${rs.should_unknown}`,
    `  should_not_applicable: ${rs.should_not_applicable}`,
    `  failed_assertions:`,
    failList || `    []`,
  ].join('\n');

  const outPath = join(monitorDir, `evaluation-${taskId}.yaml`);
  writeFileSync(outPath, yaml, 'utf8');
  return outPath;
}

// ─── 聚合报告 ─────────────────────────────────────────────────────────────────

function buildAggregateReport(taskResults) {
  const byFamily = {};
  const byAssertion = {};
  ASSERTIONS.forEach(a => {
    byAssertion[a.id] = { level: a.level, pass: 0, fail: 0, unknown: 0, not_applicable: 0, total: 0 };
  });

  for (const tr of taskResults) {
    const fam = tr.schema_family;
    if (!byFamily[fam]) byFamily[fam] = { must_fail: 0, must_pass: 0, must_unknown: 0, task_count: 0 };
    byFamily[fam].task_count++;
    byFamily[fam].must_fail    += tr.summary.must_fail;
    byFamily[fam].must_pass    += tr.summary.must_pass;
    byFamily[fam].must_unknown += tr.summary.must_unknown;

    for (const r of tr.results) {
      if (byAssertion[r.assertion_id]) {
        byAssertion[r.assertion_id].total++;
        byAssertion[r.assertion_id][r.result]++;
      }
    }
  }

  // Safe-to-proceed judgment: v2.0-traced cohort MUST-FAIL count
  const v20 = byFamily['v2.0-traced'] || { must_fail: 0 };
  const safe_to_proceed = v20.must_fail === 0;

  return {
    generated_at: new Date().toISOString().slice(0, 10),
    task_count: taskResults.length,
    by_schema_family: byFamily,
    by_assertion: byAssertion,
    safe_to_proceed,
    total_must_fail: taskResults.reduce((s, t) => s + t.summary.must_fail, 0),
    total_must_unknown: taskResults.reduce((s, t) => s + t.summary.must_unknown, 0),
  };
}

// ─── Markdown 输出 ────────────────────────────────────────────────────────────

function printReport(taskResults, aggregate) {
  console.log('\n══════════════ Regression Check Results ══════════════');
  console.log(`Tasks: ${aggregate.task_count}   MUST-FAIL: ${aggregate.total_must_fail}   MUST-UNKNOWN: ${aggregate.total_must_unknown}`);
  console.log(`Safe to proceed: ${aggregate.safe_to_proceed ? '✓ YES' : '✗ NO (v2.0-traced cohort has MUST failures)'}`);

  console.log('\n── Per-assertion Summary ──');
  console.log('Assertion'.padEnd(35), 'PASS  FAIL  UNKN  N/A');
  for (const [id, s] of Object.entries(aggregate.by_assertion)) {
    console.log(
      `[${s.level}] ${id}`.padEnd(35),
      String(s.pass).padStart(4), String(s.fail).padStart(6), String(s.unknown).padStart(6), String(s.not_applicable).padStart(5)
    );
  }

  console.log('\n── By Schema Family ──');
  for (const [fam, s] of Object.entries(aggregate.by_schema_family)) {
    console.log(`  ${fam} (${s.task_count} tasks): PASS=${s.must_pass} FAIL=${s.must_fail} UNKNOWN=${s.must_unknown}`);
  }

  const failures = taskResults.filter(t => t.failed_assertions.length > 0);
  if (failures.length > 0) {
    console.log(`\n── Failing Tasks (${failures.length}) ──`);
    for (const t of failures) {
      console.log(`  ${t.task_id} [${t.schema_family}]:`);
      t.failed_assertions.forEach(f => console.log(`    ✗ ${f.assertion_id}: ${f.reason}`));
    }
  }

  const unknowns = taskResults.filter(t => t.summary.must_unknown > 0);
  if (unknowns.length > 0) {
    console.log(`\n── Tasks with UNKNOWN assertions (${unknowns.length}) ──`);
    unknowns.forEach(t => {
      const uk = t.results.filter(r => r.result === 'unknown');
      console.log(`  ${t.task_id} [${t.schema_family}]: ${uk.map(r=>r.assertion_id).join(', ')}`);
    });
  }
}

// ─── 主函数 ───────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(NORM_DIR)) {
    console.error(`normalized/ not found. Run canonical-state-reader.mjs --all first.`);
    process.exit(1);
  }

  // Determine which tasks to check
  let taskIds;
  const cohortIdx = args.indexOf('--cohort');
  if (cohortIdx >= 0 && cohortIdx + 1 < args.length) {
    taskIds = args[cohortIdx + 1].split(',').map(s => s.trim());
  } else if (args.includes('--all')) {
    taskIds = readdirSync(NORM_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  } else {
    // Default: run on v2.0-traced completed tasks (best coverage cohort)
    const allFacts = readdirSync(NORM_DIR).filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(join(NORM_DIR, f), 'utf8')));
    taskIds = allFacts
      .filter(f => f.schema_detection?.schema_family === 'v2.0-traced'
                && f.canonical_task_meta?.status === 'completed')
      .map(f => f.task_id);
    console.log(`(Default cohort: v2.0-traced + completed → ${taskIds.length} tasks)`);
  }

  console.log(`Running ${ASSERTIONS.length} assertions on ${taskIds.length} task(s)…`);

  const taskResults = [];
  const evalPaths   = [];

  for (const taskId of taskIds) {
    const factPath = join(NORM_DIR, `${taskId}.json`);
    if (!existsSync(factPath)) {
      console.warn(`  Skipping ${taskId}: normalized facts not found`);
      continue;
    }
    const fact = JSON.parse(readFileSync(factPath, 'utf8'));
    const result = checkTask(fact);
    taskResults.push(result);

    const icon = result.summary.must_fail > 0 ? '✗' : result.summary.must_unknown > 0 ? '?' : '✓';
    console.log(`  ${icon} ${taskId} [${result.schema_family}]: pass=${result.summary.must_pass} fail=${result.summary.must_fail} unknown=${result.summary.must_unknown} n/a=${result.summary.must_not_applicable}`);

    if (EMIT_EVAL) {
      const p = emitEvaluationYaml(result, fact);
      evalPaths.push(p);
    }
  }

  const aggregate = buildAggregateReport(taskResults);
  printReport(taskResults, aggregate);

  if (SAVE_BASELINE) {
    if (!existsSync(DERIVED_DIR)) mkdirSync(DERIVED_DIR, { recursive: true });
    const date = aggregate.generated_at;
    const outPath = join(DERIVED_DIR, `regression-baseline-${date}.json`);
    writeFileSync(outPath, JSON.stringify({ aggregate, taskResults }, null, 2), 'utf8');
    console.log(`\nBaseline saved: ${outPath}`);
  }

  if (EMIT_EVAL && evalPaths.length > 0) {
    console.log(`\nEvaluation YAMLs written (${evalPaths.length}):`);
    evalPaths.forEach(p => console.log(`  ${p}`));
  }
}

main().catch(err => { console.error('Fatal:', err.message, err.stack); process.exit(2); });

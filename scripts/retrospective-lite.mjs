#!/usr/bin/env node
// retrospective-lite.mjs — DevFlow自迭代系统 Step 2b
// 只读 _derived/normalized/*.json，按 parse_coverage 分项统计跨任务模式。
// 输出: _derived/retrospective-lite-{date}.md + .json
// 三类统计: hard_fact / inferred / unknown_due_to_schema_drift
// Zero npm dependencies.

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, basename } from 'path';

const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const DEVFLOW_ROOT = resolve(SCRIPT_DIR, '..');
const STATE_DIR = join(DEVFLOW_ROOT, 'orchestrator-state');
const DERIVED_DIR = join(STATE_DIR, '_derived');
const NORMALIZED_DIR = join(DERIVED_DIR, 'normalized');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n, total) {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const k = keyFn(item) ?? 'null';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

// ─── Load all normalized facts ────────────────────────────────────────────────

function loadNormalizedFacts() {
  if (!existsSync(NORMALIZED_DIR)) {
    console.error(`normalized/ dir not found at ${NORMALIZED_DIR}`);
    console.error('Run canonical-state-reader.mjs --all first.');
    process.exit(1);
  }
  const files = readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try { return JSON.parse(readFileSync(join(NORMALIZED_DIR, f), 'utf8')); }
    catch (e) { console.warn(`Failed to parse ${f}: ${e.message}`); return null; }
  }).filter(Boolean);
}

// ─── Coverage check helper ────────────────────────────────────────────────────

const isReadable = (cov) => cov && cov !== 'none';

// ─── Aggregate statistics ─────────────────────────────────────────────────────

function aggregate(facts) {
  const total = facts.length;
  const report = {
    generated_at: new Date().toISOString().slice(0, 10),
    total_tasks: total,
    hard_fact: {},
    inferred: {},
    unknown_due_to_schema_drift: {},
    per_task_summary: [],
  };

  // ── HARD FACT: computable for all tasks ──────────────────────────────────

  // 1. Schema family distribution
  report.hard_fact.schema_family_distribution = countBy(
    facts, f => f.schema_detection?.schema_family
  );

  // 2. Task status distribution (from canonical_task_meta)
  report.hard_fact.task_status_distribution = countBy(
    facts, f => f.canonical_task_meta?.status
  );

  // 3. Task type distribution
  report.hard_fact.task_type_distribution = countBy(
    facts, f => f.canonical_task_meta?.task_type
  );

  // 4. Has external repo (project_id present)
  const externalRepoCount = facts.filter(f => f.canonical_task_meta?.project_id).length;
  report.hard_fact.external_repo_tasks = { count: externalRepoCount, pct: pct(externalRepoCount, total) };

  // 5. Decisions coverage
  const withDecisions = facts.filter(f => isReadable(f.parse_coverage?.decisions));
  report.hard_fact.decisions_coverage = {
    tasks_with_decisions: withDecisions.length,
    pct: pct(withDecisions.length, total),
  };

  // 6. Gate 1/2/3 presence (hard fact: file existence)
  let gate1Count = 0, gate2Count = 0, gate3Count = 0;
  for (const f of facts) {
    const gates = (f.canonical_decisions || []).map(d => d.gate_id);
    if (gates.includes('gate-1')) gate1Count++;
    if (gates.includes('gate-2')) gate2Count++;
    if (gates.includes('gate-3')) gate3Count++;
  }
  report.hard_fact.gate_presence = {
    gate_1: { count: gate1Count, pct: pct(gate1Count, total) },
    gate_2: { count: gate2Count, pct: pct(gate2Count, total) },
    gate_3: { count: gate3Count, pct: pct(gate3Count, total) },
  };

  // 7. Issues coverage + object_family distribution
  const withIssues = facts.filter(f => isReadable(f.parse_coverage?.issues) && f.canonical_issues?.length > 0);
  const allIssues = facts.flatMap(f => f.canonical_issues || []);
  report.hard_fact.issues = {
    tasks_with_issues: withIssues.length,
    pct: pct(withIssues.length, total),
    total_issue_records: allIssues.length,
    object_family_distribution: countBy(allIssues, i => i.object_family),
  };

  // 8. Artifacts coverage + change-package presence
  const withArtifacts = facts.filter(f => isReadable(f.parse_coverage?.artifacts) && f.canonical_artifacts?.length > 0);
  const tasksWithChangePkg = facts.filter(f =>
    f.canonical_artifacts?.some(a => a.name.startsWith('change-package'))
  );
  report.hard_fact.artifacts = {
    tasks_with_artifacts: withArtifacts.length,
    pct: pct(withArtifacts.length, total),
    tasks_with_change_package: tasksWithChangePkg.length,
    change_package_pct: pct(tasksWithChangePkg.length, total),
  };

  // 9. Monitor directory coverage (from state store artifact scan)
  const tasksWithMonitor = facts.filter(f =>
    f.canonical_artifacts?.some(a => a.name.includes('evaluation') || a.name.includes('audit') || a.name.includes('review'))
    || existsSync(join(STATE_DIR, f.task_id, 'monitor'))
  );
  report.hard_fact.monitor_coverage = {
    tasks_with_monitor: tasksWithMonitor.length,
    pct: pct(tasksWithMonitor.length, total),
  };

  // ── INFERRED: parse_coverage is "partial" → include but tag ──────────────

  // 10. Gate decision type distribution (decisions partial = some fields inferred)
  const allDecisions = facts.flatMap(f => f.canonical_decisions || []);
  const decisionValues = allDecisions.filter(d => d.decision).map(d => d.decision.toUpperCase());
  report.inferred.gate_decision_distribution = {
    _note: 'inferred: gate naming partially non-canonical in some tasks',
    distribution: countBy(decisionValues, v => v),
    total_gate_records: allDecisions.length,
  };

  // 11. Issue severity distribution (partial parse for some)
  const severityDist = countBy(
    allIssues.filter(i => i.severity_tier),
    i => i.severity_tier
  );
  const missingSeverityCount = allIssues.filter(i => !i.severity_tier).length;
  report.inferred.issue_severity_distribution = {
    _note: 'inferred: severity is text-based (not enum), some mappings may be inaccurate',
    distribution: severityDist,
    unknown_severity_count: missingSeverityCount,
  };

  // 12. Phase progression patterns (partial for v1.5-flat tasks)
  const phasePatterns = countBy(
    facts,
    f => f.canonical_task_meta?.current_phase || 'unknown'
  );
  report.inferred.phase_at_completion = {
    _note: 'inferred: current_phase may be current_stage alias in old tasks',
    distribution: phasePatterns,
  };

  // 13. Continuation usage (from decisions)
  const continuationCounts = facts.map(f => {
    const continuations = (f.canonical_decisions || []).filter(d =>
      d._source_file && d._source_file.startsWith('continuation-')
    );
    return continuations.length;
  });
  const tasksWithContinuation = continuationCounts.filter(c => c > 0).length;
  const maxContinuations = Math.max(0, ...continuationCounts);
  report.inferred.continuation_usage = {
    _note: 'inferred: based on decisions/ file scan',
    tasks_using_continuation: tasksWithContinuation,
    max_continuations_in_task: maxContinuations,
  };

  // ── UNKNOWN DUE TO SCHEMA DRIFT ────────────────────────────────────────────

  // 14. Trace completeness — only computable for v2.0-traced
  const v15flatTasks = facts.filter(f => f.schema_detection?.schema_family === 'v1.5-flat');
  const traceable    = facts.filter(f => isReadable(f.parse_coverage?.events) &&
    f.schema_detection?.schema_family === 'v2.0-traced');
  const withTrace    = traceable.filter(f =>
    f.canonical_events?.some(e => e.payload?.trace_id || e._source_family === 'v2.0-traced')
  );
  report.unknown_due_to_schema_drift.trace_completeness = {
    _note: `NOT COMPUTED for ${v15flatTasks.length} v1.5-flat tasks (parse_coverage.events=partial, no trace_id/span_id)`,
    computable_tasks: traceable.length,
    tasks_with_trace_evidence: withTrace.length,
    v15_flat_unknown_count: v15flatTasks.length,
  };

  // 15. Artifact consumption chain — requires events payload
  const noPayloadTasks = facts.filter(f => f.parse_coverage?.events !== 'high');
  const artifactConsumedEvents = facts
    .filter(f => f.parse_coverage?.events === 'high')
    .flatMap(f => (f.canonical_events || []).filter(e => e.event_type === 'artifact_consumed'));
  report.unknown_due_to_schema_drift.artifact_consumption_chain = {
    _note: `NOT COMPUTED for ${noPayloadTasks.length} tasks without high-confidence events (v1.5-flat has no payload wrapper)`,
    tasks_without_payload: noPayloadTasks.length,
    artifact_consumed_events_found: artifactConsumedEvents.length,
    computable_tasks: facts.length - noPayloadTasks.length,
  };

  // 16. Actor independence — requires actors coverage
  const noActorsTasks = facts.filter(f => f.parse_coverage?.actors === 'none');
  report.unknown_due_to_schema_drift.actor_independence = {
    _note: `NOT COMPUTED for ${noActorsTasks.length} tasks with parse_coverage.actors=none (all v1.5-flat)`,
    tasks_with_no_actor_data: noActorsTasks.length,
    tasks_potentially_checkable: facts.length - noActorsTasks.length,
    _caveat: 'partial_until_audited: v1.0 and v2.0 actor coverage pending schema-audit confirmation',
  };

  // ── Per-task summary ───────────────────────────────────────────────────────

  report.per_task_summary = facts.map(f => ({
    task_id: f.task_id,
    schema_family: f.schema_detection?.schema_family,
    status: f.canonical_task_meta?.status,
    task_type: f.canonical_task_meta?.task_type,
    events_cov: f.parse_coverage?.events,
    decisions_cov: f.parse_coverage?.decisions,
    issues_cov: f.parse_coverage?.issues,
    actors_cov: f.parse_coverage?.actors,
    gate_3_present: (f.canonical_decisions || []).some(d => d.gate_id === 'gate-3'),
    change_pkg_present: (f.canonical_artifacts || []).some(a => a.name.startsWith('change-package')),
    issue_count: (f.canonical_issues || []).length,
    warnings_count: (f.normalization_warnings || []).length,
  }));

  return report;
}

// ─── Markdown 报告生成 ────────────────────────────────────────────────────────

function buildMarkdown(r) {
  const hf = r.hard_fact;
  const inf = r.inferred;
  const unk = r.unknown_due_to_schema_drift;

  const lines = [
    `# DevFlow Retrospective-Lite`,
    ``,
    `生成时间：${r.generated_at}　｜　任务总数：${r.total_tasks}`,
    ``,
    `> ⚠️ 本报告为"lite"版本，仅统计高置信可计算项。部分指标需等完整 retrospective 扫描后才可计算。`,
    ``,
    `---`,
    ``,
    `## 📊 Hard Facts（全任务可信统计）`,
    ``,
    `### Schema Family 分布`,
    Object.entries(hf.schema_family_distribution).map(([k, v]) =>
      `- **${k}**: ${v} 个任务 (${pct(v, r.total_tasks)})`).join('\n'),
    ``,
    `### 任务状态 & 类型`,
    `| 状态 | 数量 |`,
    `|------|------|`,
    ...Object.entries(hf.task_status_distribution).map(([k, v]) => `| ${k} | ${v} |`),
    ``,
    `### Gate 覆盖率`,
    `| Gate | 有决策记录的任务 |`,
    `|------|----------------|`,
    `| Gate 1（方向）| ${hf.gate_presence.gate_1.count} / ${r.total_tasks}（${hf.gate_presence.gate_1.pct}）|`,
    `| Gate 2（Scope）| ${hf.gate_presence.gate_2.count} / ${r.total_tasks}（${hf.gate_presence.gate_2.pct}）|`,
    `| Gate 3（验收）| ${hf.gate_presence.gate_3.count} / ${r.total_tasks}（${hf.gate_presence.gate_3.pct}）|`,
    ``,
    `### Artifacts & Change-Package`,
    `- 有 artifacts 的任务：${hf.artifacts.tasks_with_artifacts} / ${r.total_tasks}（${hf.artifacts.pct}）`,
    `- 有 change-package 的任务：${hf.artifacts.tasks_with_change_package} / ${r.total_tasks}（${hf.artifacts.change_package_pct}）`,
    ``,
    `### Issues 记录`,
    `- 有 issue 记录的任务：${hf.issues.tasks_with_issues} / ${r.total_tasks}（${hf.issues.pct}）`,
    `- 总 issue 条目：${hf.issues.total_issue_records}`,
    `- object_family 分布：${JSON.stringify(hf.issues.object_family_distribution)}`,
    ``,
    `### 自评覆盖率`,
    `- 有 monitor/ 自评记录的任务：${hf.monitor_coverage.tasks_with_monitor} / ${r.total_tasks}（${hf.monitor_coverage.pct}）`,
    ``,
    `---`,
    ``,
    `## 🔶 Inferred（部分推断，含置信度说明）`,
    ``,
    `> 以下统计包含 parse_coverage = "partial" 的任务，结果已标注 inferred。`,
    ``,
    `### Gate 决策类型分布`,
    `_${inf.gate_decision_distribution._note}_`,
    ``,
    Object.entries(inf.gate_decision_distribution.distribution).map(([k, v]) =>
      `- **${k}**: ${v}`).join('\n') || '- 无数据',
    ``,
    `### Issue Severity 分布`,
    `_${inf.issue_severity_distribution._note}_`,
    ``,
    Object.entries(inf.issue_severity_distribution.distribution).map(([k, v]) =>
      `- **${k}**: ${v}`).join('\n') || '- 无数据',
    inf.issue_severity_distribution.unknown_severity_count > 0
      ? `- **severity 无法映射**: ${inf.issue_severity_distribution.unknown_severity_count}`
      : '',
    ``,
    `### Continuation Protocol 使用情况`,
    `_${inf.continuation_usage._note}_`,
    ``,
    `- 使用 continuation 的任务：${inf.continuation_usage.tasks_using_continuation}`,
    `- 单任务最多 continuation 次数：${inf.continuation_usage.max_continuations_in_task}`,
    ``,
    `---`,
    ``,
    `## ❓ Unknown（因 schema drift 无法计算）`,
    ``,
    `### Trace Completeness`,
    `> ${unk.trace_completeness._note}`,
    `- 可计算任务：${unk.trace_completeness.computable_tasks}`,
    `- 有 trace 证据的任务：${unk.trace_completeness.tasks_with_trace_evidence}`,
    ``,
    `### Artifact Consumption Chain`,
    `> ${unk.artifact_consumption_chain._note}`,
    `- 无 payload 的任务（无法检查）：${unk.artifact_consumption_chain.tasks_without_payload}`,
    `- 可查到的 artifact_consumed 事件：${unk.artifact_consumption_chain.artifact_consumed_events_found}`,
    ``,
    `### Actor Independence (审查独立性)`,
    `> ${unk.actor_independence._note}`,
    `- 无 actor 数据的任务：${unk.actor_independence.tasks_with_no_actor_data}`,
    `- 理论上可检查的任务：${unk.actor_independence.tasks_potentially_checkable}`,
    `- ⚠️ ${unk.actor_independence._caveat}`,
    ``,
    `---`,
    ``,
    `## 各任务摘要`,
    ``,
    `| 任务 | schema | status | events | actors | gate-3 | change-pkg | issues |`,
    `|------|--------|--------|--------|--------|--------|-----------|--------|`,
    ...r.per_task_summary.map(t =>
      `| \`${t.task_id}\` | ${t.schema_family} | ${t.status||'—'} | ${t.events_cov} | ${t.actors_cov} | ${t.gate_3_present?'✓':'—'} | ${t.change_pkg_present?'✓':'—'} | ${t.issue_count} |`
    ),
    ``,
    `---`,
    ``,
    `> 本报告由 \`scripts/retrospective-lite.mjs\` 自动生成，消费 \`_derived/normalized/\` 下的 canonical facts。`,
  ];
  return lines.filter(l => l !== null && l !== undefined).join('\n');
}

// ─── CLI 主函数 ───────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DERIVED_DIR)) mkdirSync(DERIVED_DIR, { recursive: true });

  console.log('Loading normalized facts…');
  const facts = loadNormalizedFacts();
  console.log(`Loaded ${facts.length} tasks`);

  const report = aggregate(facts);
  const date = report.generated_at;

  const jsonPath = join(DERIVED_DIR, `retrospective-lite-${date}.json`);
  const mdPath   = join(DERIVED_DIR, `retrospective-lite-${date}.md`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(mdPath, buildMarkdown(report), 'utf8');

  console.log(`\nOutput:`);
  console.log(`  ${mdPath}`);
  console.log(`  ${jsonPath}`);

  // Quick summary
  const hf = report.hard_fact;
  console.log(`\nKey findings:`);
  console.log(`  Schema families: ${JSON.stringify(hf.schema_family_distribution)}`);
  console.log(`  Task status: ${JSON.stringify(hf.task_status_distribution)}`);
  console.log(`  Change-package coverage: ${hf.artifacts.change_package_pct}`);
  console.log(`  Monitor/self-eval coverage: ${hf.monitor_coverage.pct}`);
  console.log(`  Gate 3 present: ${hf.gate_presence.gate_3.pct}`);
  console.log(`  Unknown (v1.5-flat, no actors): ${report.unknown_due_to_schema_drift.actor_independence.tasks_with_no_actor_data}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(2); });

#!/usr/bin/env node
// schema-audit.mjs — DevFlow自迭代系统 Step 0
// 扫描全部 orchestrator-state/* 任务，通过多信号组合识别 schema_family
// 输出: _derived/schema-audit-{date}.json + .md
// Zero npm dependencies.

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, basename } from 'path';

// ─── 路径配置 ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const DEVFLOW_ROOT = resolve(SCRIPT_DIR, '..');
const STATE_DIR = join(DEVFLOW_ROOT, 'orchestrator-state');
const DERIVED_DIR = join(STATE_DIR, '_derived');

function usage() {
  console.error(`Usage:
  node scripts/schema-audit.mjs --all
  node scripts/schema-audit.mjs --task-dir orchestrator-state/my-task

Options:
  --all          Scan all task directories under orchestrator-state/
  --task-dir P   Scan a single task directory
  --output-dir D Output directory (default: orchestrator-state/_derived)`);
  process.exit(2);
}

// ─── Schema Signal 检测 ──────────────────────────────────────────────────────

/**
 * 从 events.jsonl 的前 N 行提取多维度信号。
 * 遵循计划：单一字段不足以决定 family，需多信号组合。
 */
function detectEventSignals(taskDir) {
  const filePath = join(taskDir, 'events.jsonl');
  if (!existsSync(filePath)) {
    return {
      signals: null,
      schema_family: 'unknown',
      schema_detection_confidence: 'low',
      known_issues: ['events.jsonl not found'],
    };
  }

  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 5);
  if (lines.length === 0) {
    return {
      signals: null,
      schema_family: 'unknown',
      schema_detection_confidence: 'low',
      known_issues: ['events.jsonl is empty'],
    };
  }

  // Parse first 5 events (fault-tolerant)
  const events = [];
  for (const line of lines) {
    try { events.push(JSON.parse(line)); } catch { /* skip corrupt */ }
  }
  if (events.length === 0) {
    return {
      signals: null,
      schema_family: 'unknown',
      schema_detection_confidence: 'low',
      known_issues: ['events.jsonl: all sampled lines failed JSON parse'],
    };
  }

  const first = events[0];

  // Build schema_signals from the first event (+ trace check across all sampled)
  const signals = {
    has_event_alias:         'event' in first && !('event_type' in first),
    uses_ts_not_timestamp:   'ts' in first && !('timestamp' in first),
    payload_flattened:       !('payload' in first),
    has_event_version_field: 'event_version' in first,
    has_trace_span:          events.some(e => 'trace_id' in e || 'span_id' in e),
    has_payload_object:      'payload' in first && typeof first.payload === 'object',
  };

  const { schema_family, schema_detection_confidence, known_issues } =
    classifyFamily(signals);

  return { signals, schema_family, schema_detection_confidence, known_issues };
}

/**
 * 规则驱动的 family 分类。
 * 基于信号权重和组合，而非单字段 if/else。
 */
function classifyFamily(s) {
  const known_issues = [];

  // v1.5-flat: has_event_alias 是最强判别信号
  if (s.has_event_alias) {
    const supporting = [s.uses_ts_not_timestamp, s.payload_flattened, !s.has_payload_object];
    const matchCount = supporting.filter(Boolean).length;
    let confidence;
    if (matchCount === 3) confidence = 'high';
    else if (matchCount >= 1) confidence = 'medium';
    else {
      confidence = 'low';
      known_issues.push('has_event_alias=true but other v1.5 signals contradictory');
    }
    if (s.has_trace_span) known_issues.push('unexpected trace_id in event-alias schema');
    return { schema_family: 'v1.5-flat', schema_detection_confidence: confidence, known_issues };
  }

  // v2.0-traced: has_trace_span 是最强判别信号
  if (s.has_trace_span) {
    const supporting = [!s.has_event_alias, s.has_payload_object, !s.uses_ts_not_timestamp];
    const matchCount = supporting.filter(Boolean).length;
    const confidence = matchCount >= 2 ? 'high' : 'medium';
    if (!s.has_payload_object) known_issues.push('has_trace_span but no payload object — unusual for v2.0');
    return { schema_family: 'v2.0-traced', schema_detection_confidence: confidence, known_issues };
  }

  // v1.0-structured: no alias, no trace, has payload object
  if (s.has_payload_object && !s.has_event_alias) {
    const supporting = [!s.uses_ts_not_timestamp, !s.has_trace_span, s.has_event_version_field];
    const matchCount = supporting.filter(Boolean).length;
    const confidence = matchCount >= 2 ? 'high' : 'medium';
    return { schema_family: 'v1.0-structured', schema_detection_confidence: confidence, known_issues };
  }

  // Unknown — signals insufficient or contradictory
  known_issues.push('signals insufficient to determine family');
  return { schema_family: 'unknown', schema_detection_confidence: 'low', known_issues };
}

// ─── task.yaml Variant 检测 ──────────────────────────────────────────────────

function detectTaskYamlVariant(taskDir) {
  const filePath = join(taskDir, 'task.yaml');
  if (!existsSync(filePath)) return 'missing';
  const content = readFileSync(filePath, 'utf8');

  const hasCurrentStage   = /^current_stage:/m.test(content);
  const hasCurrentPhase   = /^current_phase:/m.test(content);
  const hasProjectId      = /^project_id:/m.test(content);
  const hasDevflowRoot    = /^devflow_root:/m.test(content);
  const hasCompletedPhases = /^completed_phases:/m.test(content);
  const hasOpenIssuesCount = /^open_issues_count:/m.test(content);
  const hasOpenIssuesArray = /^open_issues:\s*[\r\n]/m.test(content);

  if (hasProjectId || hasDevflowRoot) return 'latest';      // V4.5 external repo
  if (hasCurrentPhase && hasCompletedPhases && hasOpenIssuesCount) return 'new';
  if (hasCurrentPhase && hasOpenIssuesCount) return 'mixed';
  if (hasCurrentStage || hasOpenIssuesArray) return 'old';
  return 'unknown';
}

// ─── decisions/ 命名模式扫描 ─────────────────────────────────────────────────

function scanDecisionsVariant(taskDir) {
  const dir = join(taskDir, 'decisions');
  if (!existsSync(dir)) return { files: [], gate_patterns: [], has_user_feedback: false };

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') && !f.startsWith('.'));
  const gateFiles = files.filter(f => /gate/i.test(f) || /decision_id/i.test(f));

  const gate_patterns = new Set();
  let has_user_feedback = false;

  for (const file of gateFiles) {
    const content = readFileSync(join(dir, file), 'utf8');
    if (/^gate:\s*direction/m.test(content)) gate_patterns.add('gate:direction (string)');
    if (/^gate:\s*\d/m.test(content)) gate_patterns.add('gate:number');
    if (/^decision_id:/m.test(content)) gate_patterns.add('decision_id:');
    if (/^gate_type:/m.test(content)) gate_patterns.add('gate_type:');
    if (/^user_feedback:/m.test(content)) has_user_feedback = true;
  }

  return { files: files.length, gate_patterns: [...gate_patterns], has_user_feedback };
}

// ─── issues/ severity 模式扫描 ──────────────────────────────────────────────

function scanIssuesSeverityPattern(taskDir) {
  const dir = join(taskDir, 'issues');
  if (!existsSync(dir)) return { count: 0, severity_values: [], missing_status_count: 0 };

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') && !f.startsWith('.'));
  const severity_values = new Set();
  let missing_status_count = 0;

  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf8');
    const sevMatch = content.match(/^severity:\s*["']?([^\s"'\r\n]+)/m);
    if (sevMatch) severity_values.add(sevMatch[1].toLowerCase());
    if (!/^status:/m.test(content)) missing_status_count++;
  }

  return { count: files.length, severity_values: [...severity_values], missing_status_count };
}

// ─── 单任务完整审计 ──────────────────────────────────────────────────────────

function auditTask(taskDir) {
  const taskId = basename(taskDir);
  const { signals, schema_family, schema_detection_confidence, known_issues } =
    detectEventSignals(taskDir);
  const task_yaml_variant = detectTaskYamlVariant(taskDir);
  const decisions = scanDecisionsVariant(taskDir);
  const issues = scanIssuesSeverityPattern(taskDir);

  // Accumulate additional known_issues
  const allKnownIssues = [...known_issues];
  if (signals?.has_event_alias) allKnownIssues.push('event_field_is_alias_not_event_type');
  if (signals && !signals.has_payload_object && !signals.has_event_alias)
    allKnownIssues.push('no_payload_wrapper_unexpected');
  if (signals?.has_event_alias && !signals?.uses_ts_not_timestamp)
    allKnownIssues.push('partial_v15_signals');

  // Determine parse_confidence_overall
  let parse_confidence_overall;
  if (schema_detection_confidence === 'high' && schema_family !== 'unknown') {
    parse_confidence_overall = schema_family === 'v1.5-flat' ? 'partial' : 'high';
  } else if (schema_detection_confidence === 'medium') {
    parse_confidence_overall = 'partial';
  } else {
    parse_confidence_overall = 'low';
  }

  return {
    schema_family,
    schema_signals: signals,
    schema_detection_confidence,
    task_yaml_variant,
    parse_confidence_overall,
    decisions_files: decisions.files,
    decisions_gate_patterns: decisions.gate_patterns,
    decisions_has_user_feedback: decisions.has_user_feedback,
    issues_count: issues.count,
    issues_severity_values: issues.severity_values,
    issues_missing_status_count: issues.missing_status_count,
    has_monitor_dir: existsSync(join(taskDir, 'monitor')),
    known_issues: allKnownIssues,
  };
}

// ─── 全局聚合 ────────────────────────────────────────────────────────────────

function buildReport(taskResults) {
  const distribution = {};
  const high_confidence_tasks = [];
  const partial_parse_tasks = [];
  const all_severity_values = new Set();
  const all_gate_patterns = new Set();
  let tasks_with_monitor = 0;

  for (const [taskId, result] of Object.entries(taskResults)) {
    // Family distribution
    distribution[result.schema_family] = (distribution[result.schema_family] || 0) + 1;

    // Confidence buckets
    if (result.parse_confidence_overall === 'high') high_confidence_tasks.push(taskId);
    else partial_parse_tasks.push(taskId);

    // Aggregates
    result.issues_severity_values.forEach(v => all_severity_values.add(v));
    result.decisions_gate_patterns.forEach(p => all_gate_patterns.add(p));
    if (result.has_monitor_dir) tasks_with_monitor++;
  }

  const total = Object.keys(taskResults).length;

  return {
    generated_at: new Date().toISOString().slice(0, 10),
    total_tasks: total,
    tasks: taskResults,
    alias_map: {
      'event': 'event_type',
      'ts': 'timestamp (UTC normalized)',
      'current_stage': 'current_phase',
      'open_issues[array]': 'open_issues_count',
    },
    schema_family_distribution: distribution,
    high_confidence_tasks,
    partial_parse_tasks,
    aggregate: {
      tasks_with_monitor,
      monitor_coverage_pct: Math.round((tasks_with_monitor / total) * 100),
      all_severity_values_seen: [...all_severity_values].sort(),
      all_gate_naming_patterns: [...all_gate_patterns],
      state_reader_silent_fail_tasks: partial_parse_tasks.filter(
        t => taskResults[t]?.schema_family === 'v1.5-flat'
      ),
    },
  };
}

// ─── Markdown 报告生成 ───────────────────────────────────────────────────────

function buildMarkdown(report) {
  const lines = [
    `# DevFlow Schema Audit Report`,
    ``,
    `生成时间：${report.generated_at}　｜　任务总数：${report.total_tasks}`,
    ``,
    `## Schema Family 分布`,
    ``,
    `| Family | 任务数 | 说明 |`,
    `|--------|--------|------|`,
    `| v1.0-structured | ${report.schema_family_distribution['v1.0-structured'] || 0} | event_type + payload，无 trace |`,
    `| v1.5-flat | ${report.schema_family_distribution['v1.5-flat'] || 0} | event alias + ts + 扁平化，state-reader.mjs 静默失败 |`,
    `| v2.0-traced | ${report.schema_family_distribution['v2.0-traced'] || 0} | event_type + payload + trace_id/span_id |`,
    `| unknown | ${report.schema_family_distribution['unknown'] || 0} | 信号不足，无法判定 |`,
    ``,
    `## 可解析性`,
    ``,
    `- **高置信可解析**（${report.high_confidence_tasks.length}）：${report.high_confidence_tasks.join('、') || '—'}`,
    `- **仅 partial parse**（${report.partial_parse_tasks.length}）：${report.partial_parse_tasks.join('、') || '—'}`,
    ``,
    `## state-reader.mjs 静默失败范围`,
    ``,
    `以下任务使用 v1.5-flat schema（event alias），当前 state-reader.mjs 对这些任务的事件解析**静默返回空数组**：`,
    ``,
    report.aggregate.state_reader_silent_fail_tasks.length > 0
      ? report.aggregate.state_reader_silent_fail_tasks.map(t => `- \`${t}\``).join('\n')
      : '- 无',
    ``,
    `## Decisions 命名模式`,
    ``,
    `发现的 gate 命名风格：${report.aggregate.all_gate_naming_patterns.join('、') || '—'}`,
    ``,
    `## Issues Severity 值分布`,
    ``,
    `发现的 severity 值（文本而非 P0/P1/P2 枚举）：${report.aggregate.all_severity_values_seen.join('、') || '—'}`,
    ``,
    `## 自评覆盖率`,
    ``,
    `有 monitor/ 目录的任务：${report.aggregate.tasks_with_monitor} / ${report.total_tasks}（${report.aggregate.monitor_coverage_pct}%）`,
    ``,
    `## 各任务详情`,
    ``,
    `| 任务 | schema_family | confidence | task_yaml | parse | known_issues |`,
    `|------|--------------|-----------|-----------|-------|-------------|`,
    ...Object.entries(report.tasks).map(([id, r]) =>
      `| \`${id}\` | ${r.schema_family} | ${r.schema_detection_confidence} | ${r.task_yaml_variant} | ${r.parse_confidence_overall} | ${r.known_issues.length > 0 ? r.known_issues[0] : '—'} |`
    ),
    ``,
    `---`,
    ``,
    `> 本报告由 \`scripts/schema-audit.mjs\` 自动生成，供 canonical-state-reader.mjs 消费。`,
  ];
  return lines.join('\n');
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

async function main() {
  if (args.length === 0) usage();

  let taskDirs = [];

  if (args.includes('--all')) {
    if (!existsSync(STATE_DIR)) {
      console.error(`Error: orchestrator-state/ not found at ${STATE_DIR}`);
      process.exit(1);
    }
    taskDirs = readdirSync(STATE_DIR)
      .filter(name => !name.startsWith('_') && !name.startsWith('.'))
      .map(name => join(STATE_DIR, name))
      .filter(dir => {
        try {
          return readdirSync(dir).length > 0; // skip empty dirs
        } catch { return false; }
      });
  } else {
    const taskDirIdx = args.indexOf('--task-dir');
    if (taskDirIdx < 0 || taskDirIdx + 1 >= args.length) usage();
    const rawPath = args[taskDirIdx + 1];
    taskDirs = [resolve(rawPath)];
  }

  const outputDirIdx = args.indexOf('--output-dir');
  const outputDir = outputDirIdx >= 0 ? resolve(args[outputDirIdx + 1]) : DERIVED_DIR;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  console.log(`Auditing ${taskDirs.length} task(s)…`);

  const taskResults = {};
  for (const taskDir of taskDirs) {
    const taskId = basename(taskDir);
    process.stdout.write(`  ${taskId}… `);
    try {
      taskResults[taskId] = auditTask(taskDir);
      console.log(`${taskResults[taskId].schema_family} [${taskResults[taskId].schema_detection_confidence}]`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      taskResults[taskId] = {
        schema_family: 'unknown',
        schema_signals: null,
        schema_detection_confidence: 'low',
        task_yaml_variant: 'unknown',
        parse_confidence_overall: 'low',
        decisions_files: 0,
        decisions_gate_patterns: [],
        decisions_has_user_feedback: false,
        issues_count: 0,
        issues_severity_values: [],
        issues_missing_status_count: 0,
        has_monitor_dir: false,
        known_issues: [`audit_error: ${err.message}`],
      };
    }
  }

  const report = buildReport(taskResults);
  const date = report.generated_at;

  const jsonPath = join(outputDir, `schema-audit-${date}.json`);
  const mdPath   = join(outputDir, `schema-audit-${date}.md`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(mdPath,   buildMarkdown(report), 'utf8');

  console.log(`\nOutput:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${mdPath}`);

  // Summary
  const dist = report.schema_family_distribution;
  console.log(`\nSummary:`);
  console.log(`  v1.0-structured: ${dist['v1.0-structured'] || 0} tasks`);
  console.log(`  v1.5-flat:       ${dist['v1.5-flat'] || 0} tasks  ← state-reader silent-fail`);
  console.log(`  v2.0-traced:     ${dist['v2.0-traced'] || 0} tasks`);
  console.log(`  unknown:         ${dist['unknown'] || 0} tasks`);
  console.log(`  high-confidence: ${report.high_confidence_tasks.length} tasks`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(2);
});

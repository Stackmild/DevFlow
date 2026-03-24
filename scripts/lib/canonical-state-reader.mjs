#!/usr/bin/env node
// canonical-state-reader.mjs — DevFlow自迭代系统 Step 1
// 将多代 schema 归一到 canonical facts，供 retrospective / regression 消费。
// 原始文件不改写；normalized 结果写到 _derived/normalized/{task_id}.json
// Zero npm dependencies.
//
// CLI: node scripts/lib/canonical-state-reader.mjs --all
//      node scripts/lib/canonical-state-reader.mjs --task-dir orchestrator-state/foo
// Export: import { canonicalizeTask, loadLatestAudit } from './lib/canonical-state-reader.mjs'

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve, basename } from 'path';

// ─── 路径配置 ─────────────────────────────────────────────────────────────────

const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const SCRIPTS_DIR = resolve(SCRIPT_DIR, '..');
const DEVFLOW_ROOT = resolve(SCRIPTS_DIR, '..');
const STATE_DIR = join(DEVFLOW_ROOT, 'orchestrator-state');
const DERIVED_DIR = join(STATE_DIR, '_derived');
const NORMALIZED_DIR = join(DERIVED_DIR, 'normalized');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 简单的单行 YAML 字段提取（零依赖，适合 flat YAML）*/
function yamlField(content, key) {
  const re = new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?`, 'm');
  const m = content.match(re);
  return m ? m[1].trim() : null;
}

/** 把带时区的 timestamp 统一转成 UTC ISO 字符串（无 npm 依赖）*/
function toUTC(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toISOString();
  } catch { return ts; } // 如果解析失败，原样返回
}

/** severity 文本 → tier */
function severityTier(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/^(p0|blocker|critical|high)$/.test(t)) return 'P0';
  if (/^(p1|medium)$/.test(t)) return 'P1';
  if (/^(p2|low)$/.test(t)) return 'P2';
  return null; // unknown → warning
}

// ─── Schema 信号检测（内联，与 schema-audit 保持一致）────────────────────────

function detectSchemaFromLines(lines) {
  const events = [];
  for (const line of lines.slice(0, 5)) {
    try { events.push(JSON.parse(line)); } catch { /* skip */ }
  }
  if (events.length === 0) return { schema_family: 'unknown', schema_detection_confidence: 'low', schema_signals: null };

  const first = events[0];
  const signals = {
    has_event_alias:         'event' in first && !('event_type' in first),
    uses_ts_not_timestamp:   'ts' in first && !('timestamp' in first),
    payload_flattened:       !('payload' in first),
    has_event_version_field: 'event_version' in first,
    has_trace_span:          events.some(e => 'trace_id' in e || 'span_id' in e),
    has_payload_object:      'payload' in first && typeof first.payload === 'object',
  };

  let schema_family, schema_detection_confidence;
  if (signals.has_event_alias) {
    schema_family = 'v1.5-flat';
    const count = [signals.uses_ts_not_timestamp, signals.payload_flattened, !signals.has_payload_object].filter(Boolean).length;
    schema_detection_confidence = count === 3 ? 'high' : count >= 1 ? 'medium' : 'low';
  } else if (signals.has_trace_span) {
    schema_family = 'v2.0-traced';
    schema_detection_confidence = signals.has_payload_object ? 'high' : 'medium';
  } else if (signals.has_payload_object) {
    schema_family = 'v1.0-structured';
    schema_detection_confidence = !signals.uses_ts_not_timestamp ? 'high' : 'medium';
  } else {
    schema_family = 'unknown';
    schema_detection_confidence = 'low';
  }

  return { schema_family, schema_detection_confidence, schema_signals: signals };
}

// ─── Events 归一化 ────────────────────────────────────────────────────────────

/**
 * 根据 schema_family 归一化单个 raw event 到 canonical 结构。
 * v1.5-flat: event→event_type, ts→timestamp_utc, flat payload→{}
 * v1.0/v2.0: 正常提取
 */
function normalizeEvent(raw, schemaFamily) {
  // 提取 event_type
  let event_type;
  if (schemaFamily === 'v1.5-flat') {
    event_type = raw.event ?? null;
  } else {
    event_type = raw.event_type ?? null;
  }

  // 提取 timestamp → UTC
  const rawTs = schemaFamily === 'v1.5-flat' ? raw.ts : raw.timestamp;
  const timestamp_utc = toUTC(rawTs);

  // 提取 actor（v1.5-flat 没有）
  const actor_type = raw.actor_type ?? null;
  const actor_id   = raw.actor_id   ?? null;

  // 提取 phase（可能在 payload 里，也可能在 raw 里）
  const phase = raw.payload?.phase ?? raw.phase ?? null;

  // 提取 payload（v1.5 无 payload 包装）
  let payload;
  if (schemaFamily === 'v1.5-flat') {
    // 提取非 schema 字段作为 payload
    const { event: _e, ts: _t, task_id: _tid, run_id: _rid, ...rest } = raw;
    payload = rest;
  } else {
    payload = raw.payload ?? {};
  }

  return {
    event_id:        raw.event_id ?? null,
    event_type,
    timestamp_utc,
    actor_type,
    actor_id,
    phase,
    payload,
    _source_family:  schemaFamily,
    _normalized_from: schemaFamily === 'v1.5-flat'
      ? { event: raw.event, ts: raw.ts }
      : undefined,
  };
}

function canonicalizeEvents(taskDir, schemaFamily, warnings) {
  const filePath = join(taskDir, 'events.jsonl');
  if (!existsSync(filePath)) {
    warnings.push('events: events.jsonl not found → parse_coverage.events=none');
    return { events: [], coverage: 'none' };
  }

  const lines = readFileSync(filePath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    warnings.push('events: events.jsonl empty → parse_coverage.events=none');
    return { events: [], coverage: 'none' };
  }

  const events = [];
  let parseErrors = 0;
  for (const line of lines) {
    try {
      events.push(normalizeEvent(JSON.parse(line), schemaFamily));
    } catch { parseErrors++; }
  }

  if (parseErrors > 0) warnings.push(`events: ${parseErrors} lines failed JSON parse`);

  // actors coverage: v1.5-flat has no actor fields
  const hasActors = schemaFamily !== 'v1.5-flat'
    ? events.some(e => e.actor_type !== null)
    : false;

  const eventsCoverage = schemaFamily === 'unknown' ? 'none'
    : schemaFamily === 'v1.5-flat' ? 'partial' : 'high';

  const actorsCoverage = schemaFamily === 'v1.5-flat' ? 'none'
    : hasActors ? 'partial_until_audited' : 'none';

  if (schemaFamily === 'v1.5-flat') {
    warnings.push('actors: actor_type/actor_id not available in v1.5-flat schema → parse_coverage.actors=none');
  }

  return { events, eventsCoverage, actorsCoverage };
}

// ─── Decisions 归一化 ─────────────────────────────────────────────────────────

/**
 * 从 decisions/ 目录读取 gate 相关决策文件并归一化。
 * 处理 4 种命名风格：gate:direction, gate:N, decision_id:gate-b, gate_type:final
 */
function canonicalizeDecisions(taskDir, warnings) {
  const dir = join(taskDir, 'decisions');
  if (!existsSync(dir)) {
    warnings.push('decisions: directory not found → parse_coverage.decisions=none');
    return { decisions: [], coverage: 'none' };
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') && !f.startsWith('.'));
  if (files.length === 0) {
    return { decisions: [], coverage: 'none' };
  }

  const decisions = [];
  let parseable = 0;

  for (const file of files) {
    // Only process gate/decision files; skip routing, skip, continuation files
    const isGate = /gate|decision_id/i.test(file) && !/routing|phase-skip|continuation/i.test(file);
    if (!isGate) continue;

    const content = readFileSync(join(dir, file), 'utf8');

    // Extract gate_id and gate_type from various naming styles
    let gate_id, gate_type;
    const gateRaw    = yamlField(content, 'gate');
    const gateTypeRaw = yamlField(content, 'gate_type');
    const decisionId  = yamlField(content, 'decision_id');

    if (decisionId) {
      // Style: decision_id: gate-b  →  gate-3 final
      gate_id   = decisionId === 'gate-b' ? 'gate-3' : decisionId;
      gate_type = gateTypeRaw || (decisionId === 'gate-b' ? 'final' : null);
    } else if (gateRaw) {
      if (/^direction$/i.test(gateRaw)) {
        gate_id = 'gate-1'; gate_type = 'direction';
      } else if (/^final$/i.test(gateRaw)) {
        gate_id = 'gate-3'; gate_type = 'final';
      } else if (/^\d+$/.test(gateRaw)) {
        const n = parseInt(gateRaw);
        gate_id = `gate-${n}`;
        gate_type = gateTypeRaw || (n === 1 ? 'direction' : n === 2 ? 'scope' : 'final');
      } else {
        // Handle underscore patterns: gate_1 → gate-1, gate_b → gate-3
        // These appear in YAML files written as `gate: gate_1` or `gate: gate_b`
        // gate_1 / gate-1 style
        const usMatch = gateRaw.match(/^gate[_-](\d+|[abc])$/i);
        // bare letter: gate: B  (historical Gate B = final acceptance)
        const bareLetterMatch = !usMatch && gateRaw.match(/^([abc])$/i);
        if (usMatch || bareLetterMatch) {
          const raw = (usMatch ? usMatch[1] : bareLetterMatch[1]).toLowerCase();
          if (/^\d+$/.test(raw)) {
            const n = parseInt(raw);
            gate_id = `gate-${n}`;
            gate_type = gateTypeRaw || (n === 1 ? 'direction' : n === 2 ? 'scope' : 'final');
          } else if (raw === 'a') {
            // Gate A = direction (Gate 1)
            gate_id = 'gate-1'; gate_type = gateTypeRaw || 'direction';
          } else {
            // Gate B/C = final acceptance (Gate 3)
            gate_id = 'gate-3'; gate_type = gateTypeRaw || 'final';
          }
        } else {
          gate_id = gateRaw; gate_type = gateTypeRaw || null;
          warnings.push(`decisions: non-canonical gate value "${gateRaw}" in ${file}`);
        }
      }
    } else {
      // Try to infer from filename
      const fnMatch = file.match(/gate-?(\d+|[abc])/i);
      if (fnMatch) {
        const raw = fnMatch[1];
        gate_id = `gate-${raw}`;
        gate_type = gateTypeRaw || null;
      } else {
        warnings.push(`decisions: cannot determine gate_id from ${file}`);
        gate_id = file.replace('.yaml', ''); gate_type = null;
      }
    }

    const decision   = yamlField(content, 'decision');
    const rawTime    = yamlField(content, 'decided_at') || yamlField(content, 'timestamp');
    const decided_at = toUTC(rawTime);
    const decided_by = yamlField(content, 'decided_by');
    const user_notes = yamlField(content, 'user_notes');

    if (decision) parseable++;

    decisions.push({
      gate_id,
      gate_type,
      decision,
      decided_at,
      decided_by,
      user_notes,
      _source_file: file,
    });
  }

  const coverage = parseable === 0 ? 'none' : parseable < decisions.length ? 'partial' : 'high';
  return { decisions, coverage };
}

// ─── Issues 归一化 ───────────────────────────────────────────────────────────

function canonicalizeIssues(taskDir, warnings) {
  const dir = join(taskDir, 'issues');
  if (!existsSync(dir)) {
    return { issues: [], coverage: 'none' };
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') && !f.startsWith('.'));
  if (files.length === 0) return { issues: [], coverage: 'none' };

  const issues = [];
  let completeCount = 0;

  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf8');

    const issue_id     = yamlField(content, 'issue_id') || yamlField(content, 'gap_id');
    const object_family = yamlField(content, 'object_family');
    const severity_text = yamlField(content, 'severity');
    const status        = yamlField(content, 'status');
    const source_skill  = yamlField(content, 'source_skill') || yamlField(content, 'source_reviewer');
    const blockingRaw   = yamlField(content, 'blocking');
    const is_blocker    = blockingRaw === 'true' || /^(p0|blocker|critical|high)$/i.test(severity_text || '');

    const severity_tier = severityTier(severity_text);
    if (severity_text && !severity_tier) {
      warnings.push(`issues: unknown severity value "${severity_text}" in ${file}`);
    }
    if (!status) {
      warnings.push(`issues: missing status field in ${file}`);
    }

    if (issue_id && severity_text && status) completeCount++;

    issues.push({
      issue_id,
      object_family,
      severity_text,
      severity_tier,
      is_blocker,
      status: status || null,
      source_skill,
      _source_file: file,
    });
  }

  const coverage = completeCount === 0 ? 'none'
    : completeCount < issues.length ? 'partial' : 'high';
  return { issues, coverage };
}

// ─── Artifacts 归一화 ────────────────────────────────────────────────────────

function canonicalizeArtifacts(taskDir, warnings) {
  const dir = join(taskDir, 'artifacts');
  if (!existsSync(dir)) {
    warnings.push('artifacts: artifacts/ directory not found → parse_coverage.artifacts=none');
    return { artifacts: [], coverage: 'none' };
  }

  const files = readdirSync(dir).filter(f => !f.startsWith('.') && !f.startsWith('_'));
  if (files.length === 0) return { artifacts: [], coverage: 'none' };

  // Classify artifacts by phase based on naming conventions
  const PHASE_HINTS = {
    'task-brief': 'phase_a', 'product-spec': 'phase_b', 'routing-decision-B': 'phase_b',
    'architecture': 'phase_c', 'backend': 'phase_c', 'interaction': 'phase_c', 'frontend': 'phase_c',
    'implementation': 'phase_d', 'change-package': 'phase_d', 'code-review': 'phase_d',
    'consistency-audit': 'phase_d', 'prerelease': 'phase_d', 'review-completeness': 'phase_d',
  };
  const phaseFor = (name) => {
    for (const [hint, phase] of Object.entries(PHASE_HINTS)) {
      if (name.includes(hint)) return phase;
    }
    return null;
  };

  const artifacts = files.map(name => ({
    name,
    exists: true,
    phase: phaseFor(name),
  }));

  return { artifacts, coverage: 'high' };
}

// ─── Task Meta 归一化 ─────────────────────────────────────────────────────────

function canonicalizeTaskMeta(taskDir, taskId, warnings) {
  const filePath = join(taskDir, 'task.yaml');
  if (!existsSync(filePath)) {
    warnings.push('task_meta: task.yaml not found → parse_coverage.task_meta=none');
    return { meta: { task_id: taskId, task_type: null, project_id: null, devflow_root: null, project_path: null, created_at: null, current_phase: null, status: null }, coverage: 'none' };
  }

  const content = readFileSync(filePath, 'utf8');

  const task_type   = yamlField(content, 'task_type');
  const project_id  = yamlField(content, 'project_id');
  const devflow_root = yamlField(content, 'devflow_root');
  const project_path = yamlField(content, 'project_path');
  const created_at  = toUTC(yamlField(content, 'created_at'));
  const status      = yamlField(content, 'status');

  // current_phase: prefer new field, fall back to current_stage
  const current_phase = yamlField(content, 'current_phase') || yamlField(content, 'current_stage');

  const meta = {
    task_id: taskId,
    task_type: task_type || null,
    project_id: project_id || null,
    devflow_root: devflow_root || null,
    project_path: project_path || null,
    created_at,
    current_phase: current_phase || null,
    status: status || null,
  };

  const presentCount = Object.values(meta).filter(v => v !== null && v !== taskId).length;
  const coverage = presentCount >= 4 ? 'high' : presentCount >= 2 ? 'partial' : 'none';

  return { meta, coverage };
}

// ─── 完整任务归一化 ───────────────────────────────────────────────────────────

export function canonicalizeTask(taskDir, auditEntry = null) {
  const taskId = basename(taskDir);
  const warnings = [];

  // Get schema detection (from audit entry if available, else re-detect)
  let schemaDetection;
  if (auditEntry && auditEntry.schema_family !== 'unknown') {
    schemaDetection = {
      schema_family: auditEntry.schema_family,
      schema_signals: auditEntry.schema_signals,
      schema_detection_confidence: auditEntry.schema_detection_confidence,
    };
  } else {
    // Re-detect inline
    const eventsPath = join(taskDir, 'events.jsonl');
    if (existsSync(eventsPath)) {
      const lines = readFileSync(eventsPath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
      schemaDetection = detectSchemaFromLines(lines);
    } else {
      schemaDetection = { schema_family: 'unknown', schema_detection_confidence: 'low', schema_signals: null };
    }
  }

  const { schema_family } = schemaDetection;

  // Normalize each component
  const { events, eventsCoverage, actorsCoverage } = canonicalizeEvents(taskDir, schema_family, warnings);
  const { decisions, coverage: decisionsCoverage } = canonicalizeDecisions(taskDir, warnings);
  const { issues, coverage: issuesCoverage }       = canonicalizeIssues(taskDir, warnings);
  const { artifacts, coverage: artifactsCoverage } = canonicalizeArtifacts(taskDir, warnings);
  const { meta: canonical_task_meta, coverage: taskMetaCoverage } = canonicalizeTaskMeta(taskDir, taskId, warnings);

  // actors coverage: mark as partial_until_audited for v1.0/v2.0 per plan note
  const actorsCov = schema_family === 'v1.5-flat' ? 'none'
    : (actorsCoverage || 'partial_until_audited');

  const parse_coverage = {
    events:    eventsCoverage    || 'none',
    decisions: decisionsCoverage || 'none',
    issues:    issuesCoverage    || 'none',
    artifacts: artifactsCoverage || 'none',
    actors:    actorsCov,
    task_meta: taskMetaCoverage  || 'none',
  };

  return {
    task_id: taskId,
    schema_detection: schemaDetection,
    parse_coverage,
    canonical_task_meta,
    canonical_events:    events,
    canonical_decisions: decisions,
    canonical_issues:    issues,
    canonical_artifacts: artifacts,
    normalization_warnings: warnings,
  };
}

// ─── 加载最新 schema-audit 结果 ──────────────────────────────────────────────

export function loadLatestAudit(derivedDir = DERIVED_DIR) {
  if (!existsSync(derivedDir)) return null;
  const auditFiles = readdirSync(derivedDir)
    .filter(f => f.startsWith('schema-audit-') && f.endsWith('.json'))
    .sort() // YYYY-MM-DD 格式可直接字典排序
    .reverse();
  if (auditFiles.length === 0) return null;
  try {
    return JSON.parse(readFileSync(join(derivedDir, auditFiles[0]), 'utf8'));
  } catch { return null; }
}

// ─── CLI 主函数 ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/lib/canonical-state-reader.mjs --all | --task-dir <path>');
    process.exit(2);
  }

  let taskDirs = [];

  if (args.includes('--all')) {
    if (!existsSync(STATE_DIR)) { console.error(`State dir not found: ${STATE_DIR}`); process.exit(1); }
    taskDirs = readdirSync(STATE_DIR)
      .filter(n => !n.startsWith('_') && !n.startsWith('.'))
      .map(n => join(STATE_DIR, n))
      .filter(d => { try { return readdirSync(d).length > 0; } catch { return false; } });
  } else {
    const idx = args.indexOf('--task-dir');
    if (idx < 0 || idx + 1 >= args.length) { console.error('--task-dir <path> required'); process.exit(2); }
    taskDirs = [resolve(args[idx + 1])];
  }

  // Load schema audit for efficiency (skip re-detection)
  const audit = loadLatestAudit();
  if (audit) console.log(`Using schema audit: ${Object.keys(audit.tasks).length} tasks cached`);
  else       console.log('No schema-audit found — will re-detect schema per task');

  if (!existsSync(NORMALIZED_DIR)) mkdirSync(NORMALIZED_DIR, { recursive: true });

  console.log(`\nNormalizing ${taskDirs.length} task(s)…`);
  let success = 0, skipped = 0;

  for (const taskDir of taskDirs) {
    const taskId = basename(taskDir);
    const auditEntry = audit?.tasks?.[taskId] || null;
    process.stdout.write(`  ${taskId}… `);

    try {
      const normalized = canonicalizeTask(taskDir, auditEntry);
      const outPath = join(NORMALIZED_DIR, `${taskId}.json`);
      writeFileSync(outPath, JSON.stringify(normalized, null, 2), 'utf8');

      const cov = normalized.parse_coverage;
      console.log(`${normalized.schema_detection.schema_family} | events:${cov.events} decisions:${cov.decisions} issues:${cov.issues} actors:${cov.actors}`);
      success++;
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone: ${success} normalized, ${skipped} errors`);
  console.log(`Output: ${NORMALIZED_DIR}`);
}

// Run CLI only when executed directly
const isMain = process.argv[1] &&
  decodeURIComponent(process.argv[1]) === decodeURIComponent(new URL(import.meta.url).pathname);
if (isMain) main().catch(err => { console.error('Fatal:', err.message); process.exit(2); });

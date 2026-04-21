// state-reader.mjs — Read events.jsonl + scan decisions/ + issues/ for devflow-gate
// Zero npm dependencies. Pure node:fs + node:path.

import { readFileSync, existsSync, readdirSync, statSync, appendFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Parse events.jsonl with tiered fault tolerance.
 * - Empty/whitespace lines: silently skip
 * - Single corrupt line: WARN + continue
 * - Entire file unreadable: throw
 * Returns { events: Array<object>, warnings: string[], corruptLineCount: number }
 */
export function readEvents(taskDir) {
  const filePath = join(taskDir, 'events.jsonl');
  if (!existsSync(filePath)) return { events: [], warnings: ['events.jsonl not found'], corruptLineCount: 0 };

  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const events = [];
  const warnings = [];
  let corruptLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // silently skip empty/whitespace
    try {
      events.push(JSON.parse(line));
    } catch {
      corruptLineCount++;
      warnings.push(`events.jsonl line ${i + 1}: JSON parse failed, skipped`);
    }
  }

  return { events, warnings, corruptLineCount };
}

/**
 * Check if a file exists in decisions/ directory.
 * Supports glob-like prefix matching: 'phase-skip-phase_c' matches 'phase-skip-phase_c.yaml', 'phase-skip-phase_c-architect.yaml' etc.
 */
export function decisionExists(taskDir, nameOrPrefix) {
  const dir = join(taskDir, 'decisions');
  if (!existsSync(dir)) return false;

  // Exact match first
  if (existsSync(join(dir, nameOrPrefix))) return true;
  if (existsSync(join(dir, nameOrPrefix + '.yaml'))) return true;

  // Prefix match (for phase-skip-{phase}* patterns)
  const files = readdirSync(dir);
  return files.some(f => f.startsWith(nameOrPrefix));
}

/**
 * Find the latest continuation file by sequence number.
 * Returns { exists: boolean, type: string|null, filename: string|null }
 */
export function latestContinuation(taskDir) {
  const dir = join(taskDir, 'decisions');
  if (!existsSync(dir)) return { exists: false, type: null, filename: null };

  const files = readdirSync(dir).filter(f => f.startsWith('continuation-') && f.endsWith('.yaml'));
  if (files.length === 0) return { exists: false, type: null, filename: null };

  // Sort by sequence number (continuation-1.yaml < continuation-2.yaml)
  files.sort((a, b) => {
    const seqA = parseInt(a.match(/continuation-(\d+)/)?.[1] || '0');
    const seqB = parseInt(b.match(/continuation-(\d+)/)?.[1] || '0');
    return seqB - seqA; // descending — latest first
  });

  const latest = files[0];
  const content = readFileSync(join(dir, latest), 'utf8');
  const typeMatch = content.match(/^type:\s*["']?(\w+)/m);
  const type = typeMatch ? typeMatch[1].trim() : null;

  return { exists: true, type, filename: latest };
}

/**
 * Scan issues/ for open blockers.
 * Returns { blockers: Array<{file, severity, status}>, warnings: string[] }
 */
export function scanIssueBlockers(taskDir) {
  const dir = join(taskDir, 'issues');
  if (!existsSync(dir)) return { blockers: [], warnings: [] };

  const BLOCKER_SEVERITY = /^(p0|p1|blocker|critical|high)$/i;
  const CLOSED_STATUS = /^(resolved|known_gap)$/i;

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') && f !== '.gitkeep');
  const blockers = [];
  const warnings = [];

  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf8');
    const sevMatch = content.match(/^severity:\s*(.+)$/m);
    const statusMatch = content.match(/^status:\s*(.+)$/m);

    if (!sevMatch || !statusMatch) {
      warnings.push(`issue ${file}: missing severity/status field — state hygiene incomplete`);
      continue; // non-blocking WARN per plan
    }

    const severity = sevMatch[1].trim().replace(/['"]/g, '');
    const status = statusMatch[1].trim().replace(/['"]/g, '');

    if (BLOCKER_SEVERITY.test(severity) && !CLOSED_STATUS.test(status)) {
      blockers.push({ file, severity, status });
    }
  }

  return { blockers, warnings };
}

/**
 * Find events matching a specific event_type and optional payload condition.
 */
export function findEvents(events, eventType, payloadFilter = null) {
  return events.filter(e => {
    if (e.event_type !== eventType) return false;
    if (!payloadFilter) return true;
    if (!e.payload) return false;
    return Object.entries(payloadFilter).every(([k, v]) =>
      String(e.payload[k]).toLowerCase() === String(v).toLowerCase()
    );
  });
}

/**
 * Get the current phase from events (last phase_entered event).
 */
export function currentPhaseFromEvents(events) {
  const entered = events.filter(e => e.event_type === 'phase_entered');
  if (entered.length === 0) return null;
  return entered[entered.length - 1].payload?.phase || null;
}

/**
 * Scan .permits/ directory for permit filenames.
 * Returns array of filenames only (e.g. ['dispatch_skill-code-reviewer-2026-03-31T10-00-00-000Z.json']).
 * Returns [] if directory does not exist.
 */
export function scanPermits(taskDir) {
  const dir = join(taskDir, '.permits');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json'));
}

// ── Write helpers (transition.mjs) ──────────────────────────────────────────

/**
 * Append one or more events to events.jsonl atomically (single write).
 */
export function appendEvents(taskDir, events) {
  const filePath = join(taskDir, 'events.jsonl');
  const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
  appendFileSync(filePath, lines, 'utf8');
}

/**
 * Update top-level scalar fields in task.yaml (read-modify-write).
 * Existing keys are replaced in-place; missing keys are appended.
 */
export function updateTaskYamlFields(taskDir, updates) {
  const p = join(taskDir, 'task.yaml');
  if (!existsSync(p)) return;
  let content = readFileSync(p, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^(${key}:)\\s*.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `$1 "${value}"`);
    } else {
      content += `\n${key}: "${value}"`;
    }
  }
  writeFileSync(p, content, 'utf8');
}

// ── Enforcer helpers (devflow-enforcer.mjs) ─────────────────────────────────

/**
 * Parse flat YAML scalars from text content. Zero dependencies.
 * Only extracts top-level `key: value` pairs (no nested blocks).
 * Supports: underscore keys, hyphen values, quoted values, inline comments.
 * Indented lines are silently skipped — they belong to nested blocks.
 */
export function parseSimpleYaml(text) {
  const map = {};
  for (const line of text.split('\n')) {
    if (/^\s/.test(line) || !line.includes(':')) continue;
    const idx = line.indexOf(':');
    const key = line.slice(0, idx).trim();
    if (!/^[\w][\w-]*$/.test(key)) continue;
    let val = line.slice(idx + 1).trim();
    // Strip inline comment (but not inside quotes)
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hashIdx = val.indexOf('#');
      if (hashIdx >= 0) val = val.slice(0, hashIdx).trim();
    }
    val = val.replace(/^["']|["']$/g, '');
    map[key] = val;
  }
  return map;
}

/**
 * Read and parse a task.yaml file.
 * Returns parsed flat fields or null if file doesn't exist.
 */
export function readTaskYaml(taskDir) {
  const p = join(taskDir, 'task.yaml');
  if (!existsSync(p)) return null;
  return parseSimpleYaml(readFileSync(p, 'utf8'));
}

/**
 * Check if Gate 3 ACCEPT is recorded for a task.
 */
export function hasGate3Accept(taskDir) {
  return decisionExists(taskDir, 'gate-3.yaml') || decisionExists(taskDir, 'gate-b.yaml');
}

/**
 * Check if at least one continuation decision file exists.
 */
export function hasContinuationDecision(taskDir) {
  const dir = join(taskDir, 'decisions');
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some(f => f.startsWith('continuation-') && f.endsWith('.yaml'));
}

/**
 * State consistency checks for omission detection (Fix 3).
 * Returns { issues: string[] } — non-empty means state anomaly detected.
 */
export function checkStateConsistency(taskDir) {
  const issues = [];
  const task = readTaskYaml(taskDir);
  if (!task) return { issues };
  const { events } = readEvents(taskDir);
  const evtPhase = currentPhaseFromEvents(events);
  const artifactsDir = join(taskDir, 'artifacts');
  const artExists = existsSync(artifactsDir);
  const artFiles = artExists ? readdirSync(artifactsDir) : [];

  // SC-1: task.yaml current_phase vs events.jsonl last phase_entered
  if (task.current_phase && evtPhase && task.current_phase !== evtPhase) {
    issues.push(
      `SC-1: task.yaml current_phase=${task.current_phase} 但 events.jsonl 最后 phase_entered=${evtPhase}` +
      ' — 状态写入可能断流'
    );
  }

  // SC-2: gate decision file exists but no corresponding gate_decision event
  const decisionsDir = join(taskDir, 'decisions');
  if (existsSync(decisionsDir)) {
    for (const n of ['1', '2', '3']) {
      if (decisionExists(taskDir, `gate-${n}.yaml`)) {
        const hasEvt = events.some(e => e.event_type === 'gate_decision' && String(e.payload?.gate) === n);
        if (!hasEvt) {
          issues.push(`SC-2: decisions/gate-${n}.yaml 存在但 events.jsonl 无对应 gate_decision 事件`);
        }
      }
    }
  }

  // SC-3: Phase D + code artifacts exist but no change-package
  if (task.current_phase === 'phase_d') {
    const hasCP = artFiles.some(f => /^change-package-.*\.yaml$/.test(f));
    const hasImpl = artFiles.some(f => f.endsWith('-report.yaml') || f.includes('implementation'));
    if (!hasCP && hasImpl) {
      issues.push('SC-3: 当前 Phase D，有实现产出但无 change-package — D.1 可能未正式产出');
    }
  }

  // SC-4: Phase D + change-package exists but no reviewer report
  if (task.current_phase === 'phase_d') {
    const hasCP = artFiles.some(f => /^change-package-.*\.yaml$/.test(f));
    const reviewerReportPattern = /^(code-reviewer|webapp-consistency-audit|pre-release-test-reviewer|playwright-e2e-testing|e2e-visual-test)-report\.yaml$/;
    const hasReviewReport = artFiles.some(f => reviewerReportPattern.test(f));
    if (hasCP && !hasReviewReport) {
      issues.push('SC-4: change-package 已产出但无 reviewer report — D.2 可能未启动，不得跳到 Gate 3 或 Phase F');
    }
  }

  return { issues };
}

/**
 * Resolve active task from a file path being written.
 * 4-tier priority: path extract → project_path match → env var → null.
 * P4 (global scan) is NOT used here — only for UserPromptSubmit.
 *
 * @param {string} filePath - Absolute path of the file being written
 * @param {string|string[]} stateDir - Absolute path(s) to orchestrator-state/ directories
 * @returns {{ id: string, dir: string, source: string } | null}
 */
export function resolveTaskFromPath(filePath, stateDir) {
  const stateDirs = (Array.isArray(stateDir) ? stateDir : [stateDir]).filter(d => existsSync(d));

  // P1: Extract task_id from orchestrator-state/{task_id}/...
  // Use the actual path from the match — handles external project state dirs
  const osMatch = filePath.match(/(.*\/orchestrator-state)\/([^/]+)\//);
  if (osMatch) {
    const matchedStateDir = osMatch[1];
    const taskId = osMatch[2];
    const taskDir = join(matchedStateDir, taskId);
    if (existsSync(join(taskDir, 'task.yaml'))) {
      return { id: taskId, dir: taskDir, source: 'path_extract' };
    }
  }

  // P2: Match file path against task.yaml project_path (searches all state dirs)
  if (!filePath.includes('orchestrator-state/')) {
    const candidates = [];
    for (const sd of stateDirs) {
      for (const tid of readdirSync(sd)) {
        if (tid === '_derived' || tid.startsWith('.')) continue;
        const tyPath = join(sd, tid, 'task.yaml');
        if (!existsSync(tyPath)) continue;
        const task = parseSimpleYaml(readFileSync(tyPath, 'utf8'));
        if (task.project_path && filePath.startsWith(task.project_path)) {
          let mtime = 0;
          try { mtime = statSync(tyPath).mtimeMs; } catch { /* ignore */ }
          candidates.push({ id: tid, dir: join(sd, tid), status: task.status || '', mtime });
        }
      }
    }
    if (candidates.length === 1) return { ...candidates[0], source: 'project_path' };
    if (candidates.length > 1) {
      candidates.sort((a, b) => {
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        return b.mtime - a.mtime;
      });
      return { ...candidates[0], source: 'project_path_tiebreak' };
    }
  }

  // P3: Environment variable
  const envTaskDir = process.env.DEVFLOW_TASK_DIR;
  if (envTaskDir && existsSync(join(envTaskDir, 'task.yaml'))) {
    const tid = envTaskDir.split('/').filter(Boolean).pop();
    return { id: tid, dir: envTaskDir, source: 'env_var' };
  }

  return null;
}

/**
 * Find the most recently active in_progress task via global scan.
 * Only for UserPromptSubmit hook — NOT for PreToolUse.
 * @param {string|string[]} stateDir - Absolute path(s) to orchestrator-state/ directories
 */
export function resolveTaskGlobalScan(stateDir) {
  const stateDirs = (Array.isArray(stateDir) ? stateDir : [stateDir]);
  const candidates = [];
  for (const sd of stateDirs) {
    if (!existsSync(sd)) continue;
    for (const tid of readdirSync(sd)) {
      if (tid === '_derived' || tid.startsWith('.')) continue;
      const tyPath = join(sd, tid, 'task.yaml');
      if (!existsSync(tyPath)) continue;
      const task = parseSimpleYaml(readFileSync(tyPath, 'utf8'));
      if (task.status === 'in_progress') {
        let mtime = 0;
        try { mtime = statSync(tyPath).mtimeMs; } catch { /* ignore */ }
        candidates.push({ id: tid, dir: join(sd, tid), mtime });
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return { ...candidates[0], source: 'global_scan' };
}

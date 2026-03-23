// state-reader.mjs — Read events.jsonl + scan decisions/ + issues/ for devflow-gate
// Zero npm dependencies. Pure node:fs + node:path.

import { readFileSync, existsSync, readdirSync } from 'fs';
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

// journal.mjs — Transaction journal for transition atomicity (Fix 6A)
// Zero npm dependencies. Companion to atomic.mjs.

import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

const JOURNAL_DIR = '.journal';

function getJournalDir(taskDir) {
  const d = join(taskDir, JOURNAL_DIR);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

/**
 * Write a transaction journal before executing the mutation.
 * The journal records the expected state change so that a crash
 * can be detected and repaired by verify_state --repairable.
 */
export function writeJournal(taskDir, action, beforeState, pendingEvents) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(getJournalDir(taskDir), `${action}-${ts}.json`);
  const entry = {
    action,
    created_at: new Date().toISOString(),
    before_state: beforeState,
    pending_events: pendingEvents,
  };
  writeFileSync(path, JSON.stringify(entry, null, 2) + '\n', 'utf8');
  return path;
}

function listJournals(taskDir) {
  const d = join(taskDir, JOURNAL_DIR);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter(f => f.endsWith('.json'))
    .map(f => join(d, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

/** Read the most recent unresolved journal, if any. */
export function readLatestJournal(taskDir) {
  const journals = listJournals(taskDir);
  if (journals.length === 0) return null;
  try {
    return { path: journals[0], ...JSON.parse(readFileSync(journals[0], 'utf8')) };
  } catch {
    return null;
  }
}

/**
 * Repair an unfinished transaction by comparing journal.pending_events
 * against actual events.jsonl content.
 *
 * Returns one of:
 *   { status: 'none' }                    — no journal found
 *   { status: 'commit',  journal, reason } — all pending events present → safe to finalize
 *   { status: 'rollback', journal, reason } — no pending events present → safe to discard
 *   { status: 'partial',  journal, reason } — some present, some missing → requires manual intervention
 */
export function repairJournal(taskDir, eventsData) {
  const journal = readLatestJournal(taskDir);
  if (!journal) return { status: 'none', action: null };

  const { pending_events = [] } = journal;
  if (pending_events.length === 0) {
    return { status: 'rollback', journal, reason: 'Empty pending_events — nothing to commit' };
  }

  const eventTexts = eventsData.events.map(e => JSON.stringify(e));

  let allFound = true;
  let anyFound = false;
  for (const evt of pending_events) {
    const text = JSON.stringify(evt);
    const found = eventTexts.includes(text);
    if (found) anyFound = true;
    else allFound = false;
  }

  if (allFound) {
    return { status: 'commit', journal, reason: 'All pending events found in events.jsonl' };
  }
  if (!anyFound) {
    return { status: 'rollback', journal, reason: 'No pending events found — transaction never started' };
  }
  return { status: 'partial', journal, reason: 'Some events found, some missing — requires manual intervention' };
}

/** Delete all journal files for a given action. Idempotent. */
export function deleteJournalsForAction(taskDir, action) {
  const d = join(taskDir, JOURNAL_DIR);
  if (!existsSync(d)) return;
  for (const f of readdirSync(d)) {
    if (f.startsWith(`${action}-`) && f.endsWith('.json')) {
      try { unlinkSync(join(d, f)); } catch { /* ignore */ }
    }
  }
}

/** Delete a specific journal file by path. */
export function deleteJournalPath(journalPath) {
  if (!journalPath) return;
  try { unlinkSync(journalPath); } catch { /* ignore */ }
}

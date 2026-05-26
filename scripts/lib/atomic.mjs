// atomic.mjs — File lock helper for transaction atomicity (Fix 6A)
// Zero npm dependencies. Uses openSync(O_CREAT|O_EXCL) for cross-process exclusion.

import { openSync, closeSync, unlinkSync, existsSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOCK_NAME = '.lock';
const RETRY_MAX = 5;
const RETRY_DELAY_MS = 200;
const STALE_AGE_MS = 300000; // 5 minutes

/**
 * Acquire an exclusive lock on a task directory.
 * Uses O_CREAT|O_EXCL via openSync('wx') — atomic across processes.
 *
 * Stale lock detection:
 *   - mtime < 5 min → retry (another process is likely active)
 *   - mtime >= 5 min + pid dead (ESRCH) → delete and retry
 *   - mtime >= 5 min + pid alive → BLOCK after max retries
 *
 * Returns { ok: true, lockPath } or { ok: false, reason: string }.
 */
export function acquireLock(taskDir, action) {
  const lockPath = join(taskDir, LOCK_NAME);
  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const fd = openSync(lockPath, 'wx'); // O_CREAT | O_EXCL
      const info = { pid: process.pid, started_at: new Date().toISOString(), action };
      writeFileSync(fd, JSON.stringify(info) + '\n', 'utf8');
      closeSync(fd);
      return { ok: true, lockPath };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Lock exists — check if stale
      if (isStaleLock(lockPath)) {
        try { unlinkSync(lockPath); } catch { /* ignore race */ }
        continue; // retry immediately
      }
      // Lock held by live process — wait and retry
      if (attempt < RETRY_MAX - 1) {
        const deadline = Date.now() + RETRY_DELAY_MS;
        while (Date.now() < deadline) { /* busy-wait — acceptable for sub-second sync delay */ }
        continue;
      }
      const holder = readLockInfo(lockPath);
      return {
        ok: false,
        reason: `Lock held by pid=${holder?.pid || 'unknown'} since ${holder?.started_at || 'unknown'} (action: ${holder?.action || 'unknown'})`
      };
    }
  }
  return { ok: false, reason: 'Lock acquisition failed after max retries' };
}

/** Release the lock file. Idempotent. */
export function releaseLock(taskDir) {
  const lockPath = join(taskDir, LOCK_NAME);
  try { unlinkSync(lockPath); } catch { /* ignore */ }
}

/** Determine if a lock file is stale (holder dead or age >= 5 min). */
function isStaleLock(lockPath) {
  if (!existsSync(lockPath)) return false;
  try {
    const stats = statSync(lockPath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs < STALE_AGE_MS) return false; // still fresh
    const info = readLockInfo(lockPath);
    if (!info || !info.pid) return true; // no pid info = stale
    try {
      process.kill(info.pid, 0); // check if process exists (signal 0 = no-op)
      return false; // process alive = not stale
    } catch {
      return true; // ESRCH = process dead = stale
    }
  } catch {
    return true; // any error reading lock = treat as stale
  }
}

function readLockInfo(lockPath) {
  try {
    return JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Execute fn under an exclusive lock on taskDir.
 * Releases the lock in a finally block.
 * Throws if lock cannot be acquired.
 */
export function withLock(taskDir, action, fn) {
  const lock = acquireLock(taskDir, action);
  if (!lock.ok) throw new Error(lock.reason);
  try {
    return fn();
  } finally {
    releaseLock(taskDir);
  }
}

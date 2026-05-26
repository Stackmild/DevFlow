// dedup.mjs — 跨进程去重模块（双 hook 不同 pid，必须文件锁）
//
// 策略：O_CREAT | O_EXCL 原子创建 lock 文件。
// 失败 = 已被另一进程处理 → 立刻 allow() 退出。
// 成功 = 第一次处理 → 在 finalizer 阶段不删 lock（让另一进程也走 EEXIST）。
// 后台清理：enforcer 启动时清理 mtime > 30 秒的 stale lock。

import { openSync, closeSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const LOCK_DIR = '/tmp/devflow-enforcer-dedup';

import { mkdirSync } from 'fs';
try { mkdirSync(LOCK_DIR, { recursive: true }); } catch { /* ignore */ }

/**
 * Compute a short SHA-8 fingerprint from tool info.
 * @param {Object} opts
 * @param {string} opts.toolName — e.g. "Write", "Edit", "Task"
 * @param {string} [opts.filePath] — file path (for Write/Edit)
 * @param {string} [opts.taskId] — task_id (for Task)
 * @param {string} [opts.handoffId] — handoff_id (for Task)
 * @param {string} [opts.skillName] — subagent_type (for Task)
 * @returns {string} — 8-char hex fingerprint
 */
export function fingerprint({ toolName, filePath = '', taskId = '', handoffId = '', skillName = '', toolUseId = '' }) {
  const tsWindow = Math.floor(Date.now() / 5000); // 5-second window
  const raw = `${toolName}:${filePath}:${taskId}:${handoffId}:${skillName}:${toolUseId}:${tsWindow}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 8);
}

/**
 * Try to acquire a dedup lock atomically.
 * @param {string} fp — fingerprint from fingerprint()
 * @returns {{isFirst: boolean, lockPath: string}}
 */
export function tryLock(fp) {
  const lockPath = join(LOCK_DIR, `${fp}.lock`);
  try {
    const fd = openSync(lockPath, 'wx');
    closeSync(fd);
    return { isFirst: true, lockPath };
  } catch (err) {
    if (err.code === 'EEXIST') {
      return { isFirst: false, lockPath };
    }
    // Other error (permission, etc.) — treat as not-first to be safe
    return { isFirst: false, lockPath };
  }
}

/**
 * Clean stale locks older than maxAgeMs.
 * Call once at enforcer startup.
 * @param {number} maxAgeMs — default 30 seconds
 */
export function cleanStaleLocks(maxAgeMs = 30000) {
  const now = Date.now();
  let cleaned = 0;
  try {
    const files = readdirSync(LOCK_DIR);
    for (const f of files) {
      if (!f.endsWith('.lock')) continue;
      const p = join(LOCK_DIR, f);
      try {
        const st = statSync(p);
        if (now - st.mtimeMs > maxAgeMs) {
          unlinkSync(p);
          cleaned++;
        }
      } catch {
        // ignore per-file errors
      }
    }
  } catch {
    // lock dir may not exist yet
  }
  return cleaned;
}

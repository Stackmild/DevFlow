#!/usr/bin/env node
// self-improve.mjs — DevFlow-self-improve Skill Step 1 编排脚本
// 自动收集材料：session sync + state/baseline/evaluation，供 AI Step 2 分析使用。
// 不做任何分析，只负责把材料收齐并输出摘要 JSON。
//
// CLI:
//   node scripts/self-improve.mjs                    # Mode B: 全量（不刷 baseline）
//   node scripts/self-improve.mjs --refresh-baseline # Mode B: 全量 + 刷新 baseline
//   node scripts/self-improve.mjs --task <id>        # Mode A: 单任务复盘
//   node scripts/self-improve.mjs --dry-run          # 只做 session sync，不写文件
// Zero npm dependencies.

import {
  readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, statSync
} from 'fs';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

// ─── 路径配置 ─────────────────────────────────────────────────────────────────

const SCRIPT_DIR    = decodeURIComponent(new URL('.', import.meta.url).pathname);
const DEVFLOW_ROOT  = resolve(SCRIPT_DIR, '..');

// --state-dir: override orchestrator-state location for external repos
const stateDirIdx   = process.argv.indexOf('--state-dir');
const STATE_DIR     = stateDirIdx >= 0
  ? resolve(process.argv[stateDirIdx + 1])
  : join(DEVFLOW_ROOT, 'orchestrator-state');
const DERIVED_DIR   = join(STATE_DIR, '_derived');
const CONV_DIR      = join(DERIVED_DIR, 'conversations');
const CONV_INDEX    = join(CONV_DIR, 'extraction-index.json');
const COWORK_BASE   = join(
  process.env.HOME || '/Users/yfguo',
  'Library', 'Application Support', 'Hong Cowork', 'claude-sessions'
);

// ─── 参数解析 ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const taskIdx = args.indexOf('--task');
const TASK_ID          = taskIdx >= 0 ? args[taskIdx + 1] : null;
const MODE             = TASK_ID ? 'A' : 'B';
const DRY_RUN          = args.includes('--dry-run');
const REFRESH_BASELINE = args.includes('--refresh-baseline');

// --log: user-specified chat log paths (files or directories)
const USER_LOG_PATHS = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--log' && i + 1 < args.length) {
    for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) {
      USER_LOG_PATHS.push(...args[j].split(',').map(p => resolve(p)));
    }
  }
}

// ─── UTC 타임스탬프（文件名安全：冒号 → 连字符）────────────────────────────

function makeTimestamp() {
  return new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d+Z$/, 'Z');
}

// ─── 脚本调用工具 ─────────────────────────────────────────────────────────────

function runScript(label, scriptArgs) {
  if (DRY_RUN && !label.startsWith('session-sync')) {
    console.log(`  [dry-run] skip: ${label}`);
    return true;
  }
  console.log(`\n── ${label} ──`);
  const result = spawnSync(
    process.execPath,
    scriptArgs,
    { cwd: DEVFLOW_ROOT, stdio: 'inherit', encoding: 'utf8' }
  );
  if (result.error) {
    console.error(`  ERROR: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`  exited with code ${result.status}`);
    return false;
  }
  return true;
}

// ─── Session Sync ─────────────────────────────────────────────────────────────

/**
 * 扫描 ALL sessions（不限项目路径），返回所有 *.jsonl 文件信息。
 */
function scanAllJSONLFiles(sessionsBase, extraPaths = []) {
  const results = [];

  if (existsSync(sessionsBase)) {
    const sessionDirs = readdirSync(sessionsBase).filter(n => !n.startsWith('.'));
    for (const sessionId of sessionDirs) {
      const sessionPath = join(sessionsBase, sessionId);
      collectJsonlFiles(sessionPath, sessionId, results);
    }
  } else {
    console.warn(`  Cowork sessions dir not found: ${sessionsBase}`);
  }

  for (const p of extraPaths) {
    if (!existsSync(p)) { console.warn(`  --log path not found: ${p}`); continue; }
    const st = statSync(p);
    if (st.isFile()) {
      results.push({
        sessionId: 'user_specified',
        conversationId: p.split('/').pop().replace(/\.(jsonl|md)$/, ''),
        filePath: p,
      });
    } else if (st.isDirectory()) {
      for (const f of readdirSync(p)) {
        if (f.endsWith('.jsonl') || f.endsWith('.md')) {
          results.push({
            sessionId: 'user_specified',
            conversationId: f.replace(/\.(jsonl|md)$/, ''),
            filePath: join(p, f),
          });
        }
      }
    }
  }

  return results;
}

function collectJsonlFiles(dir, sessionId, results) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonlFiles(full, sessionId, results);
    } else if (entry.name.endsWith('.jsonl')) {
      results.push({
        sessionId,
        conversationId: entry.name.replace('.jsonl', ''),
        filePath: full,
      });
    }
  }
}

/**
 * 相关性检测：structured-first, grep-fallback。
 * 当前 Cowork JSONL 中 tool_use name 是通用的（Agent/Read 等），退化为 grep-only。
 * 返回 { relevant: bool, mode: 'structured'|'grep_fallback'|'not_relevant' }
 */
function checkRelevance(filePath) {
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { return { relevant: false, mode: 'not_relevant' }; }

  // Structured check: look for tool_use entries with dev-orchestrator in name
  const lines = content.split('\n').filter(l => l.trim()).slice(0, 100); // sample first 100 lines
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const msgContent = obj.message?.content || [];
      for (const c of (Array.isArray(msgContent) ? msgContent : [])) {
        if (c.type === 'tool_use' && typeof c.name === 'string' &&
            c.name.toLowerCase().includes('dev-orchestrator')) {
          return { relevant: true, mode: 'structured' };
        }
      }
    } catch { /* skip corrupt lines */ }
  }

  // Fallback: text grep
  if (content.includes('@dev-orc') ||
      content.includes('@dev-orchestrator') ||
      content.includes('dev-orchestrator')) {
    return { relevant: true, mode: 'grep_fallback' };
  }

  return { relevant: false, mode: 'not_relevant' };
}

/**
 * 核心 session sync 逻辑。
 * 扫 ALL sessions → 按 @dev-orc 纳入候选 → 区分 new/updated/unchanged。
 * Mode A 时额外按 task_id 过滤（但扫描范围不缩小）。
 */
function sessionSync(taskIdFilter = null) {
  console.log('\n── session-sync ──');
  console.log(`  Scan scope: ALL sessions under ${COWORK_BASE}`);
  console.log(`  Relevance: structured-first, grep-fallback`);
  if (USER_LOG_PATHS.length > 0) console.log(`  User-specified logs: ${USER_LOG_PATHS.join(', ')}`);
  if (taskIdFilter) console.log(`  Task filter: ${taskIdFilter}`);

  // Load existing index
  let index = { processed_sessions: {} };
  if (existsSync(CONV_INDEX)) {
    try { index = JSON.parse(readFileSync(CONV_INDEX, 'utf8')); }
    catch { /* start fresh */ }
  }

  const allFiles = scanAllJSONLFiles(COWORK_BASE, USER_LOG_PATHS);
  console.log(`  Found ${allFiles.length} file(s) across all sessions`);

  const stats = { new: [], updated: [], unchanged: 0, irrelevant: 0, errors: [] };
  const detectionModes = {};

  for (const { sessionId, conversationId, filePath } of allFiles) {
    const existing = index.processed_sessions[conversationId];

    // Check relevance (skip for user-specified files — user explicitly chose them)
    if (sessionId === 'user_specified') {
      detectionModes['user_specified'] = (detectionModes['user_specified'] || 0) + 1;
      if (!existing) {
        index.processed_sessions[conversationId] = { devflow_relevant: true };
      }
    } else if (existing?.devflow_relevant) {
      // Already known relevant — skip re-check
    } else {
      // First time or unknown → check relevance
      const { relevant, mode } = checkRelevance(filePath);
      detectionModes[mode] = (detectionModes[mode] || 0) + 1;
      if (!relevant) {
        stats.irrelevant++;
        continue;
      }
      // Mark as relevant in index (will be written later)
      if (!existing) {
        index.processed_sessions[conversationId] = { devflow_relevant: true };
      } else {
        index.processed_sessions[conversationId].devflow_relevant = true;
      }
    }

    // Check for changes
    let fileStat;
    try { fileStat = statSync(filePath); } catch { stats.errors.push(conversationId); continue; }
    const curSize  = fileStat.size;
    const curMtime = fileStat.mtime.toISOString();
    const ex = index.processed_sessions[conversationId];

    if (!ex?.processed_at) {
      stats.new.push({ sessionId, conversationId, filePath });
    } else if (ex.file_size_at_scan !== curSize || ex.file_mtime_at_scan !== curMtime) {
      stats.updated.push({ sessionId, conversationId, filePath });
    } else {
      stats.unchanged++;
    }
  }

  console.log(`  New: ${stats.new.length} | Updated: ${stats.updated.length} | Unchanged: ${stats.unchanged} | Irrelevant: ${stats.irrelevant}`);
  console.log(`  Relevance detection modes: ${JSON.stringify(detectionModes)}`);

  if (stats.errors.length > 0) {
    console.warn(`  Errors: ${stats.errors.length} files could not be stat'd`);
  }

  // Save updated index (mark newly-discovered relevant sessions)
  if (!existsSync(CONV_DIR)) mkdirSync(CONV_DIR, { recursive: true });
  index.generated_at = new Date().toISOString();
  writeFileSync(CONV_INDEX, JSON.stringify(index, null, 2), 'utf8');

  return {
    stats,
    detectionModes,
    relevance_detection_mode: Object.keys(detectionModes).includes('structured')
      ? 'structured_with_fallback' : 'grep_fallback',
    hasChanges: stats.new.length > 0 || stats.updated.length > 0,
  };
}

// ─── Mode A ───────────────────────────────────────────────────────────────────

async function runModeA(taskId, ts) {
  console.log(`\n════ Mode A: 单任务复盘 (task=${taskId}) ════`);

  // Stage 1: session sync（全量扫 → 按 task_id 过滤写入）
  const syncResult = sessionSync(taskId);

  if (!DRY_RUN) {
    // Stage 2: normalize target task
    runScript('canonical-state-reader (task)', [
      join(SCRIPT_DIR, 'lib', 'canonical-state-reader.mjs'),
      '--task-dir', join(STATE_DIR, taskId),
    ]);

    // Stage 3: regression on target task only (no --save-baseline)
    runScript('regression-check (cohort)', [
      join(SCRIPT_DIR, 'regression-check.mjs'),
      '--cohort', taskId,
      '--emit-evaluation',
    ]);
  }

  // Stage 4: write collect summary (V2: include product-lessons material paths)
  const suffix = `task-${taskId}`;
  const collectPath = join(DERIVED_DIR, `self-improve-collect-${ts}-${suffix}.json`);
  const summary = {
    mode: 'A',
    task_id: taskId,
    timestamp: ts,
    session_sync: syncResult.stats,
    relevance_detection_mode: syncResult.relevance_detection_mode,
    baseline_refreshed: false,
    dry_run: DRY_RUN,
    // V2: product-lessons material references for Step 3
    product_lessons_inputs: {
      snippets_dir: join(CONV_DIR, 'snippets'),
      topics_dir: join(CONV_DIR, 'topics'),
      task_issues_dir: join(STATE_DIR, taskId, 'issues'),
      task_artifacts_dir: join(STATE_DIR, taskId, 'artifacts'),
      task_monitor_dir: join(STATE_DIR, taskId, 'monitor'),
      existing_library: join(DERIVED_DIR, 'product-failure-library.jsonl'),
      existing_ledger: join(DERIVED_DIR, 'product-constraints-ledger.md'),
      existing_playbook: join(DERIVED_DIR, 'product-playbook.md'),
    },
  };

  if (!DRY_RUN) {
    writeFileSync(collectPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`\nCollect summary: ${collectPath}`);
  } else {
    console.log('\n[dry-run] Collect summary (not written):', JSON.stringify(summary, null, 2));
  }

  return summary;
}

// ─── Mode B ───────────────────────────────────────────────────────────────────

async function runModeB(ts) {
  const suffix = REFRESH_BASELINE ? 'modeB-baseline-refresh' : 'modeB';
  console.log(`\n════ Mode B: 全量治理盘点${REFRESH_BASELINE ? ' (+ refresh-baseline)' : ''} ════`);

  // Stage 1: session sync
  const syncResult = sessionSync();

  if (!DRY_RUN) {
    // Stage 2: schema audit
    runScript('schema-audit --all', [
      join(SCRIPT_DIR, 'schema-audit.mjs'), '--all',
    ]);

    // Stage 3: canonical normalization
    runScript('canonical-state-reader --all', [
      join(SCRIPT_DIR, 'lib', 'canonical-state-reader.mjs'), '--all',
    ]);

    // Stage 4: extract conversations (incremental + reprocess updated)
    runScript('extract-conversations --incremental --reprocess-updated', [
      join(SCRIPT_DIR, 'extract-conversations.mjs'),
      '--incremental', '--reprocess-updated',
    ]);

    // Stage 5: regression check (--save-baseline only if --refresh-baseline)
    const regressionArgs = [
      join(SCRIPT_DIR, 'regression-check.mjs'),
      '--all', '--emit-evaluation',
    ];
    if (REFRESH_BASELINE) regressionArgs.push('--save-baseline');
    runScript('regression-check --all', regressionArgs);

    // Stage 6: retrospective lite
    runScript('retrospective-lite', [
      join(SCRIPT_DIR, 'retrospective-lite.mjs'),
    ]);
  }

  // Stage 7: write collect summary (V2: include product-lessons material paths)
  const collectPath = join(DERIVED_DIR, `self-improve-collect-${ts}-${suffix}.json`);
  const summary = {
    mode: 'B',
    timestamp: ts,
    session_sync: syncResult.stats,
    relevance_detection_mode: syncResult.relevance_detection_mode,
    baseline_refreshed: REFRESH_BASELINE,
    dry_run: DRY_RUN,
    // V2: product-lessons material references for Step 3
    product_lessons_inputs: {
      snippets_dir: join(CONV_DIR, 'snippets'),
      topics_dir: join(CONV_DIR, 'topics'),
      all_tasks_state_dir: STATE_DIR,
      existing_library: join(DERIVED_DIR, 'product-failure-library.jsonl'),
      existing_ledger: join(DERIVED_DIR, 'product-constraints-ledger.md'),
      existing_playbook: join(DERIVED_DIR, 'product-playbook.md'),
    },
  };

  if (!DRY_RUN) {
    writeFileSync(collectPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`\nCollect summary: ${collectPath}`);
  } else {
    console.log('\n[dry-run] Collect summary (not written):', JSON.stringify(summary, null, 2));
  }

  return summary;
}

// ─── 主函数 ───────────────────────────────────────────────────────────────────

async function main() {
  const ts = makeTimestamp();
  console.log(`DevFlow-self-improve Step 1 Collector`);
  console.log(`Mode: ${MODE === 'A' ? 'A (single task)' : 'B (full)'} | timestamp: ${ts}`);
  if (DRY_RUN) console.log('  DRY RUN — session sync only, no file writes');

  if (!existsSync(DERIVED_DIR)) mkdirSync(DERIVED_DIR, { recursive: true });

  let summary;
  if (MODE === 'A') {
    if (!TASK_ID) { console.error('--task <task_id> required for Mode A'); process.exit(2); }
    const taskDir = join(STATE_DIR, TASK_ID);
    if (!existsSync(taskDir)) {
      console.error(`Task directory not found: ${taskDir}`);
      process.exit(1);
    }
    summary = await runModeA(TASK_ID, ts);
  } else {
    summary = await runModeB(ts);
  }

  console.log('\n════ Step 1 Complete ════');
  console.log('Next steps for @DevFlow-self-improve:');
  console.log('  Step 2: Read collect summary → produce governance review report');
  console.log('  Step 3: Read snippets/artifacts → update product-failure-library / constraints-ledger / playbook');
  const sfx = MODE === 'A' ? 'task-' + TASK_ID : (REFRESH_BASELINE ? 'modeB-baseline-refresh' : 'modeB');
  console.log(`  Report: _derived/self-improve-report-${ts}-${sfx}.md`);
  console.log(`  Lessons: _derived/product-lessons-summary-${ts}-${sfx}.md`);
}

main().catch(err => { console.error('Fatal:', err.message, err.stack); process.exit(2); });

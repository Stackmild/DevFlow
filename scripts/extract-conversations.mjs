#!/usr/bin/env node
// extract-conversations.mjs — DevFlow自迭代系统 Step 2a
// 从 Cowork session JSONL 提取 DevFlow 相关对话 snippet，按任务/主题分类存储。
// 默认只保存 snippet 元信息（summary + provenance），不保存全文。
// --with-excerpts 模式保存截断 excerpt（≤500字）。
// --debug 模式导出完整降噪 session 文本。
// Zero npm dependencies.

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync, statSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';
import { createHash } from 'crypto';

// ─── 配置 ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const DEVFLOW_ROOT = resolve(SCRIPT_DIR, '..');
const STATE_DIR = join(DEVFLOW_ROOT, 'orchestrator-state');
const DERIVED_DIR = join(STATE_DIR, '_derived');
const CONV_DIR = join(DERIVED_DIR, 'conversations');
const COWORK_SESSIONS_BASE = join(
  process.env.HOME || '/Users/yfguo',
  'Library', 'Application Support', 'Hong Cowork', 'claude-sessions'
);

// The encoded project path segment (derived from the actual path)
const PROJECT_PATH_ENCODED = '-Users-yfguo-Documents------AI-Incorporation-Development---Coding-Workflow';

const WITH_EXCERPTS      = args.includes('--with-excerpts');
const DEBUG_MODE         = args.includes('--debug');
const INCREMENTAL        = args.includes('--incremental');
const REPROCESS_UPDATED  = args.includes('--reprocess-updated');
const EXCERPT_MAX        = 500;
const SUMMARY_MAX        = 200;
const WHY_KEPT_MAX       = 100;

// ─── 已知任务 ID（供 P1 显式绑定）────────────────────────────────────────────

function loadKnownTaskIds() {
  if (!existsSync(STATE_DIR)) return new Set();
  return new Set(
    readdirSync(STATE_DIR).filter(n => !n.startsWith('_') && !n.startsWith('.'))
  );
}

// ─── Anchor 检测 ──────────────────────────────────────────────────────────────

const ANCHOR_PATTERNS = {
  gate_decision:   /\b(GO|ADJUST|RESCOPE|REVISE|ACCEPT|PAUSE|DEFER[\w-]*)\b/,
  phase_name:      /\bphase[_\s-]?[abcdf]\d*\b/i,
  skill_name:      /\b(dev-orchestrator|product-manager|code-reviewer|full-stack-developer|webapp-consistency-audit|state-auditor|web-app-architect|frontend-design|backend-data-api|interaction-designer|release-and-change-manager|component-library-maintainer)\b/i,
  artifact_name:   /\b(change-package|implementation-report|product-spec|design-spec|architecture-spec|code-review-report|handoff-packet|consistency-audit|task-brief|gate-[123]\.yaml)\b/i,
  protocol_term:   /\b(铁律|iron.?law|contract|assertion|regression|protocol|schema|devflow-gate|pre-gate|state.?store|events\.jsonl|task\.yaml)\b/i,
  issue_term:      /\b(issue|blocker|P0|P1|known.?gap|deferred|risk)\b/i,
  gate_term:       /\b(gate.?[123]|gate.?[ABC])\b/i,
  continuation:    /\b(continuation|re.?enter.?d|follow.?up|record.?and.?stop)\b/i,
  eval_term:       /\b(自评|评估|evaluation|self.?review|audit|monitor|compliance)\b/i,
};

function detectAnchors(text) {
  const found = [];
  for (const [type, re] of Object.entries(ANCHOR_PATTERNS)) {
    if (re.test(text)) found.push(type);
  }
  return found;
}

// ─── 任务 ID 绑定 ─────────────────────────────────────────────────────────────

function findTaskIdsInText(text, knownTaskIds) {
  const found = new Set();
  for (const tid of knownTaskIds) {
    if (text.includes(tid)) found.add(tid);
  }
  return [...found];
}

// ─── Topic 分类 ───────────────────────────────────────────────────────────────

function classifyTopic(text, anchorTypes) {
  // High-value topic B conditions
  const hasEval    = /自评|评估|evaluation|self.?review|audit|monitor/i.test(text);
  const hasProtocol = /铁律|iron.?law|protocol|schema|devflow|SKILL\.md|phase.?defin/i.test(text);
  const hasFailure = /bug|error|问题|失败|fail|break|不.?行|报错|crash/i.test(text);
  const hasGateRationale = anchorTypes.some(a => ['gate_decision', 'gate_term'].includes(a));
  const hasRootCause = /根因|root.?cause|为什么|why|原因|分析/i.test(text);

  if (hasProtocol) return 'protocol-iteration';
  if (hasEval)     return 'evaluation';
  if (hasFailure && hasRootCause) return 'failure-analysis';
  if (hasGateRationale) return 'gate-rationale';
  if (hasFailure) return 'failure-analysis';
  return null; // no high-value topic → skip
}

// ─── Snippet Hash ─────────────────────────────────────────────────────────────

function makeSnippetHash(sessionId, messageIds, topic, taskIds) {
  // P1: use message UUIDs (stable across re-cuts if same messages)
  // P2 fallback: use message_range
  const input = [
    sessionId,
    [...messageIds].sort().join(','),
    topic,
    [...taskIds].sort().join(','),
  ].join('|');
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// ─── 加载 extraction index（增量更新用）──────────────────────────────────────

function loadIndex() {
  const p = join(CONV_DIR, 'extraction-index.json');
  if (existsSync(p)) {
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch {}
  }
  return { processed_sessions: {}, generated_at: null };
}

function saveIndex(index) {
  index.generated_at = new Date().toISOString();
  writeFileSync(join(CONV_DIR, 'extraction-index.json'), JSON.stringify(index, null, 2), 'utf8');
}

/**
 * 幂等清理：删除 snippets/ 和 topics/ 中属于该 session 的所有条目。
 * 在 --reprocess-updated 重跑前调用，防止重复 snippet 积累。
 */
function cleanupSessionDerivatives(conversationId) {
  const dirs = [join(CONV_DIR, 'snippets'), join(CONV_DIR, 'topics')];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = join(dir, file);
      const lines = readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
      const filtered = lines.filter(l => {
        try { return JSON.parse(l).session_id !== conversationId; }
        catch { return true; }
      });
      writeFileSync(filePath, filtered.length ? filtered.join('\n') + '\n' : '', 'utf8');
    }
  }
}

// ─── 截断 helper ──────────────────────────────────────────────────────────────

function truncate(text, max) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const head = Math.floor(max * 0.6);
  const tail = max - head - 15;
  return trimmed.slice(0, head) + '…（已截断）…' + trimmed.slice(-tail);
}

// ─── Session 文件发现 ─────────────────────────────────────────────────────────

function findDevFlowSessions(sessionsBase) {
  if (!existsSync(sessionsBase)) {
    console.warn(`Cowork sessions dir not found: ${sessionsBase}`);
    return [];
  }

  const results = [];
  const sessionIds = readdirSync(sessionsBase).filter(n => !n.startsWith('.'));

  for (const sessionId of sessionIds) {
    const projectsDir = join(sessionsBase, sessionId, 'projects');
    if (!existsSync(projectsDir)) continue;

    const projectDirs = readdirSync(projectsDir);
    const devflowDir = projectDirs.find(d => d === PROJECT_PATH_ENCODED);
    if (!devflowDir) continue;

    const projPath = join(projectsDir, devflowDir);
    const jsonlFiles = readdirSync(projPath).filter(f => f.endsWith('.jsonl'));

    for (const jf of jsonlFiles) {
      results.push({
        sessionId,
        sessionFile: join(projPath, jf),
        conversationId: jf.replace('.jsonl', ''),
      });
    }
  }

  return results;
}

// ─── Session 메시지 파싱 ─────────────────────────────────────────────────────

/**
 * 读取 session JSONL，只保留 user + assistant text 消息。
 * 返回: [ { uuid, timestamp, role, text, lineNum } ]
 */
function parseSessionMessages(sessionFile) {
  const raw = readFileSync(sessionFile, 'utf8');
  const lines = raw.split('\n');
  const messages = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    const type = obj.type;
    if (type !== 'user' && type !== 'assistant') continue;

    // Extract text content
    const content = obj.message?.content || obj.content;
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .filter(c => c.type === 'text')
        .map(c => c.text || '')
        .join('\n')
        .trim();
    }

    if (!text) continue; // skip empty

    messages.push({
      uuid: obj.uuid || `line-${i}`,
      timestamp: obj.timestamp || obj.ts || null,
      role: type,
      text,
      lineNum: i + 1,
    });
  }

  return messages;
}

// ─── 讨论单元切段 ─────────────────────────────────────────────────────────────

/**
 * 按讨论单元切段（Condition C）。
 * 策略：维护"当前段的活跃 anchor 集"，当前消息的 anchor 与当前段没有交集时，切段。
 * 额外切段触发：发现新的 task_id anchor（明确主题转换）。
 */
function segmentMessages(messages, knownTaskIds) {
  const segments = [];
  if (messages.length === 0) return segments;

  let currentSegment = [messages[0]];
  let currentAnchors = new Set(detectAnchors(messages[0].text));
  let currentTaskIds = new Set(findTaskIdsInText(messages[0].text, knownTaskIds));

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    const msgAnchors  = new Set(detectAnchors(msg.text));
    const msgTaskIds  = new Set(findTaskIdsInText(msg.text, knownTaskIds));

    // Check for anchor overlap with current segment
    const overlap = [...msgAnchors].some(a => currentAnchors.has(a));
    // Check for explicit task_id switch (new task that wasn't in current segment)
    const newTask = [...msgTaskIds].some(t => !currentTaskIds.has(t)) && msgTaskIds.size > 0;

    if (!overlap && currentAnchors.size > 0 && msgAnchors.size > 0) {
      // No anchor overlap and both have anchors → new segment
      if (currentSegment.length > 0) segments.push(currentSegment);
      currentSegment = [msg];
      currentAnchors = new Set(msgAnchors);
      currentTaskIds = new Set(msgTaskIds);
    } else if (newTask && currentSegment.length > 3) {
      // New task_id after a substantial segment → cut
      segments.push(currentSegment);
      currentSegment = [msg];
      currentAnchors = new Set(msgAnchors);
      currentTaskIds = new Set(msgTaskIds);
    } else {
      // Continue current segment
      currentSegment.push(msg);
      msgAnchors.forEach(a => currentAnchors.add(a));
      msgTaskIds.forEach(t => currentTaskIds.add(t));
    }
  }

  if (currentSegment.length > 0) segments.push(currentSegment);
  return segments;
}

// ─── 任务绑定优先级（Plan P1-P4）─────────────────────────────────────────────

function bindTaskIds(segmentText, segmentMessages, knownTaskIds, sessionHistory) {
  // P1: explicit task_id in text
  const explicit = findTaskIdsInText(segmentText, knownTaskIds);
  if (explicit.length > 0) {
    return { task_ids: explicit, task_binding_mode: 'explicit', task_binding_confidence: 'high' };
  }

  // P2: session_inherited from most recent confirmed task_id in this session
  if (sessionHistory.lastConfirmedTaskId) {
    return {
      task_ids: [sessionHistory.lastConfirmedTaskId],
      task_binding_mode: 'session_inherited',
      task_binding_confidence: 'medium',
    };
  }

  // P3: artifact_inferred — check for gate/artifact filenames
  const artifactMatch = segmentText.match(/\b([\w-]+-\d{8}|[\w-]+v\d[\w-]*|news-digest-[\w-]+|ai-daily-hub-[\w-]+|devflow-[\w-]+)\b/);
  if (artifactMatch && knownTaskIds.has(artifactMatch[1])) {
    return {
      task_ids: [artifactMatch[1]],
      task_binding_mode: 'artifact_inferred',
      task_binding_confidence: 'medium',
    };
  }

  // P4: topic_only
  return { task_ids: [], task_binding_mode: 'topic_only', task_binding_confidence: 'low' };
}

// ─── Snippet 생성 ─────────────────────────────────────────────────────────────

let globalSnippetSeq = 0;

function buildSnippet(segment, sessionId, sessionHistory, knownTaskIds) {
  if (segment.length === 0) return null;

  const fullText = segment.map(m => m.text).join('\n');
  const anchorTypes = [...new Set(segment.flatMap(m => detectAnchors(m.text)))];

  // Condition A: needs at least one anchor
  if (anchorTypes.length === 0) return null;

  // Condition B: high-value topic
  const topic = classifyTopic(fullText, anchorTypes);
  if (!topic) return null;

  // Condition C: satisfied by segmentation algorithm (already done)

  // Task binding
  const { task_ids, task_binding_mode, task_binding_confidence } =
    bindTaskIds(fullText, segment, knownTaskIds, sessionHistory);

  // Update session history for P2
  if (task_ids.length > 0 && task_binding_mode === 'explicit') {
    sessionHistory.lastConfirmedTaskId = task_ids[task_ids.length - 1];
  }

  // Message IDs and ranges
  const messageIds = segment.map(m => m.uuid);
  const messageRange = { start: segment[0].lineNum, end: segment[segment.length - 1].lineNum };
  const timeRange = {
    start: segment[0].timestamp || null,
    end: segment[segment.length - 1].timestamp || null,
  };

  // Extract gate/phase/decision from text
  const gateMatch   = fullText.match(/gate-?([123ABC])/i);
  const phaseMatch  = fullText.match(/\bphase[_-]?([abcdf]\d*)\b/i);
  const decisionMatch = fullText.match(/\b(GO|ADJUST|RESCOPE|REVISE|ACCEPT|PAUSE)\b/);

  // Build summary (≤ SUMMARY_MAX chars) — prefer user messages, skip pure path strings
  const userMessages = segment
    .filter(m => m.role === 'user')
    .map(m => m.text)
    .filter(t => t.length > 20 && !/^[\/~][\w\/\s\-\.]+$/.test(t.trim())) // skip path-only
    .join(' ');
  const rawSummary = userMessages.length > 20 ? userMessages : fullText;
  const summary = truncate(rawSummary.replace(/\n+/g, ' '), SUMMARY_MAX);

  // Why kept
  const why_kept = truncate(
    `${anchorTypes.slice(0,2).join('+')} + ${topic}`,
    WHY_KEPT_MAX
  );

  // snippet_hash (P1: message UUIDs preferred)
  const hasUuids = messageIds.every(id => !id.startsWith('line-'));
  const hashInput = hasUuids ? messageIds : [`${messageRange.start}:${messageRange.end}`];
  const snippet_hash = makeSnippetHash(sessionId, hashInput, topic, task_ids);

  const snippet = {
    snippet_hash,
    snippet_id: `snip-${sessionId.slice(0, 8)}-${String(++globalSnippetSeq).padStart(4, '0')}`,
    session_id: sessionId,
    subagent: false,
    message_range: messageRange,
    time_range: timeRange,
    task_ids,
    task_binding_mode,
    task_binding_confidence,
    topic,
    anchor_types: anchorTypes,
    phase:    phaseMatch  ? `phase_${phaseMatch[1].toLowerCase()}` : null,
    gate:     gateMatch   ? `gate-${gateMatch[1]}` : null,
    decision: decisionMatch ? decisionMatch[1] : null,
    user_feedback_present: segment.some(m => m.role === 'user' && m.text.length > 20),
    confidence: task_binding_confidence === 'high' && anchorTypes.length >= 2 ? 'high' : 'medium',
    summary,
    why_kept,
    provenance: {
      session_file: sessionId, // relative reference; full path avoided for portability
      lines: [messageRange.start, messageRange.end],
      message_ids_used: hasUuids ? 'uuid' : 'line_range_fallback',
    },
    ...(WITH_EXCERPTS && {
      excerpt: truncate(fullText, EXCERPT_MAX),
    }),
  };

  return snippet;
}

// ─── 写入输出 ─────────────────────────────────────────────────────────────────

function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

function appendSnippet(snippet) {
  const line = JSON.stringify(snippet) + '\n';

  // by-task
  if (snippet.task_ids.length > 0) {
    ensureDir(join(CONV_DIR, 'snippets'));
    for (const tid of snippet.task_ids) {
      appendFileSync(join(CONV_DIR, 'snippets', `${tid}.jsonl`), line, 'utf8');
    }
  }

  // by-topic
  ensureDir(join(CONV_DIR, 'topics'));
  appendFileSync(join(CONV_DIR, 'topics', `${snippet.topic}.jsonl`), line, 'utf8');
}

// ─── Session 处理 ─────────────────────────────────────────────────────────────

function processSession(session, knownTaskIds, index) {
  const { sessionId, sessionFile, conversationId } = session;
  const existing = index.processed_sessions[conversationId];

  // --reprocess-updated: check size/mtime; if unchanged, skip; if changed, clean + reprocess
  if (REPROCESS_UPDATED && existing) {
    let stat;
    try { stat = statSync(sessionFile); } catch { /* file gone */ return { snippets: 0, messages: 0 }; }
    const curSize  = stat.size;
    const curMtime = stat.mtime.toISOString();
    if (existing.file_size_at_scan === curSize && existing.file_mtime_at_scan === curMtime) {
      process.stdout.write(`  [unchanged] ${sessionId.slice(0,8)}/${conversationId.slice(0,8)}\n`);
      return { snippets: 0, messages: 0 };
    }
    // Changed → clean derivatives then fall through to reprocess
    process.stdout.write(`  [updated] cleaning + reprocessing ${sessionId.slice(0,8)}/${conversationId.slice(0,8)}… `);
    cleanupSessionDerivatives(conversationId);
    delete index.processed_sessions[conversationId];
  } else if (INCREMENTAL && existing) {
    process.stdout.write(`  [skip] ${sessionId.slice(0, 8)}/${conversationId.slice(0, 8)}… already processed\n`);
    return { snippets: 0, messages: 0 };
  }

  let messages;
  try {
    messages = parseSessionMessages(sessionFile);
  } catch (err) {
    console.warn(`  [error] ${sessionFile}: ${err.message}`);
    return { snippets: 0, messages: 0 };
  }

  if (messages.length === 0) return { snippets: 0, messages: 0 };

  // Debug: export full denoised session text
  if (DEBUG_MODE) {
    ensureDir(join(CONV_DIR, 'debug', 'full-session-export'));
    const debugPath = join(CONV_DIR, 'debug', 'full-session-export', `${sessionId}-${conversationId.slice(0,8)}.md`);
    const content = messages.map(m => `**[${m.role}]** (${m.timestamp || ''})\n${m.text}`).join('\n\n---\n\n');
    writeFileSync(debugPath, content, 'utf8');
  }

  // Segment and extract snippets
  const segments = segmentMessages(messages, knownTaskIds);
  const sessionHistory = { lastConfirmedTaskId: null };
  let snippetCount = 0;

  for (const segment of segments) {
    const snippet = buildSnippet(segment, sessionId, sessionHistory, knownTaskIds);
    if (snippet) {
      appendSnippet(snippet);
      snippetCount++;
    }
  }

  // Mark processed (change 2: add file_size_at_scan, file_mtime_at_scan, devflow_relevant)
  let fileStat;
  try { fileStat = statSync(sessionFile); } catch { fileStat = null; }
  index.processed_sessions[conversationId] = {
    processed_at: new Date().toISOString(),
    messages_parsed: messages.length,
    snippets_extracted: snippetCount,
    file_size_at_scan: fileStat ? fileStat.size : null,
    file_mtime_at_scan: fileStat ? fileStat.mtime.toISOString() : null,
    devflow_relevant: true,  // only processed sessions are devflow_relevant
  };

  return { snippets: snippetCount, messages: messages.length };
}

// ─── 主函数 ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('DevFlow Conversation Extractor (Step 2a)');
  if (WITH_EXCERPTS) console.log('  Mode: with-excerpts (≤500字)');
  if (DEBUG_MODE)    console.log('  Mode: debug (full session export)');
  if (INCREMENTAL)   console.log('  Mode: incremental (skip processed sessions)');
  console.log('');

  ensureDir(CONV_DIR);
  const index = loadIndex();
  const knownTaskIds = loadKnownTaskIds();
  console.log(`Known task IDs: ${knownTaskIds.size}`);

  const sessions = findDevFlowSessions(COWORK_SESSIONS_BASE);
  console.log(`Found ${sessions.length} DevFlow session JSONL file(s)\n`);

  if (sessions.length === 0) {
    console.warn('No DevFlow sessions found. Check COWORK_SESSIONS_BASE path.');
    process.exit(0);
  }

  let totalSnippets = 0, totalMessages = 0;

  for (const session of sessions) {
    process.stdout.write(`  ${session.sessionId.slice(0,8)}/${session.conversationId.slice(0,8)}… `);
    const { snippets, messages } = processSession(session, knownTaskIds, index);
    console.log(`${messages} msgs → ${snippets} snippets`);
    totalSnippets += snippets;
    totalMessages += messages;
  }

  saveIndex(index);

  // Print summary
  console.log(`\nDone:`);
  console.log(`  Sessions processed: ${Object.keys(index.processed_sessions).length}`);
  console.log(`  Messages parsed:    ${totalMessages}`);
  console.log(`  Snippets extracted: ${totalSnippets}`);
  console.log(`\nOutput: ${CONV_DIR}`);

  // Topic breakdown
  if (existsSync(join(CONV_DIR, 'topics'))) {
    const topicFiles = readdirSync(join(CONV_DIR, 'topics')).filter(f => f.endsWith('.jsonl'));
    if (topicFiles.length > 0) {
      console.log('\nBy topic:');
      for (const tf of topicFiles.sort()) {
        const lines = readFileSync(join(CONV_DIR, 'topics', tf), 'utf8').trim().split('\n').filter(Boolean);
        console.log(`  ${tf.replace('.jsonl', '')}: ${lines.length} snippet(s)`);
      }
    }
  }
}

main().catch(err => { console.error('Fatal:', err.message, err.stack); process.exit(2); });

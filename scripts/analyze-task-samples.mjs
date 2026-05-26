#!/usr/bin/env node
// analyze-task-samples.mjs — 分析 Task spawn Pre/Post 采样日志
//
// 回答 Fix 3 Stage 1 的 4 个关键问题：
// 1. PostToolUse Task 是否触发？
// 2. 是否有稳定 tool_use_id 关联 Pre↔Post？
// 3. 成功/失败标识字段？
// 4. 并发率？

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const SAMPLES_PATH = join(REPO_ROOT, 'monitor', 'task-spawn-samples.jsonl');

if (!existsSync(SAMPLES_PATH)) {
  console.log('No samples found. Run DevFlow tasks first to collect data.');
  process.exit(0);
}

const lines = readFileSync(SAMPLES_PATH, 'utf8').split('\n').filter(l => l.trim());
const samples = lines.map(l => {
  try { return JSON.parse(l); }
  catch { return null; }
}).filter(Boolean);

const pre = samples.filter(s => s.event === 'pre-task');
const post = samples.filter(s => s.event === 'post-task');

// Q1: PostToolUse trigger rate
console.log('=== Q1: PostToolUse Task Trigger Rate ===');
console.log(`  Pre-task samples:  ${pre.length}`);
console.log(`  Post-task samples: ${post.length}`);
console.log(`  Ratio: ${pre.length ? ((post.length / pre.length) * 100).toFixed(1) : 'N/A'}%`);
if (post.length < pre.length) {
  console.log('  ⚠️ WARNING: PostToolUse trigger rate < 100%. Stage 2/3 needs fallback (scan-based finalize).');
}

// Q2: tool_use_id stability
console.log('\n=== Q2: tool_use_id Stability ===');
const preWithId = pre.filter(s => s.has_tool_use_id);
const postWithId = post.filter(s => s.has_tool_use_id);
console.log(`  Pre with tool_use_id:  ${preWithId.length}/${pre.length} (${pre.length ? ((preWithId.length/pre.length)*100).toFixed(1) : 'N/A'}%)`);
console.log(`  Post with tool_use_id: ${postWithId.length}/${post.length} (${post.length ? ((postWithId.length/post.length)*100).toFixed(1) : 'N/A'}%)`);
if (preWithId.length > 0 && postWithId.length > 0) {
  console.log('  ✅ Can use tool_use_id for Pre↔Post correlation.');
} else {
  console.log('  ⚠️ No tool_use_id available. Fallback: auth_id in prompt or time-window matching needed.');
}

// Q3: success/failure indicators in Post payload keys
console.log('\n=== Q3: Post Payload Key Analysis ===');
const postKeys = new Map();
for (const s of post) {
  for (const k of s.keys || []) {
    postKeys.set(k, (postKeys.get(k) || 0) + 1);
  }
}
console.log('  Post payload keys (frequency):');
for (const [k, v] of [...postKeys.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k}: ${v}`);
}
const hasResult = postKeys.has('result') || postKeys.has('output') || postKeys.has('status');
console.log(`  ${hasResult ? '✅' : '⚠️'} Result/success indicator keys: ${hasResult ? 'found' : 'not found — need manual inspection of raw samples'}`);

// Q4: Concurrency rate (60-second window)
console.log('\n=== Q4: Concurrency Rate ===');
let concurrentCount = 0;
for (let i = 0; i < samples.length; i++) {
  const s1 = new Date(samples[i].ts).getTime();
  const windowEnd = s1 + 60000;
  const sameTaskSkill = samples.slice(i + 1).filter(s2 => {
    if (new Date(s2.ts).getTime() > windowEnd) return false;
    return s2.subagent_type && s2.subagent_type === samples[i].subagent_type;
  });
  if (sameTaskSkill.length > 0) concurrentCount++;
}
console.log(`  Concurrent same-skill spawns within 60s window: ${concurrentCount}`);
console.log(`  Total unique spawns: ${new Set(samples.filter(s => s.event === 'pre-task').map(s => s.subagent_type)).size}`);

// Stage 2/3 recommendation
console.log('\n=== Recommendation for Stage 2/3 ===');
if (post.length >= pre.length * 0.9 && preWithId.length > 0) {
  console.log('  → STANDARD path: Pre write dispatch_authorized + Post finalize with tool_use_id.');
} else if (post.length >= pre.length * 0.5) {
  console.log('  → UPGRADED path: Pre write dispatch_authorized + Post fallback to time-window matching (tool_use_id unstable).');
} else {
  console.log('  → FALLBACK path: Pre write dispatch_authorized + scan-based finalize (PostToolUse unreliable).');
}

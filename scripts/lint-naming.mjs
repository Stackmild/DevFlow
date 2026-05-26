#!/usr/bin/env node
// lint-naming.mjs — 命名词表一致性校验脚本
//
// 策略：代码文件(.mjs/.js) 只检查引号字符串字面量中的 banned 词；
//       文档文件(.md/.yaml) 豁免（列举禁止别名是合法用途）。
//       YAML 文件中的标量值单独检查。

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const REPO_ROOT = resolve(import.meta.dirname, '..');

// ── 读取 naming-canonical.md 构建校验表 ──────────────────────────────────────

const NC_PATH = join(REPO_ROOT, 'skills-source/dev-orchestrator/protocols/naming-canonical.md');
const ncText = readFileSync(NC_PATH, 'utf8');

// Extract event_type canonical names from the table
const EVENT_TYPE_CANONICAL = [];
const eventTable = ncText.match(/event_type[\s\S]*?\n---/);
if (eventTable) {
  for (const m of eventTable[0].matchAll(/\|\s*\d+\s*\|\s*`([^`]+)`\s*\|/g)) {
    EVENT_TYPE_CANONICAL.push(m[1]);
  }
}

// Extract phase canonical names
const PHASE_CANONICAL = [];
for (const m of ncText.matchAll(/\|\s*`?(phase_[\w_]+)`?\s*\|/g)) {
  PHASE_CANONICAL.push(m[1].replace(/`/g, ''));
}

// Extract task.yaml field names
const FIELD_CANONICAL = [];
const fieldTable = ncText.match(/task\.yaml 字段[\s\S]*?\n---/);
if (fieldTable) {
  for (const m of fieldTable[0].matchAll(/\|\s*`?([\w_]+)`?\s*\|/g)) {
    FIELD_CANONICAL.push(m[1].replace(/`/g, ''));
  }
}

// ── 豁免 ──────────────────────────────────────────────────────────────────────

// key: 相对路径；value: Set(banned词) 或 '*' 表示全豁免
const ALLOWLIST = {
  // lint-naming.mjs itself contains the banned lists as string literals
  'scripts/lint-naming.mjs': '*',
  // naming-canonical.md 本身列举禁止别名
  'skills-source/dev-orchestrator/protocols/naming-canonical.md': '*',
  // event-protocol.md 的禁止别名表格
  'skills-source/dev-orchestrator/event-protocol.md': new Set([
    'skillDispatchAuthorized', 'skillDispatchFailed',
    'skill-dispatch-authorized', 'skill-dispatch-failed',
    'dispatch_authorized', 'skill_authorized', 'skill_dispatch_authorize',
    'gate_b_presented', 'gate_b_accepted', 'phase_skip',
  ]),
  // Legacy files with current_stage — grandfathered, fix on rewrite
  'skills-source/dev-orchestrator/phases/phase-resume.md': new Set(['current_stage']),
  'scripts/retrospective-lite.mjs': new Set(['current_stage']),
  'scripts/schema-audit.mjs': new Set(['current_stage']),
  // Phase alias module intentionally lists legacy aliases
  'scripts/lib/phase-aliases.mjs': new Set(['phase-d']),
  // task-template.yaml 中的 DEPRECATED 注释说明
  'skills-source/dev-orchestrator/task-template.yaml': new Set(['current_stage']),
  // canonical-state-reader.mjs: backward-compatible read of legacy current_stage field
  'scripts/lib/canonical-state-reader.mjs': new Set(['current_stage']),
  // regression-check.mjs: test IDs and template strings with JS variables
  'scripts/regression-check.mjs': new Set(['phase-d', 'taskId']),
  // analyze-task-samples.mjs: permit name references (not event_type)
  'scripts/analyze-task-samples.mjs': new Set(['dispatch_authorized']),
  // bootstrap.mjs: JS variable in template string
  'scripts/lib/checks/bootstrap.mjs': new Set(['taskId']),
  // smoke-devflow-hardening.mjs: JS template literal variables, not YAML field names
  'scripts/smoke-devflow-hardening.mjs': new Set(['taskId', 'dispatch_authorized']),
  // finalize-dispatches.mjs: permit filename patterns (not event_type values)
  'scripts/lib/checks/finalize-dispatches.mjs': new Set(['dispatch_authorized']),
  // incremental-auditor.mjs: permit filename references + JS template variables
  'scripts/incremental-auditor.mjs': new Set(['dispatch_authorized', 'taskId']),
};

// ── 校验规则 ─────────────────────────────────────────────────────────────────

const RULES = [
  {
    name: 'event_type_canonical',
    canonical: EVENT_TYPE_CANONICAL,
    banned: [
      // 驼峰变体
      'skillDispatchAuthorized', 'skillDispatchFailed',
      // kebab 变体
      'skill-dispatch-authorized', 'skill-dispatch-failed',
      // 缩写/漏后缀
      'dispatch_authorized', 'skill_authorized', 'skill_dispatch_authorize',
      'skill_dispatch_failed_event',
      // 旧 V4.2 非标名
      'gate_b_presented', 'gate_b_accepted', 'phase_skip',
    ],
    paths: ['scripts/'],
    // 只检查代码文件（.mjs/.js），文档列举是合法用途
    fileTypes: ['.mjs', '.js'],
  },
  {
    name: 'phase_name_canonical',
    canonical: PHASE_CANONICAL,
    banned: ['phase-d', 'phase-D', 'Phase_D', 'phaseD', 'current_stage'],
    paths: ['scripts/', 'skills-source/'],
    fileTypes: ['.mjs', '.js'],
  },
  {
    name: 'task_yaml_field',
    canonical: FIELD_CANONICAL,
    banned: ['current_stage', 'taskId'],
    paths: ['scripts/'],
    fileTypes: ['.mjs', '.js'],
  },
  {
    name: 'handoff_filename',
    canonical: [],
    banned: ['handoff-handoff-'],
    paths: ['scripts/', 'skills-source/'],
    fileTypes: ['.mjs', '.js'],
  },
];

// ── 扫描器 ─────────────────────────────────────────────────────────────────

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir, fileTypes) {
  const results = [];
  const extSet = new Set(fileTypes);
  function recurse(current) {
    let entries;
    try { entries = readdirSync(current, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const p = join(current, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        recurse(p);
      } else if (e.isFile() && extSet.has(e.name.slice(e.name.lastIndexOf('.')))) {
        results.push(p);
      }
    }
  }
  recurse(resolve(REPO_ROOT, dir));
  return results;
}

/**
 * Extract single/double-quoted string literals from JS-like code.
 * Template literals (backtick) are excluded — they commonly contain JS variable interpolation.
 * Returns array of { text, lineNum, raw }.
 */
function extractStringLiterals(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const results = [];

  // Regex for single-quoted and double-quoted string literals only
  const re = /(['"])(?:(?!\1)[^\\]|\\.)*\1/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment-only lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('*')) continue;

    let m;
    const lineRe = new RegExp(re.source, 'g');
    while ((m = lineRe.exec(line)) !== null) {
      // Strip surrounding quotes
      const raw = m[0];
      const inner = raw.slice(1, -1).replace(/\\(.)/g, '$1');
      results.push({ text: inner, lineNum: i + 1, raw });
    }
  }
  return results;
}

function checkFile(filePath, rules, relPath, allowlist) {
  const issues = [];
  const fileAllow = allowlist[relPath];
  if (fileAllow === '*') return issues; // blanket allow
  const allowSet = fileAllow instanceof Set ? fileAllow : new Set(fileAllow || []);

  const literals = extractStringLiterals(filePath);

  for (const lit of literals) {
    for (const rule of rules) {
      for (const banned of rule.banned) {
        if (allowSet.has(banned)) continue;

        // 整词匹配：要求前后不是 [A-Za-z0-9_]
        const re = new RegExp(`(?<![A-Za-z0-9_])${escapeForRegex(banned)}(?![A-Za-z0-9_])`);
        if (re.test(lit.text)) {
          issues.push({
            rule: rule.name,
            banned,
            line: lit.lineNum,
            context: lit.text.slice(0, 80),
          });
        }
      }
    }
  }
  return issues;
}

// ── 主流程 ─────────────────────────────────────────────────────────────────

let totalIssues = 0;

for (const rule of RULES) {
  const files = [];
  for (const p of rule.paths) {
    files.push(...walk(p, rule.fileTypes));
  }
  // 去重
  const seen = new Set();
  for (const f of files) {
    if (seen.has(f)) continue;
    seen.add(f);
    const rel = f.replace(REPO_ROOT + '/', '');
    const issues = checkFile(f, [rule], rel, ALLOWLIST);
    if (issues.length > 0) {
      console.error(`\n❌ ${rel}`);
      for (const i of issues) {
        console.error(`   [${i.rule}] line ${i.line}: "${i.banned}" → ${i.context}`);
        totalIssues++;
      }
    }
  }
}

// ── 额外：核证 event-protocol.md 闭集包含所有 canonical event_type ───────────

const EP_PATH = join(REPO_ROOT, 'skills-source/dev-orchestrator/event-protocol.md');
const epText = readFileSync(EP_PATH, 'utf8');
for (const evt of EVENT_TYPE_CANONICAL) {
  if (!epText.includes(evt)) {
    console.error(`\n❌ event-protocol.md 缺失 canonical event_type: "${evt}"`);
    totalIssues++;
  }
}

// ── 结果 ─────────────────────────────────────────────────────────────────────

if (totalIssues > 0) {
  console.error(`\n🔴 lint-naming FAILED: ${totalIssues} issue(s) found.`);
  process.exit(1);
} else {
  console.log('✅ lint-naming PASSED: all canonical names consistent.');
  process.exit(0);
}

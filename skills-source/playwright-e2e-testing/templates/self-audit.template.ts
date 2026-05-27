#!/usr/bin/env node
// self-audit.template.ts — Self-Audit Gate Layer 1 (grep 层)
// 用法：npx ts-node e2e/self-audit.ts
// 或：node -r esbuild-register e2e/self-audit.ts

import { execSync } from 'child_process';
import * as path from 'path';

const TEST_DIR = path.resolve(__dirname, 'tests');

interface Hit {
  pattern: string;
  file: string;
  line: string;
  content: string;
}

const PATTERNS = [
  {
    id: 'P1',
    label: 'CSS value + toBeTruthy/toBeDefined',
    regex: 'getComputedStyle.*\\.\\(toBeTruthy\\|toBeDefined\\)',
  },
  {
    id: 'P2',
    label: 'Unconditional pass',
    regex: 'expect(true)\\.toBe(true)',
  },
  {
    id: 'P4',
    label: 'catch swallowing errors',
    regex: '\\.catch.*=>.*false\\|\\.catch.*=>.*null',
  },
  {
    id: 'P5',
    label: 'page.screenshot() without baseline comparison',
    cmd: `grep -rn 'page\\.screenshot(' "${TEST_DIR}" | grep -v 'toHaveScreenshot'`,
  },
];

function runGrep(pattern: string, dir: string): string {
  try {
    return execSync(`grep -rn '${pattern}' "${dir}"`, { encoding: 'utf8' });
  } catch {
    return ''; // grep returns non-zero when no matches
  }
}

function parseHits(output: string, patternId: string): Hit[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [file, lineNum, ...rest] = line.split(':');
      return { pattern: patternId, file, line: lineNum, content: rest.join(':').trim() };
    });
}

async function main() {
  console.log('\n🔍 Self-Audit Gate — Layer 1 (grep)\n');
  console.log(`Test directory: ${TEST_DIR}\n`);

  const allHits: Hit[] = [];

  for (const p of PATTERNS) {
    const output = p.cmd
      ? (() => { try { return execSync(p.cmd, { encoding: 'utf8' }); } catch { return ''; } })()
      : runGrep(p.regex, TEST_DIR);

    const hits = parseHits(output, p.id);
    if (hits.length > 0) {
      console.log(`❌ ${p.id}: ${p.label} — ${hits.length} hit(s)`);
      hits.forEach((h) => console.log(`   ${h.file}:${h.line}  →  ${h.content}`));
      allHits.push(...hits);
    } else {
      console.log(`✅ ${p.id}: ${p.label} — clean`);
    }
  }

  console.log('\n' + '─'.repeat(60));

  if (allHits.length === 0) {
    console.log('\n✅ Layer 1 PASS — no forbidden patterns found');
    console.log('\n⚠️  Layer 2 (Semantic Review) still required for:');
    console.log('   - Any getComputedStyle usage not paired with toHaveScreenshot()');
    console.log('   - Any expect(x).toBeTruthy() where x is not a CSS value\n');
    process.exit(0);
  } else {
    console.log(`\n❌ Layer 1 BLOCK — ${allHits.length} forbidden pattern(s) found`);
    console.log('\nFix all hits before proceeding to baseline generation.\n');
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
// 逻辑层纯净度检查：禁 Math.random / Date.now / performance.now / window / document 于 src/logic/**
// （替代 eslint no-restricted-properties 的针对性门禁）

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src/logic', import.meta.url).pathname;
const FORBIDDEN = [
  { name: 'Math.random', re: /\bMath\s*\.\s*random\b/ },
  { name: 'Date.now', re: /\bDate\s*\.\s*now\b/ },
  { name: 'performance.now', re: /\bperformance\s*\.\s*now\b/ },
  { name: 'window', re: /\bwindow\b/ },
  { name: 'document', re: /\bdocument\b/ },
];

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) files.push(p);
  }
}
walk(ROOT);

let violations = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const f of FORBIDDEN) {
    if (f.re.test(stripped)) {
      console.error(`✗ ${file}: 禁用 ${f.name}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n逻辑层纯净度检查失败：${violations} 处违规`);
  process.exit(1);
}
console.log(`✓ 逻辑层纯净度检查通过（${files.length} 文件）`);

#!/usr/bin/env node
// 关键路径门禁检查：验证 critical-paths.yaml 中定义的每条路径都有对应的测试场景覆盖
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 读取 critical-paths.yaml
const yamlPath = resolve(root, 'critical-paths.yaml');
const content = readFileSync(yamlPath, 'utf-8');

// 简单的 YAML 解析（只提取 paths 列表）
const paths = [];
const lines = content.split('\n');
let currentPath = null;
for (const line of lines) {
  const idMatch = line.match(/^\s+-\s+id:\s+(\S+)/);
  const descMatch = line.match(/^\s+description:\s+(.+)/);
  const scenarioMatch = line.match(/^\s+scenario:\s+(.+)/);
  const conditionMatch = line.match(/^\s+condition:\s+(.+)/);

  if (idMatch) {
    if (currentPath) paths.push(currentPath);
    currentPath = { id: idMatch[1], description: '', scenario: '', condition: '' };
  } else if (descMatch && currentPath) {
    currentPath.description = descMatch[1];
  } else if (scenarioMatch && currentPath) {
    currentPath.scenario = scenarioMatch[1];
  } else if (conditionMatch && currentPath) {
    currentPath.condition = conditionMatch[1];
  }
}
if (currentPath) paths.push(currentPath);

// 检查每个 path 的 scenario 文件是否存在
const failures = [];
for (const p of paths) {
  const scenarioPath = resolve(root, 'tests/scenarios', p.scenario);
  try {
    readFileSync(scenarioPath, 'utf-8');
  } catch {
    failures.push(`CP-${p.id}: scenario 文件不存在: tests/scenarios/${p.scenario}`);
  }
}

if (failures.length > 0) {
  console.error('❌ 关键路径门禁失败：');
  for (const f of failures) {
    console.error(`  ${f}`);
  }
  process.exit(1);
} else {
  console.log(`✅ 关键路径门禁通过：${paths.length} 条路径均已覆盖`);
}
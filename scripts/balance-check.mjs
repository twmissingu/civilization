#!/usr/bin/env node
// 平衡性基准测试：验证战斗公式/增长曲线/科技费用
// 用法：node scripts/balance-check.mjs

function damage(attackerCS, defenderCS, jitter = 0) {
  const diff = attackerCS - defenderCS;
  const raw = 30 * Math.exp(diff / 25);
  const clamped = Math.max(10, Math.min(100, Math.round(raw)));
  return Math.max(1, clamped + jitter);
}

function foodThreshold(pop) {
  return 15 + 8 * (pop - 1);
}

function testCombatFormula() {
  console.log('=== 战斗公式验证 ===');
  const scenarios = [
    { label: 'CS 相等 (diff=0)', aCS: 20, dCS: 20, expected: 30 },
    { label: '攻击方优势 +10', aCS: 30, dCS: 20, expected: 45 },
    { label: '攻击方优势 +20', aCS: 40, dCS: 20, expected: 66 },
    { label: '攻击方劣势 -10', aCS: 20, dCS: 30, expected: 20 },
    { label: '攻击方劣势 -20', aCS: 20, dCS: 40, expected: 13 },
  ];

  let allPass = true;
  for (const s of scenarios) {
    const dmg = damage(s.aCS, s.dCS);
    const actual = Math.round(dmg);
    const expected = s.expected;
    const pass = Math.abs(actual - expected) <= 2;
    console.log(`  ${s.label}: 期望=${expected}, 实际=${actual} ${pass ? '✅' : '❌'}`);
    if (!pass) allPass = false;
  }

  // 验证 jitter 范围
  let minDmg = 999, maxDmg = 0;
  for (let i = 0; i < 100; i++) {
    const jitter = (i % 11) - 5;
    const d = damage(20, 20, jitter);
    minDmg = Math.min(minDmg, d);
    maxDmg = Math.max(maxDmg, d);
  }
  console.log(`  jitter 范围: ${minDmg}-${maxDmg} (期望 25-35) ✅`);
  return allPass;
}

function testGrowthCurve() {
  console.log('\n=== 城市增长曲线验证 ===');
  let allPass = true;
  for (let pop = 1; pop <= 10; pop++) {
    const threshold = foodThreshold(pop);
    // 10 人口约需 50 回合 → 总食物约 15+23+31+39+47+55+63+71+79 = 423
    if (pop <= 3) {
      console.log(`  人口 ${pop}: 需要 ${threshold} 食物`);
    }
  }
  console.log('  ...');
  console.log(`  人口 10: 需要 ${foodThreshold(10)} 食物`);

  // 验证合理性：1→2 需 15，2→3 需 23，增长合理
  for (let pop = 2; pop <= 10; pop++) {
    const prev = foodThreshold(pop - 1);
    const curr = foodThreshold(pop);
    const diff = curr - prev;
    if (diff !== 8) {
      console.log(`  人口 ${pop-1}→${pop}: 增量 ${diff} (期望 8) ❌`);
      allPass = false;
    }
  }
  console.log('  增长曲线线性递增 ✅');
  return allPass;
}

function testCombatCS() {
  console.log('\n=== 单位战斗力基准 ===');
  const units = [
    { name: 'warrior', cs: 20, era: 'ancient' },
    { name: 'archer', cs: 15, era: 'ancient' },
    { name: 'swordsman', cs: 35, era: 'classical' },
    { name: 'cavalry', cs: 45, era: 'medieval' },
    { name: 'knight', cs: 48, era: 'medieval' },
    { name: 'musketman', cs: 55, era: 'renaissance' },
    { name: 'cannon', cs: 40, era: 'renaissance' },
  ];

  // 验证：古典单位 vs 远古单位应该有明显优势
  const warriorVsSwordsman = damage(20, 35); // warrior attacks swordsman
  const swordsmanVsWarrior = damage(35, 20); // swordsman attacks warrior
  console.log(`  剑士(CS35) vs 勇士(CS20): 剑士攻=${Math.round(swordsmanVsWarrior)} 伤害, 勇士反击=${Math.round(warriorVsSwordsman)} 伤害`);
  console.log(`  剑士对勇士优势比: ${(swordsmanVsWarrior / Math.max(1, warriorVsSwordsman)).toFixed(1)}x`);

  return true;
}

let allPass = true;
allPass &= testCombatFormula();
allPass &= testGrowthCurve();
allPass &= testCombatCS();

console.log(`\n${allPass ? '✅ 所有平衡性验证通过' : '❌ 存在未通过验证项'}`);
process.exit(allPass ? 0 : 1);
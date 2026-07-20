#!/usr/bin/env node
// 资产压缩管线：压缩 public/assets/ 下的所有 PNG，生成 WebP 版本
// 用法：node scripts/compress-assets.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname, extname, join, relative, basename } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const ASSETS_DIR = resolve(root, 'public/assets');

// 按目录分类的压缩配置
const TYPE_CONFIG = {
  units: { maxWidth: 64, quality: 75 },
  buildings: { maxWidth: 64, quality: 75 },
  wonders: { maxWidth: 80, quality: 80 },
  districts: { maxWidth: 64, quality: 75 },
  terrain: { maxWidth: 64, quality: 70 },
  features: { maxWidth: 64, quality: 70 },
  portraits: { maxWidth: 120, quality: 80 },
  policy: { maxWidth: 48, quality: 75 },
  victory: { maxWidth: 48, quality: 80 },
  civic: { maxWidth: 48, quality: 75 },
  tech: { maxWidth: 48, quality: 75 },
  ui: { maxWidth: 32, quality: 80 },
};

async function compressFile(filePath, config) {
  const { maxWidth, quality } = config;
  const meta = await sharp(filePath).metadata();
  const width = Math.min(meta.width, maxWidth);

  // 压缩并覆盖原 PNG
  const tmpPath = filePath + '.tmp';
  await sharp(filePath)
    .resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toFile(tmpPath);
  copyFileSync(tmpPath, filePath);
  try { unlinkSync(tmpPath); } catch { /* ignore cleanup errors */ }

  // 生成 WebP 版本
  const webpPath = filePath.replace(/\.png$/, '.webp');
  try {
    await sharp(filePath)
      .resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toFile(webpPath);
  } catch (e) {
    // WebP 生成失败不阻塞
  }
}

async function main() {
  const results = [];
  let totalOrig = 0;
  let totalNew = 0;

  for (const [type, config] of Object.entries(TYPE_CONFIG)) {
    const dir = join(ASSETS_DIR, type);
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.png');
    if (files.length === 0) continue;

    for (const file of files) {
      const filePath = join(dir, file);
      const origSize = statSync(filePath).size;
      totalOrig += origSize;

      try {
        await compressFile(filePath, config);
        const newSize = statSync(filePath).size;
        totalNew += newSize;
        const saved = origSize - newSize;
        if (saved > 1024 * 10) {
          results.push({ type, file, origSize, newSize, saved });
        }
      } catch (e) {
        totalNew += origSize;
      }
    }
  }

  console.log('✅ 资产压缩完成');
  console.log(`   原始: ${(totalOrig / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   压缩后: ${(totalNew / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   节省: ${((1 - totalNew / totalOrig) * 100).toFixed(0)}%`);

  for (const r of results.slice(0, 20)) {
    console.log(`   ${r.type}/${r.file}: ${(r.origSize / 1024).toFixed(0)}K → ${(r.newSize / 1024).toFixed(0)}K`);
  }
  if (results.length > 20) {
    console.log(`   ... 及 ${results.length - 20} 个其他文件`);
  }
}

main().catch((err) => {
  console.error('❌ 压缩失败:', err);
  process.exit(1);
});
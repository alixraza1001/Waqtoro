import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd(), 'images');
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (EXTENSIONS.has(ext)) files.push(fullPath);
  }

  return files;
}

async function convertToWebp(filePath) {
  const parsed = path.parse(filePath);
  const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

  await sharp(filePath)
    .webp({ quality: 78, effort: 5 })
    .toFile(webpPath);

  return webpPath;
}

async function main() {
  const files = await walk(ROOT);
  if (!files.length) {
    console.log('No source images found to optimize.');
    return;
  }

  let converted = 0;
  for (const file of files) {
    await convertToWebp(file);
    converted += 1;
  }

  console.log(`Converted ${converted} images to WebP.`);
}

main().catch((error) => {
  console.error('Image optimization failed:', error);
  process.exit(1);
});

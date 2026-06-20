import { mkdir, readdir } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const SECTORS_DIR = join(process.cwd(), 'apps', 'web', 'public', 'sectors');
const MAX_WIDTH = 2000;

async function run() {
  await mkdir(SECTORS_DIR, { recursive: true });
  const files = await readdir(SECTORS_DIR);
  const sources = files.filter((file) => file.toLowerCase().endsWith('.png'));
  for (const source of sources) {
    const name = parse(source).name;
    const pipeline = sharp(join(SECTORS_DIR, source)).resize({
      width: MAX_WIDTH,
      withoutEnlargement: true,
    });
    await pipeline
      .clone()
      .webp({ quality: 70 })
      .toFile(join(SECTORS_DIR, `${name}.webp`));
    await pipeline
      .clone()
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(join(SECTORS_DIR, `${name}.jpg`));
    console.log(`optimized ${name}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

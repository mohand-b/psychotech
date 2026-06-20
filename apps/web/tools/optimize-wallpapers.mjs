import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = join(process.cwd(), 'apps', 'web', 'public');
const OUTPUT_DIR = join(PUBLIC_DIR, 'sectors');
const SOURCES = ['ferroviaire', 'aviation', 'securite', 'industrie', 'medical'];
const MAX_WIDTH = 2000;

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const name of SOURCES) {
    const pipeline = sharp(join(PUBLIC_DIR, `${name}.png`)).resize({
      width: MAX_WIDTH,
      withoutEnlargement: true,
    });
    await pipeline
      .clone()
      .webp({ quality: 70 })
      .toFile(join(OUTPUT_DIR, `${name}.webp`));
    await pipeline
      .clone()
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(join(OUTPUT_DIR, `${name}.jpg`));
    console.log(`optimized ${name}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

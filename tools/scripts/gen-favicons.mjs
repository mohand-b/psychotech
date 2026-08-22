// Rastérise apps/web/public/favicon.svg vers les formats attendus par les
// navigateurs et les moteurs de recherche.
//   node tools/scripts/gen-favicons.mjs
//
// Le tracé du "P" est déjà figé en outline dans le SVG source : aucune police
// n'est nécessaire ici, et le rendu ne dépend pas des fontes de la machine.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const publicDir = join(repoRoot, 'apps/web/public');
const source = join(publicDir, 'favicon.svg');

const PNG_TARGETS = [
  { file: 'favicon-96.png', size: 96 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

const ICO_SIZES = [32, 48];

const ICO_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;

function buildIco(images) {
  const header = Buffer.alloc(ICO_HEADER_BYTES);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = ICO_HEADER_BYTES + ICO_ENTRY_BYTES * images.length;
  for (const image of images) {
    const entry = Buffer.alloc(ICO_ENTRY_BYTES);
    // 0 signifie 256 dans le format ICO ; nos tailles restent sous 256.
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.data.length;
  }

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((image) => image.data),
  ]);
}

async function render(svg, size) {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

const svg = await readFile(source);

for (const target of PNG_TARGETS) {
  const data = await render(svg, target.size);
  await writeFile(join(publicDir, target.file), data);
  console.log(`${target.file} (${target.size}px)`);
}

const icoImages = [];
for (const size of ICO_SIZES) {
  icoImages.push({ size, data: await render(svg, size) });
}
await writeFile(join(publicDir, 'favicon.ico'), buildIco(icoImages));
console.log(`favicon.ico (${ICO_SIZES.join(' + ')}px)`);

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIVE_BADGES_DIRECTORY = join(REPO_ROOT, 'apps/web/public/badges');
const GOLD_SUFFIX = '-or.svg';
const NEUTRAL_CHROMA = 0.04;
const COLOR_ATTRIBUTE = /(fill|stroke|stop-color)(="|:\s*)(#[0-9a-fA-F]{6})/g;

const GOLD_RAMP = [
  '#865803',
  '#9D6902',
  '#C28904',
  '#D39C04',
  '#F3CB52',
  '#F9E593',
];

const TIER_RAMPS = {
  bronze: ['#4D2B17', '#733F21', '#8D512E', '#A5623E', '#C38D63', '#D5A98B'],
  argent: ['#474C56', '#59626F', '#7C8393', '#9EA8B4', '#D3DAE2', '#E0E2EB'],
};

const SOURCE_DIRECTORY =
  process.argv[2] && !process.argv[2].startsWith('--')
    ? resolve(process.argv[2])
    : null;
const OUTPUT_DIRECTORY = argument('--out')
  ? resolve(argument('--out'))
  : SOURCE_DIRECTORY;
const CHECK_ONLY = process.argv.includes('--check');

if (SOURCE_DIRECTORY === null) {
  console.error(
    'Usage : node tools/scripts/derive-badge-tiers.mjs <dossier des badges or> [--out <dossier>] [--check]',
  );
  process.exit(1);
}

if (CHECK_ONLY) {
  process.exit(checkBadgeNames(SOURCE_DIRECTORY) ? 0 : 1);
}

const goldRamp = GOLD_RAMP.map(hexToOklab);
const tierRamps = Object.fromEntries(
  Object.entries(TIER_RAMPS).map(([tier, ramp]) => [
    tier,
    ramp.map(hexToOklab),
  ]),
);

const goldFiles = readdirSync(SOURCE_DIRECTORY).filter((file) =>
  file.endsWith(GOLD_SUFFIX),
);
if (goldFiles.length === 0) {
  console.error(`Aucun fichier *${GOLD_SUFFIX} dans ${SOURCE_DIRECTORY}`);
  process.exit(1);
}

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
for (const goldFile of goldFiles) {
  const goldSvg = readFileSync(join(SOURCE_DIRECTORY, goldFile), 'utf8');
  for (const [tier, ramp] of Object.entries(tierRamps)) {
    const tierFile = goldFile.replace(GOLD_SUFFIX, `-${tier}.svg`);
    const { svg, recolored } = recolorSvg(goldSvg, ramp);
    writeFileSync(join(OUTPUT_DIRECTORY, tierFile), svg);
    console.log(`${goldFile} → ${tierFile} (${recolored} teintes remplacées)`);
  }
}

function recolorSvg(svg, targetRamp) {
  const replacements = new Map();
  const recoloredSvg = svg.replace(
    COLOR_ATTRIBUTE,
    (match, property, separator, hex) => {
      const key = hex.toUpperCase();
      if (!replacements.has(key)) {
        replacements.set(key, recolorHex(key, targetRamp));
      }
      return `${property}${separator}${replacements.get(key)}`;
    },
  );
  const recolored = [...replacements].filter(
    ([source, target]) => source !== target,
  ).length;
  return { svg: recoloredSvg, recolored };
}

function recolorHex(hex, targetRamp) {
  const color = hexToOklab(hex);
  if (Math.hypot(color.a, color.b) < NEUTRAL_CHROMA) {
    return hex;
  }
  return oklabToHex(sampleRamp(targetRamp, locateOnRamp(goldRamp, color.L)));
}

function locateOnRamp(ramp, lightness) {
  const lastSegment = ramp.length - 2;
  const found = ramp.findIndex(
    (anchor, index) => index <= lastSegment && lightness <= ramp[index + 1].L,
  );
  const segment = found === -1 ? lastSegment : found;
  const from = ramp[segment];
  const to = ramp[segment + 1];
  return segment + (lightness - from.L) / (to.L - from.L);
}

function sampleRamp(ramp, position) {
  const segment = Math.min(Math.max(Math.floor(position), 0), ramp.length - 2);
  const progress = position - segment;
  const from = ramp[segment];
  const to = ramp[segment + 1];
  return {
    L: from.L + (to.L - from.L) * progress,
    a: from.a + (to.a - from.a) * progress,
    b: from.b + (to.b - from.b) * progress,
  };
}

function hexToOklab(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const [red, green, blue] = [value >> 16, (value >> 8) & 255, value & 255].map(
    (channel) => toLinear(channel / 255),
  );
  const long = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const medium = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const short = Math.cbrt(
    0.0883024619 * red + 0.2817104115 * green + 0.6299412044 * blue,
  );
  return {
    L: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    a: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    b: 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  };
}

function oklabToHex({ L, a, b }) {
  const long = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ];
  return `#${channels
    .map((channel) =>
      Math.round(Math.min(Math.max(toGamma(channel), 0), 1) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

function toLinear(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function toGamma(channel) {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * Math.max(channel, 0) ** (1 / 2.4) - 0.055;
}

function checkBadgeNames(directory) {
  const expected = new Set(
    readdirSync(LIVE_BADGES_DIRECTORY).filter((file) => file.endsWith('.svg')),
  );
  const present = new Set(
    readdirSync(directory).filter((file) => file.endsWith('.svg')),
  );
  const missing = [...expected].filter((file) => !present.has(file));
  const unknown = [...present].filter((file) => !expected.has(file));
  for (const file of missing) {
    console.log(`manquant : ${file}`);
  }
  for (const file of unknown) {
    console.log(`nom inconnu de l'app : ${file}`);
  }
  console.log(
    `${present.size - unknown.length}/${expected.size} badges attendus présents`,
  );
  return missing.length === 0 && unknown.length === 0;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

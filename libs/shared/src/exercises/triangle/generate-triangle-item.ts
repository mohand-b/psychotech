import { SeededRng, createSeededRng } from '../rng';
import {
  TriangleItem,
  TriangleLevel,
  TriangleMissing,
  TriangleSlot,
  TriangleValues,
} from './triangle-item';
import {
  TRIANGLE_PATTERNS,
  TrianglePattern,
  trianglePatternById,
} from './triangle-patterns';

export type TriangleCatalogRevision = 'FULL' | 'CURATED';

export interface GenerateTriangleItemOptions {
  level: TriangleLevel;
  seed: string;
  catalog?: TriangleCatalogRevision;
}

export const TRIANGLE_VERTEX_MIN = 1;
export const TRIANGLE_VERTEX_MAX = 9;
export const TRIANGLE_CENTER_MAX = 90;

const MAX_GENERATION_ATTEMPTS = 80;
const MAX_TRIANGLE_DRAWS = 40;
const VERTEX_SLOTS = [TriangleSlot.TOP, TriangleSlot.LEFT, TriangleSlot.RIGHT];

const CURATED_LEVEL_FIVE_PATTERN_ID = 'center-sum-minus-previous';

function patternsForLevel(
  level: TriangleLevel,
  catalog: TriangleCatalogRevision,
): TrianglePattern[] {
  if (catalog === 'CURATED') {
    if (level === 4) {
      return TRIANGLE_PATTERNS.filter((pattern) => pattern.level === 3);
    }
    if (level === 5) {
      return TRIANGLE_PATTERNS.filter(
        (pattern) => pattern.id === CURATED_LEVEL_FIVE_PATTERN_ID,
      );
    }
  }
  const formulaLevel = level === 4 ? [1, 2, 3] : [level];
  return TRIANGLE_PATTERNS.filter((pattern) =>
    formulaLevel.includes(pattern.level),
  );
}

function catalogUpToLevel(level: TriangleLevel): TrianglePattern[] {
  return TRIANGLE_PATTERNS.filter((pattern) => pattern.level <= level);
}

function withSlot(
  values: TriangleValues,
  slot: TriangleSlot,
  value: number,
): TriangleValues {
  switch (slot) {
    case TriangleSlot.TOP:
      return { ...values, top: value };
    case TriangleSlot.LEFT:
      return { ...values, left: value };
    case TriangleSlot.RIGHT:
      return { ...values, right: value };
    case TriangleSlot.CENTER:
      return { ...values, center: value };
  }
}

export function triangleSlotValue(
  values: TriangleValues,
  slot: TriangleSlot,
): number {
  switch (slot) {
    case TriangleSlot.TOP:
      return values.top;
    case TriangleSlot.LEFT:
      return values.left;
    case TriangleSlot.RIGHT:
      return values.right;
    case TriangleSlot.CENTER:
      return values.center;
  }
}

export function triangleSeriesConsistent(
  triangles: readonly TriangleValues[],
  patternId: string,
): boolean {
  const pattern = trianglePatternById(patternId);
  return triangles.every((triangle, index) => {
    if (pattern.usesPreviousCenter && index === 0) {
      return true;
    }
    const previousCenter = index > 0 ? triangles[index - 1].center : null;
    return pattern.compute(triangle, previousCenter) === triangle.center;
  });
}

function vertexSolutions(
  pattern: TrianglePattern,
  incomplete: TriangleValues,
  slot: TriangleSlot,
  previousCenter: number | null,
): number[] {
  const solutions: number[] = [];
  for (
    let candidate = TRIANGLE_VERTEX_MIN;
    candidate <= TRIANGLE_VERTEX_MAX;
    candidate += 1
  ) {
    const values = withSlot(incomplete, slot, candidate);
    if (pattern.compute(values, previousCenter) === values.center) {
      solutions.push(candidate);
    }
  }
  return solutions;
}

function patternConsistentWithCompletes(
  pattern: TrianglePattern,
  triangles: readonly TriangleValues[],
  completeCount: number,
): boolean {
  for (let index = 0; index < completeCount; index += 1) {
    if (pattern.usesPreviousCenter && index === 0) {
      continue;
    }
    const previousCenter = index > 0 ? triangles[index - 1].center : null;
    if (pattern.compute(triangles[index], previousCenter) !== triangles[index].center) {
      return false;
    }
  }
  if (pattern.usesPreviousCenter && completeCount < 2) {
    return false;
  }
  return true;
}

function isAmbiguousAgainstCatalog(
  level: TriangleLevel,
  triangles: readonly TriangleValues[],
  missing: TriangleMissing,
  answer: number,
): boolean {
  const completeCount = triangles.length - 1;
  const last = triangles[missing.triangleIndex];
  const previousCenter =
    missing.triangleIndex > 0
      ? triangles[missing.triangleIndex - 1].center
      : null;
  for (const pattern of catalogUpToLevel(level)) {
    if (!patternConsistentWithCompletes(pattern, triangles, completeCount)) {
      continue;
    }
    if (missing.slot === TriangleSlot.CENTER) {
      const predicted = pattern.compute(last, previousCenter);
      if (predicted !== null && predicted !== answer) {
        return true;
      }
      continue;
    }
    const solutions = vertexSolutions(pattern, last, missing.slot, previousCenter);
    if (solutions.some((solution) => solution !== answer)) {
      return true;
    }
  }
  return false;
}

function isDegenerate(triangles: readonly TriangleValues[]): boolean {
  for (const triangle of triangles) {
    if (triangle.top === triangle.left && triangle.left === triangle.right) {
      return true;
    }
  }
  for (let first = 0; first < triangles.length; first += 1) {
    for (let second = first + 1; second < triangles.length; second += 1) {
      const a = triangles[first];
      const b = triangles[second];
      if (
        a.top === b.top &&
        a.left === b.left &&
        a.right === b.right &&
        a.center === b.center
      ) {
        return true;
      }
    }
  }
  const centers = triangles.map((triangle) => triangle.center);
  return new Set(centers).size === 1;
}

function drawTriangle(
  pattern: TrianglePattern,
  previousCenter: number | null,
  rng: SeededRng,
): TriangleValues | null {
  for (let draw = 0; draw < MAX_TRIANGLE_DRAWS; draw += 1) {
    const vertices = {
      top: rng.nextInt(TRIANGLE_VERTEX_MIN, TRIANGLE_VERTEX_MAX),
      left: rng.nextInt(TRIANGLE_VERTEX_MIN, TRIANGLE_VERTEX_MAX),
      right: rng.nextInt(TRIANGLE_VERTEX_MIN, TRIANGLE_VERTEX_MAX),
      center: 0,
    };
    const center = pattern.compute(vertices, previousCenter);
    if (center !== null && center >= 1 && center <= TRIANGLE_CENTER_MAX) {
      return { ...vertices, center };
    }
  }
  return null;
}

export function generateTriangleItem(
  options: GenerateTriangleItemOptions,
): TriangleItem {
  const { level, seed } = options;
  const catalog = options.catalog ?? 'FULL';
  const vertexMissing = level === 4 && catalog === 'FULL';
  const pool = patternsForLevel(level, catalog);
  const length = level === 5 ? 4 : 3;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = createSeededRng(`${seed}::triangle::${level}::${attempt}`);
    const pattern = rng.pick(pool);
    const triangles: TriangleValues[] = [];
    let failed = false;
    for (let index = 0; index < length; index += 1) {
      const previousCenter =
        pattern.usesPreviousCenter && index === 0
          ? null
          : index > 0
            ? triangles[index - 1].center
            : null;
      if (pattern.usesPreviousCenter && index === 0) {
        const vertices = {
          top: rng.nextInt(TRIANGLE_VERTEX_MIN, TRIANGLE_VERTEX_MAX),
          left: rng.nextInt(TRIANGLE_VERTEX_MIN, TRIANGLE_VERTEX_MAX),
          right: rng.nextInt(TRIANGLE_VERTEX_MIN, TRIANGLE_VERTEX_MAX),
          center: rng.nextInt(1, 15),
        };
        triangles.push(vertices);
        continue;
      }
      const triangle = drawTriangle(pattern, previousCenter, rng);
      if (!triangle) {
        failed = true;
        break;
      }
      triangles.push(triangle);
    }
    if (failed) {
      continue;
    }
    const missing: TriangleMissing = {
      triangleIndex: length - 1,
      slot: vertexMissing ? rng.pick(VERTEX_SLOTS) : TriangleSlot.CENTER,
    };
    const answer = triangleSlotValue(triangles[length - 1], missing.slot);
    if (!triangleSeriesConsistent(triangles, pattern.id)) {
      continue;
    }
    if (missing.slot !== TriangleSlot.CENTER) {
      const previousCenter =
        missing.triangleIndex > 0
          ? triangles[missing.triangleIndex - 1].center
          : null;
      const solutions = vertexSolutions(
        pattern,
        triangles[length - 1],
        missing.slot,
        previousCenter,
      );
      if (solutions.length !== 1 || solutions[0] !== answer) {
        continue;
      }
    }
    if (isDegenerate(triangles)) {
      continue;
    }
    if (isAmbiguousAgainstCatalog(level, triangles, missing, answer)) {
      continue;
    }
    return {
      level,
      seed,
      triangles,
      missing,
      answer,
      rule: {
        id: vertexMissing ? `${pattern.id}-missing-vertex` : pattern.id,
        userText: vertexMissing
          ? `${pattern.userText} Ici, le « ? » porte sur un sommet.`
          : pattern.userText,
      },
      patternId: pattern.id,
      length,
    };
  }
  throw new Error(
    `Triangle item generation exhausted retries for level ${level} seed ${seed}`,
  );
}

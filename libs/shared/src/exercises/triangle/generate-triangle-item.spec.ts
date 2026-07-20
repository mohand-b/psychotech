import { describe, expect, it } from 'vitest';
import {
  TRIANGLE_CENTER_MAX,
  TRIANGLE_VERTEX_MAX,
  TRIANGLE_VERTEX_MIN,
  generateTriangleItem,
  triangleSeriesConsistent,
  triangleSlotValue,
} from './generate-triangle-item';
import { TriangleItem, TriangleLevel, TriangleSlot } from './triangle-item';
import {
  TRIANGLE_PATTERNS,
  formatTriangleReading,
  resolveTriangleRuleDetail,
  trianglePatternById,
} from './triangle-patterns';

const LEVELS: TriangleLevel[] = [1, 2, 3, 4, 5];
const SEEDS_PER_LEVEL = 100;

function forEachGeneratedItem(check: (item: TriangleItem) => void): void {
  for (const level of LEVELS) {
    for (let draw = 0; draw < SEEDS_PER_LEVEL; draw += 1) {
      check(generateTriangleItem({ level, seed: `property-${draw}` }));
    }
  }
}

describe('generateTriangleItem — propriétés sur 500 tirages (5 niveaux × 100 seeds)', () => {
  it('respecte longueurs, bornes et position du manquant', () => {
    forEachGeneratedItem((item) => {
      expect(item.length).toBe(item.level === 5 ? 4 : 3);
      expect(item.triangles).toHaveLength(item.length);
      expect(item.missing.triangleIndex).toBe(item.length - 1);
      if (item.level === 4) {
        expect(item.missing.slot).not.toBe(TriangleSlot.CENTER);
      } else {
        expect(item.missing.slot).toBe(TriangleSlot.CENTER);
      }
      for (const triangle of item.triangles) {
        for (const vertex of [triangle.top, triangle.left, triangle.right]) {
          expect(vertex).toBeGreaterThanOrEqual(TRIANGLE_VERTEX_MIN);
          expect(vertex).toBeLessThanOrEqual(TRIANGLE_VERTEX_MAX);
        }
        expect(triangle.center).toBeGreaterThanOrEqual(1);
        expect(triangle.center).toBeLessThanOrEqual(TRIANGLE_CENTER_MAX);
      }
    });
  });

  it('vérifie la réponse par évaluation de la relation sur toute la série', () => {
    forEachGeneratedItem((item) => {
      expect(triangleSeriesConsistent(item.triangles, item.patternId)).toBe(
        true,
      );
      expect(
        triangleSlotValue(
          item.triangles[item.missing.triangleIndex],
          item.missing.slot,
        ),
      ).toBe(item.answer);
    });
  });

  it('tient l’unicité face au catalogue de complexité inférieure ou égale', () => {
    forEachGeneratedItem((item) => {
      const completeCount = item.length - 1;
      const last = item.triangles[item.missing.triangleIndex];
      const previousCenter =
        item.missing.triangleIndex > 0
          ? item.triangles[item.missing.triangleIndex - 1].center
          : null;
      for (const pattern of TRIANGLE_PATTERNS) {
        if (pattern.level > item.level) {
          continue;
        }
        const consistent = item.triangles
          .slice(0, completeCount)
          .every((triangle, index) => {
            if (pattern.usesPreviousCenter && index === 0) {
              return true;
            }
            const prev = index > 0 ? item.triangles[index - 1].center : null;
            return pattern.compute(triangle, prev) === triangle.center;
          });
        if (!consistent || (pattern.usesPreviousCenter && completeCount < 2)) {
          continue;
        }
        if (item.missing.slot === TriangleSlot.CENTER) {
          const predicted = pattern.compute(last, previousCenter);
          if (predicted !== null) {
            expect(predicted).toBe(item.answer);
          }
          continue;
        }
        for (let candidate = 1; candidate <= 9; candidate += 1) {
          const values =
            item.missing.slot === TriangleSlot.TOP
              ? { ...last, top: candidate }
              : item.missing.slot === TriangleSlot.LEFT
                ? { ...last, left: candidate }
                : { ...last, right: candidate };
          if (pattern.compute(values, previousCenter) === values.center) {
            expect(candidate).toBe(item.answer);
          }
        }
      }
    });
  });

  it('garantit au niveau 4 une solution unique dans 1-9', () => {
    forEachGeneratedItem((item) => {
      if (item.level !== 4) {
        return;
      }
      expect(item.answer).toBeGreaterThanOrEqual(1);
      expect(item.answer).toBeLessThanOrEqual(9);
      const pattern = trianglePatternById(item.patternId);
      const last = item.triangles[item.missing.triangleIndex];
      const previousCenter =
        item.missing.triangleIndex > 0
          ? item.triangles[item.missing.triangleIndex - 1].center
          : null;
      let solutions = 0;
      for (let candidate = 1; candidate <= 9; candidate += 1) {
        const values =
          item.missing.slot === TriangleSlot.TOP
            ? { ...last, top: candidate }
            : item.missing.slot === TriangleSlot.LEFT
              ? { ...last, left: candidate }
              : { ...last, right: candidate };
        if (pattern.compute(values, previousCenter) === values.center) {
          solutions += 1;
        }
      }
      expect(solutions).toBe(1);
    });
  });

  it('rejette les séries dégénérées', () => {
    forEachGeneratedItem((item) => {
      const centers = new Set(item.triangles.map((t) => t.center));
      expect(centers.size).toBeGreaterThan(1);
      for (const triangle of item.triangles) {
        expect(
          triangle.top === triangle.left && triangle.left === triangle.right,
        ).toBe(false);
      }
    });
  });

  it('utilise une relation entre voisins au niveau 5, vérifiée sur toutes les transitions', () => {
    forEachGeneratedItem((item) => {
      if (item.level !== 5) {
        return;
      }
      const pattern = trianglePatternById(item.patternId);
      expect(pattern.usesPreviousCenter).toBe(true);
      for (let index = 1; index < item.length; index += 1) {
        expect(
          pattern.compute(
            item.triangles[index],
            item.triangles[index - 1].center,
          ),
        ).toBe(item.triangles[index].center);
      }
    });
  });

  it('est strictement déterministe', () => {
    for (const level of LEVELS) {
      expect(generateTriangleItem({ level, seed: 'stable' })).toEqual(
        generateTriangleItem({ level, seed: 'stable' }),
      );
    }
  });
});

describe('formulations utilisateur', () => {
  it('fournit une formulation non vide et un identifiant pour chaque item', () => {
    forEachGeneratedItem((item) => {
      expect(item.rule.id.length).toBeGreaterThan(0);
      expect(item.rule.userText.startsWith('Le centre =')).toBe(true);
      if (item.level === 4) {
        expect(item.rule.userText).toContain('porte sur un sommet');
      }
    });
  });

  it('formule la lecture chiffrée de chaque patron', () => {
    expect(
      formatTriangleReading(
        'center-sum',
        { top: 2, left: 3, right: 4, center: 9 },
        null,
      ),
    ).toBe('2 + 3 + 4 = 9');
    expect(
      formatTriangleReading(
        'center-top-times-left-minus-right',
        { top: 3, left: 5, right: 2, center: 13 },
        null,
      ),
    ).toBe('3 × 5 − 2 = 13');
    expect(
      formatTriangleReading(
        'center-sum-minus-previous',
        { top: 4, left: 2, right: 6, center: 7 },
        5,
      ),
    ).toBe('4 + 2 + 6 − 5 = 7');
    expect(
      formatTriangleReading(
        'center-sum-minus-previous',
        { top: 4, left: 2, right: 6, center: 7 },
        null,
      ),
    ).toBe('centre de départ : 7');
  });

  it('détaille le calcul du triangle à trou pour la correction', () => {
    const item = generateTriangleItem({ level: 1, seed: 'detail' });
    const detail = resolveTriangleRuleDetail(item);
    expect(detail.startsWith('Le centre = la somme des trois sommets :')).toBe(
      true,
    );
    expect(detail).toContain(`= ${triangleSlotValue(
      item.triangles[item.missing.triangleIndex],
      TriangleSlot.CENTER,
    )}`);
    expect(detail.endsWith('.')).toBe(true);

    forEachGeneratedItem((generated) => {
      const text = resolveTriangleRuleDetail(generated);
      expect(text).toMatch(/ : .*\d.*\.$/);
      expect(text).toContain('=');
    });
  });
});

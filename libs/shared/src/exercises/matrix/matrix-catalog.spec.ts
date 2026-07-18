import { describe, expect, it } from 'vitest';
import {
  MATRIX_CATALOG,
  generateMatrixItemFromCatalog,
} from './matrix-catalog';
import { MatrixProposalKind } from './matrix-item';
import { matrixCandidateSatisfiesRules } from './matrix-rules';

const SEEDS_PER_ENTRY = 25;

describe('MATRIX_CATALOG — les 7 types retenus', () => {
  it('expose 7 entrées aux identifiants uniques et libellés remplis', () => {
    expect(MATRIX_CATALOG).toHaveLength(7);
    expect(new Set(MATRIX_CATALOG.map((entry) => entry.id)).size).toBe(7);
    for (const entry of MATRIX_CATALOG) {
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('génère chaque type avec la structure, le registre et la variante annoncés', () => {
    for (const entry of MATRIX_CATALOG) {
      for (let draw = 0; draw < SEEDS_PER_ENTRY; draw += 1) {
        const item = generateMatrixItemFromCatalog(entry.id, `catalog-${draw}`);
        expect(item.structure).toBe(entry.structure);
        expect(item.register).toBe(entry.register);
        expect(item.variant).toBe(entry.variant);
        expect(item.proposals).toHaveLength(6);
        const satisfying = item.proposals.filter((proposal) =>
          matrixCandidateSatisfiesRules(
            item.cells.slice(0, 8),
            item.ruleSpec,
            proposal.cell,
          ),
        );
        expect(satisfying).toHaveLength(1);
        expect(satisfying[0].kind).toBe(MatrixProposalKind.CORRECT);
      }
    }
  });

  it('reste déterministe par identifiant et seed', () => {
    for (const entry of MATRIX_CATALOG) {
      expect(generateMatrixItemFromCatalog(entry.id, 'stable')).toEqual(
        generateMatrixItemFromCatalog(entry.id, 'stable'),
      );
    }
  });

  it('rejette un identifiant inconnu', () => {
    expect(() => generateMatrixItemFromCatalog('inconnu', 'seed')).toThrow();
  });
});

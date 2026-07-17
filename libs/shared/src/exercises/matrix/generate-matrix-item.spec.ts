import { describe, expect, it } from 'vitest';
import {
  MATRIX_LAYER_KINDS,
  MATRIX_MIN_PERCEPTUAL_DISTANCE,
  MatrixCellSpec,
  MatrixLayerKind,
  MatrixLevel,
  MatrixStructure,
  getMatrixLayerValue,
  matrixCellsEqual,
  matrixLayerScale,
  matrixPerceptualDistance,
} from './matrix-cell';
import { generateMatrixItem } from './generate-matrix-item';
import { MatrixItem, MatrixProposalKind } from './matrix-item';
import { buildMatrixRule, matrixCandidateSatisfiesRules } from './matrix-rules';

const STRUCTURES = [MatrixStructure.CROSSED, MatrixStructure.DISTRIBUTION];
const LEVELS: MatrixLevel[] = [1, 2, 3, 4, 5];
const SEEDS_PER_COMBINATION = 50;

function forEachGeneratedItem(check: (item: MatrixItem) => void): void {
  for (const structure of STRUCTURES) {
    for (const level of LEVELS) {
      for (let draw = 0; draw < SEEDS_PER_COMBINATION; draw += 1) {
        const item = generateMatrixItem({
          structure,
          level,
          seed: `property-${draw}`,
        });
        check(item);
      }
    }
  }
}

function layerValuesOfRow(
  item: MatrixItem,
  row: number,
  layer: MatrixLayerKind,
): (string | number)[] {
  return [0, 1, 2].map((column) =>
    getMatrixLayerValue(item.cells[row * 3 + column], layer),
  );
}

function layerValuesOfColumn(
  item: MatrixItem,
  column: number,
  layer: MatrixLayerKind,
): (string | number)[] {
  return [0, 1, 2].map((row) =>
    getMatrixLayerValue(item.cells[row * 3 + column], layer),
  );
}

describe('generateMatrixItem — propriétés sur 500 tirages (2 structures × 5 niveaux × 50 seeds)', () => {
  it('produit 9 cases, 6 propositions et les 5 types de distracteurs', () => {
    forEachGeneratedItem((item) => {
      expect(item.cells).toHaveLength(9);
      expect(item.proposals).toHaveLength(6);
      const kinds = item.proposals.map((proposal) => proposal.kind);
      expect(new Set(kinds).size).toBe(6);
      expect(kinds).toContain(MatrixProposalKind.CORRECT);
      expect(kinds).toContain(MatrixProposalKind.WRONG_LAYER_A);
      expect(kinds).toContain(MatrixProposalKind.WRONG_LAYER_B);
      expect(kinds).toContain(MatrixProposalKind.GRID_DUPLICATE);
      expect(kinds).toContain(MatrixProposalKind.WRONG_STEP);
      expect(kinds).toContain(MatrixProposalKind.WRONG_AXIS);
    });
  });

  it("garantit l'unicité de la réponse par évaluation des règles sur les 6 propositions", () => {
    forEachGeneratedItem((item) => {
      const visible = item.cells.slice(0, 8);
      const satisfying = item.proposals.filter((proposal) =>
        matrixCandidateSatisfiesRules(visible, item.ruleSpec, proposal.cell),
      );
      expect(satisfying).toHaveLength(1);
      expect(satisfying[0].kind).toBe(MatrixProposalKind.CORRECT);
      expect(matrixCellsEqual(satisfying[0].cell, item.cells[8])).toBe(true);
    });
  });

  it('rend les 6 propositions toutes distinctes', () => {
    forEachGeneratedItem((item) => {
      for (let first = 0; first < 6; first += 1) {
        for (let second = first + 1; second < 6; second += 1) {
          expect(
            matrixCellsEqual(
              item.proposals[first].cell,
              item.proposals[second].cell,
            ),
          ).toBe(false);
        }
      }
    });
  });

  it('impose la distance perceptive minimale entre propositions (métrique : couches saillantes = 2, un cran de nuance fine taille/remplissage/rotation = 1, minimum exigé = 2)', () => {
    forEachGeneratedItem((item) => {
      for (let first = 0; first < 6; first += 1) {
        for (let second = first + 1; second < 6; second += 1) {
          expect(
            matrixPerceptualDistance(
              item.proposals[first].cell,
              item.proposals[second].cell,
            ),
          ).toBeGreaterThanOrEqual(MATRIX_MIN_PERCEPTUAL_DISTANCE);
        }
      }
    });
  });

  it('respecte les constantes de ligne et de colonne des matrices croisées', () => {
    forEachGeneratedItem((item) => {
      if (item.ruleSpec.structure !== MatrixStructure.CROSSED) {
        return;
      }
      const { rowLayer, colLayer, progressionLayer } = item.ruleSpec;
      for (let index = 0; index < 3; index += 1) {
        expect(new Set(layerValuesOfRow(item, index, rowLayer)).size).toBe(1);
        expect(new Set(layerValuesOfColumn(item, index, colLayer)).size).toBe(1);
      }
      expect(new Set(layerValuesOfRow(item, 0, rowLayer)).size).toBe(1);
      const rowValues = [0, 1, 2].map((row) =>
        getMatrixLayerValue(item.cells[row * 3], rowLayer),
      );
      expect(new Set(rowValues).size).toBe(3);
      if (progressionLayer) {
        const scale = matrixLayerScale(progressionLayer);
        expect(scale).not.toBeNull();
        const indices = [0, 1, 2].map((column) =>
          (scale ?? []).indexOf(getMatrixLayerValue(item.cells[column], progressionLayer)),
        );
        const step = indices[1] - indices[0];
        expect(Math.abs(step)).toBe(1);
        expect(indices[2] - indices[1]).toBe(step);
      }
    });
  });

  it('respecte la permutation latine indépendante par couche des matrices de distribution', () => {
    forEachGeneratedItem((item) => {
      if (item.ruleSpec.structure !== MatrixStructure.DISTRIBUTION) {
        return;
      }
      for (const layer of item.ruleSpec.latinLayers) {
        for (let index = 0; index < 3; index += 1) {
          expect(new Set(layerValuesOfRow(item, index, layer)).size).toBe(3);
          expect(new Set(layerValuesOfColumn(item, index, layer)).size).toBe(3);
        }
      }
    });
  });

  it('garde les couches inactives uniformes sur les 9 cases', () => {
    forEachGeneratedItem((item) => {
      const inactive = MATRIX_LAYER_KINDS.filter(
        (layer) => !item.activeLayers.includes(layer),
      );
      for (const layer of inactive) {
        const values = item.cells.map((cell: MatrixCellSpec) =>
          getMatrixLayerValue(cell, layer),
        );
        expect(new Set(values).size).toBe(1);
      }
    });
  });

  it('est strictement déterministe : même seed, même item', () => {
    for (const structure of STRUCTURES) {
      for (const level of LEVELS) {
        const first = generateMatrixItem({
          structure,
          level,
          seed: 'determinism-check',
        });
        const second = generateMatrixItem({
          structure,
          level,
          seed: 'determinism-check',
        });
        expect(second).toEqual(first);
      }
    }
  });

  it('fournit une règle avec identifiant technique et formulation utilisateur', () => {
    forEachGeneratedItem((item) => {
      expect(item.rule.id.length).toBeGreaterThan(0);
      expect(item.rule.userText.endsWith('.')).toBe(true);
      expect(item.rule.userText).toContain('ligne');
      expect(item.rule.userText).toContain('colonne');
    });
  });
});

describe('buildMatrixRule — formulations utilisateur', () => {
  it('remplit le gabarit des matrices croisées', () => {
    const rule = buildMatrixRule({
      structure: MatrixStructure.CROSSED,
      rowLayer: MatrixLayerKind.SYMBOL,
      colLayer: MatrixLayerKind.CONTAINER,
      progressionLayer: null,
    });
    expect(rule.id).toBe('crossed-symbol-x-container');
    expect(rule.userText).toBe(
      'Chaque ligne garde son symbole, chaque colonne garde son contenant.',
    );
  });

  it('accorde les possessifs des couches féminines', () => {
    const rule = buildMatrixRule({
      structure: MatrixStructure.CROSSED,
      rowLayer: MatrixLayerKind.SIZE,
      colLayer: MatrixLayerKind.COUNT,
      progressionLayer: null,
    });
    expect(rule.userText).toBe(
      "Chaque ligne garde sa taille, chaque colonne garde son nombre d'éléments.",
    );
  });

  it('ajoute la clause de progression superposée', () => {
    const rule = buildMatrixRule({
      structure: MatrixStructure.CROSSED,
      rowLayer: MatrixLayerKind.SYMBOL,
      colLayer: MatrixLayerKind.CONTAINER,
      progressionLayer: MatrixLayerKind.COUNT,
    });
    expect(rule.id).toBe('crossed-symbol-x-container-prog-count');
    expect(rule.userText).toBe(
      "Chaque ligne garde son symbole, chaque colonne garde son contenant. Le nombre d'éléments progresse de gauche à droite.",
    );
  });

  it('formule la distribution à une couche', () => {
    const rule = buildMatrixRule({
      structure: MatrixStructure.DISTRIBUTION,
      latinLayers: [MatrixLayerKind.SYMBOL],
    });
    expect(rule.id).toBe('distribution-symbol');
    expect(rule.userText).toBe(
      'Chaque symbole apparaît une seule fois par ligne et par colonne.',
    );
  });

  it('énumère la distribution à plusieurs couches', () => {
    const rule = buildMatrixRule({
      structure: MatrixStructure.DISTRIBUTION,
      latinLayers: [
        MatrixLayerKind.SYMBOL,
        MatrixLayerKind.CONTAINER,
        MatrixLayerKind.FILL,
      ],
    });
    expect(rule.userText).toBe(
      'Symbole, contenant et remplissage apparaissent chacun une seule fois par ligne et par colonne.',
    );
  });
});

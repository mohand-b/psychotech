import { describe, expect, it } from 'vitest';
import {
  MATRIX_LAYER_KINDS,
  MATRIX_MIN_PERCEPTUAL_DISTANCE,
  MatrixCellKind,
  MatrixCompositionCell,
  MatrixCompositionVariant,
  MatrixLayeredCell,
  MatrixLayerKind,
  MatrixLevel,
  MatrixRegister,
  MatrixStructure,
  getMatrixLayerValue,
  matrixCellsEqual,
  matrixLayerScale,
  matrixPerceptualDistance,
} from './matrix-cell';
import { generateMatrixItem } from './generate-matrix-item';
import { MatrixItem, MatrixProposalKind } from './matrix-item';
import {
  buildMatrixRule,
  matrixCandidateSatisfiesRules,
  symmetricDifferenceElements,
  unionElements,
} from './matrix-rules';

interface StructureCase {
  structure: MatrixStructure;
  variant?: MatrixCompositionVariant;
}

const STRUCTURE_CASES: readonly StructureCase[] = [
  { structure: MatrixStructure.CROSSED },
  { structure: MatrixStructure.DISTRIBUTION },
  {
    structure: MatrixStructure.COMPOSITION,
    variant: MatrixCompositionVariant.ADDITION,
  },
  {
    structure: MatrixStructure.COMPOSITION,
    variant: MatrixCompositionVariant.SOUSTRACTION,
  },
  {
    structure: MatrixStructure.COMPOSITION,
    variant: MatrixCompositionVariant.EMBOITEMENT,
  },
];

const REGISTERS = [MatrixRegister.FIGURES, MatrixRegister.TRAITS];
const LEVELS: MatrixLevel[] = [1, 2, 3, 4, 5];
const SEEDS_PER_COMBINATION = 10;

const LAYERED_KINDS = [
  MatrixProposalKind.CORRECT,
  MatrixProposalKind.WRONG_LAYER_A,
  MatrixProposalKind.WRONG_LAYER_B,
  MatrixProposalKind.GRID_DUPLICATE,
  MatrixProposalKind.WRONG_STEP,
  MatrixProposalKind.WRONG_AXIS,
];

const COMPOSITION_KINDS = [
  MatrixProposalKind.CORRECT,
  MatrixProposalKind.MISSING_ELEMENT,
  MatrixProposalKind.EXTRA_ELEMENT,
  MatrixProposalKind.FIRST_CELL_ONLY,
  MatrixProposalKind.WRONG_LAYER_REMOVED,
  MatrixProposalKind.GRID_DUPLICATE,
];

function forEachGeneratedItem(check: (item: MatrixItem) => void): void {
  for (const structureCase of STRUCTURE_CASES) {
    for (const register of REGISTERS) {
      for (const level of LEVELS) {
        for (let draw = 0; draw < SEEDS_PER_COMBINATION; draw += 1) {
          const item = generateMatrixItem({
            structure: structureCase.structure,
            variant: structureCase.variant,
            register,
            level,
            seed: `property-${draw}`,
          });
          check(item);
        }
      }
    }
  }
}

function layeredCells(item: MatrixItem): readonly MatrixLayeredCell[] {
  return item.cells as readonly MatrixLayeredCell[];
}

function layerValuesOfRow(
  item: MatrixItem,
  row: number,
  layer: MatrixLayerKind,
): (string | number)[] {
  return [0, 1, 2].map((column) =>
    getMatrixLayerValue(layeredCells(item)[row * 3 + column], layer),
  );
}

function layerValuesOfColumn(
  item: MatrixItem,
  column: number,
  layer: MatrixLayerKind,
): (string | number)[] {
  return [0, 1, 2].map((row) =>
    getMatrixLayerValue(layeredCells(item)[row * 3 + column], layer),
  );
}

describe('generateMatrixItem — propriétés sur 500 tirages (5 structures × 2 registres × 5 niveaux × 10 seeds)', () => {
  it('produit 9 cases, 6 propositions et les types de distracteurs attendus', () => {
    forEachGeneratedItem((item) => {
      expect(item.cells).toHaveLength(9);
      expect(item.proposals).toHaveLength(6);
      const kinds = item.proposals.map((proposal) => proposal.kind);
      expect(new Set(kinds).size).toBe(6);
      const expected =
        item.structure === MatrixStructure.COMPOSITION
          ? COMPOSITION_KINDS
          : LAYERED_KINDS;
      for (const kind of expected) {
        expect(kinds).toContain(kind);
      }
    });
  });

  it('respecte le registre forcé et expose registre et variante en métadonnées', () => {
    forEachGeneratedItem((item) => {
      expect(REGISTERS).toContain(item.register);
      for (const cell of item.cells) {
        expect(cell.register).toBe(item.register);
      }
      if (item.structure === MatrixStructure.COMPOSITION) {
        expect(item.variant).not.toBeNull();
      } else {
        expect(item.variant).toBeNull();
      }
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

  it('rend les 6 propositions distinctes et au-dessus de la distance perceptive minimale (couches actives comptées saillantes)', () => {
    forEachGeneratedItem((item) => {
      for (let first = 0; first < 6; first += 1) {
        for (let second = first + 1; second < 6; second += 1) {
          const a = item.proposals[first].cell;
          const b = item.proposals[second].cell;
          expect(matrixCellsEqual(a, b)).toBe(false);
          expect(
            matrixPerceptualDistance(a, b, item.activeLayers),
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
      const rowValues = [0, 1, 2].map((row) =>
        getMatrixLayerValue(layeredCells(item)[row * 3], rowLayer),
      );
      expect(new Set(rowValues).size).toBe(3);
      if (progressionLayer) {
        const scale = matrixLayerScale(progressionLayer);
        expect(scale).not.toBeNull();
        const indices = [0, 1, 2].map((column) =>
          (scale ?? []).indexOf(
            getMatrixLayerValue(layeredCells(item)[column], progressionLayer),
          ),
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

  it('construit des lignes de composition cohérentes avec leur variante', () => {
    forEachGeneratedItem((item) => {
      if (item.ruleSpec.structure !== MatrixStructure.COMPOSITION) {
        return;
      }
      const cells = item.cells as readonly MatrixCompositionCell[];
      for (const cell of cells) {
        expect(cell.kind).toBe(MatrixCellKind.COMPOSITION);
        expect(cell.elements.length).toBeGreaterThan(0);
      }
      for (let row = 0; row < 3; row += 1) {
        const first = cells[row * 3];
        const second = cells[row * 3 + 1];
        const third = cells[row * 3 + 2];
        if (item.ruleSpec.variant === MatrixCompositionVariant.EMBOITEMENT) {
          expect([...first.elements.slice(0, -1)]).toEqual([
            ...second.elements,
          ]);
          expect([...second.elements.slice(0, -1)]).toEqual([
            ...third.elements,
          ]);
        } else if (
          item.ruleSpec.variant === MatrixCompositionVariant.ADDITION
        ) {
          expect([...third.elements].sort()).toEqual(
            unionElements(first.elements, second.elements).sort(),
          );
        } else {
          expect([...third.elements].sort()).toEqual(
            symmetricDifferenceElements(
              first.elements,
              second.elements,
            ).sort(),
          );
        }
      }
    });
  });

  it('garde les couches inactives uniformes sur les 9 cases des structures à calques', () => {
    forEachGeneratedItem((item) => {
      if (item.structure === MatrixStructure.COMPOSITION) {
        return;
      }
      const inactive = MATRIX_LAYER_KINDS.filter(
        (layer) => !item.activeLayers.includes(layer),
      );
      for (const layer of inactive) {
        const values = layeredCells(item).map((cell) =>
          getMatrixLayerValue(cell, layer),
        );
        expect(new Set(values).size).toBe(1);
      }
    });
  });

  it('est strictement déterministe : même seed, même item, registre aléatoire compris', () => {
    for (const structureCase of STRUCTURE_CASES) {
      for (const level of LEVELS) {
        const first = generateMatrixItem({
          structure: structureCase.structure,
          variant: structureCase.variant,
          level,
          seed: 'determinism-check',
        });
        const second = generateMatrixItem({
          structure: structureCase.structure,
          variant: structureCase.variant,
          level,
          seed: 'determinism-check',
        });
        expect(second).toEqual(first);
      }
    }
  });

  it('tire les deux registres quand le registre est libre', () => {
    const registers = new Set<MatrixRegister>();
    for (let draw = 0; draw < 12; draw += 1) {
      registers.add(
        generateMatrixItem({
          structure: MatrixStructure.CROSSED,
          level: 1,
          seed: `register-mix-${draw}`,
        }).register,
      );
    }
    expect(registers.size).toBe(2);
  });

  it('fournit une règle avec identifiant technique et formulation utilisateur', () => {
    forEachGeneratedItem((item) => {
      expect(item.rule.id.length).toBeGreaterThan(0);
      expect(item.rule.userText.endsWith('.')).toBe(true);
      expect(item.rule.userText).toContain('ligne');
      if (item.structure !== MatrixStructure.COMPOSITION) {
        expect(item.rule.userText).toContain('colonne');
      }
    });
  });

  it('borne la devinette par ressemblance : la bonne réponse est rarement le médoïde unique des propositions', () => {
    let uniqueMedoid = 0;
    let total = 0;
    forEachGeneratedItem((item) => {
      total += 1;
      const cells = item.proposals.map((proposal) => proposal.cell);
      const sums = cells.map((cell, index) =>
        cells.reduce(
          (sum, other, otherIndex) =>
            index === otherIndex
              ? sum
              : sum + matrixPerceptualDistance(cell, other),
          0,
        ),
      );
      const minimum = Math.min(...sums);
      const medoids = sums.filter((sum) => sum === minimum);
      const correctIndex = item.proposals.findIndex(
        (proposal) => proposal.kind === MatrixProposalKind.CORRECT,
      );
      if (medoids.length === 1 && sums[correctIndex] === minimum) {
        uniqueMedoid += 1;
      }
    });
    expect(uniqueMedoid / total).toBeLessThan(0.35);
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

  it('formule les couches de traits', () => {
    const rule = buildMatrixRule({
      structure: MatrixStructure.CROSSED,
      rowLayer: MatrixLayerKind.STROKE_A_COUNT,
      colLayer: MatrixLayerKind.STROKE_B_TYPE,
      progressionLayer: null,
    });
    expect(rule.id).toBe('crossed-stroke-a-count-x-stroke-b-type');
    expect(rule.userText).toBe(
      'Chaque ligne garde son nombre de traits principaux, chaque colonne garde la nature de ses traits secondaires.',
    );
  });

  it('ajoute la clause de progression superposée', () => {
    const rule = buildMatrixRule({
      structure: MatrixStructure.CROSSED,
      rowLayer: MatrixLayerKind.SYMBOL,
      colLayer: MatrixLayerKind.CONTAINER,
      progressionLayer: MatrixLayerKind.COUNT,
    });
    expect(rule.userText).toBe(
      "Chaque ligne garde son symbole, chaque colonne garde son contenant. Le nombre d'éléments progresse de gauche à droite.",
    );
  });

  it('formule la distribution à une et plusieurs couches', () => {
    expect(
      buildMatrixRule({
        structure: MatrixStructure.DISTRIBUTION,
        latinLayers: [MatrixLayerKind.SYMBOL],
      }).userText,
    ).toBe('Chaque symbole apparaît une seule fois par ligne et par colonne.');
    expect(
      buildMatrixRule({
        structure: MatrixStructure.DISTRIBUTION,
        latinLayers: [
          MatrixLayerKind.SYMBOL,
          MatrixLayerKind.CONTAINER,
          MatrixLayerKind.FILL,
        ],
      }).userText,
    ).toBe(
      'Symbole, contenant et remplissage apparaissent chacun une seule fois par ligne et par colonne.',
    );
  });

  it('formule les trois variantes de composition', () => {
    expect(
      buildMatrixRule({
        structure: MatrixStructure.COMPOSITION,
        variant: MatrixCompositionVariant.ADDITION,
      }).id,
    ).toBe('composition-addition');
    expect(
      buildMatrixRule({
        structure: MatrixStructure.COMPOSITION,
        variant: MatrixCompositionVariant.SOUSTRACTION,
      }).userText,
    ).toContain('s’annulent');
    expect(
      buildMatrixRule({
        structure: MatrixStructure.COMPOSITION,
        variant: MatrixCompositionVariant.EMBOITEMENT,
      }).userText,
    ).toContain('la plus interne');
  });
});

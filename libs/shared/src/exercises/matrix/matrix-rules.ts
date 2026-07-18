import {
  MATRIX_LAYER_KINDS,
  MatrixCellKind,
  MatrixCellSpec,
  MatrixCompositionCell,
  MatrixCompositionVariant,
  MatrixElementId,
  MatrixLayerKind,
  MatrixLayeredCell,
  MatrixLayerValue,
  MatrixStructure,
  createCompositionCell,
  getMatrixLayerValue,
  matrixCellsEqual,
  withMatrixLayerValue,
} from './matrix-cell';
import { MatrixRule, MatrixRuleSpec } from './matrix-item';

const LAYER_POSSESSIVE: Record<MatrixLayerKind, string> = {
  [MatrixLayerKind.SYMBOL]: 'son symbole',
  [MatrixLayerKind.CONTAINER]: 'son contenant',
  [MatrixLayerKind.DECOR]: 'son décor',
  [MatrixLayerKind.SIZE]: 'sa taille',
  [MatrixLayerKind.FILL]: 'son remplissage',
  [MatrixLayerKind.ROTATION]: 'son orientation',
  [MatrixLayerKind.COUNT]: "son nombre d'éléments",
  [MatrixLayerKind.STROKE_A_TYPE]: 'la nature de ses traits principaux',
  [MatrixLayerKind.STROKE_A_COUNT]: 'son nombre de traits principaux',
  [MatrixLayerKind.STROKE_B_TYPE]: 'la nature de ses traits secondaires',
  [MatrixLayerKind.STROKE_B_COUNT]: 'son nombre de traits secondaires',
};

const LAYER_SUBJECT: Record<MatrixLayerKind, string> = {
  [MatrixLayerKind.SYMBOL]: 'Le symbole',
  [MatrixLayerKind.CONTAINER]: 'Le contenant',
  [MatrixLayerKind.DECOR]: 'Le décor',
  [MatrixLayerKind.SIZE]: 'La taille',
  [MatrixLayerKind.FILL]: 'Le remplissage',
  [MatrixLayerKind.ROTATION]: "L'orientation",
  [MatrixLayerKind.COUNT]: "Le nombre d'éléments",
  [MatrixLayerKind.STROKE_A_TYPE]: 'La nature des traits principaux',
  [MatrixLayerKind.STROKE_A_COUNT]: 'Le nombre de traits principaux',
  [MatrixLayerKind.STROKE_B_TYPE]: 'La nature des traits secondaires',
  [MatrixLayerKind.STROKE_B_COUNT]: 'Le nombre de traits secondaires',
};

const LAYER_NOUN: Record<MatrixLayerKind, string> = {
  [MatrixLayerKind.SYMBOL]: 'symbole',
  [MatrixLayerKind.CONTAINER]: 'contenant',
  [MatrixLayerKind.DECOR]: 'décor',
  [MatrixLayerKind.SIZE]: 'taille',
  [MatrixLayerKind.FILL]: 'remplissage',
  [MatrixLayerKind.ROTATION]: 'orientation',
  [MatrixLayerKind.COUNT]: "nombre d'éléments",
  [MatrixLayerKind.STROKE_A_TYPE]: 'nature des traits principaux',
  [MatrixLayerKind.STROKE_A_COUNT]: 'nombre de traits principaux',
  [MatrixLayerKind.STROKE_B_TYPE]: 'nature des traits secondaires',
  [MatrixLayerKind.STROKE_B_COUNT]: 'nombre de traits secondaires',
};

const COMPOSITION_RULES: Record<
  MatrixCompositionVariant,
  { id: string; userText: string }
> = {
  [MatrixCompositionVariant.ADDITION]: {
    id: 'composition-addition',
    userText:
      'Dans chaque ligne, la troisième case superpose les éléments des deux premières.',
  },
  [MatrixCompositionVariant.SOUSTRACTION]: {
    id: 'composition-soustraction',
    userText:
      'Dans chaque ligne, les éléments communs aux deux premières cases s’annulent : la troisième garde les autres.',
  },
  [MatrixCompositionVariant.EMBOITEMENT]: {
    id: 'composition-emboitement',
    userText:
      'Dans chaque ligne, la pile perd sa forme la plus interne d’une case à la suivante.',
  },
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function layerId(layer: MatrixLayerKind): string {
  return layer.toLowerCase().replace(/_/g, '-');
}

export function buildMatrixRule(spec: MatrixRuleSpec): MatrixRule {
  if (spec.structure === MatrixStructure.COMPOSITION) {
    return { ...COMPOSITION_RULES[spec.variant] };
  }
  if (spec.structure === MatrixStructure.CROSSED) {
    const base = `Chaque ligne garde ${LAYER_POSSESSIVE[spec.rowLayer]}, chaque colonne garde ${LAYER_POSSESSIVE[spec.colLayer]}.`;
    const progression = spec.progressionLayer
      ? ` ${LAYER_SUBJECT[spec.progressionLayer]} progresse de gauche à droite.`
      : '';
    const id = [
      'crossed',
      layerId(spec.rowLayer),
      'x',
      layerId(spec.colLayer),
      ...(spec.progressionLayer ? ['prog', layerId(spec.progressionLayer)] : []),
    ].join('-');
    return { id, userText: `${base}${progression}` };
  }
  const nouns = spec.latinLayers.map((layer) => LAYER_NOUN[layer]);
  const userText =
    nouns.length === 1
      ? `Chaque ${nouns[0]} apparaît une seule fois par ligne et par colonne.`
      : `${capitalize(
          [nouns.slice(0, -1).join(', '), nouns[nouns.length - 1]].join(' et '),
        )} apparaissent chacun une seule fois par ligne et par colonne.`;
  const id = ['distribution', ...spec.latinLayers.map(layerId)].join('-');
  return { id, userText };
}

function uniformValue(
  cells: readonly MatrixLayeredCell[],
  layer: MatrixLayerKind,
): MatrixLayerValue | null {
  const value = getMatrixLayerValue(cells[0], layer);
  return cells.every((cell) => getMatrixLayerValue(cell, layer) === value)
    ? value
    : null;
}

function missingLatinValue(
  domain: readonly MatrixLayerValue[],
  present: readonly MatrixLayerValue[],
): MatrixLayerValue | null {
  const remaining = domain.filter((value) => !present.includes(value));
  return remaining.length === 1 ? remaining[0] : null;
}

function asLayeredCells(
  cells: readonly MatrixCellSpec[],
): readonly MatrixLayeredCell[] | null {
  return cells.every((cell) => cell.kind === MatrixCellKind.LAYERED)
    ? (cells as readonly MatrixLayeredCell[])
    : null;
}

function asCompositionCells(
  cells: readonly MatrixCellSpec[],
): readonly MatrixCompositionCell[] | null {
  return cells.every((cell) => cell.kind === MatrixCellKind.COMPOSITION)
    ? (cells as readonly MatrixCompositionCell[])
    : null;
}

export function unionElements(
  first: readonly MatrixElementId[],
  second: readonly MatrixElementId[],
): MatrixElementId[] {
  return [...new Set([...first, ...second])];
}

export function symmetricDifferenceElements(
  first: readonly MatrixElementId[],
  second: readonly MatrixElementId[],
): MatrixElementId[] {
  return [
    ...first.filter((element) => !second.includes(element)),
    ...second.filter((element) => !first.includes(element)),
  ];
}

function compositionRowResult(
  variant: MatrixCompositionVariant,
  first: MatrixCompositionCell,
  second: MatrixCompositionCell,
): MatrixCompositionCell {
  if (variant === MatrixCompositionVariant.EMBOITEMENT) {
    return createCompositionCell(
      second.register,
      second.elements.slice(0, -1),
      true,
    );
  }
  const elements =
    variant === MatrixCompositionVariant.ADDITION
      ? unionElements(first.elements, second.elements)
      : symmetricDifferenceElements(first.elements, second.elements);
  return createCompositionCell(first.register, elements, false);
}

function solveComposition(
  visibleCells: readonly MatrixCompositionCell[],
  variant: MatrixCompositionVariant,
): MatrixCompositionCell | null {
  for (const row of [0, 1]) {
    const first = visibleCells[row * 3];
    const second = visibleCells[row * 3 + 1];
    const third = visibleCells[row * 3 + 2];
    if (variant === MatrixCompositionVariant.EMBOITEMENT) {
      const expectedSecond = createCompositionCell(
        first.register,
        first.elements.slice(0, -1),
        true,
      );
      if (!matrixCellsEqual(expectedSecond, second)) {
        return null;
      }
    }
    if (!matrixCellsEqual(compositionRowResult(variant, first, second), third)) {
      return null;
    }
  }
  const lastFirst = visibleCells[6];
  const lastSecond = visibleCells[7];
  if (variant === MatrixCompositionVariant.EMBOITEMENT) {
    const expectedSecond = createCompositionCell(
      lastFirst.register,
      lastFirst.elements.slice(0, -1),
      true,
    );
    if (!matrixCellsEqual(expectedSecond, lastSecond)) {
      return null;
    }
  }
  return compositionRowResult(variant, lastFirst, lastSecond);
}

export function solveMatrix(
  visibleCells: readonly MatrixCellSpec[],
  spec: MatrixRuleSpec,
): MatrixCellSpec | null {
  if (visibleCells.length !== 8) {
    return null;
  }
  if (spec.structure === MatrixStructure.COMPOSITION) {
    const compositionCells = asCompositionCells(visibleCells);
    return compositionCells
      ? solveComposition(compositionCells, spec.variant)
      : null;
  }
  const layeredCells = asLayeredCells(visibleCells);
  if (!layeredCells) {
    return null;
  }
  const activeLayers =
    spec.structure === MatrixStructure.CROSSED
      ? [spec.rowLayer, spec.colLayer, spec.progressionLayer].filter(
          (layer): layer is MatrixLayerKind => layer !== null,
        )
      : [...spec.latinLayers];
  let solution: MatrixLayeredCell = { ...layeredCells[0] };
  for (const layer of MATRIX_LAYER_KINDS) {
    if (!activeLayers.includes(layer)) {
      const value = uniformValue(layeredCells, layer);
      if (value === null) {
        return null;
      }
      solution = withMatrixLayerValue(solution, layer, value);
      continue;
    }
    if (spec.structure === MatrixStructure.CROSSED) {
      const readsOnColumns = layer !== spec.rowLayer;
      const first = readsOnColumns ? layeredCells[2] : layeredCells[6];
      const second = readsOnColumns ? layeredCells[5] : layeredCells[7];
      const firstValue = getMatrixLayerValue(first, layer);
      if (firstValue !== getMatrixLayerValue(second, layer)) {
        return null;
      }
      solution = withMatrixLayerValue(solution, layer, firstValue);
      continue;
    }
    const domain = [0, 1, 2].map((column) =>
      getMatrixLayerValue(layeredCells[column], layer),
    );
    if (new Set(domain).size !== 3) {
      return null;
    }
    const fromRow = missingLatinValue(domain, [
      getMatrixLayerValue(layeredCells[6], layer),
      getMatrixLayerValue(layeredCells[7], layer),
    ]);
    const fromColumn = missingLatinValue(domain, [
      getMatrixLayerValue(layeredCells[2], layer),
      getMatrixLayerValue(layeredCells[5], layer),
    ]);
    if (fromRow === null || fromRow !== fromColumn) {
      return null;
    }
    solution = withMatrixLayerValue(solution, layer, fromRow);
  }
  return solution;
}

export function matrixCandidateSatisfiesRules(
  visibleCells: readonly MatrixCellSpec[],
  spec: MatrixRuleSpec,
  candidate: MatrixCellSpec,
): boolean {
  const solution = solveMatrix(visibleCells, spec);
  return solution !== null && matrixCellsEqual(solution, candidate);
}

import {
  MATRIX_LAYER_KINDS,
  MatrixCellSpec,
  MatrixLayerKind,
  MatrixLayerValue,
  MatrixStructure,
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
};

const LAYER_SUBJECT: Record<MatrixLayerKind, string> = {
  [MatrixLayerKind.SYMBOL]: 'Le symbole',
  [MatrixLayerKind.CONTAINER]: 'Le contenant',
  [MatrixLayerKind.DECOR]: 'Le décor',
  [MatrixLayerKind.SIZE]: 'La taille',
  [MatrixLayerKind.FILL]: 'Le remplissage',
  [MatrixLayerKind.ROTATION]: "L'orientation",
  [MatrixLayerKind.COUNT]: "Le nombre d'éléments",
};

const LAYER_NOUN: Record<MatrixLayerKind, string> = {
  [MatrixLayerKind.SYMBOL]: 'symbole',
  [MatrixLayerKind.CONTAINER]: 'contenant',
  [MatrixLayerKind.DECOR]: 'décor',
  [MatrixLayerKind.SIZE]: 'taille',
  [MatrixLayerKind.FILL]: 'remplissage',
  [MatrixLayerKind.ROTATION]: 'orientation',
  [MatrixLayerKind.COUNT]: "nombre d'éléments",
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildMatrixRule(spec: MatrixRuleSpec): MatrixRule {
  if (spec.structure === MatrixStructure.CROSSED) {
    const base = `Chaque ligne garde ${LAYER_POSSESSIVE[spec.rowLayer]}, chaque colonne garde ${LAYER_POSSESSIVE[spec.colLayer]}.`;
    const progression = spec.progressionLayer
      ? ` ${LAYER_SUBJECT[spec.progressionLayer]} progresse de gauche à droite.`
      : '';
    const id = [
      'crossed',
      spec.rowLayer.toLowerCase(),
      'x',
      spec.colLayer.toLowerCase(),
      ...(spec.progressionLayer
        ? ['prog', spec.progressionLayer.toLowerCase()]
        : []),
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
  const id = ['distribution', ...spec.latinLayers.map((l) => l.toLowerCase())]
    .join('-');
  return { id, userText };
}

function uniformValue(
  cells: readonly MatrixCellSpec[],
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

export function solveMatrix(
  visibleCells: readonly MatrixCellSpec[],
  spec: MatrixRuleSpec,
): MatrixCellSpec | null {
  if (visibleCells.length !== 8) {
    return null;
  }
  const activeLayers =
    spec.structure === MatrixStructure.CROSSED
      ? [spec.rowLayer, spec.colLayer, spec.progressionLayer].filter(
          (layer): layer is MatrixLayerKind => layer !== null,
        )
      : [...spec.latinLayers];
  let solution = { ...visibleCells[0] };
  for (const layer of MATRIX_LAYER_KINDS) {
    if (!activeLayers.includes(layer)) {
      const value = uniformValue(visibleCells, layer);
      if (value === null) {
        return null;
      }
      solution = withMatrixLayerValue(solution, layer, value);
      continue;
    }
    if (spec.structure === MatrixStructure.CROSSED) {
      const readsOnColumns = layer !== spec.rowLayer;
      const first = readsOnColumns ? visibleCells[2] : visibleCells[6];
      const second = readsOnColumns ? visibleCells[5] : visibleCells[7];
      const firstValue = getMatrixLayerValue(first, layer);
      if (firstValue !== getMatrixLayerValue(second, layer)) {
        return null;
      }
      solution = withMatrixLayerValue(solution, layer, firstValue);
      continue;
    }
    const domain = [0, 1, 2].map((column) =>
      getMatrixLayerValue(visibleCells[column], layer),
    );
    if (new Set(domain).size !== 3) {
      return null;
    }
    const fromRow = missingLatinValue(domain, [
      getMatrixLayerValue(visibleCells[6], layer),
      getMatrixLayerValue(visibleCells[7], layer),
    ]);
    const fromColumn = missingLatinValue(domain, [
      getMatrixLayerValue(visibleCells[2], layer),
      getMatrixLayerValue(visibleCells[5], layer),
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

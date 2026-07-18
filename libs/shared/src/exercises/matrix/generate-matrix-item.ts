import { SeededRng, createSeededRng } from '../rng';
import {
  MATRIX_COUNT_SCALE,
  MATRIX_DECORS,
  MATRIX_FIGURE_ELEMENTS,
  MATRIX_FILL_SCALE,
  MATRIX_MIN_PERCEPTUAL_DISTANCE,
  MATRIX_SIZE_SCALE,
  MATRIX_STROKE_COUNT_SCALE,
  MATRIX_STROKE_ELEMENTS,
  MATRIX_STROKE_TYPES,
  MATRIX_SYMBOLS,
  MATRIX_VISIBLE_CONTAINERS,
  MatrixCellKind,
  MatrixCellSpec,
  MatrixCompositionCell,
  MatrixCompositionVariant,
  MatrixContainer,
  MatrixDecor,
  MatrixElementId,
  MatrixLayerKind,
  MatrixLayeredCell,
  MatrixLayerValue,
  MatrixLevel,
  MatrixRegister,
  MatrixStrokeType,
  MatrixStructure,
  createCompositionCell,
  createDefaultMatrixCell,
  createDefaultStrokeCell,
  getMatrixLayerValue,
  matrixCellsEqual,
  matrixLayerScale,
  matrixPerceptualDistance,
  withMatrixLayerValue,
} from './matrix-cell';
import {
  MatrixItem,
  MatrixProposal,
  MatrixProposalKind,
  MatrixRuleSpec,
} from './matrix-item';
import {
  buildMatrixRule,
  matrixCandidateSatisfiesRules,
  solveMatrix,
  symmetricDifferenceElements,
  unionElements,
} from './matrix-rules';

export interface GenerateMatrixItemOptions {
  structure: MatrixStructure;
  level: MatrixLevel;
  seed: string;
  register?: MatrixRegister;
  variant?: MatrixCompositionVariant;
}

const MAX_GENERATION_ATTEMPTS = 24;

const FIGURE_CONTINUOUS_LAYERS: readonly MatrixLayerKind[] = [
  MatrixLayerKind.SIZE,
  MatrixLayerKind.COUNT,
  MatrixLayerKind.FILL,
];

function pickAxisValues(
  layer: MatrixLayerKind,
  rng: SeededRng,
): MatrixLayerValue[] {
  switch (layer) {
    case MatrixLayerKind.SYMBOL:
      return rng.shuffle(MATRIX_SYMBOLS).slice(0, 3);
    case MatrixLayerKind.CONTAINER:
      return rng.shuffle(MATRIX_VISIBLE_CONTAINERS);
    case MatrixLayerKind.DECOR:
      return rng.shuffle(MATRIX_DECORS).slice(0, 3);
    case MatrixLayerKind.SIZE:
      return rng.shuffle(MATRIX_SIZE_SCALE);
    case MatrixLayerKind.FILL:
      return rng.shuffle(MATRIX_FILL_SCALE);
    case MatrixLayerKind.COUNT:
      return rng.shuffle(MATRIX_COUNT_SCALE).slice(0, 3);
    case MatrixLayerKind.STROKE_A_TYPE:
    case MatrixLayerKind.STROKE_B_TYPE:
      return rng.shuffle(MATRIX_STROKE_TYPES).slice(0, 3);
    case MatrixLayerKind.STROKE_A_COUNT:
    case MatrixLayerKind.STROKE_B_COUNT:
      return rng.shuffle(MATRIX_STROKE_COUNT_SCALE);
    default:
      throw new Error(`Layer ${layer} cannot carry axis values`);
  }
}

function maybeSwap<T>(pair: [T, T], rng: SeededRng): [T, T] {
  return rng.next() < 0.5 ? [pair[1], pair[0]] : pair;
}

interface LayeredPlan {
  ruleSpec: Exclude<
    MatrixRuleSpec,
    { structure: MatrixStructure.COMPOSITION }
  >;
  cells: MatrixLayeredCell[];
}

function crossedLayerRoles(
  register: MatrixRegister,
  level: MatrixLevel,
  rng: SeededRng,
): {
  rowLayer: MatrixLayerKind;
  colLayer: MatrixLayerKind;
  progressionLayer: MatrixLayerKind | null;
} {
  if (register === MatrixRegister.FIGURES) {
    switch (level) {
      case 1: {
        const [rowLayer, colLayer] = maybeSwap(
          [MatrixLayerKind.SYMBOL, MatrixLayerKind.CONTAINER],
          rng,
        );
        return { rowLayer, colLayer, progressionLayer: null };
      }
      case 2: {
        const [rowLayer, colLayer] = maybeSwap(
          [MatrixLayerKind.SYMBOL, MatrixLayerKind.DECOR],
          rng,
        );
        return { rowLayer, colLayer, progressionLayer: null };
      }
      case 3: {
        const [rowLayer, colLayer] = maybeSwap(
          [MatrixLayerKind.SYMBOL, rng.pick(FIGURE_CONTINUOUS_LAYERS)],
          rng,
        );
        return { rowLayer, colLayer, progressionLayer: null };
      }
      case 4: {
        const pool = rng.shuffle(FIGURE_CONTINUOUS_LAYERS);
        return { rowLayer: pool[0], colLayer: pool[1], progressionLayer: null };
      }
      case 5: {
        const [rowLayer, colLayer] = maybeSwap(
          [MatrixLayerKind.SYMBOL, MatrixLayerKind.CONTAINER],
          rng,
        );
        return {
          rowLayer,
          colLayer,
          progressionLayer: rng.pick(FIGURE_CONTINUOUS_LAYERS),
        };
      }
    }
  }
  switch (level) {
    case 1: {
      const [rowLayer, colLayer] = maybeSwap(
        [MatrixLayerKind.STROKE_A_COUNT, MatrixLayerKind.STROKE_B_COUNT],
        rng,
      );
      return { rowLayer, colLayer, progressionLayer: null };
    }
    case 2: {
      const [rowLayer, colLayer] = maybeSwap(
        [MatrixLayerKind.STROKE_A_COUNT, MatrixLayerKind.STROKE_B_TYPE],
        rng,
      );
      return { rowLayer, colLayer, progressionLayer: null };
    }
    case 3: {
      const [rowLayer, colLayer] = maybeSwap(
        [MatrixLayerKind.STROKE_A_TYPE, MatrixLayerKind.STROKE_B_COUNT],
        rng,
      );
      return { rowLayer, colLayer, progressionLayer: null };
    }
    case 4: {
      const [rowLayer, colLayer] = maybeSwap(
        [MatrixLayerKind.STROKE_A_TYPE, MatrixLayerKind.STROKE_A_COUNT],
        rng,
      );
      return { rowLayer, colLayer, progressionLayer: null };
    }
    case 5:
      return {
        rowLayer: MatrixLayerKind.STROKE_A_COUNT,
        colLayer: MatrixLayerKind.STROKE_B_TYPE,
        progressionLayer: MatrixLayerKind.STROKE_B_COUNT,
      };
  }
}

function distributionLayers(
  register: MatrixRegister,
  level: MatrixLevel,
  rng: SeededRng,
): MatrixLayerKind[] {
  if (register === MatrixRegister.FIGURES) {
    switch (level) {
      case 1:
        return [MatrixLayerKind.SYMBOL];
      case 2:
        return [MatrixLayerKind.SYMBOL, MatrixLayerKind.CONTAINER];
      case 3:
        return [
          MatrixLayerKind.SYMBOL,
          rng.pick([MatrixLayerKind.DECOR, MatrixLayerKind.FILL]),
        ];
      case 4:
        return [
          MatrixLayerKind.SYMBOL,
          MatrixLayerKind.CONTAINER,
          rng.pick([MatrixLayerKind.FILL, MatrixLayerKind.DECOR]),
        ];
      case 5:
        return [
          MatrixLayerKind.SYMBOL,
          rng.pick([MatrixLayerKind.SIZE, MatrixLayerKind.COUNT]),
        ];
    }
  }
  switch (level) {
    case 1:
      return [MatrixLayerKind.STROKE_A_COUNT];
    case 2:
      return [MatrixLayerKind.STROKE_A_COUNT, MatrixLayerKind.STROKE_B_COUNT];
    case 3:
      return [MatrixLayerKind.STROKE_A_COUNT, MatrixLayerKind.STROKE_B_TYPE];
    case 4:
      return [
        MatrixLayerKind.STROKE_A_COUNT,
        MatrixLayerKind.STROKE_B_COUNT,
        MatrixLayerKind.STROKE_A_TYPE,
      ];
    case 5:
      return [MatrixLayerKind.STROKE_A_TYPE, MatrixLayerKind.STROKE_A_COUNT];
  }
}

function progressionValues(
  layer: MatrixLayerKind,
  rng: SeededRng,
): MatrixLayerValue[] {
  const scale = matrixLayerScale(layer);
  if (!scale) {
    throw new Error(`Layer ${layer} has no ordered scale`);
  }
  const start = rng.nextInt(0, scale.length - 3);
  const window = scale.slice(start, start + 3);
  return rng.next() < 0.5 ? [...window] : [...window].reverse();
}

function layeredDefaults(
  register: MatrixRegister,
  activeLayers: readonly MatrixLayerKind[],
  typeAxisValues: ReadonlyMap<MatrixLayerKind, readonly MatrixLayerValue[]>,
  rng: SeededRng,
): MatrixLayeredCell {
  if (register === MatrixRegister.FIGURES) {
    return createDefaultMatrixCell(rng.pick(MATRIX_SYMBOLS));
  }
  const aTypeValues = typeAxisValues.get(MatrixLayerKind.STROKE_A_TYPE);
  const bTypeValues = typeAxisValues.get(MatrixLayerKind.STROKE_B_TYPE);
  if (aTypeValues) {
    const remaining = MATRIX_STROKE_TYPES.find(
      (type) => !aTypeValues.includes(type),
    );
    return createDefaultStrokeCell(
      MatrixStrokeType.HORIZONTAL,
      remaining ?? MatrixStrokeType.ARC,
    );
  }
  if (bTypeValues) {
    const remaining = MATRIX_STROKE_TYPES.find(
      (type) => !bTypeValues.includes(type),
    );
    return createDefaultStrokeCell(
      remaining ?? MatrixStrokeType.ARC,
      MatrixStrokeType.HORIZONTAL,
    );
  }
  const [typeA, typeB] = rng.shuffle(MATRIX_STROKE_TYPES);
  return createDefaultStrokeCell(typeA, typeB);
}

function buildLayeredPlan(
  structure: MatrixStructure,
  register: MatrixRegister,
  level: MatrixLevel,
  rng: SeededRng,
): LayeredPlan {
  if (structure === MatrixStructure.CROSSED) {
    const { rowLayer, colLayer, progressionLayer } = crossedLayerRoles(
      register,
      level,
      rng,
    );
    const rowValues = pickAxisValues(rowLayer, rng);
    const colValues = pickAxisValues(colLayer, rng);
    const progValues = progressionLayer
      ? progressionValues(progressionLayer, rng)
      : null;
    const typeAxisValues = new Map<MatrixLayerKind, readonly MatrixLayerValue[]>();
    for (const [layer, values] of [
      [rowLayer, rowValues],
      [colLayer, colValues],
    ] as const) {
      if (
        layer === MatrixLayerKind.STROKE_A_TYPE ||
        layer === MatrixLayerKind.STROKE_B_TYPE
      ) {
        typeAxisValues.set(layer, values);
      }
    }
    const activeLayers = [rowLayer, colLayer, progressionLayer].filter(
      (layer): layer is MatrixLayerKind => layer !== null,
    );
    const defaults = layeredDefaults(register, activeLayers, typeAxisValues, rng);
    const cells: MatrixLayeredCell[] = [];
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        let cell = withMatrixLayerValue(defaults, rowLayer, rowValues[row]);
        cell = withMatrixLayerValue(cell, colLayer, colValues[column]);
        if (progressionLayer && progValues) {
          cell = withMatrixLayerValue(
            cell,
            progressionLayer,
            progValues[column],
          );
        }
        cells.push(cell);
      }
    }
    return {
      ruleSpec: {
        structure: MatrixStructure.CROSSED,
        rowLayer,
        colLayer,
        progressionLayer,
      },
      cells,
    };
  }
  const latinLayers = distributionLayers(register, level, rng);
  const assignments = latinLayers.map((layer) => ({
    layer,
    values: pickAxisValues(layer, rng),
    rowOffsets: rng.shuffle([0, 1, 2]),
    colOffsets: rng.shuffle([0, 1, 2]),
  }));
  const typeAxisValues = new Map<MatrixLayerKind, readonly MatrixLayerValue[]>();
  for (const assignment of assignments) {
    if (
      assignment.layer === MatrixLayerKind.STROKE_A_TYPE ||
      assignment.layer === MatrixLayerKind.STROKE_B_TYPE
    ) {
      typeAxisValues.set(assignment.layer, assignment.values);
    }
  }
  const defaults = layeredDefaults(register, latinLayers, typeAxisValues, rng);
  const cells: MatrixLayeredCell[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let cell = defaults;
      for (const { layer, values, rowOffsets, colOffsets } of assignments) {
        const value = values[(rowOffsets[row] + colOffsets[column]) % 3];
        cell = withMatrixLayerValue(cell, layer, value);
      }
      cells.push(cell);
    }
  }
  return {
    ruleSpec: { structure: MatrixStructure.DISTRIBUTION, latinLayers },
    cells,
  };
}

interface CompositionPlan {
  ruleSpec: Extract<MatrixRuleSpec, { structure: MatrixStructure.COMPOSITION }>;
  cells: MatrixCompositionCell[];
}

const COMPOSITION_SET_SIZES: Record<
  MatrixLevel,
  { first: number; second: number; overlap: number }
> = {
  1: { first: 2, second: 2, overlap: 0 },
  2: { first: 2, second: 2, overlap: 1 },
  3: { first: 3, second: 2, overlap: 1 },
  4: { first: 3, second: 3, overlap: 1 },
  5: { first: 3, second: 3, overlap: 2 },
};

function compositionPalette(register: MatrixRegister): readonly MatrixElementId[] {
  return register === MatrixRegister.FIGURES
    ? MATRIX_FIGURE_ELEMENTS
    : MATRIX_STROKE_ELEMENTS;
}

function buildCompositionPlan(
  register: MatrixRegister,
  variant: MatrixCompositionVariant,
  level: MatrixLevel,
  rng: SeededRng,
): CompositionPlan {
  const palette = compositionPalette(register);
  const cells: MatrixCompositionCell[] = [];
  if (variant === MatrixCompositionVariant.EMBOITEMENT) {
    const depth = level <= 3 ? 4 : 5;
    for (let row = 0; row < 3; row += 1) {
      const pile = rng.shuffle(palette).slice(0, depth);
      cells.push(
        createCompositionCell(register, pile, true),
        createCompositionCell(register, pile.slice(0, -1), true),
        createCompositionCell(register, pile.slice(0, -2), true),
      );
    }
  } else {
    const sizes = COMPOSITION_SET_SIZES[level];
    const overlap =
      variant === MatrixCompositionVariant.SOUSTRACTION
        ? Math.max(1, sizes.overlap)
        : sizes.overlap;
    for (let row = 0; row < 3; row += 1) {
      const drawn = rng
        .shuffle(palette)
        .slice(0, sizes.first + sizes.second - overlap);
      const common = drawn.slice(0, overlap);
      const first = [...common, ...drawn.slice(overlap, sizes.first)];
      const second = [
        ...common,
        ...drawn.slice(sizes.first, sizes.first + sizes.second - overlap),
      ];
      const third =
        variant === MatrixCompositionVariant.ADDITION
          ? unionElements(first, second)
          : symmetricDifferenceElements(first, second);
      cells.push(
        createCompositionCell(register, first, false),
        createCompositionCell(register, second, false),
        createCompositionCell(register, third, false),
      );
    }
  }
  return {
    ruleSpec: { structure: MatrixStructure.COMPOSITION, variant },
    cells,
  };
}

type CellMutation = (cell: MatrixCellSpec) => MatrixCellSpec;

function cycleValue<T>(values: readonly T[], current: T): T {
  return values[(values.indexOf(current) + 1) % values.length];
}

function cycleStrokeType(
  current: MatrixStrokeType,
  forbidden: MatrixStrokeType,
): MatrixStrokeType {
  let next = cycleValue(MATRIX_STROKE_TYPES, current);
  if (next === forbidden) {
    next = cycleValue(MATRIX_STROKE_TYPES, next);
  }
  return next;
}

function layeredMutations(register: MatrixRegister): CellMutation[] {
  const asLayered = (
    cell: MatrixCellSpec,
    mutate: (layered: MatrixLayeredCell) => MatrixLayeredCell,
  ): MatrixCellSpec =>
    cell.kind === MatrixCellKind.LAYERED ? mutate(cell) : cell;
  if (register === MatrixRegister.FIGURES) {
    return [
      (cell) =>
        asLayered(cell, (layered) => ({
          ...layered,
          count: cycleValue(MATRIX_COUNT_SCALE, layered.count),
        })),
      (cell) =>
        asLayered(cell, (layered) => ({
          ...layered,
          container: cycleValue(
            [MatrixContainer.NONE, ...MATRIX_VISIBLE_CONTAINERS],
            layered.container,
          ),
        })),
      (cell) =>
        asLayered(cell, (layered) => ({
          ...layered,
          symbol: cycleValue(MATRIX_SYMBOLS, layered.symbol),
        })),
      (cell) =>
        asLayered(cell, (layered) => ({
          ...layered,
          decor: cycleValue(MATRIX_DECORS, layered.decor),
        })),
    ];
  }
  return [
    (cell) =>
      asLayered(cell, (layered) => ({
        ...layered,
        strokeBCount: cycleValue(MATRIX_STROKE_COUNT_SCALE, layered.strokeBCount),
      })),
    (cell) =>
      asLayered(cell, (layered) => ({
        ...layered,
        strokeACount: cycleValue(MATRIX_STROKE_COUNT_SCALE, layered.strokeACount),
      })),
    (cell) =>
      asLayered(cell, (layered) => ({
        ...layered,
        strokeBType: cycleStrokeType(layered.strokeBType, layered.strokeAType),
      })),
    (cell) =>
      asLayered(cell, (layered) => ({
        ...layered,
        strokeAType: cycleStrokeType(layered.strokeAType, layered.strokeBType),
      })),
  ];
}

function compositionMutations(
  register: MatrixRegister,
): CellMutation[] {
  return compositionPalette(register).map((atom) => (cell) => {
    if (cell.kind !== MatrixCellKind.COMPOSITION) {
      return cell;
    }
    const elements = cell.elements.includes(atom)
      ? cell.elements.filter((element) => element !== atom)
      : [...cell.elements, atom];
    if (elements.length === 0) {
      return cell;
    }
    return createCompositionCell(cell.register, elements, cell.nested);
  });
}

class ProposalCollector {
  private readonly cells: MatrixCellSpec[];
  readonly proposals: MatrixProposal[] = [];

  constructor(
    answer: MatrixCellSpec,
    private readonly activeLayers: readonly MatrixLayerKind[],
    private readonly mutations: readonly CellMutation[],
  ) {
    this.cells = [answer];
  }

  private acceptable(candidate: MatrixCellSpec): boolean {
    return this.cells.every(
      (existing) =>
        !matrixCellsEqual(existing, candidate) &&
        matrixPerceptualDistance(existing, candidate, this.activeLayers) >=
          MATRIX_MIN_PERCEPTUAL_DISTANCE,
    );
  }

  tryAdd(
    candidates: readonly MatrixCellSpec[],
    kind: MatrixProposalKind,
  ): boolean {
    const expanded: MatrixCellSpec[] = [];
    for (const candidate of candidates) {
      expanded.push(candidate);
      for (const mutate of this.mutations) {
        expanded.push(mutate(candidate));
        expanded.push(mutate(mutate(candidate)));
      }
    }
    for (const candidate of expanded) {
      if (this.acceptable(candidate)) {
        this.cells.push(candidate);
        this.proposals.push({ cell: candidate, kind });
        return true;
      }
    }
    return false;
  }
}

function wrongValuesOnLayer(
  cells: readonly MatrixLayeredCell[],
  layer: MatrixLayerKind,
  correct: MatrixLayerValue,
  rng: SeededRng,
): MatrixLayerValue[] {
  const seen = [
    ...new Set(cells.map((cell) => getMatrixLayerValue(cell, layer))),
  ];
  return rng.shuffle(seen.filter((value) => value !== correct));
}

function offRuleWrongLayer(
  answer: MatrixLayeredCell,
  activeLayers: readonly MatrixLayerKind[],
): MatrixLayeredCell {
  if (answer.register === MatrixRegister.TRAITS) {
    const layer = activeLayers.includes(MatrixLayerKind.STROKE_B_COUNT)
      ? MatrixLayerKind.STROKE_A_COUNT
      : MatrixLayerKind.STROKE_B_COUNT;
    const current = getMatrixLayerValue(answer, layer);
    return withMatrixLayerValue(
      answer,
      layer,
      cycleValue(MATRIX_STROKE_COUNT_SCALE, current as 1 | 2 | 3),
    );
  }
  return activeLayers.includes(MatrixLayerKind.CONTAINER)
    ? { ...answer, decor: MatrixDecor.STRIPES }
    : { ...answer, container: MatrixContainer.CIRCLE };
}

function stepLayerFor(
  ruleSpec: MatrixRuleSpec,
  activeLayers: readonly MatrixLayerKind[],
): MatrixLayerKind {
  if (
    ruleSpec.structure === MatrixStructure.CROSSED &&
    ruleSpec.progressionLayer
  ) {
    return ruleSpec.progressionLayer;
  }
  const continuous = activeLayers.find(
    (layer) => matrixLayerScale(layer) !== null,
  );
  return continuous ?? MatrixLayerKind.COUNT;
}

function stepCandidates(
  base: MatrixLayeredCell,
  layer: MatrixLayerKind,
): MatrixLayeredCell[] {
  const scale = matrixLayerScale(layer);
  if (!scale) {
    return [];
  }
  const index = scale.indexOf(getMatrixLayerValue(base, layer));
  return [index + 1, index - 1, index + 2, index - 2]
    .filter((candidate) => candidate >= 0 && candidate < scale.length)
    .map((candidate) => withMatrixLayerValue(base, layer, scale[candidate]));
}

function buildLayeredProposals(
  cells: readonly MatrixLayeredCell[],
  ruleSpec: Exclude<MatrixRuleSpec, { structure: MatrixStructure.COMPOSITION }>,
  activeLayers: readonly MatrixLayerKind[],
  rng: SeededRng,
): MatrixProposal[] | null {
  const answer = cells[8];
  const collector = new ProposalCollector(
    answer,
    activeLayers,
    layeredMutations(answer.register),
  );
  collector.proposals.push({ cell: answer, kind: MatrixProposalKind.CORRECT });

  const layerA = activeLayers[0];
  const layerB = activeLayers.length > 1 ? activeLayers[1] : null;
  const axisCell =
    ruleSpec.structure === MatrixStructure.CROSSED ? cells[4] : cells[2];
  const wrongAxisValue =
    ruleSpec.structure === MatrixStructure.DISTRIBUTION
      ? getMatrixLayerValue(cells[2], layerA)
      : null;

  const wrongAValues = wrongValuesOnLayer(
    cells.slice(0, 8),
    layerA,
    getMatrixLayerValue(answer, layerA),
    rng,
  ).sort((a, b) => Number(a === wrongAxisValue) - Number(b === wrongAxisValue));
  const wrongA = wrongAValues.map((value) =>
    withMatrixLayerValue(answer, layerA, value),
  );
  if (!collector.tryAdd(wrongA, MatrixProposalKind.WRONG_LAYER_A)) {
    return null;
  }

  let wrongB: MatrixLayeredCell[];
  if (layerB) {
    wrongB = wrongValuesOnLayer(
      cells.slice(0, 8),
      layerB,
      getMatrixLayerValue(answer, layerB),
      rng,
    ).map((value) => withMatrixLayerValue(answer, layerB, value));
  } else {
    wrongB = [offRuleWrongLayer(answer, activeLayers)];
  }
  if (!collector.tryAdd(wrongB, MatrixProposalKind.WRONG_LAYER_B)) {
    return null;
  }

  if (!collector.tryAdd([axisCell], MatrixProposalKind.WRONG_AXIS)) {
    return null;
  }

  const stepLayer = stepLayerFor(ruleSpec, activeLayers);
  const stepBase = activeLayers.includes(stepLayer) ? answer : axisCell;
  const wrongStep = stepCandidates(stepBase, stepLayer);
  if (
    !collector.tryAdd(
      wrongStep.length > 0
        ? wrongStep
        : stepCandidates(stepBase, MatrixLayerKind.COUNT),
      MatrixProposalKind.WRONG_STEP,
    )
  ) {
    return null;
  }

  let duplicateSources: number[];
  if (ruleSpec.structure === MatrixStructure.CROSSED) {
    duplicateSources = [...rng.shuffle([1, 3, 5, 7]), ...rng.shuffle([0, 2, 6])];
  } else {
    const axisPrimary = getMatrixLayerValue(cells[2], layerA);
    const near = [0, 1, 3, 4, 5, 6, 7].filter(
      (index) => getMatrixLayerValue(cells[index], layerA) === axisPrimary,
    );
    const far = [0, 1, 3, 4, 5, 6, 7].filter((index) => !near.includes(index));
    duplicateSources = [...rng.shuffle(near), ...rng.shuffle(far)];
  }
  if (
    !collector.tryAdd(
      duplicateSources.map((index) => cells[index]),
      MatrixProposalKind.GRID_DUPLICATE,
    )
  ) {
    return null;
  }

  return rng.shuffle(collector.proposals);
}

function buildCompositionProposals(
  cells: readonly MatrixCompositionCell[],
  register: MatrixRegister,
  variant: MatrixCompositionVariant,
  rng: SeededRng,
): MatrixProposal[] | null {
  const answer = cells[8];
  const collector = new ProposalCollector(
    answer,
    [],
    compositionMutations(register),
  );
  collector.proposals.push({ cell: answer, kind: MatrixProposalKind.CORRECT });

  const missing = rng
    .shuffle(answer.elements)
    .filter(() => answer.elements.length > 1)
    .map((element) =>
      createCompositionCell(
        register,
        answer.elements.filter((candidate) => candidate !== element),
        answer.nested,
      ),
    );
  if (!collector.tryAdd(missing, MatrixProposalKind.MISSING_ELEMENT)) {
    return null;
  }

  const unused = rng
    .shuffle(compositionPalette(register))
    .filter((atom) => !answer.elements.includes(atom));
  let extra: MatrixCompositionCell[];
  if (variant === MatrixCompositionVariant.ADDITION) {
    extra = rng
      .shuffle(answer.elements)
      .flatMap((removed) =>
        unused.map((atom) =>
          createCompositionCell(
            register,
            [
              ...answer.elements.filter((candidate) => candidate !== removed),
              atom,
            ],
            answer.nested,
          ),
        ),
      );
  } else {
    extra = unused.map((atom) =>
      createCompositionCell(
        register,
        [...answer.elements, atom],
        answer.nested,
      ),
    );
  }
  if (!collector.tryAdd(extra, MatrixProposalKind.EXTRA_ELEMENT)) {
    return null;
  }

  if (!collector.tryAdd([cells[6]], MatrixProposalKind.FIRST_CELL_ONLY)) {
    return null;
  }

  let wrongRemoval: MatrixCompositionCell[];
  if (variant === MatrixCompositionVariant.EMBOITEMENT) {
    wrongRemoval = [
      createCompositionCell(register, cells[7].elements.slice(1), true),
    ];
  } else if (variant === MatrixCompositionVariant.SOUSTRACTION) {
    const union = unionElements(cells[6].elements, cells[7].elements);
    const nonCommon = symmetricDifferenceElements(
      cells[6].elements,
      cells[7].elements,
    );
    wrongRemoval = rng
      .shuffle(nonCommon)
      .map((element) =>
        createCompositionCell(
          register,
          union.filter((candidate) => candidate !== element),
          false,
        ),
      );
  } else {
    wrongRemoval = [
      createCompositionCell(
        register,
        symmetricDifferenceElements(cells[6].elements, cells[7].elements),
        false,
      ),
    ];
  }
  if (
    !collector.tryAdd(wrongRemoval, MatrixProposalKind.WRONG_LAYER_REMOVED)
  ) {
    return null;
  }

  const duplicateSources = [7, ...rng.shuffle([0, 1, 2, 3, 4, 5])];
  if (
    !collector.tryAdd(
      duplicateSources.map((index) => cells[index]),
      MatrixProposalKind.GRID_DUPLICATE,
    )
  ) {
    return null;
  }

  return rng.shuffle(collector.proposals);
}

function validateItem(item: MatrixItem): boolean {
  const visible = item.cells.slice(0, 8);
  const solution = solveMatrix(visible, item.ruleSpec);
  if (solution === null || !matrixCellsEqual(solution, item.cells[8])) {
    return false;
  }
  const satisfying = item.proposals.filter((proposal) =>
    matrixCandidateSatisfiesRules(visible, item.ruleSpec, proposal.cell),
  );
  if (
    satisfying.length !== 1 ||
    satisfying[0].kind !== MatrixProposalKind.CORRECT
  ) {
    return false;
  }
  for (let first = 0; first < item.proposals.length; first += 1) {
    for (let second = first + 1; second < item.proposals.length; second += 1) {
      const a = item.proposals[first].cell;
      const b = item.proposals[second].cell;
      if (
        matrixCellsEqual(a, b) ||
        matrixPerceptualDistance(a, b, item.activeLayers) <
          MATRIX_MIN_PERCEPTUAL_DISTANCE
      ) {
        return false;
      }
    }
  }
  return true;
}

function correctIsUniqueMedoid(item: MatrixItem): boolean {
  const cells = item.proposals.map((proposal) => proposal.cell);
  const sums = cells.map((cell, index) =>
    cells.reduce(
      (sum, other, otherIndex) =>
        index === otherIndex ? sum : sum + matrixPerceptualDistance(cell, other),
      0,
    ),
  );
  const minimum = Math.min(...sums);
  const medoids = sums
    .map((sum, index) => ({ sum, index }))
    .filter(({ sum }) => sum === minimum);
  return (
    medoids.length === 1 &&
    item.proposals[medoids[0].index].kind === MatrixProposalKind.CORRECT
  );
}

export function generateMatrixItem(
  options: GenerateMatrixItemOptions,
): MatrixItem {
  const { structure, level, seed } = options;
  let fallback: MatrixItem | null = null;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = createSeededRng(
      `${seed}::matrix::${structure}::${level}::${attempt}`,
    );
    const register =
      options.register ??
      (rng.next() < 0.5 ? MatrixRegister.FIGURES : MatrixRegister.TRAITS);
    let cells: readonly MatrixCellSpec[];
    let ruleSpec: MatrixRuleSpec;
    let activeLayers: readonly MatrixLayerKind[];
    let proposals: MatrixProposal[] | null;
    let variant: MatrixCompositionVariant | null = null;
    if (structure === MatrixStructure.COMPOSITION) {
      variant =
        options.variant ??
        rng.pick([
          MatrixCompositionVariant.ADDITION,
          MatrixCompositionVariant.SOUSTRACTION,
          MatrixCompositionVariant.EMBOITEMENT,
        ]);
      const plan = buildCompositionPlan(register, variant, level, rng);
      cells = plan.cells;
      ruleSpec = plan.ruleSpec;
      activeLayers = [];
      proposals = buildCompositionProposals(plan.cells, register, variant, rng);
    } else {
      const plan = buildLayeredPlan(structure, register, level, rng);
      cells = plan.cells;
      ruleSpec = plan.ruleSpec;
      activeLayers =
        plan.ruleSpec.structure === MatrixStructure.CROSSED
          ? [
              plan.ruleSpec.rowLayer,
              plan.ruleSpec.colLayer,
              ...(plan.ruleSpec.progressionLayer
                ? [plan.ruleSpec.progressionLayer]
                : []),
            ]
          : [...plan.ruleSpec.latinLayers];
      proposals = buildLayeredProposals(
        plan.cells,
        plan.ruleSpec,
        activeLayers,
        rng,
      );
    }
    if (!proposals) {
      continue;
    }
    const item: MatrixItem = {
      structure,
      variant,
      register,
      level,
      seed,
      cells,
      proposals,
      rule: buildMatrixRule(ruleSpec),
      ruleSpec,
      activeLayers,
    };
    if (!validateItem(item)) {
      continue;
    }
    if (correctIsUniqueMedoid(item)) {
      fallback = fallback ?? item;
      continue;
    }
    return item;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error(
    `Matrix item generation exhausted retries for ${structure} level ${level} seed ${seed}`,
  );
}

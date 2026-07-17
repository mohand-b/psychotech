import { SeededRng, createSeededRng } from '../rng';
import {
  MATRIX_COUNT_SCALE,
  MATRIX_DECORS,
  MATRIX_FILL_SCALE,
  MATRIX_MIN_PERCEPTUAL_DISTANCE,
  MATRIX_ROTATION_SAFE_SYMBOL,
  MATRIX_ROTATION_SCALE,
  MATRIX_SIZE_SCALE,
  MATRIX_SYMBOLS,
  MATRIX_VISIBLE_CONTAINERS,
  MatrixCellSpec,
  MatrixContainer,
  MatrixDecor,
  MatrixLayerKind,
  MatrixLayerValue,
  MatrixLevel,
  MatrixStructure,
  createDefaultMatrixCell,
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
import { buildMatrixRule, matrixCandidateSatisfiesRules, solveMatrix } from './matrix-rules';

export interface GenerateMatrixItemOptions {
  structure: MatrixStructure;
  level: MatrixLevel;
  seed: string;
}

const MAX_GENERATION_ATTEMPTS = 24;

const CROSSED_CONTINUOUS_LAYERS: readonly MatrixLayerKind[] = [
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
    case MatrixLayerKind.ROTATION:
      return rng.shuffle(MATRIX_ROTATION_SCALE);
    case MatrixLayerKind.COUNT:
      return rng.shuffle(MATRIX_COUNT_SCALE).slice(0, 3);
  }
}

function maybeSwap<T>(pair: [T, T], rng: SeededRng): [T, T] {
  return rng.next() < 0.5 ? [pair[1], pair[0]] : pair;
}

interface CrossedPlan {
  ruleSpec: Extract<MatrixRuleSpec, { structure: MatrixStructure.CROSSED }>;
  cells: MatrixCellSpec[];
}

function crossedLayerRoles(
  level: MatrixLevel,
  rng: SeededRng,
): {
  rowLayer: MatrixLayerKind;
  colLayer: MatrixLayerKind;
  progressionLayer: MatrixLayerKind | null;
} {
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
      const continuous = rng.pick(CROSSED_CONTINUOUS_LAYERS);
      const [rowLayer, colLayer] = maybeSwap(
        [MatrixLayerKind.SYMBOL, continuous],
        rng,
      );
      return { rowLayer, colLayer, progressionLayer: null };
    }
    case 4: {
      const pool = rng.shuffle([
        ...CROSSED_CONTINUOUS_LAYERS,
        MatrixLayerKind.ROTATION,
      ]);
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
        progressionLayer: rng.pick(CROSSED_CONTINUOUS_LAYERS),
      };
    }
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

function buildCrossedPlan(level: MatrixLevel, rng: SeededRng): CrossedPlan {
  const { rowLayer, colLayer, progressionLayer } = crossedLayerRoles(level, rng);
  const activeLayers = [rowLayer, colLayer, progressionLayer].filter(
    (layer): layer is MatrixLayerKind => layer !== null,
  );
  const usesRotation = activeLayers.includes(MatrixLayerKind.ROTATION);
  const symbolActive = activeLayers.includes(MatrixLayerKind.SYMBOL);
  const defaultSymbol =
    !symbolActive && usesRotation
      ? MATRIX_ROTATION_SAFE_SYMBOL
      : rng.pick(MATRIX_SYMBOLS);
  const defaults = createDefaultMatrixCell(defaultSymbol);
  const rowValues = pickAxisValues(rowLayer, rng);
  const colValues = pickAxisValues(colLayer, rng);
  const progValues = progressionLayer
    ? progressionValues(progressionLayer, rng)
    : null;
  const cells: MatrixCellSpec[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let cell = withMatrixLayerValue(defaults, rowLayer, rowValues[row]);
      cell = withMatrixLayerValue(cell, colLayer, colValues[column]);
      if (progressionLayer && progValues) {
        cell = withMatrixLayerValue(cell, progressionLayer, progValues[column]);
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

interface DistributionPlan {
  ruleSpec: Extract<
    MatrixRuleSpec,
    { structure: MatrixStructure.DISTRIBUTION }
  >;
  cells: MatrixCellSpec[];
}

function distributionLayers(
  level: MatrixLevel,
  rng: SeededRng,
): MatrixLayerKind[] {
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

function buildDistributionPlan(
  level: MatrixLevel,
  rng: SeededRng,
): DistributionPlan {
  const latinLayers = distributionLayers(level, rng);
  const defaults = createDefaultMatrixCell(rng.pick(MATRIX_SYMBOLS));
  const assignments = latinLayers.map((layer) => ({
    layer,
    values: pickAxisValues(layer, rng),
    rowOffsets: rng.shuffle([0, 1, 2]),
    colOffsets: rng.shuffle([0, 1, 2]),
  }));
  const cells: MatrixCellSpec[] = [];
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

const FALLBACK_MUTATION_LAYERS: readonly MatrixLayerKind[] = [
  MatrixLayerKind.COUNT,
  MatrixLayerKind.CONTAINER,
  MatrixLayerKind.SYMBOL,
  MatrixLayerKind.DECOR,
];

const MUTATION_CYCLES: Record<string, readonly MatrixLayerValue[]> = {
  [MatrixLayerKind.COUNT]: MATRIX_COUNT_SCALE,
  [MatrixLayerKind.CONTAINER]: [
    MatrixContainer.NONE,
    ...MATRIX_VISIBLE_CONTAINERS,
  ],
  [MatrixLayerKind.SYMBOL]: MATRIX_SYMBOLS,
  [MatrixLayerKind.DECOR]: [
    MatrixDecor.NONE,
    MatrixDecor.STRIPES,
    MatrixDecor.CORNER_DOTS,
    MatrixDecor.DIAMOND_DOTS,
  ],
};

function cycleLayer(cell: MatrixCellSpec, layer: MatrixLayerKind): MatrixCellSpec {
  const cycle = MUTATION_CYCLES[layer];
  const index = cycle.indexOf(getMatrixLayerValue(cell, layer));
  return withMatrixLayerValue(cell, layer, cycle[(index + 1) % cycle.length]);
}

class ProposalCollector {
  private readonly cells: MatrixCellSpec[];
  readonly proposals: MatrixProposal[] = [];

  constructor(answer: MatrixCellSpec) {
    this.cells = [answer];
  }

  private acceptable(candidate: MatrixCellSpec): boolean {
    return this.cells.every(
      (existing) =>
        !matrixCellsEqual(existing, candidate) &&
        matrixPerceptualDistance(existing, candidate) >=
          MATRIX_MIN_PERCEPTUAL_DISTANCE,
    );
  }

  tryAdd(candidates: readonly MatrixCellSpec[], kind: MatrixProposalKind): boolean {
    const expanded: MatrixCellSpec[] = [];
    for (const candidate of candidates) {
      expanded.push(candidate);
      for (const layer of FALLBACK_MUTATION_LAYERS) {
        expanded.push(cycleLayer(candidate, layer));
        expanded.push(cycleLayer(cycleLayer(candidate, layer), layer));
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
  cells: readonly MatrixCellSpec[],
  layer: MatrixLayerKind,
  correct: MatrixLayerValue,
  rng: SeededRng,
): MatrixLayerValue[] {
  const seen = [...new Set(cells.map((cell) => getMatrixLayerValue(cell, layer)))];
  return rng.shuffle(seen.filter((value) => value !== correct));
}

function inactiveSalientLayer(
  activeLayers: readonly MatrixLayerKind[],
): { layer: MatrixLayerKind; value: MatrixLayerValue } {
  return activeLayers.includes(MatrixLayerKind.CONTAINER)
    ? { layer: MatrixLayerKind.DECOR, value: MatrixDecor.STRIPES }
    : { layer: MatrixLayerKind.CONTAINER, value: MatrixContainer.CIRCLE };
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
  answer: MatrixCellSpec,
  layer: MatrixLayerKind,
): MatrixCellSpec[] {
  const scale = matrixLayerScale(layer);
  if (!scale) {
    return [];
  }
  const index = scale.indexOf(getMatrixLayerValue(answer, layer));
  return [index + 1, index - 1, index + 2, index - 2]
    .filter((candidate) => candidate >= 0 && candidate < scale.length)
    .map((candidate) => withMatrixLayerValue(answer, layer, scale[candidate]));
}

function buildProposals(
  cells: readonly MatrixCellSpec[],
  ruleSpec: MatrixRuleSpec,
  activeLayers: readonly MatrixLayerKind[],
  rng: SeededRng,
): MatrixProposal[] | null {
  const answer = cells[8];
  const collector = new ProposalCollector(answer);
  collector.proposals.push({ cell: answer, kind: MatrixProposalKind.CORRECT });

  const layerA = activeLayers[0];
  const layerB = activeLayers.length > 1 ? activeLayers[1] : null;
  const wrongAxisValue =
    ruleSpec.structure === MatrixStructure.DISTRIBUTION
      ? getMatrixLayerValue(cells[2], layerA)
      : null;

  const wrongAValues = wrongValuesOnLayer(
    cells.slice(0, 8),
    layerA,
    getMatrixLayerValue(answer, layerA),
    rng,
  ).sort((a, b) =>
    Number(a === wrongAxisValue) - Number(b === wrongAxisValue),
  );
  const wrongA = wrongAValues.map((value) =>
    withMatrixLayerValue(answer, layerA, value),
  );
  if (!collector.tryAdd(wrongA, MatrixProposalKind.WRONG_LAYER_A)) {
    return null;
  }

  let wrongB: MatrixCellSpec[];
  if (layerB) {
    wrongB = wrongValuesOnLayer(
      cells.slice(0, 8),
      layerB,
      getMatrixLayerValue(answer, layerB),
      rng,
    ).map((value) => withMatrixLayerValue(answer, layerB, value));
  } else {
    const fallback = inactiveSalientLayer(activeLayers);
    wrongB = [withMatrixLayerValue(answer, fallback.layer, fallback.value)];
  }
  if (!collector.tryAdd(wrongB, MatrixProposalKind.WRONG_LAYER_B)) {
    return null;
  }

  const wrongAxis =
    ruleSpec.structure === MatrixStructure.CROSSED
      ? [cells[4]]
      : [
          withMatrixLayerValue(
            answer,
            layerA,
            getMatrixLayerValue(cells[2], layerA),
          ),
        ];
  if (!collector.tryAdd(wrongAxis, MatrixProposalKind.WRONG_AXIS)) {
    return null;
  }

  const wrongStep = stepCandidates(
    answer,
    stepLayerFor(ruleSpec, activeLayers),
  );
  if (
    !collector.tryAdd(
      wrongStep.length > 0
        ? wrongStep
        : stepCandidates(answer, MatrixLayerKind.COUNT),
      MatrixProposalKind.WRONG_STEP,
    )
  ) {
    return null;
  }

  const duplicateSources = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
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
        matrixPerceptualDistance(a, b) < MATRIX_MIN_PERCEPTUAL_DISTANCE
      ) {
        return false;
      }
    }
  }
  return true;
}

export function generateMatrixItem(
  options: GenerateMatrixItemOptions,
): MatrixItem {
  const { structure, level, seed } = options;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = createSeededRng(
      `${seed}::matrix::${structure}::${level}::${attempt}`,
    );
    const plan =
      structure === MatrixStructure.CROSSED
        ? buildCrossedPlan(level, rng)
        : buildDistributionPlan(level, rng);
    const activeLayers =
      plan.ruleSpec.structure === MatrixStructure.CROSSED
        ? [
            plan.ruleSpec.rowLayer,
            plan.ruleSpec.colLayer,
            ...(plan.ruleSpec.progressionLayer
              ? [plan.ruleSpec.progressionLayer]
              : []),
          ]
        : [...plan.ruleSpec.latinLayers];
    const proposals = buildProposals(
      plan.cells,
      plan.ruleSpec,
      activeLayers,
      rng,
    );
    if (!proposals) {
      continue;
    }
    const item: MatrixItem = {
      structure,
      level,
      seed,
      cells: plan.cells,
      proposals,
      rule: buildMatrixRule(plan.ruleSpec),
      ruleSpec: plan.ruleSpec,
      activeLayers,
    };
    if (validateItem(item)) {
      return item;
    }
  }
  throw new Error(
    `Matrix item generation exhausted retries for ${structure} level ${level} seed ${seed}`,
  );
}

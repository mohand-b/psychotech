import { LogicItemAnswerDto } from '../../dtos/session';
import { LogicFamily, LogicFamilyFilter, RecommendationPriority } from '../../enums';
import { AxisFinding, sortFindingsBySeverity } from '../axis-findings';
import { formatFindingSeconds } from '../finding-format';
import { MatrixStructure } from '../matrix';
import {
  DominoLogicItem,
  LogicItem,
  LogicNumericStructure,
  MatrixLogicItem,
  TriangleLogicItem,
} from './logic-item';
import { LogicRuleItem } from './logic-rule-item';
import { logicRuleHintIfKnown } from './logic-rule-hints';
import { LogicSessionScore } from './logic-scoring';
import {
  logicAnswerCorrect,
  logicAnswerGiven,
} from './logic-session-scoring';

export const LOGIC_FAMILY_MIN_ERRORS = 2;
export const LOGIC_FAMILY_CONCENTRATION_RATIO = 0.5;
export const LOGIC_IMPULSIVE_TIME_RATIO = 0.5;
export const LOGIC_IMPULSIVE_MIN_COUNT = 2;
export const LOGIC_SLOW_PRECISION_MIN = 85;
export const LOGIC_END_QUARTER_RATIO = 0.75;
export const LOGIC_END_CONCENTRATION_RATIO = 0.5;
export const LOGIC_END_MIN_MISSES = 3;
export const LOGIC_SKIPPED_MIN = 2;
export const LOGIC_FAMILY_GAP_MIN_PCT = 25;
export const LOGIC_FAMILY_MIN_TOTAL = 3;
export const LOGIC_TIME_SINK_RATIO = 1.6;
export const LOGIC_TIME_SINK_MIN_ANSWERED = 2;
export const LOGIC_WRAP_MIN_WRONG = 2;
export const LOGIC_WRAP_WRONG_RATE_MIN = 0.5;
export const LOGIC_WRAP_BASELINE_WRONG_RATE_MAX = 0.25;
export const LOGIC_STRUCTURE_MIN_WRONG = 2;
export const LOGIC_STRUCTURE_WRONG_RATE_MIN = 0.5;
export const LOGIC_STRUCTURE_BASELINE_CORRECT_RATE_MIN = 0.75;
export const LOGIC_TRIANGLE_INVERSED_LEVEL = 4;
export const LOGIC_TRIANGLE_WRONG_RATE_MIN = 0.5;
export const LOGIC_TRIANGLE_DIRECT_CORRECT_RATE_MIN = 0.75;
export const LOGIC_TRIANGLE_DIRECT_MIN_ATTEMPTED = 2;

const LOGIC_FAMILY_PROSE_LABELS: Record<LogicFamily, string> = {
  [LogicFamily.NUMERIC]: 'la famille numérique',
  [LogicFamily.DOMINO]: 'les dominos',
  [LogicFamily.MATRIX_I]: 'les matrices (lecture)',
  [LogicFamily.MATRIX_II]: 'les matrices (déduction)',
};

const LOGIC_FAMILY_FILTER_ACTIONS: Record<LogicFamily, string> = {
  [LogicFamily.NUMERIC]:
    'Entraînez la famille numérique en session filtrée Familles.',
  [LogicFamily.DOMINO]: 'Entraînez les dominos en session filtrée Familles.',
  [LogicFamily.MATRIX_I]:
    'Entraînez les matrices en session filtrée Familles.',
  [LogicFamily.MATRIX_II]:
    'Entraînez les matrices en session filtrée Familles.',
};

const MATRIX_STRUCTURE_PROSE_LABELS: Record<MatrixStructure, string> = {
  [MatrixStructure.CROSSED]: 'règles croisées',
  [MatrixStructure.DISTRIBUTION]: 'distribution',
  [MatrixStructure.COMPOSITION]: 'composition',
};

interface LogicFamilyTally {
  family: LogicFamily;
  total: number;
  attempted: number;
  correct: number;
  answerTimeMs: number;
}

interface LogicContentOutcome {
  item: LogicItem;
  answered: boolean;
  correct: boolean;
  timeMs: number | null;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function contentOutcomes(
  content: LogicItem[],
  responses: LogicItemAnswerDto[],
): LogicContentOutcome[] {
  const responseByIndex = new Map(
    responses.map((response) => [response.index, response]),
  );
  return content.map((item) => {
    const response = responseByIndex.get(item.index);
    const answered =
      response !== undefined && logicAnswerGiven(item, response);
    return {
      item,
      answered,
      correct:
        answered && response !== undefined
          ? logicAnswerCorrect(item, response)
          : false,
      timeMs: answered && response !== undefined ? response.timeMs : null,
    };
  });
}

function familyTallies(outcomes: LogicContentOutcome[]): LogicFamilyTally[] {
  const byFamily = new Map<LogicFamily, LogicFamilyTally>();
  for (const outcome of outcomes) {
    const tally = byFamily.get(outcome.item.family) ?? {
      family: outcome.item.family,
      total: 0,
      attempted: 0,
      correct: 0,
      answerTimeMs: 0,
    };
    tally.total += 1;
    if (outcome.answered) {
      tally.attempted += 1;
      tally.answerTimeMs += outcome.timeMs ?? 0;
      if (outcome.correct) {
        tally.correct += 1;
      }
    }
    byFamily.set(outcome.item.family, tally);
  }
  return [...byFamily.values()];
}

function othersOf(
  tallies: LogicFamilyTally[],
  family: LogicFamily,
): LogicFamilyTally {
  return tallies
    .filter((tally) => tally.family !== family)
    .reduce(
      (sum, tally) => ({
        family,
        total: sum.total + tally.total,
        attempted: sum.attempted + tally.attempted,
        correct: sum.correct + tally.correct,
        answerTimeMs: sum.answerTimeMs + tally.answerTimeMs,
      }),
      { family, total: 0, attempted: 0, correct: 0, answerTimeMs: 0 },
    );
}

function familyRelativeFailure(
  outcomes: LogicContentOutcome[],
  familyFilter: LogicFamilyFilter | null,
): AxisFinding | null {
  if (familyFilter !== null) {
    return null;
  }
  const tallies = familyTallies(outcomes);
  if (tallies.length < 2) {
    return null;
  }
  let worst: { tally: LogicFamilyTally; others: LogicFamilyTally; gap: number } | null =
    null;
  for (const tally of tallies) {
    const others = othersOf(tallies, tally.family);
    if (
      tally.total < LOGIC_FAMILY_MIN_TOTAL ||
      others.total < LOGIC_FAMILY_MIN_TOTAL
    ) {
      continue;
    }
    const rate = (tally.correct / tally.total) * 100;
    const othersRate = (others.correct / others.total) * 100;
    const gap = othersRate - rate;
    if (gap >= LOGIC_FAMILY_GAP_MIN_PCT && (!worst || gap > worst.gap)) {
      worst = { tally, others, gap };
    }
  }
  if (!worst) {
    return null;
  }
  const prose = LOGIC_FAMILY_PROSE_LABELS[worst.tally.family];
  return {
    id: 'LOGIC_FAMILY_RELATIVE_FAILURE',
    severity: RecommendationPriority.HIGH,
    deviation: worst.gap / 100,
    finding: `${worst.tally.correct}/${worst.tally.total} sur ${prose} contre ${worst.others.correct}/${worst.others.total} sur le reste de la session`,
    evidence: `${worst.tally.correct}/${worst.tally.total} sur ${prose}`,
    recommendation: LOGIC_FAMILY_FILTER_ACTIONS[worst.tally.family],
    priorityLabel: `${capitalize(prose)} en Logique`,
  };
}

function familyTimeSink(
  outcomes: LogicContentOutcome[],
  familyFilter: LogicFamilyFilter | null,
): AxisFinding | null {
  if (familyFilter !== null) {
    return null;
  }
  const tallies = familyTallies(outcomes);
  if (tallies.length < 2) {
    return null;
  }
  for (const tally of tallies) {
    const others = othersOf(tallies, tally.family);
    if (
      tally.attempted < LOGIC_TIME_SINK_MIN_ANSWERED ||
      others.attempted < LOGIC_TIME_SINK_MIN_ANSWERED
    ) {
      continue;
    }
    const avg = tally.answerTimeMs / tally.attempted;
    const othersAvg = others.answerTimeMs / others.attempted;
    const rate = tally.correct / tally.attempted;
    const othersRate = others.correct / others.attempted;
    if (avg >= othersAvg * LOGIC_TIME_SINK_RATIO && rate <= othersRate) {
      const prose = LOGIC_FAMILY_PROSE_LABELS[tally.family];
      return {
        id: 'LOGIC_FAMILY_TIME_SINK',
        severity: RecommendationPriority.MEDIUM,
        deviation: avg / othersAvg - 1,
        finding: `${formatFindingSeconds(avg)} par item sur ${prose} contre ${formatFindingSeconds(othersAvg)} ailleurs, sans gain de justesse (${tally.correct}/${tally.attempted} contre ${others.correct}/${others.attempted})`,
        recommendation: `Fixez un temps plafond sur ${prose} : au-delà, passez l'item et revenez-y en fin de série.`,
      };
    }
  }
  return null;
}

interface OutcomeOf<Item extends LogicItem> extends LogicContentOutcome {
  item: Item;
}

function dominoWrapMisses(outcomes: LogicContentOutcome[]): AxisFinding | null {
  const dominoes = outcomes.filter(
    (outcome): outcome is OutcomeOf<DominoLogicItem> =>
      outcome.item.family === LogicFamily.DOMINO,
  );
  const wrap = dominoes.filter((outcome) => outcome.item.domino.hasWrap);
  const straight = dominoes.filter((outcome) => !outcome.item.domino.hasWrap);
  const wrapAttempted = wrap.filter((outcome) => outcome.answered);
  const straightAttempted = straight.filter((outcome) => outcome.answered);
  const wrapWrong = wrapAttempted.filter((outcome) => !outcome.correct).length;
  const straightWrong = straightAttempted.filter(
    (outcome) => !outcome.correct,
  ).length;
  if (
    wrapWrong < LOGIC_WRAP_MIN_WRONG ||
    straightAttempted.length === 0 ||
    wrapWrong < wrapAttempted.length * LOGIC_WRAP_WRONG_RATE_MIN ||
    straightWrong >
      straightAttempted.length * LOGIC_WRAP_BASELINE_WRONG_RATE_MAX
  ) {
    return null;
  }
  const wrapRate = wrapWrong / wrapAttempted.length;
  const straightRate = straightWrong / straightAttempted.length;
  return {
    id: 'LOGIC_DOMINO_WRAP_MISSES',
    severity: RecommendationPriority.HIGH,
    deviation: wrapRate - straightRate,
    finding: `${wrapWrong}/${wrapAttempted.length} dominos à bouclage ratés contre ${straightWrong}/${straightAttempted.length} d'erreur sur les suites sans bouclage`,
    evidence: `${wrapWrong}/${wrapAttempted.length} dominos à bouclage ratés`,
    recommendation:
      'Retravaillez le bouclage des dominos en session filtrée Familles : après 6 la face repart à 0, et avant 0 elle revient à 6.',
  };
}

function matrixStructureFailure(
  outcomes: LogicContentOutcome[],
): AxisFinding | null {
  const matrices = outcomes.filter(
    (outcome): outcome is OutcomeOf<MatrixLogicItem> =>
      outcome.item.family === LogicFamily.MATRIX_I ||
      outcome.item.family === LogicFamily.MATRIX_II,
  );
  const byStructure = new Map<MatrixStructure, OutcomeOf<MatrixLogicItem>[]>();
  for (const outcome of matrices) {
    const structure = outcome.item.matrix.structure;
    byStructure.set(structure, [...(byStructure.get(structure) ?? []), outcome]);
  }
  if (byStructure.size < 2) {
    return null;
  }
  for (const [structure, group] of byStructure) {
    const attempted = group.filter((outcome) => outcome.answered);
    const wrong = attempted.filter((outcome) => !outcome.correct).length;
    const othersAttempted = matrices.filter(
      (outcome) =>
        outcome.answered && outcome.item.matrix.structure !== structure,
    );
    const othersCorrect = othersAttempted.filter(
      (outcome) => outcome.correct,
    ).length;
    if (
      wrong < LOGIC_STRUCTURE_MIN_WRONG ||
      attempted.length === 0 ||
      othersAttempted.length === 0 ||
      wrong < attempted.length * LOGIC_STRUCTURE_WRONG_RATE_MIN ||
      othersCorrect <
        othersAttempted.length * LOGIC_STRUCTURE_BASELINE_CORRECT_RATE_MIN
    ) {
      continue;
    }
    const label = MATRIX_STRUCTURE_PROSE_LABELS[structure];
    return {
      id: 'LOGIC_MATRIX_STRUCTURE_FAILURE',
      severity: RecommendationPriority.MEDIUM,
      deviation:
        wrong / attempted.length - 1 + othersCorrect / othersAttempted.length,
      finding: `${wrong}/${attempted.length} ratés sur les matrices à ${label} alors que ${othersCorrect}/${othersAttempted.length} des autres structures sont réussies`,
      evidence: `${wrong}/${attempted.length} sur les matrices à ${label}`,
      recommendation: `Entraînez les matrices en session filtrée Familles en vous concentrant sur les grilles à ${label}.`,
    };
  }
  return null;
}

function triangleInversedMisses(
  outcomes: LogicContentOutcome[],
): AxisFinding | null {
  const triangles = outcomes.filter(
    (outcome): outcome is OutcomeOf<TriangleLogicItem> =>
      outcome.item.family === LogicFamily.NUMERIC &&
      outcome.item.structure === LogicNumericStructure.TRIANGLE,
  );
  const inversed = triangles.filter(
    (outcome) =>
      outcome.item.triangle.level === LOGIC_TRIANGLE_INVERSED_LEVEL,
  );
  const direct = triangles.filter(
    (outcome) =>
      outcome.item.triangle.level !== LOGIC_TRIANGLE_INVERSED_LEVEL,
  );
  const inversedAttempted = inversed.filter((outcome) => outcome.answered);
  const directAttempted = direct.filter((outcome) => outcome.answered);
  const inversedWrong = inversedAttempted.filter(
    (outcome) => !outcome.correct,
  ).length;
  const directCorrect = directAttempted.filter(
    (outcome) => outcome.correct,
  ).length;
  if (
    inversedAttempted.length === 0 ||
    inversedWrong <
      inversedAttempted.length * LOGIC_TRIANGLE_WRONG_RATE_MIN ||
    directAttempted.length < LOGIC_TRIANGLE_DIRECT_MIN_ATTEMPTED ||
    directCorrect <
      directAttempted.length * LOGIC_TRIANGLE_DIRECT_CORRECT_RATE_MIN
  ) {
    return null;
  }
  return {
    id: 'LOGIC_TRIANGLE_INVERSED_MISSES',
    severity: RecommendationPriority.MEDIUM,
    deviation:
      inversedWrong / inversedAttempted.length -
      (1 - directCorrect / directAttempted.length),
    finding: `${inversedWrong}/${inversedAttempted.length} triangles inversés (N4) ratés alors que vous réussissez ${directCorrect}/${directAttempted.length} triangles directs`,
    evidence: `${inversedWrong}/${inversedAttempted.length} triangles inversés ratés`,
    recommendation:
      'Sur un triangle inversé, repérez le sens de lecture des sommets avant d’appliquer la règle.',
  };
}

function ruleFamilyErrors(
  items: LogicRuleItem[],
  scored: LogicSessionScore,
): AxisFinding | null {
  if (scored.wrongCount < LOGIC_FAMILY_MIN_ERRORS) {
    return null;
  }
  const wrongByRule = new Map<string, LogicRuleItem[]>();
  scored.statuses.forEach((status, position) => {
    const item = items[position];
    if (status !== 'WRONG' || !item) {
      return;
    }
    wrongByRule.set(item.ruleId, [...(wrongByRule.get(item.ruleId) ?? []), item]);
  });
  const dominant = [...wrongByRule.values()].sort(
    (a, b) => b.length - a.length,
  )[0];
  if (
    !dominant ||
    dominant.length < LOGIC_FAMILY_MIN_ERRORS ||
    dominant.length < scored.wrongCount * LOGIC_FAMILY_CONCENTRATION_RATIO
  ) {
    return null;
  }
  const hint = logicRuleHintIfKnown(dominant[0]);
  return {
    id: 'LOGIC_RULE_FAMILY_ERRORS',
    severity: RecommendationPriority.HIGH,
    deviation: dominant.length / scored.wrongCount,
    finding: hint
      ? `${dominant.length} de vos ${scored.wrongCount} erreurs portent sur la même famille de règles (« ${hint.replace(/\.$/, '')} »)`
      : `${dominant.length} de vos ${scored.wrongCount} erreurs portent sur le même type d'exercice`,
    recommendation:
      'Revoyez cette famille en particulier : identifiez son mécanisme avant de valider votre réponse.',
  };
}

function impulsivity(
  scored: LogicSessionScore,
  responses: LogicItemAnswerDto[],
): AxisFinding | null {
  if (scored.avgAnswerTimeMs === null) {
    return null;
  }
  const wrongIndexes = new Set(
    scored.statuses
      .map((status, position) => ({ status, position }))
      .filter(({ status }) => status === 'WRONG')
      .map(({ position }) => position),
  );
  const threshold = scored.avgAnswerTimeMs * LOGIC_IMPULSIVE_TIME_RATIO;
  const rushed = responses.filter(
    (response) =>
      wrongIndexes.has(response.index) &&
      response.answerIndex !== null &&
      response.timeMs < threshold,
  ).length;
  if (rushed < LOGIC_IMPULSIVE_MIN_COUNT) {
    return null;
  }
  return {
    id: 'LOGIC_IMPULSIVITY',
    severity: RecommendationPriority.MEDIUM,
    deviation: rushed / Math.max(1, scored.wrongCount),
    evidence: `${rushed} items ratés sous la moitié du temps moyen`,
    finding: `${rushed} items ratés en moins de la moitié de votre temps moyen de réponse (${formatFindingSeconds(scored.avgAnswerTimeMs)})`,
    recommendation:
      'Ces points étaient à votre portée : prenez quelques secondes de plus pour vérifier la règle avant de valider.',
  };
}

function slowButAccurate(scored: LogicSessionScore): AxisFinding | null {
  if (
    scored.precision < LOGIC_SLOW_PRECISION_MIN ||
    scored.unreachedCount === 0
  ) {
    return null;
  }
  return {
    id: 'LOGIC_SLOW_ACCURATE',
    severity: RecommendationPriority.HIGH,
    finding: `${Math.round(scored.precision)} % de précision mais ${scored.unreachedCount} items jamais atteints : le rythme limite votre score`,
    recommendation:
      'Votre précision est acquise : accélérez sur les suites simples pour finir la série.',
  };
}

function skippedNeverRevisited(scored: LogicSessionScore): AxisFinding | null {
  if (scored.skippedCount < LOGIC_SKIPPED_MIN) {
    return null;
  }
  return {
    id: 'LOGIC_SKIPPED_NOT_REVISITED',
    severity: RecommendationPriority.MEDIUM,
    finding: `${scored.skippedCount} item${scored.skippedCount > 1 ? 's' : ''} passé${scored.skippedCount > 1 ? 's' : ''} puis jamais retenté${scored.skippedCount > 1 ? 's' : ''}`,
    recommendation:
      'Revenez systématiquement sur les items passés tant que le chrono tourne : un passé vaut zéro point.',
  };
}

function endCollapse(scored: LogicSessionScore): AxisFinding | null {
  const total = scored.statuses.length;
  if (total === 0) {
    return null;
  }
  const isMiss = (status: LogicSessionScore['statuses'][number]) =>
    status === 'WRONG' || status === 'SKIPPED' || status === 'UNREACHED';
  const missCount = scored.statuses.filter(isMiss).length;
  const lastQuarterStart = Math.floor(total * LOGIC_END_QUARTER_RATIO);
  const lateMisses = scored.statuses.filter(
    (status, position) => position >= lastQuarterStart && isMiss(status),
  ).length;
  if (
    lateMisses < LOGIC_END_MIN_MISSES ||
    lateMisses < missCount * LOGIC_END_CONCENTRATION_RATIO
  ) {
    return null;
  }
  return {
    id: 'LOGIC_END_COLLAPSE',
    severity: RecommendationPriority.MEDIUM,
    deviation: lateMisses / missCount,
    evidence: `${lateMisses}/${missCount} erreurs sur le dernier quart`,
    finding: `${lateMisses} de vos ${missCount} erreurs ou items non traités se concentrent sur le dernier quart de l'épreuve`,
    recommendation:
      'Gardez de la lucidité pour la fin : installez un rythme soutenable dès les premiers items.',
  };
}

export function analyzeLogic(
  items: LogicRuleItem[],
  scored: LogicSessionScore,
  responses: LogicItemAnswerDto[],
  content: LogicItem[] | null = null,
  familyFilter: LogicFamilyFilter | null = null,
): AxisFinding[] {
  const outcomes = content ? contentOutcomes(content, responses) : [];
  return sortFindingsBySeverity(
    [
      ruleFamilyErrors(items, scored),
      impulsivity(scored, responses),
      slowButAccurate(scored),
      skippedNeverRevisited(scored),
      endCollapse(scored),
      familyRelativeFailure(outcomes, familyFilter),
      familyTimeSink(outcomes, familyFilter),
      dominoWrapMisses(outcomes),
      matrixStructureFailure(outcomes),
      triangleInversedMisses(outcomes),
    ].filter((finding): finding is AxisFinding => finding !== null),
  );
}

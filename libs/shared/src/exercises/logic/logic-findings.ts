import { LogicItemAnswerDto } from '../../dtos/session';
import { RecommendationPriority } from '../../enums';
import { AxisFinding, sortFindingsBySeverity } from '../axis-findings';
import { formatFindingSeconds } from '../finding-format';
import { LogicRuleItem } from './logic-rule-item';
import { resolveLogicRuleHint } from './logic-rule-hints';
import { LogicSessionScore } from './logic-scoring';

export const LOGIC_FAMILY_MIN_ERRORS = 2;
export const LOGIC_FAMILY_CONCENTRATION_RATIO = 0.5;
export const LOGIC_IMPULSIVE_TIME_RATIO = 0.5;
export const LOGIC_IMPULSIVE_MIN_COUNT = 2;
export const LOGIC_SLOW_PRECISION_MIN = 85;
export const LOGIC_END_QUARTER_RATIO = 0.75;
export const LOGIC_END_CONCENTRATION_RATIO = 0.5;
export const LOGIC_END_MIN_MISSES = 3;
export const LOGIC_SKIPPED_MIN = 2;

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
  const hint = resolveLogicRuleHint(dominant[0]);
  return {
    id: 'LOGIC_RULE_FAMILY_ERRORS',
    severity: RecommendationPriority.HIGH,
    finding: `${dominant.length} de vos ${scored.wrongCount} erreurs portent sur la même famille de règles (« ${hint.replace(/\.$/, '')} »)`,
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
    finding: `${lateMisses} de vos ${missCount} erreurs ou items non traités se concentrent sur le dernier quart de l'épreuve`,
    recommendation:
      'Gardez de la lucidité pour la fin : installez un rythme soutenable dès les premiers items.',
  };
}

export function analyzeLogic(
  items: LogicRuleItem[],
  scored: LogicSessionScore,
  responses: LogicItemAnswerDto[],
): AxisFinding[] {
  return sortFindingsBySeverity(
    [
      ruleFamilyErrors(items, scored),
      impulsivity(scored, responses),
      slowButAccurate(scored),
      skippedNeverRevisited(scored),
      endCollapse(scored),
    ].filter((finding): finding is AxisFinding => finding !== null),
  );
}

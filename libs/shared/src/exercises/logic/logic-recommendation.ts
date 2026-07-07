import { LogicItemAnswerDto } from '../../dtos/session';
import { RecommendationPriority } from '../../enums';
import { LogicSessionScore } from './logic-scoring';

export interface LogicRecommendation {
  id: string;
  label: string;
  priority: RecommendationPriority;
}

const LATE_THIRD_START_RATIO = 2 / 3;
const LATE_ERROR_CONCENTRATION_RATIO = 0.5;
const LATE_SLOWDOWN_FACTOR = 1.2;
const ACCURACY_WRONG_RATIO = 0.15;

function averageAnswerTime(
  responses: LogicItemAnswerDto[],
  indexes: Set<number>,
): number | null {
  const times = responses
    .filter(
      (response) =>
        indexes.has(response.index) && response.answerIndex !== null,
    )
    .map((response) => response.timeMs);
  return times.length === 0
    ? null
    : times.reduce((sum, timeMs) => sum + timeMs, 0) / times.length;
}

function hasLateSlowdown(
  scored: LogicSessionScore,
  responses: LogicItemAnswerDto[],
): boolean {
  if (scored.wrongCount === 0) {
    return false;
  }
  const total = scored.statuses.length;
  const lateStart = Math.floor(total * LATE_THIRD_START_RATIO);
  const lateWrongCount = scored.statuses.filter(
    (status, index) => index >= lateStart && status === 'WRONG',
  ).length;
  if (lateWrongCount < scored.wrongCount * LATE_ERROR_CONCENTRATION_RATIO) {
    return false;
  }
  const earlyIndexes = new Set(
    Array.from({ length: lateStart }, (_, index) => index),
  );
  const lateIndexes = new Set(
    Array.from({ length: total - lateStart }, (_, index) => lateStart + index),
  );
  const earlyAvg = averageAnswerTime(responses, earlyIndexes);
  const lateAvg = averageAnswerTime(responses, lateIndexes);
  return (
    earlyAvg !== null &&
    lateAvg !== null &&
    lateAvg > earlyAvg * LATE_SLOWDOWN_FACTOR
  );
}

export function getLogicRecommendation(
  scored: LogicSessionScore,
  responses: LogicItemAnswerDto[],
): LogicRecommendation {
  if (scored.unreachedCount > 0) {
    const count = scored.unreachedCount;
    return {
      id: 'LOGIC_PACE_UNREACHED',
      label:
        count > 1
          ? `${count} items non atteints — surveillez votre rythme`
          : '1 item non atteint — surveillez votre rythme',
      priority: RecommendationPriority.HIGH,
    };
  }
  if (hasLateSlowdown(scored, responses)) {
    return {
      id: 'LOGIC_LATE_SLOWDOWN',
      label:
        "Le temps par item s'allonge en fin de session — gardez un rythme régulier du premier au dernier item",
      priority: RecommendationPriority.MEDIUM,
    };
  }
  if (scored.wrongCount > scored.statuses.length * ACCURACY_WRONG_RATIO) {
    return {
      id: 'LOGIC_ACCURACY',
      label:
        'Plusieurs erreurs sur la session — vérifiez la règle de la suite avant de valider votre réponse',
      priority: RecommendationPriority.MEDIUM,
    };
  }
  return {
    id: 'LOGIC_KEEP_GOING',
    label: 'Session solide — continuez sur ce rythme pour ancrer vos automatismes',
    priority: RecommendationPriority.LOW,
  };
}

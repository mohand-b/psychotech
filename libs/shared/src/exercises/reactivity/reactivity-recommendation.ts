import { AXIS_TRAINING } from '../../domain';
import { AxisType, RecommendationPriority } from '../../enums';
import { TrainingRecommendation } from '../recommendation';
import { ReactivitySessionScore } from './reactivity-scoring';

const LATE_WRONG_CONCENTRATION_RATIO = 0.5;
const TREND_RISE_RATIO = 1.15;
const RELATIVE_SD_THRESHOLD = 0.3;

function wrongConcentratedInThirdPhase(
  scored: ReactivitySessionScore,
): boolean {
  if (scored.wrongCommandCount === 0) {
    return false;
  }
  const phaseMs = AXIS_TRAINING[AxisType.REACTIVITY].phaseDurationSec * 1000;
  const lateWrong = scored.points.filter(
    ({ classification, appearAtMs }) =>
      classification === 'WRONG_COMMAND' && appearAtMs >= 2 * phaseMs,
  ).length;
  return lateWrong >= scored.wrongCommandCount * LATE_WRONG_CONCENTRATION_RATIO;
}

function trendRises(scored: ReactivitySessionScore): boolean {
  const trend = scored.trend;
  if (trend.length < 6) {
    return false;
  }
  const half = Math.floor(trend.length / 2);
  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const early = average(trend.slice(0, half).map(({ trMs }) => trMs));
  const late = average(trend.slice(half).map(({ trMs }) => trMs));
  return late > early * TREND_RISE_RATIO;
}

export function getReactivityRecommendation(
  scored: ReactivitySessionScore,
): TrainingRecommendation {
  if (wrongConcentratedInThirdPhase(scored)) {
    return {
      id: 'REACTIVITY_RED_COMMAND',
      label:
        "Les mauvaises commandes se concentrent après l'arrivée du signal rouge - consolidez la commande Espace",
      priority: RecommendationPriority.HIGH,
    };
  }
  if (trendRises(scored)) {
    return {
      id: 'REACTIVITY_ENDURANCE',
      label:
        "Votre temps de réaction s'allonge au fil de l'épreuve - travaillez la tenue dans la durée",
      priority: RecommendationPriority.MEDIUM,
    };
  }
  if (scored.anticipationCount > 0) {
    const count = scored.anticipationCount;
    return {
      id: 'REACTIVITY_ANTICIPATION',
      label:
        count > 1
          ? `${count} appuis trop tôt - attendez l'apparition du signal avant de réagir`
          : `1 appui trop tôt - attendez l'apparition du signal avant de réagir`,
      priority: RecommendationPriority.MEDIUM,
    };
  }
  if (
    scored.trMoyMs !== null &&
    scored.sdMs !== null &&
    scored.sdMs > scored.trMoyMs * RELATIVE_SD_THRESHOLD
  ) {
    return {
      id: 'REACTIVITY_STABILITY',
      label:
        'Vos réactions manquent de régularité - cherchez une cadence stable du premier au dernier signal',
      priority: RecommendationPriority.MEDIUM,
    };
  }
  return {
    id: 'REACTIVITY_KEEP_GOING',
    label:
      'Réactivité solide - continuez sur ce rythme pour ancrer vos automatismes',
    priority: RecommendationPriority.LOW,
  };
}

import { RecommendationPriority } from '../../enums';
import { TrainingRecommendation } from '../recommendation';
import { DiscriminationSessionScore } from './discrimination-scoring';

const UNANSWERED_RATIO_THRESHOLD = 0.1;
const RUSH_TIME_RATIO = 0.7;
const RUSH_MIN_WRONG_COUNT = 2;

export function getDiscriminationRecommendation(
  scored: DiscriminationSessionScore,
): TrainingRecommendation {
  const total = scored.outcomes.length;
  if (
    total > 0 &&
    scored.unansweredCount > total * UNANSWERED_RATIO_THRESHOLD
  ) {
    const count = scored.unansweredCount;
    return {
      id: 'DISCRIMINATION_PACE',
      label:
        count > 1
          ? `${count} essais non atteints - gardez un rythme de décision constant jusqu'au bout`
          : `1 essai non atteint - gardez un rythme de décision constant jusqu'au bout`,
      priority: RecommendationPriority.HIGH,
    };
  }
  if (scored.wrongIdenticalCount > scored.wrongDifferentCount) {
    const count = scored.wrongIdenticalCount;
    return {
      id: 'DISCRIMINATION_MISSED_DIFFERENCES',
      label: `Vous répondez "identiques" trop vite - ${count} ${
        count > 1 ? 'paires différentes vous ont échappé' : 'paire différente vous a échappé'
      } : balayez chaque paire jusqu'au bout`,
      priority: RecommendationPriority.MEDIUM,
    };
  }
  if (scored.wrongDifferentCount > scored.wrongIdenticalCount) {
    return {
      id: 'DISCRIMINATION_FALSE_ALARMS',
      label:
        'Vous répondez "différentes" par excès - confirmez la différence avant de répondre',
      priority: RecommendationPriority.MEDIUM,
    };
  }
  if (
    scored.correctAnswerAvgMs !== null &&
    scored.wrongAnswerAvgMs !== null &&
    scored.wrongIdenticalCount + scored.wrongDifferentCount >=
      RUSH_MIN_WRONG_COUNT &&
    scored.wrongAnswerAvgMs < scored.correctAnswerAvgMs * RUSH_TIME_RATIO
  ) {
    return {
      id: 'DISCRIMINATION_RUSH',
      label:
        'Vos erreurs arrivent quand vous accélérez - stabilisez votre cadence',
      priority: RecommendationPriority.MEDIUM,
    };
  }
  return {
    id: 'DISCRIMINATION_KEEP_GOING',
    label:
      'Discrimination fiable - continuez sur ce rythme pour ancrer vos automatismes',
    priority: RecommendationPriority.LOW,
  };
}

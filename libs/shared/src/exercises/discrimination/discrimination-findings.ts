import { RecommendationPriority } from '../../enums';
import { AxisFinding, sortFindingsBySeverity } from '../axis-findings';
import { formatFindingSeconds } from '../finding-format';
import {
  DiscriminationOutcome,
  DiscriminationSessionScore,
} from './discrimination-scoring';

export const DISCRIMINATION_BIAS_MIN_ERRORS = 2;
export const DISCRIMINATION_BIAS_RATIO = 2;
export const DISCRIMINATION_RUSH_TIME_RATIO = 0.7;
export const DISCRIMINATION_RUSH_MIN_WRONG = 2;
export const DISCRIMINATION_SLOW_UNANSWERED_RATIO = 0.1;
export const DISCRIMINATION_SLOW_MAX_WRONG = 1;
export const DISCRIMINATION_DROP_MIN_LATE_ERRORS = 2;
export const DISCRIMINATION_DROP_RATIO = 2;

function isWrong(outcome: DiscriminationOutcome): boolean {
  return outcome === 'FALSE_POSITIVE' || outcome === 'FALSE_NEGATIVE';
}

function responseBias(scored: DiscriminationSessionScore): AxisFinding | null {
  const missed = scored.wrongIdenticalCount;
  const falseAlarms = scored.wrongDifferentCount;
  const dominant = Math.max(missed, falseAlarms);
  const other = Math.min(missed, falseAlarms);
  if (
    dominant < DISCRIMINATION_BIAS_MIN_ERRORS ||
    dominant < other * DISCRIMINATION_BIAS_RATIO
  ) {
    return null;
  }
  if (missed > falseAlarms) {
    return {
      id: 'DISCRIMINATION_BIAS_IDENTICAL',
      severity: RecommendationPriority.MEDIUM,
      finding: `${missed} paires différentes jugées « identiques », contre ${falseAlarms} fausse${falseAlarms > 1 ? 's' : ''} alerte${falseAlarms > 1 ? 's' : ''} : vous concluez « identiques » trop vite`,
      recommendation:
        'Balayez chaque paire jusqu’au dernier caractère avant de conclure à l’identité.',
    };
  }
  return {
    id: 'DISCRIMINATION_BIAS_DIFFERENT',
    severity: RecommendationPriority.MEDIUM,
    finding: `${falseAlarms} paires identiques jugées « différentes », contre ${missed} différence${missed > 1 ? 's' : ''} manquée${missed > 1 ? 's' : ''} : vous répondez « différentes » trop vite`,
    recommendation:
      'Localisez la différence exacte avant de répondre : sans position précise, la paire est identique.',
  };
}

function speedAccuracyTradeoff(
  scored: DiscriminationSessionScore,
): AxisFinding | null {
  const wrongCount = scored.wrongIdenticalCount + scored.wrongDifferentCount;
  if (
    scored.correctAnswerAvgMs !== null &&
    scored.wrongAnswerAvgMs !== null &&
    wrongCount >= DISCRIMINATION_RUSH_MIN_WRONG &&
    scored.wrongAnswerAvgMs <
      scored.correctAnswerAvgMs * DISCRIMINATION_RUSH_TIME_RATIO
  ) {
    return {
      id: 'DISCRIMINATION_RUSH',
      severity: RecommendationPriority.MEDIUM,
      finding: `Vos erreurs partent en ${formatFindingSeconds(scored.wrongAnswerAvgMs)} contre ${formatFindingSeconds(scored.correctAnswerAvgMs)} pour vos bonnes réponses`,
      recommendation:
        'Stabilisez votre cadence : la demi-seconde gagnée sur une paire coûte la paire entière.',
    };
  }
  const total = scored.outcomes.length;
  if (
    total > 0 &&
    scored.unansweredCount >= total * DISCRIMINATION_SLOW_UNANSWERED_RATIO &&
    wrongCount <= DISCRIMINATION_SLOW_MAX_WRONG
  ) {
    return {
      id: 'DISCRIMINATION_SLOW_ACCURATE',
      severity: RecommendationPriority.HIGH,
      finding: `${scored.unansweredCount} essais jamais atteints alors que vos réponses données sont presque toutes justes (${scored.correctCount} justes pour ${wrongCount} erreur${wrongCount > 1 ? 's' : ''})`,
      recommendation:
        'Votre précision tient : décidez plus tôt, l’épreuve récompense le rythme autant que la justesse.',
    };
  }
  return null;
}

function vigilanceDrop(scored: DiscriminationSessionScore): AxisFinding | null {
  const total = scored.outcomes.length;
  if (total < 6) {
    return null;
  }
  const thirdSize = Math.floor(total / 3);
  const firstThird = scored.outcomes.slice(0, thirdSize);
  const lastThird = scored.outcomes.slice(total - thirdSize);
  const firstErrors = firstThird.filter(isWrong).length;
  const lateErrors = lastThird.filter(isWrong).length;
  if (
    lateErrors < DISCRIMINATION_DROP_MIN_LATE_ERRORS ||
    lateErrors < Math.max(1, firstErrors) * DISCRIMINATION_DROP_RATIO
  ) {
    return null;
  }
  return {
    id: 'DISCRIMINATION_VIGILANCE_DROP',
    severity: RecommendationPriority.MEDIUM,
    finding: `${lateErrors} erreurs sur le dernier tiers des essais contre ${firstErrors} sur le premier : votre vigilance chute sur la durée`,
    recommendation:
      'Traitez chaque paire comme la première : la constance pèse plus que la vitesse de pointe.',
  };
}

export function analyzeDiscrimination(
  scored: DiscriminationSessionScore,
): AxisFinding[] {
  return sortFindingsBySeverity(
    [
      responseBias(scored),
      speedAccuracyTradeoff(scored),
      vigilanceDrop(scored),
    ].filter((finding): finding is AxisFinding => finding !== null),
  );
}

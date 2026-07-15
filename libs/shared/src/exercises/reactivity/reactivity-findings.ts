import { AXIS_TRAINING } from '../../domain/axis-training';
import { AxisType, RecommendationPriority } from '../../enums';
import { AxisFinding, sortFindingsBySeverity } from '../axis-findings';
import {
  ReactivitySessionScore,
  ReactivityStimulusPoint,
} from './reactivity-scoring';

export const REACTIVITY_POST_ERROR_WINDOW = 3;
export const REACTIVITY_POST_ERROR_SLOWDOWN_RATIO = 1.15;
export const REACTIVITY_POST_ERROR_MIN_SAMPLES = 2;
export const REACTIVITY_FATIGUE_RISE_RATIO = 1.15;
export const REACTIVITY_FATIGUE_MIN_TREND_POINTS = 6;
export const REACTIVITY_LATE_WRONG_CONCENTRATION_RATIO = 0.5;
export const REACTIVITY_ANTICIPATIONS_MIN = 2;
export const REACTIVITY_RELATIVE_SD_THRESHOLD = 0.3;
export const REACTIVITY_PHASE_STEP_MS = 60;
export const REACTIVITY_PHASE_STEP_MIN_VALID = 2;

function average(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isError(point: ReactivityStimulusPoint): boolean {
  return point.classification !== 'VALID';
}

function postErrorSlowdown(scored: ReactivitySessionScore): AxisFinding | null {
  const points = scored.points;
  const postErrorPositions = new Set<number>();
  points.forEach((point, position) => {
    if (!isError(point)) {
      return;
    }
    let collected = 0;
    for (
      let next = position + 1;
      next < points.length && collected < REACTIVITY_POST_ERROR_WINDOW;
      next += 1
    ) {
      if (isError(points[next])) {
        break;
      }
      postErrorPositions.add(next);
      collected += 1;
    }
  });
  const postTimes: number[] = [];
  const baseTimes: number[] = [];
  points.forEach((point, position) => {
    if (isError(point) || point.trMs === null) {
      return;
    }
    (postErrorPositions.has(position) ? postTimes : baseTimes).push(point.trMs);
  });
  const postAvg = average(postTimes);
  const baseAvg = average(baseTimes);
  if (
    postAvg === null ||
    baseAvg === null ||
    postTimes.length < REACTIVITY_POST_ERROR_MIN_SAMPLES ||
    baseTimes.length < REACTIVITY_POST_ERROR_MIN_SAMPLES ||
    postAvg < baseAvg * REACTIVITY_POST_ERROR_SLOWDOWN_RATIO
  ) {
    return null;
  }
  const post = Math.round(postAvg);
  const base = Math.round(baseAvg);
  return {
    id: 'REACTIVITY_POST_ERROR_SLOWDOWN',
    severity: RecommendationPriority.HIGH,
    finding: `Après une erreur, vos ${REACTIVITY_POST_ERROR_WINDOW} réponses suivantes ralentissent à ${post} ms, contre ${base} ms en temps normal`,
    recommendation:
      'Une erreur ne doit pas casser votre rythme : respirez, enchaînez.',
  };
}

function fatigueSlope(scored: ReactivitySessionScore): AxisFinding | null {
  const trend = scored.trend;
  if (trend.length < REACTIVITY_FATIGUE_MIN_TREND_POINTS) {
    return null;
  }
  const half = Math.floor(trend.length / 2);
  const early = average(trend.slice(0, half).map(({ trMs }) => trMs));
  const late = average(trend.slice(half).map(({ trMs }) => trMs));
  if (
    early === null ||
    late === null ||
    late <= early * REACTIVITY_FATIGUE_RISE_RATIO
  ) {
    return null;
  }
  return {
    id: 'REACTIVITY_FATIGUE_SLOPE',
    severity: RecommendationPriority.MEDIUM,
    finding: `Votre temps de réaction dérive de ${Math.round(early)} ms à ${Math.round(late)} ms entre la première et la seconde moitié de l'épreuve`,
    recommendation:
      'Travaillez la tenue dans la durée : la fin d’épreuve doit rester au niveau du début.',
  };
}

function phaseThreeErrors(scored: ReactivitySessionScore): AxisFinding | null {
  if (scored.wrongCommandCount === 0) {
    return null;
  }
  const phaseMs = AXIS_TRAINING[AxisType.REACTIVITY].phaseDurationSec * 1000;
  const lateWrong = scored.points.filter(
    ({ classification, appearAtMs }) =>
      classification === 'WRONG_COMMAND' && appearAtMs >= 2 * phaseMs,
  ).length;
  if (
    lateWrong <
    scored.wrongCommandCount * REACTIVITY_LATE_WRONG_CONCENTRATION_RATIO
  ) {
    return null;
  }
  return {
    id: 'REACTIVITY_PHASE3_ERRORS',
    severity: RecommendationPriority.HIGH,
    finding: `${lateWrong} de vos ${scored.wrongCommandCount} mauvaises commandes surviennent en phase 3, après l'arrivée du signal rouge`,
    recommendation:
      'Consolidez la commande Espace du signal rouge avant de chercher la vitesse.',
  };
}

function anticipations(scored: ReactivitySessionScore): AxisFinding | null {
  if (scored.anticipationCount < REACTIVITY_ANTICIPATIONS_MIN) {
    return null;
  }
  return {
    id: 'REACTIVITY_ANTICIPATIONS',
    severity: RecommendationPriority.MEDIUM,
    finding: `${scored.anticipationCount} appuis anticipés, déclenchés avant ou dans les 150 ms suivant le signal`,
    recommendation:
      'Attendez l’apparition réelle du signal avant de déclencher votre geste.',
  };
}

function irregularity(scored: ReactivitySessionScore): AxisFinding | null {
  if (
    scored.trMoyMs === null ||
    scored.sdMs === null ||
    scored.sdMs <= scored.trMoyMs * REACTIVITY_RELATIVE_SD_THRESHOLD
  ) {
    return null;
  }
  return {
    id: 'REACTIVITY_IRREGULARITY',
    severity: RecommendationPriority.MEDIUM,
    finding: `Vos réactions varient de ± ${scored.sdMs} ms autour d'un temps moyen de ${scored.trMoyMs} ms`,
    recommendation:
      'Cherchez une cadence stable du premier au dernier signal, plutôt que des pointes de vitesse.',
  };
}

function phaseStep(scored: ReactivitySessionScore): AxisFinding | null {
  const phaseMs = AXIS_TRAINING[AxisType.REACTIVITY].phaseDurationSec * 1000;
  const phaseTimes = (phase: number) =>
    scored.points
      .filter(
        (point) =>
          point.classification === 'VALID' &&
          point.trMs !== null &&
          Math.floor(point.appearAtMs / phaseMs) === phase,
      )
      .map((point) => point.trMs as number);
  const secondPhase = phaseTimes(1);
  const thirdPhase = phaseTimes(2);
  if (
    secondPhase.length < REACTIVITY_PHASE_STEP_MIN_VALID ||
    thirdPhase.length < REACTIVITY_PHASE_STEP_MIN_VALID
  ) {
    return null;
  }
  const secondAvg = average(secondPhase) as number;
  const thirdAvg = average(thirdPhase) as number;
  if (thirdAvg - secondAvg < REACTIVITY_PHASE_STEP_MS) {
    return null;
  }
  return {
    id: 'REACTIVITY_PHASE_STEP',
    severity: RecommendationPriority.MEDIUM,
    finding: `Votre temps de réaction bondit de ${Math.round(secondAvg)} ms en phase 2 à ${Math.round(thirdAvg)} ms en phase 3`,
    recommendation:
      'Entraînez la bascule à trois commandes : l’ajout du signal rouge ne doit pas ralentir les deux autres.',
  };
}

export function analyzeReactivity(
  scored: ReactivitySessionScore,
): AxisFinding[] {
  return sortFindingsBySeverity(
    [
      postErrorSlowdown(scored),
      fatigueSlope(scored),
      phaseThreeErrors(scored),
      anticipations(scored),
      irregularity(scored),
      phaseStep(scored),
    ].filter((finding): finding is AxisFinding => finding !== null),
  );
}

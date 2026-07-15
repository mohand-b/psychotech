import { MotorSkillsMetrics } from '../../domain/axis-metrics';
import { RecommendationPriority } from '../../enums';
import { AxisFinding, sortFindingsBySeverity } from '../axis-findings';

export const MOTRICITY_DIAG_CONCENTRATION_RATIO = 0.5;
export const MOTRICITY_DIAG_MIN_EXITS = 2;
export const MOTRICITY_ASYMMETRY_RATIO = 2;
export const MOTRICITY_ASYMMETRY_MIN_ERRORS = 3;
export const MOTRICITY_CASCADE_WINDOW_MS = 5000;
export const MOTRICITY_CASCADE_MIN_EVENTS = 2;
export const MOTRICITY_LAST_THIRD_RATIO = 2 / 3;
export const MOTRICITY_LAST_THIRD_CONCENTRATION_RATIO = 0.5;
export const MOTRICITY_LAST_THIRD_MIN_ERRORS = 3;
export const MOTRICITY_CLEAN_ERRORS_MAX = 2;
export const MOTRICITY_SLOW_COURSE_SEC = 75;
export const MOTRICITY_FAST_COURSE_SEC = 55;
export const MOTRICITY_DIRTY_ERRORS_MIN = 6;

function diagonalExits(metrics: MotorSkillsMetrics): AxisFinding | null {
  const exits = metrics.events.filter((event) => event.type === 'EXIT');
  const diagonal = exits.filter((event) => event.segment === 'DIAG');
  if (
    exits.length < MOTRICITY_DIAG_MIN_EXITS ||
    diagonal.length < exits.length * MOTRICITY_DIAG_CONCENTRATION_RATIO
  ) {
    return null;
  }
  return {
    id: 'MOTRICITY_DIAGONAL_EXITS',
    severity: RecommendationPriority.MEDIUM,
    finding: `${diagonal.length} de vos ${exits.length} sorties de couloir surviennent dans les segments diagonaux`,
    recommendation:
      'Les diagonales exigent les deux mains à vitesse égale : entraînez les rotations simultanées et régulières.',
  };
}

function handAsymmetry(metrics: MotorSkillsMetrics): AxisFinding | null {
  const horizontal = metrics.events.filter(
    (event) => event.segment === 'H',
  ).length;
  const vertical = metrics.events.filter(
    (event) => event.segment === 'V',
  ).length;
  const dominant = Math.max(horizontal, vertical);
  const other = Math.min(horizontal, vertical);
  if (
    dominant < MOTRICITY_ASYMMETRY_MIN_ERRORS ||
    dominant < other * MOTRICITY_ASYMMETRY_RATIO
  ) {
    return null;
  }
  const onHorizontal = horizontal > vertical;
  return {
    id: 'MOTRICITY_HAND_ASYMMETRY',
    severity: RecommendationPriority.MEDIUM,
    finding: onHorizontal
      ? `${horizontal} erreurs sur les segments horizontaux contre ${vertical} sur les verticaux : la commande verticale dérive quand elle devrait rester stable`
      : `${vertical} erreurs sur les segments verticaux contre ${horizontal} sur les horizontaux : la commande horizontale dérive quand elle devrait rester stable`,
    recommendation: onHorizontal
      ? 'Travaillez la main de l’axe vertical : elle doit tenir le cap pendant que l’autre avance.'
      : 'Travaillez la main de l’axe horizontal : elle doit tenir le cap pendant que l’autre avance.',
  };
}

function postExitCascade(metrics: MotorSkillsMetrics): AxisFinding | null {
  let cascaded = 0;
  for (const exit of metrics.events) {
    if (exit.type !== 'EXIT') {
      continue;
    }
    const exitEndMs = exit.tMs + (exit.durationMs ?? 0);
    cascaded += metrics.events.filter(
      (event) =>
        event.courseIndex === exit.courseIndex &&
        event.tMs > exitEndMs &&
        event.tMs <= exitEndMs + MOTRICITY_CASCADE_WINDOW_MS,
    ).length;
  }
  if (cascaded < MOTRICITY_CASCADE_MIN_EVENTS) {
    return null;
  }
  return {
    id: 'MOTRICITY_POST_EXIT_CASCADE',
    severity: RecommendationPriority.HIGH,
    finding: `${cascaded} erreurs s'enchaînent dans les ${Math.round(MOTRICITY_CASCADE_WINDOW_MS / 1000)} secondes qui suivent une sortie de couloir`,
    recommendation:
      'Ne paniquez pas après une sortie : recentrez calmement le curseur avant de relancer l’allure.',
  };
}

function narrowFinalThird(metrics: MotorSkillsMetrics): AxisFinding | null {
  const durationByCourse = new Map(
    metrics.courses.map((course) => [course.index, course.tReelMs]),
  );
  const total = metrics.events.length;
  const late = metrics.events.filter((event) => {
    const duration = durationByCourse.get(event.courseIndex);
    return (
      duration !== undefined &&
      event.tMs >= duration * MOTRICITY_LAST_THIRD_RATIO
    );
  }).length;
  if (
    late < MOTRICITY_LAST_THIRD_MIN_ERRORS ||
    late < total * MOTRICITY_LAST_THIRD_CONCENTRATION_RATIO
  ) {
    return null;
  }
  return {
    id: 'MOTRICITY_NARROW_FINAL_THIRD',
    severity: RecommendationPriority.MEDIUM,
    finding: `${late} de vos ${total} erreurs surviennent dans le dernier tiers des parcours, là où le couloir se resserre`,
    recommendation:
      'Anticipez le rétrécissement : réduisez l’allure avant le dernier tiers, pas après le premier contact.',
  };
}

function paceProfile(metrics: MotorSkillsMetrics): AxisFinding | null {
  if (metrics.courses.length === 0) {
    return null;
  }
  const totalErrors = metrics.minorErrors + metrics.majorErrors;
  const avgCourseSec =
    metrics.totalTimeMs / metrics.courses.length / 1000;
  const allCompleted = metrics.coursesCompleted === metrics.courses.length;
  if (
    totalErrors <= MOTRICITY_CLEAN_ERRORS_MAX &&
    (!allCompleted || avgCourseSec >= MOTRICITY_SLOW_COURSE_SEC)
  ) {
    return {
      id: 'MOTRICITY_CLEAN_BUT_SLOW',
      severity: RecommendationPriority.HIGH,
      finding: allCompleted
        ? `Trajectoire propre (${totalErrors} erreur${totalErrors > 1 ? 's' : ''}) mais ${Math.round(avgCourseSec)} s par parcours : le chrono vous coûte plus que la précision`
        : `Trajectoire propre (${totalErrors} erreur${totalErrors > 1 ? 's' : ''}) mais ${metrics.courses.length - metrics.coursesCompleted} parcours inachevé${metrics.courses.length - metrics.coursesCompleted > 1 ? 's' : ''} au chrono`,
      recommendation:
        'Votre précision est acquise : osez une allure supérieure, quelques contacts coûtent moins qu’un parcours inachevé.',
    };
  }
  if (
    allCompleted &&
    avgCourseSec <= MOTRICITY_FAST_COURSE_SEC &&
    totalErrors >= MOTRICITY_DIRTY_ERRORS_MIN
  ) {
    return {
      id: 'MOTRICITY_FAST_BUT_DIRTY',
      severity: RecommendationPriority.MEDIUM,
      finding: `Parcours bouclés vite (${Math.round(avgCourseSec)} s en moyenne) mais ${metrics.minorErrors} contact${metrics.minorErrors > 1 ? 's' : ''} et ${metrics.majorErrors} sortie${metrics.majorErrors > 1 ? 's' : ''}`,
      recommendation:
        'Ralentissez légèrement : votre allure actuelle coûte plus en erreurs qu’elle ne rapporte en chrono.',
    };
  }
  return null;
}

export function analyzeMotricity(metrics: MotorSkillsMetrics): AxisFinding[] {
  return sortFindingsBySeverity(
    [
      diagonalExits(metrics),
      handAsymmetry(metrics),
      postExitCascade(metrics),
      narrowFinalThird(metrics),
      paceProfile(metrics),
    ].filter((finding): finding is AxisFinding => finding !== null),
  );
}

import { MotorSkillsMetrics } from '../../domain/axis-metrics';
import { RecommendationPriority } from '../../enums';
import { TrainingRecommendation } from '../recommendation';

const DIAG_EXIT_CONCENTRATION_RATIO = 0.5;
const MAJOR_ERRORS_HIGH_THRESHOLD = 3;
const MINOR_ERRORS_MEDIUM_THRESHOLD = 6;
const MAJOR_ERRORS_MEDIUM_CEILING = 1;

export function getMotricityRecommendation(
  metrics: MotorSkillsMetrics,
): TrainingRecommendation {
  if (metrics.courses.some((course) => course.progressionPct < 100)) {
    return {
      id: 'MOTRICITY_TIMEOUT',
      label:
        "Un parcours s'est achevé au chrono - gagnez en allure sans lâcher la précision",
      priority: RecommendationPriority.HIGH,
    };
  }
  if (metrics.majorErrors >= MAJOR_ERRORS_HIGH_THRESHOLD) {
    return {
      id: 'MOTRICITY_EXITS',
      label:
        'Limitez les sorties de couloir - ralentissez dans les passages étroits',
      priority: RecommendationPriority.HIGH,
    };
  }
  const exits = metrics.events.filter((event) => event.type === 'EXIT');
  const diagonalExits = exits.filter((event) => event.segment === 'DIAG');
  if (
    exits.length > 0 &&
    diagonalExits.length >= exits.length * DIAG_EXIT_CONCENTRATION_RATIO
  ) {
    return {
      id: 'MOTRICITY_DIAGONALS',
      label:
        'Vos sorties se concentrent dans les segments diagonaux - travaillez les deux mains simultanément',
      priority: RecommendationPriority.MEDIUM,
    };
  }
  if (
    metrics.minorErrors >= MINOR_ERRORS_MEDIUM_THRESHOLD &&
    metrics.majorErrors <= MAJOR_ERRORS_MEDIUM_CEILING
  ) {
    return {
      id: 'MOTRICITY_CENTERING',
      label: 'Beaucoup de contacts de bord - visez le centre du couloir',
      priority: RecommendationPriority.MEDIUM,
    };
  }
  return {
    id: 'MOTRICITY_KEEP_GOING',
    label:
      'Trajectoire maîtrisée - continuez pour ancrer la précision du geste',
    priority: RecommendationPriority.LOW,
  };
}

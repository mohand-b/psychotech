import { RecommendationPriority } from '../../enums';
import { TrainingRecommendation } from '../recommendation';
import { MemorySessionScore } from './memory-scoring';

const INVERSE_GAP_THRESHOLD = 0.15;
const WEAK_POSITION_THRESHOLD = 60;
const WEAK_POSITIONS_CITED_MAX = 2;

function weakPositions(scored: MemorySessionScore): number[] {
  return scored.positionReliability
    .map((reliability, index) => ({ reliability, position: index + 1 }))
    .filter(({ reliability }) => reliability < WEAK_POSITION_THRESHOLD)
    .sort((a, b) => a.reliability - b.reliability)
    .slice(0, WEAK_POSITIONS_CITED_MAX)
    .map(({ position }) => position)
    .sort((a, b) => a - b);
}

export function getMemoryRecommendation(
  scored: MemorySessionScore,
): TrainingRecommendation {
  if (scored.normalAvg - scored.inverseAvg > INVERSE_GAP_THRESHOLD) {
    return {
      id: 'MEMORY_INVERSE_GAP',
      label:
        "L'ordre inversé vous coûte — travaillez la restitution à l'envers",
      priority: RecommendationPriority.HIGH,
    };
  }
  if (scored.misplacedCount > scored.absentCount && scored.misplacedCount > 0) {
    const positions = weakPositions(scored);
    const detail =
      positions.length === 0
        ? 'le milieu des séquences vous échappe'
        : positions.length === 1
          ? `la position ${positions[0]} vous échappe`
          : `les positions ${positions.join(' et ')} vous échappent`;
    return {
      id: 'MEMORY_ORDER_FRAGILE',
      label: `Éléments retenus mais ordre fragile — ${detail}`,
      priority: RecommendationPriority.MEDIUM,
    };
  }
  if (scored.timedOutCount > 0) {
    const count = scored.timedOutCount;
    return {
      id: 'MEMORY_PACE',
      label:
        count > 1
          ? `${count} restitutions hors délai — entraînez un rythme de saisie plus régulier`
          : '1 restitution hors délai — entraînez un rythme de saisie plus régulier',
      priority: RecommendationPriority.MEDIUM,
    };
  }
  return {
    id: 'MEMORY_KEEP_GOING',
    label: 'Mémoire solide — continuez sur ce rythme pour ancrer vos automatismes',
    priority: RecommendationPriority.LOW,
  };
}

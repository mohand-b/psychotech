import { RecommendationPriority } from '../../enums';
import { AxisFinding, sortFindingsBySeverity } from '../axis-findings';
import { MemorySequence } from './memory-sequence';
import { MemorySessionScore } from './memory-scoring';

export const MEMORY_INVERSE_GAP_THRESHOLD = 0.15;
export const MEMORY_FAULT_NATURE_MIN = 2;

function asPct(average: number): number {
  return Math.round(average * 100);
}

function inverseGap(scored: MemorySessionScore): AxisFinding | null {
  if (scored.normalAvg - scored.inverseAvg <= MEMORY_INVERSE_GAP_THRESHOLD) {
    return null;
  }
  return {
    id: 'MEMORY_INVERSE_GAP',
    severity: RecommendationPriority.HIGH,
    finding: `${asPct(scored.normalAvg)} % de restitution en ordre normal contre ${asPct(scored.inverseAvg)} % en ordre inversé`,
    recommendation:
      'Travaillez la restitution à l’envers : balayez mentalement la séquence depuis la fin avant de saisir.',
  };
}

function lengthCliff(
  sequences: MemorySequence[],
  scored: MemorySessionScore,
): AxisFinding | null {
  const perfectLengths = sequences
    .filter((sequence, position) => scored.results[position]?.status === 'PERFECT')
    .map(({ length }) => length);
  if (perfectLengths.length === 0) {
    return null;
  }
  const cliff = Math.max(...perfectLengths);
  const beyond = sequences.filter(({ length }) => length > cliff);
  if (
    beyond.length === 0 ||
    beyond.some(
      (sequence) =>
        scored.results[sequences.indexOf(sequence)]?.status === 'PERFECT',
    )
  ) {
    return null;
  }
  return {
    id: 'MEMORY_LENGTH_CLIFF',
    severity: RecommendationPriority.MEDIUM,
    finding: `Restitution parfaite jusqu'à ${cliff} éléments, puis échec sur chaque séquence plus longue`,
    recommendation:
      'Allongez la longueur de séquence mémorisée un élément à la fois, en groupant les éléments par paquets de deux ou trois.',
  };
}

function faultNature(scored: MemorySessionScore): AxisFinding | null {
  const { misplacedCount, absentCount } = scored;
  if (Math.max(misplacedCount, absentCount) < MEMORY_FAULT_NATURE_MIN) {
    return null;
  }
  if (misplacedCount > absentCount) {
    return {
      id: 'MEMORY_TRANSPOSITIONS',
      severity: RecommendationPriority.MEDIUM,
      finding: `${misplacedCount} éléments retenus mais placés au mauvais rang, contre ${absentCount} intrusions`,
      recommendation:
        'Le contenu est acquis, l’ordre non : ancrez chaque élément à sa position au moment de la mémorisation.',
    };
  }
  if (absentCount > misplacedCount) {
    return {
      id: 'MEMORY_INTRUSIONS',
      severity: RecommendationPriority.MEDIUM,
      finding: `${absentCount} éléments saisis qui n'appartenaient pas à la séquence, contre ${misplacedCount} simples inversions d'ordre`,
      recommendation:
        'N’inventez jamais pour combler un trou : un élément étranger est pénalisé, une case vide non. En cas de doute, resaisissez un élément réellement vu.',
    };
  }
  return null;
}

function timeouts(scored: MemorySessionScore): AxisFinding | null {
  if (scored.timedOutCount === 0) {
    return null;
  }
  return {
    id: 'MEMORY_TIMEOUTS',
    severity: RecommendationPriority.MEDIUM,
    finding: `${scored.timedOutCount} restitution${scored.timedOutCount > 1 ? 's' : ''} hors délai`,
    recommendation:
      'Entraînez un rythme de saisie régulier : commencez à restituer dès la fin de l’affichage.',
  };
}

export function analyzeMemory(
  sequences: MemorySequence[],
  scored: MemorySessionScore,
): AxisFinding[] {
  return sortFindingsBySeverity(
    [
      inverseGap(scored),
      lengthCliff(sequences, scored),
      faultNature(scored),
      timeouts(scored),
    ].filter((finding): finding is AxisFinding => finding !== null),
  );
}

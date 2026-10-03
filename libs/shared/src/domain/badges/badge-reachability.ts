import { AxisType } from '../../enums';
import { MEMORY_PERFECTION_SEQUENCE_LENGTH } from '../../exercises/axis-perfection';
import { AXIS_TRAINING } from '../axis-training';
import { BadgeId } from './badge-model';

function memoryPerfectionReachable(): boolean {
  return AXIS_TRAINING[AxisType.MEMORY].sequences.some(
    (sequence) => sequence.length >= MEMORY_PERFECTION_SEQUENCE_LENGTH,
  );
}

export function isBadgeReachable(badgeId: BadgeId): boolean {
  return badgeId !== BadgeId.MEMORY_PERFECTION || memoryPerfectionReachable();
}

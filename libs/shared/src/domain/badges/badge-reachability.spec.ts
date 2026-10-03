import { AxisType } from '../../enums';
import { MEMORY_PERFECTION_SEQUENCE_LENGTH } from '../../exercises/axis-perfection';
import { AXIS_TRAINING } from '../axis-training';
import { BADGE_CATALOG } from './badge-catalog';
import { BadgeId } from './badge-model';
import { isBadgeReachable } from './badge-reachability';

describe('badge reachability', () => {
  it('follows the longest memory sequence of the training plan for the memory gold badge', () => {
    const longestSequence = Math.max(
      ...AXIS_TRAINING[AxisType.MEMORY].sequences.map(
        (sequence) => sequence.length,
      ),
    );
    expect(isBadgeReachable(BadgeId.MEMORY_PERFECTION)).toBe(
      longestSequence >= MEMORY_PERFECTION_SEQUENCE_LENGTH,
    );
  });

  it('keeps every other badge reachable', () => {
    const others = BADGE_CATALOG.filter(
      (definition) => definition.id !== BadgeId.MEMORY_PERFECTION,
    );
    for (const definition of others) {
      expect(isBadgeReachable(definition.id)).toBe(true);
    }
  });
});

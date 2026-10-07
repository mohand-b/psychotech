import { AxisType, BadgeId, BadgeStatusDto } from '@psychotech/shared';
import { findNextScoreTier, listLatestEarnedBadges } from './badge-milestones';

function status(badgeId: BadgeId, earnedAt: string | null): BadgeStatusDto {
  return {
    badgeId,
    earnedAt,
    acknowledgedAt: earnedAt,
    conditions: [],
    rarityPercent: null,
  };
}

describe('listLatestEarnedBadges', () => {
  it('keeps the most recent earned badges first, up to the requested count', () => {
    const latest = listLatestEarnedBadges(
      [
        status(BadgeId.LOGIC_PROGRESSION, '2026-07-01T10:00:00.000Z'),
        status(BadgeId.MEMORY_PROGRESSION, null),
        status(BadgeId.FIRST_STEPS, '2026-06-01T10:00:00.000Z'),
        status(BadgeId.EXAM_FIRST, '2026-09-20T10:00:00.000Z'),
        status(BadgeId.DISCRIMINATION_EXCELLENCE, '2026-10-04T10:00:00.000Z'),
      ],
      3,
    );

    expect(latest.map((entry) => entry.definition.id)).toEqual([
      BadgeId.DISCRIMINATION_EXCELLENCE,
      BadgeId.EXAM_FIRST,
      BadgeId.LOGIC_PROGRESSION,
    ]);
  });
});

describe('findNextScoreTier', () => {
  it('picks the unearned score tier with the smallest gap among played axes', () => {
    const next = findNextScoreTier(
      [
        status(BadgeId.LOGIC_PROGRESSION, '2026-07-01T10:00:00.000Z'),
        status(BadgeId.MEMORY_PROGRESSION, '2026-07-01T10:00:00.000Z'),
      ],
      {
        [AxisType.LOGIC]: 78,
        [AxisType.MEMORY]: 74,
        [AxisType.REACTIVITY]: 61,
      },
    );

    expect(next?.definition.id).toBe(BadgeId.LOGIC_EXCELLENCE);
    expect(next?.target).toBe(85);
    expect(next?.bestScore).toBe(78);
    expect(next?.gap).toBe(7);
  });

  it('never proposes the motricity silver nor a gold, which score alone cannot unlock', () => {
    const next = findNextScoreTier(
      [status(BadgeId.MOTOR_PROGRESSION, '2026-07-01T10:00:00.000Z')],
      { [AxisType.MOTOR_SKILLS]: 84 },
    );

    expect(next).toBeNull();
  });

  it('ignores the axes never played', () => {
    expect(findNextScoreTier([], {})).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { AxisType, Sector, SessionMode } from '../../enums';
import {
  BADGE_BY_ID,
  BADGE_CATALOG,
  badgeDisplayName,
  badgesListeningTo,
} from './badge-catalog';
import { BadgeDefinition } from './badge-model';
import { badgeAssetPath } from './badge-assets';
import {
  BadgeEvent,
  BadgeFacts,
  BadgeFamily,
  BadgeId,
  badgeEarned,
} from './badge-model';

function badge(id: BadgeId): BadgeDefinition {
  const definition = BADGE_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Badge absent du catalogue : ${id}`);
  }
  return definition;
}

function facts(overrides: Partial<BadgeFacts> = {}): BadgeFacts {
  return {
    sector: Sector.RAILWAY,
    bestScores: {},
    user: {
      accountVerified: false,
      tutorialDiscovered: false,
      sessionStarted: false,
    },
    session: null,
    ...overrides,
  };
}

function simulationSession(
  axisScores: number[],
  verdictFavorable: boolean,
  qualifierAtLeastSolid: boolean,
): BadgeFacts['session'] {
  const axes = [
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.VISUAL_DISCRIMINATION,
    AxisType.REACTIVITY,
    AxisType.MOTOR_SKILLS,
  ].map((axis, index) => ({
    axis,
    score: axisScores[index],
    perfection: null,
  }));
  return {
    mode: SessionMode.FULL,
    axes,
    simulation: { verdictFavorable, qualifierAtLeastSolid },
  };
}

describe('badge catalog shape', () => {
  it('contains exactly the twenty acted badges, each with a unique id', () => {
    expect(BADGE_CATALOG).toHaveLength(20);
    expect(new Set(BADGE_CATALOG.map(({ id }) => id)).size).toBe(20);
  });

  it('credits energy on exactly two badges of this lot', () => {
    const rewarding = BADGE_CATALOG.filter(
      ({ energyReward }) => energyReward > 0,
    );
    expect(rewarding.map(({ id }) => id).sort()).toEqual([
      BadgeId.EXAM_FAVORABLE,
      BadgeId.FIRST_STEPS,
    ]);
    expect(
      badge(BadgeId.FIRST_STEPS).energyReward,
    ).toBe(5);
    expect(badge(BadgeId.EXAM_FAVORABLE).energyReward).toBe(2);
  });

  it('maps every badge to an existing asset naming scheme', () => {
    for (const definition of BADGE_CATALOG) {
      const path = badgeAssetPath(definition, Sector.RAILWAY);
      expect(path).toMatch(/^badges\/badge-[a-z-]+\.svg$/);
    }
    expect(
      badgeAssetPath(
        badge(BadgeId.SECTOR_MASTERY),
        Sector.RAILWAY,
      ),
    ).toBe('badges/badge-secteur-ferroviaire.svg');
  });

  it('names the sector badge per sector', () => {
    expect(
      badgeDisplayName(badge(BadgeId.SECTOR_MASTERY), Sector.RAILWAY),
    ).toBe('Sur les rails');
  });
});

describe('axis threshold badges', () => {
  it('awards progression at 70 and excellence at 85 on the persisted best', () => {
    const declic = badge(BadgeId.LOGIC_PROGRESSION);
    const implacable = badge(BadgeId.LOGIC_EXCELLENCE);
    expect(
      badgeEarned(declic, facts({ bestScores: { [AxisType.LOGIC]: 69 } })),
    ).toBe(false);
    expect(
      badgeEarned(declic, facts({ bestScores: { [AxisType.LOGIC]: 70 } })),
    ).toBe(true);
    expect(
      badgeEarned(implacable, facts({ bestScores: { [AxisType.LOGIC]: 84 } })),
    ).toBe(false);
    expect(
      badgeEarned(implacable, facts({ bestScores: { [AxisType.LOGIC]: 85 } })),
    ).toBe(true);
  });
});

describe('axis perfection badges', () => {
  it('awards Infaillible only on a full-marks logic session', () => {
    const infaillible = badge(BadgeId.LOGIC_PERFECTION);
    const session = (correctCount: number): BadgeFacts['session'] => ({
      mode: SessionMode.TARGETED,
      axes: [
        {
          axis: AxisType.LOGIC,
          score: 50,
          perfection: {
            kind: AxisType.LOGIC,
            itemCount: 40,
            correctCount,
          },
        },
      ],
      simulation: null,
    });
    expect(badgeEarned(infaillible, facts({ session: session(40) }))).toBe(true);
    expect(badgeEarned(infaillible, facts({ session: session(39) }))).toBe(
      false,
    );
    expect(badgeEarned(infaillible, facts())).toBe(false);
  });

  it('awards Empan 8 from the longest perfect restitution', () => {
    const empan = badge(BadgeId.MEMORY_PERFECTION);
    const session = (length: number): BadgeFacts['session'] => ({
      mode: SessionMode.TARGETED,
      axes: [
        {
          axis: AxisType.MEMORY,
          score: 40,
          perfection: {
            kind: AxisType.MEMORY,
            longestPerfectLength: length,
          },
        },
      ],
      simulation: null,
    });
    expect(badgeEarned(empan, facts({ session: session(8) }))).toBe(true);
    expect(badgeEarned(empan, facts({ session: session(7) }))).toBe(false);
  });

  it('awards Sang-froid only on a flawless reactivity session', () => {
    const sangFroid = badge(BadgeId.REACTIVITY_PERFECTION);
    const session = (
      anticipationCount: number,
      omissionCount: number,
      wrongCommandCount: number,
    ): BadgeFacts['session'] => ({
      mode: SessionMode.TARGETED,
      axes: [
        {
          axis: AxisType.REACTIVITY,
          score: 55,
          perfection: {
            kind: AxisType.REACTIVITY,
            anticipationCount,
            omissionCount,
            wrongCommandCount,
          },
        },
      ],
      simulation: null,
    });
    expect(badgeEarned(sangFroid, facts({ session: session(0, 0, 0) }))).toBe(
      true,
    );
    expect(badgeEarned(sangFroid, facts({ session: session(1, 0, 0) }))).toBe(
      false,
    );
    expect(badgeEarned(sangFroid, facts({ session: session(0, 1, 0) }))).toBe(
      false,
    );
    expect(badgeEarned(sangFroid, facts({ session: session(0, 0, 1) }))).toBe(
      false,
    );
  });
});

describe('exam badges', () => {
  it('awards Baptême on any completed simulation whatever the verdict', () => {
    const bapteme = badge(BadgeId.EXAM_FIRST);
    expect(
      badgeEarned(
        bapteme,
        facts({ session: simulationSession([10, 10, 10, 10, 10], false, false) }),
      ),
    ).toBe(true);
    expect(badgeEarned(bapteme, facts())).toBe(false);
  });

  it('awards Sans réserve only when favorable, solid and no axis under 70', () => {
    const sansReserve = badge(BadgeId.EXAM_SOLID);
    expect(
      badgeEarned(
        sansReserve,
        facts({ session: simulationSession([80, 85, 78, 90, 72], true, true) }),
      ),
    ).toBe(true);
    expect(
      badgeEarned(
        sansReserve,
        facts({ session: simulationSession([80, 85, 69, 90, 72], true, true) }),
      ),
    ).toBe(false);
    expect(
      badgeEarned(
        sansReserve,
        facts({ session: simulationSession([80, 85, 78, 90, 72], true, false) }),
      ),
    ).toBe(false);
  });
});

describe('transverse badges', () => {
  it('awards Premiers pas only once the three flags hold, whatever the order', () => {
    const firstSteps = badge(BadgeId.FIRST_STEPS);
    expect(
      badgeEarned(
        firstSteps,
        facts({
          user: {
            accountVerified: true,
            tutorialDiscovered: true,
            sessionStarted: true,
          },
        }),
      ),
    ).toBe(true);
    expect(
      badgeEarned(
        firstSteps,
        facts({
          user: {
            accountVerified: true,
            tutorialDiscovered: false,
            sessionStarted: true,
          },
        }),
      ),
    ).toBe(false);
  });

  it('awards the sector badge when every sector axis reaches 70', () => {
    const sector = badge(BadgeId.SECTOR_MASTERY);
    const allAt = (score: number) =>
      Object.fromEntries(
        [
          AxisType.LOGIC,
          AxisType.MEMORY,
          AxisType.VISUAL_DISCRIMINATION,
          AxisType.REACTIVITY,
          AxisType.MOTOR_SKILLS,
        ].map((axis) => [axis, score]),
      );
    expect(badgeEarned(sector, facts({ bestScores: allAt(70) }))).toBe(true);
    expect(
      badgeEarned(
        sector,
        facts({
          bestScores: { ...allAt(70), [AxisType.MOTOR_SKILLS]: 69 },
        }),
      ),
    ).toBe(false);
  });
});

describe('event subscriptions', () => {
  it('keeps first steps on the three account events and never on completion', () => {
    const listening = badgesListeningTo(BadgeEvent.SESSION_COMPLETED);
    expect(listening.some(({ id }) => id === BadgeId.FIRST_STEPS)).toBe(false);
    expect(listening).toHaveLength(19);
    expect(
      badgesListeningTo(BadgeEvent.TUTORIAL_OPENED).map(({ id }) => id),
    ).toEqual([BadgeId.FIRST_STEPS]);
  });

  it('splits the catalog into the three acted families', () => {
    const byFamily = (family: BadgeFamily) =>
      BADGE_CATALOG.filter((definition) => definition.family === family).length;
    expect(byFamily(BadgeFamily.AXIS)).toBe(15);
    expect(byFamily(BadgeFamily.EXAM)).toBe(3);
    expect(byFamily(BadgeFamily.TRANSVERSE)).toBe(2);
  });
});

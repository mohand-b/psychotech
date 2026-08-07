import { describe, expect, it } from 'vitest';
import { AxisType, Sector, SessionMode } from '../../enums';
import {
  BADGE_BY_ID,
  BADGE_CATALOG,
  BADGE_TOTAL_REWARD,
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
  BadgeTier,
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
  }));
  return {
    mode: SessionMode.FULL,
    axes,
    simulation: { verdictFavorable },
  };
}

describe('badge catalog shape', () => {
  it('contains exactly the twenty acted badges, each with a unique id', () => {
    expect(BADGE_CATALOG).toHaveLength(20);
    expect(new Set(BADGE_CATALOG.map(({ id }) => id)).size).toBe(20);
  });

  it('credits energy on the axis tiers, the favorable exam and first steps', () => {
    for (const definition of BADGE_CATALOG) {
      if (definition.family === BadgeFamily.AXIS) {
        expect(definition.energyReward).toBe(
          definition.tier === BadgeTier.GOLD
            ? 2
            : definition.tier === BadgeTier.SILVER
              ? 1
              : 0,
        );
      }
    }
    expect(badge(BadgeId.FIRST_STEPS).energyReward).toBe(3);
    expect(badge(BadgeId.EXAM_FAVORABLE).energyReward).toBe(2);
    expect(badge(BadgeId.EXAM_FIRST).energyReward).toBe(0);
    expect(badge(BadgeId.EXAM_SOLID).energyReward).toBe(3);
    expect(badge(BadgeId.SECTOR_MASTERY).energyReward).toBe(2);
    const total = BADGE_CATALOG.reduce(
      (sum, { energyReward }) => sum + energyReward,
      0,
    );
    expect(total).toBe(25);
    expect(BADGE_TOTAL_REWARD).toBe(total);
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
  it('awards the gold badge only on a perfect best score of 100', () => {
    const infaillible = badge(BadgeId.LOGIC_PERFECTION);
    const memoireAbsolue = badge(BadgeId.MEMORY_PERFECTION);
    expect(
      badgeEarned(infaillible, facts({ bestScores: { [AxisType.LOGIC]: 99 } })),
    ).toBe(false);
    expect(
      badgeEarned(infaillible, facts({ bestScores: { [AxisType.LOGIC]: 100 } })),
    ).toBe(true);
    expect(memoireAbsolue.displayName).toBe('Mémoire absolue');
    expect(
      badgeEarned(
        memoireAbsolue,
        facts({ bestScores: { [AxisType.MEMORY]: 100 } }),
      ),
    ).toBe(true);
  });
});

describe('exam badges', () => {
  it('awards Baptême on any completed simulation whatever the verdict', () => {
    const bapteme = badge(BadgeId.EXAM_FIRST);
    expect(
      badgeEarned(
        bapteme,
        facts({ session: simulationSession([10, 10, 10, 10, 10], false) }),
      ),
    ).toBe(true);
    expect(badgeEarned(bapteme, facts())).toBe(false);
  });

  it('awards Sans réserve when favorable with no axis under 70', () => {
    const sansReserve = badge(BadgeId.EXAM_SOLID);
    expect(
      badgeEarned(
        sansReserve,
        facts({ session: simulationSession([80, 85, 78, 90, 72], true) }),
      ),
    ).toBe(true);
    expect(
      badgeEarned(
        sansReserve,
        facts({ session: simulationSession([80, 85, 69, 90, 72], true) }),
      ),
    ).toBe(false);
    expect(
      badgeEarned(
        sansReserve,
        facts({ session: simulationSession([80, 85, 78, 90, 72], false) }),
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

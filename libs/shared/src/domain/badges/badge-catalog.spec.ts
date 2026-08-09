import { describe, expect, it } from 'vitest';
import { AxisType, Sector, SessionMode } from '../../enums';
import { SimulationStampQualifier } from '../verdict-stamp';
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
  BadgeSessionAxisFacts,
  BadgeTier,
  badgeEarned,
} from './badge-model';

const ALL_AXES = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
] as const;

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
    },
    session: null,
    ...overrides,
  };
}

function simulationSession(
  axisScores: number[],
  verdictFavorable: boolean,
  qualifier: SimulationStampQualifier = verdictFavorable
    ? SimulationStampQualifier.SOLID
    : SimulationStampQualifier.INSUFFICIENT,
): BadgeFacts['session'] {
  const axes: BadgeSessionAxisFacts[] = ALL_AXES.map((axis, index) => ({
    axis,
    score: axisScores[index],
    perfection: false,
  }));
  return {
    mode: SessionMode.FULL,
    axes,
    simulation: { verdictFavorable, qualifier },
  };
}

function targetedSession(
  axis: AxisType,
  score: number,
  perfection: boolean,
): BadgeFacts['session'] {
  return {
    mode: SessionMode.TARGETED,
    axes: [{ axis, score, perfection }],
    simulation: null,
  };
}

describe('badge catalog shape', () => {
  it('contains exactly the twenty acted badges, each with a unique id', () => {
    expect(BADGE_CATALOG).toHaveLength(20);
    expect(new Set(BADGE_CATALOG.map(({ id }) => id)).size).toBe(20);
  });

  it('carries the acted display names from the Notion catalog', () => {
    const names = new Map<BadgeId, string>([
      [BadgeId.LOGIC_PROGRESSION, 'Cartésien'],
      [BadgeId.LOGIC_EXCELLENCE, 'Esprit affûté'],
      [BadgeId.LOGIC_PERFECTION, 'Mentaliste'],
      [BadgeId.MEMORY_PROGRESSION, 'Tête bien pleine'],
      [BadgeId.MEMORY_EXCELLENCE, "Mémoire d'éléphant"],
      [BadgeId.MEMORY_PERFECTION, 'Disque dur'],
      [BadgeId.DISCRIMINATION_PROGRESSION, 'Fin limier'],
      [BadgeId.DISCRIMINATION_EXCELLENCE, 'Œil de lynx'],
      [BadgeId.DISCRIMINATION_PERFECTION, 'Radar'],
      [BadgeId.REACTIVITY_PROGRESSION, 'Réflexe'],
      [BadgeId.REACTIVITY_EXCELLENCE, 'Sixième sens'],
      [BadgeId.REACTIVITY_PERFECTION, 'Éclair'],
      [BadgeId.MOTOR_PROGRESSION, 'Main sûre'],
      [BadgeId.MOTOR_EXCELLENCE, 'Chirurgien'],
      [BadgeId.MOTOR_PERFECTION, 'Orfèvre'],
      [BadgeId.EXAM_FIRST, 'Aguerri'],
      [BadgeId.EXAM_FAVORABLE, 'Certifié'],
      [BadgeId.EXAM_SOLID, 'Premier de la classe'],
      [BadgeId.FIRST_STEPS, 'Premiers pas'],
      [BadgeId.SECTOR_MASTERY, 'Sur les rails'],
    ]);
    for (const [id, name] of names) {
      expect(badge(id).displayName).toBe(name);
    }
  });

  it('never mentions a perfect score in any gold condition', () => {
    const goldBadges = BADGE_CATALOG.filter(
      ({ tier }) => tier === BadgeTier.GOLD,
    );
    expect(goldBadges).toHaveLength(6);
    for (const definition of goldBadges) {
      for (const condition of definition.conditions) {
        expect(condition.label).not.toMatch(/score parfait/i);
        expect(condition.label).not.toMatch(/100/);
      }
    }
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
    expect(badge(BadgeId.FIRST_STEPS).energyReward).toBe(2);
    expect(badge(BadgeId.EXAM_FAVORABLE).energyReward).toBe(2);
    expect(badge(BadgeId.EXAM_FIRST).energyReward).toBe(0);
    expect(badge(BadgeId.EXAM_SOLID).energyReward).toBe(3);
    expect(badge(BadgeId.SECTOR_MASTERY).energyReward).toBe(3);
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
    const cartesien = badge(BadgeId.LOGIC_PROGRESSION);
    const espritAffute = badge(BadgeId.LOGIC_EXCELLENCE);
    expect(
      badgeEarned(cartesien, facts({ bestScores: { [AxisType.LOGIC]: 69 } })),
    ).toBe(false);
    expect(
      badgeEarned(cartesien, facts({ bestScores: { [AxisType.LOGIC]: 70 } })),
    ).toBe(true);
    expect(
      badgeEarned(
        espritAffute,
        facts({ bestScores: { [AxisType.LOGIC]: 84 } }),
      ),
    ).toBe(false);
    expect(
      badgeEarned(
        espritAffute,
        facts({ bestScores: { [AxisType.LOGIC]: 85 } }),
      ),
    ).toBe(true);
  });
});

describe('axis perfection badges', () => {
  it('awards gold on a session carrying the perfection proof, whatever the score', () => {
    for (const definition of BADGE_CATALOG) {
      if (definition.tier !== BadgeTier.GOLD || definition.axis === null) {
        continue;
      }
      expect(
        badgeEarned(
          definition,
          facts({ session: targetedSession(definition.axis, 74, true) }),
        ),
      ).toBe(true);
      expect(
        badgeEarned(
          definition,
          facts({ session: targetedSession(definition.axis, 100, false) }),
        ),
      ).toBe(false);
      expect(
        badgeEarned(
          definition,
          facts({ bestScores: { [definition.axis]: 100 }, session: null }),
        ),
      ).toBe(false);
    }
  });

  it('ignores a perfection proof carried by another axis', () => {
    const mentaliste = badge(BadgeId.LOGIC_PERFECTION);
    expect(
      badgeEarned(
        mentaliste,
        facts({ session: targetedSession(AxisType.MEMORY, 90, true) }),
      ),
    ).toBe(false);
  });
});

describe('exam badges', () => {
  it('awards Aguerri on any completed simulation whatever the verdict', () => {
    const aguerri = badge(BadgeId.EXAM_FIRST);
    expect(
      badgeEarned(
        aguerri,
        facts({ session: simulationSession([10, 10, 10, 10, 10], false) }),
      ),
    ).toBe(true);
    expect(badgeEarned(aguerri, facts())).toBe(false);
  });

  it('awards Certifié on a favorable verdict whatever the qualifier', () => {
    const certifie = badge(BadgeId.EXAM_FAVORABLE);
    expect(
      badgeEarned(
        certifie,
        facts({
          session: simulationSession(
            [72, 71, 70, 74, 73],
            true,
            SimulationStampQualifier.JUST,
          ),
        }),
      ),
    ).toBe(true);
  });

  it('awards Premier de la classe only on a SOLID favorable verdict with no axis under 70', () => {
    const premierDeLaClasse = badge(BadgeId.EXAM_SOLID);
    expect(
      badgeEarned(
        premierDeLaClasse,
        facts({
          session: simulationSession(
            [80, 85, 78, 90, 72],
            true,
            SimulationStampQualifier.SOLID,
          ),
        }),
      ),
    ).toBe(true);
    expect(
      badgeEarned(
        premierDeLaClasse,
        facts({
          session: simulationSession(
            [92, 95, 88, 96, 90],
            true,
            SimulationStampQualifier.EXCELLENT,
          ),
        }),
      ),
    ).toBe(true);
    expect(
      badgeEarned(
        premierDeLaClasse,
        facts({
          session: simulationSession(
            [80, 85, 78, 90, 72],
            true,
            SimulationStampQualifier.JUST,
          ),
        }),
      ),
    ).toBe(false);
    expect(
      badgeEarned(
        premierDeLaClasse,
        facts({
          session: simulationSession(
            [80, 85, 69, 90, 72],
            true,
            SimulationStampQualifier.SOLID,
          ),
        }),
      ),
    ).toBe(false);
    expect(
      badgeEarned(
        premierDeLaClasse,
        facts({ session: simulationSession([80, 85, 78, 90, 72], false) }),
      ),
    ).toBe(false);
  });
});

describe('transverse badges', () => {
  it('awards Premiers pas only once the flags hold, whatever the order', () => {
    const firstSteps = badge(BadgeId.FIRST_STEPS);
    expect(
      badgeEarned(
        firstSteps,
        facts({
          user: {
            accountVerified: true,
            tutorialDiscovered: true,
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
          },
        }),
      ),
    ).toBe(false);
  });

  it('awards the sector badge when every sector axis reaches 70', () => {
    const sector = badge(BadgeId.SECTOR_MASTERY);
    const allAt = (score: number) =>
      Object.fromEntries(ALL_AXES.map((axis) => [axis, score]));
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
  it('keeps first steps on the account events and never on completion', () => {
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

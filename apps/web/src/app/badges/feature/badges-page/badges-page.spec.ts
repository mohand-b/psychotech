import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AxisType,
  BADGE_BY_ID,
  BADGE_CATALOG,
  BadgeFamily,
  BadgeId,
  BadgeStatusDto,
  BadgeTier,
  ScoreBand,
  Sector,
  SimulationVerdict,
  TrainingsAxisOverviewDto,
  TrainingsLastSimulationDto,
  TrainingsOverviewDto,
  isBadgeReachable,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesPage } from './badges-page';

function status(
  badgeId: BadgeId,
  overrides: Partial<BadgeStatusDto> = {},
): BadgeStatusDto {
  const definition = BADGE_BY_ID.get(badgeId);
  return {
    badgeId,
    earnedAt: null,
    acknowledgedAt: null,
    conditions: (definition?.conditions ?? []).map((condition) => ({
      id: condition.id,
      label: condition.label,
      met: false,
    })),
    rarityPercent: null,
    ...overrides,
  };
}

function catalogStatuses(
  overridesById: Partial<Record<BadgeId, Partial<BadgeStatusDto>>> = {},
): BadgeStatusDto[] {
  return BADGE_CATALOG.map((definition) =>
    status(definition.id, overridesById[definition.id] ?? {}),
  );
}

const EMPTY_OVERVIEW: TrainingsOverviewDto = {
  lastSimulation: null,
  vigilanceThreshold: 65,
  axes: [],
};

const EARNED: Partial<BadgeStatusDto> = {
  earnedAt: '2026-08-01T10:00:00.000Z',
  acknowledgedAt: '2026-08-01T10:00:00.000Z',
};

function earnedOnly(
  badgeIds: readonly BadgeId[],
): Partial<Record<BadgeId, Partial<BadgeStatusDto>>> {
  return Object.fromEntries(badgeIds.map((badgeId) => [badgeId, EARNED]));
}

function conditionLabels(badgeId: BadgeId): string[] {
  return (BADGE_BY_ID.get(badgeId)?.conditions ?? []).map(
    (condition) => condition.label,
  );
}

function firstStepsWithVerifiedAccount(): Partial<BadgeStatusDto> {
  return {
    conditions: (BADGE_BY_ID.get(BadgeId.FIRST_STEPS)?.conditions ?? []).map(
      (condition, index) => ({
        id: condition.id,
        label: condition.label,
        met: index === 0,
      }),
    ),
  };
}

function axisOverview(
  axis: AxisType,
  bestScore: number,
  isCriticalAxis = false,
): TrainingsAxisOverviewDto {
  return {
    axis,
    bestScore,
    neverPlayed: false,
    isCriticalAxis,
    needsWork: false,
  };
}

function overviewWith(
  axes: TrainingsAxisOverviewDto[],
  lastSimulation: TrainingsLastSimulationDto | null = null,
): TrainingsOverviewDto {
  return { ...EMPTY_OVERVIEW, axes, lastSimulation };
}

function lastSimulationAt(globalScore: number): TrainingsLastSimulationDto {
  return {
    sessionId: 'session-exam',
    globalScore,
    globalBand: ScoreBand.EXCELLENT,
    isAdmissible: true,
    isEliminated: false,
    verdict: SimulationVerdict.FAVORABLE,
    sectorThreshold: 70,
    completedAt: '2026-09-30T10:00:00.000Z',
  };
}

const TRANSVERSE_AND_LOWER_TIERS: BadgeId[] = BADGE_CATALOG.filter(
  ({ family, tier }) =>
    family === BadgeFamily.TRANSVERSE ||
    (family === BadgeFamily.AXIS && tier !== BadgeTier.GOLD),
).map(({ id }) => id);

const OVERVIEW_FAILURE = 'failure';

function closestConditionLabels(closest: HTMLElement): string[] {
  return Array.from<HTMLElement>(
    closest.querySelectorAll('.badges__closest-condition'),
  ).map((condition) => condition.textContent?.trim() ?? '');
}

async function setup(
  statuses: BadgeStatusDto[],
  overview: TrainingsOverviewDto | typeof OVERVIEW_FAILURE = EMPTY_OVERVIEW,
): Promise<ComponentFixture<BadgesPage>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [BadgesPage],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BadgesPage);
  fixture.detectChanges();
  const controller = TestBed.inject(HttpTestingController);
  controller.expectOne('/api/me/badges').flush(statuses);
  const overviewRequest = controller.expectOne((request) =>
    request.url.includes('/me/trainings/overview'),
  );
  if (overview === OVERVIEW_FAILURE) {
    overviewRequest.flush('indisponible', {
      status: 500,
      statusText: 'Server Error',
    });
  } else {
    overviewRequest.flush(overview);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('BadgesPage', () => {
  it('renders the three families with the catalog wording', async () => {
    const fixture = await setup(catalogStatuses());
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Axes');
    expect(text).toContain('Examen blanc');
    expect(text).toContain('Transverses');
    expect(text).toContain('Meilleur score ≥ 70');
    expect(text).toContain('Toutes les réponses correctes');
    expect(text).toContain('Aucune sortie de couloir');
    expect(text).toContain('Aucun contact avec les bords');
    expect(text).toContain('Score ≥ 95');
    expect(text).toContain('Avis favorable');
    expect(text).toContain('Dans le même examen :');
    expect(text).toContain('0');
    expect(text).toContain('sur 21 badges');
  });

  it('desaturates every asset while nothing is earned', async () => {
    const fixture = await setup(catalogStatuses());
    const arts = fixture.nativeElement.querySelectorAll('.badge-art');
    const locked = fixture.nativeElement.querySelectorAll('.badge-art--locked');
    expect(arts.length).toBeGreaterThan(0);
    expect(locked.length).toBe(arts.length);
    expect(fixture.nativeElement.textContent).toContain(
      'Aucun palier obtenu pour le moment',
    );
  });

  it('shows bolt gains exactly where the catalog grants energy', async () => {
    const fixture = await setup(catalogStatuses());
    const text = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('· +1');
    expect(text).toContain('· +2');
    expect(text).toContain('· +3');
    expect(text).not.toContain('Bronze · +');
    expect(text).not.toContain('crédits offerts');
    const stepGains = fixture.nativeElement.querySelectorAll(
      '.tier-row__step-gain ui-axis-icon',
    );
    expect(stepGains.length).toBeGreaterThan(0);
    const transGains = fixture.nativeElement.querySelectorAll(
      '.trans-row__gain ui-axis-icon',
    );
    expect(transGains).toHaveLength(3);
  });

  it('reveals dates and the earned-only rarity without any maximal tier note', async () => {
    const fixture = await setup(
      catalogStatuses({
        [BadgeId.LOGIC_PROGRESSION]: {
          earnedAt: '2026-07-12T10:00:00.000Z',
          rarityPercent: 41,
        },
        [BadgeId.MEMORY_PROGRESSION]: { earnedAt: '2026-07-18T10:00:00.000Z' },
        [BadgeId.MEMORY_EXCELLENCE]: { earnedAt: '2026-07-25T10:00:00.000Z' },
        [BadgeId.MEMORY_PERFECTION]: {
          earnedAt: '2026-07-31T10:00:00.000Z',
          rarityPercent: 6,
        },
        [BadgeId.EXAM_FAVORABLE]: {
          earnedAt: '2026-08-03T10:00:00.000Z',
          rarityPercent: 28,
        },
        [BadgeId.SECTOR_MASTERY]: { rarityPercent: 11 },
      }),
    );
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Obtenu le 12/07/2026');
    expect(text).not.toContain('Palier maximal');
    expect(text).toContain("28% des candidats l'ont obtenu");
    expect(text).toContain("6% des candidats l'ont obtenu");
    expect(text).not.toContain('11 %');
  });

  it('sums the credited energy from the real catalog rewards', async () => {
    const fixture = await setup(
      catalogStatuses({
        [BadgeId.FIRST_STEPS]: { earnedAt: '2026-07-08T10:00:00.000Z' },
        [BadgeId.EXAM_FAVORABLE]: { earnedAt: '2026-08-03T10:00:00.000Z' },
      }),
    );
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('+4');
    expect(text).toContain('ajoutés');
    expect(text).toContain('Encore +21 à gagner');
  });

  it('puts the free guide reading before the discovery mode and any paid session', async () => {
    const fixture = await setup(
      catalogStatuses({
        [BadgeId.FIRST_STEPS]: firstStepsWithVerifiedAccount(),
      }),
      overviewWith([axisOverview(AxisType.MEMORY, 69)]),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Badge transverse');
    expect(closest.textContent).not.toContain('Averti');
    expect(closest.textContent).toContain('+1');
    expect(closestConditionLabels(closest)).toEqual(
      conditionLabels(BadgeId.WELL_INFORMED),
    );
  });

  it('keeps the remaining discovery action ahead of a one point score gap', async () => {
    const fixture = await setup(
      catalogStatuses({
        [BadgeId.FIRST_STEPS]: firstStepsWithVerifiedAccount(),
        [BadgeId.WELL_INFORMED]: EARNED,
      }),
      overviewWith([axisOverview(AxisType.MEMORY, 69)]),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Badge transverse');
    expect(closest.textContent).not.toContain('Premiers pas');
    expect(closestConditionLabels(closest)).toEqual(
      conditionLabels(BadgeId.FIRST_STEPS),
    );
    expect(
      Array.from<HTMLElement>(
        closest.querySelectorAll('.badges__closest-condition'),
      ).map((condition) =>
        condition.classList.contains('badges__closest-condition--met'),
      ),
    ).toEqual([true, false]);
    expect(closest.textContent).toContain(
      'Un exercice en mode découverte terminé',
    );
    expect(closest.textContent).toContain('+2');
    expect(
      closest.querySelector('.badges__closest-gain ui-axis-icon'),
    ).not.toBeNull();
  });

  it('picks the smallest real score gap once the free actions are done, without spoiling the name', async () => {
    const fixture = await setup(
      catalogStatuses(earnedOnly([BadgeId.FIRST_STEPS, BadgeId.WELL_INFORMED])),
      overviewWith([axisOverview(AxisType.MEMORY, 65, true)]),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Mémoire · palier Bronze');
    expect(closest.textContent).not.toContain('Tête bien pleine');
    expect(closest.textContent).toContain(
      'Votre meilleur score 65 · plus que 5 points',
    );
  });

  it('never proposes a gold tier before the bronze of an untried axis', async () => {
    const fixture = await setup(
      catalogStatuses(
        earnedOnly([
          BadgeId.FIRST_STEPS,
          BadgeId.WELL_INFORMED,
          BadgeId.REACTIVITY_PROGRESSION,
          BadgeId.REACTIVITY_EXCELLENCE,
        ]),
      ),
      overviewWith([axisOverview(AxisType.REACTIVITY, 86, true)]),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('palier Bronze');
    expect(closest.textContent).not.toContain('Réactivité · palier Or');
  });

  it('never proposes the memory gold the current training plan cannot prove', async () => {
    expect(isBadgeReachable(BadgeId.MEMORY_PERFECTION)).toBe(false);
    const fixture = await setup(
      catalogStatuses(
        earnedOnly(
          BADGE_CATALOG.map(({ id }) => id).filter(
            (id) => id !== BadgeId.MEMORY_PERFECTION,
          ),
        ),
      ),
      overviewWith([axisOverview(AxisType.MEMORY, 100)]),
    );
    expect(fixture.nativeElement.querySelector('.badges__closest')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Tous les badges accessibles sont obtenus',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Encore +');
  });

  it('announces a complete collection once every badge is earned', async () => {
    const fixture = await setup(
      catalogStatuses(earnedOnly(BADGE_CATALOG.map(({ id }) => id))),
    );
    expect(fixture.nativeElement.querySelector('.badges__closest')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Collection complète');
  });

  it('prefers the bronze of an untried axis to the silver of an axis already played', async () => {
    const fixture = await setup(
      catalogStatuses(
        earnedOnly([
          BadgeId.FIRST_STEPS,
          BadgeId.WELL_INFORMED,
          BadgeId.LOGIC_PROGRESSION,
          BadgeId.MEMORY_PROGRESSION,
          BadgeId.DISCRIMINATION_PROGRESSION,
          BadgeId.REACTIVITY_PROGRESSION,
        ]),
      ),
      overviewWith([
        axisOverview(AxisType.LOGIC, 72),
        axisOverview(AxisType.MEMORY, 71, true),
        axisOverview(AxisType.VISUAL_DISCRIMINATION, 72, true),
        axisOverview(AxisType.REACTIVITY, 71, true),
      ]),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Motricité · palier Bronze');
  });

  it('weighs the top exam tier as a proof, behind a gold within three points', async () => {
    const fixture = await setup(
      catalogStatuses(
        earnedOnly([
          ...TRANSVERSE_AND_LOWER_TIERS,
          BadgeId.EXAM_FIRST,
          BadgeId.EXAM_FAVORABLE,
        ]),
      ),
      overviewWith(
        [
          axisOverview(AxisType.LOGIC, 92),
          axisOverview(AxisType.MEMORY, 88, true),
          axisOverview(AxisType.VISUAL_DISCRIMINATION, 90, true),
          axisOverview(AxisType.REACTIVITY, 97, true),
          axisOverview(AxisType.MOTOR_SKILLS, 90),
        ],
        lastSimulationAt(88),
      ),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Réactivité · palier Or');
    expect(closest.textContent).not.toContain('Examen blanc · palier Or');
  });

  it('weighs the lane exit silver like the other silvers, never like a gold', async () => {
    const fixture = await setup(
      catalogStatuses(
        earnedOnly([
          ...TRANSVERSE_AND_LOWER_TIERS.filter(
            (badgeId) => badgeId !== BadgeId.MOTOR_EXCELLENCE,
          ),
          BadgeId.EXAM_FIRST,
        ]),
      ),
      overviewWith([
        axisOverview(AxisType.LOGIC, 90),
        axisOverview(AxisType.MEMORY, 90, true),
        axisOverview(AxisType.VISUAL_DISCRIMINATION, 90, true),
        axisOverview(AxisType.REACTIVITY, 90, true),
        axisOverview(AxisType.MOTOR_SKILLS, 82),
      ]),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Motricité · palier Argent');
  });

  it('rounds and formats the exam progress line in french', async () => {
    const fixture = await setup(
      catalogStatuses(
        earnedOnly([...TRANSVERSE_AND_LOWER_TIERS, BadgeId.EXAM_FIRST]),
      ),
      overviewWith(
        [
          axisOverview(AxisType.LOGIC, 84),
          axisOverview(AxisType.MEMORY, 84, true),
          axisOverview(AxisType.VISUAL_DISCRIMINATION, 84, true),
          axisOverview(AxisType.REACTIVITY, 84, true),
          axisOverview(AxisType.MOTOR_SKILLS, 84),
        ],
        lastSimulationAt(84.6),
      ),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Examen blanc · palier Argent');
    expect(closest.textContent).toContain(
      'Dernier examen à 84,6 · plus que 0,4 point',
    );
  });

  it('still proposes a free badge when the trainings overview fails', async () => {
    const fixture = await setup(catalogStatuses(), OVERVIEW_FAILURE);
    expect(
      fixture.nativeElement.querySelector('.badges__board'),
    ).not.toBeNull();
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Badge transverse');
  });

  it('prefers a measured one point gap to the projection of an untried axis', async () => {
    const fixture = await setup(
      catalogStatuses(
        earnedOnly([
          BadgeId.FIRST_STEPS,
          BadgeId.WELL_INFORMED,
          BadgeId.LOGIC_PROGRESSION,
        ]),
      ),
      overviewWith([
        axisOverview(AxisType.LOGIC, 80),
        axisOverview(AxisType.MEMORY, 69, true),
      ]),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Mémoire · palier Bronze');
    expect(closest.textContent).toContain(
      'Votre meilleur score 69 · plus que 1 point',
    );
  });

  it('never guesses a paid badge when the trainings overview fails', async () => {
    const fixture = await setup(
      catalogStatuses(earnedOnly([BadgeId.FIRST_STEPS, BadgeId.WELL_INFORMED])),
      OVERVIEW_FAILURE,
    );
    expect(fixture.nativeElement.querySelector('.badges__closest')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Indisponible pour le moment',
    );
  });

  it('keeps the footnote pointing to the credit packs', async () => {
    const fixture = await setup(catalogStatuses());
    const footnote = fixture.nativeElement.querySelector('.badges__footnote');
    expect(footnote.textContent).toContain('Besoin de crédits tout de suite ?');
    const link = footnote.querySelector('a');
    expect(link.getAttribute('href')).toBe('/credits');
    expect(link.textContent).toContain('Voir les packs');
  });
});

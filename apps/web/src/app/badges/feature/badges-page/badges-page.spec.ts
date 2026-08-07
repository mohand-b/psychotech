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
  BadgeId,
  BadgeStatusDto,
  Sector,
  TrainingsOverviewDto,
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

async function setup(
  statuses: BadgeStatusDto[],
  overview: TrainingsOverviewDto = EMPTY_OVERVIEW,
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
  controller
    .expectOne((request) => request.url.includes('/me/trainings/overview'))
    .flush(overview);
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
    expect(text).toContain('Score parfait de 100');
    expect(text).toContain('Terminer un premier examen blanc');
    expect(text).toContain('0');
    expect(text).toContain('sur 20 badges');
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
    expect(transGains).toHaveLength(2);
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
    expect(text).toContain("28 % des candidats l'ont obtenu");
    expect(text).toContain("6 % des candidats l'ont obtenu");
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

  it('picks the cheapest remaining actions when no score is close', async () => {
    const definition = BADGE_BY_ID.get(BadgeId.FIRST_STEPS);
    const fixture = await setup(
      catalogStatuses({
        [BadgeId.FIRST_STEPS]: {
          conditions: (definition?.conditions ?? []).map(
            (condition, index) => ({
              id: condition.id,
              label: condition.label,
              met: index === 0,
            }),
          ),
        },
      }),
    );
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Premiers pas');
    expect(closest.textContent).toContain('Un tutoriel terminé');
    expect(closest.textContent).toContain('+2');
    expect(closest.querySelector('.badges__closest-gain ui-axis-icon')).not.toBeNull();
  });

  it('picks the smallest real score gap from the trainings overview', async () => {
    const fixture = await setup(catalogStatuses(), {
      lastSimulation: null,
      vigilanceThreshold: 65,
      axes: [
        {
          axis: AxisType.MEMORY,
          bestScore: 65,
          neverPlayed: false,
          isCriticalAxis: true,
          needsWork: false,
        },
      ],
    });
    const closest = fixture.nativeElement.querySelector('.badges__closest');
    expect(closest.textContent).toContain('Mémoire vive');
    expect(closest.textContent).toContain(
      'Votre meilleur score 65 · plus que 5 points',
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

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  BADGE_BY_ID,
  BADGE_CATALOG,
  BadgeId,
  BadgeStatusDto,
  Sector,
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

async function setup(
  statuses: BadgeStatusDto[],
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
  TestBed.inject(HttpTestingController)
    .expectOne('/api/me/badges')
    .flush(statuses);
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
    expect(text).toContain('+5');
    expect(text).not.toContain('Bronze · +');
    expect(text).not.toContain('énergies créditées');
    const stepGains = fixture.nativeElement.querySelectorAll(
      '.tier-row__step-gain ui-bolt',
    );
    expect(stepGains.length).toBeGreaterThan(0);
    const transGains = fixture.nativeElement.querySelectorAll(
      '.trans-row__gain ui-bolt',
    );
    expect(transGains).toHaveLength(1);
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
    expect(text).toContain('+7');
    expect(text).toContain('créditées');
    expect(text).toContain('Encore +15 à gagner');
  });

  it('picks the closest badge from the most advanced unearned conditions', async () => {
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
    expect(closest.textContent).toContain('Un tutoriel découvert');
    expect(closest.textContent).toContain('+5');
    expect(closest.querySelector('.badges__closest-gain ui-bolt')).not.toBeNull();
  });

  it('keeps the rarity footnote with the energy packs link', async () => {
    const fixture = await setup(catalogStatuses());
    const footnote = fixture.nativeElement.querySelector('.badges__footnote');
    expect(footnote.textContent).toContain(
      "La part des candidats n'apparaît que lorsque suffisamment de comptes sont concernés.",
    );
    const link = footnote.querySelector('a');
    expect(link.getAttribute('href')).toBe('/energie');
    expect(link.textContent).toContain('Voir les packs');
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  EnergyStateDto,
  ScoreBand,
  Sector,
  SubscriptionTier,
  TrainingsOverviewDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { TrainingsOverviewFacade } from '../../data-access/trainings-overview.facade';
import { Entrainements } from './entrainements';

function buildOverview(
  overrides: Partial<TrainingsOverviewDto> = {},
): TrainingsOverviewDto {
  return {
    lastSimulation: {
      sessionId: 'session-1',
      globalScore: 74.8,
      globalBand: ScoreBand.ACCEPTABLE,
      isAdmissible: true,
      isEliminated: false,
      sectorThreshold: 70,
      completedAt: '2026-07-11T19:42:00',
    },
    vigilanceThreshold: 65,
    axes: [
      {
        axis: AxisType.LOGIC,
        bestScore: 82,
        neverPlayed: false,
        isCriticalAxis: false,
        needsWork: false,
      },
      {
        axis: AxisType.MEMORY,
        bestScore: 61,
        neverPlayed: false,
        isCriticalAxis: false,
        needsWork: true,
      },
      {
        axis: AxisType.VISUAL_DISCRIMINATION,
        bestScore: 78,
        neverPlayed: false,
        isCriticalAxis: false,
        needsWork: false,
      },
      {
        axis: AxisType.REACTIVITY,
        bestScore: 70,
        neverPlayed: false,
        isCriticalAxis: true,
        needsWork: false,
      },
      {
        axis: AxisType.MOTOR_SKILLS,
        bestScore: null,
        neverPlayed: true,
        isCriticalAxis: false,
        needsWork: false,
      },
    ],
    ...overrides,
  };
}

function buildEnergy(tier: SubscriptionTier): EnergyStateDto {
  return {
    balance: 5,
    capacity: 5,
    tier,
    resetsAt: '2026-07-13T00:00:00',
    canStartFull: true,
    canStartAxis: true,
  };
}

async function setup(
  overview: TrainingsOverviewDto | null,
  options: {
    queryParams?: Record<string, string>;
    tier?: SubscriptionTier;
  } = {},
) {
  const tier = options.tier ?? SubscriptionTier.ESSENTIAL;
  const facade = {
    overview: signal(overview),
    loading: signal(false),
    load: vi.fn(),
  };
  await TestBed.configureTestingModule({
    imports: [Entrainements],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: {
          currentUser: () => ({
            firstName: 'Camille',
            currentSector: Sector.RAILWAY,
          }),
        },
      },
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
      {
        provide: EnergyFacade,
        useValue: { state: signal(buildEnergy(tier)) },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: of(convertToParamMap(options.queryParams ?? {})),
          snapshot: {
            queryParamMap: convertToParamMap(options.queryParams ?? {}),
          },
        },
      },
    ],
  })
    .overrideComponent(Entrainements, {
      set: {
        providers: [{ provide: TrainingsOverviewFacade, useValue: facade }],
      },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(Entrainements);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, facade, navigate };
}

function text(element: Element | null): string {
  return element?.textContent?.trim() ?? '';
}

describe('Entrainements', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-07-12T16:18:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the simulation panel by default and shows the last bilan', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const panels = element.querySelectorAll('.duo__panel');
    expect(panels[0].classList.contains('duo__panel--open')).toBe(true);
    expect(panels[1].classList.contains('duo__panel--open')).toBe(false);
    expect(text(element.querySelector('.duo__bilan-value'))).toBe('74,8');
  });

  it('deep-links to the targeted panel with ?panel=cible', async () => {
    const { fixture } = await setup(buildOverview(), {
      queryParams: { panel: 'cible' },
    });
    const element: HTMLElement = fixture.nativeElement;
    const panels = element.querySelectorAll('.duo__panel');
    expect(panels[1].classList.contains('duo__panel--open')).toBe(true);
  });

  it('switches panels when clicking the opposite pitch', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const pitches = element.querySelectorAll<HTMLElement>('.duo__pitch');
    pitches[1].click();
    fixture.detectChanges();
    const panels = element.querySelectorAll('.duo__panel');
    expect(panels[1].classList.contains('duo__panel--open')).toBe(true);
    expect(panels[0].classList.contains('duo__panel--open')).toBe(false);
  });

  it('renders a never-played axis with an empty bar and a grey dash', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const rows = element.querySelectorAll('.duo__axis');
    expect(rows[4].querySelector('.duo__axis-dash')).not.toBeNull();
  });

  it('shows the first-time empty state without a completed simulation', async () => {
    const { fixture } = await setup(buildOverview({ lastSimulation: null }));
    const element: HTMLElement = fixture.nativeElement;
    expect(text(element.querySelector('.duo__empty-title'))).toBe(
      'Pas encore de bilan',
    );
  });

  it('links each axis row to its targeted preparation screen', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const first = element.querySelector('.duo__axis');
    expect(first?.getAttribute('href')).toBe('/entrainements/cible/logique');
  });

  it('navigates to the simulation configuration from the CTA', async () => {
    const { fixture, navigate } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    (element.querySelector('.duo__cta button') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/entrainements/simulation']);
  });

  it('links every tutorial card to the axis tutorial flow', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const cards = element.querySelectorAll('.tut__card');
    expect(cards).toHaveLength(5);
    expect(cards[0].getAttribute('href')).toBe(
      '/entrainements/tutoriel/logique',
    );
  });

  it('shows the recharge countdown for the essential plan only', async () => {
    const essential = await setup(buildOverview(), {
      tier: SubscriptionTier.ESSENTIAL,
    });
    expect(
      text(
        essential.fixture.nativeElement.querySelector('.trainings__footnote'),
      ),
    ).toContain('Recharge complète dans 7 h 42, à minuit.');

    TestBed.resetTestingModule();
    const unlimited = await setup(buildOverview(), {
      tier: SubscriptionTier.UNLIMITED,
    });
    expect(
      text(
        unlimited.fixture.nativeElement.querySelector('.trainings__footnote'),
      ),
    ).not.toContain('Recharge complète');
  });

  describe('offre Découverte', () => {
    it('replaces the sliding panels with the central offer block', async () => {
      const { fixture } = await setup(buildOverview(), {
        tier: SubscriptionTier.FREE,
      });
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('.duo__offer')).not.toBeNull();
      expect(element.querySelector('.duo__panel')).toBeNull();
      expect(element.querySelector('.duo__hint')).toBeNull();
      expect(text(element.querySelector('.duo__offer-title'))).toBe(
        'Vous êtes en offre Découverte',
      );
      expect(
        element
          .querySelector('.duo__offer ui-button')
          ?.getAttribute('routerlink'),
      ).toBe('/offres');
    });

    it('locks both pitches symmetrically and disables the panel toggle', async () => {
      const { fixture } = await setup(buildOverview(), {
        tier: SubscriptionTier.FREE,
      });
      const element: HTMLElement = fixture.nativeElement;
      const locked = element.querySelectorAll('.duo__locked');
      expect(locked).toHaveLength(2);
      expect(element.querySelector('.duo__cta button')).toBeNull();
      const pitches = element.querySelectorAll<HTMLElement>('.duo__pitch');
      pitches[1].click();
      fixture.detectChanges();
      expect(element.querySelector('.duo__panel--open')).toBeNull();
    });

    it('locks both mobile pitch cards and shows the offer card', async () => {
      const { fixture } = await setup(buildOverview(), {
        tier: SubscriptionTier.FREE,
      });
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelectorAll('.trainm__locked')).toHaveLength(2);
      expect(element.querySelector('.trainm__offer')).not.toBeNull();
      expect(element.querySelectorAll('.trainm__axis')).toHaveLength(0);
    });

    it('keeps the tutorial band available', async () => {
      const { fixture } = await setup(buildOverview(), {
        tier: SubscriptionTier.FREE,
      });
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelectorAll('.tut__card')).toHaveLength(5);
    });
  });
});

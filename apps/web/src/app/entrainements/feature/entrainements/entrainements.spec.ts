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

  it('shows the axes view by default and slides to the bilan on toggle', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const axesSlide = element.querySelector('.tri__slide--axes');
    const bilanSlide = element.querySelector('.tri__slide--bilan');
    expect(axesSlide?.classList.contains('tri__slide--hidden-left')).toBe(
      false,
    );
    expect(bilanSlide?.classList.contains('tri__slide--hidden-right')).toBe(
      true,
    );
    (element.querySelector('.tri__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(axesSlide?.classList.contains('tri__slide--hidden-left')).toBe(true);
    expect(bilanSlide?.classList.contains('tri__slide--hidden-right')).toBe(
      false,
    );
  });

  it('deep-links to the bilan view with ?panel=sim', async () => {
    const { fixture } = await setup(buildOverview(), {
      queryParams: { panel: 'sim' },
    });
    const element: HTMLElement = fixture.nativeElement;
    expect(
      element
        .querySelector('.tri__slide--bilan')
        ?.classList.contains('tri__slide--hidden-right'),
    ).toBe(false);
  });

  it('renders the last bilan with its detail link', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    expect(text(element.querySelector('.tri__bilan-value'))).toBe('74,8');
    expect(text(element.querySelector('.tri__bilan-badge'))).toContain(
      'Acceptable',
    );
    expect(
      element.querySelector('.tri__bilan-link')?.getAttribute('href'),
    ).toBe('/sessions/session-1/resultat');
  });

  it('shows the axis badges provided by the overview', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const badges = Array.from(element.querySelectorAll('.tri__axis-badge')).map(
      (badge) => text(badge),
    );
    expect(badges).toContain('À travailler');
    expect(badges).toContain('Axe critique');
  });

  it('renders a never-played axis with a dash instead of a score', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const rows = element.querySelectorAll('.tri__axis');
    expect(rows[4].querySelector('.tri__axis-dash')).not.toBeNull();
  });

  it('links each axis row to its targeted preparation screen', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    const first = element.querySelector('.tri__axis');
    expect(first?.getAttribute('href')).toBe('/entrainements/cible/logique');
  });

  it('navigates to the simulation configuration from the CTA', async () => {
    const { fixture, navigate } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    (element.querySelector('.tri__cta button') as HTMLButtonElement).click();
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
    it('replaces the volet with the offer panel and hides the toggle', async () => {
      const { fixture } = await setup(buildOverview(), {
        tier: SubscriptionTier.FREE,
      });
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('.tri__offer')).not.toBeNull();
      expect(element.querySelector('.tri__slide--axes')).toBeNull();
      expect(element.querySelector('.tri__toggle')).toBeNull();
      expect(text(element.querySelector('.tri__offer-title'))).toBe(
        'Vous êtes en offre Découverte',
      );
    });

    it('locks both pitches and links to the offers page', async () => {
      const { fixture } = await setup(buildOverview(), {
        tier: SubscriptionTier.FREE,
      });
      const element: HTMLElement = fixture.nativeElement;
      const locked = element.querySelectorAll('.tri__locked');
      expect(locked).toHaveLength(2);
      expect(element.querySelector('.tri__cta button')).toBeNull();
      expect(
        element
          .querySelector('.tri__offer ui-button')
          ?.getAttribute('routerlink'),
      ).toBe('/offres');
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

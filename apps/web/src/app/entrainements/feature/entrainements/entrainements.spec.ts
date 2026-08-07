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
  ScoreBand,
  Sector,
  SimulationVerdict,
  TrainingsOverviewDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
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
      verdict: SimulationVerdict.FAVORABLE,
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

async function setup(
  overview: TrainingsOverviewDto | null,
  options: {
    queryParams?: Record<string, string>;
    error?: unknown;
  } = {},
) {
  const facade = {
    overview: signal(overview),
    loading: signal(false),
    error: signal(options.error),
    load: vi.fn(),
    reload: vi.fn(),
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
    expect(navigate).toHaveBeenCalledWith(['/entrainements/examen-blanc']);
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

  it('keeps the discovery band with one try per axis', async () => {
    const { fixture } = await setup(buildOverview());
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.tut__try')).toHaveLength(5);
  });

  it('keeps the footnote free of any recharge countdown', async () => {
    const { fixture } = await setup(buildOverview());
    const footnote = text(
      fixture.nativeElement.querySelector('.trainings__footnote'),
    );
    expect(footnote).toContain(
      "Chaque entraînement génère de nouveaux exercices. Les crédits sont débités au lancement.",
    );
    expect(footnote).not.toContain('Recharge complète dans');
  });

  describe('loaders', () => {
    it('renders locked-size skeletons while the overview loads', async () => {
      const { fixture } = await setup(null);
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('.duo__skeleton-score')).not.toBeNull();
      expect(element.querySelectorAll('.duo__axis--skeleton')).toHaveLength(5);
      expect(element.querySelectorAll('.duo__skeleton-tile')).toHaveLength(5);
      expect(element.textContent).not.toContain('Pas encore de bilan');
    });

    it('replaces the skeletons once the overview arrives', async () => {
      const { fixture } = await setup(buildOverview());
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('ui-skeleton')).toBeNull();
      expect(element.querySelectorAll('.duo__axis')).toHaveLength(5);
    });

    it('offers a retry when the overview fails to load', async () => {
      const { fixture, facade } = await setup(null, {
        error: new Error('boom'),
      });
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('ui-skeleton')).toBeNull();
      expect(element.textContent).toContain('Impossible de charger');
      (element.querySelector('.duo__retry') as HTMLButtonElement).click();
      expect(facade.reload).toHaveBeenCalled();
    });
  });
});

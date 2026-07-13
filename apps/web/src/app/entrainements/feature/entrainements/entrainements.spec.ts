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
  queryParams: Record<string, string> = {},
) {
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
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: of(convertToParamMap(queryParams)),
          snapshot: { queryParamMap: convertToParamMap(queryParams) },
        },
      },
    ],
  })
    .overrideComponent(Entrainements, {
      set: { providers: [{ provide: TrainingsOverviewFacade, useValue: facade }] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(Entrainements);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, facade, navigate };
}

describe('Entrainements', () => {
  it('opens the simulation panel by default and shows the last bilan', async () => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-07-12T10:00:00'),
    });
    try {
      const { fixture } = await setup(buildOverview());
      const panels = fixture.nativeElement.querySelectorAll('.duo__panel');
      expect(panels[0].classList.contains('duo__panel--open')).toBe(true);
      expect(panels[1].classList.contains('duo__panel--open')).toBe(false);
      expect(
        fixture.nativeElement.querySelector('.duo__bilan-value').textContent,
      ).toBe('74,8');
      expect(fixture.nativeElement.textContent).toContain('+4,8');
      expect(fixture.nativeElement.textContent).toContain('Hier, 19:42');
    } finally {
      vi.useRealTimers();
    }
  });

  it('deep-links to the targeted panel with ?panel=cible', async () => {
    const { fixture } = await setup(buildOverview(), { panel: 'cible' });
    const panels = fixture.nativeElement.querySelectorAll('.duo__panel');
    expect(panels[0].classList.contains('duo__panel--open')).toBe(false);
    expect(panels[1].classList.contains('duo__panel--open')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Choisissez votre axe ci-contre',
    );
  });

  it('switches panels when clicking the opposite pitch', async () => {
    const { fixture } = await setup(buildOverview());
    const pitches = fixture.nativeElement.querySelectorAll('.duo__pitch');
    (pitches[1] as HTMLElement).click();
    fixture.detectChanges();
    const panels = fixture.nativeElement.querySelectorAll('.duo__panel');
    expect(panels[1].classList.contains('duo__panel--open')).toBe(true);
    (pitches[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelectorAll('.duo__panel')[0]
        .classList.contains('duo__panel--open'),
    ).toBe(true);
  });

  it('renders a never-played axis with an empty bar and a grey dash', async () => {
    const { fixture } = await setup(buildOverview());
    const rows = [...fixture.nativeElement.querySelectorAll('.duo__axis')];
    const motorRow = rows[4];
    const fill = motorRow.querySelector('.duo__axis-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
    expect(motorRow.querySelector('.duo__axis-dash')).not.toBeNull();
    expect(motorRow.textContent).not.toContain('Jamais joué');
  });

  it('shows the first-time empty state without a completed simulation', async () => {
    const { fixture } = await setup(buildOverview({ lastSimulation: null }));
    expect(fixture.nativeElement.textContent).toContain('Pas encore de bilan');
    expect(fixture.nativeElement.textContent).toContain(
      "Votre bilan s'affichera ici après votre première simulation complète",
    );
    expect(fixture.nativeElement.querySelector('.duo__bilan-value')).toBeNull();
  });

  it('links each axis row to its targeted preparation screen', async () => {
    const { fixture } = await setup(buildOverview());
    const memoryRow = [
      ...fixture.nativeElement.querySelectorAll('a.duo__axis'),
    ][1] as HTMLAnchorElement;
    expect(memoryRow.getAttribute('href')).toBe('/entrainements/cible/memoire');
  });

  it('navigates to the simulation configuration from the CTA', async () => {
    const { fixture, navigate } = await setup(buildOverview());
    (
      fixture.nativeElement.querySelector(
        '.duo__cta ui-button button',
      ) as HTMLElement
    ).click();
    expect(navigate).toHaveBeenCalledWith(['/entrainements/simulation']);
  });
});

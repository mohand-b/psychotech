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
  SimulationSummaryDto,
  SimulationThresholdKind,
  TargetedLogicResultDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { SimulationSummaryFacade } from '../../data-access/simulation-summary.facade';
import { SimulationSummary } from './simulation-summary';

const AXIS_ORDER = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

const CRITICAL_AXES = new Set([
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
]);

function buildSummary(
  overrides: Partial<SimulationSummaryDto> = {},
): SimulationSummaryDto {
  return {
    sessionId: 'session-1',
    sector: Sector.RAILWAY,
    completedAt: '2026-07-12T10:30:00.000Z',
    globalScore: 74.8,
    globalBand: ScoreBand.ACCEPTABLE,
    isAdmissible: true,
    isEliminated: false,
    admissibilityThreshold: 70,
    admissibilityGap: 4.8,
    eliminatoryAxes: [],
    axes: AXIS_ORDER.map((axis) => ({
      axis,
      score: 75,
      band: ScoreBand.ACCEPTABLE,
      isCritical: CRITICAL_AXES.has(axis),
      eliminatoryThreshold: CRITICAL_AXES.has(axis) ? 55 : null,
      vigilanceThreshold: 65,
      observables: [{ label: null, value: '38/40', caption: 'items' }],
    })),
    selection: {
      strengths: [
        { axis: AxisType.MOTOR_SKILLS, score: 88, band: ScoreBand.EXCELLENT },
      ],
      weaknesses: [
        {
          axis: AxisType.MEMORY,
          score: 60,
          band: ScoreBand.FRAGILE,
          thresholdKind: SimulationThresholdKind.VIGILANCE,
          thresholdValue: 65,
        },
      ],
      recommendations: [
        { axis: AxisType.MEMORY, label: 'Consolidez la mémoire de travail' },
      ],
    },
    ...overrides,
  };
}

const LOGIC_DETAIL: TargetedLogicResultDto = {
  sessionId: 'session-1',
  sector: Sector.RAILWAY,
  seed: 'seed',
  helpEnabled: false,
  score: 82,
  band: ScoreBand.EXCELLENT,
  startedAt: '2026-07-12T10:00:00.000Z',
  completedAt: '2026-07-12T10:10:00.000Z',
  bestScore: 82,
  isNewBest: false,
  isEqualBest: false,
  previousScore: null,
  axis: AxisType.LOGIC,
  items: [],
};

async function setup(summary: SimulationSummaryDto) {
  const facade = {
    loadSummary: vi.fn().mockReturnValue(of(summary)),
    loadAxisDetail: vi.fn().mockReturnValue(of(LOGIC_DETAIL)),
  };
  await TestBed.configureTestingModule({
    imports: [SimulationSummary],
    providers: [
      provideRouter([]),
      { provide: SimulationSummaryFacade, useValue: facade },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ sessionId: 'session-1' }) },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(SimulationSummary);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, facade, navigate };
}

describe('SimulationSummary', () => {
  it('renders the global score with a french comma and one decimal', async () => {
    const { fixture } = await setup(buildSummary());
    const score = fixture.nativeElement.querySelector('.bilan__score');
    expect(score.textContent.trim()).toBe('74,8');
    expect(fixture.nativeElement.textContent).toContain('+4,8 au-dessus');
  });

  it('shows the eliminatory line and unfavourable verdict only when an axis eliminates', async () => {
    const { fixture } = await setup(buildSummary());
    expect(
      fixture.nativeElement.querySelector('.bilan__eliminatory'),
    ).toBeNull();

    const eliminated = await (async () => {
      TestBed.resetTestingModule();
      return setup(
        buildSummary({
          isEliminated: true,
          isAdmissible: false,
          eliminatoryAxes: [AxisType.REACTIVITY],
        }),
      );
    })();
    const line = eliminated.fixture.nativeElement.querySelector(
      '.bilan__eliminatory',
    );
    expect(line).not.toBeNull();
    expect(line.textContent).toContain('Réactivité');
    expect(
      eliminated.fixture.nativeElement.querySelector('.bilan__verdict')
        .textContent,
    ).toContain('Défavorable');
    expect(
      eliminated.fixture.nativeElement.querySelector('.bilan__axis-tag'),
    ).not.toBeNull();
  });

  it('renders a threshold gauge per axis with its own markers', async () => {
    const { fixture } = await setup(buildSummary());
    const gauges = fixture.nativeElement.querySelectorAll(
      '.bilan__axis-row ui-threshold-gauge',
    );
    expect(gauges).toHaveLength(5);
    expect(gauges[0].querySelectorAll('.gauge__marker')).toHaveLength(1);
    expect(gauges[3].querySelectorAll('.gauge__marker')).toHaveLength(2);
    expect(
      gauges[3].querySelector('.gauge__marker--eliminatory'),
    ).not.toBeNull();
  });

  it('keeps a single accordion panel open at a time', async () => {
    const { fixture, facade } = await setup(buildSummary());
    const rows = fixture.nativeElement.querySelectorAll('.bilan__axis-row');

    rows[0].click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('.bilan__axis-detail'),
    ).toHaveLength(1);
    expect(facade.loadAxisDetail).toHaveBeenCalledWith(
      'session-1',
      AxisType.LOGIC,
    );

    rows[1].click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('.bilan__axis-detail'),
    ).toHaveLength(1);

    rows[1].click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('.bilan__axis-detail'),
    ).toHaveLength(0);
  });

  it('navigates to the targeted preparation of the recommended axis', async () => {
    const { fixture, navigate } = await setup(buildSummary());
    const button = [
      ...fixture.nativeElement.querySelectorAll('.bilan__next-card button'),
    ].find((candidate) =>
      (candidate as HTMLButtonElement).textContent?.includes(
        'Entraîner cet axe',
      ),
    ) as HTMLButtonElement;

    button.click();

    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/cible',
      'memoire',
    ]);
  });
});

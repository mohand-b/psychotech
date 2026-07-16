import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  RecommendationPriority,
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
      observables: [],
    })),
    selection: {
      strengths: [
        {
          axis: AxisType.MOTOR_SKILLS,
          score: 88,
          band: ScoreBand.EXCELLENT,
          sublabel: 'Votre meilleur axe de la session',
        },
        {
          axis: AxisType.LOGIC,
          score: 82,
          band: ScoreBand.EXCELLENT,
          sublabel: 'Largement au-dessus du seuil de vigilance',
        },
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
        {
          axis: AxisType.MEMORY,
          findings: [
            {
              id: 'MEMORY_REVERSED_GAP',
              severity: RecommendationPriority.HIGH,
              finding: 'Votre restitution inversée perd 2 éléments',
              recommendation: 'Consolidez la mémoire de travail',
            },
            {
              id: 'MEMORY_LENGTH_CLIFF',
              severity: RecommendationPriority.MEDIUM,
              finding: 'Vous échouez systématiquement au-delà de 6 éléments',
              recommendation: 'Allongez progressivement les séquences',
            },
          ],
        },
        {
          axis: AxisType.REACTIVITY,
          findings: [
            {
              id: 'REACTIVITY_LOW_REGULARITY',
              severity: RecommendationPriority.MEDIUM,
              finding: 'Vos temps de réaction varient de 40 %',
              recommendation: 'Stabilisez vos réactions',
            },
          ],
        },
      ],
    },
    appreciation: {
      lead: [
        { text: 'Votre score global dépasse le seuil Ferroviaire de ', value: false },
        { text: '4,8', value: true },
        {
          text: ' points : votre profil est admissible, avec une marge encore fragile.',
          value: false,
        },
      ],
      detail: [
        { text: 'La Motricité (', value: false },
        { text: '88', value: true },
        { text: ') porte votre résultat.', value: false },
      ],
      priority: {
        axis: AxisType.MEMORY,
        label: 'Travailler la restitution en ordre inversé',
      },
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
  it('renders the global score and gap with french commas', async () => {
    const { fixture } = await setup(buildSummary());
    expect(
      fixture.nativeElement.querySelector('.bilan__score').textContent.trim(),
    ).toBe('74,8');
    expect(fixture.nativeElement.textContent).toContain('+4,8 au-dessus');
  });

  it('renders appreciation paragraphs with mono value segments and the priority line', async () => {
    const { fixture } = await setup(buildSummary());
    const values = [
      ...fixture.nativeElement.querySelectorAll('.bilan__appreciation-value'),
    ].map((node) => (node as HTMLElement).textContent);
    expect(values).toEqual(['4,8', '88']);
    const priority = fixture.nativeElement.querySelector('.bilan__priority');
    expect(priority.textContent).toContain('Priorité');
    expect(priority.textContent).toContain('Mémoire');
    expect(priority.textContent).toContain(
      'Travailler la restitution en ordre inversé',
    );
  });

  it('hides the priority line without recommendation and the next steps band', async () => {
    const { fixture } = await setup(
      buildSummary({
        selection: {
          strengths: [],
          weaknesses: [],
          recommendations: [],
        },
        appreciation: {
          lead: [{ text: 'Lead.', value: false }],
          detail: [{ text: 'Detail.', value: false }],
          priority: null,
        },
      }),
    );
    expect(fixture.nativeElement.querySelector('.bilan__priority')).toBeNull();
    expect(fixture.nativeElement.querySelector('.bilan__next')).toBeNull();
  });

  it('places an eliminatory marker only on axes owning an eliminatory threshold', async () => {
    const { fixture } = await setup(buildSummary());
    const gauges = fixture.nativeElement.querySelectorAll(
      '.bilan__axis-gauge--desktop',
    );
    expect(gauges).toHaveLength(5);
    expect(gauges[0].querySelectorAll('.gauge__marker')).toHaveLength(0);
    expect(gauges[1].querySelectorAll('.gauge__marker')).toHaveLength(1);
    expect(gauges[3].querySelectorAll('.gauge__marker')).toHaveLength(1);
    expect(gauges[4].querySelectorAll('.gauge__marker')).toHaveLength(0);
  });

  it('shows no observable, no tag, and tints the row of an eliminatory axis', async () => {
    const { fixture } = await setup(
      buildSummary({
        isEliminated: true,
        isAdmissible: false,
        eliminatoryAxes: [AxisType.REACTIVITY],
      }),
    );
    expect(fixture.nativeElement.querySelector('.bilan__axis-tag')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.bilan__observables'),
    ).toBeNull();
    const cards = fixture.nativeElement.querySelectorAll('.bilan__axis-card');
    expect(
      cards[3].classList.contains('bilan__axis-card--eliminatory'),
    ).toBe(true);
    expect(
      cards[0].classList.contains('bilan__axis-card--eliminatory'),
    ).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.bilan__verdict').textContent,
    ).toContain('Défavorable');
  });

  it('renders the strong point sublabels with the /100 score format', async () => {
    const { fixture } = await setup(buildSummary());
    const rows = fixture.nativeElement.querySelectorAll('.bilan__side-row');
    expect(rows[0].textContent).toContain('Votre meilleur axe de la session');
    expect(rows[0].textContent).toContain('88');
    expect(rows[0].querySelector('.bilan__side-score-max').textContent).toBe(
      '/100',
    );
    expect(rows[0].querySelector('.bilan__axis-dot')).toBeNull();
  });

  it('features the first card and renders every cta as an axis-tinted text button', async () => {
    const { fixture } = await setup(buildSummary());
    const cards = fixture.nativeElement.querySelectorAll('.bilan__next-card');
    expect(cards).toHaveLength(2);
    expect(
      cards[0].classList.contains('bilan__next-card--featured'),
    ).toBe(true);
    expect(
      cards[1].classList.contains('bilan__next-card--featured'),
    ).toBe(false);
    const ctas = fixture.nativeElement.querySelectorAll(
      '.bilan__next-cta button',
    );
    expect(ctas[0].className).toContain('ui-button--memory');
    expect(ctas[0].className).toContain('ui-button--ghost');
    expect(ctas[1].className).toContain('ui-button--reactivity');
    expect(ctas[1].className).toContain('ui-button--ghost');
  });

  it('lists each recommended axis findings with the recommendation emphasised', async () => {
    const { fixture } = await setup(buildSummary());
    const cards = fixture.nativeElement.querySelectorAll('.bilan__next-card');
    const memoryFindings = cards[0].querySelectorAll('.bilan__next-finding');
    expect(memoryFindings).toHaveLength(2);
    expect(memoryFindings[0].textContent).toContain(
      'Votre restitution inversée perd 2 éléments.',
    );
    expect(
      memoryFindings[0].querySelector('.bilan__next-action').textContent,
    ).toBe('Consolidez la mémoire de travail');
    expect(
      cards[1].querySelectorAll('.bilan__next-finding'),
    ).toHaveLength(1);
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
    const button = fixture.nativeElement.querySelector(
      '.bilan__next-cta button',
    ) as HTMLButtonElement;

    button.click();

    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/cible',
      'memoire',
    ]);
  });
});

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
  BadgeId,
  ELIMINATORY_AXIS_VERDICT_NOTE,
  LogicFamily,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionDto,
  SimulationSummaryDto,
  SimulationThresholdKind,
  SimulationVerdict,
  SimulationVerdictReasonKind,
  TargetedLogicResultDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { SimulationSummaryFacade } from '../../data-access/simulation-summary.facade';
import { TrainingSessionFacade } from '../../data-access/training-session.facade';
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
    verdict: { verdict: SimulationVerdict.FAVORABLE, reason: null },
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
        {
          text: 'Votre score global dépasse le seuil Ferroviaire de ',
          value: false,
        },
        { text: '4,8', value: true },
        {
          text: ' points : avis favorable, avec une marge encore fragile.',
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

const LOGIC_DETAIL_V2: TargetedLogicResultDto = {
  sessionId: 'session-1',
  sector: Sector.RAILWAY,
  seed: 'seed-v2',
  helpEnabled: false,
  score: 68,
  band: ScoreBand.FRAGILE,
  startedAt: '2026-07-12T10:00:00.000Z',
  completedAt: '2026-07-12T10:10:00.000Z',
  bestScore: 68,
  isNewBest: false,
  isEqualBest: false,
  previousBestScore: null,
  untimed: false,
  axis: AxisType.LOGIC,
  items: [],
  contentVersion: 4,
  logicFamily: null,
  families: [
    {
      family: LogicFamily.NUMERIC,
      correct: 8,
      attempted: 10,
      total: 10,
      ratePct: 80,
      timeMs: 70_000,
      marker: 'STRENGTH',
    },
    {
      family: LogicFamily.MATRIX_II,
      correct: 2,
      attempted: 10,
      total: 10,
      ratePct: 20,
      timeMs: 160_000,
      marker: 'WEAKNESS',
    },
  ],
};

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
  previousBestScore: null,
  untimed: false,
  axis: AxisType.LOGIC,
  items: [],
  contentVersion: 1,
  logicFamily: null,
};

async function setup(
  summary: SimulationSummaryDto,
  detail: TargetedLogicResultDto = LOGIC_DETAIL,
  activeSession: SessionDto | null = null,
) {
  const summarySignal = signal<SimulationSummaryDto | null>(null);
  const facade = {
    summary: summarySignal.asReadonly(),
    loadSummary: vi.fn().mockImplementation(() => {
      summarySignal.set(summary);
      return of(summary);
    }),
    loadAxisDetail: vi.fn().mockReturnValue(of(detail)),
  };
  const acknowledgeAll = vi.fn();
  await TestBed.configureTestingModule({
    imports: [SimulationSummary],
    providers: [
      provideRouter([]),
      { provide: SimulationSummaryFacade, useValue: facade },
      {
        provide: TrainingSessionFacade,
        useValue: { session: signal(activeSession) },
      },
      { provide: BadgesFacade, useValue: { acknowledgeAll } },
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
  return { fixture, facade, navigate, acknowledgeAll };
}

describe('SimulationSummary', () => {
  it('renders the global score and gap with french commas', async () => {
    const { fixture } = await setup(buildSummary());
    expect(
      fixture.nativeElement.querySelector('.bilan__score').textContent.trim(),
    ).toBe('74,8');
    expect(fixture.nativeElement.textContent).toContain('+4,8 au-dessus');
  });

  it('stamps a favorable verdict with its qualifier subline', async () => {
    const { fixture } = await setup(buildSummary());
    const stamp = fixture.nativeElement.querySelector('.bilan__stamp');
    expect(stamp.querySelector('.stamp__main').textContent.trim()).toBe(
      'Favorable',
    );
    expect(stamp.querySelector('.stamp__sub').textContent.trim()).toBe('Juste');
  });

  it('stamps SOLIDE from +15 over the threshold and EXCELLENT from +25', async () => {
    const { fixture } = await setup(
      buildSummary({ globalScore: 85, admissibilityGap: 15 }),
    );
    expect(
      fixture.nativeElement
        .querySelector('.bilan__stamp .stamp__sub')
        .textContent.trim(),
    ).toBe('Solide');
    TestBed.resetTestingModule();
    const excellent = await setup(
      buildSummary({ globalScore: 96.2, admissibilityGap: 26.2 }),
    );
    expect(
      excellent.fixture.nativeElement
        .querySelector('.bilan__stamp .stamp__sub')
        .textContent.trim(),
    ).toBe('Excellent');
  });

  it('stamps ELIMINATOIRE with priority even when the global score clears the threshold', async () => {
    const { fixture } = await setup(
      buildSummary({
        globalScore: 78,
        admissibilityGap: 8,
        isEliminated: true,
        isAdmissible: false,
        verdict: {
          verdict: SimulationVerdict.UNFAVORABLE,
          reason: {
            kind: SimulationVerdictReasonKind.ELIMINATORY_AXES,
            axes: [AxisType.REACTIVITY],
            eliminatoryThreshold: 55,
          },
        },
      }),
    );
    const stamp = fixture.nativeElement.querySelector('.bilan__stamp');
    expect(stamp.querySelector('.stamp__main').textContent.trim()).toBe(
      'Défavorable',
    );
    expect(stamp.querySelector('.stamp__sub').textContent).toContain(
      'Éliminatoire',
    );
  });

  it('explains why an above-threshold examen blanc is still unfavorable', async () => {
    const eliminated = buildSummary({
      globalScore: 78,
      admissibilityGap: 8,
      isEliminated: true,
      isAdmissible: false,
    });
    const { fixture } = await setup(eliminated);
    const note = fixture.nativeElement.querySelector(
      '.bilan__eliminatory-note',
    );
    expect(note.textContent.trim()).toBe(ELIMINATORY_AXIS_VERDICT_NOTE);
  });

  it('hides the eliminatory explanation when no axis is eliminatory', async () => {
    const { fixture } = await setup(buildSummary({ globalScore: 78 }));
    expect(
      fixture.nativeElement.querySelector('.bilan__eliminatory-note'),
    ).toBeNull();
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
    expect(gauges[2].querySelectorAll('.gauge__marker')).toHaveLength(1);
    expect(gauges[3].querySelectorAll('.gauge__marker')).toHaveLength(1);
    expect(gauges[4].querySelectorAll('.gauge__marker')).toHaveLength(0);
  });

  it('shows no observable, no tag, and tints the row of an eliminatory axis', async () => {
    const { fixture } = await setup(
      buildSummary({
        isEliminated: true,
        isAdmissible: false,
        verdict: {
          verdict: SimulationVerdict.UNFAVORABLE,
          reason: {
            kind: SimulationVerdictReasonKind.ELIMINATORY_AXES,
            axes: [AxisType.REACTIVITY],
            eliminatoryThreshold: 55,
          },
        },
        eliminatoryAxes: [AxisType.REACTIVITY],
      }),
    );
    expect(fixture.nativeElement.querySelector('.bilan__axis-tag')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.bilan__observables'),
    ).toBeNull();
    const cards = fixture.nativeElement.querySelectorAll('.bilan__axis-card');
    expect(cards[3].classList.contains('bilan__axis-card--eliminatory')).toBe(
      true,
    );
    expect(cards[0].classList.contains('bilan__axis-card--eliminatory')).toBe(
      false,
    );
    expect(
      fixture.nativeElement.querySelector('.bilan__stamp').textContent,
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
    expect(cards[0].classList.contains('bilan__next-card--featured')).toBe(
      true,
    );
    expect(cards[1].classList.contains('bilan__next-card--featured')).toBe(
      false,
    );
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
    expect(cards[1].querySelectorAll('.bilan__next-finding')).toHaveLength(1);
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

  it('renders the family section and separators in the logic accordion for a v2 simulation', async () => {
    const { fixture } = await setup(buildSummary(), LOGIC_DETAIL_V2);
    (
      fixture.nativeElement.querySelectorAll(
        '.bilan__axis-row',
      )[0] as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('ui-result-family-bars')).not.toBeNull();
    expect(element.textContent).toContain('Par famille');
    expect(element.textContent).toContain('Matrices (déduction)');
    expect(element.querySelectorAll('.chart__boundary').length).toBeGreaterThan(
      0,
    );
  });

  it('omits the family section for a logic session prior to v2 without breaking the chart', async () => {
    const { fixture } = await setup(buildSummary());
    (
      fixture.nativeElement.querySelectorAll(
        '.bilan__axis-row',
      )[0] as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('ui-result-family-bars')).toBeNull();
    expect(element.textContent).not.toContain('Par famille');
    expect(element.querySelector('ui-time-chart')).not.toBeNull();
  });

  it('reveals and acknowledges the badges earned by the completed examen blanc', async () => {
    const newBadges = [{ badgeId: BadgeId.EXAM_FAVORABLE, energyReward: 2 }];
    const activeSession = {
      id: 'session-1',
      sector: Sector.RAILWAY,
      newBadges,
    } as SessionDto;
    const { fixture, acknowledgeAll } = await setup(
      buildSummary(),
      LOGIC_DETAIL,
      activeSession,
    );
    const section = fixture.nativeElement.querySelector('ui-badge-unlock');
    expect(section).not.toBeNull();
    expect(section.textContent).toContain('Badge débloqué');
    expect(section.textContent).toContain('Apte');
    expect(section.textContent).toContain('+2');
    expect(section.querySelector('.unlock__gain ui-axis-icon')).not.toBeNull();
    expect(acknowledgeAll).toHaveBeenCalledWith(newBadges);
  });

  it('hides the badge section when nothing new was earned', async () => {
    const { fixture, acknowledgeAll } = await setup(buildSummary());
    expect(fixture.nativeElement.querySelector('ui-badge-unlock')).toBeNull();
    expect(acknowledgeAll).not.toHaveBeenCalled();
  });

  it('navigates to the targeted preparation of the recommended axis', async () => {
    const { fixture, navigate } = await setup(buildSummary());
    const button = fixture.nativeElement.querySelector(
      '.bilan__next-cta button',
    ) as HTMLButtonElement;

    button.click();

    expect(navigate).toHaveBeenCalledWith(['/entrainements/cible', 'memoire']);
  });
});

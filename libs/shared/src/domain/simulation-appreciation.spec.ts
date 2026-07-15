import { AxisType, RecommendationPriority, ScoreBand } from '../enums';
import { AxisFinding } from '../exercises/axis-findings';
import {
  SimulationAppreciationContext,
  buildSimulationAppreciation,
} from './simulation-appreciation';
import {
  SimulationAxisOutcome,
  SimulationThresholdKind,
  buildSimulationSummary,
} from './simulation-summary';

const THRESHOLDS = { vigilanceThreshold: 65, eliminatoryThreshold: 55 };

function context(
  overrides: Partial<SimulationAppreciationContext> = {},
): SimulationAppreciationContext {
  return {
    sectorLabel: 'Ferroviaire',
    globalScore: 74.8,
    admissibilityThreshold: 70,
    eliminatoryThreshold: 55,
    isEliminated: false,
    ...overrides,
  };
}

function outcome(
  axis: AxisType,
  score: number,
  band: ScoreBand,
  isCritical = false,
): SimulationAxisOutcome {
  return { axis, score, band, isCritical };
}

function plainText(segments: { text: string; value: boolean }[]): string {
  return segments.map(({ text }) => text).join('');
}

const STANDARD_AXES = [
  outcome(AxisType.LOGIC, 82, ScoreBand.EXCELLENT),
  outcome(AxisType.MEMORY, 60, ScoreBand.FRAGILE, true),
  outcome(AxisType.VISUAL_DISCRIMINATION, 78, ScoreBand.ACCEPTABLE, true),
  outcome(AxisType.REACTIVITY, 70, ScoreBand.ACCEPTABLE, true),
  outcome(AxisType.MOTOR_SKILLS, 88, ScoreBand.EXCELLENT),
];

function finding(
  id: string,
  severity: RecommendationPriority = RecommendationPriority.MEDIUM,
): AxisFinding {
  return {
    id,
    severity,
    finding: `constat ${id}`,
    recommendation: `reco ${id}`,
  };
}

const STANDARD_SELECTION = buildSimulationSummary(STANDARD_AXES, THRESHOLDS, [
  { axis: AxisType.MEMORY, findings: [finding('MEMORY_TIMEOUTS')] },
]);

describe('buildSimulationAppreciation', () => {
  it('renders the eliminatory template with the axis score as a value segment', () => {
    const axes = [
      outcome(AxisType.LOGIC, 82, ScoreBand.EXCELLENT),
      outcome(AxisType.MEMORY, 60, ScoreBand.FRAGILE, true),
      outcome(AxisType.VISUAL_DISCRIMINATION, 78, ScoreBand.ACCEPTABLE, true),
      outcome(AxisType.REACTIVITY, 52, ScoreBand.INSUFFICIENT, true),
      outcome(AxisType.MOTOR_SKILLS, 88, ScoreBand.EXCELLENT),
    ];
    const selection = buildSimulationSummary(axes, THRESHOLDS, [
      {
        axis: AxisType.REACTIVITY,
        findings: [finding('REACTIVITY_ANTICIPATIONS')],
      },
    ]);

    const appreciation = buildSimulationAppreciation(
      context({ globalScore: 71.2, isEliminated: true }),
      axes,
      selection,
    );

    expect(plainText(appreciation.lead)).toBe(
      'Votre score global dépasse le seuil Ferroviaire, mais la Réactivité sous son seuil éliminatoire (52 contre 55 requis) rend l’avis défavorable.',
    );
    expect(
      appreciation.lead.filter(({ value }) => value).map(({ text }) => text),
    ).toEqual(['52', '55']);
    expect(plainText(appreciation.detail)).toBe(
      'Vos fondations sont là : la Motricité (88) et la Logique (82) sont solides. En retravaillant la Réactivité en priorité, un avis favorable est à votre portée dès les prochaines sessions.',
    );
    expect(appreciation.priority).toEqual({
      axis: AxisType.REACTIVITY,
      label: 'Stabiliser votre temps de réaction',
    });
  });

  it('enumerates multiple eliminatory axes and their scores', () => {
    const axes = [
      outcome(AxisType.LOGIC, 82, ScoreBand.EXCELLENT),
      outcome(AxisType.MEMORY, 60, ScoreBand.FRAGILE, true),
      outcome(AxisType.VISUAL_DISCRIMINATION, 52, ScoreBand.INSUFFICIENT, true),
      outcome(AxisType.REACTIVITY, 46, ScoreBand.INSUFFICIENT, true),
      outcome(AxisType.MOTOR_SKILLS, 88, ScoreBand.EXCELLENT),
    ];
    const selection = buildSimulationSummary(axes, THRESHOLDS, []);

    const appreciation = buildSimulationAppreciation(
      context({ globalScore: 66.4, isEliminated: true }),
      axes,
      selection,
    );

    expect(plainText(appreciation.lead)).toBe(
      'Votre score global est sous le seuil Ferroviaire, et la Discrimination visuelle et la Réactivité sous leur seuil éliminatoire (52 et 46 contre 55 requis) rendent l’avis défavorable.',
    );
    expect(
      appreciation.lead.filter(({ value }) => value).map(({ text }) => text),
    ).toEqual(['52', '46', '55']);
    expect(appreciation.priority).toBeNull();
  });

  it('renders the admissible template with the signed gap as a value', () => {
    const appreciation = buildSimulationAppreciation(
      context(),
      STANDARD_AXES,
      STANDARD_SELECTION,
    );

    expect(plainText(appreciation.lead)).toBe(
      'Votre score global dépasse le seuil Ferroviaire de 4,8 points : votre profil est admissible, avec une marge encore fragile.',
    );
    expect(
      appreciation.lead.filter(({ value }) => value).map(({ text }) => text),
    ).toEqual(['4,8']);
    expect(plainText(appreciation.detail)).toBe(
      'La Motricité (88) et la Logique (82) portent votre résultat. La Mémoire (60) reste votre principal levier de progression.',
    );
    expect(appreciation.priority).toEqual({
      axis: AxisType.MEMORY,
      label: 'Travailler la restitution en ordre inversé',
    });
  });

  it('renders the below-threshold template', () => {
    const appreciation = buildSimulationAppreciation(
      context({ globalScore: 63.6 }),
      STANDARD_AXES,
      STANDARD_SELECTION,
    );

    expect(plainText(appreciation.lead)).toBe(
      'Votre score global est sous le seuil Ferroviaire de 6,4 points : votre profil n’est pas encore admissible sur cette session.',
    );
  });

  it('skips the foundations sentence without any strength', () => {
    const axes = [
      outcome(AxisType.LOGIC, 62, ScoreBand.FRAGILE),
      outcome(AxisType.MEMORY, 60, ScoreBand.FRAGILE, true),
      outcome(AxisType.VISUAL_DISCRIMINATION, 66, ScoreBand.FRAGILE, true),
      outcome(AxisType.REACTIVITY, 52, ScoreBand.INSUFFICIENT, true),
      outcome(AxisType.MOTOR_SKILLS, 64, ScoreBand.FRAGILE),
    ];
    const selection = buildSimulationSummary(axes, THRESHOLDS, []);

    const appreciation = buildSimulationAppreciation(
      context({ globalScore: 60.1, isEliminated: true }),
      axes,
      selection,
    );

    expect(plainText(appreciation.detail)).toBe(
      'En retravaillant la Réactivité en priorité, un avis favorable est à votre portée dès les prochaines sessions.',
    );
  });

  it('names a finding family shared by several axes in a transversal sentence', () => {
    const findingsByAxis = [
      {
        axis: AxisType.REACTIVITY,
        findings: [
          finding('REACTIVITY_POST_ERROR_SLOWDOWN', RecommendationPriority.HIGH),
        ],
      },
      {
        axis: AxisType.MOTOR_SKILLS,
        findings: [
          finding('MOTRICITY_POST_EXIT_CASCADE', RecommendationPriority.HIGH),
        ],
      },
    ];
    const appreciation = buildSimulationAppreciation(
      context(),
      STANDARD_AXES,
      STANDARD_SELECTION,
      findingsByAxis,
    );

    expect(plainText(appreciation.detail)).toContain(
      'Constat transversal : sur la Réactivité et la Motricité, une erreur vous déstabilise sur les actions qui suivent',
    );
  });

  it('adds no transversal sentence when no family spans several axes', () => {
    const appreciation = buildSimulationAppreciation(
      context(),
      STANDARD_AXES,
      STANDARD_SELECTION,
      [
        {
          axis: AxisType.REACTIVITY,
          findings: [finding('REACTIVITY_IRREGULARITY')],
        },
      ],
    );

    expect(plainText(appreciation.detail)).not.toContain('Constat transversal');
  });

  it('handles an all-green session without weakness nor priority line', () => {
    const axes = [
      outcome(AxisType.LOGIC, 82, ScoreBand.EXCELLENT),
      outcome(AxisType.MEMORY, 84, ScoreBand.EXCELLENT, true),
      outcome(AxisType.VISUAL_DISCRIMINATION, 85, ScoreBand.EXCELLENT, true),
      outcome(AxisType.REACTIVITY, 90, ScoreBand.EXCELLENT, true),
      outcome(AxisType.MOTOR_SKILLS, 88, ScoreBand.EXCELLENT),
    ];
    const selection = buildSimulationSummary(axes, THRESHOLDS, []);

    const appreciation = buildSimulationAppreciation(
      context({ globalScore: 86.2 }),
      axes,
      selection,
    );

    expect(plainText(appreciation.lead)).toContain('marge confortable');
    expect(plainText(appreciation.detail)).toBe(
      'La Réactivité (90) et la Motricité (88) portent votre résultat. Aucun axe ne passe sous un seuil : consolidez cette régularité pour sécuriser votre admissibilité.',
    );
    expect(appreciation.priority).toBeNull();
  });
});

describe('buildSimulationSummary strength sublabels', () => {
  it('labels the best axis then qualifies the vigilance gap', () => {
    const summary = buildSimulationSummary(STANDARD_AXES, THRESHOLDS, []);

    expect(summary.strengths[0]).toMatchObject({
      axis: AxisType.MOTOR_SKILLS,
      sublabel: 'Votre meilleur axe de la session',
    });
    expect(summary.strengths[1]).toMatchObject({
      axis: AxisType.LOGIC,
      sublabel: 'Largement au-dessus du seuil de vigilance',
    });
  });

  it('uses the plain vigilance sublabel under a 15-point gap', () => {
    const axes = [
      outcome(AxisType.LOGIC, 79, ScoreBand.ACCEPTABLE),
      outcome(AxisType.MEMORY, 82, ScoreBand.EXCELLENT, true),
      outcome(AxisType.VISUAL_DISCRIMINATION, 88, ScoreBand.EXCELLENT, true),
      outcome(AxisType.REACTIVITY, 70, ScoreBand.ACCEPTABLE, true),
      outcome(AxisType.MOTOR_SKILLS, 60, ScoreBand.FRAGILE),
    ];

    const summary = buildSimulationSummary(
      axes,
      { vigilanceThreshold: 70, eliminatoryThreshold: 55 },
      [],
    );

    expect(summary.strengths[1]).toMatchObject({
      axis: AxisType.MEMORY,
      score: 82,
      sublabel: 'Au-dessus du seuil de vigilance',
    });
  });
});

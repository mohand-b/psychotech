import { describe, expect, it } from 'vitest';
import { AxisType, RecommendationPriority } from '../enums';
import {
  AXIS_RECOMMENDATIONS_LIMIT,
  AxisFinding,
  crossAxisFindingFamilies,
  getAxisRecommendations,
  sortFindingsBySeverity,
} from './axis-findings';

function finding(
  id: string,
  severity: RecommendationPriority,
): AxisFinding {
  return { id, severity, finding: `constat ${id}`, recommendation: `reco ${id}` };
}

describe('sortFindingsBySeverity', () => {
  it('orders findings high, medium then low', () => {
    const sorted = sortFindingsBySeverity([
      finding('a', RecommendationPriority.LOW),
      finding('b', RecommendationPriority.HIGH),
      finding('c', RecommendationPriority.MEDIUM),
    ]);
    expect(sorted.map(({ id }) => id)).toEqual(['b', 'c', 'a']);
  });

  it('ranks the largest statistical deviation first within a severity level', () => {
    const sorted = sortFindingsBySeverity([
      { ...finding('small', RecommendationPriority.MEDIUM), deviation: 0.2 },
      { ...finding('large', RecommendationPriority.MEDIUM), deviation: 0.9 },
      finding('none', RecommendationPriority.MEDIUM),
      { ...finding('high', RecommendationPriority.HIGH), deviation: 0.1 },
    ]);
    expect(sorted.map(({ id }) => id)).toEqual([
      'high',
      'large',
      'small',
      'none',
    ]);
  });
});

describe('getAxisRecommendations', () => {
  it('keeps the three most severe findings', () => {
    const top = getAxisRecommendations([
      finding('a', RecommendationPriority.LOW),
      finding('b', RecommendationPriority.HIGH),
      finding('c', RecommendationPriority.MEDIUM),
      finding('d', RecommendationPriority.MEDIUM),
      finding('e', RecommendationPriority.HIGH),
    ]);
    expect(top).toHaveLength(AXIS_RECOMMENDATIONS_LIMIT);
    expect(top.map(({ severity }) => severity)).toEqual([
      RecommendationPriority.HIGH,
      RecommendationPriority.HIGH,
      RecommendationPriority.MEDIUM,
    ]);
  });
});

describe('crossAxisFindingFamilies', () => {
  it('detects a family shared by at least two axes and ignores single-axis families', () => {
    const families = crossAxisFindingFamilies([
      {
        axis: AxisType.REACTIVITY,
        findings: [
          finding('REACTIVITY_POST_ERROR_SLOWDOWN', RecommendationPriority.HIGH),
          finding('REACTIVITY_FATIGUE_SLOPE', RecommendationPriority.MEDIUM),
        ],
      },
      {
        axis: AxisType.MOTOR_SKILLS,
        findings: [
          finding('MOTRICITY_POST_EXIT_CASCADE', RecommendationPriority.HIGH),
        ],
      },
      {
        axis: AxisType.LOGIC,
        findings: [finding('LOGIC_SKIPPED_NOT_REVISITED', RecommendationPriority.MEDIUM)],
      },
    ]);
    expect(families).toEqual([
      {
        family: 'POST_ERROR_DISRUPTION',
        axes: [AxisType.REACTIVITY, AxisType.MOTOR_SKILLS],
        occurrences: [
          { axis: AxisType.REACTIVITY, evidence: null },
          { axis: AxisType.MOTOR_SKILLS, evidence: null },
        ],
      },
    ]);
  });

  it('carries each axis measured evidence for the transversal finding', () => {
    const families = crossAxisFindingFamilies([
      {
        axis: AxisType.REACTIVITY,
        findings: [
          {
            ...finding(
              'REACTIVITY_POST_ERROR_SLOWDOWN',
              RecommendationPriority.HIGH,
            ),
            evidence: '0,52 s après erreur contre 0,41 s',
          },
        ],
      },
      {
        axis: AxisType.MOTOR_SKILLS,
        findings: [
          {
            ...finding(
              'MOTRICITY_POST_EXIT_CASCADE',
              RecommendationPriority.HIGH,
            ),
            evidence: '4 erreurs en cascade après une sortie',
          },
        ],
      },
    ]);
    expect(families[0].occurrences).toEqual([
      {
        axis: AxisType.REACTIVITY,
        evidence: '0,52 s après erreur contre 0,41 s',
      },
      {
        axis: AxisType.MOTOR_SKILLS,
        evidence: '4 erreurs en cascade après une sortie',
      },
    ]);
  });

  it('returns nothing when no family spans several axes', () => {
    expect(
      crossAxisFindingFamilies([
        {
          axis: AxisType.REACTIVITY,
          findings: [
            finding('REACTIVITY_FATIGUE_SLOPE', RecommendationPriority.MEDIUM),
          ],
        },
      ]),
    ).toEqual([]);
  });
});

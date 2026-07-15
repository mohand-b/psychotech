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

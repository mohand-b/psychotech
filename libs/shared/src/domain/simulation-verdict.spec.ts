import { describe, expect, it } from 'vitest';
import { AxisType } from '../enums';
import {
  SimulationVerdict,
  SimulationVerdictReasonKind,
  computeSimulationVerdict,
  simulationVerdictFromAdmissibility,
} from './simulation-verdict';

const THRESHOLDS = {
  admissibilityThreshold: 70,
  eliminatoryThreshold: 55,
};

function axis(
  axisType: AxisType,
  score: number,
  isCritical: boolean,
): { axis: AxisType; score: number; isCritical: boolean } {
  return { axis: axisType, score, isCritical };
}

describe('computeSimulationVerdict', () => {
  it('is favorable when the global score passes the threshold and no critical axis is eliminatory', () => {
    const result = computeSimulationVerdict({
      ...THRESHOLDS,
      globalScore: 74.8,
      axes: [
        axis(AxisType.LOGIC, 72, false),
        axis(AxisType.MEMORY, 68, true),
        axis(AxisType.REACTIVITY, 80, true),
      ],
    });
    expect(result.verdict).toBe(SimulationVerdict.FAVORABLE);
    expect(result.reason).toBeNull();
  });

  it('is unfavorable with the named critical axes when they fall under the eliminatory threshold', () => {
    const result = computeSimulationVerdict({
      ...THRESHOLDS,
      globalScore: 76,
      axes: [
        axis(AxisType.MEMORY, 54, true),
        axis(AxisType.REACTIVITY, 40, true),
        axis(AxisType.LOGIC, 50, false),
      ],
    });
    expect(result.verdict).toBe(SimulationVerdict.UNFAVORABLE);
    expect(result.reason).toEqual({
      kind: SimulationVerdictReasonKind.ELIMINATORY_AXES,
      axes: [AxisType.MEMORY, AxisType.REACTIVITY],
      eliminatoryThreshold: 55,
    });
  });

  it('is unfavorable with the measured gap when only the global score falls short', () => {
    const result = computeSimulationVerdict({
      ...THRESHOLDS,
      globalScore: 64.3,
      axes: [
        axis(AxisType.MEMORY, 60, true),
        axis(AxisType.REACTIVITY, 62, true),
      ],
    });
    expect(result.verdict).toBe(SimulationVerdict.UNFAVORABLE);
    expect(result.reason).toEqual({
      kind: SimulationVerdictReasonKind.GLOBAL_SCORE_BELOW_THRESHOLD,
      gap: 5.7,
      admissibilityThreshold: 70,
    });
  });
});

describe('simulationVerdictFromAdmissibility', () => {
  it('maps the persisted admissibility flag onto the binary verdict', () => {
    expect(simulationVerdictFromAdmissibility(true)).toBe(
      SimulationVerdict.FAVORABLE,
    );
    expect(simulationVerdictFromAdmissibility(false)).toBe(
      SimulationVerdict.UNFAVORABLE,
    );
  });
});

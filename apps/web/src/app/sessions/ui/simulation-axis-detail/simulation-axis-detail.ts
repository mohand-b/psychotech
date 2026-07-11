import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  AxisType,
  TargetedAxisResultDto,
  TrainingRecommendation,
  generateDiscriminationSession,
  generateLogicSession,
  generateMemorySession,
  generateReactivitySession,
  getDiscriminationRecommendation,
  getLogicRecommendation,
  getMemoryRecommendation,
  getMotricityRecommendation,
  getReactivityRecommendation,
  scoreDiscriminationSession,
  scoreLogicSession,
  scoreMemorySession,
  scoreReactivitySession,
} from '@psychotech/shared';
import {
  buildDiscriminationChartEntries,
  buildDiscriminationMetricRows,
  buildLogicChartEntries,
  buildLogicMetricRows,
  buildMemoryMetricRows,
  buildMotricityMetricRows,
  buildReactivityMetricRows,
} from '../../../entrainements/ui/axis-result-content';
import { MemoryReliabilityChart } from '../../../entrainements/ui/memory-reliability-chart/memory-reliability-chart';
import { MotricityTrajectoryChart } from '../../../entrainements/ui/motricity-trajectory-chart/motricity-trajectory-chart';
import { ReactivityTrChart } from '../../../entrainements/ui/reactivity-tr-chart/reactivity-tr-chart';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../../entrainements/ui/result-metrics/result-metrics';
import { ResultRecommendation } from '../../../entrainements/ui/result-recommendation/result-recommendation';
import { ResultTiming } from '../../../entrainements/ui/result-timing/result-timing';
import {
  TimeChart,
  TimeChartEntry,
} from '../../../entrainements/ui/time-chart/time-chart';

@Component({
  selector: 'ui-simulation-axis-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MemoryReliabilityChart,
    MotricityTrajectoryChart,
    ReactivityTrChart,
    ResultMetrics,
    ResultRecommendation,
    ResultTiming,
    TimeChart,
  ],
  templateUrl: './simulation-axis-detail.html',
  styleUrl: './simulation-axis-detail.css',
})
export class SimulationAxisDetail {
  readonly detail = input.required<TargetedAxisResultDto>();

  protected readonly axisTypes = AxisType;

  protected readonly logicScored = computed(() => {
    const detail = this.detail();
    return detail.axis === AxisType.LOGIC
      ? scoreLogicSession(generateLogicSession(detail.seed), detail.items)
      : null;
  });

  protected readonly memoryScored = computed(() => {
    const detail = this.detail();
    return detail.axis === AxisType.MEMORY
      ? scoreMemorySession(generateMemorySession(detail.seed), detail.sequences)
      : null;
  });

  protected readonly discriminationScored = computed(() => {
    const detail = this.detail();
    return detail.axis === AxisType.VISUAL_DISCRIMINATION
      ? scoreDiscriminationSession(
          generateDiscriminationSession(detail.seed),
          detail.trials,
        )
      : null;
  });

  protected readonly reactivityScored = computed(() => {
    const detail = this.detail();
    return detail.axis === AxisType.REACTIVITY
      ? scoreReactivitySession(
          generateReactivitySession(detail.seed),
          detail.stimuli,
          detail.waitPresses,
        )
      : null;
  });

  protected readonly reactivityWaitPresses = computed(() => {
    const detail = this.detail();
    return detail.axis === AxisType.REACTIVITY ? detail.waitPresses : [];
  });

  protected readonly motorMetrics = computed(() => {
    const detail = this.detail();
    return detail.axis === AxisType.MOTOR_SKILLS ? detail.metrics : null;
  });

  protected readonly hasMotorTimeline = computed(() => {
    const metrics = this.motorMetrics();
    return (
      metrics !== null &&
      metrics.timeline.some((series) => series.points.length > 0)
    );
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const detail = this.detail();
    switch (detail.axis) {
      case AxisType.LOGIC: {
        const scored = this.logicScored();
        return scored ? buildLogicMetricRows(scored, detail) : [];
      }
      case AxisType.MEMORY: {
        const scored = this.memoryScored();
        return scored ? buildMemoryMetricRows(scored) : [];
      }
      case AxisType.VISUAL_DISCRIMINATION: {
        const scored = this.discriminationScored();
        return scored ? buildDiscriminationMetricRows(scored) : [];
      }
      case AxisType.REACTIVITY: {
        const scored = this.reactivityScored();
        return scored ? buildReactivityMetricRows(scored) : [];
      }
      case AxisType.MOTOR_SKILLS:
        return buildMotricityMetricRows(detail.metrics);
    }
  });

  protected readonly logicChartEntries = computed<TimeChartEntry[]>(() => {
    const detail = this.detail();
    const scored = this.logicScored();
    return detail.axis === AxisType.LOGIC && scored
      ? buildLogicChartEntries(scored, detail)
      : [];
  });

  protected readonly discriminationChartEntries = computed<TimeChartEntry[]>(
    () => {
      const detail = this.detail();
      const scored = this.discriminationScored();
      return detail.axis === AxisType.VISUAL_DISCRIMINATION && scored
        ? buildDiscriminationChartEntries(scored, detail)
        : [];
    },
  );

  protected readonly recommendation = computed<TrainingRecommendation | null>(
    () => {
      const detail = this.detail();
      switch (detail.axis) {
        case AxisType.LOGIC: {
          const scored = this.logicScored();
          return scored ? getLogicRecommendation(scored, detail.items) : null;
        }
        case AxisType.MEMORY: {
          const scored = this.memoryScored();
          return scored ? getMemoryRecommendation(scored) : null;
        }
        case AxisType.VISUAL_DISCRIMINATION: {
          const scored = this.discriminationScored();
          return scored ? getDiscriminationRecommendation(scored) : null;
        }
        case AxisType.REACTIVITY: {
          const scored = this.reactivityScored();
          return scored ? getReactivityRecommendation(scored) : null;
        }
        case AxisType.MOTOR_SKILLS:
          return getMotricityRecommendation(detail.metrics);
      }
    },
  );
}

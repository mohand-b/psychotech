import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  AxisType,
  TargetedAxisResultDto,
  generateDiscriminationSession,
  generateLogicSession,
  generateMemorySession,
  generateReactivitySession,
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
import { ResultMetricRow } from '../../../entrainements/ui/result-metrics/result-metrics';
import {
  TimeChart,
  TimeChartEntry,
} from '../../../entrainements/ui/time-chart/time-chart';

interface AxisDetailContent {
  graphTitle: string;
  caption: string;
}

const DETAIL_CONTENT: Record<string, AxisDetailContent> = {
  [AxisType.LOGIC]: {
    graphTitle: 'Gestion du temps',
    caption:
      'Hauteur = temps passé sur l’item, dans l’ordre de la session. Bleu = juste, rouge = erreur, ambre = passé.',
  },
  [AxisType.MEMORY]: {
    graphTitle: 'Fiabilité par position',
    caption:
      'Taux de restitution correcte par position, toutes séquences confondues.',
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    graphTitle: 'Gestion du temps',
    caption:
      'Hauteur = temps de décision par essai, dans l’ordre de la session. Vert = juste, rouge = erreur.',
  },
  [AxisType.REACTIVITY]: {
    graphTitle: 'Temps de réaction',
    caption:
      'Chaque point est un stimulus, la courbe montre votre tendance au fil de l’épreuve.',
  },
  [AxisType.MOTOR_SKILLS]: {
    graphTitle: 'Maîtrise de trajectoire',
    caption:
      'Distance aux bords au fil de l’épreuve, 0 % au centre, 100 % au contact du bord. Les portions rouges sont les sorties.',
  },
};

@Component({
  selector: 'ui-simulation-axis-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MemoryReliabilityChart,
    MotricityTrajectoryChart,
    ReactivityTrChart,
    TimeChart,
  ],
  templateUrl: './simulation-axis-detail.html',
  styleUrl: './simulation-axis-detail.css',
})
export class SimulationAxisDetail {
  readonly detail = input.required<TargetedAxisResultDto>();

  protected readonly axisTypes = AxisType;

  protected readonly content = computed(
    () => DETAIL_CONTENT[this.detail().axis],
  );

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
}

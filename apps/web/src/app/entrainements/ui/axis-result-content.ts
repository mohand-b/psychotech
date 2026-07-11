import {
  AXIS_TRAINING,
  AxisType,
  ControlModality,
  DiscriminationOutcome,
  DiscriminationSessionScore,
  LogicSessionScore,
  MemoryPhase,
  MemorySessionScore,
  MotorSkillsMetrics,
  ReactivitySessionScore,
  TargetedDiscriminationResultDto,
  TargetedLogicResultDto,
} from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../../shared/ui/axis-presentation';
import { formatDuration } from '../../shared/ui/format-duration';
import { LOGIC_STATUS_COLORS, LOGIC_STATUS_LABELS } from './logic-status';
import { ResultMetricRow } from './result-metrics/result-metrics';
import { TimeChartEntry } from './time-chart/time-chart';

const OUTCOME_LABELS: Record<DiscriminationOutcome, string> = {
  TRUE_POSITIVE: 'Juste',
  TRUE_NEGATIVE: 'Juste',
  FALSE_POSITIVE: 'Répondu "différentes" à tort',
  FALSE_NEGATIVE: 'Répondu "identiques" à tort',
};

const MODALITY_LABELS: Record<ControlModality, string> = {
  [ControlModality.PHONE_GAMEPAD]: 'Manette téléphone',
  [ControlModality.KEYBOARD]: 'Clavier',
  [ControlModality.TOUCH_JOYSTICKS]: 'Tactile',
};

function frenchSeconds(valueMs: number): string {
  return (valueMs / 1000).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function buildLogicMetricRows(
  scored: LogicSessionScore,
  result: TargetedLogicResultDto,
): ResultMetricRow[] {
  const training = AXIS_TRAINING[AxisType.LOGIC];
  const presentation = AXIS_PRESENTATION[AxisType.LOGIC];
  const avg = scored.avgAnswerTimeMs;
  const elapsedSec = Math.round(
    (Date.parse(result.completedAt) - Date.parse(result.startedAt)) / 1000,
  );
  return [
    {
      label: 'Réponses justes',
      value: `${scored.correctCount}`,
      suffix: `/${training.exerciseCount}`,
      dotVar: presentation.plainVar,
    },
    {
      label: 'Erreurs',
      value: `${scored.wrongCount}`,
      dotVar: 'var(--danger)',
    },
    {
      label: 'Passés sans réponse',
      value: `${scored.skippedCount}`,
      dotVar: 'var(--warning)',
    },
    {
      label: 'Non atteints (chrono)',
      value: `${scored.unreachedCount}`,
      dotVar: 'var(--text-disabled)',
    },
    {
      label: 'Temps moyen par réponse',
      value: avg === null ? '-' : frenchSeconds(avg),
      suffix: avg === null ? undefined : ' s',
    },
    {
      label: 'Temps restant à la fin',
      value: formatDuration(
        Math.max(0, training.timer.durationSec - elapsedSec),
      ),
    },
  ];
}

export function buildLogicChartEntries(
  scored: LogicSessionScore,
  result: TargetedLogicResultDto,
): TimeChartEntry[] {
  const timeByIndex = new Map(
    result.items.map((item) => [item.index, item.timeMs]),
  );
  return scored.statuses.map((status, index) => ({
    colorVar: LOGIC_STATUS_COLORS[status],
    label: LOGIC_STATUS_LABELS[status],
    timeMs: status === 'UNREACHED' ? null : (timeByIndex.get(index) ?? null),
  }));
}

export function buildMemoryMetricRows(
  scored: MemorySessionScore,
): ResultMetricRow[] {
  const training = AXIS_TRAINING[AxisType.MEMORY];
  const normalCount = training.sequences.filter(
    ({ phase }) => phase === MemoryPhase.NORMAL,
  ).length;
  const inverseCount = training.sequences.length - normalCount;
  return [
    {
      label: 'Séquences parfaites',
      value: `${scored.perfectCount}`,
      suffix: `/${training.sequences.length}`,
    },
    {
      label: 'Ordre normal',
      value: `${scored.perfectNormalCount}`,
      suffix: `/${normalCount}`,
    },
    {
      label: 'Ordre inversé',
      value: `${scored.perfectInverseCount}`,
      suffix: `/${inverseCount}`,
    },
    {
      label: 'Éléments restitués',
      value: `${scored.restitutedPct}`,
      suffix: ' %',
    },
    {
      label: 'Éléments bien placés',
      value: `${scored.placedPct}`,
      suffix: ' %',
    },
    {
      label: 'Restitutions hors délai',
      value: `${scored.timedOutCount}`,
    },
  ];
}

export function buildDiscriminationMetricRows(
  scored: DiscriminationSessionScore,
): ResultMetricRow[] {
  const training = AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION];
  const presentation = AXIS_PRESENTATION[AxisType.VISUAL_DISCRIMINATION];
  const avg = scored.avgAnswerTimeMs;
  return [
    {
      label: 'Réponses justes',
      value: `${scored.correctCount}`,
      suffix: `/${training.exerciseCount}`,
      dotVar: presentation.plainVar,
    },
    {
      label: 'Répondu "identiques" à tort',
      value: `${scored.wrongIdenticalCount}`,
      dotVar: 'var(--danger)',
    },
    {
      label: 'Répondu "différentes" à tort',
      value: `${scored.wrongDifferentCount}`,
      dotVar: 'var(--danger)',
    },
    {
      label: 'Essais non atteints',
      value: `${scored.unansweredCount}`,
      dotVar: 'var(--text-disabled)',
    },
    {
      label: 'Temps moyen par réponse',
      value: avg === null ? '-' : frenchSeconds(avg),
      suffix: avg === null ? undefined : ' s',
    },
  ];
}

export function buildDiscriminationChartEntries(
  scored: DiscriminationSessionScore,
  result: TargetedDiscriminationResultDto,
): TimeChartEntry[] {
  const presentation = AXIS_PRESENTATION[AxisType.VISUAL_DISCRIMINATION];
  const responseByIndex = new Map(
    result.trials.map((trialAnswer) => [trialAnswer.index, trialAnswer]),
  );
  return scored.outcomes.map((outcome, index) => {
    const response = responseByIndex.get(index);
    const answered = (response?.answer ?? null) !== null;
    if (!answered) {
      return {
        colorVar: 'var(--text-disabled)',
        label: 'Non atteint',
        timeMs: null,
      };
    }
    const correct = outcome === 'TRUE_POSITIVE' || outcome === 'TRUE_NEGATIVE';
    return {
      colorVar: correct ? presentation.plainVar : 'var(--danger)',
      label: OUTCOME_LABELS[outcome],
      timeMs: response?.timeMs ?? null,
    };
  });
}

export function buildReactivityMetricRows(
  scored: ReactivitySessionScore,
): ResultMetricRow[] {
  return [
    {
      label: 'Temps de réaction moyen',
      value: scored.trMoyMs === null ? '-' : `${scored.trMoyMs}`,
      suffix: scored.trMoyMs === null ? undefined : ' ms',
    },
    {
      label: 'Régularité',
      sublabel: "écart entre vos réactions, à structure d'épreuve égale",
      value: scored.sdMs === null ? '-' : `± ${scored.sdMs}`,
      suffix: scored.sdMs === null ? undefined : ' ms',
    },
    {
      label: 'Mauvaises commandes',
      value: `${scored.wrongCommandCount}`,
      dotVar: 'var(--danger)',
      marker: 'dot' as const,
    },
    {
      label: 'Appuis trop tôt',
      value: `${scored.anticipationCount}`,
      dotVar: 'var(--warning)',
      marker: 'outlined-dot' as const,
    },
    {
      label: 'Signaux manqués',
      value: `${scored.omissionCount}`,
      dotVar: 'var(--text-disabled)',
      marker: 'cross' as const,
    },
  ];
}

export function buildMotricityMetricRows(
  metrics: MotorSkillsMetrics,
): ResultMetricRow[] {
  const rows: ResultMetricRow[] = [
    {
      label: 'Erreurs mineures',
      sublabel: 'contacts avec les bords',
      value: `${metrics.minorErrors}`,
      dotVar: 'var(--warning)',
      marker: 'dot' as const,
    },
    {
      label: 'Erreurs majeures',
      sublabel: 'sorties de couloir',
      value: `${metrics.majorErrors}`,
      dotVar: 'var(--danger)',
      marker: 'line' as const,
    },
    {
      label: 'Temps total',
      sublabel: 'sur les 3 parcours',
      value: formatDuration(Math.round(metrics.totalTimeMs / 1000)),
    },
    {
      label: 'Parcours terminés',
      value: `${metrics.coursesCompleted}`,
      suffix: `/${metrics.courses.length || 3}`,
    },
  ];
  if (metrics.controlModality !== null) {
    rows.push({
      label: 'Modalité',
      value: MODALITY_LABELS[metrics.controlModality],
      chip: true,
    });
  }
  return rows;
}

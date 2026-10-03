import {
  AxisType,
  LOGIC_FAMILY_FILTER_LABELS,
  SESSION_MODE_LABELS,
  SessionHistoryItemDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { SIMULATION_VERDICT_PRESENTATION } from '../../../shared/ui/simulation-verdict-presentation';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { resolveVerdictAppearance } from '../../../shared/ui/verdict-appearance';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import {
  DAY_MS,
  capitalizeFirstLetter,
  formatSessionDate,
  computeStartOfWeek,
} from '../../../shared/util/format-session-date';
import {
  buildSimulationResultRoute,
  buildTargetedResultRoute,
} from '../../../shared/util/session-links';

export { formatSessionDate };

export interface SessionHistoryGroup {
  label: string;
  items: SessionHistoryItemDto[];
}

export interface SessionRowView {
  id: string;
  axis: AxisType | null;
  title: string;
  subtitle: string;
  mobileTitle: string;
  familyLabel: string | null;
  untimed: boolean;
  axisCount: number | null;
  dateLabel: string;
  durationLabel: string;
  scoreLabel: string | null;
  dotVar: string | null;
  abandoned: boolean;
  detailLink: string[] | null;
}

const WEEK_MS = 7 * DAY_MS;

export function formatPeriodLabel(finishedAt: Date, now: Date): string {
  const weekStart = computeStartOfWeek(now);
  const finished = finishedAt.getTime();
  if (finished >= weekStart) {
    return 'Cette semaine';
  }
  if (finished >= weekStart - WEEK_MS) {
    return 'Semaine dernière';
  }
  return capitalizeFirstLetter(
    finishedAt.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    }),
  );
}

export function groupSessionsByPeriod(
  items: SessionHistoryItemDto[],
  now: Date,
): SessionHistoryGroup[] {
  const groups: SessionHistoryGroup[] = [];
  for (const item of items) {
    const label = formatPeriodLabel(new Date(item.finishedAt), now);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export function formatSessionDuration(durationSec: number): string {
  return `${Math.max(1, Math.round(durationSec / 60))} min`;
}

export function formatSessionScore(item: SessionHistoryItemDto): string | null {
  if (item.score === null) {
    return null;
  }
  if (item.mode === SessionMode.FULL) {
    return formatFrenchDecimal(item.score);
  }
  return `${Math.round(item.score)}`;
}

export function buildSessionRowView(
  item: SessionHistoryItemDto,
  now: Date,
): SessionRowView {
  const abandoned = item.status === SessionStatus.ABANDONED;
  const sectorLabel = SECTOR_PRESENTATION[item.sector].label;
  const isFull = item.mode === SessionMode.FULL;
  const axisLabel = item.axis ? AXIS_PRESENTATION[item.axis].label : '';
  const detailLink = abandoned
    ? null
    : isFull
      ? buildSimulationResultRoute(item.id)
      : item.axis
        ? buildTargetedResultRoute(item.axis, item.id)
        : null;
  return {
    id: item.id,
    axis: item.axis,
    title: SESSION_MODE_LABELS[item.mode],
    subtitle: sectorLabel,
    mobileTitle: isFull
      ? SESSION_MODE_LABELS[SessionMode.FULL]
      : `Ciblé · ${axisLabel}`,
    familyLabel: item.logicFamily
      ? LOGIC_FAMILY_FILTER_LABELS[item.logicFamily]
      : null,
    untimed: item.untimed,
    axisCount: isFull ? item.axisTotal : null,
    dateLabel: formatSessionDate(item.finishedAt, now),
    durationLabel: formatSessionDuration(item.durationSec),
    scoreLabel: formatSessionScore(item),
    dotVar: item.verdict
      ? SIMULATION_VERDICT_PRESENTATION[item.verdict].colorVar
      : item.score === null
        ? null
        : resolveVerdictAppearance(item.score).colorVar,
    abandoned,
    detailLink,
  };
}

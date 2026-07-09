import {
  AxisType,
  SessionHistoryItemDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { BAND_COLOR_VARS } from '../../../shared/ui/score-rating';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';

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
  dateLabel: string;
  durationLabel: string;
  scoreLabel: string | null;
  dotVar: string | null;
  abandoned: boolean;
  detailLink: string[] | null;
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function startOfWeek(date: Date): number {
  const dayIndexFromMonday = (date.getDay() + 6) % 7;
  return startOfDay(date) - dayIndexFromMonday * DAY_MS;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function periodLabelFor(finishedAt: Date, now: Date): string {
  const weekStart = startOfWeek(now);
  const finished = finishedAt.getTime();
  if (finished >= weekStart) {
    return 'Cette semaine';
  }
  if (finished >= weekStart - WEEK_MS) {
    return 'Semaine dernière';
  }
  return capitalize(
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
    const label = periodLabelFor(new Date(item.finishedAt), now);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export function formatSessionDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (dayDiff === 0) {
    return `Aujourd'hui · ${time}`;
  }
  if (dayDiff === 1) {
    return `Hier · ${time}`;
  }
  if (date.getTime() >= startOfWeek(now)) {
    const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return `${capitalize(weekday)} · ${time}`;
  }
  const day = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day} · ${time}`;
}

export function formatSessionDuration(durationSec: number): string {
  return `${Math.max(1, Math.round(durationSec / 60))} min`;
}

export function formatSessionScore(
  item: SessionHistoryItemDto,
): string | null {
  if (item.score === null) {
    return null;
  }
  if (item.mode === SessionMode.FULL) {
    return item.score.toLocaleString('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
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
      ? ['/sessions', item.id, 'resultat']
      : item.axis
        ? ['/entrainements/cible', item.axis, 'session', item.id, 'resultat']
        : null;
  return {
    id: item.id,
    axis: item.axis,
    title: isFull ? 'Simulation complète' : 'Entraînement ciblé',
    subtitle:
      isFull && abandoned && item.axisReached !== null
        ? `Abandonnée à l'axe ${item.axisReached}/${item.axisTotal}`
        : isFull
          ? sectorLabel
          : `Entraînement ciblé · ${sectorLabel}`,
    mobileTitle: isFull ? 'Simulation complète' : `Ciblé · ${axisLabel}`,
    dateLabel: formatSessionDate(item.finishedAt, now),
    durationLabel: formatSessionDuration(item.durationSec),
    scoreLabel: formatSessionScore(item),
    dotVar: item.band ? BAND_COLOR_VARS[item.band] : null,
    abandoned,
    detailLink,
  };
}

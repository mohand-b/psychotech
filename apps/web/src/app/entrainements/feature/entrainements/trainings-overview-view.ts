import { AxisType, TrainingsLastSimulationDto } from '@psychotech/shared';

export type TrainingsVoletView = 'axes' | 'bilan';

export interface AxisOverviewCopy {
  description: string;
  mobileDescription: string;
}

export const AXIS_OVERVIEW_COPY: Partial<Record<AxisType, AxisOverviewCopy>> = {
  [AxisType.LOGIC]: {
    description: 'Suites à compléter',
    mobileDescription: 'Suites à compléter',
  },
  [AxisType.MEMORY]: {
    description: 'Séquences à restituer, ordre normal et inversé',
    mobileDescription: 'Séquences, ordre normal et inversé',
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    description: 'Comparaison rapide de suites',
    mobileDescription: 'Comparaison rapide de suites',
  },
  [AxisType.REACTIVITY]: {
    description: 'Temps de réaction et inhibition',
    mobileDescription: 'Temps de réaction et inhibition',
  },
  [AxisType.MOTOR_SKILLS]: {
    description: 'Coordination bimanuelle en couloir',
    mobileDescription: 'Coordination bimanuelle en couloir',
  },
};

export function formatRechargeCountdown(resetsAt: string, now: Date): string {
  const minutes = Math.max(
    1,
    Math.round((new Date(resetsAt).getTime() - now.getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours > 0
    ? `${hours} h ${String(remaining).padStart(2, '0')}`
    : `${remaining} min`;
}

export function formatOverviewScore(score: number): string {
  return score.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export interface SignedGap {
  label: string;
  above: boolean;
}

export function formatSignedGap(
  simulation: Pick<
    TrainingsLastSimulationDto,
    'globalScore' | 'sectorThreshold'
  >,
): SignedGap {
  const gap = simulation.globalScore - simulation.sectorThreshold;
  const above = gap >= 0;
  return {
    label: `${above ? '+' : '-'}${formatOverviewScore(Math.abs(gap))}`,
    above,
  };
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function formatOverviewDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (dayDiff === 0) {
    return `Aujourd'hui, ${time}`;
  }
  if (dayDiff === 1) {
    return `Hier, ${time}`;
  }
  const day = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day}, ${time}`;
}

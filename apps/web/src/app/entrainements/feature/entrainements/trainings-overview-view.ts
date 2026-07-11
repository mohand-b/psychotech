import {
  AxisType,
  TrainingsAxisOverviewDto,
  TrainingsLastSimulationDto,
} from '@psychotech/shared';

export type TrainingsPanel = 'sim' | 'cible';

export interface AxisOverviewCopy {
  description: string;
  mobileDescription: string;
}

export const AXIS_OVERVIEW_COPY: Partial<Record<AxisType, AxisOverviewCopy>> =
  {
    [AxisType.LOGIC]: {
      description: 'Suites à compléter, 40 items',
      mobileDescription: 'Suites à compléter, 40 items',
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

export const AXIS_TAG_NEEDS_WORK = 'À travailler';
export const AXIS_TAG_CRITICAL = 'Axe critique';

export function resolveAxisTag(
  entry: Pick<TrainingsAxisOverviewDto, 'needsWork' | 'isCriticalAxis'>,
): string | null {
  if (entry.needsWork) {
    return AXIS_TAG_NEEDS_WORK;
  }
  if (entry.isCriticalAxis) {
    return AXIS_TAG_CRITICAL;
  }
  return null;
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
  simulation: Pick<TrainingsLastSimulationDto, 'globalScore' | 'sectorThreshold'>,
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

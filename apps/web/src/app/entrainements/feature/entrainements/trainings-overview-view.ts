import { AxisType, TrainingsLastSimulationDto } from '@psychotech/shared';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import {
  DAY_MS,
  formatTimeOfDay,
  startOfDay,
} from '../../../shared/util/format-session-date';

export type TrainingsPanel = 'sim' | 'cible';

interface AxisOverviewCopy {
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
    label: `${above ? '+' : '-'}${formatFrenchDecimal(Math.abs(gap))}`,
    above,
  };
}

export function formatOverviewDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const time = formatTimeOfDay(date);
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

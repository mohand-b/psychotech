import { SimulationVerdict } from '@psychotech/shared';

export interface SimulationVerdictPresentation {
  label: string;
  colorVar: string;
}

export const SIMULATION_VERDICT_PRESENTATION: Record<
  SimulationVerdict,
  SimulationVerdictPresentation
> = {
  [SimulationVerdict.FAVORABLE]: {
    label: 'Favorable',
    colorVar: 'var(--success)',
  },
  [SimulationVerdict.UNFAVORABLE]: {
    label: 'Défavorable',
    colorVar: 'var(--danger)',
  },
};

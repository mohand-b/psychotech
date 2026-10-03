import { SimulationVerdict } from '@psychotech/shared';
import {
  resolveSimulationVerdictColor,
  resolveSimulationVerdictInk,
} from './verdict-appearance';

interface SimulationVerdictPresentation {
  label: string;
  colorVar: string;
  inkVar: string;
}

export const SIMULATION_VERDICT_PRESENTATION: Record<
  SimulationVerdict,
  SimulationVerdictPresentation
> = {
  [SimulationVerdict.FAVORABLE]: {
    label: 'Favorable',
    colorVar: resolveSimulationVerdictColor(SimulationVerdict.FAVORABLE),
    inkVar: resolveSimulationVerdictInk(SimulationVerdict.FAVORABLE),
  },
  [SimulationVerdict.UNFAVORABLE]: {
    label: 'Défavorable',
    colorVar: resolveSimulationVerdictColor(SimulationVerdict.UNFAVORABLE),
    inkVar: resolveSimulationVerdictInk(SimulationVerdict.UNFAVORABLE),
  },
};

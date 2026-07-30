import { SimulationVerdict } from '@psychotech/shared';
import {
  simulationVerdictColorVar,
  simulationVerdictInkVar,
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
    colorVar: simulationVerdictColorVar(SimulationVerdict.FAVORABLE),
    inkVar: simulationVerdictInkVar(SimulationVerdict.FAVORABLE),
  },
  [SimulationVerdict.UNFAVORABLE]: {
    label: 'Défavorable',
    colorVar: simulationVerdictColorVar(SimulationVerdict.UNFAVORABLE),
    inkVar: simulationVerdictInkVar(SimulationVerdict.UNFAVORABLE),
  },
};

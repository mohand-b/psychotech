import { AxisType } from '@psychotech/shared';
import {
  Brain,
  Hand,
  LucideIconData,
  Puzzle,
  ScanEye,
  Zap,
} from 'lucide-angular';

export interface AxisPresentation {
  label: string;
  colorVar: string;
  icon: LucideIconData;
}

export const AXIS_PRESENTATION: Record<AxisType, AxisPresentation> = {
  [AxisType.LOGIC]: {
    label: 'Logique',
    colorVar: 'var(--color-axis-logic)',
    icon: Puzzle,
  },
  [AxisType.MEMORY]: {
    label: 'Mémoire',
    colorVar: 'var(--color-axis-memory)',
    icon: Brain,
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    label: 'Discrimination visuelle',
    colorVar: 'var(--color-axis-discrimination)',
    icon: ScanEye,
  },
  [AxisType.REACTIVITY]: {
    label: 'Réactivité',
    colorVar: 'var(--color-axis-reactivity)',
    icon: Zap,
  },
  [AxisType.MOTOR_SKILLS]: {
    label: 'Motricité',
    colorVar: 'var(--color-axis-motor)',
    icon: Hand,
  },
};

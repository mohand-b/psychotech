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
  icon: LucideIconData;
  plainVar: string;
  pastelVar: string;
  pastelBorderVar: string;
  textVar: string;
}

export const AXIS_PRESENTATION: Record<AxisType, AxisPresentation> = {
  [AxisType.LOGIC]: {
    label: 'Logique',
    icon: Puzzle,
    plainVar: 'var(--color-axis-logic)',
    pastelVar: 'var(--color-axis-logic-pastel)',
    pastelBorderVar: 'var(--color-axis-logic-pastel-border)',
    textVar: 'var(--color-axis-logic-text)',
  },
  [AxisType.MEMORY]: {
    label: 'Mémoire',
    icon: Brain,
    plainVar: 'var(--color-axis-memory)',
    pastelVar: 'var(--color-axis-memory-pastel)',
    pastelBorderVar: 'var(--color-axis-memory-pastel-border)',
    textVar: 'var(--color-axis-memory-text)',
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    label: 'Discrimination visuelle',
    icon: ScanEye,
    plainVar: 'var(--color-axis-discrimination)',
    pastelVar: 'var(--color-axis-discrimination-pastel)',
    pastelBorderVar: 'var(--color-axis-discrimination-pastel-border)',
    textVar: 'var(--color-axis-discrimination-text)',
  },
  [AxisType.REACTIVITY]: {
    label: 'Réactivité',
    icon: Zap,
    plainVar: 'var(--color-axis-reactivity)',
    pastelVar: 'var(--color-axis-reactivity-pastel)',
    pastelBorderVar: 'var(--color-axis-reactivity-pastel-border)',
    textVar: 'var(--color-axis-reactivity-text)',
  },
  [AxisType.MOTOR_SKILLS]: {
    label: 'Motricité',
    icon: Hand,
    plainVar: 'var(--color-axis-motor)',
    pastelVar: 'var(--color-axis-motor-pastel)',
    pastelBorderVar: 'var(--color-axis-motor-pastel-border)',
    textVar: 'var(--color-axis-motor-text)',
  },
};

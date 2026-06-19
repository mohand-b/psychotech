import { AxisType } from '@psychotech/shared';
import {
  Brain,
  BrainCircuit,
  Hand,
  LucideIconData,
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
    icon: BrainCircuit,
    plainVar: 'var(--axis-logique)',
    pastelVar: 'var(--axis-logique-pastel)',
    pastelBorderVar: 'var(--axis-logique-pastel-bd)',
    textVar: 'var(--axis-logique-text)',
  },
  [AxisType.MEMORY]: {
    label: 'Mémoire',
    icon: Brain,
    plainVar: 'var(--axis-memoire)',
    pastelVar: 'var(--axis-memoire-pastel)',
    pastelBorderVar: 'var(--axis-memoire-pastel-bd)',
    textVar: 'var(--axis-memoire-text)',
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    label: 'Discrimination visuelle',
    icon: ScanEye,
    plainVar: 'var(--axis-discrim)',
    pastelVar: 'var(--axis-discrim-pastel)',
    pastelBorderVar: 'var(--axis-discrim-pastel-bd)',
    textVar: 'var(--axis-discrim-text)',
  },
  [AxisType.REACTIVITY]: {
    label: 'Réactivité',
    icon: Zap,
    plainVar: 'var(--axis-reactivite)',
    pastelVar: 'var(--axis-reactivite-pastel)',
    pastelBorderVar: 'var(--axis-reactivite-pastel-bd)',
    textVar: 'var(--axis-reactivite-text)',
  },
  [AxisType.MOTOR_SKILLS]: {
    label: 'Motricité',
    icon: Hand,
    plainVar: 'var(--axis-motricite)',
    pastelVar: 'var(--axis-motricite-pastel)',
    pastelBorderVar: 'var(--axis-motricite-pastel-bd)',
    textVar: 'var(--axis-motricite-text)',
  },
};

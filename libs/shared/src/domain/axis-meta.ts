import { AxisType } from '../enums';

export interface AxisMeta {
  label: string;
  colorToken: string;
  icon: string;
  playable: boolean;
}

export const AXIS_META: Record<AxisType, AxisMeta> = {
  [AxisType.LOGIC]: {
    label: 'Logique',
    colorToken: '--axis-logique',
    icon: 'brain-circuit',
    playable: true,
  },
  [AxisType.MEMORY]: {
    label: 'Mémoire',
    colorToken: '--axis-memoire',
    icon: 'brain',
    playable: true,
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    label: 'Discrimination visuelle',
    colorToken: '--axis-discrim',
    icon: 'scan-eye',
    playable: true,
  },
  [AxisType.REACTIVITY]: {
    label: 'Réactivité',
    colorToken: '--axis-reactivite',
    icon: 'zap',
    playable: true,
  },
  [AxisType.MOTOR_SKILLS]: {
    label: 'Motricité',
    colorToken: '--axis-motricite',
    icon: 'hand',
    playable: true,
  },
  [AxisType.ATTENTION]: {
    label: 'Attention',
    colorToken: '--axis-attention',
    icon: 'target',
    playable: false,
  },
  [AxisType.NUMERICAL]: {
    label: 'Numérique',
    colorToken: '--axis-numerique',
    icon: 'calculator',
    playable: false,
  },
  [AxisType.VERBAL]: {
    label: 'Verbal',
    colorToken: '--axis-verbal',
    icon: 'book-open',
    playable: false,
  },
  [AxisType.SPATIAL]: {
    label: 'Spatial',
    colorToken: '--axis-spatial',
    icon: 'rotate-3d',
    playable: false,
  },
};

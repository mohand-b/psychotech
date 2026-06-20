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
    colorToken: '--axis-logic',
    icon: 'brain-circuit',
    playable: true,
  },
  [AxisType.MEMORY]: {
    label: 'Mémoire',
    colorToken: '--axis-memory',
    icon: 'brain',
    playable: true,
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    label: 'Discrimination visuelle',
    colorToken: '--axis-discrimination',
    icon: 'scan-eye',
    playable: true,
  },
  [AxisType.REACTIVITY]: {
    label: 'Réactivité',
    colorToken: '--axis-reactivity',
    icon: 'zap',
    playable: true,
  },
  [AxisType.MOTOR_SKILLS]: {
    label: 'Motricité',
    colorToken: '--axis-motor',
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
    colorToken: '--axis-numerical',
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

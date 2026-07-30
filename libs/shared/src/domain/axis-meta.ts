import { AxisType } from '../enums';

interface AxisMeta {
  label: string;
  colorToken: string;
  playable: boolean;
}

export const AXIS_META: Record<AxisType, AxisMeta> = {
  [AxisType.LOGIC]: {
    label: 'Logique',
    colorToken: '--axis-logic',
    playable: true,
  },
  [AxisType.MEMORY]: {
    label: 'Mémoire',
    colorToken: '--axis-memory',
    playable: true,
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    label: 'Discrimination visuelle',
    colorToken: '--axis-discrimination',
    playable: true,
  },
  [AxisType.REACTIVITY]: {
    label: 'Réactivité',
    colorToken: '--axis-reactivity',
    playable: true,
  },
  [AxisType.MOTOR_SKILLS]: {
    label: 'Motricité',
    colorToken: '--axis-motor',
    playable: true,
  },
  [AxisType.ATTENTION]: {
    label: 'Attention',
    colorToken: '--axis-attention',
    playable: false,
  },
  [AxisType.NUMERICAL]: {
    label: 'Numérique',
    colorToken: '--axis-numerical',
    playable: false,
  },
  [AxisType.VERBAL]: {
    label: 'Verbal',
    colorToken: '--axis-verbal',
    playable: false,
  },
  [AxisType.SPATIAL]: {
    label: 'Spatial',
    colorToken: '--axis-spatial',
    playable: false,
  },
};

import { AXIS_META, AxisType } from '@psychotech/shared';
import {
  BookOpen,
  Brain,
  BrainCircuit,
  Calculator,
  Hand,
  LucideIconData,
  Rotate3d,
  ScanEye,
  Target,
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

const AXIS_ICONS: Record<AxisType, LucideIconData> = {
  [AxisType.LOGIC]: BrainCircuit,
  [AxisType.MEMORY]: Brain,
  [AxisType.VISUAL_DISCRIMINATION]: ScanEye,
  [AxisType.REACTIVITY]: Zap,
  [AxisType.MOTOR_SKILLS]: Hand,
  [AxisType.ATTENTION]: Target,
  [AxisType.NUMERICAL]: Calculator,
  [AxisType.VERBAL]: BookOpen,
  [AxisType.SPATIAL]: Rotate3d,
};

function buildPresentation(axis: AxisType): AxisPresentation {
  const meta = AXIS_META[axis];
  return {
    label: meta.label,
    icon: AXIS_ICONS[axis],
    plainVar: `var(${meta.colorToken})`,
    pastelVar: `var(${meta.colorToken}-pastel)`,
    pastelBorderVar: `var(${meta.colorToken}-pastel-bd)`,
    textVar: `var(${meta.colorToken}-text)`,
  };
}

export const AXIS_PRESENTATION: Record<AxisType, AxisPresentation> =
  Object.fromEntries(
    (Object.keys(AXIS_META) as AxisType[]).map((axis) => [
      axis,
      buildPresentation(axis),
    ]),
  ) as Record<AxisType, AxisPresentation>;

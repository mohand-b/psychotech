import { AXIS_META, AxisType } from '@psychotech/shared';

export interface AxisPresentation {
  label: string;
  shortLabel: string;
  plainVar: string;
  pastelVar: string;
  pastelBorderVar: string;
  textVar: string;
}

const AXIS_SHORT_LABELS: Partial<Record<AxisType, string>> = {
  [AxisType.VISUAL_DISCRIMINATION]: 'Discrimination',
};

function buildPresentation(axis: AxisType): AxisPresentation {
  const meta = AXIS_META[axis];
  return {
    label: meta.label,
    shortLabel: AXIS_SHORT_LABELS[axis] ?? meta.label,
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

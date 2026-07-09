import { AxisType } from '@psychotech/shared';

export const AXIS_SLUGS: Record<AxisType, string> = {
  [AxisType.LOGIC]: 'logique',
  [AxisType.MEMORY]: 'memoire',
  [AxisType.VISUAL_DISCRIMINATION]: 'discrimination-visuelle',
  [AxisType.REACTIVITY]: 'reactivite',
  [AxisType.MOTOR_SKILLS]: 'motricite',
  [AxisType.ATTENTION]: 'attention',
  [AxisType.NUMERICAL]: 'numerique',
  [AxisType.VERBAL]: 'verbal',
  [AxisType.SPATIAL]: 'spatial',
};

export function axisSlug(axis: AxisType): string {
  return AXIS_SLUGS[axis];
}

export function axisFromSlug(slug: string | null): AxisType | null {
  if (!slug) {
    return null;
  }
  const entry = (Object.entries(AXIS_SLUGS) as [AxisType, string][]).find(
    ([, candidate]) => candidate === slug,
  );
  return entry ? entry[0] : null;
}

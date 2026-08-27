import { AxisType } from '@psychotech/shared';
import { AXIS_SLUGS } from '../../shared/util/axis-slug';

export const GUIDE_PATH = '/guide';
export const GUIDE_LOGIC_RULES_PATH = '/guide/logique';

export const GUIDE_AXIS_ANCHORS = {
  [AxisType.LOGIC]: AXIS_SLUGS[AxisType.LOGIC],
  [AxisType.MEMORY]: AXIS_SLUGS[AxisType.MEMORY],
  [AxisType.VISUAL_DISCRIMINATION]: AXIS_SLUGS[AxisType.VISUAL_DISCRIMINATION],
  [AxisType.REACTIVITY]: AXIS_SLUGS[AxisType.REACTIVITY],
  [AxisType.MOTOR_SKILLS]: AXIS_SLUGS[AxisType.MOTOR_SKILLS],
} as const;

export type GuideAxis = keyof typeof GUIDE_AXIS_ANCHORS;

export function guideAxisAnchor(axis: AxisType): string | null {
  return axis in GUIDE_AXIS_ANCHORS
    ? GUIDE_AXIS_ANCHORS[axis as GuideAxis]
    : null;
}

export const GUIDE_SCORE_ANCHOR = 'score';

export const GUIDE_LOGIC_RULES_ANCHORS = {
  sequences: 'suites',
  triangles: 'triangles',
  dominos: 'dominos',
  matrices: 'matrices',
} as const;

export type GuideLogicRulesAnchor =
  (typeof GUIDE_LOGIC_RULES_ANCHORS)[keyof typeof GUIDE_LOGIC_RULES_ANCHORS];

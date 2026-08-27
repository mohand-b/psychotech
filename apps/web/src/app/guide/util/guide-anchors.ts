import { AxisType } from '@psychotech/shared';
import { AXIS_SLUGS } from '../../shared/util/axis-slug';

export const GUIDE_PATH = '/guide';
export const GUIDE_LOGIC_RULES_PATH = '/guide/logique';

export const GUIDE_AXIS_ANCHORS: Record<AxisType, string> = AXIS_SLUGS;

export function guideAxisAnchor(axis: AxisType): string {
  return GUIDE_AXIS_ANCHORS[axis];
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

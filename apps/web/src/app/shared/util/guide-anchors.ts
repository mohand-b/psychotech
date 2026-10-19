import {
  AxisType,
  LogicFamily,
  LogicFamilyFilter,
  LogicFamilyResultDto,
  VERDICT_GOOD_MIN,
} from '@psychotech/shared';
import { AXIS_SLUGS } from './axis-slug';

export const GUIDE_PATH = '/guide';
export const GUIDE_LOGIC_RULES_PATH = '/guide/logique';

export const GUIDE_AXIS_ANCHORS: Record<AxisType, string> = AXIS_SLUGS;

export function resolveGuideAxisAnchor(axis: AxisType): string {
  return GUIDE_AXIS_ANCHORS[axis];
}

export const GUIDE_SCORE_ANCHOR = 'score';

export const GUIDE_LOGIC_RULES_ANCHORS = {
  sequences: 'suites',
  triangles: 'triangles',
  dominos: 'dominos',
  matrices: 'matrices',
} as const;

export interface GuideLinkTarget {
  label: string;
  path: string;
  fragment: string | null;
}

const LOGIC_RULES_GUIDE_LABEL = 'Revoir les règles de la Logique';

const LOGIC_FAMILY_GUIDE_ANCHORS: Record<LogicFamily, string | null> = {
  [LogicFamily.NUMERIC]: null,
  [LogicFamily.DOMINO]: GUIDE_LOGIC_RULES_ANCHORS.dominos,
  [LogicFamily.MATRIX_I]: GUIDE_LOGIC_RULES_ANCHORS.matrices,
  [LogicFamily.MATRIX_II]: GUIDE_LOGIC_RULES_ANCHORS.matrices,
};

const LOGIC_FAMILY_FILTER_GUIDE_ANCHORS: Record<
  LogicFamilyFilter,
  string | null
> = {
  [LogicFamilyFilter.NUMERIC]: null,
  [LogicFamilyFilter.DOMINO]: GUIDE_LOGIC_RULES_ANCHORS.dominos,
  [LogicFamilyFilter.MATRIX]: GUIDE_LOGIC_RULES_ANCHORS.matrices,
};

export function resolveLogicFocusGuideAnchor(
  familyFilter: LogicFamilyFilter | null,
  families: readonly LogicFamilyResultDto[],
): string | null {
  if (familyFilter) {
    return LOGIC_FAMILY_FILTER_GUIDE_ANCHORS[familyFilter];
  }
  const [weakest] = families
    .filter((family) => family.marker === 'WEAKNESS')
    .sort((first, second) => first.ratePct - second.ratePct);
  return weakest ? LOGIC_FAMILY_GUIDE_ANCHORS[weakest.family] : null;
}

export function resolveLowScoreGuideLink(
  axis: AxisType,
  score: number,
  logicAnchor: string | null = null,
): GuideLinkTarget | null {
  if (axis !== AxisType.LOGIC || score >= VERDICT_GOOD_MIN) {
    return null;
  }
  return {
    label: LOGIC_RULES_GUIDE_LABEL,
    path: GUIDE_LOGIC_RULES_PATH,
    fragment: logicAnchor,
  };
}

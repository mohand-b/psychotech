import { LogicFamily, LogicFamilyFilter } from '../../enums';

export const LOGIC_CONTENT_VERSION_V1 = 1;
export const LOGIC_CONTENT_VERSION_V2 = 2;
export const LOGIC_CONTENT_VERSION_V3 = 3;
export const LOGIC_CONTENT_VERSION_V4 = 4;

export const LOGIC_FAMILY_LABELS: Record<LogicFamily, string> = {
  [LogicFamily.NUMERIC]: 'Numérique',
  [LogicFamily.DOMINO]: 'Dominos',
  [LogicFamily.MATRIX_I]: 'Matrices (lecture)',
  [LogicFamily.MATRIX_II]: 'Matrices (déduction)',
};

export const LOGIC_FAMILY_FILTER_LABELS: Record<LogicFamilyFilter, string> = {
  [LogicFamilyFilter.NUMERIC]: 'Numérique',
  [LogicFamilyFilter.DOMINO]: 'Dominos',
  [LogicFamilyFilter.MATRIX]: 'Matrices',
};

export function logicFamiliesForFilter(
  filter: LogicFamilyFilter | null,
): readonly LogicFamily[] {
  switch (filter) {
    case LogicFamilyFilter.NUMERIC:
      return [LogicFamily.NUMERIC];
    case LogicFamilyFilter.DOMINO:
      return [LogicFamily.DOMINO];
    case LogicFamilyFilter.MATRIX:
      return [LogicFamily.MATRIX_I, LogicFamily.MATRIX_II];
    default:
      return [
        LogicFamily.NUMERIC,
        LogicFamily.DOMINO,
        LogicFamily.MATRIX_I,
        LogicFamily.MATRIX_II,
      ];
  }
}

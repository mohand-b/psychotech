import {
  AxisType,
  LogicFamily,
  LogicFamilyFilter,
  LogicFamilyResultDto,
} from '@psychotech/shared';
import {
  resolveLogicFocusGuideAnchor,
  resolveLowScoreGuideLink,
} from './guide-anchors';

function family(
  logicFamily: LogicFamily,
  ratePct: number,
  marker: LogicFamilyResultDto['marker'] = null,
): LogicFamilyResultDto {
  return {
    family: logicFamily,
    correct: 0,
    attempted: 0,
    total: 0,
    ratePct,
    timeMs: 0,
    marker,
  };
}

describe('resolveLowScoreGuideLink', () => {
  it('links the Logic rules below the admissibility score only', () => {
    expect(resolveLowScoreGuideLink(AxisType.LOGIC, 69.9, 'dominos')).toEqual({
      label: 'Revoir les règles de la Logique',
      path: '/guide/logique',
      fragment: 'dominos',
    });
    expect(resolveLowScoreGuideLink(AxisType.LOGIC, 70)).toBeNull();
  });

  it('gives no guide link for the other axes', () => {
    expect(resolveLowScoreGuideLink(AxisType.MEMORY, 40)).toBeNull();
  });
});

describe('resolveLogicFocusGuideAnchor', () => {
  it('targets the family a filtered session trained', () => {
    expect(resolveLogicFocusGuideAnchor(LogicFamilyFilter.MATRIX, [])).toBe(
      'matrices',
    );
    expect(resolveLogicFocusGuideAnchor(LogicFamilyFilter.NUMERIC, [])).toBe(
      null,
    );
  });

  it('targets the weakest family marked to work on', () => {
    expect(
      resolveLogicFocusGuideAnchor(null, [
        family(LogicFamily.NUMERIC, 90, 'STRENGTH'),
        family(LogicFamily.MATRIX_II, 38, 'WEAKNESS'),
        family(LogicFamily.DOMINO, 20, 'WEAKNESS'),
      ]),
    ).toBe('dominos');
  });

  it('opens the top of the rules without any family to work on', () => {
    expect(
      resolveLogicFocusGuideAnchor(null, [family(LogicFamily.DOMINO, 50)]),
    ).toBeNull();
    expect(
      resolveLogicFocusGuideAnchor(null, [
        family(LogicFamily.NUMERIC, 30, 'WEAKNESS'),
      ]),
    ).toBeNull();
  });
});

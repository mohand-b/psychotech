import { AxisType, SessionMode } from '@psychotech/shared';
import {
  SessionHistoryFilter,
  areAxisChipsEnabled,
  historyQueryFor,
  isChipActive,
  selectionFor,
} from './session-history.filter';

const AXIS_CHIPS: SessionHistoryFilter[] = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

describe('selectionFor', () => {
  it('leaves both dimensions open on the default filter', () => {
    expect(selectionFor('ALL')).toEqual({ mode: null, axis: null });
  });

  const MODE_CHIPS: (SessionMode.FULL | SessionMode.TARGETED)[] = [
    SessionMode.FULL,
    SessionMode.TARGETED,
  ];

  it.each(MODE_CHIPS)('keeps the axis open on the %s type filter', (mode) => {
    expect(selectionFor(mode)).toEqual({ mode, axis: null });
  });

  it.each(AXIS_CHIPS)('couples the axis %s to the targeted mode', (axis) => {
    expect(selectionFor(axis)).toEqual({
      mode: SessionMode.TARGETED,
      axis,
    });
  });
});

describe('historyQueryFor', () => {
  it('asks for nothing on the default filter', () => {
    expect(historyQueryFor('ALL')).toEqual({});
  });

  it('asks for the mode alone on a type filter', () => {
    expect(historyQueryFor(SessionMode.FULL)).toEqual({
      mode: SessionMode.FULL,
    });
    expect(historyQueryFor(SessionMode.TARGETED)).toEqual({
      mode: SessionMode.TARGETED,
    });
  });

  it('asks for the targeted mode alongside the axis so full sessions are excluded', () => {
    expect(historyQueryFor(AxisType.REACTIVITY)).toEqual({
      mode: SessionMode.TARGETED,
      axis: AxisType.REACTIVITY,
    });
  });
});

describe('isChipActive', () => {
  it('lights the default chip alone on the default filter', () => {
    expect(isChipActive('ALL', 'ALL')).toBe(true);
    expect(isChipActive('ALL', SessionMode.FULL)).toBe(false);
    expect(isChipActive('ALL', SessionMode.TARGETED)).toBe(false);
    expect(isChipActive('ALL', AxisType.LOGIC)).toBe(false);
  });

  it('lights the full chip alone on the full filter', () => {
    expect(isChipActive(SessionMode.FULL, SessionMode.FULL)).toBe(true);
    expect(isChipActive(SessionMode.FULL, 'ALL')).toBe(false);
    expect(isChipActive(SessionMode.FULL, SessionMode.TARGETED)).toBe(false);
    expect(isChipActive(SessionMode.FULL, AxisType.LOGIC)).toBe(false);
  });

  it('lights the targeted chip and the axis chip together on an axis filter', () => {
    expect(isChipActive(AxisType.LOGIC, SessionMode.TARGETED)).toBe(true);
    expect(isChipActive(AxisType.LOGIC, AxisType.LOGIC)).toBe(true);
    expect(isChipActive(AxisType.LOGIC, AxisType.MEMORY)).toBe(false);
    expect(isChipActive(AxisType.LOGIC, 'ALL')).toBe(false);
    expect(isChipActive(AxisType.LOGIC, SessionMode.FULL)).toBe(false);
  });

  it('lights no axis chip when only the targeted type is picked', () => {
    for (const axis of AXIS_CHIPS) {
      expect(isChipActive(SessionMode.TARGETED, axis)).toBe(false);
    }
    expect(isChipActive(SessionMode.TARGETED, SessionMode.TARGETED)).toBe(true);
  });
});

describe('areAxisChipsEnabled', () => {
  it('disables the axis chips only on the full filter', () => {
    expect(areAxisChipsEnabled('ALL')).toBe(true);
    expect(areAxisChipsEnabled(SessionMode.TARGETED)).toBe(true);
    expect(areAxisChipsEnabled(AxisType.LOGIC)).toBe(true);
    expect(areAxisChipsEnabled(SessionMode.FULL)).toBe(false);
  });
});

describe('filter transitions', () => {
  function state(filter: SessionHistoryFilter) {
    return {
      query: historyQueryFor(filter),
      axisChips: areAxisChipsEnabled(filter),
      lit: (
        [
          'ALL',
          SessionMode.FULL,
          SessionMode.TARGETED,
          ...AXIS_CHIPS,
        ] as SessionHistoryFilter[]
      ).filter((chip) => isChipActive(filter, chip)),
    };
  }

  it('picking an axis selects the targeted type with it', () => {
    expect(state(AxisType.LOGIC)).toEqual({
      query: { mode: SessionMode.TARGETED, axis: AxisType.LOGIC },
      axisChips: true,
      lit: [SessionMode.TARGETED, AxisType.LOGIC],
    });
  });

  it('picking full sessions clears the axis and locks the axis chips', () => {
    expect(state(SessionMode.FULL)).toEqual({
      query: { mode: SessionMode.FULL },
      axisChips: false,
      lit: [SessionMode.FULL],
    });
  });

  it('going back to the default filter reopens everything', () => {
    expect(state('ALL')).toEqual({
      query: {},
      axisChips: true,
      lit: ['ALL'],
    });
  });

  it('switching from one axis to another keeps the targeted type lit', () => {
    expect(state(AxisType.MEMORY).lit).toEqual([
      SessionMode.TARGETED,
      AxisType.MEMORY,
    ]);
  });

  it('switching from an axis to the targeted type drops the axis only', () => {
    expect(state(SessionMode.TARGETED)).toEqual({
      query: { mode: SessionMode.TARGETED },
      axisChips: true,
      lit: [SessionMode.TARGETED],
    });
  });
});

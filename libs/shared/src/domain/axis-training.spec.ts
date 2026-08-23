import { describe, expect, it } from 'vitest';
import { AxisTimerModel, AxisType } from '../enums';
import {
  AXIS_TRAINING,
  FULL_SESSION_AXIS_ORDER,
  axisMaxDurationSec,
  globalTimerDurationSec,
} from './axis-training';

describe('axisMaxDurationSec', () => {
  it('reprend le chrono global des axes qui en ont un', () => {
    expect(axisMaxDurationSec(AxisType.LOGIC)).toBe(600);
    expect(axisMaxDurationSec(AxisType.VISUAL_DISCRIMINATION)).toBe(120);
    expect(axisMaxDurationSec(AxisType.REACTIVITY)).toBe(120);
  });

  it('cumule affichages et restitutions pour la mémoire', () => {
    expect(axisMaxDurationSec(AxisType.MEMORY)).toBe(24 + 5 * 30);
  });

  it('cumule parcours et pauses pour la motricité', () => {
    expect(axisMaxDurationSec(AxisType.MOTOR_SKILLS)).toBe(3 * 90 + 2 * 10);
  });
});

describe('globalTimerDurationSec', () => {
  it('suit exactement les axes déclarés à chrono global', () => {
    for (const axis of FULL_SESSION_AXIS_ORDER) {
      const timer = AXIS_TRAINING[axis].timer;
      expect(globalTimerDurationSec(axis)).toBe(
        timer.model === AxisTimerModel.GLOBAL ? timer.durationSec : null,
      );
    }
  });

  it('ne prête pas de chrono global aux axes joués exercice par exercice', () => {
    expect(globalTimerDurationSec(AxisType.MEMORY)).toBeNull();
    expect(globalTimerDurationSec(AxisType.MOTOR_SKILLS)).toBeNull();
  });

  it('ne prête pas de chrono aux axes hors ferroviaire', () => {
    expect(globalTimerDurationSec(AxisType.ATTENTION)).toBeNull();
    expect(globalTimerDurationSec(AxisType.VERBAL)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { AxisType } from '../enums';
import { axisMaxDurationSec } from './axis-training';

describe('axisMaxDurationSec', () => {
  it('reprend le chrono global des axes qui en ont un', () => {
    expect(axisMaxDurationSec(AxisType.LOGIC)).toBe(600);
    expect(axisMaxDurationSec(AxisType.VISUAL_DISCRIMINATION)).toBe(180);
    expect(axisMaxDurationSec(AxisType.REACTIVITY)).toBe(180);
  });

  it('cumule affichages et restitutions pour la mémoire', () => {
    expect(axisMaxDurationSec(AxisType.MEMORY)).toBe(24 + 5 * 30);
  });

  it('cumule parcours et pauses pour la motricité', () => {
    expect(axisMaxDurationSec(AxisType.MOTOR_SKILLS)).toBe(3 * 90 + 2 * 10);
  });
});

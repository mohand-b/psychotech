import { describe, expect, it } from 'vitest';
import { AXIS_TRAINING } from '../../domain';
import { AxisType } from '../../enums';
import {
  REACTIVITY_MAX_SAME_TYPE_RUN,
  REACTIVITY_MIN_POSITION_DISTANCE,
  generateReactivitySession,
} from './generate-reactivity-session';

const TRAINING = AXIS_TRAINING[AxisType.REACTIVITY];
const SAMPLE_SEEDS = ['react-1', 'react-2', 'react-3', 'react-4', 'react-5'];

describe('generateReactivitySession', () => {
  it('returns a strictly identical sequence for the same seed', () => {
    const first = generateReactivitySession('determinism-seed');
    const second = generateReactivitySession('determinism-seed');
    expect(second).toEqual(first);
  });

  it('matches the reference snapshot for a fixed seed', () => {
    expect(generateReactivitySession('snapshot-seed')).toMatchSnapshot();
  });

  it('never shows blue before the second minute nor red before the third', () => {
    const phaseMs = TRAINING.phaseDurationSec * 1000;
    for (const seed of SAMPLE_SEEDS) {
      for (const stimulus of generateReactivitySession(seed)) {
        if (stimulus.appearAtMs < phaseMs) {
          expect(stimulus.type).toBe('YELLOW');
        }
        if (stimulus.appearAtMs < 2 * phaseMs) {
          expect(stimulus.type).not.toBe('RED');
        }
      }
    }
  });

  it('draws intervals within the configured bounds and fits the trial duration', () => {
    const totalMs = TRAINING.timer.durationSec * 1000;
    for (const seed of SAMPLE_SEEDS) {
      const stimuli = generateReactivitySession(seed);
      expect(stimuli[0].appearAtMs).toBeGreaterThanOrEqual(
        TRAINING.minIntervalMs,
      );
      for (const [position, stimulus] of stimuli.entries()) {
        expect(stimulus.index).toBe(position);
        expect(stimulus.appearAtMs + TRAINING.responseWindowMs).toBeLessThanOrEqual(
          totalMs,
        );
        if (position > 0) {
          const gap =
            stimulus.appearAtMs -
            stimuli[position - 1].appearAtMs -
            TRAINING.responseWindowMs;
          expect(gap).toBeGreaterThanOrEqual(TRAINING.minIntervalMs);
          expect(gap).toBeLessThanOrEqual(TRAINING.maxIntervalMs);
        }
      }
    }
  });

  it('never chains more than three identical types once several signals are active', () => {
    const phaseMs = TRAINING.phaseDurationSec * 1000;
    for (const seed of SAMPLE_SEEDS) {
      const stimuli = generateReactivitySession(seed);
      for (
        let position = 0;
        position + REACTIVITY_MAX_SAME_TYPE_RUN < stimuli.length;
        position += 1
      ) {
        const window = stimuli.slice(
          position,
          position + REACTIVITY_MAX_SAME_TYPE_RUN + 1,
        );
        if (window[window.length - 1].appearAtMs < phaseMs) {
          continue;
        }
        expect(window.every(({ type }) => type === window[0].type)).toBe(false);
      }
    }
  });

  it('keeps positions in [-1, 1] and apart from the previous one', () => {
    for (const seed of SAMPLE_SEEDS) {
      const stimuli = generateReactivitySession(seed);
      for (const [position, stimulus] of stimuli.entries()) {
        expect(Math.abs(stimulus.position.fx)).toBeLessThanOrEqual(1);
        expect(Math.abs(stimulus.position.fy)).toBeLessThanOrEqual(1);
        if (position > 0) {
          const previous = stimuli[position - 1].position;
          expect(
            Math.hypot(
              stimulus.position.fx - previous.fx,
              stimulus.position.fy - previous.fy,
            ),
          ).toBeGreaterThanOrEqual(REACTIVITY_MIN_POSITION_DISTANCE);
        }
      }
    }
  });

  it('produces roughly the expected stimulus count', () => {
    for (const seed of SAMPLE_SEEDS) {
      const count = generateReactivitySession(seed).length;
      expect(count).toBeGreaterThanOrEqual(38);
      expect(count).toBeLessThanOrEqual(52);
    }
  });
});

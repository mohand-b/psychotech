import { describe, expect, it } from 'vitest';
import { AXIS_TRAINING } from '../../domain';
import { AxisType, ShapeId } from '../../enums';
import {
  DISCRIMINATION_CHAR_POOL,
  DISTINCT_ROTATIONS,
  sameElement,
} from './discrimination-confusables';
import {
  DISCRIMINATION_IDENTICAL_MAX,
  DISCRIMINATION_IDENTICAL_MIN,
  generateDiscriminationSession,
} from './generate-discrimination-session';
import { DiscriminationTrial } from './discrimination-trial';

const TRAINING = AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION];
const SAMPLE_SEEDS = ['discri-1', 'discri-2', 'discri-3', 'discri-4', 'discri-5'];

function differenceCount(trial: DiscriminationTrial): number {
  expect(trial.b).toHaveLength(trial.a.length);
  return trial.a.filter((element, position) => !sameElement(element, trial.b[position]))
    .length;
}

describe('generateDiscriminationSession', () => {
  it('returns a strictly identical session for the same seed', () => {
    const first = generateDiscriminationSession('determinism-seed');
    const second = generateDiscriminationSession('determinism-seed');
    expect(second).toEqual(first);
  });

  it('matches the reference snapshot for a fixed seed', () => {
    expect(generateDiscriminationSession('snapshot-seed')).toMatchSnapshot();
  });

  it('returns different sessions for different seeds', () => {
    expect(generateDiscriminationSession('seed-a')).not.toEqual(
      generateDiscriminationSession('seed-b'),
    );
  });

  it('produces 36 trials with non-decreasing lengths from the shared bounds', () => {
    for (const seed of SAMPLE_SEEDS) {
      const trials = generateDiscriminationSession(seed);
      expect(trials).toHaveLength(TRAINING.exerciseCount);
      expect(trials.map(({ index }) => index)).toEqual(
        trials.map((_, position) => position),
      );
      expect(trials[0].a).toHaveLength(TRAINING.minSequenceLength);
      expect(trials[trials.length - 1].a).toHaveLength(TRAINING.maxSequenceLength);
      for (const [position, trial] of trials.entries()) {
        if (position > 0) {
          expect(trial.a.length).toBeGreaterThanOrEqual(
            trials[position - 1].a.length,
          );
        }
      }
    }
  });

  it('keeps the identical ratio within the configured bounds', () => {
    for (const seed of SAMPLE_SEEDS) {
      const identicalCount = generateDiscriminationSession(seed).filter(
        ({ identical }) => identical,
      ).length;
      expect(identicalCount).toBeGreaterThanOrEqual(DISCRIMINATION_IDENTICAL_MIN);
      expect(identicalCount).toBeLessThanOrEqual(DISCRIMINATION_IDENTICAL_MAX);
    }
  });

  it('gives identical trials strictly equal sequences and different trials exactly one detectable difference', () => {
    for (const seed of SAMPLE_SEEDS) {
      for (const trial of generateDiscriminationSession(seed)) {
        expect(differenceCount(trial)).toBe(trial.identical ? 0 : 1);
      }
    }
  });

  it('never treats rotations of rotation-invariant shapes as a difference', () => {
    const square = (rotation: 0 | 90 | 180 | 270) =>
      ({ kind: 'SHAPE', shape: ShapeId.SQUARE, rotation }) as const;
    const circle = (rotation: 0 | 90 | 180 | 270) =>
      ({ kind: 'SHAPE', shape: ShapeId.CIRCLE, rotation }) as const;
    const rectangle = (rotation: 0 | 90 | 180 | 270) =>
      ({ kind: 'SHAPE', shape: ShapeId.RECTANGLE, rotation }) as const;
    const trapezoid = (rotation: 0 | 90 | 180 | 270) =>
      ({ kind: 'SHAPE', shape: ShapeId.TRAPEZOID, rotation }) as const;
    expect(sameElement(square(0), square(90))).toBe(true);
    expect(sameElement(square(0), square(180))).toBe(true);
    expect(sameElement(circle(0), circle(270))).toBe(true);
    expect(sameElement(rectangle(0), rectangle(90))).toBe(true);
    expect(sameElement(trapezoid(0), trapezoid(180))).toBe(false);
  });

  it('only draws pool characters and canonical, visible rotations', () => {
    for (const seed of SAMPLE_SEEDS) {
      for (const trial of generateDiscriminationSession(seed)) {
        for (const element of [...trial.a, ...trial.b]) {
          if (element.kind === 'CHAR') {
            expect(DISCRIMINATION_CHAR_POOL).toContain(element.value);
            expect(['O', 'I']).not.toContain(element.value);
          } else {
            expect(DISTINCT_ROTATIONS[element.shape]).toContain(element.rotation);
          }
        }
      }
    }
  });

  it('draws normalized jitter factors within [-1, 1]', () => {
    for (const seed of SAMPLE_SEEDS) {
      for (const trial of generateDiscriminationSession(seed)) {
        for (const offset of [trial.offsetA, trial.offsetB]) {
          expect(Math.abs(offset.fx)).toBeLessThanOrEqual(1);
          expect(Math.abs(offset.fy)).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

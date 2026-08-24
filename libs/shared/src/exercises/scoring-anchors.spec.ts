import { describe, expect, it } from 'vitest';
import { AXIS_TRAINING } from '../domain';
import { AxisType } from '../enums';
import {
  DiscriminationTrialAnswerDto,
  ReactivityStimulusAnswerDto,
} from '../dtos/session';
import { SeededRng, createSeededRng } from './rng';
import { generateDiscriminationSession } from './discrimination/generate-discrimination-session';
import { scoreDiscriminationSession } from './discrimination/discrimination-scoring';
import { generateReactivitySession } from './reactivity/generate-reactivity-session';
import { scoreReactivitySession } from './reactivity/reactivity-scoring';
import { REACTIVITY_COMMAND_BY_TYPE } from './reactivity/reactivity-stimulus';

interface AnchorBand {
  min: number;
  max: number;
}

const ANCHOR_BANDS: Record<string, AnchorBand> = {
  excellent: { min: 90, max: 100 },
  bon: { min: 78, max: 88 },
  moyen: { min: 62, max: 72 },
  faible: { min: 40, max: 55 },
};

const ANCHOR_SEED_COUNT = 30;

interface DiscriminationProfile {
  band: keyof typeof ANCHOR_BANDS;
  decisionMs: number;
  accuracy: number;
}

const DISCRIMINATION_PROFILES: DiscriminationProfile[] = [
  { band: 'excellent', decisionMs: 1800, accuracy: 0.97 },
  { band: 'bon', decisionMs: 2700, accuracy: 0.9 },
  { band: 'moyen', decisionMs: 3900, accuracy: 0.82 },
  { band: 'faible', decisionMs: 5500, accuracy: 0.7 },
];

// Bandes propres au Visuel. Deux d'entre elles s'écartent des bandes communes
// depuis la règle du 10/08/2026 : les essais jamais atteints pèsent désormais
// sur la précision, si bien qu'un profil qui n'épuise pas les 36 essais décroche
// mécaniquement. « faible » ne traite que 21 essais sur 36, « bon » les traite
// tous et gagne au contraire au changement de barème de vitesse.
const DISCRIMINATION_BANDS: Record<string, AnchorBand> = {
  excellent: ANCHOR_BANDS.excellent,
  bon: { min: 84, max: 93 },
  moyen: ANCHOR_BANDS.moyen,
  faible: { min: 23, max: 34 },
};

interface ReactivityProfile {
  band: keyof typeof ANCHOR_BANDS;
  trMs: number;
  sdMs: number;
  wrongRate: number;
  omitRate: number;
}

const REACTIVITY_PROFILES: ReactivityProfile[] = [
  { band: 'excellent', trMs: 420, sdMs: 55, wrongRate: 0.02, omitRate: 0 },
  { band: 'bon', trMs: 520, sdMs: 90, wrongRate: 0.04, omitRate: 0.02 },
  { band: 'moyen', trMs: 640, sdMs: 130, wrongRate: 0.08, omitRate: 0.06 },
  { band: 'faible', trMs: 800, sdMs: 185, wrongRate: 0.14, omitRate: 0.14 },
];

function standardNormal(rng: SeededRng): number {
  return (
    Math.sqrt(-2 * Math.log(Math.max(rng.next(), 1e-9))) *
    Math.cos(2 * Math.PI * rng.next())
  );
}

function discriminationScoreFor(
  profile: DiscriminationProfile,
  seed: string,
): number {
  const trials = generateDiscriminationSession(seed);
  const rng = createSeededRng(seed + profile.band);
  const budgetMs =
    AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION].timer.durationSec * 1000;
  const answers: DiscriminationTrialAnswerDto[] = [];
  let elapsedMs = 0;
  for (const trial of trials) {
    const timeMs = Math.round(
      Math.max(700, profile.decisionMs * (1 + 0.28 * standardNormal(rng))),
    );
    if (elapsedMs + timeMs > budgetMs) {
      break;
    }
    elapsedMs += timeMs;
    const correct = rng.next() < profile.accuracy;
    const truth = trial.identical ? 'IDENTICAL' : 'DIFFERENT';
    const flipped = trial.identical ? 'DIFFERENT' : 'IDENTICAL';
    answers.push({
      index: trial.index,
      answer: correct ? truth : flipped,
      timeMs,
    });
  }
  return scoreDiscriminationSession(trials, answers).score;
}

function reactivityScoreFor(profile: ReactivityProfile, seed: string): number {
  const stimuli = generateReactivitySession(seed);
  const rng = createSeededRng(seed + profile.band);
  const commands = Object.values(REACTIVITY_COMMAND_BY_TYPE);
  const answers: ReactivityStimulusAnswerDto[] = stimuli.map((stimulus) => {
    if (rng.next() < profile.omitRate) {
      return { index: stimulus.index, commandPressed: null, trMs: null };
    }
    const expected = REACTIVITY_COMMAND_BY_TYPE[stimulus.type];
    const pressed =
      rng.next() < profile.wrongRate
        ? commands.filter((command) => command !== expected)[0]
        : expected;
    const trMs = Math.round(
      Math.max(180, profile.trMs + profile.sdMs * standardNormal(rng)),
    );
    return { index: stimulus.index, commandPressed: pressed, trMs };
  });
  return scoreReactivitySession(stimuli, answers, []).score;
}

function averageOverSeeds(scoreFor: (seed: string) => number): number {
  let sum = 0;
  for (let index = 0; index < ANCHOR_SEED_COUNT; index += 1) {
    sum += scoreFor(`calib-${index}`);
  }
  return sum / ANCHOR_SEED_COUNT;
}

describe('discrimination scoring anchors', () => {
  it.each(DISCRIMINATION_PROFILES)(
    'keeps the $band profile inside its band',
    (profile) => {
      const average = averageOverSeeds((seed) =>
        discriminationScoreFor(profile, seed),
      );
      const band = DISCRIMINATION_BANDS[profile.band];
      expect(average).toBeGreaterThanOrEqual(band.min);
      expect(average).toBeLessThanOrEqual(band.max);
    },
  );
});

describe('reactivity scoring anchors', () => {
  it.each(REACTIVITY_PROFILES)(
    'keeps the $band profile inside its band',
    (profile) => {
      const average = averageOverSeeds((seed) =>
        reactivityScoreFor(profile, seed),
      );
      const band = ANCHOR_BANDS[profile.band];
      expect(average).toBeGreaterThanOrEqual(band.min);
      expect(average).toBeLessThanOrEqual(band.max);
    },
  );
});

import { describe, expect, it } from 'vitest';
import {
  generateLogicSession, scoreLogicSession,
  generateMemorySession, scoreMemorySession, expectedMemoryAnswer,
  generateDiscriminationSession, scoreDiscriminationSession,
  generateReactivitySession, scoreReactivitySession, REACTIVITY_COMMAND_BY_TYPE,
  generateMotricityCourses, scoreMotricitySession,
  LogicFamily, LogicNumericStructure,
  MOTRICITY_SAMPLE_INTERVAL_MS, MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC,
} from '../index';

const SEED = 'golden-seed-2026';

const V = 6;

const logicItems = generateLogicSession(SEED, null, V);
const logicAnswers = logicItems.map((item, i) => {
  if (item.family === LogicFamily.DOMINO) {
    const ok = i % 3 !== 2;
    return { index: item.index, answerIndex: null,
      dominoTop: ok ? item.domino.answer.top : ((item.domino.answer.top + 1) % 7) as 0|1|2|3|4|5|6,
      dominoBottom: item.domino.answer.bottom, timeMs: 5000, helpUsed: false, visited: true };
  }
  if (item.family === LogicFamily.NUMERIC && item.structure === LogicNumericStructure.TRIANGLE) {
    const ok = i % 3 !== 2;
    return { index: item.index, answerIndex: null, numericValue: ok ? item.answer : item.answer + 1, timeMs: 5000, helpUsed: false, visited: true };
  }
  const ok = i % 3 !== 2;
  const right = item.answerIndex;
  const count = item.family === LogicFamily.NUMERIC ? item.choices.length : item.proposals.length;
  return { index: item.index, answerIndex: ok ? right : (right + 1) % count, timeMs: 5000, helpUsed: false, visited: true };
});
const logicScore = scoreLogicSession(logicItems, logicAnswers).score;
const logicSig = logicItems.map((it) => it.family[0] + it.difficulty).join('');

const memSeqs = generateMemorySession(SEED);
const memAnswers = memSeqs.map((s, i) => {
  const exp = expectedMemoryAnswer(s);
  const input = [...exp];
  if (i === 4) input[0] = null as unknown as number;
  return { index: s.index, input, timeMs: 6000, timedOut: false };
});
const memScore = scoreMemorySession(memSeqs, memAnswers).score;
const memSig = memSeqs.map((s) => s.phase[0] + s.length).join('');

const trials = generateDiscriminationSession(SEED);
const discAnswers = trials.slice(0, 30).map((t, i) => ({
  index: t.index,
  answer: (i % 5 === 4 ? !t.identical : t.identical) ? 'IDENTICAL' as const : 'DIFFERENT' as const,
  timeMs: 2500,
}));
const discScore = scoreDiscriminationSession(trials, discAnswers).score;
const discSig = trials.map((t) => (t.identical ? 'i' : 'd')).join('');

const stimuli = generateReactivitySession(SEED);
const reacAnswers = stimuli.map((s, i) => ({
  index: s.index,
  commandPressed: i % 7 === 6 ? null : REACTIVITY_COMMAND_BY_TYPE[s.type],
  trMs: i % 7 === 6 ? null : 480 + (i % 5) * 40,
}));
const reacScore = scoreReactivitySession(stimuli, reacAnswers, []).score;
const reacSig = stimuli.map((s) => s.type[0]).join('');

const courses = generateMotricityCourses(SEED, { contentVersion: V });
const trajectories = courses.map((course) => {
  const samples = [{ t: 0, x: course.startPosition.x, y: course.startPosition.y }];
  let elapsed = 0;
  const pts = [course.startPosition, ...course.segments.map((s) => s.end)];
  for (let p = 1; p < pts.length; p += 1) {
    const from = pts[p - 1], to = pts[p];
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    const step = (MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC * MOTRICITY_SAMPLE_INTERVAL_MS) / 1000;
    for (let d = step; d <= len; d += step) {
      elapsed += MOTRICITY_SAMPLE_INTERVAL_MS;
      samples.push({ t: Math.round(elapsed), x: from.x + ((to.x - from.x) * d) / len, y: from.y + ((to.y - from.y) * d) / len });
    }
  }
  return { index: course.index, samples };
});
const motoScored = scoreMotricitySession(trajectories, SEED, V);
const motoSig = courses.map((c) => `${c.index}:${Math.round(c.totalLength)}`).join('|');


describe('golden determinism: same seed, same items, same scores', () => {
  it('freezes the logic chain', () => {
    expect(logicSig).toBe(
      'N1N1N2N2N3N3N4N4N5N5D1D1D2D2D3D3D4D4D5D5M1M1M2M2M3M3M4M4M5M5M1M1M2M2M3M3M4M4M5M5',
    );
    expect(logicScore).toBe(72);
  });

  it('freezes the memory chain', () => {
    expect(memSig).toBe('N4N5N6I4I5');
    expect(memScore).toBe(94);
  });

  it('freezes the discrimination chain', () => {
    expect(discSig).toBe(
      'iiididdidiiddidddiddiidiididiiiididi',
    );
    // 79 -> 77 : la chaîne golden ne traite que 30 essais sur 36, et depuis la
    // règle du 10/08/2026 les 6 essais jamais atteints pèsent sur la précision.
    expect(discScore).toBe(77);
  });

  it('freezes the reactivity chain', () => {
    expect(reacSig).toBe(
      'YYYYYYYYYYYYYYYYYYYBYYBBYYBBBYYBBBYYBBYBRYBRBRBYBBYBBBRRYY',
    );
    expect(reacScore).toBe(71);
  });

  it('freezes the motricity chain', () => {
    expect(motoSig).toBe('0:1048|1:1265|2:1599');
    expect(motoScored.score).toBe(89);
  });
});

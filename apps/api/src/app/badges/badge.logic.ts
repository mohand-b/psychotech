import { isJsonRecord, readJsonNumber } from '../common/json.util';
import { VISUAL_TOTAL_TRIALS } from '../scoring/scoring.constants';
import { BADGE_DEFINITIONS, BadgeEvaluationState } from './badge.catalog';

export function evaluateUnlockedBadges(
  state: BadgeEvaluationState,
  unlockedCodes: ReadonlySet<string>,
): string[] {
  return BADGE_DEFINITIONS.filter(
    (definition) => !unlockedCodes.has(definition.code) && definition.isUnlocked(state),
  ).map((definition) => definition.code);
}

export function isFlawlessVisualMetrics(metrics: unknown): boolean {
  if (!isJsonRecord(metrics)) {
    return false;
  }
  const truePositives = readJsonNumber(metrics, 'truePositives');
  const trueNegatives = readJsonNumber(metrics, 'trueNegatives');
  if (truePositives === null || trueNegatives === null) {
    return false;
  }
  return truePositives + trueNegatives === VISUAL_TOTAL_TRIALS;
}

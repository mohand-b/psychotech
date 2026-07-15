import { AxisType, RecommendationPriority } from '../enums';

export interface AxisFinding {
  id: string;
  severity: RecommendationPriority;
  finding: string;
  recommendation: string;
}

export interface AxisFindingsEntry {
  axis: AxisType;
  findings: AxisFinding[];
}

export const AXIS_RECOMMENDATIONS_LIMIT = 3;

const SEVERITY_RANK: Record<RecommendationPriority, number> = {
  [RecommendationPriority.HIGH]: 0,
  [RecommendationPriority.MEDIUM]: 1,
  [RecommendationPriority.LOW]: 2,
};

export function sortFindingsBySeverity(
  findings: AxisFinding[],
): AxisFinding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

export function getAxisRecommendations(
  findings: AxisFinding[],
): AxisFinding[] {
  return sortFindingsBySeverity(findings).slice(0, AXIS_RECOMMENDATIONS_LIMIT);
}

export type AxisFindingFamily =
  | 'POST_ERROR_DISRUPTION'
  | 'FATIGUE'
  | 'IMPULSIVITY';

export const AXIS_FINDING_FAMILIES: Record<string, AxisFindingFamily> = {
  REACTIVITY_POST_ERROR_SLOWDOWN: 'POST_ERROR_DISRUPTION',
  MOTRICITY_POST_EXIT_CASCADE: 'POST_ERROR_DISRUPTION',
  REACTIVITY_FATIGUE_SLOPE: 'FATIGUE',
  LOGIC_END_COLLAPSE: 'FATIGUE',
  DISCRIMINATION_VIGILANCE_DROP: 'FATIGUE',
  REACTIVITY_ANTICIPATIONS: 'IMPULSIVITY',
  LOGIC_IMPULSIVITY: 'IMPULSIVITY',
  DISCRIMINATION_RUSH: 'IMPULSIVITY',
  DISCRIMINATION_BIAS_DIFFERENT: 'IMPULSIVITY',
};

export interface CrossAxisFindingFamily {
  family: AxisFindingFamily;
  axes: AxisType[];
}

const FAMILY_RANK: Record<AxisFindingFamily, number> = {
  POST_ERROR_DISRUPTION: 0,
  FATIGUE: 1,
  IMPULSIVITY: 2,
};

export function crossAxisFindingFamilies(
  entries: AxisFindingsEntry[],
): CrossAxisFindingFamily[] {
  const axesByFamily = new Map<AxisFindingFamily, AxisType[]>();
  for (const entry of entries) {
    const families = new Set<AxisFindingFamily>();
    for (const finding of entry.findings) {
      const family = AXIS_FINDING_FAMILIES[finding.id];
      if (family) {
        families.add(family);
      }
    }
    for (const family of families) {
      axesByFamily.set(family, [
        ...(axesByFamily.get(family) ?? []),
        entry.axis,
      ]);
    }
  }
  return [...axesByFamily.entries()]
    .filter(([, axes]) => axes.length >= 2)
    .sort(([a], [b]) => FAMILY_RANK[a] - FAMILY_RANK[b])
    .map(([family, axes]) => ({ family, axes }));
}

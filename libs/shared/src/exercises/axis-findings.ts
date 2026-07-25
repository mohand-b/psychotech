import { AxisType, RecommendationPriority } from '../enums';

export interface AxisFinding {
  id: string;
  severity: RecommendationPriority;
  finding: string;
  recommendation: string;
  deviation?: number;
  evidence?: string;
  priorityLabel?: string;
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
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (b.deviation ?? 0) - (a.deviation ?? 0),
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

export interface CrossAxisFindingOccurrence {
  axis: AxisType;
  evidence: string | null;
}

export interface CrossAxisFindingFamily {
  family: AxisFindingFamily;
  axes: AxisType[];
  occurrences: CrossAxisFindingOccurrence[];
}

const FAMILY_RANK: Record<AxisFindingFamily, number> = {
  POST_ERROR_DISRUPTION: 0,
  FATIGUE: 1,
  IMPULSIVITY: 2,
};

export function crossAxisFindingFamilies(
  entries: AxisFindingsEntry[],
): CrossAxisFindingFamily[] {
  const occurrencesByFamily = new Map<
    AxisFindingFamily,
    CrossAxisFindingOccurrence[]
  >();
  for (const entry of entries) {
    const seenFamilies = new Set<AxisFindingFamily>();
    for (const finding of entry.findings) {
      const family = AXIS_FINDING_FAMILIES[finding.id];
      if (!family || seenFamilies.has(family)) {
        continue;
      }
      seenFamilies.add(family);
      occurrencesByFamily.set(family, [
        ...(occurrencesByFamily.get(family) ?? []),
        { axis: entry.axis, evidence: finding.evidence ?? null },
      ]);
    }
  }
  return [...occurrencesByFamily.entries()]
    .filter(([, occurrences]) => occurrences.length >= 2)
    .sort(([a], [b]) => FAMILY_RANK[a] - FAMILY_RANK[b])
    .map(([family, occurrences]) => ({
      family,
      axes: occurrences.map(({ axis }) => axis),
      occurrences,
    }));
}

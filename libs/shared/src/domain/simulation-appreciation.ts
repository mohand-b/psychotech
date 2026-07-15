import { AxisType } from '../enums';
import {
  AxisFindingFamily,
  AxisFindingsEntry,
  crossAxisFindingFamilies,
} from '../exercises/axis-findings';
import { AXIS_META } from './axis-meta';
import { RailwayPlayableAxis } from './axis-training';
import {
  SimulationAxisOutcome,
  SimulationSummarySelectionDto,
} from './simulation-summary';

export interface AppreciationSegment {
  text: string;
  value: boolean;
}

export interface SimulationPriorityDto {
  axis: AxisType;
  label: string;
}

export interface SimulationAppreciationDto {
  lead: AppreciationSegment[];
  detail: AppreciationSegment[];
  priority: SimulationPriorityDto | null;
}

export interface SimulationAppreciationContext {
  sectorLabel: string;
  globalScore: number;
  admissibilityThreshold: number;
  eliminatoryThreshold: number;
  isEliminated: boolean;
}

export const AXIS_PRIORITY_LABELS: Record<RailwayPlayableAxis, string> = {
  [AxisType.LOGIC]: 'Renforcer les suites logiques',
  [AxisType.MEMORY]: 'Travailler la restitution en ordre inversé',
  [AxisType.VISUAL_DISCRIMINATION]: 'Fiabiliser la comparaison des séquences',
  [AxisType.REACTIVITY]: 'Stabiliser votre temps de réaction',
  [AxisType.MOTOR_SKILLS]: 'Gagner en précision de trajectoire',
};

const COMFORTABLE_MARGIN = 10;
const PRIORITY_LABEL_FALLBACK = 'Entraîner cet axe en priorité';

const FAMILY_TRANSVERSAL_LABELS: Record<AxisFindingFamily, string> = {
  POST_ERROR_DISRUPTION:
    'une erreur vous déstabilise sur les actions qui suivent',
  FATIGUE: 'votre niveau baisse en fin d’épreuve',
  IMPULSIVITY: 'vous déclenchez avant d’avoir toute l’information',
};

function text(value: string): AppreciationSegment {
  return { text: value, value: false };
}

function mono(value: string): AppreciationSegment {
  return { text: value, value: true };
}

function frenchDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
}

function labelOf(axis: AxisType): string {
  return AXIS_META[axis].label;
}

function joinWithArticle(axes: AxisType[]): string {
  const labels = axes.map((axis) => `la ${labelOf(axis)}`);
  return labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}

export function buildSimulationAppreciation(
  context: SimulationAppreciationContext,
  axes: SimulationAxisOutcome[],
  selection: SimulationSummarySelectionDto,
  findingsByAxis: AxisFindingsEntry[] = [],
): SimulationAppreciationDto {
  const eliminatoryAxes = axes.filter(
    (entry) =>
      entry.isCritical && entry.score < context.eliminatoryThreshold,
  );
  const detail = buildDetail(context, axes, selection, eliminatoryAxes);
  const transversal = buildTransversal(findingsByAxis);
  if (transversal !== null) {
    detail.push(text(` ${transversal}`));
  }
  return {
    lead: buildLead(context, eliminatoryAxes),
    detail,
    priority: buildPriority(selection),
  };
}

function buildTransversal(
  findingsByAxis: AxisFindingsEntry[],
): string | null {
  const [family] = crossAxisFindingFamilies(findingsByAxis);
  if (!family) {
    return null;
  }
  return `Constat transversal : sur ${joinWithArticle(family.axes)}, ${FAMILY_TRANSVERSAL_LABELS[family.family]} — c’est le levier commun que révèle cette session, qu’aucun axe seul ne montre.`;
}

function buildLead(
  context: SimulationAppreciationContext,
  eliminatoryAxes: SimulationAxisOutcome[],
): AppreciationSegment[] {
  const gap = context.globalScore - context.admissibilityThreshold;
  if (context.isEliminated && eliminatoryAxes.length > 0) {
    const plural = eliminatoryAxes.length > 1;
    const prefix =
      gap >= 0
        ? `Votre score global dépasse le seuil ${context.sectorLabel}, mais `
        : `Votre score global est sous le seuil ${context.sectorLabel}, et `;
    const segments: AppreciationSegment[] = [
      text(
        `${prefix}${joinWithArticle(
          eliminatoryAxes.map(({ axis }) => axis),
        )} sous ${plural ? 'leur' : 'son'} seuil éliminatoire (`,
      ),
    ];
    eliminatoryAxes.forEach((entry, index) => {
      if (index > 0) {
        segments.push(text(' et '));
      }
      segments.push(mono(`${entry.score}`));
    });
    segments.push(
      text(' contre '),
      mono(`${context.eliminatoryThreshold}`),
      text(
        ` requis) ${plural ? 'rendent' : 'rend'} l’avis défavorable.`,
      ),
    );
    return segments;
  }
  if (gap >= 0) {
    const margin =
      gap < COMFORTABLE_MARGIN
        ? 'avec une marge encore fragile'
        : 'avec une marge confortable';
    return [
      text(`Votre score global dépasse le seuil ${context.sectorLabel} de `),
      mono(frenchDecimal(gap)),
      text(` points : votre profil est admissible, ${margin}.`),
    ];
  }
  return [
    text(`Votre score global est sous le seuil ${context.sectorLabel} de `),
    mono(frenchDecimal(Math.abs(gap))),
    text(
      ' points : votre profil n’est pas encore admissible sur cette session.',
    ),
  ];
}

function buildDetail(
  context: SimulationAppreciationContext,
  axes: SimulationAxisOutcome[],
  selection: SimulationSummarySelectionDto,
  eliminatoryAxes: SimulationAxisOutcome[],
): AppreciationSegment[] {
  const segments: AppreciationSegment[] = [];
  const strengths = selection.strengths;
  const eliminated = context.isEliminated && eliminatoryAxes.length > 0;
  if (strengths.length > 0) {
    segments.push(
      text(eliminated ? 'Vos fondations sont là : la ' : 'La '),
    );
    strengths.forEach((strength, index) => {
      if (index > 0) {
        segments.push(text(' et la '));
      }
      segments.push(
        text(`${labelOf(strength.axis)} (`),
        mono(`${strength.score}`),
        text(')'),
      );
    });
    segments.push(
      text(
        eliminated
          ? `${strengths.length > 1 ? ' sont solides' : ' est solide'}. `
          : `${
              strengths.length > 1
                ? ' portent votre résultat'
                : ' porte votre résultat'
            }. `,
      ),
    );
  }
  if (eliminated) {
    segments.push(
      text(
        `En retravaillant ${joinWithArticle(
          eliminatoryAxes.map(({ axis }) => axis),
        )} en priorité, un avis favorable est à votre portée dès les prochaines sessions.`,
      ),
    );
    return segments;
  }
  const [firstWeakness, secondWeakness] = selection.weaknesses;
  if (!firstWeakness) {
    segments.push(
      text(
        'Aucun axe ne passe sous un seuil : consolidez cette régularité pour sécuriser votre admissibilité.',
      ),
    );
    return segments;
  }
  segments.push(
    text(`La ${labelOf(firstWeakness.axis)} (`),
    mono(`${firstWeakness.score}`),
    text(') reste votre principal levier de progression'),
  );
  if (secondWeakness) {
    const critical =
      axes.find(({ axis }) => axis === secondWeakness.axis)?.isCritical ??
      false;
    segments.push(
      text(
        `, devant la ${labelOf(secondWeakness.axis)}${
          critical ? ', axe critique du secteur' : ''
        }.`,
      ),
    );
  } else {
    segments.push(text('.'));
  }
  return segments;
}

function buildPriority(
  selection: SimulationSummarySelectionDto,
): SimulationPriorityDto | null {
  const first = selection.recommendations[0];
  if (!first) {
    return null;
  }
  return {
    axis: first.axis,
    label:
      AXIS_PRIORITY_LABELS[first.axis as RailwayPlayableAxis] ??
      PRIORITY_LABEL_FALLBACK,
  };
}

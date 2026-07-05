import { LogicItem } from './logic-item';

export type LogicRuleHint =
  | { kind: 'static'; text: string }
  | { kind: 'directional'; increasing: string; decreasing: string };

export const LOGIC_RULE_HINTS: Record<string, LogicRuleHint> = {
  'arithmetic-constant-step': {
    kind: 'directional',
    increasing: "Chaque terme augmente d'un même écart.",
    decreasing: "Chaque terme diminue d'un même écart.",
  },
  'geometric-double-or-triple': {
    kind: 'static',
    text: 'Chaque terme est multiplié par un même facteur.',
  },
  'alternating-two-steps': {
    kind: 'static',
    text: "Deux écarts différents s'alternent.",
  },
  'alternating-add-subtract': {
    kind: 'static',
    text: 'Un écart en plus, puis un écart en moins.',
  },
  'geometric-fast-or-halving': {
    kind: 'directional',
    increasing: 'Chaque terme est multiplié par un même facteur.',
    decreasing: 'Chaque terme est divisé par un même facteur.',
  },
  'increasing-step': {
    kind: 'static',
    text: "L'écart grandit à chaque étape.",
  },
  'squares-plus-constant': {
    kind: 'static',
    text: 'Les termes suivent les carrés des positions.',
  },
  'alternating-multiply-add': {
    kind: 'static',
    text: "Une multiplication puis une addition s'alternent.",
  },
  'fibonacci-like': {
    kind: 'static',
    text: 'Chaque terme est la somme des deux précédents.',
  },
  'interleaved-sequences': {
    kind: 'static',
    text: "Deux suites indépendantes s'alternent.",
  },
  'second-order-differences': {
    kind: 'static',
    text: "L'écart des écarts est constant.",
  },
  powers: {
    kind: 'static',
    text: "Les termes suivent les puissances d'un même nombre.",
  },
  'multiply-by-rank': {
    kind: 'static',
    text: 'Chaque terme est multiplié par sa position.',
  },
  'add-digit-sum': {
    kind: 'static',
    text: 'Chaque terme reçoit la somme de ses propres chiffres.',
  },
  'interleaved-double-fibonacci': {
    kind: 'static',
    text: "Deux suites indépendantes s'alternent.",
  },
};

export function resolveLogicRuleHint(
  item: Pick<LogicItem, 'ruleId' | 'sequence'>,
): string {
  const hint = LOGIC_RULE_HINTS[item.ruleId];
  if (hint.kind === 'static') {
    return hint.text;
  }
  return Number(item.sequence[1]) >= Number(item.sequence[0])
    ? hint.increasing
    : hint.decreasing;
}

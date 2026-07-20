import { LogicRuleItem } from './logic-rule-item';
import { digitSum } from './logic-rules';

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
  item: Pick<LogicRuleItem, 'ruleId' | 'sequence'>,
): string {
  const hint = LOGIC_RULE_HINTS[item.ruleId];
  if (hint.kind === 'static') {
    return hint.text;
  }
  return Number(item.sequence[1]) >= Number(item.sequence[0])
    ? hint.increasing
    : hint.decreasing;
}

export function resolveLogicRuleDetail(
  item: Pick<LogicRuleItem, 'ruleId' | 'sequence'>,
  answer: string,
): string {
  const n = item.sequence.map(Number);
  const last = n[n.length - 1];
  const target = Number(answer);
  const additiveStep = target - last;
  const additiveReading =
    additiveStep >= 0
      ? `${last} + ${additiveStep} = ${target}`
      : `${last} − ${-additiveStep} = ${target}`;
  switch (item.ruleId) {
    case 'arithmetic-constant-step': {
      const step = n[1] - n[0];
      return step >= 0
        ? `La suite avance de ${step} en ${step} : ${additiveReading}.`
        : `La suite recule de ${-step} en ${-step} : ${additiveReading}.`;
    }
    case 'geometric-double-or-triple': {
      const ratio = n[1] / n[0];
      return `Chaque terme est multiplié par ${ratio} : ${last} × ${ratio} = ${target}.`;
    }
    case 'alternating-two-steps': {
      const stepA = n[1] - n[0];
      const stepB = n[2] - n[1];
      return `Les écarts +${stepA} et +${stepB} s'alternent : ${additiveReading}.`;
    }
    case 'alternating-add-subtract': {
      const added = n[1] - n[0];
      const removed = n[1] - n[2];
      return `On ajoute ${added}, puis on retire ${removed}, en alternance : ${additiveReading}.`;
    }
    case 'geometric-fast-or-halving': {
      if (n[1] >= n[0]) {
        const ratio = n[1] / n[0];
        return `Chaque terme est multiplié par ${ratio} : ${last} × ${ratio} = ${target}.`;
      }
      const divisor = n[0] / n[1];
      return `Chaque terme est divisé par ${divisor} : ${last} ÷ ${divisor} = ${target}.`;
    }
    case 'increasing-step':
    case 'second-order-differences': {
      const firstStep = n[1] - n[0];
      const increment = n[2] - n[1] - firstStep;
      return `L'écart grandit de ${increment} à chaque étape : ${additiveReading}.`;
    }
    case 'squares-plus-constant': {
      const root = (n[1] - n[0] - 1) / 2;
      const offset = n[0] - root * root;
      const answerRoot = root + n.length;
      return offset === 0
        ? `Les termes sont les carrés des positions : ${answerRoot}² = ${target}.`
        : `Chaque terme est un carré plus ${offset} : ${answerRoot}² + ${offset} = ${target}.`;
    }
    case 'alternating-multiply-add': {
      const ratio = n[1] / n[0];
      const addend = n[2] - n[1];
      const reading =
        target === last * ratio
          ? `${last} × ${ratio} = ${target}`
          : `${last} + ${addend} = ${target}`;
      return `On multiplie par ${ratio}, puis on ajoute ${addend}, en alternance : ${reading}.`;
    }
    case 'fibonacci-like':
      return `Chaque terme est la somme des deux précédents : ${n[n.length - 2]} + ${last} = ${target}.`;
    case 'interleaved-sequences': {
      const firstStep = n[2] - n[0];
      const secondStep = n[3] - n[1];
      const usedStep = n.length % 2 === 0 ? firstStep : secondStep;
      return `Deux suites s'alternent, l'une avance de ${firstStep}, l'autre de ${secondStep} : ${n[n.length - 2]} + ${usedStep} = ${target}.`;
    }
    case 'powers': {
      const ratio = n[1] / n[0];
      if (n[2] / n[1] === ratio) {
        return `Les termes sont les puissances de ${ratio} : ${last} × ${ratio} = ${target}.`;
      }
      const root = Math.round(Math.cbrt(n[0]));
      const answerRoot = root + n.length;
      return `Les termes sont les cubes des positions : ${answerRoot}³ = ${target}.`;
    }
    case 'multiply-by-rank': {
      const factor = target / last;
      return `Le multiplicateur augmente de 1 à chaque terme : ${last} × ${factor} = ${target}.`;
    }
    case 'add-digit-sum':
      return `Chaque terme reçoit la somme de ses propres chiffres : ${last} + ${digitSum(last)} = ${target}.`;
    case 'interleaved-double-fibonacci':
      return `Deux suites s'alternent, l'une double, l'autre ajoute ses deux termes précédents : ${n[n.length - 2]} × 2 = ${target}.`;
    default:
      return resolveLogicRuleHint(item);
  }
}

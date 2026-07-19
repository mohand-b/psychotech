import { TriangleValues } from './triangle-item';

export interface TrianglePattern {
  id: string;
  level: 1 | 2 | 3 | 5;
  usesPreviousCenter: boolean;
  userText: string;
  compute(values: TriangleValues, previousCenter: number | null): number | null;
}

function vertexSum(values: TriangleValues): number {
  return values.top + values.left + values.right;
}

export const TRIANGLE_PATTERNS: readonly TrianglePattern[] = [
  {
    id: 'center-sum',
    level: 1,
    usesPreviousCenter: false,
    userText: 'Le centre = la somme des trois sommets.',
    compute: (values) => vertexSum(values),
  },
  {
    id: 'center-top-plus-left-minus-right',
    level: 2,
    usesPreviousCenter: false,
    userText:
      'Le centre = sommet du haut + sommet de gauche, moins celui de droite.',
    compute: (values) => values.top + values.left - values.right,
  },
  {
    id: 'center-top-plus-right-minus-left',
    level: 2,
    usesPreviousCenter: false,
    userText:
      'Le centre = sommet du haut + sommet de droite, moins celui de gauche.',
    compute: (values) => values.top + values.right - values.left,
  },
  {
    id: 'center-left-plus-right-minus-top',
    level: 2,
    usesPreviousCenter: false,
    userText:
      'Le centre = sommet de gauche + sommet de droite, moins celui du haut.',
    compute: (values) => values.left + values.right - values.top,
  },
  {
    id: 'center-top-times-left-minus-right',
    level: 3,
    usesPreviousCenter: false,
    userText:
      'Le centre = sommet du haut × sommet de gauche, moins celui de droite.',
    compute: (values) => values.top * values.left - values.right,
  },
  {
    id: 'center-top-times-right-minus-left',
    level: 3,
    usesPreviousCenter: false,
    userText:
      'Le centre = sommet du haut × sommet de droite, moins celui de gauche.',
    compute: (values) => values.top * values.right - values.left,
  },
  {
    id: 'center-left-times-right-minus-top',
    level: 3,
    usesPreviousCenter: false,
    userText:
      'Le centre = sommet de gauche × sommet de droite, moins celui du haut.',
    compute: (values) => values.left * values.right - values.top,
  },
  {
    id: 'center-sum-minus-previous',
    level: 5,
    usesPreviousCenter: true,
    userText:
      'Le centre = la somme des sommets, moins le centre du triangle précédent.',
    compute: (values, previousCenter) =>
      previousCenter === null ? null : vertexSum(values) - previousCenter,
  },
  {
    id: 'center-previous-plus-top-minus-right',
    level: 5,
    usesPreviousCenter: true,
    userText:
      'Le centre = le centre du triangle précédent + sommet du haut, moins celui de droite.',
    compute: (values, previousCenter) =>
      previousCenter === null
        ? null
        : previousCenter + values.top - values.right,
  },
];

export function trianglePatternById(id: string): TrianglePattern {
  const pattern = TRIANGLE_PATTERNS.find((candidate) => candidate.id === id);
  if (!pattern) {
    throw new Error(`Unknown triangle pattern ${id}`);
  }
  return pattern;
}

export function formatTriangleReading(
  patternId: string,
  values: TriangleValues,
  previousCenter: number | null,
): string {
  const { top, left, right, center } = values;
  if (trianglePatternById(patternId).usesPreviousCenter && previousCenter === null) {
    return `centre de départ : ${center}`;
  }
  switch (patternId) {
    case 'center-sum':
      return `${top} + ${left} + ${right} = ${center}`;
    case 'center-top-plus-left-minus-right':
      return `${top} + ${left} − ${right} = ${center}`;
    case 'center-top-plus-right-minus-left':
      return `${top} + ${right} − ${left} = ${center}`;
    case 'center-left-plus-right-minus-top':
      return `${left} + ${right} − ${top} = ${center}`;
    case 'center-top-times-left-minus-right':
      return `${top} × ${left} − ${right} = ${center}`;
    case 'center-top-times-right-minus-left':
      return `${top} × ${right} − ${left} = ${center}`;
    case 'center-left-times-right-minus-top':
      return `${left} × ${right} − ${top} = ${center}`;
    case 'center-sum-minus-previous':
      return `${top} + ${left} + ${right} − ${previousCenter} = ${center}`;
    case 'center-previous-plus-top-minus-right':
      return `${previousCenter} + ${top} − ${right} = ${center}`;
    default:
      throw new Error(`Unknown triangle pattern ${patternId}`);
  }
}

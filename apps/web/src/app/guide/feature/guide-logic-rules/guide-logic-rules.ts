import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AxisType, GuideId } from '@psychotech/shared';
import { ChevronLeft } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Icon } from '../../../shared/ui/icon/icon';
import { AXIS_SLUGS } from '../../../shared/util/axis-slug';
import { GuideReadCheck } from '../../ui/guide-read-check/guide-read-check';
import { GuideScrollTop } from '../../ui/guide-scroll-top/guide-scroll-top';
import { SmoothAnchors } from '../../ui/smooth-anchors.directive';
import {
  GUIDE_AXIS_ANCHORS,
  GUIDE_LOGIC_RULES_ANCHORS,
  GUIDE_PATH,
} from '../../util/guide-anchors';
import { navigateBack } from '../../util/guide-back';

interface SequenceCell {
  kind: 'tile' | 'op' | 'answer';
  text: string;
}

interface SequenceRule {
  name: string;
  cells: SequenceCell[];
  lecture: string;
  note: string | null;
}

interface SequenceGroup {
  label: string;
  rules: SequenceRule[];
}

interface DominoPip {
  left: string;
  top: string;
}

interface GuideDominoTile {
  answer: boolean;
  topPips: DominoPip[];
  bottomPips: DominoPip[];
}

interface DominoFaceRule {
  label: string;
  example: string;
}

interface DominoLoopChip {
  text: string;
  highlighted: boolean;
}

interface DominoCard {
  name: string;
  tiles: GuideDominoTile[];
  caption: string;
  faceRules: DominoFaceRule[] | null;
  loop: DominoLoopChip[] | null;
}

const DOMINO_PIP_LAYOUT: Record<number, readonly [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 28],
    [72, 28],
    [28, 50],
    [72, 50],
    [28, 72],
    [72, 72],
  ],
};

function pipsFor(value: number): DominoPip[] {
  return DOMINO_PIP_LAYOUT[value].map(([x, y]) => ({
    left: `calc(${x}% - 3px)`,
    top: `calc(${y}% - 3px)`,
  }));
}

function dominoTile(top: number, bottom: number): GuideDominoTile {
  return { answer: false, topPips: pipsFor(top), bottomPips: pipsFor(bottom) };
}

const DOMINO_ANSWER_TILE: GuideDominoTile = {
  answer: true,
  topPips: [],
  bottomPips: [],
};

function sequenceRow(values: number[], ops: string[] = []): SequenceCell[] {
  const cells: SequenceCell[] = [];
  values.forEach((value, index) => {
    const last = index === values.length - 1;
    cells.push({ kind: last ? 'answer' : 'tile', text: String(value) });
    if (!last && ops[index]) {
      cells.push({ kind: 'op', text: ops[index] });
    }
  });
  return cells;
}

function loopChip(text: string, highlighted = false): DominoLoopChip {
  return { text, highlighted };
}

const SEQUENCE_GROUPS: readonly SequenceGroup[] = [
  {
    label: 'Un pas régulier',
    rules: [
      {
        name: 'Pas constant',
        cells: sequenceRow([3, 7, 11, 15, 19, 23], ['+4', '+4', '+4', '+4', '+4']),
        lecture: 'La suite avance ou recule toujours du même pas, de 2 à 9.',
        note: null,
      },
      {
        name: 'Doublement ou triplement',
        cells: sequenceRow([2, 6, 18, 54, 162, 486], ['×3', '×3', '×3', '×3', '×3']),
        lecture: 'Chaque terme est multiplié par 2 ou par 3.',
        note: null,
      },
      {
        name: 'Multiplication rapide ou moitiés',
        cells: sequenceRow([96, 48, 24, 12, 6, 3], ['÷2', '÷2', '÷2', '÷2', '÷2']),
        lecture: 'La suite est multipliée par 4 ou 5, ou divisée par 2 comme ici.',
        note: null,
      },
    ],
  },
  {
    label: 'Deux mouvements en alternance',
    rules: [
      {
        name: 'Deux pas en alternance',
        cells: sequenceRow([4, 7, 13, 16, 22, 25], ['+3', '+6', '+3', '+6', '+3']),
        lecture: 'Deux pas différents se relaient un terme sur deux.',
        note: null,
      },
      {
        name: 'Addition puis soustraction',
        cells: sequenceRow([12, 19, 16, 23, 20, 27], ['+7', '−3', '+7', '−3', '+7']),
        lecture: 'Un pas en avant, un pas en arrière, en alternance.',
        note: null,
      },
    ],
  },
  {
    label: 'Un pas qui évolue',
    rules: [
      {
        name: 'Pas croissant',
        cells: sequenceRow([5, 7, 10, 14, 19, 25], ['+2', '+3', '+4', '+5', '+6']),
        lecture: 'Le pas grandit de 1 à chaque nouveau terme.',
        note: null,
      },
    ],
  },
  {
    label: 'Suites qui se combinent',
    rules: [
      {
        name: 'Type Fibonacci',
        cells: sequenceRow([2, 5, 7, 12, 19, 31]),
        lecture: 'Chaque terme est la somme des deux précédents.',
        note: '2+5=7 · 5+7=12 · 7+12=19 · 12+19=31',
      },
      {
        name: 'Ajout de la somme des chiffres',
        cells: sequenceRow([23, 28, 38, 49, 62, 70], ['+5', '+10', '+11', '+13', '+8']),
        lecture: "Chaque terme s'augmente de la somme de ses propres chiffres.",
        note: '23+(2+3)=28 · 28+(2+8)=38 · 38+(3+8)=49…',
      },
    ],
  },
];

const DOMINO_CARDS: readonly DominoCard[] = [
  {
    name: 'Deux faces indépendantes',
    tiles: [
      dominoTile(1, 4),
      dominoTile(2, 4),
      dominoTile(3, 4),
      dominoTile(4, 4),
      dominoTile(5, 4),
      DOMINO_ANSWER_TILE,
    ],
    caption:
      "Le haut et le bas suivent chacun leur propre règle, indépendante. La forme la plus simple : une face avance de 1, l'autre reste constante, sans bouclage. Réponse : 6 en haut, 4 en bas.",
    faceRules: [
      { label: 'Valeur constante', example: '4, 4, 4, 4…' },
      { label: 'Pas fixe', example: '1, 3, 5, 0, 2… (+2)' },
    ],
    loop: null,
  },
  {
    name: 'La boucle après 6',
    tiles: [
      dominoTile(3, 1),
      dominoTile(5, 0),
      dominoTile(0, 6),
      dominoTile(2, 5),
      DOMINO_ANSWER_TILE,
    ],
    caption:
      'Les faces comptent en boucle : après 6 on revient à 0, et en reculant, avant 0 on retombe sur 6. Ici le haut avance de 2 (5 puis 0), le bas recule de 1 (0 puis 6). Réponse : 4 et 4.',
    faceRules: null,
    loop: [
      loopChip('0'),
      loopChip('1'),
      loopChip('2'),
      loopChip('3'),
      loopChip('4'),
      loopChip('5'),
      loopChip('6'),
      loopChip('0', true),
      loopChip('1', true),
      loopChip('…', true),
    ],
  },
  {
    name: 'Les diagonales avancent',
    tiles: [
      dominoTile(2, 0),
      dominoTile(1, 3),
      dominoTile(4, 2),
      dominoTile(3, 5),
      DOMINO_ANSWER_TILE,
    ],
    caption:
      'Chaque face reprend en diagonale la face opposée du domino précédent en ajoutant 1 : le haut continue le bas, le bas continue le haut. Réponse : 6 en haut, 4 en bas.',
    faceRules: null,
    loop: null,
  },
  {
    name: 'Diagonales opposées',
    tiles: [
      dominoTile(0, 4),
      dominoTile(3, 1),
      dominoTile(2, 2),
      dominoTile(1, 3),
      DOMINO_ANSWER_TILE,
    ],
    caption:
      'Deux diagonales en zigzag : celle qui part du haut avance de 1 (0, 1, 2, 3…), celle qui part du bas recule de 1 (4, 3, 2, 1…). Réponse : 4 en haut, 0 en bas.',
    faceRules: null,
    loop: null,
  },
];

@Component({
  selector: 'app-guide-logic-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, GuideReadCheck, GuideScrollTop, Icon, RouterLink],
  hostDirectives: [SmoothAnchors],
  templateUrl: './guide-logic-rules.html',
  styleUrls: ['../guide-shared.css', './guide-logic-rules.css'],
})
export class GuideLogicRules {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacade);
  private readonly badgesFacade = inject(BadgesFacade);

  private readonly locallyMarked = signal(false);
  protected readonly guideRead = computed(
    () =>
      this.locallyMarked() ||
      this.authFacade.currentUser()?.logicGuideReadAt != null,
  );

  protected readonly AxisType = AxisType;
  protected readonly backIcon = ChevronLeft;
  protected readonly anchors = GUIDE_LOGIC_RULES_ANCHORS;
  protected readonly hubPath = GUIDE_PATH;
  protected readonly hubLogicAnchor = GUIDE_AXIS_ANCHORS[AxisType.LOGIC];
  protected readonly discoveryLink = [
    '/entrainements',
    'tutoriel',
    AXIS_SLUGS[AxisType.LOGIC],
  ];
  protected readonly sequenceGroups = SEQUENCE_GROUPS;
  protected readonly dominoCards = DOMINO_CARDS;

  protected back(): void {
    navigateBack(this.location, this.router, GUIDE_PATH);
  }

  protected markRead(): void {
    this.locallyMarked.set(true);
    this.badgesFacade.markGuideRead(GuideId.LOGIC_GUIDE);
  }
}

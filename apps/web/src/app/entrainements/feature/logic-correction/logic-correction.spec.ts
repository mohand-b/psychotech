import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  DominoFace,
  LOGIC_CONTENT_VERSION_V4,
  LogicFamily,
  LogicItemAnswerDto,
  LogicNumericStructure,
  ScoreBand,
  Sector,
  TargetedLogicResultDto,
  generateLogicSession,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { LogicCorrection } from './logic-correction';

const SESSION_ID = 'session-logic-v2';
const SEED = 'seed-logic-v2';
const DOMINO_INDEX = 10;

const items = generateLogicSession(SEED, null, LOGIC_CONTENT_VERSION_V4);
const dominoItem = items[DOMINO_INDEX];

const triangleIndex = items.findIndex(
  (item) =>
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.TRIANGLE,
);
const triangleItem = (() => {
  const item = items[triangleIndex];
  if (
    item.family !== LogicFamily.NUMERIC ||
    item.structure !== LogicNumericStructure.TRIANGLE
  ) {
    throw new Error('Expected a triangle item');
  }
  return item;
})();

function dominoOf(item: (typeof items)[number]) {
  if (item.family !== LogicFamily.DOMINO) {
    throw new Error('Expected a domino item');
  }
  return item.domino;
}

function buildResult(responses: LogicItemAnswerDto[]): TargetedLogicResultDto {
  return {
    axis: AxisType.LOGIC,
    sessionId: SESSION_ID,
    sector: Sector.RAILWAY,
    seed: SEED,
    helpEnabled: false,
    score: 50,
    band: ScoreBand.FRAGILE,
    startedAt: '2026-07-16T10:00:00.000Z',
    completedAt: '2026-07-16T10:10:00.000Z',
    bestScore: 50,
    isNewBest: false,
    isEqualBest: false,
    previousBestScore: null,
    untimed: false,
    contentVersion: LOGIC_CONTENT_VERSION_V4,
    logicFamily: null,
    items: responses,
  };
}

interface Setup {
  fixture: ComponentFixture<LogicCorrection>;
  element: HTMLElement;
}

async function setup(responses: LogicItemAnswerDto[]): Promise<Setup> {
  await TestBed.configureTestingModule({
    imports: [LogicCorrection],
    providers: [
      provideRouter([]),
      {
        provide: TrainingSessionFacade,
        useValue: {
          loadTargetedResult: vi.fn(() => of(buildResult(responses))),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ sessionId: SESSION_ID }),
            data: {},
          },
        },
      },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LogicCorrection);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  const dots = element.querySelectorAll<HTMLButtonElement>('.band__dot');
  dots[DOMINO_INDEX].click();
  fixture.detectChanges();
  return { fixture, element };
}

function dominoResponse(
  overrides: Partial<LogicItemAnswerDto>,
): LogicItemAnswerDto {
  return {
    index: DOMINO_INDEX,
    answerIndex: null,
    timeMs: 1000,
    helpUsed: false,
    visited: true,
    ...overrides,
  };
}

describe('LogicCorrection — rendu unifié des dominos', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('intègre la bonne réponse en tuile verte finale sans emplacement fantôme', async () => {
    const domino = dominoOf(dominoItem);
    const result = await setup([
      dominoResponse({
        dominoTop: domino.answer.top,
        dominoBottom: domino.answer.bottom,
      }),
    ]);

    const tiles = result.element.querySelectorAll(
      '.corr-dom__seq .corr-dom__tile',
    );
    expect(tiles).toHaveLength(domino.visibleTiles.length + 1);
    expect(tiles[tiles.length - 1].classList).toContain(
      'corr-dom__tile--correct',
    );
    expect(
      result.element.querySelector('.corr-dom')?.textContent,
    ).not.toContain('?');
    expect(result.element.querySelector('.corr-dom__user')).toBeNull();
  });

  it('affiche la réponse du candidat dessous quand elle est fausse', async () => {
    const domino = dominoOf(dominoItem);
    const wrongTop = ((domino.answer.top + 1) % 7) as DominoFace;
    const result = await setup([
      dominoResponse({
        dominoTop: wrongTop,
        dominoBottom: domino.answer.bottom,
      }),
    ]);

    const user = result.element.querySelector('.corr-dom__user');
    expect(user).not.toBeNull();
    expect(user?.querySelector('.corr-dom__tile--user')).not.toBeNull();
    expect(user?.textContent).toContain('Votre réponse');
    const tiles = result.element.querySelectorAll(
      '.corr-dom__seq .corr-dom__tile',
    );
    expect(tiles).toHaveLength(domino.visibleTiles.length + 1);
  });

  it('remplit en vert la valeur correcte des suites et des triangles', async () => {
    const result = await setup([]);
    const goTo = (index: number) => {
      result.element
        .querySelectorAll<HTMLButtonElement>('.band__dot')
        [index].click();
      result.fixture.detectChanges();
    };

    const sequenceIndex = items.findIndex(
      (item) =>
        item.family === LogicFamily.NUMERIC &&
        item.structure === LogicNumericStructure.SEQUENCE,
    );
    goTo(sequenceIndex);
    const unknown = result.element.querySelector('.seq__unknown');
    expect(unknown?.classList).toContain('seq__unknown--correct');
    expect(unknown?.textContent?.trim()).not.toBe('?');

    goTo(triangleIndex);
    const chips = result.element.querySelectorAll('.corr-tri .choices__item');
    expect(chips).toHaveLength(4);
    expect(
      chips[triangleItem.answerIndex].classList.contains(
        'choices__item--correct',
      ),
    ).toBe(true);
    expect(chips[triangleItem.answerIndex].textContent).toContain(
      String(triangleItem.answer),
    );
    expect(
      result.element.querySelector('.corr-tri__seq')?.textContent,
    ).not.toContain('?');
    expect(result.element.textContent).not.toContain('Bonne réponse');
  });
});

describe('LogicCorrection — revue des propositions triangles', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  async function setupTriangle(
    numericValue: number | null,
  ): Promise<Setup> {
    const result = await setup([
      {
        index: triangleIndex,
        answerIndex: null,
        numericValue,
        timeMs: 1000,
        helpUsed: false,
        visited: true,
      },
    ]);
    result.element
      .querySelectorAll<HTMLButtonElement>('.band__dot')
      [triangleIndex].click();
    result.fixture.detectChanges();
    return result;
  }

  it('marque le mauvais choix du candidat et la bonne proposition', async () => {
    const wrongIndex = (triangleItem.answerIndex + 1) % 4;
    const result = await setupTriangle(
      Number(triangleItem.choices[wrongIndex]),
    );
    const chips = result.element.querySelectorAll('.corr-tri .choices__item');
    expect(
      chips[triangleItem.answerIndex].classList.contains(
        'choices__item--correct',
      ),
    ).toBe(true);
    expect(
      chips[wrongIndex].classList.contains('choices__item--wrong'),
    ).toBe(true);
    expect(chips[wrongIndex].textContent).toContain('Votre réponse');
    expect(result.element.querySelector('.corr-tri__free')).toBeNull();
  });

  it('affiche une valeur libre héritée de la saisie directe hors propositions', async () => {
    let free = 89;
    while (triangleItem.choices.includes(String(free))) {
      free -= 1;
    }
    const result = await setupTriangle(free);
    const chips = result.element.querySelectorAll('.corr-tri .choices__item');
    expect(
      chips[triangleItem.answerIndex].classList.contains(
        'choices__item--correct',
      ),
    ).toBe(true);
    expect(
      result.element.querySelector('.corr-tri .choices__item--wrong'),
    ).toBeNull();
    expect(
      result.element.querySelector('.corr-tri__free')?.textContent,
    ).toContain(`Votre réponse : ${free}`);
  });

  it('reste net sans réponse : bonne proposition seule, pas de valeur libre', async () => {
    const result = await setupTriangle(null);
    expect(
      result.element.querySelector('.corr-tri .choices__item--correct'),
    ).not.toBeNull();
    expect(
      result.element.querySelector('.corr-tri .choices__item--wrong'),
    ).toBeNull();
    expect(result.element.querySelector('.corr-tri__free')).toBeNull();
  });
});

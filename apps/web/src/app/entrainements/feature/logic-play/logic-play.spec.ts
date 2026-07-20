import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  CompleteTargetedSessionDto,
  LOGIC_CONTENT_VERSION_V2,
  LOGIC_CONTENT_VERSION_V3,
  LogicFamily,
  LogicNumericStructure,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  TrainingOptionId,
  TriangleSlot,
  generateLogicSession,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { TrainingSessionStore } from '../../../sessions/data-access/training-session.store';
import { TutorialRunFacade } from '../../data-access/tutorial-run.facade';
import {
  TUTORIAL_SESSION_ID,
  tutorialSessionProviders,
} from '../../data-access/tutorial-session.facade';
import { LogicPlay } from './logic-play';

const SESSION_ID = 'session-logic-v2';

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: SESSION_ID,
    mode: SessionMode.TARGETED,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-logic-v2',
    contentVersion: LOGIC_CONTENT_VERSION_V2,
    logicFamily: null,
    options: { enabledOptions: [] },
    energyCost: 1,
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: '2026-07-16T10:00:00.000Z',
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: [
      {
        axis: AxisType.LOGIC,
        order: 0,
        normalizedScore: null,
        band: null,
        skipped: false,
        metrics: null,
        startedAt: '2026-07-16T10:00:00.000Z',
        completedAt: null,
      },
    ],
    recommendations: [],
    ...overrides,
  };
}

interface Setup {
  fixture: ComponentFixture<LogicPlay>;
  element: HTMLElement;
  completeTargeted: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.spyOn>;
}

async function setup(overrides: Partial<SessionDto> = {}): Promise<Setup> {
  const completeTargeted = vi.fn(() =>
    of(buildSession({ ...overrides, status: SessionStatus.COMPLETED })),
  );
  await TestBed.configureTestingModule({
    imports: [LogicPlay],
    providers: [
      provideRouter([]),
      {
        provide: SessionsApi,
        useValue: { start: vi.fn(), get: vi.fn(), completeTargeted },
      },
      { provide: EnergyFacade, useValue: { load: vi.fn(() => of(null)) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ sessionId: SESSION_ID }) },
        },
      },
    ],
  }).compileComponents();
  TestBed.inject(TrainingSessionStore).setSession(buildSession(overrides));
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LogicPlay);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  (element.querySelector('.countdown__skip') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { fixture, element, completeTargeted, navigate };
}

function pressKey(
  fixture: Setup['fixture'],
  key: string,
): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  fixture.detectChanges();
}

function goToItem(setupResult: Setup, index: number): void {
  const buttons =
    setupResult.element.querySelectorAll<HTMLButtonElement>('.band__seg');
  buttons[index].click();
  setupResult.fixture.detectChanges();
}

function nextButton(element: HTMLElement): HTMLButtonElement {
  return element.querySelector('.play__next button') as HTMLButtonElement;
}

describe('LogicPlay (contenu v2)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    TestBed.inject(TrainingSessionStore).setSession(null);
    TestBed.resetTestingModule();
  });

  it('shows the segmented band with 4 blocks of 10 items', async () => {
    const result = await setup();
    const groups = result.element.querySelectorAll('.band__group');
    expect(groups).toHaveLength(4);
    groups.forEach((group) => {
      expect(group.querySelectorAll('.band__seg')).toHaveLength(10);
    });
    expect(groups[0].getAttribute('title')).toBe('Numérique · items 1 à 10');
    expect(groups[1].getAttribute('title')).toBe('Dominos · items 11 à 20');
    expect(groups[2].getAttribute('title')).toBe('Matrices I · items 21 à 30');
    expect(groups[3].getAttribute('title')).toBe('Matrices II · items 31 à 40');
  });

  it('renders each family with its dedicated board', async () => {
    const result = await setup();
    expect(result.element.querySelector('ui-logic-sequence')).not.toBeNull();
    expect(result.element.textContent).toContain('Complétez la suite');

    goToItem(result, 10);
    expect(result.element.querySelector('ui-logic-domino')).not.toBeNull();
    expect(result.element.textContent).toContain(
      'Déduisez le dernier domino et saisissez ses deux faces',
    );

    goToItem(result, 20);
    expect(result.element.querySelector('ui-logic-matrix')).not.toBeNull();
    expect(result.element.textContent).toContain(
      'Choisissez la figure qui complète la grille',
    );

    goToItem(result, 30);
    expect(result.element.querySelector('ui-logic-matrix')).not.toBeNull();
  });

  it('renders the family badge on every item head', async () => {
    const result = await setup();
    const badgeText = () =>
      result.element.querySelector('.head__badge')?.textContent?.trim();
    expect(badgeText()).toBe('Suites numériques');

    goToItem(result, 10);
    expect(badgeText()).toBe('Dominos');

    goToItem(result, 20);
    expect(badgeText()).toBe('Matrices');

    goToItem(result, 30);
    expect(badgeText()).toBe('Matrices');
  });

  it('fills the sequence unknown case with the selected proposal', async () => {
    const result = await setup();
    const unknown = () => result.element.querySelector('.seq__unknown');
    expect(unknown()?.classList).not.toContain('seq__unknown--filled');
    expect(unknown()?.textContent?.trim()).toBe('?');

    const choices =
      result.element.querySelectorAll<HTMLButtonElement>('.choices__item');
    const chosenValue = choices[1]
      .querySelector('.choices__value')
      ?.textContent?.trim();
    choices[1].click();
    result.fixture.detectChanges();

    expect(unknown()?.classList).toContain('seq__unknown--filled');
    expect(unknown()?.textContent?.trim()).toBe(chosenValue);
  });

  it('reflects domino answer states on each face of the answer tile', async () => {
    const result = await setup();
    goToItem(result, 10);
    const face = (selector: string) =>
      result.element.querySelector(selector) as HTMLButtonElement;
    expect(face('.dom__face--top').classList).toContain('dom__face--active');
    expect(face('.dom__face--top').classList).not.toContain(
      'dom__face--filled',
    );

    pressKey(result.fixture, '4');
    expect(face('.dom__face--top').classList).toContain('dom__face--filled');
    expect(face('.dom__face--top').classList).not.toContain(
      'dom__face--active',
    );
    expect(face('.dom__face--bottom').classList).toContain(
      'dom__face--active',
    );

    pressKey(result.fixture, '2');
    expect(face('.dom__face--bottom').classList).toContain(
      'dom__face--filled',
    );
  });

  it('treats a domino item as answered only once both faces are set', async () => {
    const result = await setup();
    goToItem(result, 10);
    expect(nextButton(result.element).disabled).toBe(true);

    pressKey(result.fixture, '4');
    expect(nextButton(result.element).disabled).toBe(true);

    pressKey(result.fixture, '2');
    expect(nextButton(result.element).disabled).toBe(false);

    const chipValues = Array.from(
      result.element.querySelectorAll('.dom__chip-value'),
    ).map((chip) => chip.textContent?.trim());
    expect(chipValues).toEqual(['4', '2']);
  });

  it('lets the candidate retarget a face and modify a complete answer', async () => {
    const result = await setup();
    goToItem(result, 10);
    pressKey(result.fixture, '4');
    pressKey(result.fixture, '2');

    const chips =
      result.element.querySelectorAll<HTMLButtonElement>('.dom__chip');
    chips[0].click();
    result.fixture.detectChanges();
    pressKey(result.fixture, '6');

    const chipValues = Array.from(
      result.element.querySelectorAll('.dom__chip-value'),
    ).map((chip) => chip.textContent?.trim());
    expect(chipValues).toEqual(['6', '2']);
    expect(nextButton(result.element).disabled).toBe(false);
  });

  it('erases the bottom face first with backspace', async () => {
    const result = await setup();
    goToItem(result, 10);
    pressKey(result.fixture, '4');
    pressKey(result.fixture, '2');

    pressKey(result.fixture, 'Backspace');
    let chipValues = Array.from(
      result.element.querySelectorAll('.dom__chip-value'),
    ).map((chip) => chip.textContent?.trim());
    expect(chipValues).toEqual(['4', '?']);

    pressKey(result.fixture, 'Backspace');
    chipValues = Array.from(
      result.element.querySelectorAll('.dom__chip-value'),
    ).map((chip) => chip.textContent?.trim());
    expect(chipValues).toEqual(['?', '?']);
  });

  it('offers 4 matrix proposals selectable by click and keyboard', async () => {
    const result = await setup();
    goToItem(result, 20);
    const proposals =
      result.element.querySelectorAll<HTMLButtonElement>('.mx__prop');
    expect(proposals).toHaveLength(4);

    proposals[2].click();
    result.fixture.detectChanges();
    expect(
      result.element.querySelectorAll('.mx__prop')[2].classList,
    ).toContain('mx__prop--selected');

    pressKey(result.fixture, 'd');
    expect(
      result.element.querySelectorAll('.mx__prop')[3].classList,
    ).toContain('mx__prop--selected');

    pressKey(result.fixture, '1');
    expect(
      result.element.querySelectorAll('.mx__prop')[0].classList,
    ).toContain('mx__prop--selected');
    expect(nextButton(result.element).disabled).toBe(false);
  });

  it('keeps free navigation across blocks through the segmented band', async () => {
    const result = await setup();
    goToItem(result, 35);
    expect(result.element.querySelector('ui-logic-matrix')).not.toBeNull();

    goToItem(result, 0);
    expect(result.element.querySelector('ui-logic-sequence')).not.toBeNull();

    goToItem(result, 12);
    expect(result.element.querySelector('ui-logic-domino')).not.toBeNull();
    const current = result.element.querySelector('.band__seg--current');
    expect(current?.getAttribute('title')).toBe('Item 13');
  });

  it('submits domino faces and QCM answers in the payload', async () => {
    const result = await setup();
    goToItem(result, 10);
    pressKey(result.fixture, '4');
    pressKey(result.fixture, '2');

    goToItem(result, 39);
    pressKey(result.fixture, '1');
    pressKey(result.fixture, 'Enter');

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    const [sessionId, axis, body] = result.completeTargeted.mock.calls[0] as [
      string,
      AxisType,
      CompleteTargetedSessionDto,
    ];
    expect(sessionId).toBe(SESSION_ID);
    expect(axis).toBe(AxisType.LOGIC);
    const items = body.items ?? [];
    expect(items).toHaveLength(40);
    expect(items[10]).toMatchObject({
      index: 10,
      answerIndex: null,
      dominoTop: 4,
      dominoBottom: 2,
      visited: true,
    });
    expect(items[39]).toMatchObject({ index: 39, answerIndex: 0 });
    expect(items[0]).toMatchObject({ index: 0, answerIndex: null });
    expect(items[5].dominoTop).toBeUndefined();
    expect(result.navigate).toHaveBeenCalled();
  });

  it('lets the candidate finish from an unanswered last item', async () => {
    const result = await setup();
    expect(nextButton(result.element).disabled).toBe(true);

    goToItem(result, 39);
    const finish = nextButton(result.element);
    expect(finish.textContent).toContain('Terminer');
    expect(finish.disabled).toBe(false);

    finish.click();
    result.fixture.detectChanges();
    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    const [, , body] = result.completeTargeted.mock.calls[0] as [
      string,
      AxisType,
      CompleteTargetedSessionDto,
    ];
    expect((body.items ?? [])[39]).toMatchObject({
      index: 39,
      answerIndex: null,
    });
  });

  it('shows the generic domino hint without the precise steps', async () => {
    const result = await setup({
      options: { enabledOptions: [TrainingOptionId.LOGIC_HELP] },
    });
    goToItem(result, 10);
    pressKey(result.fixture, 'h');

    const dominoItem = generateLogicSession(
      'seed-logic-v2',
      null,
      LOGIC_CONTENT_VERSION_V2,
    )[10];
    const text =
      result.element.querySelector('.hint__text')?.textContent?.trim();
    expect(text).toBe(dominoItem.rule.hintText);
    expect(text).not.toBe(dominoItem.rule.userText);
  });
});

const SLOT_ATTRIBUTES: Record<TriangleSlot, string> = {
  [TriangleSlot.TOP]: 'top',
  [TriangleSlot.LEFT]: 'left',
  [TriangleSlot.RIGHT]: 'right',
  [TriangleSlot.CENTER]: 'center',
};

const V3_OVERRIDES: Partial<SessionDto> = {
  contentVersion: LOGIC_CONTENT_VERSION_V3,
};

const v3BlockOne = generateLogicSession(
  'seed-logic-v2',
  null,
  LOGIC_CONTENT_VERSION_V3,
).slice(0, 10);

const v3Triangles = v3BlockOne.flatMap((item, index) =>
  item.family === LogicFamily.NUMERIC &&
  item.structure === LogicNumericStructure.TRIANGLE
    ? [{ item, index }]
    : [],
);

const v3SequenceIndex = v3BlockOne.findIndex(
  (item) =>
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.SEQUENCE,
);

function padChipValue(element: HTMLElement): string {
  return (
    element.querySelector('.pad__chip-value')?.textContent?.trim() ?? ''
  );
}

describe('LogicPlay (triangles v3)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    TestBed.inject(TrainingSessionStore).setSession(null);
    TestBed.resetTestingModule();
  });

  it('alternates sequences and triangles inside the first block', async () => {
    expect(v3BlockOne.every((item) => item.family === LogicFamily.NUMERIC)).toBe(
      true,
    );
    expect(v3Triangles).toHaveLength(5);
    expect(v3SequenceIndex).not.toBe(-1);

    const result = await setup(V3_OVERRIDES);
    goToItem(result, v3SequenceIndex);
    expect(result.element.querySelector('ui-logic-sequence')).not.toBeNull();

    goToItem(result, v3Triangles[0].index);
    expect(result.element.querySelector('ui-logic-triangle')).not.toBeNull();
    expect(result.element.textContent).toContain('Trouvez la valeur manquante');
    expect(
      result.element.querySelector('.head__badge')?.textContent?.trim(),
    ).toBe('Triangles chiffrés');
  });

  it('renders the missing slot at the center and at a vertex', async () => {
    const centerEntry = v3Triangles.find(
      (entry) => entry.item.triangle.missing.slot === TriangleSlot.CENTER,
    );
    const vertexEntry = v3Triangles.find(
      (entry) => entry.item.triangle.missing.slot !== TriangleSlot.CENTER,
    );
    expect(centerEntry).toBeDefined();
    expect(vertexEntry).toBeDefined();

    const result = await setup(V3_OVERRIDES);
    for (const entry of [centerEntry, vertexEntry]) {
      if (!entry) {
        continue;
      }
      goToItem(result, entry.index);
      const attribute = SLOT_ATTRIBUTES[entry.item.triangle.missing.slot];
      const unknowns = result.element.querySelectorAll(
        `ui-logic-triangle .value--unknown`,
      );
      expect(unknowns).toHaveLength(1);
      expect(unknowns[0].getAttribute('data-slot')).toBe(attribute);
      expect(unknowns[0].textContent?.trim()).toBe('?');
    }
  });

  it('builds multi-digit answers from the keyboard and erases with backspace', async () => {
    const result = await setup(V3_OVERRIDES);
    goToItem(result, v3Triangles[0].index);
    expect(nextButton(result.element).disabled).toBe(true);

    pressKey(result.fixture, '1');
    expect(padChipValue(result.element)).toBe('1');
    expect(nextButton(result.element).disabled).toBe(false);

    pressKey(result.fixture, '2');
    expect(padChipValue(result.element)).toBe('12');

    pressKey(result.fixture, 'Backspace');
    expect(padChipValue(result.element)).toBe('1');

    pressKey(result.fixture, 'Backspace');
    expect(padChipValue(result.element)).toBe('?');
    expect(nextButton(result.element).disabled).toBe(true);
  });

  it('caps the answer at two digits from the keyboard', async () => {
    const result = await setup(V3_OVERRIDES);
    goToItem(result, v3Triangles[0].index);

    pressKey(result.fixture, '1');
    pressKey(result.fixture, '2');
    pressKey(result.fixture, '3');
    expect(padChipValue(result.element)).toBe('12');
  });

  it('accepts pad clicks, fills the chip and clears the value', async () => {
    const result = await setup(V3_OVERRIDES);
    goToItem(result, v3Triangles[0].index);
    const keys =
      result.element.querySelectorAll<HTMLButtonElement>('.pad__key');
    expect(keys).toHaveLength(10);
    expect(
      result.element.querySelector('.pad__chip-value')?.classList,
    ).toContain('pad__chip-value--empty');

    keys[7].click();
    result.fixture.detectChanges();
    expect(padChipValue(result.element)).toBe('7');
    expect(
      result.element.querySelector('.pad__chip-value')?.classList,
    ).not.toContain('pad__chip-value--empty');
    expect(nextButton(result.element).disabled).toBe(false);

    keys[8].click();
    result.fixture.detectChanges();
    keys[9].click();
    result.fixture.detectChanges();
    expect(padChipValue(result.element)).toBe('78');

    (
      result.element.querySelector('.pad__clear') as HTMLButtonElement
    ).click();
    result.fixture.detectChanges();
    expect(padChipValue(result.element)).toBe('?');
  });

  it('submits the triangle value as numericValue in the payload', async () => {
    const result = await setup(V3_OVERRIDES);
    goToItem(result, v3Triangles[0].index);
    pressKey(result.fixture, '7');

    goToItem(result, 39);
    pressKey(result.fixture, '1');
    pressKey(result.fixture, 'Enter');

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    const [, , body] = result.completeTargeted.mock.calls[0] as [
      string,
      AxisType,
      CompleteTargetedSessionDto,
    ];
    const items = body.items ?? [];
    expect(items[v3Triangles[0].index]).toMatchObject({
      index: v3Triangles[0].index,
      answerIndex: null,
      numericValue: 7,
    });
    expect(items[v3SequenceIndex].numericValue).toBeUndefined();
  });

  it('opens the rule hint on a triangle and marks the help as used', async () => {
    const result = await setup({
      ...V3_OVERRIDES,
      options: { enabledOptions: [TrainingOptionId.LOGIC_HELP] },
    });
    goToItem(result, v3Triangles[0].index);

    pressKey(result.fixture, 'h');
    const pop = result.element.querySelector('.hint__pop');
    expect(pop?.textContent).toContain(
      v3Triangles[0].item.rule.userText,
    );

    pressKey(result.fixture, 'Escape');
    expect(result.element.querySelector('.hint__pop')).toBeNull();
    expect(
      result.element.querySelector('.hint__bulb')?.classList,
    ).toContain('hint__bulb--used');

    goToItem(result, 39);
    pressKey(result.fixture, '1');
    pressKey(result.fixture, 'Enter');
    const [, , body] = result.completeTargeted.mock.calls[0] as [
      string,
      AxisType,
      CompleteTargetedSessionDto,
    ];
    expect((body.items ?? [])[v3Triangles[0].index].helpUsed).toBe(true);
  });
});

async function setupTutorial(): Promise<Setup> {
  TestBed.resetTestingModule();
  const completeTargeted = vi.fn();
  await TestBed.configureTestingModule({
    imports: [LogicPlay],
    providers: [
      provideRouter([]),
      {
        provide: SessionsApi,
        useValue: { start: vi.fn(), get: vi.fn(), completeTargeted },
      },
      { provide: EnergyFacade, useValue: { load: vi.fn(() => of(null)) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ sessionId: TUTORIAL_SESSION_ID }),
          },
        },
      },
      ...tutorialSessionProviders(AxisType.LOGIC),
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LogicPlay);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  (element.querySelector('.countdown__skip') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { fixture, element, completeTargeted, navigate };
}

describe('LogicPlay (tutoriel mixte)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    TestBed.inject(TutorialRunFacade).clear();
    TestBed.resetTestingModule();
  });

  it('renders five mixed items covering the four boards', async () => {
    const result = await setupTutorial();
    expect(result.element.querySelectorAll('.band__seg')).toHaveLength(5);
    expect(result.element.querySelectorAll('.band__group')).toHaveLength(4);

    expect(result.element.querySelector('ui-logic-sequence')).not.toBeNull();

    goToItem(result, 1);
    expect(result.element.querySelector('ui-logic-triangle')).not.toBeNull();
    expect(result.element.textContent).toContain('Trouvez la valeur manquante');

    goToItem(result, 2);
    expect(result.element.querySelector('ui-logic-domino')).not.toBeNull();

    goToItem(result, 3);
    expect(result.element.querySelector('ui-logic-matrix')).not.toBeNull();

    goToItem(result, 4);
    expect(result.element.querySelector('ui-logic-matrix')).not.toBeNull();
  });

  it('plays through the five items and records the local run', async () => {
    const result = await setupTutorial();
    pressKey(result.fixture, '1');
    pressKey(result.fixture, 'Enter');
    pressKey(result.fixture, '2');
    pressKey(result.fixture, 'Enter');
    pressKey(result.fixture, '3');
    pressKey(result.fixture, '4');
    pressKey(result.fixture, 'Enter');
    pressKey(result.fixture, 'a');
    pressKey(result.fixture, 'Enter');
    pressKey(result.fixture, 'b');
    pressKey(result.fixture, 'Enter');

    expect(result.completeTargeted).not.toHaveBeenCalled();
    const run = TestBed.inject(TutorialRunFacade).result();
    expect(run?.axis).toBe(AxisType.LOGIC);
    if (run?.axis === AxisType.LOGIC) {
      expect(run.items).toHaveLength(5);
      expect(run.items[1]).toMatchObject({ answerIndex: null, numericValue: 2 });
      expect(run.items[2]).toMatchObject({ dominoTop: 3, dominoBottom: 4 });
      expect(run.items[3]).toMatchObject({ answerIndex: 0 });
    }
    expect(result.navigate).toHaveBeenCalledWith([
      '/entrainements/tutoriel',
      'logique',
      'fin',
    ]);
  });
});

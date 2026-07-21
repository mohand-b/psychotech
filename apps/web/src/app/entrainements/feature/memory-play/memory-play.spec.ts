import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AXIS_TRAINING,
  AxisType,
  CompleteTargetedSessionDto,
  MemoryPhase,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { TrainingSessionStore } from '../../../sessions/data-access/training-session.store';
import { MemoryPlay } from './memory-play';

const SESSION_ID = 'session-memory';
const PREPARATION_MS = 2400;
const ELEMENT_TOTAL_MS = 1000;
const PHASE_TRANSITION_MS = 2000;

function buildSession(): SessionDto {
  return {
    id: SESSION_ID,
    mode: SessionMode.TARGETED,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-memory',
    contentVersion: 1,
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
        axis: AxisType.MEMORY,
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
  };
}

interface Setup {
  fixture: ComponentFixture<MemoryPlay>;
  element: HTMLElement;
  completeTargeted: ReturnType<typeof vi.fn>;
}

async function setup(): Promise<Setup> {
  const completeTargeted = vi.fn(() =>
    of({ ...buildSession(), status: SessionStatus.COMPLETED }),
  );
  await TestBed.configureTestingModule({
    imports: [MemoryPlay],
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
  TestBed.inject(TrainingSessionStore).setSession(buildSession());
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(MemoryPlay);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  (element.querySelector('.countdown__skip') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { fixture, element, completeTargeted };
}

function advance(setupResult: Setup, ms: number): void {
  vi.advanceTimersByTime(ms);
  setupResult.fixture.detectChanges();
}

function reachRestitution(setupResult: Setup, length: number): void {
  advance(setupResult, PREPARATION_MS + length * ELEMENT_TOTAL_MS);
}

function pressKey(setupResult: Setup, key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  setupResult.fixture.detectChanges();
}

function slots(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>('.memo__slot'));
}

const TRAINING_SEQUENCES = AXIS_TRAINING[AxisType.MEMORY].sequences;

describe('MemoryPlay (passer un emplacement)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.inject(TrainingSessionStore).setSession(null);
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('marks a skipped position as a distinct empty slot and keeps typing at the next one', async () => {
    const result = await setup();
    reachRestitution(result, TRAINING_SEQUENCES[0].length);

    const skipButton = result.element.querySelector(
      '.memo__key--skip',
    ) as HTMLButtonElement;
    expect(skipButton).not.toBeNull();
    skipButton.click();
    result.fixture.detectChanges();

    let cells = slots(result.element);
    expect(cells[0].classList).toContain('memo__slot--skipped');
    expect(cells[0].classList).not.toContain('memo__slot--filled');
    expect(cells[0].textContent?.trim()).toBe('');
    expect(cells[1].classList).toContain('memo__slot--current');

    pressKey(result, '5');
    cells = slots(result.element);
    expect(cells[1].classList).toContain('memo__slot--filled');
    expect(cells[1].textContent?.trim()).toBe('5');
  });

  it('skips from the keyboard with the P key and disables the button once full', async () => {
    const result = await setup();
    const length = TRAINING_SEQUENCES[0].length;
    reachRestitution(result, length);

    for (let position = 0; position < length; position += 1) {
      pressKey(result, 'p');
    }
    const cells = slots(result.element);
    expect(
      cells.every((cell) => cell.classList.contains('memo__slot--skipped')),
    ).toBe(true);
    expect(
      (result.element.querySelector('.memo__key--skip') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    pressKey(result, 'P');
    expect(slots(result.element)).toHaveLength(length);
  });

  it('submits null for skipped positions without shifting the other digits', async () => {
    const result = await setup();
    for (const [index, config] of TRAINING_SEQUENCES.entries()) {
      if (
        config.phase === MemoryPhase.INVERSE &&
        TRAINING_SEQUENCES[index - 1]?.phase === MemoryPhase.NORMAL
      ) {
        advance(result, PHASE_TRANSITION_MS);
      }
      reachRestitution(result, config.length);
      if (index === 0) {
        pressKey(result, '7');
        pressKey(result, 'p');
        pressKey(result, '4');
        pressKey(result, '9');
      } else {
        for (let position = 0; position < config.length; position += 1) {
          pressKey(result, '1');
        }
      }
      pressKey(result, 'Enter');
    }

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    const [sessionId, axis, body] = result.completeTargeted.mock.calls[0] as [
      string,
      AxisType,
      CompleteTargetedSessionDto,
    ];
    expect(sessionId).toBe(SESSION_ID);
    expect(axis).toBe(AxisType.MEMORY);
    const sequences = body.sequences ?? [];
    expect(sequences).toHaveLength(TRAINING_SEQUENCES.length);
    expect(sequences[0].input).toEqual([7, null, 4, 9]);
    expect(sequences[0].timedOut).toBe(false);
  });
});

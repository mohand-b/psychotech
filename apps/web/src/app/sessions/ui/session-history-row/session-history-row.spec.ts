import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AxisType,
  LogicFamilyFilter,
  ScoreBand,
  Sector,
  SessionHistoryItemDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { buildSessionRowView } from '../../feature/sessions/session-history-view';
import { SessionHistoryRow } from './session-history-row';

const NOW = new Date(2026, 6, 9, 15, 0);

function buildItem(
  overrides: Partial<SessionHistoryItemDto> = {},
): SessionHistoryItemDto {
  return {
    id: 'session-1',
    mode: SessionMode.TARGETED,
    axis: AxisType.LOGIC,
    sector: Sector.RAILWAY,
    status: SessionStatus.COMPLETED,
    logicFamily: null,
    untimed: false,
    finishedAt: new Date(2026, 6, 8, 19, 42).toISOString(),
    durationSec: 240,
    score: 82,
    band: ScoreBand.EXCELLENT,
    axisReached: null,
    axisTotal: 1,
    ...overrides,
  };
}

async function setup(
  item: SessionHistoryItemDto,
): Promise<ComponentFixture<SessionHistoryRow>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SessionHistoryRow],
    providers: [provideRouter([])],
  }).compileComponents();
  const fixture = TestBed.createComponent(SessionHistoryRow);
  fixture.componentRef.setInput('view', buildSessionRowView(item, NOW));
  fixture.detectChanges();
  return fixture;
}

describe('SessionHistoryRow - tag famille', () => {
  it('shows a discreet chip when the session was family-filtered', async () => {
    const fixture = await setup(
      buildItem({ logicFamily: LogicFamilyFilter.MATRIX }),
    );
    const chips = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.row__family'),
    );
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) => expect(chip.textContent?.trim()).toBe('Matrices'));
  });

  it('shows no chip for an unfiltered session', async () => {
    const fixture = await setup(buildItem());
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.row__family'),
    ).toBeNull();
  });
});

describe('SessionHistoryRow - tag sans chrono', () => {
  it('shows a chip when the session was played without timer', async () => {
    const fixture = await setup(buildItem({ untimed: true }));
    const chips = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.row__family'),
    );
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((chip) =>
      expect(chip.textContent?.trim()).toBe('Sans chrono'),
    );
  });
});

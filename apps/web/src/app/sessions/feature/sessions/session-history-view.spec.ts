import {
  AxisType,
  ScoreBand,
  Sector,
  SessionHistoryItemDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { historyQueryFor } from '../../data-access/session-history.filter';
import {
  formatSessionDate,
  formatSessionScore,
  groupSessionsByPeriod,
} from './session-history-view';

const NOW = new Date(2026, 6, 9, 15, 0);

function item(
  overrides: Partial<SessionHistoryItemDto>,
): SessionHistoryItemDto {
  return {
    id: 'session-1',
    mode: SessionMode.TARGETED,
    axis: AxisType.LOGIC,
    sector: Sector.RAILWAY,
    status: SessionStatus.COMPLETED,
    logicFamily: null,
    finishedAt: new Date(2026, 6, 8, 19, 42).toISOString(),
    durationSec: 240,
    score: 82,
    band: ScoreBand.EXCELLENT,
    axisReached: null,
    axisTotal: 1,
    ...overrides,
  };
}

describe('groupSessionsByPeriod', () => {
  it('splits the descending list into current week, last week then months', () => {
    const items = [
      item({ id: 'a', finishedAt: new Date(2026, 6, 8, 19, 0).toISOString() }),
      item({ id: 'b', finishedAt: new Date(2026, 6, 6, 9, 0).toISOString() }),
      item({ id: 'c', finishedAt: new Date(2026, 6, 3, 18, 0).toISOString() }),
      item({ id: 'd', finishedAt: new Date(2026, 5, 20, 12, 0).toISOString() }),
      item({ id: 'e', finishedAt: new Date(2026, 4, 2, 12, 0).toISOString() }),
    ];

    const groups = groupSessionsByPeriod(items, NOW);

    expect(groups.map(({ label }) => label)).toEqual([
      'Cette semaine',
      'Semaine dernière',
      'Juin 2026',
      'Mai 2026',
    ]);
    expect(groups[0].items.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(groups[1].items.map(({ id }) => id)).toEqual(['c']);
  });

  it('recomposes an existing group when the next page continues the same period', () => {
    const firstPage = [
      item({ id: 'a', finishedAt: new Date(2026, 5, 20, 12, 0).toISOString() }),
    ];
    const secondPage = [
      item({ id: 'b', finishedAt: new Date(2026, 5, 12, 12, 0).toISOString() }),
    ];

    const groups = groupSessionsByPeriod([...firstPage, ...secondPage], NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Juin 2026');
    expect(groups[0].items.map(({ id }) => id)).toEqual(['a', 'b']);
  });
});

describe('formatSessionDate', () => {
  it('labels today and yesterday relatively', () => {
    expect(
      formatSessionDate(new Date(2026, 6, 9, 14, 5).toISOString(), NOW),
    ).toBe("Aujourd'hui · 14:05");
    expect(
      formatSessionDate(new Date(2026, 6, 8, 19, 42).toISOString(), NOW),
    ).toBe('Hier · 19:42');
  });

  it('uses the weekday inside the current week and a short date otherwise', () => {
    expect(
      formatSessionDate(new Date(2026, 6, 6, 20, 31).toISOString(), NOW),
    ).toBe('Lundi · 20:31');
    expect(
      formatSessionDate(new Date(2026, 5, 5, 18, 47).toISOString(), NOW),
    ).toBe('05/06 · 18:47');
  });
});

describe('formatSessionScore', () => {
  it('renders a full session score with one french decimal', () => {
    expect(
      formatSessionScore(item({ mode: SessionMode.FULL, score: 74.8 })),
    ).toBe('74,8');
  });

  it('renders a targeted axis score as an integer and no score as null', () => {
    expect(formatSessionScore(item({ score: 76 }))).toBe('76');
    expect(formatSessionScore(item({ score: null, band: null }))).toBeNull();
  });
});

describe('historyQueryFor', () => {
  it('sends only the axis for an axis filter so the API restricts to targeted sessions', () => {
    expect(historyQueryFor(AxisType.REACTIVITY)).toEqual({
      axis: AxisType.REACTIVITY,
    });
  });

  it('sends the mode for type filters and nothing for the default filter', () => {
    expect(historyQueryFor(SessionMode.FULL)).toEqual({
      mode: SessionMode.FULL,
    });
    expect(historyQueryFor(SessionMode.TARGETED)).toEqual({
      mode: SessionMode.TARGETED,
    });
    expect(historyQueryFor('ALL')).toEqual({});
  });
});

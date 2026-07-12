import {
  formatOverviewDate,
  formatOverviewScore,
  formatSignedGap,
} from './trainings-overview-view';

describe('formatOverviewScore', () => {
  it('renders the score with a french decimal comma', () => {
    expect(formatOverviewScore(74.8)).toBe('74,8');
    expect(formatOverviewScore(70)).toBe('70,0');
  });
});

describe('formatSignedGap', () => {
  it('signs a score above the threshold as positive', () => {
    expect(formatSignedGap({ globalScore: 74.8, sectorThreshold: 70 })).toEqual({
      label: '+4,8',
      above: true,
    });
  });

  it('signs a score under the threshold as negative', () => {
    expect(formatSignedGap({ globalScore: 53.8, sectorThreshold: 70 })).toEqual({
      label: '-16,2',
      above: false,
    });
  });
});

describe('formatOverviewDate', () => {
  const now = new Date('2026-07-12T10:00:00');

  it('labels today and yesterday relatively', () => {
    expect(formatOverviewDate('2026-07-12T08:05:00', now)).toBe(
      "Aujourd'hui, 08:05",
    );
    expect(formatOverviewDate('2026-07-11T19:42:00', now)).toBe('Hier, 19:42');
  });

  it('falls back to a short date beyond yesterday', () => {
    expect(formatOverviewDate('2026-07-02T09:30:00', now)).toBe('02/07, 09:30');
  });
});

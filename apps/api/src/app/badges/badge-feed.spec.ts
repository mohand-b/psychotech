import { BadgeId as DbBadgeId, Sector as DbSector } from '@prisma/client';
import { BadgeId, Sector } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgeCollector } from './badge-collector';
import { FEED_ANONYMOUS_LABEL } from './badges.mappers';
import { BadgesRepository, RecentEarnedBadge } from './badges.repository';
import { BadgesService, FEED_VISIBILITY_THRESHOLD } from './badges.service';

function row(
  overrides: Partial<RecentEarnedBadge> & {
    user?: Partial<RecentEarnedBadge['user']>;
  } = {},
): RecentEarnedBadge {
  return {
    badgeId: DbBadgeId.LOGIC_PROGRESSION,
    earnedAt: new Date('2026-08-08T10:00:00Z'),
    ...overrides,
    user: {
      firstName: 'Karim',
      lastName: 'Benali',
      showInFeed: false,
      currentSector: DbSector.RAILWAY,
      ...overrides.user,
    },
  };
}

const repository = {
  countVerifiedAccounts: vi.fn(),
  findRecentEarned: vi.fn(),
};

const service = new BadgesService(
  repository as unknown as BadgesRepository,
  new BadgeCollector(),
);

beforeEach(() => {
  vi.clearAllMocks();
  repository.countVerifiedAccounts.mockResolvedValue(
    FEED_VISIBILITY_THRESHOLD,
  );
  repository.findRecentEarned.mockResolvedValue([]);
});

describe('BadgesService.getFeed', () => {
  it('never names a user without opt-in, nor leaks any identifier', async () => {
    repository.findRecentEarned.mockResolvedValue([
      row({ user: { showInFeed: false } }),
    ]);

    const feed = await service.getFeed();

    expect(feed.visible).toBe(true);
    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0].label).toBe(FEED_ANONYMOUS_LABEL);
    const raw = JSON.stringify(feed);
    expect(raw).not.toContain('Karim');
    expect(raw).not.toContain('Benali');
    expect(raw).not.toContain('userId');
    expect(raw).not.toContain('email');
    expect(raw).not.toContain('score');
  });

  it('shows the first name of an opted-in user', async () => {
    repository.findRecentEarned.mockResolvedValue([
      row({ user: { showInFeed: true } }),
    ]);

    const feed = await service.getFeed();

    expect(feed.entries[0].label).toBe('Karim');
    expect(JSON.stringify(feed)).not.toContain('Benali');
  });

  it('disambiguates duplicated first names with the last-name initial', async () => {
    repository.findRecentEarned.mockResolvedValue([
      row({ user: { showInFeed: true, lastName: 'Benali' } }),
      row({
        badgeId: DbBadgeId.MEMORY_PROGRESSION,
        user: { showInFeed: true, lastName: 'Zidane' },
      }),
      row({
        badgeId: DbBadgeId.FIRST_STEPS,
        user: { firstName: 'Léa', lastName: 'Morel', showInFeed: true },
      }),
    ]);

    const feed = await service.getFeed();

    expect(feed.entries.map((entry) => entry.label)).toEqual([
      'Karim B.',
      'Karim Z.',
      'Léa',
    ]);
    expect(JSON.stringify(feed)).not.toContain('Benali');
  });

  it('never counts an anonymous homonym as a duplicate', async () => {
    repository.findRecentEarned.mockResolvedValue([
      row({ user: { showInFeed: true, lastName: 'Benali' } }),
      row({
        badgeId: DbBadgeId.MEMORY_PROGRESSION,
        user: { showInFeed: false, lastName: 'Zidane' },
      }),
    ]);

    const feed = await service.getFeed();

    expect(feed.entries.map((entry) => entry.label)).toEqual([
      'Karim',
      FEED_ANONYMOUS_LABEL,
    ]);
  });

  it('returns a hidden state without any entry below the eligibility threshold', async () => {
    repository.countVerifiedAccounts.mockResolvedValue(
      FEED_VISIBILITY_THRESHOLD - 1,
    );
    repository.findRecentEarned.mockResolvedValue([
      row({ user: { showInFeed: true } }),
    ]);

    const feed = await service.getFeed();

    expect(feed).toEqual({ visible: false, entries: [] });
    expect(repository.findRecentEarned).not.toHaveBeenCalled();
  });

  it('carries the badge id, sector and earning date of each entry', async () => {
    repository.findRecentEarned.mockResolvedValue([row()]);

    const feed = await service.getFeed();

    expect(feed.entries[0]).toEqual({
      badgeId: BadgeId.LOGIC_PROGRESSION,
      sector: Sector.RAILWAY,
      earnedAt: '2026-08-08T10:00:00.000Z',
      label: FEED_ANONYMOUS_LABEL,
    });
  });
});

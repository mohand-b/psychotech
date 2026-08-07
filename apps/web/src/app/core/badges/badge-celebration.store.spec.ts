import { TestBed } from '@angular/core/testing';
import { BadgeId, EarnedBadgeDto } from '@psychotech/shared';
import { BadgeCelebrationStore } from './badge-celebration.store';

function badge(badgeId: BadgeId, gain: number | null = null): EarnedBadgeDto {
  return {
    badgeId,
    earnedAt: '2026-08-07T10:00:00.000Z',
    gain,
    conditions: [
      { id: 'c1', label: 'Condition', met: true, justValidated: true },
    ],
  };
}

type Store = InstanceType<typeof BadgeCelebrationStore>;

function setup(): Store {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(BadgeCelebrationStore);
}

describe('BadgeCelebrationStore', () => {
  it('starts celebrating immediately when nothing holds the scene', () => {
    const store = setup();
    store.enqueue([badge(BadgeId.LOGIC_PROGRESSION)]);
    expect(store.phase()).toBe('celebrating');
    expect(store.current()?.badgeId).toBe(BadgeId.LOGIC_PROGRESSION);
  });

  it('waits for every hold to be released before celebrating', () => {
    const store = setup();
    store.placeHold('play-route');
    store.placeHold('score-scene');
    store.enqueue([badge(BadgeId.EXAM_FIRST)]);
    expect(store.phase()).toBe('awaitingScene');
    expect(store.current()).toBeNull();

    store.releaseHold('play-route');
    expect(store.phase()).toBe('awaitingScene');

    store.releaseHold('score-scene');
    expect(store.phase()).toBe('celebrating');
    expect(store.current()?.badgeId).toBe(BadgeId.EXAM_FIRST);
  });

  it('advances one badge at a time and finishes on the last one', () => {
    const store = setup();
    store.enqueue([badge(BadgeId.EXAM_FIRST), badge(BadgeId.EXAM_FAVORABLE, 2)]);
    expect(store.position()).toBe(1);
    expect(store.total()).toBe(2);
    expect(store.isLast()).toBe(false);

    const first = store.completeCurrent();
    expect(first?.badgeId).toBe(BadgeId.EXAM_FIRST);
    expect(store.phase()).toBe('celebrating');
    expect(store.current()?.badgeId).toBe(BadgeId.EXAM_FAVORABLE);
    expect(store.isLast()).toBe(true);

    const second = store.completeCurrent();
    expect(second?.badgeId).toBe(BadgeId.EXAM_FAVORABLE);
    expect(store.phase()).toBe('done');
    expect(store.current()).toBeNull();
  });

  it('never enqueues a badge twice, even after its celebration', () => {
    const store = setup();
    store.enqueue([badge(BadgeId.FIRST_STEPS, 5)]);
    store.enqueue([badge(BadgeId.FIRST_STEPS, 5)]);
    expect(store.total()).toBe(1);

    store.completeCurrent();
    store.enqueue([badge(BadgeId.FIRST_STEPS, 5)]);
    expect(store.phase()).toBe('done');
  });

  it('appends fresh badges to a running celebration without restarting', () => {
    const store = setup();
    store.enqueue([badge(BadgeId.EXAM_FIRST)]);
    store.enqueue([badge(BadgeId.EXAM_FAVORABLE, 2)]);
    expect(store.phase()).toBe('celebrating');
    expect(store.current()?.badgeId).toBe(BadgeId.EXAM_FIRST);
    expect(store.total()).toBe(2);
  });

  it('dismisses the whole run and reports every remaining badge', () => {
    const store = setup();
    store.enqueue([badge(BadgeId.EXAM_FIRST), badge(BadgeId.EXAM_FAVORABLE, 2)]);
    const dismissed = store.dismissAll();
    expect(dismissed.map((entry) => entry.badgeId)).toEqual([
      BadgeId.EXAM_FIRST,
      BadgeId.EXAM_FAVORABLE,
    ]);
    expect(store.phase()).toBe('done');
  });

  it('replays already celebrated badges without waiting when the scene is free', () => {
    const store = setup();
    store.enqueue([badge(BadgeId.EXAM_FIRST)]);
    store.completeCurrent();
    expect(store.phase()).toBe('done');

    store.replay([badge(BadgeId.EXAM_FIRST)]);
    expect(store.phase()).toBe('celebrating');
    expect(store.current()?.badgeId).toBe(BadgeId.EXAM_FIRST);
  });

  it('keeps a replay on hold while the scene is not ready', () => {
    const store = setup();
    store.placeHold('score-scene');
    store.replay([badge(BadgeId.EXAM_FIRST)]);
    expect(store.phase()).toBe('awaitingScene');
    store.releaseHold('score-scene');
    expect(store.phase()).toBe('celebrating');
  });
});

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { BadgeId, EarnedBadgeDto } from '@psychotech/shared';
import { defer, firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { BadgeCollector } from './badge-collector';
import { NewBadgesInterceptor } from './new-badges.interceptor';

const context = {} as ExecutionContext;

function earnedBadge(): EarnedBadgeDto {
  return {
    badgeId: BadgeId.LOGIC_PROGRESSION,
    earnedAt: '2026-08-07T10:00:00.000Z',
    gain: null,
    conditions: [
      { id: 'score-70', label: 'Atteindre 70', met: true, justValidated: true },
    ],
  };
}

function handlerReturning(
  body: unknown,
  work?: (collector: BadgeCollector) => Promise<void>,
  collector?: BadgeCollector,
): CallHandler {
  return {
    handle: () =>
      defer(async () => {
        if (work && collector) {
          await deeplyNested(() => work(collector));
        }
        return body;
      }),
  };
}

async function deeplyNested(work: () => Promise<void>): Promise<void> {
  await Promise.resolve();
  await (async () => {
    await Promise.resolve();
    await work();
  })();
}

describe('NewBadgesInterceptor', () => {
  it('appends badges deposited deep inside the request to the response body', async () => {
    const collector = new BadgeCollector();
    const interceptor = new NewBadgesInterceptor(collector);
    const badge = earnedBadge();

    const body = await firstValueFrom(
      interceptor.intercept(
        context,
        handlerReturning(
          { id: 'session-1' },
          async (c) => c.deposit(badge),
          collector,
        ),
      ),
    );

    expect(body).toEqual({ id: 'session-1', newBadges: [badge] });
  });

  it('leaves the response untouched when nothing was deposited', async () => {
    const collector = new BadgeCollector();
    const interceptor = new NewBadgesInterceptor(collector);

    const body = await firstValueFrom(
      interceptor.intercept(context, handlerReturning({ id: 'session-1' })),
    );

    expect(body).toEqual({ id: 'session-1' });
    expect(body).not.toHaveProperty('newBadges');
  });

  it('wraps a bodyless response into a pure newBadges payload', async () => {
    const collector = new BadgeCollector();
    const interceptor = new NewBadgesInterceptor(collector);
    const badge = earnedBadge();

    const body = await firstValueFrom(
      interceptor.intercept(
        context,
        handlerReturning(undefined, async (c) => c.deposit(badge), collector),
      ),
    );

    expect(body).toEqual({ newBadges: [badge] });
  });

  it('isolates deposits between two concurrent requests', async () => {
    const collector = new BadgeCollector();
    const interceptor = new NewBadgesInterceptor(collector);
    const badge = earnedBadge();

    const [first, second] = await Promise.all([
      firstValueFrom(
        interceptor.intercept(
          context,
          handlerReturning({ id: 'a' }, async (c) => c.deposit(badge), collector),
        ),
      ),
      firstValueFrom(
        interceptor.intercept(context, handlerReturning({ id: 'b' })),
      ),
    ]);

    expect(first).toEqual({ id: 'a', newBadges: [badge] });
    expect(second).toEqual({ id: 'b' });
  });
});

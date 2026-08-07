import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { EarnedBadgeDto, NewBadgesPayload } from '@psychotech/shared';
import { Observable, map } from 'rxjs';
import { BadgeCollector } from './badge-collector';

function withNewBadges(
  body: unknown,
  collected: EarnedBadgeDto[],
): unknown {
  if (collected.length === 0) {
    return body;
  }
  const payload: NewBadgesPayload = { newBadges: [...collected] };
  if (body === null || body === undefined) {
    return payload;
  }
  if (typeof body === 'object' && !Array.isArray(body)) {
    return { ...body, ...payload };
  }
  return body;
}

@Injectable()
export class NewBadgesInterceptor implements NestInterceptor {
  constructor(private readonly collector: BadgeCollector) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return new Observable<unknown>((subscriber) => {
      const subscription = this.collector.runWithin(() => {
        const collected = this.collector.collected();
        return next
          .handle()
          .pipe(map((body) => withNewBadges(body, collected)))
          .subscribe(subscriber);
      });
      return () => subscription.unsubscribe();
    });
  }
}

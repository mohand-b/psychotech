import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EarnedBadgeDto } from '@psychotech/shared';

@Injectable()
export class BadgeCollector {
  private readonly storage = new AsyncLocalStorage<EarnedBadgeDto[]>();

  runWithin<T>(work: () => T): T {
    return this.storage.run([], work);
  }

  deposit(badge: EarnedBadgeDto): void {
    this.storage.getStore()?.push(badge);
  }

  collected(): EarnedBadgeDto[] {
    return this.storage.getStore() ?? [];
  }
}

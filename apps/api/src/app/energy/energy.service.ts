import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnergyLedgerReason,
  EnergyStateDto,
  SubscriptionTier,
} from '@psychotech/shared';
import {
  buildEnergyState,
  canAfford,
  isDailyResetDue,
} from './energy.logic';
import { toDbReason, toSharedTier } from './energy.mappers';
import { EnergyRepository } from './energy.repository';

interface FreshWallet {
  balance: number;
  capacity: number;
  tier: SubscriptionTier;
  timezone: string;
}

@Injectable()
export class EnergyService {
  constructor(private readonly repository: EnergyRepository) {}

  async getState(userId: string): Promise<EnergyStateDto> {
    const now = new Date();
    const wallet = await this.ensureFreshWallet(userId, now);
    return buildEnergyState(wallet, now);
  }

  async canAfford(userId: string, cost: number): Promise<boolean> {
    const wallet = await this.ensureFreshWallet(userId, new Date());
    return canAfford({ tier: wallet.tier, balance: wallet.balance, cost });
  }

  async spend(
    userId: string,
    cost: number,
    reason: EnergyLedgerReason,
    sessionId?: string,
  ): Promise<EnergyStateDto> {
    const now = new Date();
    const wallet = await this.ensureFreshWallet(userId, now);
    if (!canAfford({ tier: wallet.tier, balance: wallet.balance, cost })) {
      throw new ForbiddenException('Insufficient energy balance');
    }
    if (wallet.tier === SubscriptionTier.UNLIMITED || cost === 0) {
      return buildEnergyState(wallet, now);
    }
    const updated = await this.repository.spend(
      userId,
      cost,
      toDbReason(reason),
      sessionId,
    );
    return buildEnergyState({ ...wallet, balance: updated.balance }, now);
  }

  private async ensureFreshWallet(
    userId: string,
    now: Date,
  ): Promise<FreshWallet> {
    const context = await this.repository.findEnergyContext(userId);
    if (!context) {
      throw new NotFoundException('Energy wallet not found');
    }
    const tier = toSharedTier(context.tier);
    if (isDailyResetDue(context.wallet.lastResetAt, now, context.timezone)) {
      const reset = await this.repository.applyDailyReset(
        userId,
        context.wallet.capacity,
        now,
        context.wallet.balance,
      );
      return {
        balance: reset.balance,
        capacity: reset.capacity,
        tier,
        timezone: context.timezone,
      };
    }
    return {
      balance: context.wallet.balance,
      capacity: context.wallet.capacity,
      tier,
      timezone: context.timezone,
    };
  }
}

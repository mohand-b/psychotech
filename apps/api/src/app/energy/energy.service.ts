import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ENERGY_INSUFFICIENT_ERROR_CODE,
  EnergyLedgerReason,
  EnergyStateDto,
  GIFT_CODE_INVALID_ERROR_CODE,
  GiftCodeRedemptionDto,
} from '@psychotech/shared';
import { buildEnergyState, canAfford } from './energy.logic';
import { toDbReason } from './energy.mappers';
import { EnergyRepository } from './energy.repository';

@Injectable()
export class EnergyService {
  constructor(private readonly repository: EnergyRepository) {}

  async getState(userId: string): Promise<EnergyStateDto> {
    const wallet = await this.repository.findWallet(userId);
    if (!wallet) {
      throw new NotFoundException('Energy wallet not found');
    }
    return buildEnergyState(wallet.balance);
  }

  async spend(
    userId: string,
    cost: number,
    reason: EnergyLedgerReason,
    sessionId?: string,
  ): Promise<EnergyStateDto> {
    const wallet = await this.repository.findWallet(userId);
    if (!wallet) {
      throw new NotFoundException('Energy wallet not found');
    }
    if (!canAfford({ balance: wallet.balance, cost })) {
      throw this.insufficientEnergy(wallet.balance, cost);
    }
    if (cost === 0) {
      return buildEnergyState(wallet.balance);
    }
    const updated = await this.repository.spend(
      userId,
      cost,
      toDbReason(reason),
      sessionId,
    );
    return buildEnergyState(updated.balance);
  }

  async spendWithin(
    client: Prisma.TransactionClient,
    userId: string,
    cost: number,
    reason: EnergyLedgerReason,
    sessionId?: string,
  ): Promise<void> {
    const wallet = await this.repository.findWalletWithin(client, userId);
    if (!wallet) {
      throw new NotFoundException('Energy wallet not found');
    }
    if (!canAfford({ balance: wallet.balance, cost })) {
      throw this.insufficientEnergy(wallet.balance, cost);
    }
    if (cost === 0) {
      return;
    }
    await this.repository.spendWithin(
      client,
      userId,
      cost,
      toDbReason(reason),
      sessionId,
    );
  }

  hasCreditForRef(userId: string, ref: string): Promise<boolean> {
    return this.repository.hasLedgerRef(userId, ref);
  }

  async redeemGiftCode(
    userId: string,
    rawCode: string,
  ): Promise<GiftCodeRedemptionDto> {
    const code = rawCode.trim().toUpperCase();
    const giftCode = await this.repository.findGiftCode(code);
    const now = new Date();
    const exhausted =
      giftCode !== null &&
      giftCode.maxRedemptions !== null &&
      giftCode._count.redemptions >= giftCode.maxRedemptions;
    const expired =
      giftCode !== null &&
      giftCode.expiresAt !== null &&
      giftCode.expiresAt.getTime() < now.getTime();
    if (!giftCode || !giftCode.active || exhausted || expired) {
      throw new BadRequestException(GIFT_CODE_INVALID_ERROR_CODE);
    }
    const wallet = await this.repository.redeemGiftCode(
      userId,
      giftCode.id,
      giftCode.energyAmount,
    );
    if (!wallet) {
      throw new BadRequestException(GIFT_CODE_INVALID_ERROR_CODE);
    }
    return { granted: giftCode.energyAmount, balance: wallet.balance };
  }

  private insufficientEnergy(
    balance: number,
    cost: number,
  ): ForbiddenException {
    return new ForbiddenException({
      message: ENERGY_INSUFFICIENT_ERROR_CODE,
      balance,
      cost,
    });
  }
}

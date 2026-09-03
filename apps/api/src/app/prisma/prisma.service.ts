import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

const DEFAULT_TRANSACTION_MAX_WAIT_MS = 2_000;
const DEFAULT_TRANSACTION_TIMEOUT_MS = 5_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    super({
      datasourceUrl: configService.getOrThrow<string>('DATABASE_URL'),
      transactionOptions: {
        maxWait: readPositiveMilliseconds(
          configService,
          'PRISMA_TRANSACTION_MAX_WAIT_MS',
          DEFAULT_TRANSACTION_MAX_WAIT_MS,
        ),
        timeout: readPositiveMilliseconds(
          configService,
          'PRISMA_TRANSACTION_TIMEOUT_MS',
          DEFAULT_TRANSACTION_TIMEOUT_MS,
        ),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

function readPositiveMilliseconds(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const parsed = Number(configService.get<string>(key));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

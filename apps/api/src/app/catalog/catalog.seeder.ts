import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { seedCatalog } from './catalog.seed';

@Injectable()
export class CatalogSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      return;
    }
    await seedCatalog(this.prisma);
    this.logger.log('Catalog seed applied (idempotent upserts)');
  }
}

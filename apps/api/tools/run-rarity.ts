
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app/app.module';
import { BadgeRarityService } from '../src/app/badges/badge-rarity.service';
import { PrismaService } from '../src/app/prisma/prisma.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const rarity = app.get(BadgeRarityService);
  await rarity.refresh(new Date());
  const prisma = app.get(PrismaService);
  const rows = await prisma.badgeRarity.findMany({ orderBy: { badgeId: 'asc' } });
  console.log(JSON.stringify(rows.map((row) => ({ b: row.badgeId, e: row.eligibleCount, w: row.earnedCount }))));
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });

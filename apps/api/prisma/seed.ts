import { PrismaClient } from '@prisma/client';
import { seedCatalog } from '../src/app/catalog/catalog.seed';

const prisma = new PrismaClient();

seedCatalog(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    await prisma.$disconnect();
    process.exitCode = 1;
    throw error;
  });

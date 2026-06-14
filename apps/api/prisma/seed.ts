import { AxisType, PrismaClient, Sector } from '@prisma/client';
import { BADGE_DEFINITIONS } from '../src/app/badges/badge.catalog';

const prisma = new PrismaClient();

const CRITICAL_COEFFICIENT_THRESHOLD = 1.2;

const RAILWAY_THRESHOLDS = {
  admissibility: 70,
  vigilance: 65,
  eliminatory: 55,
} as const;

const PROVISIONAL_ADMISSIBILITY_THRESHOLD = 70;

const SECTOR_LABELS: Record<Sector, string> = {
  RAILWAY: 'Ferroviaire',
  AVIATION: 'Aérien',
  SECURITY: 'Sécurité',
  INDUSTRY: 'Industrie',
  HEALTHCARE: 'Santé',
};

const RAILWAY_AXIS_COEFFICIENTS: Record<AxisType, number> = {
  LOGIC: 1.0,
  MEMORY: 1.2,
  VISUAL_DISCRIMINATION: 1.2,
  REACTIVITY: 1.4,
  MOTOR_SKILLS: 1.0,
};

async function seedRailway(): Promise<void> {
  await prisma.sectorConfig.upsert({
    where: { sector: Sector.RAILWAY },
    update: {
      label: SECTOR_LABELS.RAILWAY,
      isActive: true,
      admissibilityThreshold: RAILWAY_THRESHOLDS.admissibility,
      vigilanceThreshold: RAILWAY_THRESHOLDS.vigilance,
      eliminatoryThreshold: RAILWAY_THRESHOLDS.eliminatory,
    },
    create: {
      sector: Sector.RAILWAY,
      label: SECTOR_LABELS.RAILWAY,
      isActive: true,
      admissibilityThreshold: RAILWAY_THRESHOLDS.admissibility,
      vigilanceThreshold: RAILWAY_THRESHOLDS.vigilance,
      eliminatoryThreshold: RAILWAY_THRESHOLDS.eliminatory,
    },
  });

  const axes = Object.keys(RAILWAY_AXIS_COEFFICIENTS) as AxisType[];

  for (const axis of axes) {
    const coefficient = RAILWAY_AXIS_COEFFICIENTS[axis];
    const isCritical = coefficient >= CRITICAL_COEFFICIENT_THRESHOLD;

    await prisma.sectorAxisWeight.upsert({
      where: { sector_axis: { sector: Sector.RAILWAY, axis } },
      update: { coefficient, isCritical },
      create: { sector: Sector.RAILWAY, axis, coefficient, isCritical },
    });
  }
}

async function seedInactiveSectors(): Promise<void> {
  const inactiveSectors = (Object.values(Sector) as Sector[]).filter(
    (sector) => sector !== Sector.RAILWAY,
  );

  for (const sector of inactiveSectors) {
    await prisma.sectorConfig.upsert({
      where: { sector },
      update: { label: SECTOR_LABELS[sector], isActive: false },
      create: {
        sector,
        label: SECTOR_LABELS[sector],
        isActive: false,
        admissibilityThreshold: PROVISIONAL_ADMISSIBILITY_THRESHOLD,
      },
    });
  }
}

async function seedBadges(): Promise<void> {
  for (const badge of BADGE_DEFINITIONS) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        description: badge.description,
        category: badge.category,
        icon: badge.icon,
      },
      create: {
        code: badge.code,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        icon: badge.icon,
      },
    });
  }
}

async function main(): Promise<void> {
  await seedRailway();
  await seedInactiveSectors();
  await seedBadges();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    await prisma.$disconnect();
    process.exitCode = 1;
    throw error;
  });

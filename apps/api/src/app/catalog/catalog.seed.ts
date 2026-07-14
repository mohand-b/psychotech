import { AxisType, PrismaClient, Sector } from '@prisma/client';
import { BADGE_DEFINITIONS } from '../badges/badge.catalog';

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
  DRIVING: 'Conduite',
  HEALTHCARE: 'Santé',
};

const RAILWAY_AXES: { axis: AxisType; coefficient: number; order: number }[] = [
  { axis: AxisType.LOGIC, coefficient: 1.0, order: 0 },
  { axis: AxisType.MEMORY, coefficient: 1.2, order: 1 },
  { axis: AxisType.VISUAL_DISCRIMINATION, coefficient: 1.2, order: 2 },
  { axis: AxisType.REACTIVITY, coefficient: 1.4, order: 3 },
  { axis: AxisType.MOTOR_SKILLS, coefficient: 1.0, order: 4 },
];

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  await seedRailway(prisma);
  await seedInactiveSectors(prisma);
  await seedBadges(prisma);
}

async function seedRailway(prisma: PrismaClient): Promise<void> {
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

  for (const { axis, coefficient, order } of RAILWAY_AXES) {
    const isCritical = coefficient >= CRITICAL_COEFFICIENT_THRESHOLD;

    await prisma.sectorAxisWeight.upsert({
      where: { sector_axis: { sector: Sector.RAILWAY, axis } },
      update: { coefficient, isCritical, order },
      create: { sector: Sector.RAILWAY, axis, coefficient, isCritical, order },
    });
  }
}

async function seedInactiveSectors(prisma: PrismaClient): Promise<void> {
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

async function seedBadges(prisma: PrismaClient): Promise<void> {
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

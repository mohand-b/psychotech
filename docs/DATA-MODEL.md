# Modèle de données

Source de vérité une fois implémenté : le schéma Prisma (`apps/api/prisma/schema.prisma`) et les types de `libs/shared`. Ce document est la référence de conception.

## Énumérations (`libs/shared`)

```typescript
// Secteur de préparation (seul RAILWAY actif aujourd'hui)
export enum Sector {
  RAILWAY = 'RAILWAY',
  AVIATION = 'AVIATION',
  SECURITY = 'SECURITY',
  INDUSTRY = 'INDUSTRY',
  HEALTHCARE = 'HEALTHCARE',
}

// Les 5 axes cognitifs
export enum AxisType {
  LOGIC = 'LOGIC',
  MEMORY = 'MEMORY',
  VISUAL_DISCRIMINATION = 'VISUAL_DISCRIMINATION',
  REACTIVITY = 'REACTIVITY',
  MOTOR_SKILLS = 'MOTOR_SKILLS',
}

// Mode d'une session
export enum SessionMode {
  FULL = 'FULL',         // simulation complète (5 axes) — coûte 5 énergie
  TARGETED = 'TARGETED', // axe individuel — coûte 1 énergie
  TUTORIAL = 'TUTORIAL', // mode découverte (offre gratuite) — coûte 0
}

export enum SessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum DifficultyLevel {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

// Bande de score → pastille colorée (par axe et global)
export enum ScoreBand {
  EXCELLENT = 'EXCELLENT',       // >= 80  (vert)
  ACCEPTABLE = 'ACCEPTABLE',     // 70-79  (jaune)
  FRAGILE = 'FRAGILE',           // 60-69  (orange)
  INSUFFICIENT = 'INSUFFICIENT', // < 60   (rouge)
}

export enum SubscriptionTier {
  FREE = 'FREE',           // Découverte — tutoriels uniquement
  ESSENTIAL = 'ESSENTIAL', // Essentiel — 5 énergie/jour
  UNLIMITED = 'UNLIMITED', // Illimité — énergie non décomptée
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
  PAST_DUE = 'PAST_DUE',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export enum EnergyLedgerReason {
  DAILY_RESET = 'DAILY_RESET',
  SESSION_SPENT = 'SESSION_SPENT',
  AXIS_SPENT = 'AXIS_SPENT',
  REFUND = 'REFUND',
  ADMIN_GRANT = 'ADMIN_GRANT',
}

export enum RecommendationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum BadgeCategory {
  STREAK = 'STREAK',
  PERFORMANCE = 'PERFORMANCE',
  VOLUME = 'VOLUME',
  MASTERY = 'MASTERY',
}

export enum MemoryPhase {
  NORMAL = 'NORMAL',
  INVERSE = 'INVERSE',
}
```

## Métriques par axe (`libs/shared`)
Persistées en JSONB dans `SessionAxis.metrics`, typées par une union discriminée.

```typescript
export type AxisMetrics =
  | LogicMetrics
  | MemoryMetrics
  | VisualDiscriminationMetrics
  | ReactivityMetrics
  | MotorSkillsMetrics;

export interface LogicMetrics {
  axis: AxisType.LOGIC;
  precision: number;            // %
  itemsAnswered: number;        // /40
  itemsSkipped: number;
  avgTimePerItemMs: number;
  accuracyByType: { numeric: number; letters: number; symbols: number; mixed: number };
}

export interface MemoryMetrics {
  axis: AxisType.MEMORY;
  maxLengthNormal: number;      // longueur max mémorisée (ordre normal)
  maxLengthInverse: number;     // ordre inversé
  errorProfile: { position: number; content: number };
  dropOffStep: number;
}

export interface VisualDiscriminationMetrics {
  axis: AxisType.VISUAL_DISCRIMINATION;
  precision: number;
  avgDecisionTimeMs: number;
  falseAlarmRate: number;
  accuracyByLength: { short: number; medium: number; long: number };
}

export interface ReactivityMetrics {
  axis: AxisType.REACTIVITY;
  meanReactionTimeMs: number;
  reactionTimeSd: number;
  anticipations: number;
  omissions: number;
  inhibitionErrors: number;
  fatigueDriftMsPerMin: number;
}

export interface MotorSkillsMetrics {
  axis: AxisType.MOTOR_SKILLS;
  scoresByCourse: [number, number, number]; // P1, P2, P3
  avgPrecisionPx: number;
  exits: number;
  handIndependence: number;     // corrélation H/V (0 = indépendance parfaite)
}
```

## Schéma Prisma (`apps/api/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Sector { RAILWAY AVIATION SECURITY INDUSTRY HEALTHCARE }
enum AxisType { LOGIC MEMORY VISUAL_DISCRIMINATION REACTIVITY MOTOR_SKILLS }
enum SessionMode { FULL TARGETED TUTORIAL }
enum SessionStatus { IN_PROGRESS SUSPENDED COMPLETED ABANDONED }
enum DifficultyLevel { EASY NORMAL HARD }
enum ScoreBand { EXCELLENT ACCEPTABLE FRAGILE INSUFFICIENT }
enum SubscriptionTier { FREE ESSENTIAL UNLIMITED }
enum SubscriptionStatus { ACTIVE CANCELED EXPIRED PAST_DUE }
enum BillingPeriod { MONTHLY ANNUAL }
enum EnergyLedgerReason { DAILY_RESET SESSION_SPENT AXIS_SPENT REFUND ADMIN_GRANT }
enum RecommendationPriority { HIGH MEDIUM LOW }
enum BadgeCategory { STREAK PERFORMANCE VOLUME MASTERY }

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  displayName   String
  passwordHash  String?
  locale        String   @default("fr")
  timezone      String   @default("Europe/Paris")
  currentSector Sector   @default(RAILWAY)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  subscription Subscription?
  energyWallet EnergyWallet?
  streak       Streak?
  sessions     Session[]
  axisBests    AxisBest[]
  badges       UserBadge[]
  energyLedger EnergyLedger[]
}

model Subscription {
  id                     String             @id @default(uuid())
  userId                 String             @unique
  tier                   SubscriptionTier   @default(FREE)
  status                 SubscriptionStatus @default(ACTIVE)
  billingPeriod          BillingPeriod?
  currentPeriodEnd       DateTime?
  cancelAtPeriodEnd      Boolean            @default(false)
  externalCustomerId     String?
  externalSubscriptionId String?
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt
  user                   User               @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EnergyWallet {
  id          String   @id @default(uuid())
  userId      String   @unique
  balance     Int      @default(5)
  capacity    Int      @default(5)
  lastResetAt DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EnergyLedger {
  id           String             @id @default(uuid())
  userId       String
  delta        Int
  reason       EnergyLedgerReason
  balanceAfter Int
  sessionId    String?
  createdAt    DateTime           @default(now())
  user         User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

model Session {
  id               String          @id @default(uuid())
  userId           String
  mode             SessionMode
  sector           Sector
  difficulty       DifficultyLevel
  status           SessionStatus   @default(IN_PROGRESS)
  seed             String
  energyCost       Int
  currentAxisIndex Int             @default(0)
  globalScore      Float?
  globalBand       ScoreBand?
  isAdmissible     Boolean?
  isEliminated     Boolean?
  sectorThreshold  Int
  startedAt        DateTime        @default(now())
  completedAt      DateTime?
  abandonedAt      DateTime?
  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  axisResults      SessionAxis[]
  recommendations  Recommendation[]

  @@index([userId, startedAt])
  @@index([userId, status])
}

model SessionAxis {
  id              String     @id @default(uuid())
  sessionId       String
  axis            AxisType
  order           Int
  normalizedScore Float?
  band            ScoreBand?
  skipped         Boolean    @default(false)
  startedAt       DateTime?
  completedAt     DateTime?
  metrics         Json?
  session         Session    @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, axis])
}

model AxisBest {
  id            String    @id @default(uuid())
  userId        String
  axis          AxisType
  bestScore     Float
  band          ScoreBand
  achievedAt    DateTime
  sessionAxisId String?
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, axis])
}

model Recommendation {
  id        String                 @id @default(uuid())
  sessionId String
  axis      AxisType
  priority  RecommendationPriority
  code      String
  label     String
  createdAt DateTime               @default(now())
  session   Session                @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model Streak {
  id               String    @id @default(uuid())
  userId           String    @unique
  current          Int       @default(0)
  longest          Int       @default(0)
  lastActivityDate DateTime?
  updatedAt        DateTime  @updatedAt
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Badge {
  id          String        @id @default(uuid())
  code        String        @unique
  name        String
  description String
  category    BadgeCategory
  icon        String
  users       UserBadge[]
}

model UserBadge {
  id         String   @id @default(uuid())
  userId     String
  badgeId    String
  unlockedAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge      Badge    @relation(fields: [badgeId], references: [id], onDelete: Cascade)

  @@unique([userId, badgeId])
}

model SectorConfig {
  sector                 Sector             @id
  label                  String
  isActive               Boolean            @default(false)
  admissibilityThreshold Int
  vigilanceThreshold     Int                @default(65)
  eliminatoryThreshold   Int                @default(55)
  axisWeights            SectorAxisWeight[]
}

model SectorAxisWeight {
  id          String       @id @default(uuid())
  sector      Sector
  axis        AxisType
  coefficient Float
  isCritical  Boolean      @default(false)
  config      SectorConfig @relation(fields: [sector], references: [sector], onDelete: Cascade)

  @@unique([sector, axis])
}
```

## Seed initial — secteur Ferroviaire
- `SectorConfig` : RAILWAY, label « Ferroviaire », `isActive = true`, admissibilité 70, vigilance 65, éliminatoire 55.
- `SectorAxisWeight` : Logique 1.0 (non critique) · Mémoire 1.2 (critique) · Discrimination visuelle 1.2 (critique) · Réactivité 1.4 (critique) · Motricité 1.0 (non critique).
- Autres secteurs : `isActive = false` (affichés « À venir » côté UI).

## Note
Les exercices ne sont pas stockés : génération procédurale déterministe à partir de `seed` + `axis` + `difficulty` + `sector`. Les paramètres de génération par axe/difficulté peuvent rester des constantes côté code (ou une config dédiée si on veut les éditer sans redéployer).

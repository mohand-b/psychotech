import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import {
  AXIS_TRAINING,
  AxisType,
  LogicFamilyFilter,
  Sector,
  SessionMode,
  createSeededRng,
  generateDiscriminationSession,
  generateLogicSession,
  generateMemorySession,
  generateMotricityCourses,
  generateReactivitySession,
} from '@psychotech/shared';
import { AppModule } from '../../src/app/app.module';
import { AuthService } from '../../src/app/auth/auth.service';
import { BadgesService } from '../../src/app/badges/badges.service';
import { withDatabaseRetry } from '../../src/app/prisma/database-retry';
import { PrismaService } from '../../src/app/prisma/prisma.service';
import { CompleteTargetedSessionRequest } from '../../src/app/sessions/dto/complete-targeted-session.request';
import { SessionsService } from '../../src/app/sessions/sessions.service';
import {
  simulateDiscriminationAnswers,
  simulateFlawlessReactivityAnswers,
  simulateLogicAnswers,
  simulateMemoryAnswers,
  simulateMotricityTrajectories,
  simulateReactivityAnswers,
} from './candidate-simulator';
import { PlannedSession } from './demo-profile';
import * as johnProfile from './demo-profile';
import * as vendorProfile from './vendor-profile';

const profile = process.argv.includes('--profile=vendor')
  ? vendorProfile
  : johnProfile;
const {
  DEMO_CREDITS,
  DEMO_EMAIL,
  DEMO_FILTERED_PLAN,
  DEMO_FIRST_NAME,
  DEMO_LAST_NAME,
  DEMO_PASSWORD,
  DEMO_PLAN,
  DEMO_SEED,
  DEMO_WORKING_CREDITS,
  abilityForAxis,
} = profile;

const LOCAL_DATABASE_HOSTS = ['localhost', '127.0.0.1', '::1'];
const AXIS_SESSION_MINUTES = 7;
const SESSION_HOURS = [18, 21, 12, 19, 8];

function assertDevelopmentEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refus : NODE_ENV vaut production. Ce script ne génère que des données de démonstration.',
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Refus : DATABASE_URL est absente.');
  }
  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new Error("Refus : DATABASE_URL n'est pas une URL exploitable.");
  }
  const allowedRemoteHost = process.env.DEMO_DATASET_DEV_HOST;
  if (!LOCAL_DATABASE_HOSTS.includes(host) && host !== allowedRemoteHost) {
    throw new Error(
      `Refus : la base « ${host} » n'est pas locale. Nommez-la dans DEMO_DATASET_DEV_HOST pour l'autoriser explicitement.`,
    );
  }
}

function dateAt(dayOffset: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, (Math.abs(dayOffset) * 7) % 60, 0, 0);
  return date;
}

function startedAtFor(planned: PlannedSession): Date {
  return dateAt(
    planned.dayOffset,
    SESSION_HOURS[Math.abs(planned.dayOffset) % SESSION_HOURS.length],
  );
}

async function resolveDemoUserId(
  prisma: PrismaClient,
  authService: AuthService,
): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    return existing.id;
  }
  await authService.register({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    firstName: DEMO_FIRST_NAME,
    lastName: DEMO_LAST_NAME,
    currentSector: Sector.RAILWAY,
  });
  const created = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!created) {
    throw new Error("Le compte de démonstration n'a pas pu être créé.");
  }
  return created.id;
}

// Ne touche qu'au compte de démonstration : toutes les suppressions sont
// filtrées sur son userId.
async function resetDemoAccount(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.axisBest.deleteMany({ where: { userId } });
  await prisma.energyLedger.deleteMany({ where: { userId } });
  await prisma.userBadge.deleteMany({ where: { userId } });
  await prisma.streak.deleteMany({ where: { userId } });
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date(), tutorialDiscoveredAt: null },
  });
  await setCredits(prisma, userId, DEMO_WORKING_CREDITS);
}

async function setCredits(
  prisma: PrismaClient,
  userId: string,
  balance: number,
): Promise<void> {
  await withDatabaseRetry(() =>
    prisma.energyWallet.upsert({
      where: { userId },
      create: { userId, balance },
      update: { balance },
    }),
  );
}

function buildAxisRequest(
  axis: AxisType,
  seed: string,
  contentVersion: number,
  logicFamily: LogicFamilyFilter | null,
  ability: number,
  seedSuffix: string,
  flawless: boolean,
): CompleteTargetedSessionRequest {
  const rng = createSeededRng(`${DEMO_SEED}:${seedSuffix}:${axis}`);
  const request = new CompleteTargetedSessionRequest();
  request.axis = axis;
  if (flawless) {
    if (axis !== AxisType.REACTIVITY) {
      throw new Error(
        `Passe sans faute non implémentée pour l'axe ${axis} : seule la Réactivité est prévue.`,
      );
    }
    const simulated = simulateFlawlessReactivityAnswers(
      generateReactivitySession(seed),
      rng,
    );
    request.stimuli = simulated.stimuli;
    request.waitPresses = simulated.waitPresses;
    request.playedMs = AXIS_TRAINING[AxisType.REACTIVITY].timer.durationSec * 1000;
    return request;
  }
  if (axis === AxisType.LOGIC) {
    request.items = simulateLogicAnswers(
      generateLogicSession(seed, logicFamily, contentVersion),
      ability,
      rng,
    );
    return request;
  }
  if (axis === AxisType.MEMORY) {
    request.sequences = simulateMemoryAnswers(
      generateMemorySession(seed),
      ability,
      rng,
    );
    return request;
  }
  if (axis === AxisType.VISUAL_DISCRIMINATION) {
    request.trials = simulateDiscriminationAnswers(
      generateDiscriminationSession(seed),
      ability,
      rng,
    );
    return request;
  }
  if (axis === AxisType.REACTIVITY) {
    const simulated = simulateReactivityAnswers(
      generateReactivitySession(seed),
      ability,
      rng,
    );
    request.stimuli = simulated.stimuli;
    request.waitPresses = simulated.waitPresses;
    request.playedMs = AXIS_TRAINING[AxisType.REACTIVITY].timer.durationSec * 1000;
    return request;
  }
  request.courses = simulateMotricityTrajectories(
    generateMotricityCourses(seed, { contentVersion }),
    ability,
    rng,
  );
  return request;
}

async function backdateSession(
  prisma: PrismaClient,
  sessionId: string,
  startedAt: Date,
  playedAxisCount: number | null,
): Promise<void> {
  const axes = await prisma.sessionAxis.findMany({
    where: { sessionId },
    orderBy: { order: 'asc' },
  });
  const played = playedAxisCount ?? axes.length;
  let cursor = startedAt.getTime();
  for (const [index, axis] of axes.entries()) {
    if (index >= played) {
      break;
    }
    const axisStartedAt = new Date(cursor);
    cursor += AXIS_SESSION_MINUTES * 60 * 1000;
    await prisma.sessionAxis.update({
      where: { id: axis.id },
      data: { startedAt: axisStartedAt, completedAt: new Date(cursor) },
    });
  }
  const endedAt = new Date(
    played === 0 ? cursor + AXIS_SESSION_MINUTES * 60 * 1000 : cursor,
  );
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    select: { status: true },
  });
  await prisma.session.update({
    where: { id: sessionId },
    data:
      session.status === 'ABANDONED'
        ? { startedAt, abandonedAt: endedAt }
        : { startedAt, completedAt: endedAt },
  });
  await prisma.energyLedger.updateMany({
    where: { sessionId },
    data: { createdAt: startedAt },
  });
  await prisma.axisBest.updateMany({
    where: { sessionAxisId: { in: axes.map((axis) => axis.id) } },
    data: { achievedAt: endedAt },
  });
}

// Un badge doit porter la date de la session qui l'a déclenché, sinon la
// collection entière paraît obtenue aujourd'hui. Les badges sont aussi marqués
// comme vus : le compte doit s'ouvrir sur un tableau de bord posé, pas sur
// dix célébrations à enchaîner.
async function datePastBadges(
  prisma: PrismaClient,
  userId: string,
  firstSessionAt: Date,
): Promise<void> {
  const badges = await prisma.userBadge.findMany({ where: { userId } });
  for (const badge of badges) {
    const session = badge.sessionId
      ? await prisma.session.findUnique({
          where: { id: badge.sessionId },
          select: { completedAt: true, abandonedAt: true, startedAt: true },
        })
      : null;
    const earnedAt =
      session?.completedAt ?? session?.abandonedAt ?? session?.startedAt ?? firstSessionAt;
    await prisma.userBadge.update({
      where: { id: badge.id },
      data: { earnedAt, acknowledgedAt: earnedAt },
    });
  }
}

interface PlayedSession {
  planned: PlannedSession;
  sessionId: string;
  playedAxisCount: number;
  globalScore: number | null;
  axisScores: { axis: AxisType; score: number | null }[];
}

async function playSession(
  prisma: PrismaClient,
  sessionsService: SessionsService,
  userId: string,
  planned: PlannedSession,
  seedSuffix: string,
): Promise<PlayedSession> {
  await setCredits(prisma, userId, DEMO_WORKING_CREDITS);
  const started = await sessionsService.start(userId, {
    mode: planned.mode,
    sector: Sector.RAILWAY,
    ...(planned.axis ? { axis: planned.axis } : {}),
    ...(planned.logicFamily
      ? { options: { enabledOptions: [], logicFamily: planned.logicFamily } }
      : {}),
  });
  const stored = await prisma.session.findUniqueOrThrow({
    where: { id: started.id },
    include: { axisResults: { orderBy: { order: 'asc' } } },
  });
  const axesToPlay =
    planned.abandonAfterAxes === undefined
      ? stored.axisResults
      : stored.axisResults.slice(0, planned.abandonAfterAxes);
  for (const axisResult of axesToPlay) {
    const axis = axisResult.axis as AxisType;
    const flawless = planned.flawless === true && axis === planned.axis;
    const ability =
      planned.axisAbilities?.[axis] ??
      abilityForAxis(axis, planned.ability, planned.criticalFloor);
    const request = buildAxisRequest(
      axis,
      stored.seed,
      stored.contentVersion,
      (stored.logicFamily as LogicFamilyFilter | null) ?? null,
      ability,
      seedSuffix,
      flawless,
    );
    await sessionsService.completeAxis(userId, started.id, axis, request);
  }
  const finished = await prisma.session.findUniqueOrThrow({
    where: { id: started.id },
    include: { axisResults: { orderBy: { order: 'asc' } } },
  });
  return {
    planned,
    sessionId: started.id,
    playedAxisCount: axesToPlay.length,
    globalScore: finished.globalScore,
    axisScores: finished.axisResults.map((axisResult) => ({
      axis: axisResult.axis as AxisType,
      score: axisResult.normalizedScore,
    })),
  };
}

function reportRow(played: PlayedSession): string {
  const abandoned = played.planned.abandonAfterAxes !== undefined;
  const label = abandoned
    ? 'ABANDONNÉE'
    : played.planned.mode === SessionMode.FULL
      ? 'Examen blanc'
      : `Ciblé ${played.planned.axis}`;
  const global =
    played.globalScore === null ? '    -' : played.globalScore.toFixed(1).padStart(5);
  const axes = played.axisScores
    .map(
      (entry) =>
        `${entry.axis.slice(0, 4)}=${entry.score === null ? '-' : entry.score.toFixed(0)}`,
    )
    .join(' ');
  return `J${String(played.planned.dayOffset).padStart(4)}  ${label.padEnd(28)} global=${global}  ${axes}`;
}

async function run(): Promise<void> {
  assertDevelopmentEnvironment();
  const resetOnly = process.argv.includes('--reset');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const prisma = app.get(PrismaService);
    const authService = app.get(AuthService);
    const sessionsService = app.get(SessionsService);
    const badgesService = app.get(BadgesService);

    const userId = await resolveDemoUserId(prisma, authService);
    await resetDemoAccount(prisma, userId);

    if (resetOnly) {
      await setCredits(prisma, userId, DEMO_CREDITS);
      process.stdout.write(
        `Compte ${DEMO_EMAIL} remis à zéro : aucune session, aucun badge, ${DEMO_CREDITS} crédits.\n`,
      );
      return;
    }

    // Passe par le vrai chemin : le moteur de badges évalue TUTORIAL_OPENED et
    // attribue « Premiers pas » parce que ses conditions sont remplies.
    await badgesService.markTutorialDiscovered(userId);

    const played: PlayedSession[] = [];
    const plan = [...DEMO_PLAN, ...DEMO_FILTERED_PLAN];
    for (const [index, planned] of plan.entries()) {
      const session = await playSession(
        prisma,
        sessionsService,
        userId,
        planned,
        `s${index}`,
      );
      played.push(session);
      process.stdout.write(`${reportRow(session)}\n`);
    }

    // Les dates sont posées à la fin : une session abandonnée ne prend son
    // statut définitif qu'au lancement de la suivante.
    for (const session of played) {
      await backdateSession(
        prisma,
        session.sessionId,
        startedAtFor(session.planned),
        session.planned.abandonAfterAxes === undefined
          ? null
          : session.playedAxisCount,
      );
    }

    await datePastBadges(prisma, userId, startedAtFor(played[0].planned));
    await setCredits(prisma, userId, DEMO_CREDITS);

    const badges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'asc' },
    });
    const bests = await prisma.axisBest.findMany({
      where: { userId },
      orderBy: { axis: 'asc' },
    });

    process.stdout.write(
      [
        '',
        '─────────────────────────────────────────────',
        `Compte       : ${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}`,
        `E-mail       : ${DEMO_EMAIL}`,
        `Mot de passe : ${DEMO_PASSWORD}`,
        `Crédits      : ${DEMO_CREDITS} · Secteur : Ferroviaire`,
        `Sessions     : ${played.length}`,
        `Meilleurs    : ${bests
          .map((best) => `${best.axis.slice(0, 4)}=${best.bestScore.toFixed(0)}`)
          .join(' ')}`,
        `Badges (${badges.length})   : ${badges.map((badge) => badge.badgeId).join(', ')}`,
        '─────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  process.exitCode = 1;
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
});

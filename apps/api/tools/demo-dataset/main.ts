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
import { PrismaService } from '../../src/app/prisma/prisma.service';
import { CompleteTargetedSessionRequest } from '../../src/app/sessions/dto/complete-targeted-session.request';
import { SessionsService } from '../../src/app/sessions/sessions.service';
import {
  simulateDiscriminationAnswers,
  simulateLogicAnswers,
  simulateMemoryAnswers,
  simulateMotricityTrajectories,
  simulateReactivityAnswers,
} from './candidate-simulator';
import {
  DEMO_EMAIL,
  DEMO_FILTERED_PLAN,
  DEMO_FIRST_NAME,
  DEMO_LAST_NAME,
  DEMO_PASSWORD,
  DEMO_PLAN,
  DEMO_SEED,
  PlannedSession,
  abilityForAxis,
} from './demo-profile';

const LOCAL_DATABASE_HOSTS = ['localhost', '127.0.0.1', '::1'];
const AXIS_SESSION_MINUTES = 14;

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

function dateAt(dayOffset: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
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

async function resetDemoAccount(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date(), tutorialDiscoveredAt: new Date() },
  });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.axisBest.deleteMany({ where: { userId } });
  await prisma.energyLedger.deleteMany({ where: { userId } });
  await prisma.userBadge.deleteMany({ where: { userId } });
  await prisma.streak.deleteMany({ where: { userId } });
  await prisma.energyWallet.upsert({
    where: { userId },
    create: { userId, balance: 5 },
    update: { balance: 5 },
  });
}

async function refillEnergy(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.energyWallet.update({
    where: { userId },
    data: { balance: 5 },
  });
}

function buildAxisRequest(
  axis: AxisType,
  seed: string,
  contentVersion: number,
  logicFamily: LogicFamilyFilter | null,
  ability: number,
  seedSuffix: string,
): CompleteTargetedSessionRequest {
  const rng = createSeededRng(`${DEMO_SEED}:${seedSuffix}:${axis}`);
  const request = new CompleteTargetedSessionRequest();
  request.axis = axis;
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
): Promise<void> {
  const axes = await prisma.sessionAxis.findMany({
    where: { sessionId },
    orderBy: { order: 'asc' },
  });
  let cursor = startedAt.getTime();
  for (const axis of axes) {
    const axisStartedAt = new Date(cursor);
    cursor += AXIS_SESSION_MINUTES * 60 * 1000;
    await prisma.sessionAxis.update({
      where: { id: axis.id },
      data: { startedAt: axisStartedAt, completedAt: new Date(cursor) },
    });
  }
  const completedAt = new Date(cursor);
  await prisma.session.update({
    where: { id: sessionId },
    data: { startedAt, completedAt },
  });
  await prisma.energyLedger.updateMany({
    where: { sessionId },
    data: { createdAt: startedAt },
  });
  await prisma.axisBest.updateMany({
    where: { sessionAxisId: { in: axes.map((axis) => axis.id) } },
    data: { achievedAt: completedAt },
  });
}

interface PlayedSession {
  planned: PlannedSession;
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
  await refillEnergy(prisma, userId);
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
  for (const axisResult of stored.axisResults) {
    const axis = axisResult.axis as AxisType;
    const request = buildAxisRequest(
      axis,
      stored.seed,
      stored.contentVersion,
      (stored.logicFamily as LogicFamilyFilter | null) ?? null,
      abilityForAxis(axis, planned.ability),
      seedSuffix,
    );
    await sessionsService.completeAxis(userId, started.id, axis, request);
  }
  await backdateSession(
    prisma,
    started.id,
    dateAt(planned.dayOffset, 18, 30),
  );
  const finished = await prisma.session.findUniqueOrThrow({
    where: { id: started.id },
    include: { axisResults: { orderBy: { order: 'asc' } } },
  });
  return {
    planned,
    globalScore: finished.globalScore,
    axisScores: finished.axisResults.map((axisResult) => ({
      axis: axisResult.axis as AxisType,
      score: axisResult.normalizedScore,
    })),
  };
}

function reportRow(played: PlayedSession): string {
  const label =
    played.planned.mode === SessionMode.FULL
      ? 'Examen blanc'
      : `Ciblé ${played.planned.axis}`;
  const global =
    played.globalScore === null ? '   -' : played.globalScore.toFixed(1).padStart(5);
  const axes = played.axisScores
    .map(
      (entry) =>
        `${entry.axis.slice(0, 4)}=${entry.score === null ? '-' : entry.score.toFixed(0)}`,
    )
    .join(' ');
  return `J${String(played.planned.dayOffset).padStart(4)}  ${label.padEnd(26)} global=${global}  ${axes}`;
}

async function run(): Promise<void> {
  assertDevelopmentEnvironment();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const prisma = app.get(PrismaService);
    const authService = app.get(AuthService);
    const sessionsService = app.get(SessionsService);

    const userId = await resolveDemoUserId(prisma, authService);
    await resetDemoAccount(prisma, userId);

    const played: PlayedSession[] = [];
    const plan = [...DEMO_PLAN, ...DEMO_FILTERED_PLAN];
    for (const [index, planned] of plan.entries()) {
      played.push(
        await playSession(prisma, sessionsService, userId, planned, `s${index}`),
      );
      process.stdout.write(`${reportRow(played[played.length - 1])}\n`);
    }

    await refillEnergy(prisma, userId);
    process.stdout.write(
      [
        '',
        '─────────────────────────────────────────────',
        `Compte de démonstration : ${DEMO_FIRST_NAME} ${DEMO_LAST_NAME}`,
        `E-mail    : ${DEMO_EMAIL}`,
        `Mot de passe : ${DEMO_PASSWORD}`,
        `Formule   : ESSENTIEL · Secteur : Ferroviaire`,
        `Sessions  : ${played.length}`,
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

// Contrôle : chaque badge et la session qui l'a déclenché.
//   node apps/api/tools/demo-dataset/inspect.js
const path = require('node:path');
const repoRoot = path.resolve(__dirname, '../../../..');
require('dotenv').config({ path: path.join(repoRoot, 'apps/api/.env') });
const { PrismaClient } = require('@prisma/client');

const EMAIL = 'john.doe@example.com';

(async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (!user) throw new Error('compte de démonstration absent');
    console.log(`userId : ${user.id}`);

    const badges = await prisma.userBadge.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'asc' },
    });
    for (const badge of badges) {
      const session = badge.sessionId
        ? await prisma.session.findUnique({
            where: { id: badge.sessionId },
            include: { axisResults: true },
          })
        : null;
      const when = badge.earnedAt.toISOString().slice(0, 10);
      const label = session
        ? `${session.mode}${session.mode === 'TARGETED' ? ' ' + session.axisResults[0]?.axis : ''} ${session.id}`
        : 'AUCUNE SESSION';
      console.log(`  ${when}  ${badge.badgeId.padEnd(26)} ${label}`);
    }

    const sessions = await prisma.session.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: true,
    });
    console.log(
      'sessions :',
      sessions.map((s) => `${s.status}=${s._count}`).join(' '),
    );
  } finally {
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

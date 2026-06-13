import { join } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: join(__dirname, '.env') });

export default defineConfig({
  schema: join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: join(__dirname, 'prisma', 'migrations'),
    seed: 'node -r @swc-node/register prisma/seed.ts',
  },
});

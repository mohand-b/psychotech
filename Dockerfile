FROM node:22.16.0-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app
ENV NX_DAEMON=false
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npx nx build api --configuration=production && npx nx build web --configuration=production

FROM base AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY apps/api/prisma ./apps/api/prisma
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/package.json ./package.json
COPY apps/api/prisma ./apps/api/prisma
COPY --from=build /app/dist/apps/api ./dist/apps/api
COPY --from=build /app/dist/apps/web ./dist/apps/web
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && exec node dist/apps/api/main.js"]

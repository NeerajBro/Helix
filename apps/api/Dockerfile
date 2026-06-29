# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages

RUN npm ci --legacy-peer-deps
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npx nx build api --configuration=production

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/apps/api/src/generated ./generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 3000

CMD ["node", "main.js"]

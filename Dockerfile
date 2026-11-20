# ==============================================================================
# UpdatePilot Cloud Production Dockerfile
# Unified Express Backend + Next.js Static Dashboard + SQLite
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests and workspace packages
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/
COPY apps/web/package*.json ./apps/web/
COPY apps/agent/package*.json ./apps/agent/

# Install build dependencies
RUN npm ci

# Copy full source trees
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
COPY apps/web ./apps/web
COPY apps/agent ./apps/agent

# Build shared library
RUN npm run build --workspace=packages/shared

# Generate Production PostgreSQL Prisma Client & Build Backend
WORKDIR /app/apps/backend
RUN npx prisma generate --schema=prisma/schema.postgresql.prisma
RUN npm run build

# Build Web Frontend (Static Export to out/)
WORKDIR /app/apps/web
ENV NEXT_PUBLIC_API_URL=/api/v1
RUN npm run build

# ------------------------------------------------------------------------------
# Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_WEB_DIR=/app/apps/web/out
ENV PATH="/app/node_modules/.bin:$PATH"

# Install openssl for Prisma engine
RUN apk add --no-cache openssl

# Prepare persistent data volume directory
RUN mkdir -p /data

# Copy built backend and production node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder /app/apps/web/out ./apps/web/out
COPY scripts/prepare-prisma.mjs ./scripts/prepare-prisma.mjs

# Expose HTTP ports (Railway default 8080, Render/Fallback 4000)
EXPOSE 8080 4000

# Push pristine schema to PostgreSQL or SQLite based on DATABASE_URL, then start backend server
CMD ["sh", "-c", "node scripts/prepare-prisma.mjs && node apps/backend/dist/index.js"]

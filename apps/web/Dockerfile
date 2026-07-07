# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js web app in a pnpm monorepo.

# ── base: node + pnpm ─────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# ── deps: install the whole workspace (also used by the `migrate` service) ────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY presets ./presets
RUN pnpm install --frozen-lockfile || pnpm install

# ── build: compile the Next.js standalone bundle ──────────────────────────────
FROM deps AS build
RUN pnpm --filter @khodkar/web build

# ── runner: minimal image serving the standalone output ───────────────────────
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

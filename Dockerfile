FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV COREPACK_HOME="/corepack"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@10.0.0 --activate \
  && chmod -R a+rX "$COREPACK_HOME"

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base AS runner

ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"
ENV HOME="/home/refundhold"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs --home "$HOME" refundhold \
  && mkdir -p "$HOME/.cache" \
  && chown -R refundhold:nodejs "$HOME"

COPY --from=prod-deps --chown=refundhold:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=refundhold:nodejs /app/.next ./.next
COPY --from=build --chown=refundhold:nodejs /app/public ./public
COPY --from=build --chown=refundhold:nodejs /app/src/generated ./src/generated
COPY --chown=refundhold:nodejs package.json ./
COPY --chown=refundhold:nodejs next.config.ts ./next.config.ts
COPY --chown=refundhold:nodejs prisma ./prisma
COPY --chown=refundhold:nodejs prisma.config.ts ./prisma.config.ts
COPY --chown=refundhold:nodejs tsconfig.json ./tsconfig.json

USER refundhold

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]

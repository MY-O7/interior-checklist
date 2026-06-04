# --- 빌드 스테이지 ---
FROM node:20-slim AS builder
WORKDIR /app

# PostgreSQL 클라이언트 라이브러리 설치 (Prisma 필요)
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# --- 런타임 스테이지 ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# PostgreSQL 클라이언트 라이브러리 설치
RUN apt-get update && apt-get install -y openssl libssl-dev curl && rm -rf /var/lib/apt/lists/*

# nextjs 사용자 생성 (홈 디렉토리 설정)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /app nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 마이그레이션 및 시드 스크립트
COPY --from=builder /app/package*.json ./

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV HOME=/app
ENV NPM_CONFIG_CACHE=/app/.npm

# 시작 스크립트: DB 마이그레이션 후 서버 실행
COPY --chown=nextjs:nodejs --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]

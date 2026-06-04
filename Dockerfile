# --- 빌드 스테이지 ---
FROM node:22-slim AS builder
WORKDIR /app

# PostgreSQL 클라이언트 라이브러리 설치 (Prisma 필요)
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
ENV DATABASE_URL="postgresql://somssi:Somssi!Interior2026@db:5432/somssi_interior"
RUN npx prisma generate
RUN npm run build

# --- 런타임 스테이지 ---
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# PostgreSQL 클라이언트 라이브러리 설치
RUN apt-get update && apt-get install -y openssl libssl-dev curl && rm -rf /var/lib/apt/lists/*

# nextjs 사용자 생성 (홈 디렉토리를 /app으로 설정)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /app nextjs

# Next.js standalone 빌드 결과물
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma: 생성된 클라이언트 + CLI (db push 실행에 필요)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/effect ./node_modules/effect

# package.json 및 시작 스크립트
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/docker-entrypoint.sh ./

# 권한 설정 (USER 전환 전에 root로 처리)
RUN chmod +x docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV HOME=/app

ENTRYPOINT ["./docker-entrypoint.sh"]

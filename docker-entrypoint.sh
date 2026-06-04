#!/bin/sh
set -e

# npm 캐시 디렉토리 설정
export NPM_CONFIG_CACHE=/app/.npm
mkdir -p /app/.npm

echo "⏳ 데이터베이스 연결 대기 중..."
until npx prisma migrate deploy; do
  echo "  데이터베이스 준비 중... 잠시 후 다시 시도"
  sleep 2
done

echo "✅ 데이터베이스 마이그레이션 완료"

echo "🚀 서버 시작..."
exec node server.js

#!/bin/sh
set -e

echo "⏳ 데이터베이스 연결 대기 중..."
until node /app/node_modules/prisma/build/index.js db push --accept-data-loss; do
  echo "  데이터베이스 준비 중... 잠시 후 다시 시도"
  sleep 3
done

echo "✅ 데이터베이스 준비 완료"
echo "🚀 서버 시작..."
exec node server.js

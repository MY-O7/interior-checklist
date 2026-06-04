#!/bin/sh
set -e

PRISMA="/app/node_modules/prisma/build/index.js"
MAX_RETRY=30
i=1

echo "⏳ 데이터베이스 연결 및 스키마 적용 대기 중..."
until node "$PRISMA" db push --accept-data-loss --skip-generate; do
  if [ "$i" -ge "$MAX_RETRY" ]; then
    echo "❌ $MAX_RETRY회 시도 후에도 db push 실패. 위 에러 로그를 확인하세요."
    exit 1
  fi
  echo "  ($i/$MAX_RETRY) 데이터베이스 준비 중... 3초 후 재시도"
  i=$((i + 1))
  sleep 3
done

echo "✅ 데이터베이스 준비 완료"
echo "🚀 서버 시작..."
exec node server.js

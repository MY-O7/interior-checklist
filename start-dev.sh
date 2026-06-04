#!/bin/bash
# 솜씨인테리어 체크리스트 앱 - 개발 서버 실행 스크립트

PROJECT_DIR="/Users/my-o/Projects/interior-checklist"
PID_FILE="/tmp/interior-checklist-dev.pid"

check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "⚠️  서버가 이미 실행 중입니다 (PID: $PID)"
            echo "   접속 주소: http://localhost:3000"
            exit 0
        fi
    fi
}

check_running

echo "🚀 솜씨인테리어 체크리스트 앱 개발 서버를 시작합니다..."
cd "$PROJECT_DIR" || exit 1

# 백그라운드로 실행하고 PID 저장
npm run dev > /dev/null 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

sleep 3

# 실행 확인
if ps -p "$PID" > /dev/null 2>&1; then
    echo "✅ 서버가 시작되었습니다!"
    echo ""
    echo "   로컬 접속:     http://localhost:3000"
    echo "   네트워크 접속:  http://$(ifconfig en0 | grep 'inet ' | awk '{print $2}'):3000"
    echo ""
    echo "   중지하려면: ./stop-dev.sh"
else
    echo "❌ 서버 시작 실패"
    rm -f "$PID_FILE"
    exit 1
fi

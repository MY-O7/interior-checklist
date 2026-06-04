#!/bin/bash
# 솜씨인테리어 체크리스트 앱 - 개발 서버 중지 스크립트

PID_FILE="/tmp/interior-checklist-dev.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "🛑 서버가 중지되었습니다."
    else
        echo "⚠️  서버가 이미 종료된 상태입니다."
        rm -f "$PID_FILE"
    fi
else
    echo "⚠️  실행 중인 서버를 찾을 수 없습니다."
fi

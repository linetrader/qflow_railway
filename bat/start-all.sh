#!/usr/bin/env bash
set -euo pipefail

echo "[start-all] checking production build..."
if [ ! -f ".next/BUILD_ID" ]; then
  echo "[start-all] no build found -> running: npm run build"
  npm run build
fi

echo "[start-all] starting processes (web + mining + level + sweep)..."

# 웹(Next) – 포트는 Next가 자체 결정
npm run start & WEB_PID=$!

# 워커들 (러너)
npm run start:runner:mining & MINING_PID=$!
npm run start:runner:level  & LEVEL_PID=$!
npm run start:runner:sweep  & SWEEP_PID=$!

echo "[start-all] PIDs -> web=$WEB_PID mining=$MINING_PID level=$LEVEL_PID sweep=$SWEEP_PID"

cleanup() {
  echo "[start-all] stopping others..."
  kill ${WEB_PID:-0} ${MINING_PID:-0} ${LEVEL_PID:-0} ${SWEEP_PID:-0} 2>/dev/null || true
  wait || true
}

trap cleanup INT TERM

# 어떤 자식이든 먼저 종료되면 나머지 정리하고 비정상 종료(=App Runner 재시작 유도)
wait -n || true
echo "[start-all] one child exited;"
cleanup
exit 1

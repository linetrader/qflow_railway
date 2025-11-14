#!/usr/bin/env bash
set -euo pipefail

echo "[dev-all] starting dev processes (web + mining + level + sweep, watch mode)..."

# ── 웹(Next dev) – 포트는 Next가 자체 결정
npm run dev & WEB_PID=$!

# ── 워커들 (러너)
npm run dev:runner:mining & MINING_PID=$!
npm run dev:runner:level  & LEVEL_PID=$!

# ── sweep 러너: watch 스크립트가 있으면 그걸, 없으면 기본 실행
if npm run | grep -qE '^[[:space:]]+dev:runner:sweep:watch'; then
  npm run dev:runner:sweep:watch & SWEEP_PID=$!
else
  npm run dev:runner:sweep & SWEEP_PID=$!
fi

echo "[dev-all] PIDs -> web=$WEB_PID mining=$MINING_PID level=$LEVEL_PID sweep=$SWEEP_PID"

cleanup() {
  echo "[dev-all] stopping children..."
  kill ${WEB_PID:-0} ${MINING_PID:-0} ${LEVEL_PID:-0} ${SWEEP_PID:-0} 2>/dev/null || true
  wait || true
}

trap cleanup INT TERM

# 어떤 자식이든 먼저 종료되면 나머지 정리하고 비정상 종료
wait -n || true
echo "[dev-all] one child exited;"
cleanup
exit 1

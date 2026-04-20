#!/usr/bin/env bash
# ==========================================
# QUDO 서버 qudo-api 로그 stream
# 로컬에서 실행: npm run server:logs
# ==========================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ ! -f .deploy.env ]]; then
  echo "ERROR: .deploy.env 가 없습니다." >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source .deploy.env
set +a

: "${SSH_HOST:?SSH_HOST 가 .deploy.env 에 없습니다}"
: "${SSH_USER:?SSH_USER 가 .deploy.env 에 없습니다}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
  SSH_OPTS+=(-i "$SSH_KEY_EXPANDED")
fi

SERVICE="${1:-qudo-api}"

echo "==> $SERVICE 로그 stream (Ctrl+C 로 빠져나옴)"
ssh -t "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "docker logs -f --tail=100 $SERVICE"

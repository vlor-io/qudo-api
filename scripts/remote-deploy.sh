#!/usr/bin/env bash
# ==========================================
# QUDO 재배포 스크립트 (이미지만 pull + restart)
# 로컬에서 실행: npm run server:deploy
# 전제: npm run server:setup 한 번은 돌아야 함
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

REMOTE="$SSH_USER@$SSH_HOST"
REMOTE_DIR="/home/$SSH_USER/qudo-api"

echo "==> GHCR pull + qudo-api 재기동"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd $REMOTE_DIR && \
  docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env pull && \
  docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env up -d && \
  docker image prune -f"

echo ""
echo "==> 로그 (Ctrl+C로 빠져나옴)"
ssh -t "${SSH_OPTS[@]}" "$REMOTE" "docker logs -f --tail=50 qudo-api"

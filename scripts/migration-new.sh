#!/usr/bin/env bash
# ==========================================
# 새 마이그레이션 파일 생성
# 사용: npm run migration:new <이름>
#   예: npm run migration:new InitialSchema
#   예: npm run migration:new AddUserAvatar
#
# 하는 일:
#   1) 로컬 postgres 컨테이너 기동 (이미 떠있으면 스킵)
#   2) 엔티티와 DB 스키마 비교해서 마이그레이션 파일 자동 생성
#   3) postgres는 계속 떠있음 (다음 생성도 빠르게)
# ==========================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

NAME="${1:-}"
if [[ -z "$NAME" ]]; then
  echo "사용법: npm run migration:new <이름>" >&2
  echo "예시:   npm run migration:new InitialSchema" >&2
  echo "        npm run migration:new AddUserAvatar" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERROR: .env 가 없습니다." >&2
  exit 1
fi

# 로컬에서도 qudo-net이 있어야 postgres 컨테이너가 뜸
echo "==> docker network 확인"
docker network inspect qudo-net >/dev/null 2>&1 || docker network create qudo-net

echo "==> 로컬 postgres 기동 (이미 떠있으면 스킵)"
docker compose -f deploy/database/docker-compose.yml --env-file .env up -d postgres

echo "==> postgres healthy 대기..."
for i in {1..15}; do
  if docker inspect --format='{{.State.Health.Status}}' qudo-postgres 2>/dev/null | grep -q healthy; then
    echo "    postgres healthy ✓"
    break
  fi
  sleep 2
done

echo "==> 마이그레이션 파일 생성: $NAME"
# POSTGRES_HOST/PORT 만 로컬용(127.0.0.1:5433)으로 덮어씀. .env는 안 건드림.
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 \
  npm run migration:generate -- "src/migrations/$NAME"

echo ""
echo "=========================================="
echo "  완료! src/migrations/ 확인"
echo "  이제: git add src/migrations && git commit && git push"
echo "=========================================="

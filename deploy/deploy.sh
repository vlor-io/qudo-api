#!/usr/bin/env bash
# QUDO API 재배포 스크립트
# 사용: ./deploy/deploy.sh  (프로젝트 루트에서 실행)
#   1) 최신 git 코드 pull (compose 파일 변경 반영 용도)
#   2) GHCR에서 최신 이미지 pull
#   3) API 컨테이너 교체
#   4) 로그 stream
set -euo pipefail

# 스크립트가 어디서 호출되든 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env 파일이 프로젝트 루트에 없습니다." >&2
  exit 1
fi

COMPOSE=(docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env)

echo "==> git pull"
git pull --ff-only

echo "==> docker pull (GHCR)"
"${COMPOSE[@]}" pull

echo "==> recreate qudo-api container"
"${COMPOSE[@]}" up -d

echo "==> cleaning up dangling images"
docker image prune -f

echo "==> done. streaming logs (Ctrl+C to detach)"
docker logs -f --tail=50 qudo-api

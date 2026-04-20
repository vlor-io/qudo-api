#!/usr/bin/env bash
# ==========================================
# QUDO 원격 서버 초기 세팅 스크립트
# 로컬에서 실행: npm run server:setup
# 하는 일:
#   1) .env / deploy/ 파일 업로드
#   2) 데이터 디렉토리 생성 + 권한 설정
#   3) docker network 생성
#   4) GHCR 로그인
#   5) database + nginx-proxy-manager + qudo-api 전부 기동
# ==========================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ---- 설정 로드 ----
if [[ ! -f .deploy.env ]]; then
  echo "ERROR: .deploy.env 가 없습니다." >&2
  echo "       cp .deploy.env.example .deploy.env 후 값 채우세요." >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source .deploy.env
set +a

: "${SSH_HOST:?SSH_HOST 가 .deploy.env 에 없습니다}"
: "${SSH_USER:?SSH_USER 가 .deploy.env 에 없습니다}"
: "${GHCR_USER:?GHCR_USER 가 .deploy.env 에 없습니다}"
: "${GHCR_PAT:?GHCR_PAT 가 .deploy.env 에 없습니다}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env 가 프로젝트 루트에 없습니다." >&2
  echo "       cp .env.example .env 후 실제 값 채우세요." >&2
  exit 1
fi

# ---- SSH 옵션 ----
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
  SSH_OPTS+=(-i "$SSH_KEY_EXPANDED")
fi

REMOTE="$SSH_USER@$SSH_HOST"
REMOTE_DIR="/home/$SSH_USER/qudo-api"

ssh_run() { ssh "${SSH_OPTS[@]}" "$REMOTE" "$@"; }
scp_copy() { scp "${SSH_OPTS[@]}" "$@"; }

echo ""
echo "=========================================="
echo "  Target: $REMOTE:$REMOTE_DIR"
echo "=========================================="
echo ""

# 1) SSH 연결 및 Docker 확인
echo "==> [1/9] SSH 연결 확인"
if ! ssh_run "docker --version && docker compose version" >/dev/null 2>&1; then
  echo "ERROR: 서버에 docker / docker compose 가 설치되어 있지 않습니다." >&2
  echo "       서버에서 다음 명령 수행 후 다시 실행:" >&2
  echo "       sudo apt update && sudo apt install -y docker.io docker-compose-v2" >&2
  echo "       sudo usermod -aG docker $SSH_USER && exit  (재접속)" >&2
  exit 1
fi

# 2) 원격 디렉토리 준비
echo "==> [2/9] 원격 디렉토리 생성"
ssh_run "mkdir -p \
  $REMOTE_DIR/deploy/database \
  $REMOTE_DIR/deploy/qudo-api \
  $REMOTE_DIR/deploy/nginx-proxy-server \
  $REMOTE_DIR/deploy/database/data/postgres \
  $REMOTE_DIR/deploy/database/data/redis \
  $REMOTE_DIR/deploy/qudo-api/data/qudo-api"

# 3) .env 업로드
echo "==> [3/9] .env 업로드"
scp_copy .env "$REMOTE:$REMOTE_DIR/.env"

# 4) deploy 파일 업로드
echo "==> [4/9] compose / deploy 파일 업로드"
scp_copy deploy/database/docker-compose.yml            "$REMOTE:$REMOTE_DIR/deploy/database/docker-compose.yml"
scp_copy deploy/qudo-api/docker-compose.yml            "$REMOTE:$REMOTE_DIR/deploy/qudo-api/docker-compose.yml"
scp_copy deploy/nginx-proxy-server/docker-compose.yaml "$REMOTE:$REMOTE_DIR/deploy/nginx-proxy-server/docker-compose.yaml"
scp_copy deploy/deploy.sh                              "$REMOTE:$REMOTE_DIR/deploy/deploy.sh"

# 5) 데이터 디렉토리 권한
echo "==> [5/9] 데이터 디렉토리 권한 설정"
ssh_run "sudo chown -R 999:999 $REMOTE_DIR/deploy/database/data/postgres $REMOTE_DIR/deploy/database/data/redis"
ssh_run "sudo chown -R 1000:1000 $REMOTE_DIR/deploy/qudo-api/data/qudo-api"
ssh_run "chmod +x $REMOTE_DIR/deploy/deploy.sh"

# 6) Docker 네트워크
echo "==> [6/9] docker network 'qudo-net' 확인"
ssh_run "docker network inspect qudo-net >/dev/null 2>&1 || docker network create qudo-net"

# 7) GHCR 로그인
echo "==> [7/9] GHCR 로그인"
ssh_run "echo '$GHCR_PAT' | docker login ghcr.io -u '$GHCR_USER' --password-stdin"

# 8) 인프라 기동
echo "==> [8/9] database + nginx-proxy-manager 기동"
ssh_run "cd $REMOTE_DIR && docker compose -f deploy/database/docker-compose.yml --env-file .env up -d"
ssh_run "cd $REMOTE_DIR && docker compose -f deploy/nginx-proxy-server/docker-compose.yaml up -d"

# DB healthy 대기 (최대 30초)
echo "    postgres healthy 대기..."
for i in {1..15}; do
  if ssh_run "docker inspect --format='{{.State.Health.Status}}' qudo-postgres 2>/dev/null" | grep -q healthy; then
    echo "    postgres healthy ✓"
    break
  fi
  sleep 2
done

# 9) API 기동
echo "==> [9/9] qudo-api 기동 (GHCR pull + 마이그레이션 자동 실행)"
ssh_run "cd $REMOTE_DIR && docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env pull"
ssh_run "cd $REMOTE_DIR && docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env up -d"

echo ""
echo "=========================================="
echo "  완료! 다음 단계:"
echo "   - 로그 확인:   npm run server:logs"
echo "   - NPM 관리 UI: http://$SSH_HOST:81"
echo "                  (기본 admin@example.com / changeme)"
echo "   - 이후 재배포: npm run server:deploy"
echo "=========================================="

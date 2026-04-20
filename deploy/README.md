# QUDO API 배포 가이드 (Ubuntu / Oracle Cloud ARM)

같은 호스트에 `nginx-proxy-manager` / `postgres` / `redis` / `qudo-api` 4개 컨테이너를
공유 docker network(`qudo-net`) 위에 올리는 구성입니다.
객체 스토리지는 **Cloudflare R2** 를 사용합니다 (외부 서비스).

## 디렉토리 구조
```
deploy/
├── database/              # postgres + redis
│   └── docker-compose.yml
├── qudo-api/              # API (GHCR에서 pull)
│   └── docker-compose.yml
├── nginx-proxy-server/    # nginx-proxy-manager
│   └── docker-compose.yaml
├── deploy.sh              # API 재배포용 편의 스크립트
└── README.md
```

---

## 0. 전제
- Ubuntu 22.04 이상
- **Oracle Cloud Ampere A1 (ARM / aarch64)** 인스턴스 기준 (1 OCPU / 6GB / 200GB)
- Docker + Docker Compose v2 설치
- 방화벽(Oracle Cloud Security List + `ufw`) 포트 오픈
  - 외부 오픈: `80` / `443` (NPM), `81` (NPM 관리 UI — 최초 세팅 후 닫아도 됨)
  - 내부 전용(외부 오픈 금지): `5433` (postgres), `6380` (redis)
  - `qudo-api`는 호스트 포트 바인딩 없음

## 네트워크 흐름
```
Client → Cloudflare(443) → Instance(80/443) → NPM container
                                                  └─ proxy_pass → qudo-api:8080   (같은 qudo-net)
                                                                        ├─ postgres:5432 / redis:6379  (내부)
                                                                        └─ Cloudflare R2  (외부 S3 호환)
```

## 배포 플로우
```
[로컬]                          [GitHub]                         [Oracle 인스턴스]
git push  ───────────────►  Actions 자동 빌드   ───push───►   GHCR
                             (linux/arm64)                       │
                                                                 │ docker pull
                                                                 ▼
                                                        qudo-api 컨테이너 교체
```

---

## 1. 최초 배포 (Ubuntu 인스턴스에서)

### 1-1. Swap 설정 (강력 권장)
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### 1-2. 코드 clone
> 서버에선 소스로 빌드하지 않고 docker-compose 파일만 쓰지만, 관리 편의상 전체 clone이 편합니다.
```bash
git clone <repo-url> qudo-api
cd qudo-api
```

### 1-3. 데이터 디렉토리 준비
```bash
mkdir -p deploy/database/data/postgres \
         deploy/database/data/redis \
         deploy/qudo-api/data/qudo-api

sudo chown -R 999:999 deploy/database/data/postgres
sudo chown -R 999:999 deploy/database/data/redis
sudo chown -R 1000:1000 deploy/qudo-api/data/qudo-api
```

### 1-4. `.env` 작성 (프로젝트 루트에)
```bash
cp .env.example .env
vi .env
# - DOCKER_IMAGE: GitHub 유저명을 본인 걸로 교체 (소문자)
#   예: ghcr.io/hyojae/qudo-api:latest
# - POSTGRES_PASSWORD, REDIS_PASSWORD
# - S3_ENDPOINT(R2 Account ID 포함), S3_ACCESS_KEY, S3_SECRET_KEY
# - JWT_ACCESS_SECRET, GEMINI_API_KEY, 각 OAuth 클라이언트 ID
```

### 1-5. 공유 네트워크 생성 (1회만)
```bash
docker network create qudo-net
```

### 1-6. GHCR 로그인 (1회만) — GitHub PAT 발급 필요
1. GitHub > Settings > Developer settings > **Personal access tokens (classic)** > Generate new token
2. Scope: `read:packages` 체크
3. 토큰 복사 후 서버에서:
```bash
echo '<your-pat>' | docker login ghcr.io -u '<your-github-username>' --password-stdin
```

### 1-7. 컨테이너 기동 (순서 무관)
```bash
# NPM
docker compose -f deploy/nginx-proxy-server/docker-compose.yaml up -d

# 인프라 (postgres + redis)
docker compose -f deploy/database/docker-compose.yml --env-file .env up -d

# API (GHCR에서 pull)
docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env up -d
```

### 1-8. 상태 확인
```bash
docker ps
docker logs -f qudo-api
# "migrations have been executed successfully" → "Nest application successfully started"
```

### 1-9. NPM 세팅 (브라우저)
1. `http://<instance-ip>:81` 접속 → 초기 계정(`admin@example.com` / `changeme`) 로그인 후 변경
2. **Proxy Hosts > Add Proxy Host**
   - Domain Names: `api.yourdomain.com`
   - Forward Hostname/IP: `qudo-api`
   - Forward Port: `8080`
   - `Block Common Exploits`, `Websockets Support` 체크
3. **SSL 탭**:
   - (추천) Cloudflare SSL/TLS > Origin Server 에서 **Origin Certificate** 발급(15년) →
     NPM SSL 탭에서 `Custom` 선택 후 cert/key 붙여넣기 → CF는 **Full (Strict)** 모드
   - (간단) CF Flexible 모드 → 오리진 HTTP만 받아도 됨

---

## 2. 최초 마이그레이션 생성 (로컬에서, 1회)

> Actions이 서버에 올리는 이미지에는 엔티티는 있지만 마이그레이션 파일은 아직 없음. 빈 DB에 대고 diff 떠서 생성해야 함.

```bash
# 로컬 dev DB (postgres 컨테이너 아무거나) 띄운 상태에서
npm install
npm run migration:generate -- src/migrations/InitialSchema
git add src/migrations && git commit -m "chore: add initial schema migration"
git push
# → Actions이 마이그레이션 포함된 새 이미지 빌드/push
# → 서버에서 deploy.sh 로 pull/restart
```

---

## 3. 이후 배포 (일상적인 사이클)

### 3-1. 엔티티 바꿨으면
```bash
# 로컬에서
npm run migration:generate -- src/migrations/AddSomething
git add src/migrations && git commit -m "..."
```

### 3-2. 코드 푸시
```bash
git push origin main
# → GitHub Actions이 arm64 이미지 빌드해서 GHCR에 push (3~5분)
```

### 3-3. 서버에서 재배포 (한 줄)
```bash
cd ~/qudo-api
./deploy/deploy.sh
```
또는 수동으로:
```bash
docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env pull
docker compose -f deploy/qudo-api/docker-compose.yml --env-file .env up -d
docker logs -f qudo-api
# 컨테이너 시작 시 migration:run:prod 자동 실행 → 미적용 마이그레이션만 적용
```

---

## 4. 백업 / 복구

### Postgres 백업
```bash
docker exec qudo-postgres pg_dump -U qudo qudo > backup_$(date +%F).sql
```

### Postgres 복구
```bash
cat backup.sql | docker exec -i qudo-postgres psql -U qudo -d qudo
```

### 데이터 디렉토리 전체 백업
`deploy/database/data/` + `deploy/qudo-api/data/` + `deploy/nginx-proxy-server/data/` 를 tar로 묶어 외부 스토리지에.
(R2 버킷 데이터는 Cloudflare 쪽에서 별도 관리)

---

## 5. 자주 보는 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| `qudo-net` not found | 1-5 의 `docker network create qudo-net` 누락 | 수행 후 재기동 |
| `docker pull` denied | GHCR 로그인 안 됨 / PAT 만료 | 1-6 재수행 |
| `image not found` | 이미지가 private이고 로그인 안 함 / 이름 오타 | `.env`의 `DOCKER_IMAGE` 경로 확인, 소문자인지 확인 |
| `qudo-api` 즉시 죽음 (`ECONNREFUSED`) | DB/Redis 컨테이너 아직 안 뜸 | 1-7의 database 먼저 기동 또는 healthy 대기 |
| 마이그레이션 실패 (`relation already exists`) | 이전 synchronize로 만든 테이블 충돌 | `deploy/database/data/postgres` 비우고 재기동 |
| NPM에서 qudo-api 접근 불가 | NPM이 `qudo-net`에 없음 | `docker network inspect qudo-net` 확인 |
| 502 Bad Gateway | Forward Hostname/Port 오기입 | NPM: `qudo-api` / `8080` |

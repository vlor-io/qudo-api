# Qudo API

크리에이터용 촬영 보조 서비스 **Qudo** 의 백엔드 API.
가이드 촬영 → AI 자동 분류 → PC Web Drop 워크플로우를 지원합니다. 도메인 상세는 [docs/prd/overview.md](docs/prd/overview.md).

## 스택

- **NestJS 11** + **TypeORM 0.3** + **PostgreSQL 17**
- **Node.js 22** (Docker arm64 — Oracle Cloud Ampere 운영)
- **Redis 8** (인프라만 구성, 캐시/세션 미사용)
- **Cloudflare R2** (S3 호환, 사진 스토리지)
- **Gemini 2.5 Flash** (촬영물 AI 검증·캠페인 가이드 파싱)
- **OAuth2** — Kakao / Naver / Google (id_token JWKS + access_token hybrid)

## 빠른 시작

### 1. 의존성

```bash
npm install
```

### 2. 환경 변수

루트에 `.env` 작성. 필수 키만 추리면:

```ini
NODE_ENV=development
PORT=8080

# DB / Redis (운영 SSH 터널 경유 시 .env.develop 가 자동 덮어씀)
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5433
POSTGRES_DB=qudo
POSTGRES_USER=qudo
POSTGRES_PASSWORD=...
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
REDIS_PASSWORD=...

# JWT
JWT_ACCESS_SECRET=<강력한 랜덤 문자열>
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=2592000

# OAuth — id_token JWKS 검증 (Kakao/Google 필수)
KAKAO_CLIENT_ID=<REST API 키>          # Kakao OIDC 활성화 후 발급
KAKAO_ADMIN_KEY=<Admin 키>              # 회원탈퇴 시 unlink 호출
GOOGLE_CLIENT_IDS=<id1>,<id2>,...      # 콤마 구분 화이트리스트

# Cloudflare R2
S3_ENDPOINT=https://<acct>.r2.cloudflarestorage.com
S3_BUCKET=qudo-assets
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_DOMAIN=https://cdn.qudo.app

# Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

전체 키 목록은 [.env.example](.env.example) 참조.

### 3. 실행

```bash
# 로컬 개발 (SSH 터널 자동 + watch) — .deploy.env 필요
npm run dev

# SSH 없이 watch 만 (DB 직접 띄워야 함)
npm run start:dev

# 빌드 + 프로덕션 실행
npm run build
npm run start:prod
```

서버 기동 후:
- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/docs`

## 자주 쓰는 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 운영 DB 로 SSH 터널 + watch (`.deploy.env` 필요) |
| `npm run start:dev` | 로컬 DB 로 watch |
| `npm run build` | TypeScript 빌드 |
| `npm run lint` | ESLint 자동 수정 |
| `npx jest src/path/to/file.spec.ts` | 단일 테스트 |
| `bash scripts/migration-new.sh <Name>` | 엔티티 diff 자동 마이그레이션 생성 |
| `npm run migration:run` | 마이그레이션 적용 |
| `npm run migration:revert` | 직전 마이그레이션 롤백 |
| `npm run server:deploy` | GHCR pull + 운영 컨테이너 재기동 |
| `npm run server:logs` | 운영 qudo-api 로그 stream |

## 인증 흐름 (OAuth2 전용)

이 API 는 **OAuth2 소셜 로그인 전용** (이메일+비번 가입 미지원). 한 사용자가 여러 provider 동시 연결 가능.

```
[모바일 SDK]  →  로그인 후 idToken/accessToken 획득
     ↓
POST /v1/auth/social  { provider, idToken? | accessToken?, displayNameHint? }
     ↓
[백엔드 verifier]
  • Kakao  → jose JWKS 로 id_token 서명·aud·iss 검증 (외부 호출 0)
  • Google → jose JWKS 로 id_token 검증 (외부 호출 0)
  • Naver  → openapi.naver.com/v1/nid/me 호출 (OIDC 미지원)
     ↓
{ accessToken, refreshToken, user, isNewUser }
```

엔드포인트:
- `POST /v1/auth/social` — 로그인/가입 (provider 별 토큰 자동 검증)
- `POST /v1/auth/social/link` — 다른 provider 추가 연결 (JWT)
- `DELETE /v1/auth/social/:provider` — 특정 provider 해제 (마지막 1개는 거부)
- `GET /v1/auth/social/providers` — 연결된 provider 목록
- `POST /v1/auth/refresh` / `POST /v1/auth/logout`

## 도메인 모듈

| 모듈 | 역할 | 주요 path |
|---|---|---|
| auth | OAuth2 인증·JWT | `/v1/auth/*` |
| users | 프로필·통계·채널·아바타 | `/v1/users/me*` |
| workspaces | 촬영 워크스페이스·공유링크·캠페인 파싱 | `/v1/workspaces/*` |
| todos | 워크스페이스 내 투두 | `/v1/todos/*` |
| campaigns | 광고주 캠페인 등록·탐색 | `/v1/campaigns/*` |
| applications | 캠페인 신청·선정 | `/v1/applications/*` |
| shots | 촬영물 업로드·조회·ZIP 다운로드 | `/v1/shots/*` |
| uploads | R2 presigned URL 발급 | `/v1/uploads/*` |
| ai | Gemini 검증·캠페인 파싱 | (내부 사용) |
| badges, notifications, subscriptions | 부가 시스템 | 각 `/v1/*` |

전체 엔드포인트는 Swagger `/docs` 또는 [docs/qudo-api.postman_collection.json](docs/qudo-api.postman_collection.json) 참조.

## 회원탈퇴 정책

`DELETE /v1/users/me` 는 **즉시 영구 삭제** (복구 불가):
1. 연결된 모든 provider 에 best-effort revoke 시도 (Kakao 만 실제 unlink, Naver/Google 은 token 미보관으로 skip)
2. `users` 행 삭제 → DB CASCADE 가 모든 child (oauth_identities/workspaces/channels/notifications/shots/campaigns/applications/subscriptions/user_badges) 함께 삭제
3. 같은 OAuth 로 재로그인 = 신규 가입 처리

## 배포

`main` 브랜치 push → GitHub Actions 가 arm64 Docker 이미지 빌드 → GHCR push → 운영 서버에서 `npm run server:deploy` 로 pull + restart. 컨테이너 entrypoint 가 `migration:run:prod` 자동 실행.

상세 흐름·DB 스키마 변경 경로·환경 파일 우선순위 등은 [CLAUDE.md](CLAUDE.md) 참조.

## 문서

- **[docs/prd/overview.md](docs/prd/overview.md)** — 서비스 개요·기능
- **[docs/prd/detailed_requirements.md](docs/prd/detailed_requirements.md)** — 상세 요구사항
- **[docs/qudo-api.postman_collection.json](docs/qudo-api.postman_collection.json)** — Postman 컬렉션 (모든 엔드포인트)
- **[CLAUDE.md](CLAUDE.md)** — 개발 시 알아둬야 할 아키텍처·관례
- **Swagger UI** — `http://localhost:8080/docs`

## 라이선스

UNLICENSED — 사내 프로젝트

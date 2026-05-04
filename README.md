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

## OAuth Provider 셋업 가이드

**용어 매핑** — 환경변수명은 OAuth 2.0 표준 (`client_id`) 을 따르지만, **각 provider 콘솔에서는 자체 용어를 씀**:

| Provider | 콘솔에서 가져올 값 | 콘솔 표기 | .env 변수명 |
|---|---|---|---|
| Kakao | OAuth client_id | **"REST API 키"** | `KAKAO_CLIENT_ID` |
| Kakao | 운영자 권한 키 | **"Admin 키"** | `KAKAO_ADMIN_KEY` |
| Google | OAuth client_id (앱별 다중) | "OAuth 2.0 Client ID" | `GOOGLE_CLIENT_IDS` (콤마) |
| Naver | (백엔드 미사용 — 모바일 SDK 만 씀) | "Client ID / Secret" | (없음) |

→ 카카오 콘솔에서 "REST API 키" 라고 적힌 값을 `KAKAO_CLIENT_ID` 에 넣으면 됩니다. 같은 값이고 명칭만 다릅니다.

### Kakao

1. **콘솔 사전 작업**:
   - [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 카카오 로그인 → **OpenID Connect 활성화 ON**
   - 동의항목: `nickname`, `profile_image`, `account_email` (선택)
2. **키 가져오기**: 앱 키 페이지에서
   - **REST API 키** → `.env` 의 `KAKAO_CLIENT_ID`
   - **Admin 키** → `.env` 의 `KAKAO_ADMIN_KEY` (회원탈뼈 시 unlink 호출용. 미설정 시 unlink 만 skip)
3. **모바일 SDK 호출 시**:
   - `scopes:['openid','profile_nickname','profile_image','account_email']` 필수 (id_token 발급에 `openid` scope 필수)
   - 받은 **id_token** 을 백엔드로 전달: `{provider:'kakao', idToken:'<id_token>'}`
4. **백엔드 검증**: `https://kauth.kakao.com/.well-known/jwks.json` 에서 공개키 캐시, 로컬에서 서명·`aud`(=KAKAO_CLIENT_ID)·`iss`(=`https://kauth.kakao.com`) 검증. **외부 호출 0회.**

### Google

1. **콘솔 사전 작업**:
   - [Google Cloud Console](https://console.cloud.google.com) → API 및 서비스 → OAuth 동의 화면 구성
   - **각 플랫폼별로 별도 OAuth Client ID 생성**: iOS (번들 ID), Android (패키지명 + SHA-1), 웹 (Origin)
2. **키 가져오기**: 각 client_id (`xxx.apps.googleusercontent.com`) 들을 콤마 구분해 한 줄로:
   ```ini
   GOOGLE_CLIENT_IDS=123-ios.apps.googleusercontent.com,456-android.apps.googleusercontent.com
   ```
3. **모바일 SDK 호출 시**: 받은 **id_token** 을 백엔드로 전달: `{provider:'google', idToken:'<id_token>'}`
4. **백엔드 검증**: `https://www.googleapis.com/oauth2/v3/certs` 의 JWKS 로 서명·`aud`(=`GOOGLE_CLIENT_IDS` 화이트리스트)·`iss`(=`https://accounts.google.com`) 검증. **외부 호출 0회.**

### Naver

1. **콘솔 사전 작업**:
   - [Naver Developers](https://developers.naver.com) → Application 등록
   - 사용 API: 네이버 로그인. 이메일/이름 같은 민감 정보는 **검수 신청 필요**
2. **키 가져오기**: `Client ID` / `Client Secret` 은 **모바일 SDK 빌드에서만 사용**. 백엔드 .env 에는 넣지 않음.
3. **모바일 SDK 호출 시**: 받은 **access_token** 을 백엔드로 전달: `{provider:'naver', accessToken:'<access_token>'}`
   - Naver 는 OIDC 표준 미지원 (id_token 발급 안 함). access_token 방식 유지.
4. **백엔드 검증**: `https://openapi.naver.com/v1/nid/me` 를 `Bearer` 헤더로 호출해 사용자 정보 받음.

### 회원탈뼈 시 provider 측 정리

`DELETE /v1/users/me` 호출 시:
- **Kakao**: `KAKAO_ADMIN_KEY` 가 설정되어 있으면 `kapi/v1/user/unlink` 호출로 카카오 측 연결 해제. 미설정이면 skip + 로그.
- **Google / Naver**: access_token 을 영구 보관하지 않으므로 revoke 호출 자체가 불가 → skip + 로그. 사용자가 각 provider 설정에서 수동 해제 가능.

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

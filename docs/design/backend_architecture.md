# QUDO — Backend Architecture (NestJS)

> **문서 버전**: v1.0 | **작성일**: 2026-04-13
> **런타임**: Node.js 20+ / NestJS 11 / TypeScript 6
> **DB**: PostgreSQL 16 / TypeORM(또는 Prisma)
> **참고**: API 엔드포인트 상세는 [backend_api_spec.md](../prd/backend_api_spec.md), 데이터 모델은 [erd.md](./erd.md)

---

## 1. 아키텍처 원칙

- **계층 분리**: Controller(HTTP) → Service(비즈니스) → Repository(영속) → Entity(도메인)
- **DTO 우선**: 모든 요청/응답은 `class-validator` 기반 DTO. Swagger 스키마 자동 생성.
- **예외 표준화**: 전역 `HttpExceptionFilter`로 envelope 응답 (`{ success, error: { code, message } }`) 통일.
- **인증 기본 ON**: 전역 `JwtAuthGuard` + `@Public()` 데코레이터로 예외 처리.
- **역할 가드**: `@Roles('advertiser')` 데코레이터 + `RolesGuard`.
- **비동기 작업**: Redis + BullMQ 큐 (Gemini 호출, 배지 체크, 드롭 만료 정리).

---

## 2. 모듈 구조

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── decorators/         # @Public, @Roles, @CurrentUser
│   ├── filters/            # HttpExceptionFilter
│   ├── guards/             # JwtAuthGuard, RolesGuard
│   ├── interceptors/       # ResponseEnvelopeInterceptor, LoggingInterceptor
│   ├── pipes/              # ValidationPipe 설정
│   └── dto/                # PaginationQueryDto, EnvelopeResponseDto
├── config/
│   ├── configuration.ts    # 환경변수 스키마
│   ├── database.config.ts
│   └── s3.config.ts
├── database/
│   ├── database.module.ts
│   └── migrations/
├── modules/
│   ├── auth/               # 소셜 로그인, JWT 발급/갱신
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/     # JwtStrategy, KakaoStrategy, NaverStrategy, ...
│   │   └── dto/
│   ├── users/              # 프로필, 채널, 역할 전환, 아바타
│   ├── workspaces/         # 워크스페이스 CRUD, 진행률 계산
│   ├── todos/              # 투두 CRUD, 이미지 부착, 순서 변경
│   ├── shots/              # 촬영 결과물, 소프트 삭제
│   ├── campaigns/          # 캠페인 탐색/등록
│   ├── applications/       # 신청/취소/당선
│   ├── share-links/        # Web Drop
│   ├── signature-shots/    # 시그니처 구도
│   ├── badges/             # 배지 조건/획득
│   ├── subscriptions/      # Pro 플랜 (Stripe)
│   ├── ai/                 # Gemini 연동 (parse-campaign, match-todo)
│   ├── uploads/            # S3 presign/confirm
│   └── health/             # /health
└── queue/
    ├── queue.module.ts     # BullMQ
    └── processors/         # ai.processor, badge.processor, drop-cleanup.processor
```

각 모듈은 `*.module.ts` / `*.controller.ts` / `*.service.ts` / `*.repository.ts` / `dto/` / `entities/` 패턴 통일.

---

## 3. 공통 인프라

### 3.1 응답 envelope

```typescript
// common/interceptors/response-envelope.interceptor.ts
return next.handle().pipe(
  map((data) => ({ success: true, data })),
);
```

페이지네이션은 Service에서 `{ items, pagination }` 반환 → Interceptor가 자동으로 풀어줌.

### 3.2 예외 필터

```typescript
// common/filters/http-exception.filter.ts
catch(exception: HttpException, host: ArgumentsHost) {
  // → { success: false, error: { code, message } }
}
```

도메인 예외는 커스텀 클래스(`CampaignNotFoundException`, `AlreadyAppliedException` 등)로 선언, 필터에서 `error.code` 매핑.

### 3.3 Validation

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### 3.4 Swagger

[src/main.ts](../../src/main.ts) 구성 완료. DTO에 `@ApiProperty` 없어도 CLI 플러그인(`@nestjs/swagger`)이 TS 타입에서 스키마 자동 생성.

---

## 4. 인증 플로우

```
클라이언트 (OAuth SDK)
  ↓ accessToken (provider)
POST /auth/social
  ↓
AuthService.socialLogin(provider, accessToken)
  1. provider 검증 (카카오/네이버/구글/애플 REST 호출)
  2. providerUserId로 users 조회 → 없으면 신규 생성
  3. JWT(access, 1h) + Refresh(opaque, 30d) 발급
  4. social_accounts 저장/갱신
  ↓
{ accessToken, refreshToken, user, isNewUser }
```

- **JwtStrategy**: `Authorization: Bearer` 헤더에서 JWT 검증 → `req.user = { id, role, plan }`
- **Refresh Token**: DB에 해시 저장 (rotation), `POST /auth/refresh`로 교체
- **Logout**: refresh token 무효화 (DB 삭제)

---

## 5. 파일 업로드 전략

**권장: Presigned URL 직접 업로드**

```
1. POST /uploads/presign
   ↓ { uploadUrl, publicUri, shotId(pre-issued) }
2. 클라이언트 → S3 PUT uploadUrl
3. POST /uploads/confirm { publicUri, todoId, shotId }
   ↓ shots insert + todo.status=COMPLETED + workspace.progress 재계산
```

- S3 키: `shots/{workspaceId}/{todoId}/{shotId}.{ext}`
- 버킷 정책: PutObject만 presign으로 허용, 공개 읽기는 CloudFront OAC
- 라이프사이클: `deleted_at IS NOT NULL` + 30일 경과 → 배치로 S3 object 삭제

**대안**: `multipart/form-data` → 서버가 중계 (작은 이미지/아바타용)

---

## 6. AI 파이프라인

### 6.1 Shot Verification

```
POST /ai/match-todo { base64, todoLabels }
  ↓
AiService.matchTodo()
  → BullMQ queue (rate-limited worker)
    → Gemini 2.5 Flash 호출
    → 429 응답 시 Retry-After 기반 지수 백오프
  → shots.ai_verification JSONB 업데이트
  ↓
{ matchedTodoLabel, confidence, feedback }
```

동기 응답이 필요한 경로(카메라 UX)는 **서버 sync 호출**, 배치성은 큐로.

### 6.2 Campaign Guide Parsing

- `POST /ai/parse-campaign { text }` → Gemini 프롬프트로 `{ tasks, deadlines, legal_notices }` 추출
- 워크스페이스 생성 시 `todos` 일괄 생성에 활용

### 6.3 Rate Limit 대응

- BullMQ `limiter: { max: 10, duration: 1000 }`
- 실패 시 `attempts: 5` + `backoff: { type: 'exponential', delay: 1000 }`

---

## 7. 배경 작업 (Cron/Queue)

| 작업 | 트리거 | 구현 |
|---|---|---|
| 만료된 Share Link 정리 | 매 시간 | Cron + service |
| 캠페인 마감 자동 전환 (`recruiting → closed`) | 매 일 00:00 | Cron |
| Badge 조건 평가 | Shot/Workspace 이벤트 | Queue event handler |
| S3 객체 하드 삭제 (soft deleted 30일 후) | 매 일 | Cron |

`@nestjs/schedule` + BullMQ processor 조합.

---

## 8. 환경변수

```env
# App
NODE_ENV=development
PORT=8080

# DB
DATABASE_URL=postgres://qudo:pass@localhost:5432/qudo

# JWT
JWT_ACCESS_SECRET=...
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=2592000

# OAuth
KAKAO_CLIENT_ID=...
NAVER_CLIENT_ID=...
GOOGLE_CLIENT_ID=...
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...

# AWS
AWS_REGION=ap-northeast-2
S3_BUCKET=qudo-assets
CLOUDFRONT_DOMAIN=cdn.qudo.app

# Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379
```

`@nestjs/config` + Joi 검증.

---

## 9. 의존성 체크리스트

### 런타임
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` (설치 완료)
- `@nestjs/swagger` (설치 완료)
- `@nestjs/config`, `joi`
- `@nestjs/typeorm`, `typeorm`, `pg`
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
- `class-validator`, `class-transformer`
- `@nestjs/bullmq`, `bullmq`, `ioredis`
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- `@google/generative-ai` (Gemini)
- `bcrypt` (Drop 비밀번호)
- `@nestjs/schedule`

### 개발
- `@types/node`, `@types/bcrypt`
- `jest`, `supertest` (설치 완료)

---

## 10. 엔드포인트 매핑 (요약)

상세는 [backend_api_spec.md](../prd/backend_api_spec.md) 참조.

| 모듈 | 대표 엔드포인트 |
|---|---|
| `auth` | `POST /auth/social`, `POST /auth/refresh`, `POST /auth/logout` |
| `users` | `GET/PATCH /users/me`, `POST /users/me/avatar`, `PUT/DELETE /users/me/social-accounts/:platform`, `PATCH /users/me/role` |
| `workspaces` | `GET/POST /workspaces`, `GET/PATCH/DELETE /workspaces/:id` |
| `todos` | `GET/POST /workspaces/:id/todos`, `PATCH/DELETE /todos/:id`, `PATCH /workspaces/:id/todos/reorder` |
| `shots` | `POST /todos/:id/images`, `DELETE /todos/:id/images/:idx` |
| `campaigns` | `GET /campaigns`, `GET /campaigns/:id`, `POST /campaigns`, `GET /campaigns/mine` |
| `applications` | `POST /campaigns/:id/apply`, `GET /applications/mine`, `DELETE /applications/:id` |
| `applicants` | `GET /campaigns/:id/applicants`, `PATCH /campaigns/:id/applicants/:aid`, `POST /campaigns/:id/announce` |
| `share-links` | `POST /workspaces/:id/drop`, `GET /drop/:token`, `PATCH /workspaces/:id/drop/:token` |
| `uploads` | `POST /uploads/presign`, `POST /uploads/confirm` |
| `ai` | `POST /ai/parse-campaign`, `POST /ai/match-todo` |

---

## 11. 우선순위 로드맵

1. **P0 — 기반 (1주)**: config/db/swagger, auth(social+jwt), users 기본
2. **P0 — 촬영 루프 (2주)**: workspaces, todos, shots, uploads(S3 presign)
3. **P1 — 공유 (1주)**: share-links (Web Drop + 비밀번호 + 만료)
4. **P1 — 캠페인 (2주)**: campaigns, applications, applicants, announce 플로우
5. **P2 — AI (1주)**: ai(parse-campaign, match-todo) + BullMQ 큐
6. **P2 — 부가 (1주)**: badges, signature-shots, subscriptions(Pro 뼈대)
7. **P3 — 운영**: 크론, 정리 배치, 모니터링

---

## 12. 오픈 이슈

- **ORM 결정**: TypeORM(전통적, NestJS 친화) vs Prisma(스키마-퍼스트, DX 우수) — 팀 선호 확인 필요
- **파일 응답 규격**: multipart 직접 업로드 유지 여부 vs Presign 전면 전환
- **Apple 로그인 iOS 전용** 정책 반영 필요
- **결제(Stripe) 도입 시점**: Pro 플랜 런칭 로드맵
- **푸시 알림**: FCM/APNs 도입 여부 (당선 알림 UX)

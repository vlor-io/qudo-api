## CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

QUDO 백엔드 API. 크리에이터용 촬영 보조 서비스 (가이드 촬영 → AI 분류 → PC Web Drop) 의 서버 측. 자세한 도메인 맥락은 [docs/prd/overview.md](docs/prd/overview.md) 참조.

스택: NestJS 11 + TypeORM 0.3 + PostgreSQL 17 + Redis 8 (캐시/세션 — 현재 인프라만 구성), Node.js 22.

## 자주 쓰는 커맨드

```bash
# 로컬 개발 — SSH 터널(.deploy.env 필요) 자동 + start:dev
npm run dev

# SSH 없이 그냥 NestJS watch (DB 직접 띄워야 함)
npm run start:dev

# 빌드 / 프로덕션 실행 (dist/)
npm run build
npm run start:prod

# 단일 테스트 파일
npx jest src/path/to/file.spec.ts
# 패턴 매칭
npx jest -t "should create user"

# 린트 (자동 수정 포함)
npm run lint

# 마이그레이션 — 엔티티 변경 후 자동 diff 생성 (로컬 postgres 컨테이너 띄움)
bash scripts/migration-new.sh AddUserPhone
npm run migration:run        # 로컬 적용
npm run migration:revert     # 롤백

# 운영 서버 조작 (.deploy.env 의 SSH_HOST/USER/KEY 사용)
npm run server:setup           # 초기 1회 설치
npm run server:deploy          # GHCR pull + restart + 로그 stream
npm run server:logs            # qudo-api 로그
npm run server:logs:postgres   # qudo-postgres 로그
```

Swagger UI: 서버 기동 후 `http://localhost:8080/docs`.

## 환경 파일 우선순위

[src/app.module.ts:25](src/app.module.ts#L25) 의 `envFilePath: ['.env.develop', '.env']` — `.env.develop` 가 우선, 없는 키만 `.env` 에서 상속. `.env.develop` 는 `NODE_ENV=development` + DB/Redis 호스트를 `127.0.0.1:5433/6380` 으로 덮어써서 SSH 터널 경유로 운영 DB 에 접속하도록 되어 있음.

`npm run dev` 는 [scripts/dev.js](scripts/dev.js) 가 `.deploy.env` 의 SSH 정보로 터널을 먼저 열고 NestJS 를 띄움. SIGINT 시 둘 다 종료.

## 아키텍처 — 알아두면 좋은 것

### 모듈 구조 패턴
도메인별 모듈 (users, auth, workspaces, todos, campaigns, applications, shots, badges, notifications, subscriptions, uploads, ai) 은 모두 `<name>/` 아래에 `entities/`, `dto/`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.module.ts` 동일 구조. 새 도메인 추가 시 이 패턴 그대로.

`AppModule` 의 `autoLoadEntities: true` ([src/app.module.ts:40](src/app.module.ts#L40)) 가 각 모듈의 `TypeOrmModule.forFeature([...])` 등록분을 자동 수집하므로, 엔티티는 모듈에 forFeature 로 등록만 하면 됨.

경로 alias: `@/*` → `./src/*` ([tsconfig.json:20](tsconfig.json#L20)).

### DB 스키마 변경 경로 — **두 가지 모드 공존**
[src/app.module.ts:45-47](src/app.module.ts#L45-L47) 의 `synchronize` 가 `DB_SYNCHRONIZE=true` 또는 `NODE_ENV !== 'production'` 일 때 켜져 있음.

- **로컬/개발**: 엔티티 수정 → 서버 재시작이면 끝 (synchronize 가 자동 반영)
- **운영**: [Dockerfile:27](Dockerfile#L27) 가 컨테이너 시작 시 `migration:run:prod` 를 먼저 돌림. 따라서 운영에 반영하려면 [scripts/migration-new.sh](scripts/migration-new.sh) 로 마이그레이션 파일을 생성·커밋해야 함. ([src/migrations/](src/migrations/) 는 현재 비어있음 — `.env.example:24` 주석 참고)

### 인증 — JWT, controller-level guard
글로벌 가드가 아니라 **컨트롤러마다 `@UseGuards(JwtAuthGuard)` 를 붙임**. [@Public()](src/auth/decorators/public.decorator.ts) 데코레이터로 메서드 단위 opt-out 가능 ([JwtAuthGuard](src/auth/guards/jwt-auth.guard.ts) 가 `IS_PUBLIC_KEY` 메타를 reflect). 새 컨트롤러 추가 시 가드 누락 주의.

JwtStrategy 가 `request.user` 에 페이로드를 박아둠. 토큰 만료/누락/형식 오류는 모두 [JwtAuthGuard.handleRequest](src/auth/guards/jwt-auth.guard.ts) 에서 `{ code: 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'MISSING_TOKEN', message }` 형태의 `UnauthorizedException` 으로 정규화됨.

### 에러 응답 포맷 — 강제 통일
[GlobalExceptionFilter](src/common/filters/global-exception.filter.ts) 가 모든 응답을 다음 형태로 직렬화:
```json
{ "success": false, "error": { "code": "...", "message": "...", "details": null }, "timestamp": "...", "path": "..." }
```
서비스/컨트롤러에서 `throw new BadRequestException({ code: 'CUSTOM_CODE', message: '...' })` 처럼 `{code, message}` 객체로 던지면 그대로 전파됨. 단순 문자열로 던지면 status 기반으로 code 자동 매핑.

Swagger 응답 예시는 [api-standard-errors.decorator.ts](src/common/decorators/api-standard-errors.decorator.ts) 데코레이터로 표준화. `ErrorResponseDto` 는 [main.ts:48](src/main.ts#L48) 의 `extraModels` 에 등록되어 있어야 `$ref` 가 동작함.

### 전역 ValidationPipe
[main.ts:18-22](src/main.ts#L18-L22) 에서 `whitelist + forbidNonWhitelisted + transform` 활성. 즉 DTO 에 정의되지 않은 필드는 거부됨. DTO 작성 시 `class-validator` + `class-transformer` 데코레이터 빠뜨리지 말 것.

### Swagger 인증 이름
`addBearerAuth(..., 'bearer')` ([main.ts:35-44](src/main.ts#L35-L44)) — 컨트롤러의 `@ApiBearerAuth('bearer')` 와 정확히 이 문자열이 매칭되어야 자물쇠 아이콘이 작동.

## 배포 흐름

`main` 푸시 → [.github/workflows/docker-build.yml](.github/workflows/docker-build.yml) 이 **arm64** 이미지를 빌드해 GHCR 에 push (Oracle Cloud Ampere 서버 대상). 서버에서 `npm run server:deploy` 가 SSH 로 들어가 pull + restart. 컨테이너 entrypoint 가 마이그레이션 자동 적용 후 NestJS 기동.

`docs/`, `deploy/`, `*.md`, `.env.example` 변경은 빌드 트리거 제외.

## TypeScript 설정 주의점

[tsconfig.json](tsconfig.json) 에서 `strictNullChecks: false`, `noImplicitAny: false`. 즉 strict 모드가 아님 — `null`/`undefined` 가능성을 컴파일러가 안 잡아주니 직접 신경써야 함.

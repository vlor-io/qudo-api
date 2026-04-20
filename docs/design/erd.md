# QUDO — ERD (Entity Relationship Diagram)

> **문서 버전**: v1.0 | **작성일**: 2026-04-13
> **DBMS**: PostgreSQL 16+
> **ORM**: TypeORM (또는 Prisma)
> **기준**: `docs/prd/*.md` 및 `docs/prd/backend_api_spec.md`

---

## 1. 전체 관계도

```mermaid
erDiagram
    USER ||--o{ SOCIAL_ACCOUNT : "has"
    USER ||--o{ CHANNEL : "registers"
    USER ||--o{ WORKSPACE : "owns"
    USER ||--o{ CAMPAIGN : "creates (advertiser)"
    USER ||--o{ APPLICATION : "submits (creator)"
    USER ||--o{ USER_BADGE : "earns"
    USER ||--o| SUBSCRIPTION : "subscribes"

    WORKSPACE ||--o{ TODO : "contains"
    WORKSPACE ||--o{ SIGNATURE_SHOT : "has"
    WORKSPACE ||--o{ SHARE_LINK : "exposes"
    WORKSPACE }o--|| CAMPAIGN : "(optional) links to"

    TODO ||--o{ SHOT : "holds"
    SHOT }o--|| WORKSPACE : "denormalized ref"

    CAMPAIGN ||--o{ APPLICATION : "receives"
    APPLICATION |o--|| WORKSPACE : "auto-created on select"

    SHARE_LINK }o--|| USER : "created by"

    USER {
        uuid id PK
        varchar display_name
        varchar email UK
        varchar avatar_uri
        text bio
        enum plan "free|pro"
        enum role "creator|advertiser"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    SOCIAL_ACCOUNT {
        uuid id PK
        uuid user_id FK
        enum provider "kakao|naver|google|apple"
        varchar provider_user_id
        varchar access_token
        varchar refresh_token
        timestamptz expires_at
        timestamptz created_at
    }

    CHANNEL {
        uuid id PK
        uuid user_id FK
        enum platform "instagram|youtube|tiktok|blog"
        varchar handle
        integer followers
        boolean connected
        timestamptz created_at
        timestamptz updated_at
    }

    WORKSPACE {
        uuid id PK
        uuid user_id FK
        uuid campaign_id FK "nullable"
        varchar title
        varchar location
        enum category "FOOD|PRODUCT|DETAIL_PAGE|TRAVEL"
        enum status "active|completed|archived"
        smallint progress "0-100"
        text campaign_guide
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    TODO {
        uuid id PK
        uuid workspace_id FK
        varchar label
        enum status "PENDING|COMPLETED"
        integer order_index
        timestamptz created_at
        timestamptz updated_at
    }

    SHOT {
        uuid id PK
        uuid todo_id FK
        uuid workspace_id FK
        varchar image_uri
        integer width
        integer height
        jsonb ai_verification
        timestamptz uploaded_at
        timestamptz deleted_at
    }

    CAMPAIGN {
        uuid id PK
        uuid advertiser_id FK
        varchar title
        varchar brand
        enum type "delivery|visit"
        enum category "FOOD|PRODUCT|BEAUTY|TRAVEL|LIFESTYLE|DETAIL_PAGE"
        varchar location
        date deadline
        integer slots
        integer applicants_count
        text reward
        varchar thumbnail_uri
        varchar thumbnail_color
        enum status "recruiting|closed|announced"
        jsonb requirements
        jsonb todo_preset
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    APPLICATION {
        uuid id PK
        uuid campaign_id FK
        uuid user_id FK
        uuid workspace_id FK "nullable"
        enum status "applied|selected|rejected"
        text note
        timestamptz applied_at
        timestamptz selected_at
        timestamptz created_at
        timestamptz updated_at
    }

    SHARE_LINK {
        uuid id PK
        uuid workspace_id FK
        uuid created_by FK
        varchar token UK
        varchar password_hash
        timestamptz expires_at
        integer access_count
        timestamptz last_accessed_at
        timestamptz created_at
        timestamptz deleted_at
    }

    SIGNATURE_SHOT {
        uuid id PK
        uuid workspace_id FK
        varchar image_uri
        real opacity
        varchar label
        timestamptz created_at
        timestamptz deleted_at
    }

    USER_BADGE {
        uuid user_id FK
        enum badge_type
        timestamptz earned_at
        timestamptz created_at
    }

    SUBSCRIPTION {
        uuid id PK
        uuid user_id FK UK
        enum plan_type "free|pro"
        varchar stripe_customer_id
        timestamptz renews_at
        timestamptz cancelled_at
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 2. 테이블별 상세

### 2.1 `users`

핵심 사용자 테이블. 역할(`role`)은 마이페이지에서 전환 가능 (creator ↔ advertiser).

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | uuid | PK | `uuid_generate_v7()` 권장 |
| `display_name` | varchar(20) | NOT NULL | |
| `email` | varchar(255) | UNIQUE, NOT NULL | |
| `avatar_uri` | varchar(512) | NULL | S3 URL |
| `bio` | varchar(100) | NULL | |
| `plan` | enum | NOT NULL, default `'free'` | |
| `role` | enum | NOT NULL, default `'creator'` | |
| `deleted_at` | timestamptz | NULL | 소프트 삭제 |

**인덱스**: `email`(UK), `deleted_at`, `(role, deleted_at)`

---

### 2.2 `social_accounts`

OAuth 제공자별 자격증명. 한 사용자당 제공자별 1개.

**제약**: `UNIQUE(user_id, provider)`, `UNIQUE(provider, provider_user_id)`
**보안**: `access_token` / `refresh_token`은 KMS 또는 pgcrypto로 암호화 저장.

---

### 2.3 `channels`

소셜 미디어 채널 (Instagram/YouTube/TikTok/Blog). `social_accounts`와 분리해서 OAuth와 채널 정보를 개념적으로 나눔.

**제약**: `UNIQUE(user_id, platform)`

---

### 2.4 `workspaces`

촬영 프로젝트 단위. `campaign_id`는 광고주 당선으로 자동 생성된 경우만 값을 가짐.

| 컬럼 | 비고 |
|---|---|
| `progress` | `shots` 업로드/삭제 시 트리거 또는 서비스에서 재계산 |
| `status` | `active → completed|archived`, `archived → active` 복원 가능 |

**인덱스**: `(user_id, status)`, `(user_id, created_at DESC)`, `(campaign_id)`, `deleted_at`

---

### 2.5 `todos`

워크스페이스의 체크리스트. `order_index`로 정렬.

**자동화**:
- 첫 `shot` 생성 시 `status = COMPLETED`
- 마지막 `shot` 삭제 시 `status = PENDING`

**인덱스**: `(workspace_id, order_index)`, `(workspace_id, status)`

---

### 2.6 `shots`

개별 사진. `workspace_id`는 조회 최적화를 위한 역정규화.

| 컬럼 | 비고 |
|---|---|
| `image_uri` | S3 키 패턴: `shots/{workspace_id}/{todo_id}/{shot_id}.{ext}` |
| `ai_verification` | Gemini 응답 (label, confidence, feedback) |

**인덱스**: `(todo_id, uploaded_at DESC)`, `(workspace_id, uploaded_at DESC)`, `deleted_at`

---

### 2.7 `campaigns`

광고주가 등록하는 캠페인. 배송형(`delivery`) / 방문형(`visit`).

| 컬럼 | 비고 |
|---|---|
| `applicants_count` | `applications` 생성 시 증가 (denormalized) |
| `todo_preset` | 당선 시 자동 생성되는 워크스페이스의 초기 투두 |
| `requirements` | 자격 조건 문자열 배열 |

**인덱스**: `(status, deadline)`, `(category, status)`, `(advertiser_id, status)`, `created_at DESC`

---

### 2.8 `applications`

크리에이터의 캠페인 신청. 당선 시 `workspace_id`가 채워짐.

**제약**: `UNIQUE(campaign_id, user_id)` — 중복 신청 방지

**상태 전이**:
- `applied → selected` (광고주가 선정)
- `applied → rejected` (발표 시 미선정자 일괄)
- `selected` 시 워크스페이스 자동 생성 → `workspace_id` 채움

---

### 2.9 `share_links`

Web Drop용 공유 토큰. `expires_at` 도달 시 배치로 하드 삭제.

| 컬럼 | 비고 |
|---|---|
| `token` | URL-safe random, 12~16자 |
| `password_hash` | bcrypt (비밀번호 옵션 사용 시) |

**인덱스**: `token`(UK), `expires_at`, `(workspace_id, expires_at)`

---

### 2.10 `signature_shots`

워크스페이스별 시그니처 구도 오버레이 프리셋.

---

### 2.11 `user_badges`

**복합 PK**: `(user_id, badge_type)` — 사용자는 배지 유형별 1개.

**배지 유형 10종**:
`first_shot`, `perfect_workspace`, `food_master`, `product_master`, `travel_master`, `web_drop`, `signature`, `ai_analyst`, `power_creator`, `pro`

---

### 2.12 `subscriptions`

Pro 플랜 구독 정보. Stripe 연동 예정.

**제약**: `UNIQUE(user_id)` — 1:1 관계

---

## 3. 주요 제약 및 규칙

### 3.1 소프트 삭제

- `users`, `workspaces`, `shots`, `signature_shots`, `share_links`, `campaigns` — `deleted_at IS NULL` 필터 기본 적용
- TypeORM: `@DeleteDateColumn()` 사용
- 하드 삭제는 별도 배치 (기본 30일 경과 후)

### 3.2 역정규화 카운터

성능을 위해 유지:
- `workspaces.progress` (0~100)
- `campaigns.applicants_count`
- `share_links.access_count`

→ 관련 도메인 이벤트에서 service layer가 갱신 (트리거 대신 코드로 관리).

### 3.3 도메인 자동화

| 이벤트 | 효과 |
|---|---|
| Shot 생성 | Todo.status = COMPLETED, Workspace.progress 재계산 |
| Shot 마지막 삭제 | Todo.status = PENDING, Workspace.progress 재계산 |
| Application.status = selected | Workspace 자동 생성, Application.workspace_id 연결 |
| Campaign.status = announced | 미선정 Application 일괄 rejected |
| Workspace 완성/첫 Shot 등 | Badge 조건 검사 → UserBadge.earned_at 갱신 |

### 3.4 인덱스 요약

| 패턴 | 인덱스 |
|---|---|
| 목록 조회 (페이지네이션) | `(owner_id, created_at DESC)` 복합 |
| 상태 필터 | `(owner_id, status)` |
| 유니크 식별 | `email`, `token`, `(user_id, provider)` |
| 소프트 삭제 | `deleted_at` partial index 권장 (`WHERE deleted_at IS NULL`) |

---

## 4. Enum 정의 (PostgreSQL)

```sql
CREATE TYPE user_plan AS ENUM ('free', 'pro');
CREATE TYPE user_role AS ENUM ('creator', 'advertiser');
CREATE TYPE oauth_provider AS ENUM ('kakao', 'naver', 'google', 'apple');
CREATE TYPE channel_platform AS ENUM ('instagram', 'youtube', 'tiktok', 'blog');
CREATE TYPE workspace_category AS ENUM ('FOOD', 'PRODUCT', 'DETAIL_PAGE', 'TRAVEL');
CREATE TYPE workspace_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE todo_status AS ENUM ('PENDING', 'COMPLETED');
CREATE TYPE campaign_type AS ENUM ('delivery', 'visit');
CREATE TYPE campaign_category AS ENUM ('FOOD', 'PRODUCT', 'BEAUTY', 'TRAVEL', 'LIFESTYLE', 'DETAIL_PAGE');
CREATE TYPE campaign_status AS ENUM ('recruiting', 'closed', 'announced');
CREATE TYPE application_status AS ENUM ('applied', 'selected', 'rejected');
CREATE TYPE badge_type AS ENUM (
  'first_shot', 'perfect_workspace',
  'food_master', 'product_master', 'travel_master',
  'web_drop', 'signature', 'ai_analyst', 'power_creator', 'pro'
);
```

---

## 5. 오픈 이슈

1. **PostgreSQL vs MySQL**: PG 가정 (JSONB, partial index, ENUM 타입 풍부).
2. **ORM**: TypeORM / Prisma 중 선택 필요. Prisma가 DX 우수, TypeORM이 NestJS 생태계와 궁합.
3. **썸네일**: 업로드 시 Lambda로 다중 해상도 생성 vs on-the-fly CDN 변환 (CloudFront + image processor).
4. **검색**: 캠페인 키워드 검색 — PG FTS (`tsvector`) 또는 Elasticsearch. 초기엔 PG FTS 권장.
5. **AI 비동기화**: Shot 업로드 → 큐 (BullMQ/Redis) → Gemini 호출 → `shots.ai_verification` 업데이트.

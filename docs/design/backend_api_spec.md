# QUDO — Backend API Specification

> **문서 버전**: v1.0 | **작성일**: 2026-04-03
> **목적**: 프론트엔드(React Native/Expo) ↔ 백엔드 협업용 API 명세
> **기준 코드**: 프론트엔드 Mock 데이터 및 Store 인터페이스 기반으로 작성

---

## 목차

1. [공통 규칙](#1-공통-규칙)
2. [인증 (Auth)](#2-인증-auth)
3. [사용자 / 프로필](#3-사용자--프로필)
4. [워크스페이스](#4-워크스페이스)
5. [투두 (Todo)](#5-투두-todo)
6. [캠페인](#6-캠페인)
7. [캠페인 신청](#7-캠페인-신청)
8. [신청자 관리 (광고주)](#8-신청자-관리-광고주)
9. [Web Drop (파일 공유)](#9-web-drop-파일-공유)
10. [파일 업로드 (S3)](#10-파일-업로드-s3)
11. [AI 파이프라인](#11-ai-파이프라인)
12. [에러 코드](#12-에러-코드)
13. [데이터 모델 정의](#13-데이터-모델-정의)

---

## 1. 공통 규칙

### Base URL
```
Production : https://api.qudo.app/v1
Development: http://localhost:8080/v1
```

### 요청 헤더
```http
Content-Type: application/json
Authorization: Bearer {access_token}   # 인증 필요 엔드포인트
```

### 응답 구조
모든 응답은 아래 Envelope를 사용한다.

```jsonc
// 성공
{
  "success": true,
  "data": { ... }         // 또는 배열 [ ... ]
}

// 페이지네이션
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 87,
    "totalPages": 5,
    "hasNext": true
  }
}

// 실패
{
  "success": false,
  "error": {
    "code": "CAMPAIGN_NOT_FOUND",
    "message": "해당 캠페인을 찾을 수 없습니다."
  }
}
```

### 날짜 형식
- 모든 날짜: **ISO 8601** (`2026-04-03` 또는 `2026-04-03T12:00:00Z`)
- 타임존: UTC 기준, 프론트에서 로컬 변환

### 인증 방식
- Access Token: JWT, 만료 1시간
- Refresh Token: Opaque Token, 만료 30일
- `Authorization: Bearer {access_token}` 헤더로 전달

---

## 2. 인증 (Auth)

### 2-1. 소셜 로그인

```http
POST /auth/social
```

**Request**
```json
{
  "provider": "kakao",          // 지원: "kakao" | "naver" | "google" | "apple"
  "token": "social_oauth_token" // Kakao/Naver: AccessToken, Google/Apple: ID Token
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "opaque_refresh_token",
    "expiresIn": 3600,
    "user": {
      "id": "u_abc123",
      "displayName": "김크리에이터",
      "email": "creator@example.com",
      "avatarUri": "https://cdn.qudo.app/avatars/u_abc123.jpg",
      "plan": "free",
      "role": "creator"
    },
    "isNewUser": false           // true면 온보딩 플로우로 분기
  }
}
```

---

### 2-2. 토큰 갱신

```http
POST /auth/refresh
```

**Request**
```json
{
  "refreshToken": "opaque_refresh_token"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "expiresIn": 3600
  }
}
```

---

### 2-3. 로그아웃

```http
POST /auth/logout
Authorization: Bearer {access_token}
```

**Response 200**
```json
{ "success": true, "data": null }
```

---

## 3. 사용자 / 프로필

### 3-1. 내 프로필 조회

```http
GET /users/me
Authorization: Bearer {access_token}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "u_abc123",
    "displayName": "김크리에이터",
    "email": "creator@example.com",
    "avatarUri": "https://cdn.qudo.app/avatars/u_abc123.jpg",
    "plan": "free",
    "role": "creator",
    "totalWorkspaces": 12,
    "totalShots": 248,
    "totalBadges": 3,
    "socialAccounts": [
      {
        "platform": "instagram",
        "handle": "@kim_creator",
        "followers": 12400,
        "connected": true
      },
      {
        "platform": "youtube",
        "handle": "",
        "followers": 0,
        "connected": false
      }
    ]
  }
}
```

---

### 3-2. 프로필 수정

```http
PATCH /users/me
Authorization: Bearer {access_token}
```

**Request** (변경할 필드만 포함)
```json
{
  "displayName": "김스냅",
  "bio": "음식/뷰티 전문 크리에이터"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "u_abc123",
    "displayName": "김스냅",
    "email": "creator@example.com"
  }
}
```

---

### 3-3. 회원 탈퇴

```http
DELETE /users/me
Authorization: Bearer {access_token}
```

> **주의**: 즉시 하드 삭제되지 않으며 소프트 삭제(deletedAt) 처리됨. 30일 이내 복구 가능 정책.

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

### 3-4. 아바타 이미지 업로드

```http
POST /users/me/avatar
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request**
```
file: (image file, max 5MB, JPEG/PNG/WEBP)
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "avatarUri": "https://cdn.qudo.app/avatars/u_abc123.jpg"
  }
}
```

---

### 3-4. 채널 정보 등록/수정

```http
PUT /users/me/social-accounts/{platform}
Authorization: Bearer {access_token}
```

`{platform}`: `instagram` | `youtube` | `tiktok` | `blog`

**Request**
```json
{
  "handle": "@kim_creator",
  "followers": 12400
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "platform": "instagram",
    "handle": "@kim_creator",
    "followers": 12400,
    "connected": true
  }
}
```

---

### 3-5. 채널 정보 삭제

```http
DELETE /users/me/social-accounts/{platform}
Authorization: Bearer {access_token}
```

**Response 200**
```json
{ "success": true, "data": null }
```

---

### 3-6. 역할 전환

```http
PATCH /users/me/role
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "role": "advertiser"    // "creator" | "advertiser"
}
```

**Response 200**
```json
{
  "success": true,
  "data": { "role": "advertiser" }
}
```

---

### 3-7. 내 획득 배지 조회

```http
GET /users/me/badges
Authorization: Bearer {access_token}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "badgeType": "first_shot",
      "earnedAt": "2026-04-02T10:00:00Z"
    },
    {
      "badgeType": "perfect_workspace",
      "earnedAt": "2026-04-05T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 2,
    "totalPages": 1,
    "hasNext": false
  }
}
```

---

## 4. 워크스페이스

### 4-1. 워크스페이스 목록 조회

```http
GET /workspaces?status={status}&page={page}&pageSize={pageSize}
Authorization: Bearer {access_token}
```

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `status` | string | (전체) | `active` \| `completed` \| `archived` |
| `page` | number | 1 | 페이지 번호 |
| `pageSize` | number | 20 | 페이지당 항목 수 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "ws_001",
      "title": "성수동 카페 A",
      "location": "서울 성동구",
      "category": "FOOD",
      "status": "active",
      "progress": 75,
      "createdAt": "2026-04-01",
      "thumbnailUri": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 4,
    "totalPages": 1,
    "hasNext": false
  }
}
```

---

### 4-2. 워크스페이스 상세 조회

```http
GET /workspaces/{workspaceId}
Authorization: Bearer {access_token}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "ws_001",
    "title": "성수동 카페 A",
    "location": "서울 성동구",
    "category": "FOOD",
    "status": "active",
    "progress": 75,
    "createdAt": "2026-04-01",
    "campaignId": null,           // 캠페인 연동 시 campaign ID
    "thumbnailUri": null
  }
}
```

---

### 4-3. 워크스페이스 생성

```http
POST /workspaces
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "title": "성수동 카페 A",
  "location": "서울 성동구",
  "category": "FOOD",
  "campaignGuide": "필수 촬영 항목: 메뉴 전체컷, 카페 외관, 시그니처 음료 클로즈업...",
  "todoPreset": [               // AI 분석 결과 또는 직접 입력 (optional)
    "메뉴 전체컷",
    "카페 외관 샷",
    "시그니처 음료 클로즈업"
  ]
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "ws_002",
    "title": "성수동 카페 A",
    "location": "서울 성동구",
    "category": "FOOD",
    "status": "active",
    "progress": 0,
    "createdAt": "2026-04-03"
  }
}
```

---

### 4-4. 워크스페이스 상태 변경

```http
PATCH /workspaces/{workspaceId}
Authorization: Bearer {access_token}
```

**Request** (변경할 필드만)
```json
{
  "status": "completed"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "ws_001",
    "status": "completed"
  }
}
```

---

### 4-5. 워크스페이스 삭제

```http
DELETE /workspaces/{workspaceId}
Authorization: Bearer {access_token}
```

**Response 200**
```json
{ "success": true, "data": null }
```

---

### 4-6. 시그니처 샷 조회

```http
GET /workspaces/{workspaceId}/signature-shots
Authorization: Bearer {access_token}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "sig_001",
      "workspaceId": "ws_001",
      "imageUri": "https://cdn.qudo.app/signatures/sig_001.png",
      "opacity": 40,
      "label": "항공샷_기본",
      "createdAt": "2026-04-03"
    }
  ]
}
```

---

### 4-7. 시그니처 샷 저장

```http
POST /workspaces/{workspaceId}/signature-shots
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "imageUri": "https://cdn.qudo.app/signatures/sig_001.png",
  "opacity": 40,
  "label": "항공샷_기본"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "sig_001",
    "workspaceId": "ws_001",
    "imageUri": "https://cdn.qudo.app/signatures/sig_001.png",
    "opacity": 40,
    "label": "항공샷_기본",
    "createdAt": "2026-04-03"
  }
}
```

---

### 4-8. 시그니처 샷 삭제

```http
DELETE /workspaces/{workspaceId}/signature-shots/{signatureShotId}
Authorization: Bearer {access_token}
```

**Response 200**
```json
{ "success": true, "data": null }
```

---

## 5. 투두 (Todo)

### 5-1. 투두 목록 조회

```http
GET /workspaces/{workspaceId}/todos
Authorization: Bearer {access_token}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "todo_001",
      "workspaceId": "ws_001",
      "label": "메뉴 전체컷",
      "status": "COMPLETED",
      "order": 1,
      "images": [
        "https://cdn.qudo.app/shots/ws_001/todo_001/img_01.jpg"
      ]
    },
    {
      "id": "todo_002",
      "workspaceId": "ws_001",
      "label": "카페 외관 샷",
      "status": "PENDING",
      "order": 2,
      "images": []
    }
  ]
}
```

---

### 5-2. 투두 추가

```http
POST /workspaces/{workspaceId}/todos
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "label": "테이블 세팅 샷",
  "order": 3
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "todo_003",
    "workspaceId": "ws_001",
    "label": "테이블 세팅 샷",
    "status": "PENDING",
    "order": 3,
    "images": []
  }
}
```

---

### 5-3. 투두 상태 변경

```http
PATCH /todos/{todoId}
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "status": "COMPLETED"         // "PENDING" | "COMPLETED"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "todo_002",
    "status": "COMPLETED",
    "workspaceId": "ws_001"
  }
}
```

---

### 5-4. 투두 이미지 추가

```http
POST /todos/{todoId}/images
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request**
```
file: (image file, max 20MB, JPEG/PNG/HEIC)
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "imageUri": "https://cdn.qudo.app/shots/ws_001/todo_002/img_01.jpg",
    "todo": {
      "id": "todo_002",
      "status": "COMPLETED",
      "images": ["https://cdn.qudo.app/shots/ws_001/todo_002/img_01.jpg"]
    }
  }
}
```

> **주의**: 이미지 업로드 시 투두 status가 자동으로 `COMPLETED`로 변경됨.

---

### 5-5. 투두 이미지 삭제

```http
DELETE /todos/{todoId}/images/{imageIndex}
Authorization: Bearer {access_token}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "todo_002",
    "images": [],
    "status": "PENDING"         // 이미지 0장이면 PENDING으로 자동 변경
  }
}
```

---

### 5-6. 투두 순서 변경

```http
PATCH /workspaces/{workspaceId}/todos/reorder
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "order": ["todo_003", "todo_001", "todo_002"]   // 원하는 순서대로 ID 배열
}
```

**Response 200**
```json
{ "success": true, "data": null }
```

---

## 6. 캠페인

### 6-1. 캠페인 목록 조회

```http
GET /campaigns?type={type}&category={category}&status={status}&q={q}&page={page}&pageSize={pageSize}
```

> 인증 불필요 (목록·상세는 비로그인도 조회 가능, 신청은 인증 필요)

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `type` | string | (전체) | `delivery` \| `visit` |
| `category` | string | (전체) | `FOOD` \| `PRODUCT` \| `BEAUTY` \| `TRAVEL` \| `LIFESTYLE` \| `DETAIL_PAGE` |
| `status` | string | `recruiting` | `recruiting` \| `closed` \| `announced` |
| `q` | string | — | 키워드 검색 (title, brand) |
| `page` | number | 1 | 페이지 번호 |
| `pageSize` | number | 20 | 페이지당 항목 수 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "c_001",
      "title": "강남 스시 오마카세 방문 체험단",
      "brand": "스시하나",
      "type": "visit",
      "category": "FOOD",
      "location": "서울 강남구",
      "deadline": "2026-04-15",
      "applicants": 23,
      "slots": 3,
      "reward": "2인 코스 식사 제공 (정가 180,000원)",
      "thumbnailUri": null,
      "thumbnailColor": "#FF6B6B",
      "status": "recruiting",
      "applicationStatus": "none"   // 로그인 시: "none"|"applied"|"selected"|"rejected"
    }
  ],
  "pagination": { ... }
}
```

---

### 6-2. 캠페인 상세 조회

```http
GET /campaigns/{campaignId}
Authorization: Bearer {access_token}   # optional (applicationStatus 포함 시 필요)
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "c_001",
    "title": "강남 스시 오마카세 방문 체험단",
    "brand": "스시하나",
    "type": "visit",
    "category": "FOOD",
    "location": "서울 강남구",
    "deadline": "2026-04-15",
    "applicants": 23,
    "slots": 3,
    "reward": "2인 코스 식사 제공 (정가 180,000원)",
    "thumbnailUri": null,
    "thumbnailColor": "#FF6B6B",
    "status": "recruiting",
    "requirements": [
      "인스타그램 팔로워 5천 명 이상",
      "방문 후 7일 이내 포스팅"
    ],
    "todoPreset": [
      "외관 전경 샷",
      "코스 요리 전체컷",
      "시그니처 메뉴 클로즈업",
      "분위기 인테리어 샷"
    ],
    "applicationStatus": "none",
    "createdAt": "2026-03-20"
  }
}
```

---

### 6-3. 광고주 캠페인 생성

```http
POST /campaigns
Authorization: Bearer {access_token}   # role=advertiser 필요
```

**Request**
```json
{
  "title": "강남 스시 오마카세 방문 체험단",
  "brand": "스시하나",
  "type": "visit",
  "category": "FOOD",
  "location": "서울 강남구",
  "deadline": "2026-04-15",
  "slots": 3,
  "reward": "2인 코스 식사 제공",
  "requirements": [
    "인스타그램 팔로워 5천 명 이상",
    "방문 후 7일 이내 포스팅"
  ],
  "todoPreset": [
    "외관 전경 샷",
    "코스 요리 전체컷"
  ]
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "c_010",
    "title": "강남 스시 오마카세 방문 체험단",
    "status": "recruiting",
    "createdAt": "2026-04-03"
  }
}
```

---

### 6-4. 광고주 본인 캠페인 목록

```http
GET /campaigns/mine?status={status}&page={page}&pageSize={pageSize}
Authorization: Bearer {access_token}   # role=advertiser 필요
```

**Response 200** — 6-1과 동일 구조

---

### 6-5. 캠페인 수정

```http
PATCH /campaigns/{campaignId}
Authorization: Bearer {access_token}   # role=advertiser + 본인 캠페인만
```

**Request** (변경할 필드만)
```json
{
  "slots": 5,
  "deadline": "2026-04-20"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "c_001",
    "slots": 5,
    "deadline": "2026-04-20"
  }
}
```

---

### 6-6. 캠페인 삭제

```http
DELETE /campaigns/{campaignId}
Authorization: Bearer {access_token}   # role=advertiser + 본인 캠페인만
```

> **규칙**: 신청자가 없는 상태에서만 삭제 가능.

**Response 200**
```json
{ "success": true, "data": null }
```

---

## 7. 캠페인 신청

### 7-1. 캠페인 신청

```http
POST /campaigns/{campaignId}/apply
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "note": "음식 전문 크리에이터로 활동 중입니다."   // optional
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "app_001",
    "campaignId": "c_001",
    "status": "applied",
    "appliedAt": "2026-04-03"
  }
}
```

**Error 409** — 이미 신청한 경우
```json
{
  "success": false,
  "error": { "code": "ALREADY_APPLIED", "message": "이미 신청한 캠페인입니다." }
}
```

---

### 7-2. 내 신청 현황 조회

```http
GET /applications/mine?status={status}&page={page}&pageSize={pageSize}
Authorization: Bearer {access_token}
```

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `status` | string | (전체) | `applied` \| `selected` \| `rejected` |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "app_001",
      "campaignId": "c_001",
      "campaignTitle": "강남 스시 오마카세 방문 체험단",
      "brand": "스시하나",
      "reward": "2인 코스 식사 제공",
      "deadline": "2026-04-15",
      "thumbnailColor": "#FF6B6B",
      "type": "visit",
      "appliedAt": "2026-04-03",
      "status": "applied",
      "workspaceId": null        // selected 시 자동 생성된 workspace ID
    }
  ],
  "pagination": { ... }
}
```

---

### 7-3. 신청 취소

```http
DELETE /applications/{applicationId}
Authorization: Bearer {access_token}
```

> `applied` 상태에서만 취소 가능. `selected` / `rejected` 이후는 불가.

**Response 200**
```json
{ "success": true, "data": null }
```

**Error 400**
```json
{
  "success": false,
  "error": { "code": "CANNOT_CANCEL", "message": "당선/미당선 이후에는 취소할 수 없습니다." }
}
```

---

## 8. 신청자 관리 (광고주)

### 8-1. 신청자 목록 조회

```http
GET /campaigns/{campaignId}/applicants?status={status}&page={page}&pageSize={pageSize}
Authorization: Bearer {access_token}   # role=advertiser + 본인 캠페인만
```

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `status` | string | (전체) | `pending` \| `selected` \| `rejected` |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "apl_001",
      "campaignId": "c_001",
      "userId": "u_creator_01",
      "displayName": "박인스타",
      "handle": "@park_insta",
      "platform": "instagram",
      "followers": 18200,
      "categories": ["FOOD", "TRAVEL"],
      "portfolioUrl": "https://instagram.com/park_insta",
      "appliedAt": "2026-04-01",
      "status": "pending",
      "note": "음식 전문 크리에이터입니다."
    }
  ],
  "pagination": { ... }
}
```

---

### 8-2. 당선자 선정

```http
PATCH /campaigns/{campaignId}/applicants/{applicantId}
Authorization: Bearer {access_token}   # role=advertiser + 본인 캠페인만
```

**Request**
```json
{
  "status": "selected"    // "selected" | "rejected"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "applicantId": "apl_001",
    "status": "selected"
  }
}
```

---

### 8-3. 당선 발표 (일괄 확정)

```http
POST /campaigns/{campaignId}/announce
Authorization: Bearer {access_token}   # role=advertiser + 본인 캠페인만
```

> 이 엔드포인트 호출 시:
> 1. `selected` 신청자들의 `MyApplication.status` → `selected`
> 2. 각 당선자마다 워크스페이스 자동 생성
> 3. 나머지 `pending` 신청자 → `rejected`
> 4. 캠페인 `status` → `announced`
> 5. 당선자에게 푸시 알림 발송 (선택)

**Request** — body 없음

**Response 200**
```json
{
  "success": true,
  "data": {
    "campaignId": "c_001",
    "campaignStatus": "announced",
    "selectedCount": 3,
    "rejectedCount": 20,
    "createdWorkspaces": [
      {
        "applicantId": "apl_001",
        "userId": "u_creator_01",
        "workspaceId": "ws_010"
      }
    ]
  }
}
```

---

## 9. Web Drop (파일 공유)

### 9-1. Drop 토큰 발급

```http
POST /workspaces/{workspaceId}/drop
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "expiresIn": 72,          // 유효 시간 (시간 단위, 기본 72)
  "password": "snap1234"    // optional, 비밀번호 보호
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "token": "drop_7xK9mP",
    "url": "https://qudo.app/drop/drop_7xK9mP",
    "expiresAt": "2026-04-06T12:00:00Z",
    "passwordProtected": true
  }
}
```

---

### 9-2. Drop 에셋 조회 (PC 뷰어)

```http
GET /drop/{token}
```

> 인증 불필요. 비밀번호 보호 시 `password` 쿼리 파라미터 필요.

```http
GET /drop/{token}?password=snap1234
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "workspaceTitle": "성수동 카페 A",
    "expiresAt": "2026-04-06T12:00:00Z",
    "passwordProtected": true,
    "images": [
      {
        "id": "img_001",
        "uri": "https://cdn.qudo.app/shots/ws_001/todo_001/img_01.jpg",
        "todoLabel": "메뉴 전체컷",
        "uploadedAt": "2026-04-03T10:30:00Z",
        "width": 4032,
        "height": 3024
      }
    ]
  }
}
```

**Error 401** — 비밀번호 불일치
```json
{
  "success": false,
  "error": { "code": "INVALID_PASSWORD", "message": "비밀번호가 올바르지 않습니다." }
}
```

**Error 410** — 만료된 토큰
```json
{
  "success": false,
  "error": { "code": "DROP_EXPIRED", "message": "공유 링크가 만료되었습니다." }
}
```

---

### 9-3. Drop 토큰 갱신

```http
PATCH /workspaces/{workspaceId}/drop/{token}
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "expiresIn": 48
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "drop_7xK9mP",
    "expiresAt": "2026-04-05T12:00:00Z"
  }
}
```

---

## 10. 파일 업로드 (S3)

### Presigned URL 방식

대용량 이미지는 서버를 거치지 않고 클라이언트가 S3에 직접 업로드한다.

**Step 1: Presigned URL 요청**

```http
POST /uploads/presign
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "fileName": "img_001.jpg",
  "contentType": "image/jpeg",
  "todoId": "todo_002"          // 투두에 연결 시
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://qudo-assets.s3.ap-northeast-2.amazonaws.com/...",
    "fields": {                 // multipart form 필드 (POST 업로드 방식일 경우)
      "key": "shots/ws_001/todo_002/img_001.jpg",
      "Content-Type": "image/jpeg",
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "policy": "eyJl...",
      "x-amz-signature": "abc123..."
    },
    "publicUri": "https://cdn.qudo.app/shots/ws_001/todo_002/img_001.jpg"
  }
}
```

**Step 2: S3 직접 업로드**

```http
PUT {uploadUrl}
Content-Type: image/jpeg

(binary image data)
```

**Step 3: 업로드 완료 알림**

```http
POST /uploads/confirm
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "publicUri": "https://cdn.qudo.app/shots/ws_001/todo_002/img_001.jpg",
  "todoId": "todo_002"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "todo": {
      "id": "todo_002",
      "status": "COMPLETED",
      "images": ["https://cdn.qudo.app/shots/ws_001/todo_002/img_001.jpg"]
    },
    "workspace": {
      "id": "ws_001",
      "progress": 80
    }
  }
}
```

---

## 11. AI 파이프라인

### 11-1. Shot 자동 분류 (Shot Verification)

```http
POST /ai/match-todo
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "base64": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "todos": [
    { "id": "todo_001", "label": "메뉴 전체컷", "status": "PENDING", "imageCount": 0 },
    { "id": "todo_002", "label": "시그니처 음료 줌인", "status": "COMPLETED", "imageCount": 1 }
  ]
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "matchedTodoId": "todo_001",
    "matchedTodoLabel": "메뉴 전체컷",
    "confidence": 0.92,
    "feedback": null
  }
}
```

---

### 11-2. 캠페인 요구사항 파싱

```http
POST /ai/parse-campaign
Authorization: Bearer {access_token}
```

**Request**
```json
{
  "text": "블로그 포스팅용 뷰티 제품 리뷰입니다. 제형 컷 필수, 비포애프터 컷 필수. 하단에 스폰서십 명시 필수."
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "tasks": ["제품 외관 컷", "제형 텍스처 컷", "사용 전/후 비교 필드 컷"],
    "deadlines": [],
    "legalNotices": ["소정의 원고료를 지원받은 사실을 포스팅 하단에 명시"],
    "categoryHint": "BEAUTY"
  }
}
```

---

## 12. 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 인증 토큰 없음 또는 만료 |
| `FORBIDDEN` | 403 | 권한 없음 (다른 유저 리소스, 역할 불일치) |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `ALREADY_APPLIED` | 409 | 이미 신청한 캠페인 |
| `CANNOT_CANCEL` | 400 | 당선/미당선 후 취소 불가 |
| `CAMPAIGN_CLOSED` | 400 | 마감된 캠페인에 신청 시도 |
| `SLOTS_FULL` | 400 | 모집 인원 초과 |
| `INVALID_PASSWORD` | 401 | Drop 비밀번호 불일치 |
| `DROP_EXPIRED` | 410 | Drop 링크 만료 |
| `FILE_TOO_LARGE` | 413 | 파일 크기 초과 |
| `UNSUPPORTED_FILE_TYPE` | 415 | 지원하지 않는 파일 형식 |
| `ROLE_REQUIRED` | 403 | 특정 역할 필요 (advertiser only 등) |
| `VALIDATION_ERROR` | 422 | 요청 데이터 유효성 오류 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

---

## 13. 데이터 모델 정의

### Workspace

```typescript
interface Workspace {
  id: string;
  title: string;
  location: string;
  category: 'FOOD' | 'PRODUCT' | 'DETAIL_PAGE' | 'TRAVEL';
  status: 'active' | 'completed' | 'archived';
  progress: number;     // 0-100, 완료된 투두 / 전체 투두 비율
  createdAt: string;    // ISO date
  campaignId?: string;  // 캠페인 연동 워크스페이스
  campaignGuide?: string; // 캠페인 안내문 (원본 텍스트)
  thumbnailUri?: string;
}
```

### Todo

```typescript
interface Todo {
  id: string;
  workspaceId: string;
  label: string;
  status: 'PENDING' | 'COMPLETED';
  order: number;
  images: string[];     // 업로드된 이미지 URL 배열
}
```

### Campaign

```typescript
interface Campaign {
  id: string;
  title: string;
  brand: string;
  type: 'delivery' | 'visit';
  category: 'FOOD' | 'PRODUCT' | 'BEAUTY' | 'TRAVEL' | 'LIFESTYLE' | 'DETAIL_PAGE';
  location?: string;          // 방문형만 존재
  deadline: string;           // ISO date
  applicants: number;
  slots: number;
  reward: string;
  thumbnailUri?: string;
  thumbnailColor: string;
  status: 'recruiting' | 'closed' | 'announced';
  requirements: string[];
  todoPreset: string[];
  applicationStatus: 'none' | 'applied' | 'selected' | 'rejected';
  createdAt: string;
}
```

### Application (신청)

```typescript
interface Application {
  id: string;
  campaignId: string;
  campaignTitle: string;
  brand: string;
  reward: string;
  deadline: string;
  thumbnailColor: string;
  type: 'delivery' | 'visit';
  appliedAt: string;
  status: 'applied' | 'selected' | 'rejected';
  workspaceId?: string;       // 당선 시 자동 생성
  note?: string;
}
```

### Applicant (신청자 — 광고주 뷰)

```typescript
interface Applicant {
  id: string;
  campaignId: string;
  userId: string;
  displayName: string;
  handle: string;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'blog';
  followers: number;
  categories: string[];
  portfolioUrl?: string;
  appliedAt: string;
  status: 'pending' | 'selected' | 'rejected';
  note?: string;
}
```

### UserProfile

```typescript
interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUri?: string;
  plan: 'free' | 'pro';
  role: 'creator' | 'advertiser';
  totalWorkspaces: number;
  totalShots: number;
  totalBadges: number;
  socialAccounts: SocialAccount[];
}

interface Badge {
  badgeType: string;
  earnedAt: string;
}

interface SignatureShot {
  id: string;
  workspaceId: string;
  imageUri: string;
  opacity: number;
  label: string;
  createdAt: string;
}

interface SocialAccount {
  platform: 'instagram' | 'youtube' | 'tiktok' | 'blog';
  handle: string;
  followers: number;
  connected: boolean;
}
```

### Drop (Web Drop)

```typescript
interface Drop {
  token: string;
  workspaceId: string;
  url: string;
  expiresAt: string;          // ISO datetime
  passwordProtected: boolean;
}

interface DropImage {
  id: string;
  uri: string;
  todoLabel: string;
  uploadedAt: string;
  width: number;
  height: number;
}
```

---

## 부록 — 프론트엔드 연동 우선순위

현재 Mock 데이터로 동작하는 Store들의 API 연동 순서.

| 우선순위 | Store 파일 | 연동 엔드포인트 |
|---------|-----------|---------------|
| 1 | `user-store.ts` | `POST /auth/social`, `GET /users/me` |
| 2 | `workspace-store.ts` | `GET /workspaces`, `POST /workspaces` |
| 3 | `todo-store.ts` | `GET /workspaces/{id}/todos`, `PATCH /todos/{id}` |
| 4 | `application-store.ts` | `GET /applications/mine`, `POST /campaigns/{id}/apply` |
| 5 | Campaign 화면 | `GET /campaigns`, `GET /campaigns/{id}` |
| 6 | Drop 기능 | `POST /workspaces/{id}/drop`, `GET /drop/{token}` |

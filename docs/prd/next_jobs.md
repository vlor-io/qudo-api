# QUDO — Next Jobs

> **문서 버전**: v1.4 | **최종 업데이트**: 2026-04-16
> **목적**: 현재 완성된 기능을 기반으로 다음 개발 단계 정의

---

## 현재 상태 요약

| 레이어 | 상태 |
|--------|------|
| 화면 & 라우팅 (18개, upgrade 포함) | ✅ 완료 |
| 전역 상태 (stores, observer 패턴) | ✅ 완료 |
| 역할 시스템 (creator / advertiser) | ✅ 완료 |
| AI Shot Verification (Gemini 2.5 Flash) | ✅ 연동 완료 |
| 자동 분류 (COMPLETED 포함, matchTodo) | ✅ 완료 |
| 사진 처리 큐 (직렬 + Rate Limit 재시도) | ✅ 완료 |
| 워크스페이스 보관 / 복원 / 삭제 | ✅ 완료 |
| 투두 롱프레스 삭제 | ✅ 완료 |
| 카메라 핀치줌 / 슬라이더 / 포커스 / 노출 | ✅ 완료 |
| 카메라 비율 전환 (4:3 / 16:9 / 1:1) | ✅ 완료 |
| 카메라 설정 모달 (격자 / 타이머 / 비율) | ✅ 완료 |
| UX 폴리싱 (Toast / Skeleton / 탭 페이드) | ✅ 완료 |
| 커스텀 Dialog (Alert.alert 전면 대체) | ✅ 완료 |
| 튜토리얼 (5단계 온보딩) | ✅ 완료 |
| 프리미엄 시스템 (플랜 관리 + 게이트 + 업그레이드 화면) | ✅ 완료 |
| 바텀시트 키보드 가림 버그 수정 | ✅ 완료 |
| expo-av → expo-video 마이그레이션 | ✅ 완료 |
| 메모리 누수 수정 (전체 화면) | ✅ 완료 |
| GestureHandlerRootView 루트 등록 | ✅ 완료 |
| 시그니처 샷 → 카메라 오버레이 연동 | ⚠️ 미구현 |
| AI 캠페인 텍스트 파싱 (Gemini) | ⚠️ 미연동 |
| Web Drop 실제 파일 전송 (R2 연동) | ⚠️ 더미 |
| 인앱결제(IAP) 실제 연동 | ⚠️ Mock |
| 백엔드 API | ❌ 미구현 |

---

## Job 1 — Web Drop Cloudflare R2 연동 (SHR-01/SHR-03)

**우선순위**: ⭐⭐⭐⭐⭐

현재 `workspace/[id]/share.tsx`에서 토큰만 발급되고 실제 파일 전송 없음.
스토리지는 AWS S3 대신 **Cloudflare R2** 사용 — 이그레스 무료, S3 호환 API.

### 1-1. 모바일 → R2 업로드

**구현 목표**
- `services/storage.ts` — `uploadImages(workspaceId, uris[])` → Cloudflare R2 presigned URL 사용
- Cloudflare Workers(또는 Next.js API route)로 presigned URL 발급
- 업로드 진행률 표시 (ProgressBar)
- Lifecycle Rule: 24시간 TTL 자동 삭제
- 업로드 완료 후 공유 링크 활성화

**대상 파일**
- `services/storage.ts` — R2 엔드포인트 연결
- `features/share/hooks/use-share.ts`
- `app/workspace/[id]/share.tsx`

### 1-2. PC 뷰어 실제 데이터 연동

현재 `app/drop/viewer.web.tsx`가 Mock 이미지로 동작.

**구현 목표**
- `GET /api/drop/{token}` → `{ images: string[], expiresAt: string, passwordProtected: boolean }`
- 비밀번호 게이트 실제 검증
- 만료된 토큰 처리 (404 페이지)

**대상 파일**
- `app/drop/viewer.web.tsx`
- `services/api.ts` — `fetchDropAssets(token, password?)` 추가

---

## Job 2 — 시그니처 샷 오버레이 (CAM-02)

**우선순위**: ⭐⭐⭐⭐⭐ (핵심 USP)

현재 `workspace/[id]/signature.tsx`에서 시그니처 이미지 목록만 표시됨.
카메라 뷰 위에 참고 이미지를 반투명으로 겹쳐 구도 가이드 제공.

**구현 목표**
- "이 구도로 촬영" 버튼 → `camera?signatureUri=...` 파라미터 전달
- `CameraOverlay`에 `signatureUri` + `signatureOpacity` prop 수신 (컴포넌트 이미 준비됨)
- 카메라 뷰 위에 `opacity: 0.4` 이미지 레이어 렌더
- 설정 모달 또는 별도 슬라이더로 투명도 조절 (0~80%)
- "오버레이 OFF" 토글

**대상 파일**
- `app/workspace/[id]/signature.tsx` — "이 구도로 촬영" → camera push 시 `signatureUri` 전달
- `app/workspace/[id]/camera.tsx` — `signatureUri` 파라미터 수신 + CameraOverlay 전달
- `features/camera/components/CameraOverlay.tsx` — 이미 `signatureUri` prop 지원

---

## Job 3 — Gemini 캠페인 텍스트 파싱 (WRK-02)

**우선순위**: ⭐⭐⭐⭐

현재 `workspace/create.tsx`에서 카테고리별 고정 투두 프리셋 사용.
캠페인 가이드 텍스트를 Gemini로 파싱해 맞춤형 투두 자동 생성.

**구현 목표**
- `services/gemini.ts` — `parseCampaignGuide(text)` 함수 구현
  - 프롬프트: `"다음 캠페인 가이드에서 필수 촬영 항목을 JSON 배열로 추출하세요: ..."`
  - 응답: `{ todos: Array<{ label, description, priority }> }`
- `app/workspace/create.tsx` — AI 분석 버튼 → `parseCampaignGuide()` 호출 → 결과 미리보기 카드 표시
- 생성된 투두 편집 (추가 / 삭제) 후 워크스페이스 생성 확정

**대상 파일**
- `services/gemini.ts` — `parseCampaignGuide(text)` 추가
- `app/workspace/create.tsx` — AI 분석 로딩 + 결과 편집 UI

---

## Job 4 — 인앱결제(IAP) 실제 연동

**우선순위**: ⭐⭐⭐

현재 `app/upgrade/index.tsx`의 구독/해지 로직이 Mock으로만 동작.

**구현 목표**
- `expo-in-app-purchases` 또는 **RevenueCat** SDK 연동
- 월간(₩9,900) / 연간(₩79,900) 상품 등록
- 구독 상태 서버 검증 + `userStore.setPlan('premium')` 연동
- 해지 시 플랫폼 구독 관리 화면 이동

**대상 파일**
- `app/upgrade/index.tsx` — Mock → 실제 IAP 호출로 교체
- `stores/user-store.ts` — 구독 상태 서버 동기화

---

## Job 5 — 백엔드 API 연동

**우선순위**: ⭐⭐

### 5-1. 인증 (Auth)

- 소셜 로그인 실제 SDK 연동 (카카오, 네이버, Google, Apple)
- JWT 토큰 발급 및 `AsyncStorage` 저장
- 자동 로그인 (앱 재시작 시 토큰 검증)

**대상 파일**
- `app/(auth)/login.tsx` — `handleLogin()` SDK 호출로 교체
- `stores/user-store.ts` — 토큰 저장 추가
- `services/api.ts` — Authorization 헤더 인터셉터

### 5-2. 워크스페이스 / 투두 CRUD

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /workspaces` | 목록 조회 |
| `POST /workspaces` | 생성 |
| `GET /workspaces/{id}/todos` | 투두 조회 |
| `PATCH /todos/{id}` | 상태 업데이트 |
| `DELETE /todos/{id}` | 투두 삭제 |

### 5-3. 캠페인 / 신청 CRUD

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /campaigns` | 목록 (필터 포함) |
| `GET /campaigns/{id}` | 상세 |
| `POST /campaigns/{id}/apply` | 신청 |
| `GET /my-applications` | 내 신청 현황 |
| `POST /campaigns/{id}/select` | 당선자 선정 (광고주) |

---

## 작업 순서

```
[즉시 시작 가능]
Job 1   Web Drop R2 연동 (storage.ts 엔드포인트 교체)
Job 2   시그니처 샷 오버레이 (CameraOverlay 이미 준비됨)
Job 3   Gemini 캠페인 텍스트 파싱

[병행 가능]
Job 4   IAP 실제 연동

[백엔드 준비 후]
Job 5-1  소셜 로그인 SDK 연동
Job 5-2  워크스페이스 / 투두 CRUD
Job 5-3  캠페인 / 신청 CRUD
```

---

## 참고 문서

| 파일 | 내용 |
|------|------|
| `doc/prd_new.md` | 화면별 전체 요구사항 명세 (v3.0) |
| `doc/overview.md` | 서비스 개요 |
| `doc/PROJECT_HISTORY.md` | 개발 히스토리 (Phase 1~15) |
| `CLAUDE.md` | AI 코딩 어시스턴트용 프로젝트 컨텍스트 |

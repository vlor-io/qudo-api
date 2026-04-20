# QUDO 상세 요구사항 명세서 (SRS)

> **문서 버전**: v1.0 | **최종 수정일**: 2026-04-07
> **서비스명**: QUDO (큐도) — 크리에이터를 위한 스마트 촬영 워크스페이스
> **목적**: 각 화면(페이지)별 프론트엔드·백엔드 개발 요구사항을 상세 기록

---

## 목차

1. [공통 요구사항](#1-공통-요구사항)
2. [INTRO — 인트로](#2-intro--인트로)
3. [LGN-01 — 소셜 로그인](#3-lgn-01--소셜-로그인)
4. [WRK-01 — 대시보드](#4-wrk-01--대시보드)
5. [WRK-02 — 워크스페이스 생성 & AI 분석](#5-wrk-02--워크스페이스-생성--ai-분석)
6. [TDO-01 — 투두리스트 상세](#6-tdo-01--투두리스트-상세)
7. [CAM-01 — 스마트 가이드 카메라](#7-cam-01--스마트-가이드-카메라)
8. [CAM-02 — 시그니처 샷 관리](#8-cam-02--시그니처-샷-관리)
9. [SHR-01 — Web Drop 링크 발급](#9-shr-01--web-drop-링크-발급)
10. [MYP-01 — 마이페이지 & 채널 등록](#10-myp-01--마이페이지--채널-등록)
11. [PRF-EDIT-01 — 프로필 편집](#11-prf-edit-01--프로필-편집)
12. [CPG-01 — 캠페인 찾기 (목록·검색)](#12-cpg-01--캠페인-찾기-목록검색)
13. [CPG-02 — 캠페인 상세 & 신청](#13-cpg-02--캠페인-상세--신청)
14. [MY-APP-01 — 내 신청 현황](#14-my-app-01--내-신청-현황)
15. [SHR-03 — PC 워크스페이스 뷰어](#15-shr-03--pc-워크스페이스-뷰어)
16. [CPG-ADV-01 — 광고주 캠페인 관리](#16-cpg-adv-01--광고주-캠페인-관리)
17. [CPG-ADV-02 — 캠페인 등록](#17-cpg-adv-02--캠페인-등록)
18. [CPG-ADV-03 — 신청자 목록 & 당선자 선정](#18-cpg-adv-03--신청자-목록--당선자-선정)

---

## 1. 공통 요구사항

### 1.1 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Expo SDK 54 / React Native 0.81 (New Architecture) |
| 라우팅 | expo-router v6 (파일 기반, TypedRoutes) |
| 언어 | TypeScript 5.9 / React 19.1 |
| 상태 관리 | Observer 패턴 Store (`subscribe` / `notify`) |
| 애니메이션 | react-native-reanimated v4 |
| 제스처 | react-native-gesture-handler |
| 카메라 | expo-camera (`CameraView`, `useCameraPermissions`) |
| AI | Gemini 2.5 Flash — `services/gemini.ts` |
| 사진 큐 | `services/photo-queue.ts` (직렬 처리 + Rate Limit 재시도) |
| E2E 테스트 | Playwright (Chromium, 18개 시나리오) |

### 1.2 테마 시스템

| 속성 | 라이트 모드 | 다크 모드 |
|------|-----------|----------|
| Text | `#0C0A08` | `#F2EDE8` |
| Background | `#EDE9E4` | `#0A0A0C` |
| Surface | `#FFFFFF` | `#131318` |
| Accent | `#0080B3` | `#39D0FF` |
| Icon | `#7A7672` | `rgba(242,237,232,0.42)` |
| Border | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |
| Divider | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.04)` |
| Disabled | `rgba(0,0,0,0.25)` | `rgba(255,255,255,0.25)` |

- `useColorScheme()` 훅으로 시스템 모드 감지
- `useThemeColor()` 훅으로 테마 색상 적용
- `ThemedText`, `ThemedView` 컴포넌트 우선 사용

### 1.3 카테고리 색상 체계

| 카테고리 | 색상 | 아이콘 | 프리셋 투두 |
|---------|------|--------|------------|
| `FOOD` | `#FF6B6B` | `restaurant-outline` | 외관(정면), 메뉴판 상세, 시그니처 음료 탑뷰, 내부 인테리어, 음식 클로즈업 |
| `PRODUCT` | `#4ECDC4` | `cube-outline` | 히어로 샷, 제형/텍스처, 언박싱, 라이프스타일 연출, 패키지 상세 |
| `DETAIL_PAGE` | `#7B61FF` | `document-text-outline` | 메인 배너, 스펙/성분표, 사용 방법, 후기 캡처, 비교 이미지 |
| `TRAVEL` | `#FFB347` | `airplane-outline` | 전경/랜드마크, 체크인 인증, 객실/시설, 어메니티, 뷰/전망 |

### 1.4 전역 상태 (Stores)

#### userStore (`stores/user-store.ts`)
| 메서드 | 설명 |
|--------|------|
| `hydrate()` | AsyncStorage에서 역할 로드 (앱 시작 시) |
| `isHydrated()` | 초기화 완료 여부 |
| `getRole()` | 현재 역할 반환 (`creator` \| `advertiser`) |
| `setRole(role)` | 역할 변경 + AsyncStorage 영속화 |
| `subscribe(fn)` | 변경 리스너 등록 (unsub 함수 반환) |

#### workspaceStore (`stores/workspace-store.ts`)
| 메서드 | 설명 |
|--------|------|
| `getAll()` | 전체 워크스페이스 배열 복사본 반환 |
| `getById(id)` | ID로 단건 조회 |
| `create(data)` | 새 워크스페이스 생성 (자동 ID 부여) |
| `createFromCampaign(data)` | 캠페인 당선 시 워크스페이스 자동 생성 |
| `archive(id)` | 상태를 `archived`로 변경 |
| `restore(id)` | 상태를 `active`로 복원 |
| `remove(id)` | 워크스페이스 삭제 |
| `subscribe(fn)` | 변경 리스너 등록 |

#### todoStore (`stores/todo-store.ts`)
| 메서드 | 설명 |
|--------|------|
| `init(wsId, todos)` | 초기 투두 설정 (존재하지 않을 때만) |
| `get(wsId)` | 워크스페이스별 투두 배열 반환 |
| `setAll(wsId, todos)` | 전체 투두 교체 |
| `toggle(wsId, todoId)` | PENDING ↔ COMPLETED 토글 |
| `addImage(wsId, todoId, uri)` | 이미지 추가 + 자동 COMPLETED 전환 |
| `removeImage(wsId, todoId, idx)` | 이미지 제거 (이미지 0개 시 PENDING 복원) |
| `moveImage(wsId, from, to, idx)` | 이미지를 다른 투두로 이동 |
| `addTodo(wsId, todo)` | 투두 항목 추가 |
| `removeTodo(wsId, todoId)` | 투두 항목 삭제 |
| `subscribe(fn)` | 변경 리스너 등록 |

#### applicationStore (`stores/application-store.ts`)
| 메서드 | 설명 |
|--------|------|
| `getAll()` | 전체 신청 목록 반환 |
| `getById(campaignId)` | 캠페인별 신청 조회 |
| `isApplied(campaignId)` | 신청 여부 boolean |
| `apply(campaign)` | 신청 등록 (status: `applied`) |
| `select(campaignId, wsId)` | 당선 처리 + 워크스페이스 ID 연결 |
| `reject(campaignId)` | 미당선 처리 |
| `subscribe(fn)` | 변경 리스너 등록 |

### 1.5 타입 정의

#### Workspace
```typescript
type WorkspaceStatus = 'active' | 'completed' | 'archived';
type WorkspaceCategory = 'FOOD' | 'PRODUCT' | 'DETAIL_PAGE' | 'TRAVEL';
interface Workspace {
  id: string;
  title: string;
  location: string;
  category: WorkspaceCategory;
  status: WorkspaceStatus;
  progress: number;       // 0-100
  createdAt: string;      // ISO date
}
```

#### Todo
```typescript
type TodoStatus = 'PENDING' | 'COMPLETED';
interface Todo {
  id: string;
  workspaceId: string;
  label: string;
  status: TodoStatus;
  order: number;
  images: string[];       // 다중 이미지 URI
}
```

#### Campaign
```typescript
type CampaignType = 'delivery' | 'visit';
type CampaignCategory = 'FOOD' | 'PRODUCT' | 'BEAUTY' | 'TRAVEL' | 'LIFESTYLE' | 'DETAIL_PAGE';
type CampaignStatus = 'recruiting' | 'closed' | 'announced';
type ApplicationStatus = 'none' | 'applied' | 'selected' | 'rejected';

interface Campaign {
  id: string;
  title: string;
  brand: string;
  type: CampaignType;
  category: CampaignCategory;
  location?: string;
  deadline: string;
  applicants: number;
  slots: number;
  reward: string;
  thumbnailColor: string;
  status: CampaignStatus;
  requirements: string[];
  todoPreset: string[];
  applicationStatus: ApplicationStatus;
}
```

#### Applicant
```typescript
type ApplicantStatus = 'pending' | 'selected' | 'rejected';
interface Applicant {
  id: string;
  campaignId: string;
  displayName: string;
  handle: string;
  platform: 'instagram' | 'youtube' | 'blog' | 'tiktok';
  followers: number;
  categories: string[];
  appliedAt: string;
  status: ApplicantStatus;
  note?: string;
}
```

#### Badge
```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;           // Ionicons name
  color: string;
  earnedAt: string | null; // null = 미획득
}
```

### 1.6 메모리 누수 방지 패턴

모든 화면에서 아래 패턴 필수 적용:

```typescript
// 패턴 1: async 작업 후 언마운트 체크
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);

// 패턴 2: Timer ref cleanup
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
useEffect(() => () => {
  if (timerRef.current) clearTimeout(timerRef.current);
}, []);
```

### 1.7 Mock 데이터 규칙

- 백엔드 미연동 화면은 파일 상단에 `MOCK_*` 상수로 임시 데이터 정의
- `// TODO: API 연동 후 제거` 주석 필수
- API 연동 시 `features/[domain]/hooks/use-*.ts` 훅으로 교체

### 1.8 네비게이션 규칙

| 전환 유형 | 메서드 | 사용 시점 |
|---------|--------|---------|
| 스택 교체 | `router.replace()` | 인트로→로그인, 로그인→대시보드, 역할 전환 |
| 스택 추가 | `router.push()` | 워크스페이스·캠페인 하위 화면 진입 |
| 뒤로가기 | `router.back()` | 헤더 뒤로가기 버튼 |

---

## 2. INTRO — 인트로

| 항목 | 내용 |
|------|------|
| **경로** | `app/index.tsx` |
| **목적** | 앱 브랜드 인지, 자동 로그인 체크 후 적절한 화면으로 이동 |
| **구현 상태** | ✅ 완료 |

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| INTRO-FR-01 | 앱 진입 시 로고 및 슬로건 애니메이션 재생 | P0 | ✅ |
| INTRO-FR-02 | 2.4초 후 로그인 화면으로 자동 이동 (`router.replace`) | P0 | ✅ |
| INTRO-FR-03 | 로그인 토큰 존재 시 대시보드로 직접 이동 | P1 | ❌ 미구현 |
| INTRO-FR-04 | 앱 버전 표시 (하단 11px) | P2 | ✅ |

### 2.2 UI 구성

```
+------------------------------------------+
|         (글로 원 360×360, opacity 0.05)   |
|         (글로 원 180×180, opacity blend)  |
|                                          |
|           [📷 카메라 배지 92×92]          |
|              QUDO (48px bold)            |
|           ────── (32×2 accent)           |
|                                          |
|  가이드 촬영부터 PC 전송까지              |
|  크리에이터를 위한 똑똑한 촬영 비서       |
|                                          |
|              v1.0.0 (11px)               |
+------------------------------------------+
```

### 2.3 애니메이션 시퀀스

| 타이밍 | 요소 | 애니메이션 |
|--------|------|-----------|
| 0ms~1000ms | 글로 원 | opacity 0→1, scale 0.6→1.0 |
| 200ms~700ms | 로고 | opacity 0→1, translateY 16→0 |
| 600ms~1100ms | 슬로건 | opacity 0→1 (fade-in) |
| 2600ms | 전체 | `router.replace('/(auth)/login')` |

### 2.4 상태 변수

| 변수 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `logoOpacity` | SharedValue | 0 | 로고 페이드인 |
| `logoY` | SharedValue | 16 | 로고 슬라이드업 |
| `taglineOpacity` | SharedValue | 0 | 슬로건 페이드인 |
| `glowScale` | SharedValue | 0.6 | 글로 확대 |
| `glowOpacity` | SharedValue | 0 | 글로 페이드인 |

### 2.5 Cleanup

- `clearTimeout()` — 2.6초 타이머 언마운트 시 정리

### 2.6 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /auth/check` | GET | 토큰 유효성 검증 → 유효 시 대시보드 직행 |

---

## 3. LGN-01 — 소셜 로그인

| 항목 | 내용 |
|------|------|
| **경로** | `app/(auth)/login.tsx` |
| **목적** | 소셜 계정 기반 간편 로그인 |
| **구현 상태** | ✅ UI 완료, SDK 연동 미완료 |

### 3.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| LGN-FR-01 | 카카오 로그인 | P0 | ❌ SDK 미연동 |
| LGN-FR-02 | 네이버 로그인 | P0 | ❌ SDK 미연동 |
| LGN-FR-03 | Google 로그인 | P0 | ❌ SDK 미연동 |
| LGN-FR-04 | Apple 로그인 (iOS 전용) | P1 | ❌ SDK 미연동 |
| LGN-FR-05 | 플랫폼별 버튼 필터링 (Apple은 iOS만) | P0 | ✅ |
| LGN-FR-06 | 로그인 성공 시 `router.replace('/(tabs)')` | P0 | ✅ (Mock) |
| LGN-FR-07 | 로그인 실패 시 에러 토스트 표시 | P1 | ❌ 미구현 |
| LGN-FR-08 | 이용약관·개인정보처리방침 링크 표시 | P2 | ✅ (텍스트만) |

### 3.2 소셜 로그인 제공자

| 제공자 | ID | 배경색 | 텍스트색 | 아이콘 | iOS | Android | Web |
|--------|-----|--------|---------|--------|-----|---------|-----|
| 카카오 | `kakao` | `#FEE500` | `#3C1E1E` | chatbubble | ✅ | ✅ | ✅ |
| 네이버 | `naver` | `#03C75A` | `#FFFFFF` | "N" 텍스트 | ✅ | ✅ | ✅ |
| Google | `google` | `#FFFFFF` | `#333` | G 로고 | ✅ | ✅ | ✅ |
| Apple | `apple` | `#000000` | `#FFFFFF` | Apple 로고 | ✅ | ❌ | ❌ |

### 3.3 UI 구성

```
+------------------------------------------+
|           [📷 카메라 배지 70×70]          |
|              QUDO                        |
|       크리에이터를 위한 촬영 비서         |
|                                          |
|       ── 소셜 계정으로 시작 ──           |
|                                          |
|  [💬 카카오로 시작하기            ] 54px  |
|  [ N 네이버로 시작하기            ] 54px  |
|  [ G Google로 시작하기            ] 54px  |
|  [   Apple로 시작하기   ] iOS only 54px  |
|                                          |
|  로그인 시 이용약관 동의로 간주 (11px)    |
+------------------------------------------+
```

### 3.4 이벤트 핸들러

| 핸들러 | 트리거 | 동작 |
|--------|--------|------|
| `handleLogin(providerId)` | 소셜 버튼 탭 | SDK 호출 → 토큰 저장 → `router.replace('/(tabs)')` |

### 3.5 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /auth/login` | POST | `{ provider, token }` → JWT 발급 |
| `POST /auth/refresh` | POST | 리프레시 토큰으로 JWT 갱신 |
| `POST /auth/logout` | POST | 토큰 무효화 |

### 3.6 검증 항목

- [ ] 각 소셜 SDK 정상 동작 (카카오/네이버/Google/Apple)
- [ ] 신규 사용자 자동 회원가입
- [ ] JWT 토큰 SecureStore 저장
- [ ] 네트워크 오류 시 재시도 가능

---

## 4. WRK-01 — 대시보드

| 항목 | 내용 |
|------|------|
| **경로** | `app/(tabs)/index.tsx` |
| **목적** | 사용자의 모든 촬영 워크스페이스를 관리하는 메인 화면 |
| **구현 상태** | ✅ 완료 |

### 4.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| WRK01-FR-01 | 워크스페이스 목록 표시 (카드 형태) | P0 | ✅ |
| WRK01-FR-02 | 필터 탭: 진행 중 / 완료 / 보관함 | P0 | ✅ |
| WRK01-FR-03 | FAB [+] 버튼으로 워크스페이스 생성 화면 이동 | P0 | ✅ |
| WRK01-FR-04 | 프로필 아이콘 → 마이페이지 이동 | P0 | ✅ |
| WRK01-FR-05 | 광고주 역할 시 캠페인 탭으로 즉시 리다이렉트 | P0 | ✅ |
| WRK01-FR-06 | Android 뒤로가기 → 앱 종료 Alert | P1 | ✅ |
| WRK01-FR-07 | 빈 상태 필터별 안내 메시지 표시 | P1 | ✅ |
| WRK01-FR-08 | 워크스페이스 카드 탭 → 투두 상세 이동 | P0 | ✅ |
| WRK01-FR-09 | Pull-to-refresh | P2 | ❌ 미구현 |

### 4.2 UI 구성

```
+------------------------------------------+
| 워크스페이스               [🔔] [👤 40×40]|
| 진행 중인 워크스페이스 N개                |
+------------------------------------------+
|  [ 진행 중 ]  [ 완료 ]  [ 보관함 ]  54px |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  | [🍽]  성수동 카페 A                 |  |
|  |       맛집/카페 · 서울 성동구      |  |
|  |  [======= 75% ====     ]  75%     |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  | [✈]  호텔 협찬 촬영                |  |
|  |       여행 · 서울 강남구           |  |
|  |  [==== 40%             ]  40%     |  |
|  +------------------------------------+  |
|                                          |
|                         [ + FAB 58×58 ]  |
+------------------------------------------+
```

### 4.3 상태 변수

| 변수 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `activeFilter` | `'active' \| 'completed' \| 'archived'` | `'active'` | 필터 탭 선택 |
| `workspaces` | `Workspace[]` | `workspaceStore.getAll()` | 목록 데이터 |

### 4.4 워크스페이스 카드 컴포넌트 (`WorkspaceCard`)

| 요소 | 설명 |
|------|------|
| 카테고리 아이콘 | `CATEGORY_META` 색상 원 안에 Ionicons |
| 제목 | 최대 1줄, ellipsis |
| 메타 정보 | 카테고리명 · 장소 |
| 진행률 바 | accent 색상 fill, `progress + '%'` |
| 탭 동작 | `router.push('/workspace/${id}')` |

### 4.5 필터 탭별 빈 상태 메시지

| 필터 | 아이콘 | 제목 | 설명 |
|------|--------|------|------|
| 진행 중 | camera-outline | 새로운 촬영을 시작하세요 | FAB 버튼 안내 |
| 완료 | checkmark-circle-outline | 아직 완료된 촬영이 없어요 | 힌트 텍스트 |
| 보관함 | archive-outline | 보관함이 비어있어요 | 힌트 텍스트 |

### 4.6 이벤트 핸들러

| 핸들러 | 트리거 | 동작 |
|--------|--------|------|
| 필터 탭 탭 | 탭 터치 | `setActiveFilter(value)` |
| FAB 탭 | FAB 터치 | `router.push('/workspace/create')` |
| 프로필 탭 | 아이콘 터치 | `router.push('/mypage')` |
| Android Back | 하드웨어 버튼 | `Alert` → `BackHandler.exitApp()` |

### 4.7 Store 구독

```typescript
useEffect(() => {
  const unsub = workspaceStore.subscribe(() => {
    setWorkspaces(workspaceStore.getAll());
  });
  return unsub;
}, []);
```

### 4.8 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /workspaces` | GET | 내 워크스페이스 목록 (필터 쿼리 지원) |
| `GET /workspaces?status=active` | GET | 상태별 필터링 |

---

## 5. WRK-02 — 워크스페이스 생성 & AI 분석

| 항목 | 내용 |
|------|------|
| **경로** | `app/workspace/create.tsx` |
| **목적** | 카테고리 기반 촬영 계획 수립 + AI 캠페인 텍스트 분석 |
| **구현 상태** | ✅ UI 완료, AI 파싱 미연동 |

### 5.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| WRK02-FR-01 | 제목 입력 (필수, 텍스트) | P0 | ✅ |
| WRK02-FR-02 | 장소 입력 (선택, 텍스트) | P1 | ✅ |
| WRK02-FR-03 | 카테고리 4종 칩 선택 (필수) | P0 | ✅ |
| WRK02-FR-04 | 카테고리 선택 시 추천 투두 프리뷰 표시 | P0 | ✅ |
| WRK02-FR-05 | AI 분석 섹션 접이식 토글 | P1 | ✅ |
| WRK02-FR-06 | 캠페인 안내문 입력 → AI 분석 호출 | P1 | ⚠️ Mock |
| WRK02-FR-07 | AI 결과: tasks / deadlines / legal_notices 표시 | P1 | ✅ (Mock) |
| WRK02-FR-08 | 생성 조건: 제목(필수) + 카테고리(필수) | P0 | ✅ |
| WRK02-FR-09 | 생성 완료 → workspaceStore.create() → 투두 상세 이동 | P0 | ✅ |

### 5.2 UI 구성

```
+------------------------------------------+
| [<]  새 워크스페이스                      |
+------------------------------------------+
| 기본 정보                                |
|  [ 워크스페이스 제목           ]          |
|  [ 📍 촬영 장소 (선택)         ]          |
|                                          |
| 카테고리                                 |
|  [🍽 맛집/카페]  [📦 제품]               |
|  [📄 상세페이지] [✈ 여행]               |
|                                          |
| 추천 촬영 리스트                          |
|  • 외관(정면) • 메뉴판 상세 ...          |
|                                          |
| [✦ AI 캠페인 분석    ▼/▲]               |
|  (접이식: 텍스트 입력 + 분석 버튼)       |
|  (결과: tasks / deadlines / notices)     |
+------------------------------------------+
|      [ 워크스페이스 만들기 ] 52px         |
+------------------------------------------+
```

### 5.3 상태 변수

| 변수 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `title` | `string` | `''` | 워크스페이스 제목 |
| `location` | `string` | `''` | 촬영 장소 |
| `category` | `WorkspaceCategory \| null` | `null` | 선택된 카테고리 |
| `campaignText` | `string` | `''` | AI 분석용 텍스트 |
| `aiResult` | `object \| null` | `null` | AI 분석 결과 |
| `analyzing` | `boolean` | `false` | 분석 중 로딩 |
| `showAiSection` | `boolean` | `false` | AI 섹션 펼침 여부 |
| `isMounted` | `Ref<boolean>` | `true` | 언마운트 체크 |

### 5.4 유효성 검사

```typescript
const canCreate = title.trim().length > 0 && category !== null;
```

### 5.5 AI 분석 결과 구조

```json
{
  "tasks": ["언박싱 사진", "조리 과정 영상", "최종 플레이팅"],
  "deadlines": { "draft": "2026-03-28", "upload": "검수 승인 후 익일" },
  "legal_notices": ["2차 활용 6개월 허용", "인사이트 공유 필수"]
}
```

### 5.6 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /workspaces` | POST | `{ title, location, category, todoPreset[] }` |
| `POST /ai/parse-campaign` | POST | `{ text }` → `{ tasks, deadlines, legal_notices }` |

---

## 6. TDO-01 — 투두리스트 상세

| 항목 | 내용 |
|------|------|
| **경로** | `app/workspace/[id]/index.tsx` |
| **목적** | 워크스페이스 내 촬영 투두 관리, 이미지 뷰어, 워크스페이스 관리 |
| **구현 상태** | ✅ 완료 |

### 6.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| TDO-FR-01 | 정보 카드: 카테고리 배지 + 상태 칩 + 위치/날짜 + 빠른 액션 | P0 | ✅ |
| TDO-FR-02 | 전체 진행률 바 (완료/전체, %) | P0 | ✅ |
| TDO-FR-03 | 투두 항목 체크박스 토글 (수동) | P0 | ✅ |
| TDO-FR-04 | 투두 옆 카메라 버튼 → CAM-01 (todoId 전달) | P0 | ✅ |
| TDO-FR-05 | 촬영된 사진 썸네일 스트립 표시 | P0 | ✅ |
| TDO-FR-06 | 이미지 탭 → 라이트박스 (수평 스와이프) | P0 | ✅ |
| TDO-FR-07 | 라이트박스 내 이미지 삭제 | P1 | ✅ |
| TDO-FR-08 | 라이트박스 내 이미지 다른 투두로 이동 | P1 | ✅ |
| TDO-FR-09 | 투두 롱프레스 500ms → 삭제 Alert | P1 | ✅ |
| TDO-FR-10 | 투두 추가 모달 (하단 슬라이드업, 텍스트 입력) | P1 | ✅ |
| TDO-FR-11 | 워크스페이스 메뉴: 보관 / 복원 / 삭제 | P1 | ✅ |
| TDO-FR-12 | 빠른 액션: 촬영 시작 / 시그니처 샷 / Web Drop | P0 | ✅ |
| TDO-FR-13 | 전체 사진 스택 프리뷰 (팬 형태 썸네일) | P2 | ✅ |
| TDO-FR-14 | 투두 드래그 정렬 | P3 | ❌ 미구현 |

### 6.2 UI 구성

```
+------------------------------------------+
| [<]  성수동 카페 A              [···]    |
|           맛집/카페                      |
+------------------------------------------+
| +--------------------------------------+ |
| | [🍽 맛집/카페]  [● 진행 중]          | |
| | 📍 서울 성동구  📅 2026.04.01       | |
| | [📷 시그니처] [🔗 Web Drop]         | |
| +--------------------------------------+ |
|                                          |
| 전체 촬영 현황              2 / 5        |
| [============================    ] 40%   |
+------------------------------------------+
|                                          |
| [✓] 01 카페 외관 (정면)        [📷]     |
|     [img1] [img2]                        |
| [✓] 02 메뉴판 상세             [📷]     |
| [ ] 03 시그니처 음료 탑뷰      [📷]     |
| [ ] 04 내부 인테리어           [📷]     |
| [ ] 05 음식 클로즈업           [📷]     |
|                                          |
|      [ + 투두 추가 ]                     |
|                                          |
|  (전체 사진 스택 팬 프리뷰)              |
+------------------------------------------+
```

### 6.3 상태 변수

| 변수 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `workspace` | `Workspace \| undefined` | store 구독 | 워크스페이스 정보 |
| `todos` | `Todo[]` | store 구독 | 투두 목록 |
| `modalVisible` | `boolean` | `false` | 투두 추가 모달 |
| `inputText` | `string` | `''` | 모달 입력값 |
| `slideAnim` | `Animated.Value` | — | 모달 슬라이드 |
| `menuVisible` | `boolean` | `false` | 워크스페이스 메뉴 |
| `viewer` | `object \| null` | `null` | 라이트박스 상태 |
| `movePicker` | `object \| null` | `null` | 이미지 이동 대상 선택 |

### 6.4 워크스페이스 메뉴 동작

| 상태 | 메뉴 항목 | 동작 |
|------|---------|------|
| `active` | 보관함으로 이동 | `workspaceStore.archive(id)` |
| `archived` | 복원 | `workspaceStore.restore(id)` |
| 모든 상태 | 삭제 | `Alert` → `workspaceStore.remove(id)` → `router.back()` |

### 6.5 라이트박스 기능

| 기능 | 설명 |
|------|------|
| 수평 스와이프 | FlatList 수평 페이징 |
| 좌우 화살표 | 이전/다음 버튼 |
| 이미지 삭제 | 삭제 → `todoStore.removeImage()` |
| 이미지 이동 | 다른 투두 선택 → `todoStore.moveImage()` |
| 인덱스 동기화 | 화살표↔스와이프 `scrollToIndex` 연동 |

### 6.6 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /workspaces/:id` | GET | 워크스페이스 단건 조회 |
| `GET /workspaces/:id/todos` | GET | 투두 목록 조회 |
| `POST /workspaces/:id/todos` | POST | 투두 추가 |
| `PATCH /workspaces/:id/todos/:todoId` | PATCH | 투두 상태 변경 |
| `DELETE /workspaces/:id/todos/:todoId` | DELETE | 투두 삭제 |
| `PATCH /workspaces/:id/status` | PATCH | 워크스페이스 보관/복원 |
| `DELETE /workspaces/:id` | DELETE | 워크스페이스 삭제 |

---

## 7. CAM-01 — 스마트 가이드 카메라

| 항목 | 내용 |
|------|------|
| **경로** | `app/workspace/[id]/camera.tsx` |
| **목적** | AI 기반 촬영 자동 분류 + 다양한 촬영 보조 기능 |
| **구현 상태** | ✅ 완료 (Gemini 연동 완료) |

### 7.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| CAM-FR-01 | 카메라 권한 요청 + 미승인 안내 화면 | P0 | ✅ |
| CAM-FR-02 | 플래시 제어 (off → on → auto 순환) | P0 | ✅ |
| CAM-FR-03 | 전후면 카메라 전환 | P0 | ✅ |
| CAM-FR-04 | 삼분할선 가이드 오버레이 (on/off 토글) | P0 | ✅ |
| CAM-FR-05 | 셔터 바운스 + 화면 플래시 애니메이션 | P1 | ✅ |
| CAM-FR-06 | AI 자동 분류 (todoId 없이 진입) | P0 | ✅ |
| CAM-FR-07 | 특정 투두 촬영 (todoId 지정 진입) | P0 | ✅ |
| CAM-FR-08 | AI 결과 배너 (2.8초 표시 후 페이드아웃) | P0 | ✅ |
| CAM-FR-09 | 사진 처리 큐 (연속 촬영 지원) | P0 | ✅ |
| CAM-FR-10 | Rate Limit 배너 (대기 시간 카운트다운) | P1 | ✅ |
| CAM-FR-11 | 핀치 줌 (0 ~ 0.25) | P1 | ✅ |
| CAM-FR-12 | 탭 포커스 + 노출 슬라이더 (3초 표시) | P1 | ✅ |
| CAM-FR-13 | 줌 프리셋 버튼 (0.5× / 1× / 2×) | P2 | ✅ |
| CAM-FR-14 | 줌 연속 슬라이더 (팬 제스처) | P2 | ✅ |
| CAM-FR-15 | 설정 모달: 격자/셀프타이머/화면비율 | P1 | ✅ |
| CAM-FR-16 | 셀프타이머 (끄기/3초/10초) + 풀스크린 카운트다운 | P2 | ✅ |
| CAM-FR-17 | 화면 비율 (4:3 / 16:9 / 1:1) | P2 | ✅ |
| CAM-FR-18 | 처리 중 사진 스택 (팬 썸네일 + AI 로딩 인디케이터) | P1 | ✅ |
| CAM-FR-19 | 시그니처 샷 오버레이 표시 | P1 | ✅ |
| CAM-FR-20 | AI 마스킹 (얼굴/번호판 블러) | P3 | ❌ 미구현 |

### 7.2 진입 모드

| 진입 경로 | `todoId` 파라미터 | AI 동작 |
|---------|-----------------|---------|
| 워크스페이스 "촬영 시작" 버튼 | 없음 | `matchTodo()` — 전체 투두 대상 자동 분류 |
| 투두 옆 카메라 아이콘 | 있음 | 없음 — 해당 투두에 즉시 할당 |

### 7.3 상태 변수

| 변수 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `facing` | `'back' \| 'front'` | `'back'` | 카메라 방향 |
| `flash` | `'off' \| 'on' \| 'auto'` | `'off'` | 플래시 모드 |
| `takingPhoto` | `boolean` | `false` | 촬영 중 플래그 |
| `settingsVisible` | `boolean` | `false` | 설정 모달 |
| `showGrid` | `boolean` | `true` | 삼분할선 표시 |
| `aspectRatio` | `'4:3' \| '16:9' \| '1:1'` | `'4:3'` | 화면 비율 |
| `timerMode` | `0 \| 3 \| 10` | `0` | 셀프타이머 |
| `timerCountdown` | `number` | `0` | 카운트다운 남은 초 |
| `zoom` | `number` | `0` | 줌 레벨 (0~0.25) |
| `exposure` | `number` | `0` | 노출 (-1~+1) |
| `showExpSlider` | `boolean` | `false` | 노출 슬라이더 표시 |
| `focusPoint` | `{x, y} \| null` | `null` | 포커스 포인트 |
| `pendingPhotos` | `{id, uri, processing}[]` | `[]` | 처리 대기 사진 |
| `rateLimitSec` | `number` | `0` | Rate Limit 남은 초 |
| `shotCount` | `number` | `0` | 누적 촬영 수 |
| `lastVerified` | `string \| null` | `null` | 마지막 검증 투두명 |
| `verifyResult` | `object \| null` | `null` | 검증 결과 |
| `matchResult` | `object \| null` | `null` | 매칭 결과 |

### 7.4 제스처 동작

| 제스처 | 핸들러 | 동작 |
|--------|--------|------|
| 핀치 (두 손가락) | `Gesture.Pinch()` | `zoom` 값 조절 (0~MAX_ZOOM 0.25) |
| 탭 (한 손가락) | `Gesture.Tap()` | 포커스 포인트 설정 + 노출 슬라이더 3초 표시 |
| 팬 (줌 슬라이더) | `Gesture.Pan()` | 연속 줌 드래그 |
| 팬 (노출 슬라이더) | `Gesture.Pan()` | 수직 드래그 (-1~+1) |
| 핀치·탭 경쟁 | `Gesture.Race()` | 동시 제스처 충돌 방지 |

### 7.5 AI 결과 배너

| 상황 | 아이콘 | 색상 | 메시지 |
|------|--------|------|--------|
| 자동 분류 성공 | ✨ | 블루 | `{투두명}` 자동 분류됨! |
| 자동 할당 완료 | ✔ | 그린 | `{투두명}` 자동 체크 완료! |
| 검증 실패 | ⚠️ | 옐로 | 재촬영 권장 + 이유 |
| Rate Limit | ⏱ | 옐로 | AI 요청 한도 초과 N초 후 자동 재개 |

### 7.6 설정 모달

| 설정 | 옵션 | 설명 |
|------|------|------|
| 구도 격자 | Switch (on/off) | 삼분할선 표시 토글 |
| 셀프타이머 | 끄기 / 3초 / 10초 | 셔터 후 N초 카운트다운 |
| 화면 비율 | 4:3 / 16:9 / 1:1 | 뷰파인더 클리핑 |

### 7.7 사진 처리 큐 (`PhotoProcessingQueue`)

| 기능 | 설명 |
|------|------|
| 직렬 실행 | 동시 API 호출 방지, 1건씩 순차 처리 |
| Rate limit 재시도 | 429 응답 → `retryAfterSec` 대기 → 자동 재개 |
| 지수 백오프 | 일반 에러 시 1s → 1.5s → 2.25s (최대 3회) |
| UI 구독 | `subscribe()` → pending 목록 + rateLimitRemainSec |
| Cleanup | 언마운트 시 `queue.clear()` |

### 7.8 Cleanup 목록

| Ref | 대상 |
|-----|------|
| `queueRef` | PhotoProcessingQueue → `clear()` |
| `timerRef` | 셀프타이머 카운트다운 `setInterval` |
| `focusTimeoutRef` | 포커스 박스 3초 자동 숨김 |
| `resultBannerRef` | AI 결과 배너 2.8초 페이드아웃 |

### 7.9 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /workspaces/:id/todos/:todoId/images` | POST | 이미지 업로드 (S3 presigned URL) |
| `POST /ai/match-todo` | POST | `{ base64, todos[] }` → 매칭 결과 |

---

## 8. CAM-02 — 시그니처 샷 관리

| 항목 | 내용 |
|------|------|
| **경로** | `app/workspace/[id]/signature.tsx` |
| **목적** | 사용자 고유 구도를 저장하여 일관된 브랜드 촬영 결과물 제작 |
| **구현 상태** | ✅ 완료 |

### 8.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| CAM02-FR-01 | 갤러리에서 이미지 선택 (`expo-image-picker`) | P0 | ✅ |
| CAM02-FR-02 | 투명도 4단계 조절 (20/40/60/80%) | P0 | ✅ |
| CAM02-FR-03 | 3:4 비율 실시간 프리뷰 (삼분할선 + 시그니처 오버레이) | P0 | ✅ |
| CAM02-FR-04 | 저장 완료 시 체크 바운스 애니메이션 | P1 | ✅ |
| CAM02-FR-05 | 이미지 제거 (✕ 버튼) | P1 | ✅ |
| CAM02-FR-06 | 저장 시 카메라 오버레이에 반영 | P0 | ✅ (로컬) |
| CAM02-FR-07 | 서버 영속화 | P2 | ❌ 미구현 |

### 8.2 상태 변수

| 변수 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `signatureUri` | `string \| null` | `null` | 선택된 이미지 URI |
| `opacity` | `number` | `0.4` | 오버레이 투명도 |
| `saved` | `boolean` | `false` | 저장 완료 플래그 |
| `checkScale` | `Animated.Value` | — | 체크 애니메이션 |

### 8.3 투명도 옵션

| 단계 | 값 | 표시 |
|------|-----|------|
| 1 | `0.2` | 20% |
| 2 | `0.4` | 40% (기본) |
| 3 | `0.6` | 60% |
| 4 | `0.8` | 80% |

### 8.4 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `PATCH /workspaces/:id/signature` | PATCH | `{ uri, opacity }` 저장 |
| `GET /workspaces/:id/signature` | GET | 시그니처 설정 조회 |

---

## 9. SHR-01 — Web Drop 링크 발급

| 항목 | 내용 |
|------|------|
| **경로** | `app/workspace/[id]/share.tsx` |
| **목적** | PC 브라우저 연동용 보안 링크 발급 |
| **구현 상태** | ✅ UI 완료, 실제 링크 생성 미연동 |

### 9.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| SHR-FR-01 | 링크 발급 (랜덤 토큰 URL 생성) | P0 | ⚠️ Mock |
| SHR-FR-02 | 비밀번호 보호 (Switch 토글 + 입력 필드) | P0 | ✅ |
| SHR-FR-03 | 링크 클립보드 복사 (`expo-clipboard`) | P0 | ✅ |
| SHR-FR-04 | OS 공유 시트 호출 (`Share.share()`) | P0 | ✅ |
| SHR-FR-05 | 유효기간 72시간 표시 | P1 | ✅ |
| SHR-FR-06 | 비밀번호 눈 아이콘 토글 (표시/숨김) | P2 | ✅ |
| SHR-FR-07 | 복사 완료 피드백 (아이콘 전환 2초) | P2 | ✅ |

### 9.2 상태 변수

| 변수 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `link` | `ShareLink \| null` | `null` | 발급된 링크 정보 |
| `generating` | `boolean` | `false` | 발급 중 로딩 |
| `copied` | `boolean` | `false` | 복사 완료 표시 |
| `usePassword` | `boolean` | `false` | 비밀번호 사용 여부 |
| `password` | `string` | `''` | 비밀번호 입력값 |
| `passwordVisible` | `boolean` | `false` | 비밀번호 표시 토글 |

### 9.3 링크 데이터 구조

```typescript
interface ShareLink {
  id: string;
  workspaceId: string;
  url: string;           // https://qudo.app/drop/:token
  password?: string;
  expiresAt?: string;    // 발급 후 72시간
}
```

### 9.4 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /workspaces/:id/share-links` | POST | `{ password? }` → ShareLink 생성 |
| `GET /workspaces/:id/share-links` | GET | 기존 링크 조회 |
| `DELETE /share-links/:linkId` | DELETE | 링크 폐기 |

---

## 10. MYP-01 — 마이페이지 & 채널 등록

| 항목 | 내용 |
|------|------|
| **경로** | `app/mypage.tsx` |
| **목적** | 프로필 관리, 뱃지 확인, 채널 정보 등록, 역할 전환, 설정 |
| **구현 상태** | ✅ 완료 |

### 10.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| MYP-FR-01 | 프로필 카드 (아바타 + 이름 + 역할 배지 + 이메일) | P0 | ✅ |
| MYP-FR-02 | 활동 통계 (워크스페이스·촬영 컷·뱃지) | P0 | ✅ |
| MYP-FR-03 | 내 채널 등록 (Instagram/YouTube/TikTok/블로그) | P1 | ✅ |
| MYP-FR-04 | 채널 편집 모달 (하단 슬라이드업) | P1 | ✅ |
| MYP-FR-05 | 채널 연결 해제 | P2 | ✅ |
| MYP-FR-06 | 뱃지 시스템 (10종, 5열 그리드, 달성률 바) | P1 | ✅ |
| MYP-FR-07 | 알림 토글 | P2 | ✅ |
| MYP-FR-08 | 역할 전환 (creator ↔ advertiser) | P0 | ✅ |
| MYP-FR-09 | 프로필 편집 → PRF-EDIT-01 이동 | P1 | ✅ |
| MYP-FR-10 | 내 신청 현황 → MY-APP-01 이동 | P1 | ✅ |
| MYP-FR-11 | 로그아웃 (Alert 확인) | P0 | ✅ |
| MYP-FR-12 | 회원탈퇴 (Alert 확인) | P2 | ⚠️ UI만 |

### 10.2 채널 등록 플랫폼

| 플랫폼 | 색상 | 입력 항목 |
|--------|------|---------|
| Instagram | `#E1306C` | @아이디, 팔로워 수 |
| YouTube | `#FF0000` | 채널명, 팔로워 수 |
| TikTok | `#69C9D0` | @아이디, 팔로워 수 |
| 블로그 | `#03C75A` | 블로그명/URL, 팔로워 수 |

### 10.3 뱃지 목록 (10종)

| ID | 이름 | 획득 조건 | 아이콘 | 색상 |
|----|------|---------|--------|------|
| `first_shot` | 첫 셔터 | 처음으로 사진 촬영 | `camera` | `#FF6B6B` |
| `perfect_workspace` | 완벽 완료 | 워크스페이스 100% 완료 | `trophy` | `#FFD700` |
| `food_master` | 푸드 크리에이터 | 맛집 5개 완료 | `restaurant` | `#FF6B6B` |
| `product_master` | 제품 전문가 | 제품 5개 완료 | `cube` | `#4ECDC4` |
| `travel_master` | 여행 블로거 | 여행 5개 완료 | `airplane` | `#FFB347` |
| `web_drop` | Web Drop | Web Drop 첫 PC 연동 | `desktop-outline` | `#7B61FF` |
| `signature` | 시그니처 아티스트 | 시그니처 샷 첫 저장 | `layers` | `#FF69B4` |
| `ai_analyst` | AI 분석가 | AI 캠페인 분석 첫 사용 | `sparkles` | `#39D0FF` |
| `power_creator` | 파워 크리에이터 | 워크스페이스 10개 완료 | `flash` | `#FF4500` |
| `pro` | QUDO Pro | Pro 플랜 구독 중 | `diamond` | `#FFD700` |

### 10.4 역할 전환

| 현재 역할 | 버튼 텍스트 | 전환 동작 |
|---------|-----------|---------|
| `creator` | 광고주 모드로 전환 | `userStore.setRole('advertiser')` + `router.replace('/(tabs)/campaign')` |
| `advertiser` | 크리에이터로 전환 | `userStore.setRole('creator')` |

### 10.5 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /users/me` | GET | 프로필 + 통계 + 채널 + 뱃지 조회 |
| `PATCH /users/me/channels` | PATCH | 채널 정보 저장 |
| `DELETE /users/me/channels/:platform` | DELETE | 채널 연결 해제 |
| `PATCH /users/me/role` | PATCH | 역할 전환 |
| `POST /auth/logout` | POST | 로그아웃 |
| `DELETE /users/me` | DELETE | 회원탈퇴 |

---

## 11. PRF-EDIT-01 — 프로필 편집

| 항목 | 내용 |
|------|------|
| **경로** | `app/profile-edit/index.tsx` |
| **목적** | 사용자 기본 프로필 정보 수정 |
| **구현 상태** | ✅ 완료 |

### 11.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| PRF-FR-01 | 이름 편집 (필수, 최대 20자) | P0 | ✅ |
| PRF-FR-02 | 이메일 편집 (필수, email 키보드) | P0 | ✅ |
| PRF-FR-03 | 소개 편집 (선택, 최대 100자, 글자 수 카운터) | P1 | ✅ |
| PRF-FR-04 | 연결 계정 읽기 전용 표시 | P1 | ✅ |
| PRF-FR-05 | 변경사항 없으면 저장 버튼 비활성화 | P0 | ✅ |
| PRF-FR-06 | 변경사항 있을 때 뒤로가기 → Alert 경고 | P1 | ✅ |
| PRF-FR-07 | 저장 중 로딩 표시 ("저장 중...") | P1 | ✅ |
| PRF-FR-08 | 아바타 사진 변경 | P2 | ❌ 미구현 |

### 11.2 유효성 검사

```typescript
const isDirty = displayName !== INITIAL.displayName
  || email !== INITIAL.email
  || bio !== INITIAL.bio;
const canSave = displayName.trim() && email.trim() && isDirty;
```

### 11.3 폼 필드 상세

| 필드 | 필수 | 제약 | 키보드 |
|------|------|------|--------|
| 이름 | ✅ | 최대 20자 | default |
| 이메일 | ✅ | email 형식 | email-address |
| 소개 | ❌ | 최대 100자 + 카운터 | default, multiline |
| 연결 계정 | 읽기 전용 | — | — |

### 11.4 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `PATCH /users/me/profile` | PATCH | `{ displayName, email, bio }` |
| `POST /users/me/avatar` | POST | 아바타 이미지 업로드 |

---

## 12. CPG-01 — 캠페인 찾기 (목록·검색)

| 항목 | 내용 |
|------|------|
| **경로** | `app/(tabs)/campaign.tsx` (creator 역할) |
| **목적** | 광고주 캠페인 탐색·필터링 및 상세 진입 |
| **구현 상태** | ✅ 완료 |

### 12.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| CPG01-FR-01 | 타입 세그먼트 필터 (전체/배송/방문) | P0 | ✅ |
| CPG01-FR-02 | 카테고리 칩 필터 (7종 가로 스크롤) | P0 | ✅ |
| CPG01-FR-03 | 검색 (브랜드명 + 캠페인명 실시간 필터링) | P1 | ✅ |
| CPG01-FR-04 | 캠페인 카드 목록 (FlatList) | P0 | ✅ |
| CPG01-FR-05 | D-Day 표시 (마감 3일 이내 빨간색 강조) | P1 | ✅ |
| CPG01-FR-06 | 경쟁률 바 (신청자/모집인원×10) | P1 | ✅ |
| CPG01-FR-07 | 카드 탭 → 캠페인 상세 이동 | P0 | ✅ |
| CPG01-FR-08 | 빈 상태 메시지 (필터 기반) | P2 | ✅ |
| CPG01-FR-09 | 페이지네이션 / 무한 스크롤 | P2 | ❌ 미구현 |

### 12.2 필터 체계 (AND 조건)

| 필터 | 옵션 | 적용 |
|------|------|------|
| 타입 | `all` \| `delivery` \| `visit` | 상단 세그먼트 |
| 카테고리 | `all` \| `FOOD` \| `PRODUCT` \| `BEAUTY` \| `TRAVEL` \| `LIFESTYLE` \| `DETAIL_PAGE` | 가로 칩 스크롤 |
| 검색어 | 자유 텍스트 | `title.includes()` 또는 `brand.includes()` |

### 12.3 캠페인 카테고리 색상

| 카테고리 | 색상 | 아이콘 |
|---------|------|--------|
| `FOOD` | `#FF6B6B` | `restaurant` |
| `PRODUCT` | `#4ECDC4` | `cube` |
| `BEAUTY` | `#C9A7EB` | `sparkles` |
| `TRAVEL` | `#FFB347` | `airplane` |
| `LIFESTYLE` | `#7B61FF` | `heart` |
| `DETAIL_PAGE` | `#39D0FF` | `document-text` |

### 12.4 캠페인 카드 정보

| 요소 | 설명 |
|------|------|
| 썸네일 스트라이프 | 좌측 accent 색상 바 |
| D-Day 배지 | 마감까지 남은 일수 (≤3일: 빨간색) |
| 타입 배지 | 배송 / 방문 |
| 제목 | 최대 2줄, 22px bold |
| 브랜드명 | 13px, 아이콘 |
| 리워드 | 혜택 내용 |
| 신청 현황 | 신청자수/모집인원 + 경쟁률 바 |
| 상태 | 모집 중 / 마감 / 발표 완료 |

### 12.5 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /campaigns` | GET | `?type=&category=&search=&page=&limit=` |
| `GET /campaigns/:id` | GET | 캠페인 단건 조회 |

---

## 13. CPG-02 — 캠페인 상세 & 신청

| 항목 | 내용 |
|------|------|
| **경로** | `app/campaign/[id].tsx` |
| **목적** | 캠페인 조건 확인 및 신청, 당선 시 워크스페이스 자동 생성 안내 |
| **구현 상태** | ✅ 완료 |

### 13.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| CPG02-FR-01 | 히어로 영역 (아이콘 80×80 + D-Day 칩) | P0 | ✅ |
| CPG02-FR-02 | 혜택 카드 (아이콘 + 내용 강조) | P0 | ✅ |
| CPG02-FR-03 | 정보 그리드: 모집 인원 / 신청 현황 / 마감일 | P0 | ✅ |
| CPG02-FR-04 | 경쟁률 프로그레스 바 + 비율 텍스트 | P1 | ✅ |
| CPG02-FR-05 | 참여 조건 불릿 리스트 | P1 | ✅ |
| CPG02-FR-06 | 당선 시 워크스페이스 투두 프리뷰 | P1 | ✅ |
| CPG02-FR-07 | 신청하기 → Alert 확인 → `applicationStore.apply()` | P0 | ✅ |
| CPG02-FR-08 | 신청 완료 후 상태 배지 전환 | P0 | ✅ |
| CPG02-FR-09 | 신청 후 "신청 현황 보기" 2차 Alert | P2 | ✅ |

### 13.2 신청 플로우

```
신청하기 버튼 탭
  └─ Alert "신청할까요? 당선 시 워크스페이스 자동 생성됩니다"
       ├─ 취소 → 이전 상태 유지
       └─ 신청하기
            └─ applicationStore.apply(campaign)
                 └─ 2차 Alert "신청 완료! 신청 현황을 확인하세요"
                      └─ "신청 현황 보기" → router.push('/my-applications')
```

### 13.3 워크스페이스 자동 생성 규칙 (당선 시)

| 항목 | 매핑 |
|------|------|
| 제목 | `[브랜드명] [캠페인명]` |
| 카테고리 | `Campaign.category` → `WorkspaceCategory` |
| 투두 | `Campaign.todoPreset[]` → Todo 배열 |
| 요구사항 | `Campaign.requirements` → 워크스페이스 메모 |

### 13.4 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /campaigns/:id/apply` | POST | 캠페인 신청 |
| `GET /campaigns/:id/application` | GET | 내 신청 상태 조회 |

---

## 14. MY-APP-01 — 내 신청 현황

| 항목 | 내용 |
|------|------|
| **경로** | `app/my-applications/index.tsx` |
| **목적** | 캠페인 신청 현황 확인 + 당선 시 워크스페이스 바로가기 |
| **구현 상태** | ✅ 완료 |

### 14.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| APP-FR-01 | 상단 요약 칩 (전체·검토 중·당선·미당선 카운트) | P0 | ✅ |
| APP-FR-02 | 필터 탭 (4종) | P0 | ✅ |
| APP-FR-03 | 신청 카드 (상태·타입·D-Day·제목·브랜드·리워드·날짜) | P0 | ✅ |
| APP-FR-04 | 당선 시 "워크스페이스 바로가기" 버튼 활성화 | P0 | ✅ |
| APP-FR-05 | 미당선 시 안내 배너 | P1 | ✅ |
| APP-FR-06 | 빈 상태: "캠페인 찾기" 이동 버튼 | P2 | ✅ |

### 14.2 필터·상태 배지

| 상태 | 필터값 | 배지 색상 | 설명 |
|------|--------|---------|------|
| 검토 중 | `applied` | `#39D0FF` | 신청 후 대기 |
| 당선 | `selected` | `#10B981` | 워크스페이스 생성됨 |
| 미당선 | `rejected` | `#FF6B6B` | 불합격 |

### 14.3 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /users/me/applications` | GET | 내 신청 목록 |
| `GET /users/me/applications?status=selected` | GET | 상태별 필터링 |

---

## 15. SHR-03 — PC 워크스페이스 뷰어

| 항목 | 내용 |
|------|------|
| **경로** | `app/drop/[token].tsx` → `viewer.web.tsx` (웹) / `viewer.tsx` (모바일) |
| **목적** | PC 브라우저에서 촬영 에셋 확인·다운로드·드래그 활용 |
| **구현 상태** | ✅ 완료 (Mock 데이터, API 미연동) |

### 15.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| SHR03-FR-01 | 플랫폼 분기 (web → 뷰어, mobile → 안내) | P0 | ✅ |
| SHR03-FR-02 | 비밀번호 게이트 (설정된 경우) | P0 | ✅ |
| SHR03-FR-03 | 비밀번호 오류 메시지 + 1.5초 초기화 | P1 | ✅ |
| SHR03-FR-04 | 유효기간 72시간 표시 | P1 | ✅ |
| SHR03-FR-05 | 에셋 그리드 (CSS Grid, 반응형) | P0 | ✅ |
| SHR03-FR-06 | 사이드바 필터 (전체 / 투두별) | P0 | ✅ |
| SHR03-FR-07 | 이미지 드래그 앤 드롭 (블로그 에디터 호환) | P0 | ✅ |
| SHR03-FR-08 | 이미지 클립보드 복사 | P0 | ✅ |
| SHR03-FR-09 | 개별 이미지 다운로드 | P0 | ✅ |
| SHR03-FR-10 | 전체 이미지 일괄 다운로드 | P1 | ✅ (순차, ZIP 미적용) |
| SHR03-FR-11 | 라이트박스 (전체화면 모달, 좌우 이동) | P1 | ✅ |
| SHR03-FR-12 | hover 시 "드래그로 복사" 힌트 배지 | P2 | ✅ |
| SHR03-FR-13 | jszip 활용 ZIP 다운로드 | P3 | ❌ 미구현 |

### 15.2 사이드바 구성

| 요소 | 내용 |
|------|------|
| QUDO 로고 | 상단 고정 |
| 워크스페이스 정보 | 브랜드명, 제목, 진행률 바 |
| 필터 목록 | 전체 + 투두별 카운트 |
| 다운로드 버튼 | 전체 다운로드 (accent 색상) |
| 힌트 텍스트 | 드래그 사용법, 유효기간 |

### 15.3 드래그 앤 드롭 구현

```typescript
// 카드에 onDragStart 설정
onDragStart={(e) => {
  e.dataTransfer.setData('text/uri-list', url);
  e.dataTransfer.setData('text/plain', url);
  e.dataTransfer.effectAllowed = 'copy';
}}
```

### 15.4 라이트박스

| 기능 | 설명 |
|------|------|
| 이미지 표시 | 전체화면 Modal |
| 네비게이션 | 좌우 화살표 + 키보드 좌·우 키 |
| 하단 썸네일 | 스트립 (현재 선택 = accent 테두리) |
| 상단 바 | 카운터 · 투두 라벨 · URL 복사 · 다운로드 · 닫기 |

### 15.5 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /drop/:token/verify` | POST | `{ password }` → 인증 |
| `GET /drop/:token/assets` | GET | 에셋 목록 (투두 그룹핑) |
| `GET /drop/:token/assets/:assetId` | GET | 에셋 원본 URL |

---

## 16. CPG-ADV-01 — 광고주 캠페인 관리

| 항목 | 내용 |
|------|------|
| **경로** | `app/(tabs)/campaign.tsx` (advertiser 역할) |
| **목적** | 광고주의 캠페인 목록 관리 + 신청자 확인 |
| **구현 상태** | ✅ 완료 |

### 16.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| ADV01-FR-01 | 내 캠페인 목록 표시 | P0 | ✅ |
| ADV01-FR-02 | 통계 요약 (모집 중 N개 · 총 신청자 N명) | P0 | ✅ |
| ADV01-FR-03 | 캠페인 등록 버튼 → CPG-ADV-02 | P0 | ✅ |
| ADV01-FR-04 | 마이페이지 버튼 | P1 | ✅ |
| ADV01-FR-05 | 캠페인 카드: 상태 배지 + D-Day + 신청 현황 + 경쟁률 바 | P0 | ✅ |
| ADV01-FR-06 | 신청자 보기 / 당선자 선정 버튼 → CPG-ADV-03 | P0 | ✅ |
| ADV01-FR-07 | 발표 완료 시 "워크스페이스 자동 생성됨" 배너 | P2 | ✅ |

### 16.2 캠페인 상태 배지

| 상태 | 색상 | 설명 |
|------|------|------|
| `recruiting` | 청록 (accent) | 모집 중 |
| `closed` | 회색 | 마감 |
| `announced` | 황금 | 당선 발표 완료 |

### 16.3 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /advertiser/campaigns` | GET | 내 등록 캠페인 목록 |
| `GET /advertiser/campaigns/stats` | GET | 통계 요약 |

---

## 17. CPG-ADV-02 — 캠페인 등록

| 항목 | 내용 |
|------|------|
| **경로** | `app/advertiser/create-campaign.tsx` |
| **목적** | 광고주가 새 캠페인을 등록 |
| **구현 상태** | ✅ UI 완료, API 미연동 |

### 17.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| ADV02-FR-01 | 캠페인 타입 선택 (배송형/방문형 카드) | P0 | ✅ |
| ADV02-FR-02 | 카테고리 6종 칩 선택 | P0 | ✅ |
| ADV02-FR-03 | 브랜드명 입력 (필수) | P0 | ✅ |
| ADV02-FR-04 | 캠페인 제목 입력 (필수) | P0 | ✅ |
| ADV02-FR-05 | 제공 혜택 입력 (필수) | P0 | ✅ |
| ADV02-FR-06 | 모집 인원 입력 (필수, 숫자) | P0 | ✅ |
| ADV02-FR-07 | 신청 마감일 입력 (필수, YYYY-MM-DD) | P0 | ✅ |
| ADV02-FR-08 | 방문 장소 입력 (방문형만 필수) | P1 | ✅ |
| ADV02-FR-09 | 참여 조건 (줄바꿈 구분 textarea) | P1 | ✅ |
| ADV02-FR-10 | 투두 프리셋 (크리에이터 워크스페이스용) | P1 | ✅ |
| ADV02-FR-11 | 등록 조건: 모든 필수 필드 입력 시 활성화 | P0 | ✅ |
| ADV02-FR-12 | 등록 완료 → Alert + router.back() | P0 | ✅ |

### 17.2 폼 필드 상세

| 필드 | 필수 | 타입 | 조건 |
|------|------|------|------|
| 캠페인 타입 | ✅ | 카드 선택 | `'delivery' \| 'visit'` |
| 카테고리 | ✅ | 칩 선택 | 6종 중 1개 |
| 브랜드명 | ✅ | 텍스트 | — |
| 캠페인 제목 | ✅ | 텍스트 | — |
| 제공 혜택 | ✅ | 텍스트 | — |
| 모집 인원 | ✅ | 숫자 | numeric 키보드 |
| 신청 마감일 | ✅ | 날짜 | `YYYY-MM-DD` |
| 방문 장소 | 방문형만 | 텍스트 | 방문형 선택 시 표시 |
| 참여 조건 | ❌ | textarea | 줄바꿈 구분 |
| 투두 프리셋 | ❌ | textarea | 줄바꿈 구분 |

### 17.3 유효성 검사

```typescript
const canSubmit = title.trim() && brand.trim() && reward.trim()
  && slots.trim() && deadline.trim() && category !== null;
```

### 17.4 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `POST /advertiser/campaigns` | POST | 캠페인 등록 |

---

## 18. CPG-ADV-03 — 신청자 목록 & 당선자 선정

| 항목 | 내용 |
|------|------|
| **경로** | `app/advertiser/applicants/[id].tsx` |
| **파라미터** | `id` (캠페인 ID), `title` (제목), `mode=select` (선정 모드) |
| **목적** | 신청자 검토, 당선/탈락 처리, 당선 발표 |
| **구현 상태** | ✅ 완료 |

### 18.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| ADV03-FR-01 | 필터 통계 (전체·검토 중·당선·탈락 카운트) | P0 | ✅ |
| ADV03-FR-02 | 신청자 카드 (이름·핸들·플랫폼·팔로워·메모) | P0 | ✅ |
| ADV03-FR-03 | 빠른 당선 버튼 (카드 내) | P0 | ✅ |
| ADV03-FR-04 | 신청자 상세 모달 (바텀 시트) | P1 | ✅ |
| ADV03-FR-05 | 당선 확인 모달 (중앙 다이얼로그) | P1 | ✅ |
| ADV03-FR-06 | 탈락 처리 (Alert 확인) | P1 | ✅ |
| ADV03-FR-07 | 당선 발표 → 워크스페이스 자동 생성 | P0 | ✅ |
| ADV03-FR-08 | 빈 상태 메시지 | P2 | ✅ |

### 18.2 필터 탭

| 탭 | 필터값 | 설명 |
|----|--------|------|
| 전체 | `all` | 모든 신청자 |
| 검토 중 | `pending` | 대기 상태 |
| 당선 | `selected` | 선정 완료 |
| 탈락 | `rejected` | 거절 |

### 18.3 신청자 카드 구성

| 요소 | 설명 |
|------|------|
| 아바타 | 이니셜 원형 (accent 색상) |
| 이름 + 핸들 | `displayName` · `@handle` |
| 플랫폼 배지 | 아이콘 + 팔로워 수 (컬러 칩) |
| 카테고리 | 관심 분야 칩 리스트 |
| 메모 | 1줄 미리보기 (ellipsis) |
| 액션 | 빠른 당선 / 상세 보기 |

### 18.4 모달 구성

#### ApplicantDetailModal (바텀 시트)
| 섹션 | 내용 |
|------|------|
| 스탯 그리드 | 팔로워 수, 카테고리 수, 신청일 |
| 전체 메모 | 전문 표시 |
| 액션 | "당선 선정" / "탈락" 버튼 |

#### SelectConfirmModal (중앙 다이얼로그)
| 섹션 | 내용 |
|------|------|
| 크리에이터 정보 | 이름, 플랫폼, 팔로워 |
| 확인 텍스트 | "이 크리에이터를 당선 선정하시겠습니까?" |
| 액션 | "선정" / "취소" 버튼 |

### 18.5 당선 발표 플로우

```
"당선자 N명 발표하기" 버튼 탭 (하단 고정)
  ├─ selectedCount === 0 → Alert "당선자를 먼저 선정해주세요"
  └─ selectedCount > 0 → Alert "N명의 당선자를 발표합니다"
       └─ 확인
            └─ 당선자마다:
                 ├─ workspaceStore.createFromCampaign()
                 └─ applicationStore.select(campaignId, workspaceId)
            └─ Alert "발표 완료" → router.back()
```

### 18.6 백엔드 API (예정)

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /advertiser/campaigns/:id/applicants` | GET | 신청자 목록 |
| `PATCH /advertiser/campaigns/:id/applicants/:appId` | PATCH | 당선/탈락 처리 |
| `POST /advertiser/campaigns/:id/announce` | POST | 당선 발표 (일괄 처리) |

---

## 부록 A. 백엔드 API 전체 목록 (예정)

| 도메인 | 엔드포인트 | 메서드 | 화면 |
|--------|-----------|--------|------|
| **인증** | `/auth/login` | POST | LGN-01 |
| | `/auth/refresh` | POST | 공통 |
| | `/auth/logout` | POST | MYP-01 |
| | `/auth/check` | GET | INTRO |
| **사용자** | `/users/me` | GET | MYP-01 |
| | `/users/me/profile` | PATCH | PRF-EDIT-01 |
| | `/users/me/avatar` | POST | PRF-EDIT-01 |
| | `/users/me/channels` | PATCH | MYP-01 |
| | `/users/me/channels/:platform` | DELETE | MYP-01 |
| | `/users/me/role` | PATCH | MYP-01 |
| | `/users/me` | DELETE | MYP-01 |
| | `/users/me/applications` | GET | MY-APP-01 |
| **워크스페이스** | `/workspaces` | GET | WRK-01 |
| | `/workspaces` | POST | WRK-02 |
| | `/workspaces/:id` | GET | TDO-01 |
| | `/workspaces/:id/status` | PATCH | TDO-01 |
| | `/workspaces/:id` | DELETE | TDO-01 |
| | `/workspaces/:id/signature` | GET/PATCH | CAM-02 |
| **투두** | `/workspaces/:id/todos` | GET | TDO-01 |
| | `/workspaces/:id/todos` | POST | TDO-01 |
| | `/workspaces/:id/todos/:todoId` | PATCH | TDO-01, CAM-01 |
| | `/workspaces/:id/todos/:todoId` | DELETE | TDO-01 |
| | `/workspaces/:id/todos/:todoId/images` | POST | CAM-01 |
| **Web Drop** | `/workspaces/:id/share-links` | GET/POST | SHR-01 |
| | `/share-links/:linkId` | DELETE | SHR-01 |
| | `/drop/:token/verify` | POST | SHR-03 |
| | `/drop/:token/assets` | GET | SHR-03 |
| **AI** | `/ai/parse-campaign` | POST | WRK-02 |
| | `/ai/match-todo` | POST | CAM-01 |
| **캠페인** | `/campaigns` | GET | CPG-01 |
| | `/campaigns/:id` | GET | CPG-02 |
| | `/campaigns/:id/apply` | POST | CPG-02 |
| | `/campaigns/:id/application` | GET | CPG-02 |
| **광고주** | `/advertiser/campaigns` | GET | CPG-ADV-01 |
| | `/advertiser/campaigns` | POST | CPG-ADV-02 |
| | `/advertiser/campaigns/stats` | GET | CPG-ADV-01 |
| | `/advertiser/campaigns/:id/applicants` | GET | CPG-ADV-03 |
| | `/advertiser/campaigns/:id/applicants/:appId` | PATCH | CPG-ADV-03 |
| | `/advertiser/campaigns/:id/announce` | POST | CPG-ADV-03 |

---

## 부록 B. 미구현 기능 우선순위 (Backlog)

| 우선순위 | 화면 | 기능 | 설명 |
|---------|------|------|------|
| P0 | LGN-01 | 소셜 SDK 연동 | 카카오/네이버/Google/Apple 실 로그인 |
| P0 | 공통 | 백엔드 REST API 구축 | Spring Boot 기반 서버 |
| P0 | CAM-01 | S3 이미지 업로드 | presigned URL 기반 업로드 |
| P1 | WRK-02 | AI 캠페인 파싱 연동 | `parseCampaignGuide()` Gemini 연동 |
| P1 | SHR-01 | 실제 링크 생성 | 서버 토큰 발급 + DB 저장 |
| P1 | SHR-03 | 실시간 동기화 | WebSocket/SSE 기반 에셋 실시간 반영 |
| P2 | INTRO | 자동 로그인 | 토큰 유효성 체크 → 대시보드 직행 |
| P2 | WRK-01 | Pull-to-refresh | FlatList 새로고침 |
| P2 | CPG-01 | 무한 스크롤 | 페이지네이션 기반 |
| P2 | PRF-EDIT-01 | 아바타 사진 변경 | 이미지 피커 + S3 업로드 |
| P3 | CAM-01 | AI 마스킹 | 얼굴/번호판 자동 블러 |
| P3 | SHR-03 | ZIP 일괄 다운로드 | jszip 패키지 적용 |
| P3 | TDO-01 | 투두 드래그 정렬 | 순서 변경 |

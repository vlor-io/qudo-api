# QUDO 개발 히스토리

---

## [Phase 1] 기획 및 컨셉 수립 (2026-03-24)
- **서비스명 확정**: **QUDO (큐도)**
- **핵심 가치**: 
  1. 촬영 누락 방지 (카테고리/AI 추천)
  2. 일관된 구도 (시그니처 샷)
  3. PC 에디터로의 즉시 전송 (Web Drop)

## [Phase 2] 상세 설계 및 UI 디자인 (2026-03-24)
- **PRD/Spec 작성**: AI 캠페인 분석, 제품/상세페이지 카테고리 추천 로직 정의.
- **UI 와이어프레임**: 8종의 핵심 화면 SVG 자산 생성.
- **고해상도 디자인**: QUDO 브랜드 가이드가 적용된 Professional 디자인(High-fidelity) 완료.

## [Phase 3] 프로토타이핑 (2026-03-24)
- **Interactive MVP**: `index_pro.html`을 통해 전체 사용자 여정(User Journey) 시뮬레이션 구현.
- **시인성 개선**: 버튼 힌트 모드 및 호버 효과 적용으로 사용성 검증 준비 완료.

## [Phase 4] React Native 앱 개발 착수 (2026-04-02)

### 프로젝트 셋업
- Expo SDK 54 기반 React Native 프로젝트 초기화 (expo-router v6, New Architecture 활성화)
- 스타터 템플릿 코드 제거 (explore 탭, 스타터 컴포넌트 등)
- 기능별 폴더 컨벤션 수립 (`features/`, `services/`, `stores/`, `types/`)

### 구현 완료 화면 (총 9개)

| 화면 ID | 화면명 | 주요 구현 내용 |
|---------|--------|--------------|
| — | 인트로 | 로고·슬로건 페이드인 애니메이션, 2.4s 후 자동 이동 |
| LGN-01 | 소셜 로그인 | 카카오·네이버·Google·Apple(iOS 전용) 4종 버튼 |
| WRK-01 | 대시보드 | 워크스페이스 목록, 진행 중/완료/보관함 필터 탭, FAB |
| WRK-02 | 워크스페이스 생성 | 카테고리 칩 선택, 추천 투두 프리뷰, AI 캠페인 분석 섹션 |
| TDO-01 | 투두리스트 | 체크박스 토글(애니메이션), 진행률 바, 카메라 진입 버튼, 다중 이미지 썸네일 스트립, 풀스크린 뷰어(스와이프) |
| CAM-01 | 스마트 카메라 | expo-camera, 삼분할선 오버레이, AI Shot Verification UI, 자동 체크, 다중 촬영, 촬영 수 표시 |
| CAM-02 | 시그니처 샷 | 갤러리 이미지 선택, 투명도 조절, 실시간 프리뷰 |
| SHR-01 | Web Drop 링크 발급 | 링크 생성, 클립보드 복사, 비밀번호 보호, 시스템 공유 |
| MYP-01 | 마이페이지 | 프로필, 뱃지 10종 모음, 설정, 계정 관리 |

### 추가된 패키지
- `expo-camera` — 카메라 뷰 및 촬영
- `expo-image-picker` — 갤러리 이미지 선택 (시그니처 샷)
- `expo-clipboard` — 클립보드 복사
- `expo-sharing` — 시스템 공유 시트

## [Phase 4 - 추가 기능] 다중 촬영·자동 체크·이미지 뷰어 (2026-04-02)

### 핵심 변경 사항

#### 전역 상태 스토어 도입 (`stores/todo-store.ts`)
- 카메라 화면 → 투두리스트 화면 간 실시간 상태 공유를 위한 모듈 레벨 옵저버블 스토어 신설
- `subscribe()` / `notify()` 패턴으로 React 상태와 연동
- TDO-01에서 `useFocusEffect` + `useEffect` 이중 구독으로 카메라 복귀 시 즉시 반영

#### 다중 이미지 지원 (`Todo.images: string[]`)
- `Todo.imageUri?: string` → `Todo.images: string[]` 로 타입 변경
- 체크리스트 1개당 여러 장 촬영 가능
- `todoStore.addImage()` — 이미지 추가 + 자동 COMPLETED
- `todoStore.removeImage()` — 이미지 삭제 + 이미지 전부 없으면 자동 PENDING

#### 자동 체크 (Shot Verification)
- 셔터 → `todoStore.addImage(workspaceId, todoId, uri)` 호출로 해당 투두 즉시 COMPLETED
- Gemini Flash API 연동 위치 예약 (`// TODO:` 주석)
- "AI 분석 중…" → "자동 체크 완료!" 배너 애니메이션

#### CAM-01 다중 촬영 UX
- `shotCount` 상태로 이번 세션 촬영 수 추적
- 하단 정보 바: 촬영 수 배지 + 첫 촬영 후 "완료" 버튼 노출
- 셔터 비활성화(opacity) 중 AI 분석 진행

#### TDO-01 이미지 뷰어
- 썸네일 스트립: 투두 항목 우측에 최대 2장 인라인 표시, 초과 시 `+N` 오버레이 배지
- 풀스크린 뷰어 (Modal):
  - `FlatList` 수평 페이징으로 스와이프 이동
  - 화살표 버튼 (`scrollToIndex`) 병행 제공
  - 하단 점(dot) 인디케이터 (현재 위치 = 흰색 길쭉 점)
  - 상단 `{현재} / {전체}` 카운터
  - 개별 이미지 삭제 버튼 (휴지통 아이콘)
  - "한 장 더" 버튼 → 카메라 재진입

### 미구현 (추후 개발)
- **SHR-03** PC 워크스페이스 뷰어 (Next.js 별도 레포)
- **AI 연동**: Gemini API 실제 연동 (현재 목 데이터로 대체)
- **Backend API**: 워크스페이스·투두·에셋 CRUD
- **소셜 로그인 SDK**: 카카오·네이버·Google·Apple 실제 연동
- **AWS S3**: 에셋 업로드 및 Web Drop 실시간 동기화

---

## [Phase 5] 캠페인 찾기 기능 추가 (2026-04-03)

### 배경
크리에이터가 앱 안에서 광고 협업 기회를 직접 탐색·신청하고, 당선 시 워크스페이스가 자동 생성되는 end-to-end 플로우 구현.

### 네비게이션 구조 변경
- `(tabs)/_layout.tsx`: Stack → **Tabs** 네비게이터로 교체 (하단 탭 바 2개)
  - 탭 1: 워크스페이스 (기존 대시보드, `grid-outline` 아이콘)
  - 탭 2: 캠페인 찾기 (`megaphone-outline` 아이콘)
- `app/_layout.tsx`: `campaign` 라우트 `headerShown: false` 등록 (중복 헤더 버그 수정)
- 대시보드 필터 탭에서 "보관함" 제거 (사용 빈도 낮음)

### 구현 완료 화면

| 화면 ID | 화면명 | 주요 구현 내용 |
|---------|--------|--------------|
| CPG-01 | 캠페인 찾기 | 배송/방문 세그먼트, 6개 카테고리 칩, 실시간 검색, D-Day·경쟁률 카드 |
| CPG-02 | 캠페인 상세·신청 | 혜택 카드, 참여 조건 리스트, 당선 시 워크스페이스 투두 프리뷰, Alert 신청 플로우 |

### 신규 파일
- `features/campaign/types.ts` — `Campaign`, `CampaignType`, `CampaignCategory`, `ApplicationStatus` 타입
- `app/(tabs)/campaign.tsx` — CPG-01
- `app/campaign/_layout.tsx` — Stack 레이아웃
- `app/campaign/[id].tsx` — CPG-02

### 캠페인 타입 구조
- **배송형** (`delivery`): 제품을 크리에이터에게 발송 → 온라인 리뷰 콘텐츠 생성
- **방문형** (`visit`): 크리에이터가 오프라인 장소 방문 → 장소 기반 콘텐츠 생성
- **카테고리**: BEAUTY, PRODUCT, FOOD, TRAVEL, LIFESTYLE, DETAIL_PAGE

### 워크스페이스 자동 생성 설계 (API 연동 예정)
- 당선 알림 수신 → `Campaign.todoPreset` 배열로 투두 자동 생성
- 제목: `[브랜드명] [캠페인명]`, 메모: `Campaign.requirements` 삽입

### 미구현 (추후 개발)
- **Backend API**: `POST /campaigns/:id/apply`, 당선자 선정, 워크스페이스 자동 생성 트리거
- **푸시 알림**: 당선 결과 알림 수신

---

## [Phase 6] Web Drop PC 뷰어 구현 (2026-04-03)

### 배경
별도 Next.js 레포 없이 이 Expo 프로젝트 내에서 `npm run web`으로 PC 뷰어를 제공하기로 결정.
`Platform.OS === 'web'` 분기로 웹/모바일 구현을 파일 단위로 분리.

### 신규 파일
- `app/drop/_layout.tsx` — Stack 레이아웃
- `app/drop/[token].tsx` — 진입점 (목 데이터, 플랫폼 분기)
- `app/drop/viewer.web.tsx` — 웹 전용 뷰어 (모든 기능)
- `app/drop/viewer.native.tsx` — 모바일 접근 안내

### 구현된 기능
| 기능 | 구현 방식 |
|------|----------|
| 비밀번호 게이트 | 입력 → 목 검증, 오류 애니메이션, 유효기간 표시 |
| 에셋 그리드 | CSS Grid `auto-fill minmax(200px, 1fr)` |
| 투두별 필터 | 사이드바 필터 칩, AND 조건 필터링 |
| 드래그 앤 드롭 | `dataTransfer` `text/uri-list` — 에디터로 직접 드래그 |
| 클립보드 복사 | `navigator.clipboard.writeText()` |
| 개별 다운로드 | `<a download>` 태그 |
| 전체 다운로드 | 순차 다운로드 (TODO: jszip으로 ZIP 교체) |
| 라이트박스 | Modal 전체화면, 좌우 화살표, 하단 썸네일 스트립 |
| 워크스페이스 진행률 | 사이드바 투두 완료율 프로그레스 바 |

### 파일명 수정 (폴백 오류 해결)
- `viewer.native.tsx` → `viewer.tsx` — Metro가 `.web.tsx` 파일의 폴백으로 인식하도록 수정

### 미구현 (추후 개발)
- **Backend API**: `GET /drop/:token`, `POST /drop/:token/verify`
- **AWS S3 실제 이미지 URL** 연동 (현재 picsum 목 이미지)
- **ZIP 다운로드**: `npm install jszip file-saver` 후 전체 ZIP 교체
- **Vercel 배포**: `npm run web` 빌드 → Vercel 연결

---

## [Phase 7] 광고주 모드 구현 (2026-04-03)

### 배경
크리에이터와 광고주를 같은 앱 내에서 역할 전환으로 분리. 별도 앱 개발 없이 마이페이지에서 전환 가능.

### 역할(Role) 시스템
- `stores/user-store.ts` — `UserRole: 'creator' | 'advertiser'` 전역 상태 (observer 패턴)
- `features/mypage/types.ts` — `UserProfile.role` 필드 추가

### 마이페이지 변경
- 프로필 배지: `Free` / `Pro` → 광고주 모드 시 `광고주` 배지 (보라색) 로 전환
- "광고주 모드로 전환" / "크리에이터로 전환" 메뉴 항목 추가 (설정 섹션)
- 전환 시 Alert 확인 → `userStore.setRole()` 호출

### 탭 네비게이션 역할 분기
| 역할 | 워크스페이스 탭 | 캠페인 탭 |
|------|---------------|---------|
| 크리에이터 | 표시 | 캠페인 찾기 |
| 광고주 | `href: null` 숨김 | 캠페인 관리 |

- 광고주 전환 시 `router.replace('/(tabs)/campaign')` 강제 이동
- `app/(tabs)/index.tsx`: 마운트 시 광고주면 캠페인 탭으로 즉시 리다이렉트 (뒤로가기 방지)

### 광고주 전용 화면
**캠페인 관리 (`AdvertiserCampaignScreen`)**
- 내가 등록한 캠페인 목록 (상태별: 모집 중 / 마감 / 당선 발표)
- 카드: 신청자 수, 경쟁률 바, 신청자 보기 / 당선자 선정 버튼
- 당선 발표 완료 캠페인: "워크스페이스 자동 생성됨" 배너
- 헤더 우측: 마이페이지 이동 버튼 + 캠페인 등록 버튼

**캠페인 등록 (`app/advertiser/create-campaign.tsx`)**
- 배송형 / 방문형 타입 카드 선택
- 6개 카테고리 칩 선택
- 브랜드명, 캠페인 제목, 혜택, 모집 인원, 마감일
- 방문형 한정: 장소 입력 필드
- 참여 조건 textarea
- 투두 프리셋 textarea (당선 크리에이터 워크스페이스 자동 생성용)
- 필수값 미입력 시 등록 버튼 비활성화

### 신규 파일
- `stores/user-store.ts`
- `app/advertiser/_layout.tsx`
- `app/advertiser/create-campaign.tsx`

### 화면 목록 업데이트
| ID | 화면 | 경로 | 상태 |
|----|------|------|------|
| CPG-ADV-01 | 광고주 캠페인 관리 | `(tabs)/campaign` (광고주 역할) | ✅ 완료 |
| CPG-ADV-02 | 캠페인 등록 | `advertiser/create-campaign` | ✅ 완료 |

### 미구현 (추후 개발)
- **Backend API**: `POST /campaigns`, `GET /campaigns/mine`, `POST /campaigns/:id/select`

---

## [Phase 8] 광고주 모드 고도화 — 신청자 관리 & 당선 플로우 (2026-04-03)

### 배경
광고주가 신청자를 열람·선정하고 당선자를 발표하면 크리에이터 앱에서 워크스페이스가 자동 생성되는 end-to-end 플로우 완성.

### 신규 파일
- `features/campaign/applicant.types.ts` — `Applicant`, `ApplicantStatus` 타입
- `app/advertiser/applicants/[id].tsx` — CPG-ADV-03 신청자 목록 & 당선자 선정

### CPG-ADV-03: 신청자 목록 & 당선자 선정

| 기능 | 구현 내용 |
|------|----------|
| 필터 탭 | 전체 / 검토 중 / 당선 / 탈락 4종 칩 |
| 신청자 카드 | 아바타, 이름, 플랫폼 배지, 팔로워 수, 메모 미리보기, 빠른 당선 버튼 |
| 상세 모달 | 바텀 시트 슬라이드업 — 스탯 그리드, 카테고리 칩, 메모, 당선/탈락 버튼 |
| 선정 확인 모달 | 중앙 페이드 모달 — 대상 크리에이터 정보 카드 + 확인 버튼 |
| 당선 발표 | 하단 고정 버튼 → `workspaceStore.createFromCampaign()` 호출 → `applicationStore.select()` |

### 버튼 연결 (`AdvertiserCampaignCard`)
- **신청자 보기** → `/advertiser/applicants/:id?title=…` 이동
- **당선자 선정** → 동일 경로 `&mode=select` 파라미터로 진입 시 필터 `'pending'` 자동 세팅

### 화면 목록 업데이트
| ID | 화면 | 경로 | 상태 |
|----|------|------|------|
| CPG-ADV-03 | 신청자 목록 & 당선자 선정 | `advertiser/applicants/[id]` | ✅ 완료 |

---

## [Phase 9] 크리에이터 마이페이지 고도화 & 신청 현황 (2026-04-03)

### 배경
크리에이터가 자신의 채널 정보를 등록하고, 신청한 캠페인 진행 상황을 한눈에 확인할 수 있도록 마이페이지와 관련 화면을 완성.

### 1. 채널 정보 등록 (마이페이지 내)

`features/mypage/types.ts`에 `SocialAccount`, `SocialPlatform` 타입 추가.

| 플랫폼 | 입력 필드 | 색상 |
|--------|----------|------|
| Instagram | @아이디, 팔로워 수 | `#E1306C` |
| YouTube | 채널명, 팔로워 수 | `#FF0000` |
| TikTok | @아이디, 팔로워 수 | `#69C9D0` |
| 블로그 | 블로그명/URL, 팔로워 수 | `#03C75A` |

- 미등록: "미등록" + "등록하기" 버튼 표시
- 등록 시: 핸들 + 팔로워 수 축약 뱃지 (1.2만, 3.1천 형식)
- 터치 → 바텀 시트 슬라이드업 편집 모달 (핸들 입력, 팔로워 수 입력, 저장 / 연결 해제)
- 광고주 모드에서는 섹션 미표시

### 2. 신청한 캠페인 현황 (`app/my-applications/index.tsx`)

`stores/application-store.ts` 신규 생성 — 신청/당선/미당선 전역 상태 관리 (observer 패턴).

| 기능 | 구현 내용 |
|------|----------|
| 상단 요약 | 전체 / 검토 중 / 당선 / 미당선 수치 칩 |
| 필터 탭 | 4종 상태 필터 |
| 신청 카드 | 상태 배지, 리워드, D-day, 신청일, 좌측 컬러 스트라이프 |
| 당선 카드 | "워크스페이스 바로가기" 버튼 (workspaceId 있을 때) |
| 미당선 카드 | 안내 메시지 배너 |
| 빈 상태 | "캠페인 찾기" 이동 버튼 |

- 마이페이지 "활동" 섹션에서 진입
- 캠페인 신청 완료 Alert에 "신청 현황 보기" 버튼 추가

### 3. 프로필 편집 (`app/profile-edit/index.tsx`)

| 필드 | 비고 |
|------|------|
| 이름 | 최대 20자 |
| 이메일 | 이메일 키보드 타입 |
| 소개 | 100자 카운터, multiline |
| 연결 계정 | 소셜 로그인 읽기 전용 표시 |

- 변경사항 없으면 저장 버튼 비활성화
- 나가기 시 변경사항 있으면 경고 Alert
- 마이페이지 프로필 카드 우상단 "편집" 버튼으로 진입

### 4. 전역 상태 개선

| 파일 | 변경 내용 |
|------|----------|
| `stores/workspace-store.ts` | MOCK 상수 store로 이전, `createFromCampaign()` 메서드 추가, `subscribe()` 구독 지원 |
| `stores/application-store.ts` | 신규 — 신청·당선·미당선 상태 관리 |
| `stores/todo-store.ts` | `subscribe()` 반환 타입 `() => void` 명시 (TypeScript 에러 수정) |
| `app/(tabs)/index.tsx` | MOCK 상수 제거 → `workspaceStore` 구독으로 교체 |
| `app/campaign/[id].tsx` | `applicationStore.apply()` 연동 — 신청 시 store에 저장 |

### 5. 당선 → 워크스페이스 자동 생성 플로우 완성

```
광고주: 당선자 선정 → "발표하기"
  → workspaceStore.createFromCampaign() (당선자 수만큼)
  → applicationStore.select(campaignId, workspaceId)
크리에이터: 내 신청 현황 화면
  → status: 'selected' + workspaceId 확인
  → "워크스페이스 바로가기" 버튼 활성화
  → router.push('/workspace/:id')
```

### 신규 파일
- `stores/application-store.ts`
- `app/my-applications/_layout.tsx`
- `app/my-applications/index.tsx`
- `app/profile-edit/_layout.tsx`
- `app/profile-edit/index.tsx`

### 화면 목록 업데이트
| ID | 화면 | 경로 | 상태 |
|----|------|------|------|
| MY-APP-01 | 내 신청 현황 | `my-applications/` | ✅ 완료 |
| PRF-EDIT-01 | 프로필 편집 | `profile-edit/` | ✅ 완료 |

### 미구현 (추후 개발)
- **Backend API**: 신청·당선 연동, 워크스페이스 자동 생성 서버 트리거
- **푸시 알림**: 당선 결과 실시간 알림
- **사진 업로드**: 마이페이지 프로필 사진 변경

---

## [Phase 10] AI 카메라 실연동 및 사진 처리 큐 (2026-04-04)

### 배경
카메라 화면(CAM-01)에서 더미 데이터로 동작하던 AI Shot Verification을 Gemini 2.5 Flash API와 실제 연동. 연속 촬영 시 발생하는 동시 API 호출 한도 초과 문제를 해결하기 위해 사진 처리 큐를 도입.

### Gemini 2.5 Flash API 연동 (`services/gemini.ts`)

| 함수 | 용도 | 상태 |
|------|------|------|
| `classifyImage(base64, todoLabel)` | 특정 투두 검증 (Shot Verification) | ✅ 연동 |
| `matchTodo(base64, todos)` | 자동 분류 (전체 투두 중 최적 매칭) | ✅ 연동 |

- **프롬프트 설계**: 퓨샷 프롬프팅으로 JSON 응답 강제
- **`RateLimitError`**: 429 응답에서 재시도 대기 초 파싱
- **`extractJSON()`**: 모델 출력에 코드펜스나 텍스트가 섞일 때 JSON 추출
- **`thinkingConfig: { thinkingBudget: 0 }`**: Flash 모델 thinking 비활성화로 응답 속도 최적화

### 사진 처리 큐 (`services/photo-queue.ts`)

카메라에서 연속 촬영 시 Gemini API 호출을 순차(직렬) 처리하는 큐 서비스 신규 추가.

| 기능 | 구현 |
|------|------|
| 직렬 실행 | 동시 API 호출 방지, 큐에 넣고 하나씩 처리 |
| Rate limit 자동 재시도 | 429 응답 시 대기(서버 지정 시간) 후 해당 아이템부터 재개 |
| 지수 백오프 | 일반 에러 시 1s → 1.5s → 2.25s 간격으로 최대 3회 재시도 |
| 구독 기반 UI | `subscribe()`로 큐 상태(대기/처리/rate limit 카운트다운) 실시간 반영 |
| 화면 이탈 정리 | `clear()`로 큐·타이머 정리 (useEffect cleanup) |

### 카메라 화면 변경 (`app/workspace/[id]/camera.tsx`)

| 변경 | 내용 |
|------|------|
| import | `RateLimitError` 직접 import 제거 → 큐가 처리 |
| `processPhoto()` | try-catch 제거, 429는 큐가 자동 재시도 |
| `handleShutter()` | fire-and-forget → `queue.enqueue()` |
| `useEffect` | 큐 인스턴스 생성 + 구독 + cleanup |

### TDO-01 투두리스트 상세 화면 개선

- 상단 FlatList `ListHeaderComponent`에 기본 정보 카드 추가
  - 카테고리 배지 + 상태 칩 (진행 중 / 완료 / 보관됨)
  - 촬영 장소 + 생성일 (한 줄 메타 행)
  - 시그니처 샷 / Web Drop 바로가기 버튼
- 하단 Web Drop 큰 버튼 제거 (기본 정보 카드 내 버튼으로 대체)

### E2E 테스트 환경 세팅

- `playwright.config.ts` 추가
- `e2e/screens.spec.ts` — 화면 레벨 통합 테스트

### 신규 파일
- `services/photo-queue.ts`
- `playwright.config.ts`
- `e2e/screens.spec.ts`
- `.agents/skills/frontend-design/` (npx skills로 설치)
- `copilot-instructions.md`
- `.env`, `.env.example`

---

## [Phase 11] 워크스페이스 상태 관리 고도화 & 카메라 UX 개선 (2026-04-06)

### 배경
워크스페이스 보관/삭제/복원 기능, 투두 항목 삭제, 연속 촬영 중 처리 상태 시각화, 자동 분류 알고리즘 개선 등 사용성 전반을 강화.

---

### 1. 워크스페이스 상태 관리 (`stores/workspace-store.ts`)

| 메서드 | 기능 |
|--------|------|
| `archive(id)` | status → `'archived'` + notify |
| `restore(id)` | status → `'active'` + notify |
| `remove(id)` | 배열에서 제거 + notify |

---

### 2. 대시보드 보관함 탭 (`app/(tabs)/index.tsx`)

- 필터 탭 `진행 중 / 완료` → **`진행 중 / 완료 / 보관함`** 3탭으로 확장
- 보관함 빈 상태 메시지 별도 표시 ("보관된 항목이 없어요")

---

### 3. 워크스페이스 상세 `...` 메뉴 (`app/workspace/[id]/index.tsx`)

- 헤더 우측 `...` 버튼에 바텀 시트 연결
- 현재 status에 따라 메뉴 분기:
  - `active` → **보관함으로 이동** (archive) + **삭제**
  - `archived` → **진행 중으로 복원** (restore) + **삭제**
- 모든 액션은 `workspaceStore` 메서드 호출 후 `router.back()`
- 워크스페이스 데이터를 `MOCK_WORKSPACE` 상수 대신 `workspaceStore.getById()` 구독으로 교체

---

### 4. 투두 항목 삭제 (`features/todo/components/TodoItem.tsx`, `stores/todo-store.ts`)

- `todoStore.removeTodo(workspaceId, todoId)` 추가
- `TodoItem`에 `onLongPress` prop 추가 (500ms 롱프레스)
- 롱프레스 → `"항목 삭제"` Alert → 확인 시 `removeTodo()` 호출

---

### 5. 자동 분류 알고리즘 개선 (`services/gemini.ts`, `app/workspace/[id]/camera.tsx`)

**이전**: PENDING 항목만 후보로 전달
**이후**: 전체 항목 전달 + 프롬프트에 상태 표시

```
0: "카페 외관" [미완료]
1: "메뉴판 상세" [완료 · 2장]
```

- Gemini 프롬프트 규칙: "미완료 우선 선택, 완료 항목은 명백히 더 맞을 때만 추가"
- `matchTodo` 시그니처 변경: `{ id, label }[]` → `{ id, label, status, imageCount }[]`
- 카메라에서 `.filter(PENDING)` 제거 → 전체 목록 전달

---

### 6. 카메라 UX 개선 (`app/workspace/[id]/camera.tsx`)

| 개선 | 내용 |
|------|------|
| 처리 중 사진 스택 | 셔터 즉시 썸네일 큐에 추가 → 팬(fan) 형태 오버레이 표시, AI 처리 중 스피너 + 반투명 오버레이 |
| 완료 버튼 항시 표시 | 기존 `shotCount > 0` 조건 제거, 카메라 진입 즉시 표시 |
| Rate Limit 배너 | 429 시 "N초 후 자동 재개" 카운트다운 배너, 1초마다 감소 |

---

### 7. 워크스페이스 상세 — 전체 사진 스택 (`app/workspace/[id]/index.tsx`)

- "촬영 시작" 버튼 아래 전체 촬영 사진 미리보기 영역 추가
- 팬 형태 썸네일 (최근 5장), 각 사진 탭 → 뷰어 열림
- "N장 촬영됨 / 완료 항목 수" 텍스트 + "전체보기" 버튼

---

### 변경된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `stores/workspace-store.ts` | `archive()`, `restore()`, `remove()` 추가 |
| `stores/todo-store.ts` | `removeTodo()` 추가 |
| `services/gemini.ts` | `matchTodo` 시그니처 변경, `RateLimitError` 파싱 개선 |
| `app/(tabs)/index.tsx` | 보관함 탭 추가, 빈 상태 분기 |
| `app/workspace/[id]/index.tsx` | `...` 메뉴, 투두 롱프레스 삭제, 사진 스택 UI, store 구독 |
| `features/todo/components/TodoItem.tsx` | `onLongPress` prop 추가 |
| `app/workspace/[id]/camera.tsx` | 스택 UI, 완료 버튼 항시 표시, Rate Limit 카운트다운 |

---

## [Phase 12] 카메라 고도화 & 메모리 누수 수정 (2026-04-07)

### 배경
카메라에 핀치줌·노출·포커스·비율 전환 등 전문 촬영 기능을 추가하고, 앱 전체에 걸쳐 발견된 메모리 누수 패턴을 일괄 수정.

---

### 1. 카메라 설정 모달 (`...` 버튼)

`app/workspace/[id]/camera.tsx` 상단 바에 `...` 버튼 추가. 바텀 시트 모달로 아래 설정 제공:

| 설정 | 옵션 |
|------|------|
| 구도 격자 | Switch 토글 (삼분할선 on/off) |
| 셀프타이머 | 끄기 / 3초 / 10초 |
| 화면 비율 | 4:3 / 16:9 / 1:1 |

- 비율 선택 시 `CameraView` 프리뷰 영역 높이가 화면 폭 × 비율로 변경되고 상하 여백은 검정 처리
- 셀프타이머 선택 후 셔터 탭 → 전체화면 카운트다운 숫자 오버레이 → 자동 촬영

---

### 2. `CameraOverlay` — `showGrid` prop 추가

`features/camera/components/CameraOverlay.tsx`

- `showGrid?: boolean` (기본 `true`)
- `false`이면 삼분할선 View 렌더 건너뜀
- 설정 모달의 격자 Switch와 연동

---

### 3. 핀치 줌 (`react-native-gesture-handler`)

- `GestureHandlerRootView`를 `app/_layout.tsx` 루트에 추가 (앱 전체 제스처 등록)
- `CameraView` 영역을 `GestureDetector`로 래핑
- `Gesture.Pinch()` — `onBegin`에서 현재 zoom 저장, `onUpdate`에서 배율 곱 → `zoom` 상태 업데이트
- zoom 범위: `0 ~ MAX_ZOOM(0.25)`

---

### 4. 줌 슬라이더 & 프리셋 버튼

- 셔터 버튼 위 연속 드래그 슬라이더 (`Gesture.Pan()`)
  - 트랙(회색) + 채워진 영역(흰색) + thumb 위 배율 레이블
- 슬라이더 위 프리셋 버튼: `0.5×` / `1×` / `2×`
- 핀치·슬라이더·프리셋이 동일한 `zoom` 상태 공유

---

### 5. 탭 포커스

- 카메라 영역 탭 → `Gesture.Tap()` 인식 → `handleFocusTap(x, y)`
- 탭 위치에 황금색(#FFD700) 72×72 정사각형 포커스 박스 렌더
- `cameraRef.current?.focus?.({ x, y })` 호출 (expo-camera 내부 API)
- 포커스 박스 + 노출 슬라이더 3초 후 자동 소멸 (`focusTimeoutRef`)

---

### 6. 노출 슬라이더

- 탭 포커스 시 화면 우측에 수직 슬라이더 등장
- `Gesture.Pan()`으로 드래그 → `expSliderY` sharedValue 업데이트
- 위↑ = +1 노출, 아래↓ = -1 노출 (범위: -1 ~ 1, `CameraView` `exposure` prop 연결 예정)
- thumb에 현재 노출값 텍스트 표시 (`+0.5`, `-0.3` 등)
- 태양 아이콘(상단) / 달 아이콘(하단) 레이블

---

### 7. 수동 촬영 모드 분리

투두 옆 카메라 아이콘 → `camera?todoId=...` 진입 시 AI 분류 **제거**:

| 진입 | `todoId` | AI 동작 |
|------|---------|---------|
| 워크스페이스 "촬영 시작" | 없음 | `matchTodo()` 자동 분류 |
| 투두 옆 카메라 아이콘 | 있음 | 없음 — 해당 투두 즉시 할당 |

- `classifyImage` import 제거 (`services/gemini.ts`에서 불필요)

---

### 8. 메모리 누수 일괄 수정

앱 전체 화면에서 발견된 누수 패턴을 수정. 적용된 패턴:

**패턴 A — `isMounted` ref**: async 작업 후 언마운트된 컴포넌트에 setState 방지
**패턴 B — timer ref + useEffect cleanup**: setTimeout/setInterval 언마운트 시 강제 취소

| 파일 | 수정 내용 |
|------|----------|
| `camera.tsx` | `resultBannerRef` 추가, 큐 cleanup에 3개 타이머(`timerRef`, `focusTimeoutRef`, `resultBannerRef`) 일괄 정리 |
| `workspace/[id]/index.tsx` | `scrollTimerRef` 추가, useEffect cleanup 등록 |
| `workspace/[id]/share.tsx` | `isMounted` + `copyTimerRef`, await 후 마운트 체크 |
| `workspace/create.tsx` | `isMounted`, await 후 마운트 체크 |
| `profile-edit/index.tsx` | `isMounted` + `saveTimerRef`, cleanup 등록 |
| `drop/viewer.web.tsx` | `isMounted` + `copyTimerRef`, 다운로드·복사 후 마운트 체크 |

---

### 9. `GestureHandlerRootView` 루트 래핑

`app/_layout.tsx`에 `GestureHandlerRootView` 추가 — 앱 전체 제스처 인식 활성화 (미추가 시 `GestureDetector must be used as a descendant of GestureHandlerRootView` 오류 발생).

---

### 변경된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `app/_layout.tsx` | `GestureHandlerRootView` 루트 래핑 |
| `features/camera/components/CameraOverlay.tsx` | `showGrid` prop 추가 |
| `app/workspace/[id]/camera.tsx` | 핀치줌, 줌 슬라이더, 포커스, 노출, 비율 전환, `...` 설정 모달, 수동 촬영 모드, 메모리 cleanup |
| `app/workspace/[id]/index.tsx` | `scrollTimerRef` cleanup |
| `app/workspace/[id]/share.tsx` | `isMounted` + `copyTimerRef` |
| `app/workspace/create.tsx` | `isMounted` |
| `app/profile-edit/index.tsx` | `isMounted` + `saveTimerRef` |
| `app/drop/viewer.web.tsx` | `isMounted` + `copyTimerRef` |

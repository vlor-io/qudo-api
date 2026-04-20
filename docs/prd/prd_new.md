# QUDO — 제품 요구사항 명세서 (PRD)

> **문서 버전**: v3.0 | **최종 수정일**: 2026-04-07
> **서비스명**: QUDO (큐도)
> **한줄 슬로건**: 가이드 촬영부터 PC 전송까지, 크리에이터를 위한 똑똑한 촬영 비서

---

## 1. 서비스 개요

### 1.1 목적

인플루언서·콘텐츠 마케터가 광고 캠페인 촬영 현장에서 필수 컷을 누락 없이 찍고, 결과물을 PC 에디터로 즉시 전달할 수 있는 AI 기반 촬영 워크스페이스 앱.

### 1.2 핵심 가치

| 가치 | 설명 |
|------|------|
| 누락 없는 완벽함 | AI가 투두 항목을 자동 인식·체크하여 필수 컷 누락 방지 |
| 일관된 퀄리티 | 시그니처 샷 오버레이로 브랜드 구도 재현 |
| 끊김 없는 흐름 | Web Drop으로 모바일 → PC 무전송 즉시 연동 |
| 성장하는 크리에이터 | 뱃지 시스템·캠페인 플랫폼으로 수익 기회 확장 |

### 1.3 사용자 역할

| 역할 | 명칭 | 주요 시나리오 |
|------|------|--------------|
| `creator` | 크리에이터 | 모바일 촬영, 캠페인 신청, PC 에디터 연동 |
| `advertiser` | 광고주 | 캠페인 등록·신청자 관리·당선자 선정 (앱 내 역할 전환) |
| `viewer` | 협업자 | 공유 링크로 결과물 검수·다운로드 |

---

## 2. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Expo SDK 54 / React Native 0.81 (New Architecture) |
| 라우팅 | expo-router v6 (파일 기반, TypedRoutes) |
| 언어 | TypeScript 5.9 / React 19.1 |
| 상태 관리 | Observer 패턴 Store (`subscribe` / `notify`) |
| 애니메이션 | react-native-reanimated v4 |
| 제스처 | react-native-gesture-handler (`GestureHandlerRootView` 루트 래핑) |
| 카메라 | expo-camera (`CameraView`, `useCameraPermissions`) |
| AI | Gemini 2.5 Flash — `services/gemini.ts` |
| 사진 큐 | `services/photo-queue.ts` (직렬 처리 + Rate Limit 재시도) |
| 스토리지 | AWS S3 (예정) |
| 웹 호스팅 | Vercel / Expo Web |
| 테스트 | Playwright E2E (Chromium) |

---

## 3. 화면 목록

| ID | 화면명 | 경로 | 구현 상태 |
|----|--------|------|----------|
| — | 인트로 | `index` | ✅ |
| LGN-01 | 소셜 로그인 | `(auth)/login` | ✅ |
| WRK-01 | 대시보드 | `(tabs)/` | ✅ |
| WRK-02 | 워크스페이스 생성 & AI 분석 | `workspace/create` | ✅ (AI 파싱 미연동) |
| TDO-01 | 투두리스트 상세 | `workspace/[id]/` | ✅ |
| CAM-01 | 스마트 가이드 카메라 | `workspace/[id]/camera` | ✅ |
| CAM-02 | 시그니처 샷 관리 | `workspace/[id]/signature` | ✅ |
| SHR-01 | Web Drop 링크 발급 | `workspace/[id]/share` | ✅ (S3 미연동) |
| MYP-01 | 마이페이지 & 채널 등록 | `mypage` | ✅ |
| PRF-EDIT-01 | 프로필 편집 | `profile-edit/` | ✅ |
| CPG-01 | 캠페인 찾기 (목록·검색) | `(tabs)/campaign` | ✅ |
| CPG-02 | 캠페인 상세 & 신청 | `campaign/[id]` | ✅ |
| MY-APP-01 | 내 신청 현황 | `my-applications/` | ✅ |
| SHR-03 | PC 워크스페이스 뷰어 | `drop/[token]` (웹 전용) | ✅ (API 미연동) |
| CPG-ADV-01 | 광고주 캠페인 관리 | `(tabs)/campaign` (광고주 역할) | ✅ |
| CPG-ADV-02 | 캠페인 등록 | `advertiser/create-campaign` | ✅ |
| CPG-ADV-03 | 신청자 목록 & 당선자 선정 | `advertiser/applicants/[id]` | ✅ |

---

## 4. 네비게이션 흐름

```
인트로 (2.4s 자동 전환)
  └─ router.replace → (auth)/login
       └─ 로그인 성공 → router.replace → (tabs)/

(tabs)/                         ← 하단 2탭 구조
  ├─ [탭1] 워크스페이스 대시보드  (creator만 표시)
  │    ├─ FAB [+] → workspace/create
  │    ├─ 카드 탭 → workspace/[id]/         ← 투두리스트
  │    │    ├─ 카메라 아이콘 → camera (todoId 없음, 자동 분류)
  │    │    ├─ 각 투두 옆 카메라 → camera?todoId=... (수동 할당)
  │    │    ├─ 시그니처 → signature
  │    │    └─ 공유 → share
  │    └─ 필터 탭: 진행 중 / 완료 / 보관함
  │
  └─ [탭2] 캠페인
       ├─ creator: 캠페인 찾기 목록
       │    └─ 카드 탭 → campaign/[id]
       │         └─ 신청하기 → applicationStore.apply()
       └─ advertiser: 캠페인 관리 목록
            ├─ 신청자 보기 → advertiser/applicants/[id]
            └─ 캠페인 등록 → advertiser/create-campaign

mypage
  ├─ 편집 → profile-edit/
  ├─ 내 신청 현황 → my-applications/
  └─ 광고주 모드 전환 → role 변경 + router.replace('/(tabs)/campaign')
```

**라우팅 규칙**
- 인트로·로그인 → `router.replace` (뒤로가기 스택 제거)
- 워크스페이스·캠페인 하위 → `router.push`
- 광고주 전환 후 대시보드 탭 접근 시 즉시 campaign으로 리다이렉트 (뒤로가기 방지)

---

## 5. 전역 상태 (Stores)

모든 Store는 Observer 패턴 (`subscribe` / `notify`) 사용. API 연동 전까지 메모리 내 Mock 데이터로 동작.

| Store | 파일 | 주요 메서드 |
|-------|------|------------|
| `userStore` | `stores/user-store.ts` | `getRole()`, `setRole()`, `hydrate()` (AsyncStorage) |
| `workspaceStore` | `stores/workspace-store.ts` | `getAll()`, `getById()`, `create()`, `archive()`, `restore()`, `remove()`, `createFromCampaign()` |
| `todoStore` | `stores/todo-store.ts` | `get()`, `toggle()`, `addImage()`, `removeImage()`, `moveImage()`, `removeTodo()` |
| `applicationStore` | `stores/application-store.ts` | `apply()`, `select()`, `getAll()` |

---

## 6. 화면별 상세 명세

---

### [LGN-01] 소셜 로그인

**경로**: `(auth)/login`

#### 주요 기능
- 소셜 로그인 버튼 4종 (`SOCIAL_PROVIDERS` 배열로 관리)

| 제공자 | 배경색 | 플랫폼 |
|--------|--------|--------|
| 카카오 | `#FEE500` | iOS / Android / Web |
| 네이버 | `#03C75A` | iOS / Android / Web |
| Google | `#ffffff` + 테두리 | iOS / Android / Web |
| Apple | `#000000` | iOS 전용 |

- `Platform.OS`로 플랫폼별 필터링
- `handleLogin(providerId)` 내부에 실제 SDK 호출 연동 예정 (현재 Mock)
- 로그인 성공 → `router.replace('/(tabs)/')`

---

### [WRK-01] 대시보드

**경로**: `(tabs)/index.tsx`

#### 주요 기능
- `workspaceStore` 구독 → 워크스페이스 카드 목록 렌더링
- **필터 탭 3종**: 진행 중 (`active`) / 완료 (`completed`) / 보관함 (`archived`)
- **워크스페이스 카드**: 카테고리 색상, 투두 진행률 바, 날짜
- **FAB [+]**: `workspace/create`로 이동
- Android 뒤로가기 → 앱 종료 Alert
- 광고주 역할일 때 마운트 즉시 `/(tabs)/campaign`으로 리다이렉트

#### 카테고리 색상 (`CATEGORY_META`)
| 카테고리 | 색상 | 아이콘 |
|---------|------|--------|
| FOOD | `#FF6B6B` | `restaurant-outline` |
| PRODUCT | `#4ECDC4` | `cube-outline` |
| DETAIL_PAGE | `#7B61FF` | `document-text-outline` |
| TRAVEL | `#FFB347` | `airplane-outline` |

---

### [WRK-02] 워크스페이스 생성

**경로**: `workspace/create`

#### 주요 기능
- **입력 필드**: 제목(필수), 장소(선택), 카테고리(필수), 캠페인 안내문(선택)
- **카테고리 선택**: 4종 카드 (`CATEGORY_META` 기반 색상·아이콘)
- **AI 분석 섹션** (캠페인 안내문 입력 시 표시)
  - "AI 분석" 버튼 → `parseCampaignGuide()` 호출 (미연동 — 현재 1.8s 딜레이 목 결과)
  - 분석 결과: tasks / 마감 일정 / 법적 고지 카드 표시
- **생성 조건**: 제목 + 카테고리 필수
- 생성 완료 → `workspaceStore.create()` → 대시보드로 이동
- `isMounted` 체크로 언마운트 후 setState 방지

---

### [TDO-01] 투두리스트 상세

**경로**: `workspace/[id]/index.tsx`

#### 주요 기능
- `workspaceStore` + `todoStore` 동시 구독
- **퀵 액션**: 카메라 / 시그니처 / 공유 버튼
- **전체 사진 스택 프리뷰**: 워크스페이스 내 모든 사진을 팬 형태 썸네일로 표시 (촬영 시작 버튼 아래)
- **투두 아이템** (`TodoItem` 컴포넌트)
  - 체크박스 탭 → `todoStore.toggle()`
  - 카메라 아이콘 탭 → `camera?todoId=...` (수동 촬영, AI 분류 없음)
  - 롱프레스 500ms → 삭제 Alert → `todoStore.removeTodo()`
  - 촬영된 사진 썸네일 스트립 표시, 탭 → 라이트박스
- **이미지 뷰어 (라이트박스)**
  - FlatList 수평 스크롤, 좌우 화살표
  - 삭제 버튼 → `todoStore.removeImage()`
- **`...` 메뉴 (워크스페이스 관리)**
  - `active` 상태: 보관함으로 이동 → `workspaceStore.archive()`
  - `archived` 상태: 복원 → `workspaceStore.restore()`
  - 삭제 → `workspaceStore.remove()` → `router.back()`
- `scrollTimerRef`로 스크롤 setTimeout cleanup

---

### [CAM-01] 스마트 가이드 카메라

**경로**: `workspace/[id]/camera.tsx`

#### 진입 모드

| 진입 경로 | `todoId` 파라미터 | AI 동작 |
|---------|-----------------|---------|
| 워크스페이스 "촬영 시작" | 없음 | `matchTodo()` — 전체 투두 자동 분류 |
| 투두 옆 카메라 아이콘 | 있음 | 없음 — 해당 투두에 즉시 할당 |

#### 제스처 조작 (GestureDetector)
- **핀치 줌**: 두 손가락 벌리기/모으기 → `zoom` 값 실시간 반영 (0 ~ MAX_ZOOM)
- **탭 포커스**: 화면 탭 → 황금색 포커스 박스 + 우측 노출 슬라이더 3초 표시
- **줌 슬라이더**: 셔터 위 연속 드래그 슬라이더
- **노출 슬라이더**: 포커스 탭 후 우측 수직 트랙 (위↑=+노출, 아래↓=-노출)

#### 상단 컨트롤
| 버튼 | 동작 |
|------|------|
| ✕ | `router.back()` |
| 플래시 | off → on → auto 순환 |
| 전후면 전환 | `facing` 토글 |
| 투두 칩 | 현재 모드 표시 (자동 분류 / 투두명) |
| `...` | 설정 모달 오픈 |

#### 설정 모달 (`...`)
| 설정 | 옵션 |
|------|------|
| 구도 격자 | Switch (삼분할선 on/off) |
| 셀프타이머 | 끄기 / 3초 / 10초 |
| 화면 비율 | 4:3 / 16:9 / 1:1 |

#### 줌 프리셋 버튼
- `0.5×` / `1×` / `2×` — 슬라이더 위 고정 버튼

#### 사진 처리 큐 (`PhotoProcessingQueue`)
- 셔터 → 사진 캡처 완료 즉시 큐에 추가 (카메라 하드웨어 busy 최소화)
- 큐가 Gemini API 순차 호출 + Rate Limit 자동 재시도 + 지수 백오프
- **Rate Limit 배너**: `rateLimitSec > 0`일 때 "AI 요청 한도 초과 N초 후 자동 재개" 표시
- **처리 중 사진 스택**: 팬 형태 썸네일 + AI 처리 중 ActivityIndicator + 뱃지 카운터

#### AI 결과 배너 (2.8초 표시 후 페이드아웃)
| 상황 | 메시지 |
|------|--------|
| 자동 분류 성공 | ✨ `{투두명}` 자동 분류됨! |
| 검증 실패 | ⚠️ 재촬영 권장 + 이유 |
| 자동 할당 성공 | ✔ `{투두명}` 자동 체크 완료! |

#### 타이머 카운트다운
- 셀프타이머 설정 시 셔터 → 전체화면 카운트다운 숫자 표시 → 자동 촬영

#### cleanup (메모리 누수 방지)
- `timerRef`, `focusTimeoutRef`, `resultBannerRef` → useEffect cleanup에서 모두 정리
- 큐 언마운트 시 `queue.clear()` 호출

---

### [CAM-02] 시그니처 샷 관리

**경로**: `workspace/[id]/signature.tsx`

#### 주요 기능
- `expo-image-picker`로 갤러리 접근, 이미지 선택
- 투명도 4단계 고정 버튼 (20 / 40 / 60 / 80%) + 슬라이더 시각화
- 3:4 비율 실시간 프리뷰 (선택 이미지 + 삼분할선 오버레이)
- 저장 → 체크 아이콘 바운스 애니메이션
- "이 구도로 촬영" → `camera?signatureUri=...` (오버레이 전달 예정)

---

### [SHR-01] Web Drop 링크 발급

**경로**: `workspace/[id]/share.tsx`

#### 주요 기능
- **링크 발급**: 현재 랜덤 토큰 Mock URL 생성 (예정: `POST /workspaces/:id/share-links`)
- **비밀번호 보호**: Switch 토글 → 입력 필드, 발급 시 포함
- **복사**: `expo-clipboard` → URL 복사 + 체크 아이콘 2초 전환
- **공유**: `Share.share()`로 OS 공유 시트 호출
- **유효기간**: 72시간
- `isMounted` + `copyTimerRef` 로 언마운트 후 setState 방지

---

### [MYP-01] 마이페이지

**경로**: `mypage.tsx`

#### 주요 섹션
1. **프로필 카드**: 이름, 이메일, 플랜 배지 (Free / Pro / 광고주), 편집 버튼
2. **활동 통계**: 총 워크스페이스 수 / 총 촬영 컷 수 / 획득 뱃지 수
3. **뱃지 시스템**: 5열 그리드, 10종 (`features/mypage/badges.ts`)
   - 획득: 컬러 표시
   - 미획득: 흐리게 + 자물쇠 아이콘
   - 달성률 진행바
4. **채널 정보 등록** (creator만 표시)

| 플랫폼 | 색상 | 입력 |
|--------|------|------|
| Instagram | `#E1306C` | @아이디, 팔로워 수 |
| YouTube | `#FF0000` | 채널명, 팔로워 수 |
| TikTok | `#69C9D0` | @아이디, 팔로워 수 |
| 블로그 | `#03C75A` | 블로그명/URL, 팔로워 수 |

5. **활동**: 내 신청 현황 → `my-applications/`
6. **설정**: 프로필 편집 / 역할 전환 / 로그아웃 / 회원탈퇴

#### 역할 전환
| 현재 역할 | 버튼 텍스트 | 전환 후 |
|---------|-----------|--------|
| creator | 광고주 모드로 전환 | `setRole('advertiser')` + `/(tabs)/campaign` |
| advertiser | 크리에이터로 전환 | `setRole('creator')` |

---

### [PRF-EDIT-01] 프로필 편집

**경로**: `profile-edit/index.tsx`

#### 폼 구성
| 필드 | 필수 | 제약 |
|------|------|------|
| 이름 | ✅ | 최대 20자 |
| 이메일 | ✅ | email 키보드 |
| 소개 | — | 최대 100자, 글자 수 카운터 |
| 연결 계정 | 읽기 전용 | 소셜 로그인 제공자 |

#### UX 규칙
- 변경사항 없으면 저장 버튼 비활성화
- 변경사항 있을 때 뒤로가기 → Alert 경고
- 저장 중 버튼 텍스트 "저장 중..." 표시
- `isMounted` + `saveTimerRef` 로 언마운트 후 setState 방지

---

### [CPG-01] 캠페인 찾기

**경로**: `(tabs)/campaign.tsx` (creator 역할)

#### 필터 구조 (AND 조건)
- **타입 세그먼트**: 전체 / 배송 (`delivery`) / 방문 (`visit`)
- **카테고리 칩**: 전체 / 뷰티 / 제품 / 맛집 / 여행 / 라이프 / 상세페이지
- **검색**: 브랜드명 + 캠페인명 실시간 필터링

#### 캠페인 카드
| 요소 | 설명 |
|------|------|
| 브랜드명 | 광고주 |
| 타입 배지 | 배송 / 방문 |
| 혜택 | 제품 제공 / 현금 협찬 |
| 위치 | 방문형만 표시 |
| D-Day | 마감 3일 이내 빨간색 강조 |
| 경쟁률 바 | 신청자 / (모집 인원 × 10) |
| 신청 상태 | none / applied / selected / rejected |

#### 타입 정의 (`features/campaign/types.ts`)
- `CampaignType`: `'delivery' | 'visit'`
- `CampaignCategory`: `'FOOD' | 'PRODUCT' | 'BEAUTY' | 'TRAVEL' | 'LIFESTYLE' | 'DETAIL_PAGE'`
- `CampaignStatus`: `'recruiting' | 'closed' | 'announced'`
- `ApplicationStatus`: `'none' | 'applied' | 'selected' | 'rejected'`

---

### [CPG-02] 캠페인 상세 & 신청

**경로**: `campaign/[id].tsx`

#### 주요 섹션
1. 히어로 영역 (캠페인 아이콘 + D-Day 칩)
2. 혜택 카드
3. 정보 그리드: 모집 인원 / 신청 현황 / 신청 마감
4. 경쟁률 프로그레스 바
5. 참여 조건 불릿 리스트
6. 당선 시 워크스페이스 투두 프리뷰

#### 신청 플로우
```
신청하기 탭
  └─ Alert "신청할까요? 당선 시 워크스페이스 자동 생성"
       └─ 신청하기 → applicationStore.apply()
            └─ 당선 알림 → workspaceStore.createFromCampaign()
```

#### 워크스페이스 자동 생성 규칙 (당선 시)
- 제목: `[브랜드명] [캠페인명]`
- 카테고리: `Campaign.category` → `WorkspaceCategory` 매핑
- 투두 프리셋: `Campaign.todoPreset` 배열 사용
- 요구사항: 워크스페이스 메모 필드 삽입

---

### [MY-APP-01] 내 신청 현황

**경로**: `my-applications/index.tsx`

#### 상단 요약 칩
| 칩 | 필터 | 색상 |
|----|------|------|
| 전체 | — | 기본 |
| 검토 중 | `applied` | `#39D0FF` |
| 당선 | `selected` | `#10B981` |
| 미당선 | `rejected` | `#FF6B6B` |

#### 신청 카드
- 상태 배지 + 타입 배지 + D-Day
- 캠페인 제목 / 브랜드명 / 리워드 / 신청일
- 당선: "워크스페이스 바로가기" 버튼 활성화
- 미당선: 안내 문구 배너
- 빈 상태: "캠페인 찾기" 이동 버튼

---

### [SHR-03] PC 워크스페이스 뷰어

**경로**: `drop/[token].tsx` → `viewer.web.tsx` (웹) / `viewer.tsx` (모바일 안내)

#### 접근 방식
- `Platform.OS === 'web'` → `viewer.web.tsx`
- 모바일 브라우저 → "PC에서 열어주세요" 안내

#### 비밀번호 게이트
- 잠금 아이콘 + 워크스페이스 제목
- 비밀번호 입력 실패 → "비밀번호가 올바르지 않아요" + 1.5초 후 초기화
- 유효기간 72시간 표시

#### 에셋 그리드
- CSS Grid `auto-fill minmax(200px, 1fr)`
- 사이드바 필터: 전체 / 투두 항목별
- 카드: 썸네일(3:4) + 투두 라벨 + URL 복사 / 다운로드 / 크게 보기

#### 드래그 앤 드롭
- `draggable` + `dataTransfer` (`text/uri-list`, `text/plain`)
- 블로그 에디터(네이버, 티스토리 등)로 직접 드래그 가능
- hover 시 "드래그로 복사" 힌트 배지

#### 라이트박스
- 전체화면 Modal
- 좌우 화살표 + 키보드 이전/다음
- 하단 썸네일 스트립 (현재 선택 = accent 테두리)
- 상단: 카운터 · 투두 라벨 · URL 복사 · 다운로드 · 닫기

#### 클린업
- `isMounted` + `copyTimerRef` 로 언마운트 후 setState 방지

---

### [CPG-ADV-01] 광고주 캠페인 관리

**경로**: `(tabs)/campaign.tsx` (advertiser 역할)

#### 헤더
- 좌: "캠페인 관리" + "모집 중 N개 · 총 신청자 N명"
- 우: 마이페이지 버튼 + "캠페인 등록" 버튼

#### 캠페인 카드
| 요소 | 내용 |
|------|------|
| 상태 배지 | 모집 중(청록) / 마감(회색) / 당선 발표(황금) |
| D-Day | 마감까지 남은 일수 |
| 신청자 현황 | 신청자 수 / 모집 인원 + 경쟁률 바 |
| 액션 | 신청자 보기 / 당선자 선정 버튼 |
| 발표 완료 | "워크스페이스 자동 생성됨" 배너 |

---

### [CPG-ADV-02] 캠페인 등록

**경로**: `advertiser/create-campaign.tsx`

#### 폼 필드
| 필드 | 필수 | 설명 |
|------|------|------|
| 캠페인 타입 | ✅ | 배송형 / 방문형 카드 선택 |
| 카테고리 | ✅ | 6종 칩 |
| 브랜드명 | ✅ | 텍스트 |
| 캠페인 제목 | ✅ | 텍스트 |
| 제공 혜택 | ✅ | 텍스트 |
| 모집 인원 | ✅ | 숫자 |
| 신청 마감일 | ✅ | YYYY-MM-DD |
| 방문 장소 | 방문형만 | 텍스트 |
| 참여 조건 | — | 줄바꿈 구분 textarea |
| 투두 프리셋 | — | 당선 크리에이터 워크스페이스 자동 생성용 |

#### 등록 플로우
```
등록하기 탭 (필수값 모두 입력 시 활성화)
  └─ POST /campaigns (연동 예정)
       └─ Alert "등록 완료, 검토 후 24시간 내 게시"
            └─ 확인 → router.back()
```

---

### [CPG-ADV-03] 신청자 목록 & 당선자 선정

**경로**: `advertiser/applicants/[id].tsx`
**파라미터**: `id` (캠페인 ID), `title` (캠페인 제목), `mode=select` (당선자 선정 모드)

#### 필터 탭
| 탭 | 조건 |
|----|------|
| 전체 | 전체 신청자 |
| 검토 중 | `status: 'pending'` |
| 당선 | `status: 'selected'` |
| 탈락 | `status: 'rejected'` |

#### 컴포넌트
- **`ApplicantCard`**: 아바타(이니셜), 이름, 핸들, 플랫폼 배지, 팔로워 수, 메모 1줄 미리보기, 빠른 당선 버튼
- **`ApplicantDetailModal`**: 바텀 시트 슬라이드업 — 스탯 그리드, 전체 메모, "당선 선정" / "탈락" 버튼
- **`SelectConfirmModal`**: 중앙 페이드인 다이얼로그 — 크리에이터 정보 카드, "선정" / "취소"

#### 당선 발표 플로우
```
"당선자 N명 발표하기" 탭
  ├─ selectedCount === 0 → Alert "당선자를 먼저 선정해주세요"
  └─ selectedCount > 0 → Alert 확인
       └─ 당선자마다:
            workspaceStore.createFromCampaign() → Workspace 생성
            applicationStore.select(campaignId, workspaceId)
       └─ router.back()
```

---

## 7. 공통 컴포넌트

| 컴포넌트 | 파일 | 설명 |
|---------|------|------|
| `ThemedText` | `components/themed-text.tsx` | 다크모드 대응 텍스트 |
| `ThemedView` | `components/themed-view.tsx` | 다크모드 대응 뷰 |
| `WorkspaceCard` | `features/workspace/components/WorkspaceCard.tsx` | 대시보드 카드 |
| `TodoItem` | `features/todo/components/TodoItem.tsx` | 롱프레스 삭제 지원 |
| `CameraOverlay` | `features/camera/components/CameraOverlay.tsx` | 삼분할선 + 시그니처 이미지 (showGrid prop) |
| `CopyButton` | `features/share/components/CopyButton.tsx` | 복사 버튼 |

---

## 8. AI 연동 현황

| 기능 | 함수 | 파일 | 상태 |
|------|------|------|------|
| 투두 자동 분류 | `matchTodo(base64, todos)` | `services/gemini.ts` | ✅ 연동 완료 |
| 캠페인 텍스트 파싱 | `parseCampaignGuide(text)` | `services/gemini.ts` | ❌ 미구현 |

#### matchTodo 동작 상세
- 입력: `{ id, label, status, imageCount }[]` — PENDING + COMPLETED 항목 모두 전달
- Gemini 프롬프트: 미완료 우선, 완료 항목은 명백히 더 맞을 때만 선택
- Rate Limit(429): `RateLimitError` 파싱 → 큐 자동 대기 후 재시도

#### PhotoProcessingQueue (`services/photo-queue.ts`)
- 직렬 실행: 동시 API 호출 방지
- Rate Limit 자동 재시도: 429 응답 시 `retryAfterSec` 대기 후 재개
- 지수 백오프: 일반 에러 시 1s → 1.5s → 2.25s (최대 3회)
- 구독 기반 UI: `subscribe()`로 pending 목록 + rateLimitRemainSec 실시간 반영
- 언마운트 시 `clear()` 호출

---

## 9. 메모리 누수 방지 패턴

모든 화면에서 아래 두 패턴 적용 완료:

```ts
// 패턴 1 — isMounted (async 작업 후 언마운트 체크)
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);

async function handleAsync() {
  await someAsyncWork();
  if (!isMounted.current) return;
  setState(result);
}

// 패턴 2 — Timer ref (setTimeout/setInterval cleanup)
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
```

#### 적용 파일 목록
| 파일 | 적용 패턴 |
|------|---------|
| `camera.tsx` | `resultBannerRef` + `timerRef` + `focusTimeoutRef` — 큐 cleanup에서 일괄 정리 |
| `workspace/[id]/index.tsx` | `scrollTimerRef` |
| `workspace/[id]/share.tsx` | `isMounted` + `copyTimerRef` |
| `workspace/create.tsx` | `isMounted` |
| `profile-edit/index.tsx` | `isMounted` + `saveTimerRef` |
| `drop/viewer.web.tsx` | `isMounted` + `copyTimerRef` |

---

## 10. 미구현 / 다음 작업 (우선순위 순)

| 순위 | 작업 | 파일 |
|------|------|------|
| 1 | 시그니처 샷 오버레이 — 카메라에 반투명 참고 이미지 | `CameraOverlay`, `camera.tsx`, `signature.tsx` |
| 2 | Gemini Pro 캠페인 텍스트 파싱 (`parseCampaignGuide`) | `services/gemini.ts`, `workspace/create.tsx` |
| 3 | Web Drop S3 실제 업로드 + PC 뷰어 API 연동 | `services/storage.ts`, `share.tsx`, `viewer.web.tsx` |
| 4 | 백엔드 API 연동 (소셜 로그인 SDK, CRUD) | `services/api.ts`, stores |
| 5 | UX 폴리싱 (스켈레톤, 에러 핸들링, 트랜지션) | 각 화면 |

---

## 11. 플랫폼별 파일 분리 규칙

| 접미사 | 플랫폼 |
|--------|--------|
| `.ios.tsx` | iOS 전용 |
| `.web.tsx` / `.web.ts` | 웹 전용 |
| (접미사 없음) | Android + 기본 폴백 |

---

## 12. 개발 명령어

```bash
npm start             # Expo 개발 서버
npm run android       # Android 에뮬레이터
npm run ios           # iOS 시뮬레이터
npm run web           # 웹 브라우저
npm run lint          # ESLint
npx playwright test   # E2E 테스트 (Chromium)
```

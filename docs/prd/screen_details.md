# QUDO — 화면별 개발 상세 내역

> **문서 버전**: v1.0 | **최종 업데이트**: 2026-04-07
> **목적**: 각 화면의 파일 구조, 상태 관리, 핵심 로직, 스토어 연결, 메모리 패턴을 개발자 관점에서 기록

---

## 공통 패턴

### 메모리 누수 방지 패턴

비동기 setState / setTimeout 사용 화면에 일괄 적용:

```typescript
// 비동기 guard
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);
// 사용: async 완료 후 if (!isMounted.current) return;

// 타이머 ref
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
// 사용: timerRef.current = setTimeout(...);
```

### 스토어 구독 패턴

```typescript
const [data, setData] = useState(() => someStore.getData());
useEffect(() => {
  const unsub = someStore.subscribe(() => setData(someStore.getData()));
  return unsub;
}, []);
```

### 스토어 인터페이스 요약

| 스토어 | 파일 | 주요 메서드 |
|--------|------|------------|
| `workspaceStore` | `stores/workspace-store.ts` | `getAll()`, `getById()`, `createFromCampaign()`, `archive()`, `restore()`, `remove()`, `subscribe()` |
| `todoStore` | `stores/todo-store.ts` | `init()`, `get()`, `setAll()`, `toggle()`, `addImage()`, `removeImage()`, `moveImage()`, `addTodo()`, `removeTodo()`, `subscribe()` |
| `userStore` | `stores/user-store.ts` | `hydrate()`, `getRole()`, `setRole()`, `isHydrated()`, `subscribe()` |
| `applicationStore` | `stores/application-store.ts` | `getAll()`, `getById()`, `isApplied()`, `apply()`, `select()`, `reject()`, `subscribe()` |

---

## 타입 정의

### `features/workspace/types.ts`

```typescript
type WorkspaceStatus = 'active' | 'completed' | 'archived';
type WorkspaceCategory = 'FOOD' | 'PRODUCT' | 'DETAIL_PAGE' | 'TRAVEL';
interface Workspace {
  id: string; title: string; location: string;
  category: WorkspaceCategory; status: WorkspaceStatus;
  progress: number; // 0–100
  createdAt: string;
}
```

### `features/todo/types.ts`

```typescript
type TodoStatus = 'PENDING' | 'COMPLETED';
interface Todo {
  id: string; workspaceId: string; label: string;
  status: TodoStatus; order: number; images: string[];
}
```

### `stores/application-store.ts` (내부 타입)

```typescript
type MyApplicationStatus = 'applied' | 'selected' | 'rejected';
interface MyApplication {
  campaignId: string; campaignTitle: string; brand: string; reward: string;
  deadline: string; thumbnailColor: string; type: 'delivery' | 'visit';
  appliedAt: string; status: MyApplicationStatus; workspaceId?: string;
}
```

---

## 화면 상세

---

### 인트로 — `app/index.tsx`

**경로**: `/` (앱 시작점)
**목적**: 브랜드 인트로 애니메이션 후 로그인 화면으로 이동

#### 상태 & Ref

| 이름 | 타입 | 설명 |
|------|------|------|
| `logoOpacity` | `SharedValue<number>` | 로고 페이드인 |
| `logoScale` | `SharedValue<number>` | 로고 스케일 업 |
| `taglineOpacity` | `SharedValue<number>` | 슬로건 페이드인 |
| `taglineY` | `SharedValue<number>` | 슬로건 슬라이드업 |
| `glowOpacity` | `SharedValue<number>` | Electric Cyan 글로우 반복 펄스 |

#### useEffect 흐름

```
마운트 → withTiming/withSequence 애니메이션 시작 (2.4s)
       → setTimeout 2400ms → router.replace('/(auth)/login')
```

- `userStore.hydrate()` 호출 — AsyncStorage에서 역할 복원 (비동기, 인트로 중 완료)
- `StatusBar style="light"` 강제 설정

#### 주의

- 뒤로가기 스택 진입 방지: `router.replace` 사용
- 애니메이션 타이머는 화면 이탈 시 자동 정리됨 (router.replace이므로 unmount 즉시)

---

### 소셜 로그인 — `app/(auth)/login.tsx`

**경로**: `/(auth)/login`
**ID**: LGN-01

#### 데이터

```typescript
const SOCIAL_PROVIDERS = [
  { id: 'kakao', label: '카카오로 로그인', bg: '#FEE500', ... },
  { id: 'naver', label: '네이버로 로그인', bg: '#03C75A', ... },
  { id: 'google', label: 'Google로 로그인', bg: '#fff', border: true, ... },
  { id: 'apple',  label: 'Apple로 로그인', bg: '#000', platforms: ['ios'] },
];
```

#### 핸들러

```typescript
async function handleLogin(providerId: string) {
  // TODO: 실제 SDK 연동 (카카오, 네이버, Google Sign-In, Apple Sign-In)
  router.replace('/(tabs)/');
}
```

#### 플랫폼 필터링

```typescript
const visibleProviders = SOCIAL_PROVIDERS.filter(
  (p) => !p.platforms || p.platforms.includes(Platform.OS)
);
```

- Apple 버튼은 `Platform.OS === 'ios'` 인 경우만 표시
- `router.replace` 사용 → 뒤로가기 스택에서 제거

---

### 대시보드 — `app/(tabs)/index.tsx`

**경로**: `/(tabs)/`
**ID**: WRK-01

#### 상태

| 이름 | 설명 |
|------|------|
| `workspaces` | `workspaceStore.getAll()` 미러 |
| `activeTab` | `'active' \| 'completed' \| 'archived'` |
| `menuVisible` | 롱프레스 컨텍스트 메뉴 표시 여부 |
| `selectedWs` | 메뉴 대상 워크스페이스 |

#### 스토어 구독

```typescript
useEffect(() => {
  const unsub = workspaceStore.subscribe(() =>
    setWorkspaces(workspaceStore.getAll())
  );
  return unsub;
}, []);
```

#### 광고주 리다이렉트

```typescript
useEffect(() => {
  const role = userStore.getRole();
  if (role === 'advertiser') router.replace('/(tabs)/campaign');
}, []);
```

#### 탭 필터링

```typescript
const filtered = workspaces.filter((w) => {
  if (activeTab === 'active')    return w.status === 'active';
  if (activeTab === 'completed') return w.status === 'completed';
  if (activeTab === 'archived')  return w.status === 'archived';
  return true;
});
```

#### 컨텍스트 메뉴 액션

- **보관**: `workspaceStore.archive(id)`
- **복원**: `workspaceStore.restore(id)`
- **삭제**: `workspaceStore.remove(id)` → Alert 확인 후

#### 네비게이션

- 워크스페이스 카드 탭 → `router.push('/workspace/[id]/')`
- FAB `[+]` → `router.push('/workspace/create')`

---

### 워크스페이스 생성 — `app/workspace/create.tsx`

**경로**: `/workspace/create`
**ID**: WRK-02

#### 상태

| 이름 | 설명 |
|------|------|
| `title` | 워크스페이스 이름 |
| `location` | 촬영 장소 |
| `selectedCategory` | `WorkspaceCategory \| null` |
| `campaignText` | AI 파싱용 캠페인 안내문 텍스트 |
| `aiLoading` | AI 분석 로딩 중 |
| `aiTodos` | AI 분석 결과 투두 목록 (미리보기) |
| `isMounted` (ref) | 비동기 guard |

#### 카테고리 프리셋

`constants/categories.ts`의 `CATEGORY_TODOS` 맵에서 카테고리별 기본 투두 배열 가져옴.

#### AI 분석 (미구현)

```typescript
async function handleAnalyze() {
  // TODO: services/gemini.ts parseCampaignGuide(campaignText) 구현 후 연결
  if (!isMounted.current) return;
}
```

#### 워크스페이스 생성 흐름

```
입력 검증 → workspaceStore에 추가 (TODO: API)
           → todoStore.init(newId, todos)
           → router.replace('/workspace/[newId]/')
```

---

### 투두리스트 상세 — `app/workspace/[id]/index.tsx`

**경로**: `/workspace/[id]/`
**ID**: TDO-01

#### 파라미터

- `id`: 워크스페이스 ID (expo-router `useLocalSearchParams`)

#### 상태

| 이름 | 설명 |
|------|------|
| `workspace` | `workspaceStore.getById(id)` |
| `todos` | `todoStore.get(id)` 미러 |
| `expandedTodoId` | 펼쳐진 투두 ID (사진 스택 표시) |
| `moveTarget` | 이미지 이동 대상 선택 모달 |
| `scrollTimerRef` | 스크롤 자동이동 타이머 ref |

#### 스토어 구독 (2개)

```typescript
workspaceStore.subscribe(() => setWorkspace(workspaceStore.getById(id)));
todoStore.subscribe(() => setTodos(todoStore.get(id)));
```

#### 핵심 핸들러

| 핸들러 | 동작 |
|--------|------|
| `handleToggle(todoId)` | `todoStore.toggle()` → 진행률 재계산 |
| `handleLongPress(todoId)` | 투두 삭제 Alert |
| `handleRemoveTodo(todoId)` | `todoStore.removeTodo()` |
| `handleRemoveImage(todoId, idx)` | `todoStore.removeImage()` |
| `handleMoveImage(fromId, toId, idx)` | `todoStore.moveImage()` |

#### 카메라 진입 모드

| 진입 방법 | 파라미터 | 동작 |
|-----------|----------|------|
| "촬영 시작" 버튼 | `todoId` 없음 | `matchTodo()` 자동 분류 |
| 투두 항목 옆 카메라 아이콘 | `?todoId=XXX` | AI 없이 해당 투두에 직접 할당 |

```typescript
// "촬영 시작" 버튼
router.push(`/workspace/${id}/camera`);

// 특정 투두 카메라 아이콘
router.push(`/workspace/${id}/camera?todoId=${todo.id}`);
```

#### 전체 사진 스택 미리보기

투두 항목 탭 → `expandedTodoId` 토글 → 해당 투두의 `images[]` 수평 스크롤 표시
(사진 탭 → 전체화면 뷰어, 롱프레스 → 이동 모달)

#### 메모리 패턴

- `scrollTimerRef` + cleanup useEffect

---

### 스마트 가이드 카메라 — `app/workspace/[id]/camera.tsx`

**경로**: `/workspace/[id]/camera`
**ID**: CAM-01

#### 파라미터

- `id`: 워크스페이스 ID
- `todoId?`: 수동 촬영 대상 투두 (없으면 자동 분류)

#### 상수

```typescript
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const MAX_ZOOM = 0.25;    // expo-camera zoom 0~1 중 실용 최대값
const ZOOM_PRESETS = [
  { label: '0.5×', zoom: 0 },
  { label: '1×',   zoom: 0.005 },
  { label: '2×',   zoom: 0.05 },
] as const;
const RATIO_OPTIONS = ['4:3', '16:9', '1:1'] as const;
```

#### 상태

| 이름 | 타입 | 설명 |
|------|------|------|
| `zoom` | `number` | CameraView zoom prop (0~MAX_ZOOM) |
| `exposure` | `number` | -1 ~ +1 |
| `focusPoint` | `{x,y} \| null` | 탭 포커스 마커 위치 |
| `showExpSlider` | `boolean` | 노출 슬라이더 표시 (탭 포커스 후) |
| `aspectRatio` | `AspectRatio` | `'4:3' \| '16:9' \| '1:1'` |
| `timerMode` | `0 \| 3 \| 10` | 셀프타이머 초 |
| `timerCountdown` | `number \| null` | 카운트다운 표시 |
| `showGrid` | `boolean` | 삼분할선 on/off |
| `settingsVisible` | `boolean` | `...` 설정 모달 |
| `shotCount` | `number` | 이번 세션 촬영 수 |
| `lastVerified` | `string \| null` | 마지막 AI 결과 레이블 |

#### Ref

| 이름 | 설명 |
|------|------|
| `isMounted` | 비동기 guard |
| `cameraRef` | `CameraView` ref |
| `timerRef` | 카운트다운 setInterval ref |
| `focusTimeoutRef` | 포커스 마커 자동 숨김 setTimeout ref |
| `resultBannerRef` | AI 결과 배너 자동 숨김 setTimeout ref |
| `pinchBaseZoom` | 핀치 시작 시 현재 줌 값 스냅샷 |
| `zoomStartVal` | 줌 슬라이더 pan 시작 값 |
| `sliderWidth` | 줌 슬라이더 레이아웃 width |

#### 제스처 구성

```typescript
// 핀치 줌
const pinchGesture = Gesture.Pinch()
  .onStart(() => { pinchBaseZoom.value = zoom; })
  .onUpdate((e) => {
    runOnJS(setZoom)(clamp(pinchBaseZoom.value * e.scale, 0, MAX_ZOOM));
  });

// 탭 포커스
const tapGesture = Gesture.Tap()
  .onEnd((e) => { runOnJS(handleTapFocus)(e.x, e.y); });

// 핀치·탭 경쟁 (동시 방지)
const cameraGesture = Gesture.Race(pinchGesture, tapGesture);

// 줌 슬라이더 (별도 GestureDetector)
const zoomSliderGesture = Gesture.Pan()
  .onStart(() => { zoomStartVal.value = zoom; })
  .onUpdate((e) => { runOnJS(setZoom)(...); });

// 노출 수직 슬라이더 (별도 GestureDetector)
const expPanGesture = Gesture.Pan()
  .onUpdate((e) => { runOnJS(setExposure)(...); });
```

#### 카메라 레이아웃 구조

```
<View style={flex:1, bg:black}>              ← 전체 화면
  <GestureDetector gesture={cameraGesture}>
    <View style={cameraClip}>                ← 비율별 높이 clip
      <CameraView ref={cameraRef} zoom={zoom} exposure={exposure} />
      <CameraOverlay showGrid={showGrid} ... />  ← 삼분할선, 시그니처 오버레이
    </View>
  </GestureDetector>
  <!-- 줌 슬라이더, 노출 슬라이더, 컨트롤 바 — 절대위치 오버레이 -->
</View>
```

비율별 cameraClip 높이 계산:
```typescript
const ratioMap = { '4:3': 4/3, '16:9': 16/9, '1:1': 1 };
const clipH = SCREEN_W * ratioMap[aspectRatio];
```

#### 촬영 흐름

```
handleCapture()
  → 타이머 모드: countdown → setInterval 카운트다운 → 완료 시 실제 촬영
  → cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 })
  → uri + base64 획득

  [todoId 있음 — 수동 촬영 모드]
    → todoStore.addImage(workspaceId, todoId, uri)
    → setShotCount, setLastVerified(현재 투두 레이블)

  [todoId 없음 — 자동 분류 모드]
    → queue.enqueue(id, uri, base64)
    → PhotoProcessingQueue가 matchTodo() 호출
    → 결과: matched → todoStore.addImage(), 결과 배너 표시
    → 결과: null → "매칭 없음" 배너
```

#### PhotoProcessingQueue 구독

```typescript
useEffect(() => {
  const unsub = queue.subscribe((state) => {
    setQueueItems(state.items);
    setRateLimitSec(state.rateLimitRemainSec);
  });
  return () => {
    unsub();
    queue.clear();
    // 타이머 ref 3개 모두 정리
    if (timerRef.current)        clearInterval(timerRef.current);
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    if (resultBannerRef.current) clearTimeout(resultBannerRef.current);
  };
}, []);
```

#### 설정 모달 (`...` 버튼)

- **격자선**: `showGrid` 토글
- **셀프타이머**: `timerMode` → `0 | 3 | 10`
- **화면 비율**: `aspectRatio` → `'4:3' | '16:9' | '1:1'`

#### `CameraOverlay` (`features/camera/components/CameraOverlay.tsx`)

```typescript
interface CameraOverlayProps {
  showGrid?: boolean;        // 삼분할선 (default: true)
  signatureUri?: string;     // 시그니처 오버레이 이미지 URI
  signatureOpacity?: number; // 0~1 (default: 0.4)
}
```

---

### 시그니처 샷 관리 — `app/workspace/[id]/signature.tsx`

**경로**: `/workspace/[id]/signature`
**ID**: CAM-02

#### 상태

| 이름 | 설명 |
|------|------|
| `signatures` | 저장된 시그니처 이미지 URI 목록 |
| `selectedUri` | 현재 선택된 시그니처 |
| `opacity` | 오버레이 투명도 (0~0.8) |

#### 핸들러

```typescript
// 갤러리에서 이미지 선택
async function handlePickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
  if (!result.canceled) setSignatures([...signatures, result.assets[0].uri]);
}

// "이 구도로 촬영" → 카메라 진입
// TODO (Job 1): signatureUri 파라미터 전달
function handleShootWithSignature(uri: string) {
  router.push(`/workspace/${id}/camera?signatureUri=${encodeURIComponent(uri)}`);
}
```

#### 미구현 (Job 1)

`camera.tsx`에서 `signatureUri` 파라미터 수신 후 `CameraOverlay`에 전달하는 연결이 아직 없음.
`CameraOverlay` 컴포넌트 자체는 `signatureUri` + `signatureOpacity` prop을 이미 지원함.

---

### Web Drop 링크 발급 — `app/workspace/[id]/share.tsx`

**경로**: `/workspace/[id]/share`
**ID**: SHR-01

#### 상태

| 이름 | 설명 |
|------|------|
| `token` | 발급된 공유 토큰 |
| `password` | 비밀번호 입력값 |
| `usePassword` | 비밀번호 보호 활성화 여부 |
| `generating` | 링크 생성 중 로딩 |
| `copied` | 복사 완료 피드백 |
| `isMounted` (ref) | 비동기 guard |
| `copyTimerRef` | "복사됨" 피드백 타이머 ref |

#### 핸들러

```typescript
async function handleGenerate() {
  setGenerating(true);
  // TODO: 실제 S3 업로드 + 토큰 발급 API (현재 mock)
  await new Promise(r => setTimeout(r, 1500));
  if (!isMounted.current) return;
  setToken(generateMockToken());
  setGenerating(false);
}

async function handleCopy() {
  await Clipboard.setStringAsync(shareUrl);
  setCopied(true);
  copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
}
```

#### 공유 URL 형식

```typescript
const shareUrl = `https://qudo.app/drop/${token}`;
// 또는 개발 중: `exp://localhost:8081/drop/${token}`
```

---

### 마이페이지 — `app/mypage.tsx`

**경로**: `/mypage`
**ID**: MYP-01

#### 상태

| 이름 | 설명 |
|------|------|
| `role` | `userStore.getRole()` 미러 |
| `profile` | 사용자 프로필 (mock) |
| `channels` | SNS 채널 목록 (Instagram/YouTube/TikTok/블로그) |
| `badges` | 뱃지 목록 (10종, `features/mypage/badges.ts`) |
| `channelModalVisible` | 채널 등록 모달 |

#### 역할 전환

```typescript
async function handleSwitchToAdvertiser() {
  await userStore.setRole('advertiser');
  router.replace('/(tabs)/campaign');
}

async function handleSwitchToCreator() {
  await userStore.setRole('creator');
  router.replace('/(tabs)/');
}
```

#### 뱃지 시스템

`features/mypage/badges.ts`에서 10종 뱃지 정의.
각 뱃지: `{ id, label, icon, description, unlocked: boolean }`

#### 채널 정보 등록

플랫폼별 핸들(`@username`) + 팔로워 수 입력.
`SocialPlatform`: `'instagram' | 'youtube' | 'tiktok' | 'blog'`

---

### 프로필 편집 — `app/profile-edit/index.tsx`

**경로**: `/profile-edit/`
**ID**: PRF-EDIT-01

#### 상태

| 이름 | 설명 |
|------|------|
| `name` | 표시 이름 |
| `email` | 이메일 (표시 전용, 소셜 로그인) |
| `bio` | 자기소개 |
| `saving` | 저장 중 로딩 |
| `isMounted` (ref) | 비동기 guard |
| `saveTimerRef` | 저장 완료 피드백 타이머 ref |

#### 핸들러

```typescript
async function handleSave() {
  setSaving(true);
  // TODO: API 연동
  await new Promise(r => setTimeout(r, 800));
  if (!isMounted.current) return;
  setSaving(false);
  saveTimerRef.current = setTimeout(() => router.back(), 500);
}
```

---

### 캠페인 찾기 / 광고주 캠페인 관리 — `app/(tabs)/campaign.tsx`

**경로**: `/(tabs)/campaign`
**ID**: CPG-01 (크리에이터) / CPG-ADV-01 (광고주)

#### 역할 분기

```typescript
const role = userStore.getRole();
if (role === 'advertiser') return <AdvertiserCampaignView />;
return <CreatorCampaignView />;
```

#### 크리에이터 뷰 상태

| 이름 | 설명 |
|------|------|
| `campaigns` | MOCK 캠페인 목록 |
| `search` | 검색어 |
| `selectedType` | `'all' \| 'delivery' \| 'visit'` |
| `selectedCategory` | 카테고리 필터 |
| `appliedIds` | `applicationStore.getAll()` 신청 ID 집합 |

#### 광고주 뷰 상태

| 이름 | 설명 |
|------|------|
| `myCampaigns` | 등록한 캠페인 목록 (mock) |
| `statsMap` | 캠페인별 신청자 수 |

#### 광고주 뷰 네비게이션

- "캠페인 등록" → `router.push('/advertiser/create-campaign')`
- 캠페인 카드 탭 → `router.push('/advertiser/applicants/[id]')`
- 마이페이지 버튼 (헤더) → `router.push('/mypage')`

#### 캠페인 타입

```typescript
type CampaignType = 'delivery' | 'visit';
interface Campaign {
  id: string; title: string; brand: string; type: CampaignType;
  category: string; reward: string; deadline: string;
  applicants: number; maxApplicants: number;
  thumbnailColor: string; description: string;
  requirements: string[]; todoPreset: string[];
}
```

---

### 캠페인 상세 & 신청 — `app/campaign/[id].tsx`

**경로**: `/campaign/[id]`
**ID**: CPG-02

#### 파라미터

- `id`: 캠페인 ID

#### 상태

| 이름 | 설명 |
|------|------|
| `campaign` | 캠페인 상세 (MOCK_CAMPAIGNS에서 조회) |
| `isApplied` | `applicationStore.isApplied(id)` |
| `applying` | 신청 처리 중 |

#### 신청 흐름

```typescript
async function handleApply() {
  setApplying(true);
  // TODO: API 연동
  await new Promise(r => setTimeout(r, 1000));
  applicationStore.apply(campaign);
  setIsApplied(true);
  setApplying(false);
}
```

#### 워크스페이스 자동 생성 미리보기

신청 성공 후 당선 시 생성될 워크스페이스 구조를 미리 카드로 표시.

---

### 내 신청 현황 — `app/my-applications/index.tsx`

**경로**: `/my-applications/`
**ID**: MY-APP-01

#### 상태

| 이름 | 설명 |
|------|------|
| `applications` | `applicationStore.getAll()` 미러 |
| `filter` | `'all' \| 'applied' \| 'selected' \| 'rejected'` |

#### 스토어 구독

```typescript
useEffect(() => {
  const unsub = applicationStore.subscribe(() =>
    setApplications(applicationStore.getAll())
  );
  return unsub;
}, []);
```

#### 당선 시 워크스페이스 바로가기

```typescript
if (app.status === 'selected' && app.workspaceId) {
  router.push(`/workspace/${app.workspaceId}/`);
}
```

---

### Web Drop 뷰어 라우터 — `app/drop/[token].tsx`

**경로**: `/drop/[token]`
**ID**: SHR-03 (진입점)

#### 역할

플랫폼 분기 라우터. 실제 렌더링은 플랫폼별 파일로 위임.

```typescript
// 웹: viewer.web.tsx 자동 선택 (Expo 플랫폼 분기)
// 모바일: viewer.tsx 렌더 ("PC에서 열어주세요" 안내)
```

---

### Web Drop PC 뷰어 — `app/drop/viewer.web.tsx`

**경로**: `/drop/viewer` (웹 전용)
**ID**: SHR-03 (실제 뷰어)

#### 상태

| 이름 | 설명 |
|------|------|
| `authenticated` | 비밀번호 게이트 통과 여부 |
| `password` | 비밀번호 입력값 |
| `assets` | 이미지 목록 (mock) |
| `filter` | 투두 레이블 필터 |
| `lightbox` | 전체화면 뷰어 대상 인덱스 |
| `downloading` | 전체 다운로드 중 |
| `isMounted` (ref) | 비동기 guard |
| `copyTimerRef` | 복사 피드백 타이머 ref |

#### 비밀번호 게이트

```typescript
// TODO: 실제 API 검증
function handleAuth() {
  if (password === MOCK_PASSWORD) setAuthenticated(true);
}
```

#### 드래그 앤 드롭 (웹)

```typescript
onDragStart={(e) => {
  e.dataTransfer.setData('text/uri-list', imageUri);
  e.dataTransfer.setData('text/plain', imageUri);
}}
```

#### 라이트박스

- 키보드 이벤트 (`ArrowLeft`, `ArrowRight`, `Escape`) 구독
- `useEffect` cleanup에서 `document.removeEventListener`

#### 다운로드

```typescript
async function handleDownloadAll() {
  setDownloading(true);
  // TODO: S3 presigned URL → 개별 fetch + zip
  await new Promise(r => setTimeout(r, 2000));
  if (!isMounted.current) return;
  setDownloading(false);
}
```

#### 메모리 패턴

- `isMounted` + `copyTimerRef` + cleanup useEffect
- 키보드 이벤트 리스너 제거

---

### 캠페인 등록 — `app/advertiser/create-campaign.tsx`

**경로**: `/advertiser/create-campaign`
**ID**: CPG-ADV-02

#### 상태

| 이름 | 설명 |
|------|------|
| `type` | `'delivery' \| 'visit'` |
| `category` | 캠페인 카테고리 |
| `title`, `brand` | 기본 정보 |
| `reward` | 혜택 내용 |
| `deadline` | 마감일 |
| `maxApplicants` | 모집 인원 |
| `requirements` | 필수 조건 목록 |
| `todoPreset` | 촬영 미션 투두 목록 |
| `description` | 상세 설명 |

#### 제출 흐름

```typescript
function handleSubmit() {
  // TODO: API POST /campaigns
  router.back();
}
```

---

### 신청자 목록 & 당선자 선정 — `app/advertiser/applicants/[id].tsx`

**경로**: `/advertiser/applicants/[id]`
**ID**: CPG-ADV-03

#### 파라미터

- `id`: 캠페인 ID

#### 상태

| 이름 | 설명 |
|------|------|
| `campaign` | 캠페인 정보 |
| `applicants` | `Applicant[]` 목록 |
| `mode` | `'list' \| 'select'` |
| `selectedIds` | 당선 선택된 신청자 ID Set |

#### 당선자 선정 흐름

```typescript
function handleConfirmSelection() {
  // selectedIds → workspaceStore.createFromCampaign() 호출
  // applicationStore.select() 호출
  // TODO: API POST /campaigns/{id}/select
  router.back();
}
```

#### `Applicant` 타입 (`features/campaign/applicant.types.ts`)

```typescript
interface Applicant {
  id: string; name: string; handle: string;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'blog';
  followers: number; appliedAt: string;
  status: 'pending' | 'selected' | 'rejected';
  profileImage?: string;
}
```

---

## 서비스 레이어

### `services/gemini.ts`

| 함수 | 상태 | 설명 |
|------|------|------|
| `matchTodo(base64, todos[])` | ✅ 연동 | 전체 투두 목록에서 자동 매칭 (confidence < 0.45 → null) |
| `classifyImage(base64, label)` | ✅ 구현 (미사용) | 특정 투두 레이블과 사진 일치 판정 |
| `parseCampaignGuide(text)` | ❌ 미구현 | 캠페인 텍스트 → 투두 배열 (Job 2) |
| `RateLimitError` | ✅ | `retryAfterSec` 필드로 대기 시간 전달 |

**환경변수**: `EXPO_PUBLIC_GEMINI_API_KEY`
**모델**: `gemini-2.5-flash` (Flash URL 사용)
**thinkingBudget**: `0` (빠른 응답 우선)

### `services/photo-queue.ts` — `PhotoProcessingQueue`

```typescript
class PhotoProcessingQueue {
  constructor(processFn: (item: QueueItem) => Promise<void>)
  enqueue(id: string, uri: string, base64: string): void
  subscribe(listener: (state: QueueState) => void): () => void
  clear(): void
  get pendingCount(): number
  getState(): QueueState
}

interface QueueState {
  items: QueueItem[];         // 전체 큐 스냅샷
  rateLimitRemainSec: number; // 0이면 rate limit 없음
}
```

- **직렬 처리**: `running` flag로 동시 API 호출 방지
- **Rate Limit**: 429 → `RateLimitError` → `rateLimitUntil` 설정 → 1초 인터벌로 countdown notify → 해제 후 자동 재개
- **지수 백오프**: 일반 에러 → `1000 × 1.5^retryCount` ms 대기 → 최대 3회

---

## 스토어 상세

### `stores/workspace-store.ts`

**내부 상태**: `_workspaces: Workspace[]` (인메모리 배열, 앱 재시작 시 초기화)

| 메서드 | 설명 |
|--------|------|
| `getAll()` | 전체 워크스페이스 배열 복사본 반환 |
| `getById(id)` | 단건 조회 |
| `createFromCampaign({ title, brand, location, category })` | 캠페인 당선 시 자동 생성, `[캠페인] ` 접두사, 맨 앞에 삽입 |
| `archive(id)` | status → `'archived'` |
| `restore(id)` | status → `'active'` |
| `remove(id)` | 배열에서 제거 |
| `subscribe(fn)` | observer 등록, unsubscribe 함수 반환 |

**카테고리 매핑** (캠페인 → 워크스페이스):
`BEAUTY → PRODUCT`, `LIFESTYLE → PRODUCT`, 나머지 1:1

### `stores/todo-store.ts`

**내부 상태**: `_store: Record<string, Todo[]>` (workspaceId → Todo 배열)

| 메서드 | 설명 |
|--------|------|
| `init(wsId, todos)` | 최초 1회만 설정 (이미 있으면 무시) |
| `get(wsId)` | 투두 배열 반환 |
| `toggle(wsId, todoId)` | `PENDING ↔ COMPLETED` 토글 |
| `addImage(wsId, todoId, uri)` | 이미지 추가 + status → `COMPLETED` |
| `removeImage(wsId, todoId, idx)` | 이미지 삭제, images 빈 배열이면 → `PENDING` |
| `moveImage(wsId, fromId, toId, idx)` | 이미지를 다른 투두로 이동, 양쪽 status 재계산 |
| `addTodo(wsId, todo)` | 투두 항목 추가 |
| `removeTodo(wsId, todoId)` | 투두 항목 삭제 |

### `stores/user-store.ts`

**내부 상태**: `_role: UserRole` + AsyncStorage 영속화

- `hydrate()`: 앱 시작 시 1회 (`app/index.tsx`에서 호출)
- `setRole(role)`: 메모리 업데이트 + AsyncStorage 저장 (비동기, 실패해도 메모리 유지)
- **스토리지 키**: `@qudo/user_role`

### `stores/application-store.ts`

**내부 상태**: `_applications: MyApplication[]` (인메모리, c3는 초기 mock 데이터)

| 메서드 | 설명 |
|--------|------|
| `isApplied(cId)` | 중복 신청 방지 체크 |
| `apply(campaign)` | 신청 추가 (중복이면 무시) |
| `select(cId, wsId)` | 당선 처리 + workspaceId 저장 |
| `reject(cId)` | 미당선 처리 |

---

## 미구현 / TODO 항목

| 위치 | 내용 | Job |
|------|------|-----|
| `app/workspace/[id]/signature.tsx` | `camera?signatureUri=` 파라미터 전달 | Job 1 |
| `app/workspace/[id]/camera.tsx` | `signatureUri` 파라미터 수신 → CameraOverlay 전달 | Job 1 |
| `services/gemini.ts` | `parseCampaignGuide(text)` 구현 | Job 2 |
| `app/workspace/create.tsx` | AI 분석 버튼 → `parseCampaignGuide()` 연결 | Job 2 |
| `services/storage.ts` | S3 presigned URL 업로드 | Job 3 |
| `app/workspace/[id]/share.tsx` | 실제 업로드 + 토큰 발급 API | Job 3 |
| `app/drop/viewer.web.tsx` | 실제 API 데이터 + 비밀번호 검증 | Job 3 |
| `app/(auth)/login.tsx` | 소셜 로그인 SDK 연동 | Job 4 |
| `stores/workspace-store.ts` | API 기반 CRUD 교체 | Job 4 |
| `stores/todo-store.ts` | API 기반 CRUD 교체 | Job 4 |
| `stores/application-store.ts` | API 기반 신청/당선 교체 | Job 4 |

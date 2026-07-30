# Onflow Demo — 수정 규약 (이 문서가 곧 프롬프트다)

> 이 레포를 수정하는 사람/AI는 이 문서를 **먼저 읽고, 여기 적힌 규칙 안에서만** 작업한다.
> 규칙과 충돌하는 요청을 받으면, 바꾸기 전에 이 문서의 해당 항목을 먼저 언급하고 확인을 받는다.

---

## 0. 이 레포가 뭔가 (30초)

**Onflow** — 비개발자 팀을 위한 AI 업무 플랫폼의 **인터랙티브 목업**이다. 백엔드 없음, 전부 목 데이터.
핵심 데모 가치는 단 하나: **"타이핑하는 동안 AI가 의도를 파악해서, 실행 전에 결과물을 먼저 보여준다"** (자동차 물리 버튼처럼 — 믿고 누르는 경험).

- 스택: React 19 + Vite + TypeScript + Tailwind v4 + SEED Design(React 2.1) + framer-motion
- 실행: `npm run dev` → http://localhost:5173
- 배포 빌드: `GHPAGES=1 npm run build` (GitHub Pages 경로 필수 — vite.config가 env로 받는다. `--base` 플래그는 Git Bash가 경로를 망가뜨리니 쓰지 말 것)
- UI 언어: **영어** (A16Z 시연용). 코드 주석은 한국어 OK.

---

## 1. 절대 규칙 (어기면 되돌린다)

1. **실행 전 미리보기 철학을 깨지 않는다.** 어떤 외부 발송(Slack/메일/캘린더)도 "카드에서 확인 → 버튼 클릭" 없이 즉시 실행되는 UX로 바꾸지 말 것. "Nothing is sent until you run it" 카피와 흐름은 제품의 정체성이다.
2. **승인 큐 의미를 유지한다.** Approvals 페이지 = 사람이 승인해야 나가는 초안. "자동 발송" 같은 기능/카피 추가 금지 (실제 MOHO 안전 규칙에서 온 제약).
3. **권한 카피를 유지한다.** "권한 밖 문서는 존재도 드러나지 않는다(no-existence-leak)" 관련 문구는 제품 차별화 포인트다. 삭제하지 말 것.
4. **색은 하드코딩하지 않는다.** 모든 색은 `--m3-*` CSS 변수 (theme.ts가 생성) 또는 도구 브랜드색(`TOOLS[].color`, `SOURCE_COLOR`)만 사용. 라이트/다크 둘 다에서 확인 안 한 색 변경은 금지.
5. **그라디언트 금지.** 오로라/오브/그라디언트 보더는 의사결정으로 **제거**된 상태다(클린 Material 3로 확정). 다시 넣지 말 것.
6. **당근 오렌지(#FF6F0F 계열)와 구글 4색 조합 금지.** SEED 브랜드 토큰은 theme.ts에서 M3 primary(인디고)로 오버라이드되어 있다 — 그 오버라이드를 지우면 버튼이 당근색으로 돌아가니 건드리지 말 것.
7. **UI 문자열은 영어로.** 한국어 문자열을 UI에 추가하지 않는다 (주석은 자유).
8. **`seed-design/` 폴더는 수정하지 않는다.** SEED CLI가 관리하는 스니펫이다. 커스터마이징이 필요하면 우리 컴포넌트(`src/components/`)에서 감싼다.
9. **팀원 목록에 '성모/Sungmo'를 넣지 않는다.** 그분은 A16Z 대표다. 팀원은 Junwon·Sihoon·Jinho·Jihoon.
10. **시크릿 금지.** 토큰·API 키·실고객 데이터를 커밋하지 않는다. 목 데이터는 이미 있는 스타일(실제 고객명 기반이되 수치는 가짜)을 따른다.

---

## 2. 디자인 시스템 규약

### 색 (Material 3)
- 팔레트는 `src/theme.ts`의 시드 컬러 `#4E5FD9` 하나에서 **런타임 생성**된다. 브랜드 색을 바꾸고 싶으면 **그 한 줄만** 바꾼다 — 라이트/다크 전체가 따라온다.
- 쓸 수 있는 변수: `--m3-primary`, `--m3-on-primary`, `--m3-primary-container`, `--m3-on-primary-container`, `--m3-secondary(-container)`, `--m3-tertiary(-container)`, `--m3-error(-container)`, `--m3-surface`, `--m3-surface-container-{lowest,low,'',high,highest}`, `--m3-on-surface(-variant)`, `--m3-outline(-variant)`, `--m3-inverse-*`
- 용법: 강조=primary, 선택 상태 배경=secondary-container, 엔티티/특수=tertiary, 파괴적=error. Tailwind에선 `bg-[var(--m3-primary)]` 식 arbitrary value로 쓴다.
- 예외적으로 허용된 고정색: 도구 로고·카드 헤더의 브랜드색 (Slack `#4A154B`, Gmail `#C5221F`, Notion `#191919`, Calendar `#1A73E8`), 그래프 소스색(`SOURCE_COLOR`), 팀원 아바타색.
- **라이트 모드 서피스는 하늘빛 에어리 커스텀**(#eef4fa 계열, Aside 브라우저 레퍼런스)이다 — theme.ts에 의도적으로 하드코딩되어 있으니 "M3 뉴트럴로 정정"하지 말 것. 다크는 M3 뉴트럴 유지.

### 형태
- 카드: **보더 없음**. `Card` 컴포넌트(`src/components/ui.tsx`) = surface + 은은한 그림자. 새 카드도 반드시 이걸 쓰거나 같은 패턴을 따른다. `border border-...` 클래스로 외곽선 치지 말 것 (입력창 컴포저만 예외).
- 라운딩: 카드 `rounded-2xl`, 칩/작은 버튼 `rounded-lg`, 내비 레일 활성 인디케이터는 M3 정석 **알약형**(`rounded-full` stadium), 검색바 `rounded-full`.
- 아이콘: `@seed-design/icon`의 `Icon*Regular`만. 새 아이콘이 필요하면 그 패키지에서 찾는다 (인라인 SVG는 도구 로고 등 기존 것만).

### 모션 (M3 Expressive)
- `src/motion.ts`의 프리셋만 사용:
  - `spatialExpressive` — 위치·크기 변화(카드 등장, 리스트 스태거). 스프링, 오버슈트 허용.
  - `effect` — 색·투명도 변화. 180ms ease, **바운스 금지**.
- 새 애니메이션에 인라인으로 duration/ease를 지어내지 말 것. 항상 프리셋 import.
- `MotionConfig reducedMotion="user"`가 걸려 있다 — CSS 키프레임을 추가하면 `@media (prefers-reduced-motion: reduce)` 대응도 같이 넣는다 (index.css 하단 패턴 참고).
- 에이전트 상태는 `agent-dot` (`index.css`): 대기=정지, 생각=`--thinking` 펄스, 카드 준비=`--ready` 링. 이 3-상태 문법을 유지한다.

### 타이포
- Pretendard (index.html에서 CDN 로드). 크기는 주변 코드 패턴을 따른다 (본문 14–15px, 메타 11–13px, 페이지 타이틀 26px, 홈 히어로 clamp 32–44px).

---

## 3. 제품 개념 규약 (카드 3종)

Workspace 컴포저 위에 뜨는 카드는 세 종류이고, **우선순위가 있다** (`intent.tsx`의 `detect()`):

1. **즉답 카드 (Availability)** — 질문형. "when is everyone free?" → 팀 캘린더 교집합을 계산해 타임라인으로 보여준다. 데이터는 `memberSchedules`에서 **실제로 계산**된다 (하드코딩 아님). 여기서 [Book this slot]/[Draft team notice]로 실행 카드로 **체이닝**된다.
2. **상충 카드 (Conflict)** — 소스 간 값이 다를 때. ERP vs Drive처럼 두 옵션을 보여주고 기준을 고르게 한 뒤 실행 카드로 체이닝. "선택은 기록되고 다음부터 자동 적용" 카피 유지.
3. **실행 카드 (Action)** — 도구 브랜드색 헤더 + 편집 가능한 초안 + 실행 버튼. 도구별 초안은 `slackDraft`/`mailDraft`/`notionDraft`/`calendarDraft` 함수가 입력 텍스트에서 생성한다 ("2pm to 3pm" 같은 시간 표현 파싱 포함).

**감지 규칙 수정 시**: 정규식은 **영어+한국어 겸용**으로 유지한다. 새 패턴을 넣으면 반드시 데모 문장으로 실제 타이핑 테스트를 한다. 오탐(의도 없는 문장에 카드가 뜨는 것)이 미탐보다 나쁘다 — 신뢰가 제품이다.

**새 카드 타입을 추가하려면**: `Detected` 유니온에 kind 추가 → `detect()`에 우선순위 자리 결정 → Workspace footer의 `AnimatePresence` 블록 패턴(스프링 등장, aria-label, Dismiss 버튼, Esc 지원) 복제 → 체이닝이 필요하면 `xxxToAction()` 헬퍼.

---

## 4. 코드 지도

| 파일 | 역할 | 자주 바꾸는 것 |
|---|---|---|
| `src/data.ts` | **모든 목 데이터** (스레드, 팀원, 캘린더, 브리핑, 승인, 문서, 연동) | 데모 내용/고객명/수치 |
| `src/intent.tsx` | 도구 메타(TOOLS), 의도 감지, 초안 생성, 가용시간 계산, 체이닝 | 감지 패턴, 초안 문구 |
| `src/theme.ts` | M3 스킴 생성 + SEED 브랜드 오버라이드 | 시드 컬러 (한 줄) |
| `src/motion.ts` | 모션 프리셋 2종 | (거의 안 바꿈) |
| `src/index.css` | agent-dot, progress-line, slot-band, reduced-motion | 상태 표현 |
| `src/App.tsx` | 셸(레일/톱바), 페이지 라우팅, ⌘K 팔레트, 토스트, 승인 상태 | 내비 항목, 팔레트 항목 |
| `src/pages/Home.tsx` | 히어로 + 스탯 + 브리핑(클릭 시 워크스페이스 시드) | 브리핑은 data.ts에서 |
| `src/pages/Workspace.tsx` | 세션 레일, 스레드, 카드 3종, 컴포저, 데모 러너, 빈 세션 | 시나리오(SCENARIOS), 카드 |
| `src/pages/Approvals.tsx` | 메일/슬랙 **실물 모양** 초안 + 승인/반려 | 초안은 data.ts에서 |
| `src/pages/Knowledge.tsx` | Company Memory 그래프(포스 레이아웃) + 인스펙터 + 문서 목록 | 엔티티(ENTITIES)/연결(EDGES) |
| `src/pages/Integrations.tsx` | 연동 그리드 | 목록은 data.ts에서 |
| `seed-design/` | SEED 스니펫 — **수정 금지** | — |

상태 흐름: `App`이 `approvals`·`seed`(워크스페이스에 심을 문장)·페이지를 소유. Home 브리핑 클릭/⌘K/메모리 "Ask" 버튼 → `openBrief(prompt)` → Workspace가 자동 타이핑(`runSeed`). Workspace는 세션별 스레드를 소유하고 첫 메시지로 세션 제목 자동 생성.

---

## 5. 자주 하는 수정 레시피

- **데모 문장/시나리오 바꾸기**: `Workspace.tsx`의 `SCENARIOS` + `PLACEHOLDERS`. 문장을 바꾸면 **감지 정규식에 걸리는지** 먼저 확인 (안 걸리면 intent.tsx 패턴도 같이).
- **브리핑 항목 추가**: `data.ts`의 `briefing[]`에 `{tool, title, detail, time, prompt}` — `prompt`는 클릭 시 워크스페이스에 타이핑될 문장이므로 반드시 카드 하나를 유발하는 문장으로.
- **고객사/수치 바꾸기**: `data.ts` + `intent.tsx`의 초안 함수들 + `aqaraBriefing`. 아카라라이프 시나리오는 실제 영업 이력(견적 7/22, 담당 이상현, 에피소드 강남 262) 기반 — 바꿀 땐 일관되게 전부.
- **브랜드 색 바꾸기**: `theme.ts`의 `SOURCE = '#4E5FD9'` 한 줄. 절대 개별 컴포넌트에서 색을 덮지 말 것.
- **그래프 노드 추가**: `Knowledge.tsx`의 `ENTITIES`/`EDGES` (+ 문서는 data.ts `docs`). 노드 15개 이하 유지 — 그래프는 50노드 넘으면 hairball이 된다.
- **새 페이지**: `pages/`에 추가 → `App.tsx`의 `Page` 타입 + `NAV` + `TITLES` + 렌더 분기. 페이지 헤더는 `PageHeader` 사용.
- **고스트 자동완성 문장 추가**: `Workspace.tsx`의 `SUGGESTIONS` 배열. 입력 접두어가 일치하면 나머지가 섀도로 뜨고 **Tab**으로 완성된다. 여기 넣는 문장도 감지 정규식에 걸리는 문장이어야 한다.
- **Recent tasks(홈)**: 시드는 `data.ts`의 `seedRecent`, 실행/승인 시 `App.tsx`의 `recordRun`이 자동으로 쌓는다.

---

## 6. 커밋 전 체크리스트 (전부 통과해야 함)

```bash
npx tsc -b        # 에러 0
npm run lint      # 기존 경고 2개(ui.tsx fast-refresh, Workspace thread deps) 외 새 경고 금지
```

수동 스모크 (브라우저, **탭을 보이게 두고**):
1. "Trying to set a meeting tomorrow — when is everyone free?" → 가용시간 카드, 15:00–16:00 강조
2. "Notify logistics about SKUs below safety stock" → 상충 카드 → ERP 선택 → Slack 카드에 기준 명시
3. "Email Sanghyun to schedule the meeting" → Gmail 카드 (sanghyun@aqara.kr)
4. **대조군**: "hmm about that thing yesterday" → 카드 없이 프로그레스 라인만 (오탐 = 실패)
5. 다크 토글 → 모든 화면에서 색 깨짐 없음
6. Demo 칩 3개 재생 완주

---

## 7. 알려진 함정

- **백그라운드 탭에서 애니메이션/타이머가 멈춘다.** 데모 타이핑이 안 움직이면 탭이 가려진 것 (숨김 탭은 setTimeout이 1초로 클램프됨). `typeIn`/`runSeed`에 `document.hidden`이면 즉시 입력하는 가드가 이미 있다 — 지우지 말 것.
- **AnimatePresence exit 중인 카드가 숨김 탭에서 DOM에 남는다.** 자동화 테스트로 카드를 찾을 땐 `querySelectorAll(...)`의 **마지막** 요소를 집어라.
- **Pages 배포는 base 경로 필수**: `GHPAGES=1 npm run build`. 빼먹으면 배포에서 에셋 404. (`--base` CLI 플래그는 Git Bash의 MSYS 경로 변환이 `/onflow-demo/`를 `C:/Program Files/Git/...`로 바꿔버려서 금지 — 실제로 한 번 터졌다.)
- **npm run build에 tsc가 포함**되어 있다 (`tsc -b && vite build`) — 타입 에러가 있으면 빌드 자체가 실패한다.
- 컴포저 `textarea`는 제어 컴포넌트다. 자동화로 값을 넣으려면 native setter + `input` 이벤트 디스패치가 필요하다.

---

## 8. 하지 말 것 (요약)

그라디언트/오로라/오브 재도입 · 카드에 보더 · 당근 오렌지/구글 4색 · 색 하드코딩 · 한국어 UI 문자열 · seed-design/ 수정 · 자동 발송 UX · 승인 없는 외부 효과 · 성모를 팀원으로 · 시크릿 커밋 · 감지 패턴을 테스트 없이 변경 · motion 프리셋 무시한 인라인 애니메이션

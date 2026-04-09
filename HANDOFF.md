# 솜씨인테리어 체크리스트 앱 — 핸드오프 문서

> 마지막 업데이트: 2026-03-20 16:30 KST

## 프로젝트 개요

인테리어 시공 업체 "솜씨인테리어"를 위한 현장 시공 체크리스트/견적서/실측 관리 웹앱.
아버지(인테리어 업자)가 현장에서 아이패드/아이폰으로 사용하는 것이 주 목적.

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 3.4 + CSS 변수 (globals.css) |
| UI 컴포넌트 | shadcn/ui (Radix UI 기반) |
| 상태관리 | React useState + localStorage (zustand은 설치만 됨) |
| DB | SQLite (Prisma ORM) |
| 인증 | bcryptjs + 쿠키 기반 세션 (자체 구현) |
| 폰트 | Pretendard Variable (CDN) |

## 디렉토리 구조

```
/Users/my-o/Projects/interior-checklist/
├── prisma/
│   ├── schema.prisma          # DB 스키마
│   ├── dev.db                 # SQLite DB 파일
│   └── prisma.config.ts
├── public/
│   ├── logo.png               # 회사 로고
│   └── stamp.png              # 직인 (아직 미제공)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 루트 레이아웃 (ThemeProvider)
│   │   ├── globals.css        # CSS 변수 + 디자인 시스템
│   │   ├── page.tsx           # 루트 (→ /login 리다이렉트)
│   │   ├── login/page.tsx     # 로그인 (153줄)
│   │   ├── dashboard/page.tsx # 프로젝트 목록 (373줄)
│   │   ├── project/[id]/page.tsx    # 체크리스트 (730줄) ★ 핵심
│   │   ├── estimate/[id]/page.tsx   # 견적서 (887줄) ★ 핵심
│   │   ├── measurement/[id]/page.tsx # 실측 요약 (510줄)
│   │   ├── settings/checklist/      # 체크리스트 설정
│   │   ├── settings/materials/      # 자재 설정
│   │   └── api/
│   │       ├── auth/route.ts
│   │       ├── projects/route.ts
│   │       ├── projects/[id]/route.ts
│   │       ├── checklists/[projectId]/route.ts
│   │       └── estimates/[projectId]/route.ts
│   ├── components/
│   │   ├── mobile-menu.tsx    # MobileMenuButton + SidebarWrapper
│   │   └── ui/               # shadcn/ui (button, card, checkbox, input, label, radio-group)
│   ├── lib/
│   │   ├── auth.ts           # getSessionUser(req)
│   │   ├── prisma.ts         # PrismaClient singleton
│   │   ├── store.ts          # (거의 미사용)
│   │   ├── theme.tsx         # ThemeProvider + useTheme
│   │   └── utils.ts          # cn() (clsx + tailwind-merge)
│   └── types/
│       └── checklist.ts      # 타입 정의 (대부분 미사용, 실제 데이터는 동적 JSON)
```

## DB 스키마

```
User: id, email, password, name, role(USER|ADMIN)
Project: id, name, clientName?, address?, status, userId
Checklist: id, data(JSON), siteInfo(JSON), specialNotes, roomData(JSON), projectId, userId
Estimate: id, items(JSON), laborCost, discount, notes, projectId, userId
```

### 현재 DB 유저
- email: `zxc6231@gmail.com`, PW: `Zmfpelt369963@`, name: `묭`, role: ADMIN

## 핵심 데이터 구조

### checklist.data (JSON)
```json
{
  "sectionId": {
    "itemName": {
      "checked": true,
      "detail": "",
      "value": "",
      "note": "",
      "options": ["선택한옵션1", "선택한옵션2"]
    }
  }
}
```
**sectionId 목록**: `roomSize`, `demolition`, `flooring`, `bathroom`, `carpentry`, `electrical`, `film`, `tile`, `furniture`, `finishing`

### checklist.roomData (JSON)
```json
{
  "sectionId_itemName": {
    "거실": { "checked": true, "value": "3000×4500", "note": "" },
    "안방 1": { "checked": false, "value": "", "note": "" }
  }
}
```
- value 형식: `"W×H"` (mm) 또는 다중 세그먼트 `"W×H|W×H"` (파이프 구분)
- 방 사이즈 섹션은 `roomSize` 키에 직접 저장 (roomData 아닌 data에)

### estimate.items (JSON)
```json
[{
  "id": "string",
  "category": "바닥재",
  "name": "강마루",
  "unit": "평",
  "quantity": 30,
  "unitPrice": 80000,
  "labor": [
    { "id": "string", "type": "기공"|"조공", "days": 2, "dayRate": 250000 }
  ],
  "note": "거실 8.2평, 안방 4.1평"
}]
```

## 페이지별 주요 기능

### /dashboard — 프로젝트 목록
- 프로젝트 CRUD (생성/수정/삭제)
- 검색 (이름/고객명/주소 필터)
- 각 프로젝트 → 체크리스트/견적서/실측 링크

### /project/[id] — 체크리스트 ★
- 10개 섹션 (방 사이즈 → 철거 → 바닥 → 욕실 → 목공 → 전기 → 필름/도배 → 타일 → 가구/창호 → 기타)
- 각 항목: 체크박스 + 옵션 태그 + 텍스트 입력 + 방별 체크
- 방별 W×H 다중 세그먼트 입력 (`DimensionInputs` 컴포넌트)
- ㎡/평/좌 자동 계산
- **방 사이즈에서 체크한 방만 이후 공정에 표시** (`activeRooms`)
- 인쇄 모드 (2단계: 프리뷰 → print)
- 사이드바: 섹션 네비 + 저장 + 인쇄 + 견적서/실측/프로젝트 목록 링크

### /estimate/[id] — 견적서 ★
- 항목별: 자재비 + 인건비(기공/조공 동적 추가/삭제) + 비고
- 모바일: 카드 레이아웃 / 데스크톱: 테이블
- `NumInput`: 0일때 포커스하면 비우고, blur하면 0 복원
- 체크리스트 자동 가져오기 (`importFromChecklist`): 방 면적 → 평수 → 수량 반영
- `CHECKLIST_TO_ESTIMATE` 매핑 테이블 (40+ 항목)
- 사업자 정보 (localStorage 저장)
- 인쇄: 정식 견적서 레이아웃 (로고, 2단 헤더, 테이블, 특이사항, 직인)

### /measurement/[id] — 실측 요약
- 체크리스트 데이터에서 방별 실측 자동 추출
- 카테고리별 그룹 (바닥/창호/목공/가구/설비/욕실 등)
- 항목별 개별 복사 버튼 (카카오톡으로 업체에 전달용)
- 전체 텍스트 복사
- 인쇄 모드

## UI/UX 패턴

### 사이드바 네비게이션 (3페이지 통일)
- 상단: 페이지별 콘텐츠 (섹션 목록 / 빠른추가 프리셋 / 실측 항목)
- 하단: 도구(저장/인쇄/복사 등) → 「이동」섹션(체크리스트/견적서/실측/프로젝트 목록)
- 모바일: 사이드바 슬라이드 + 헤더에 햄버거 버튼
- 데스크톱: 사이드바 항상 표시

### 헤더 (통일됨)
```
[☰ 메뉴(모바일)] [페이지 제목]                [저장(모바일)] [🏠 홈]
```
- `sticky top-0 z-10`, `h-14`, `bg-white dark:bg-slate-800`

### 인쇄 (체크리스트/견적서/실측 공통)
- 2단계 플로우: 사이드바 "인쇄" → 프리뷰 페이지 → "인쇄하기" 버튼
- iPhone Safari 호환: `WebkitPrintColorAdjust: 'exact'` 인라인 스타일
- `print:hidden`으로 UI 요소 숨김

### 테마
- 라이트/다크 모드 (CSS 변수 기반)
- `ThemeProvider` + `useTheme` hook
- localStorage 저장

## 방 목록 (DEFAULT_ROOMS)
```
거실, 주방, 안방 1, 안방 2, 작은방 1, 작은방 2, 입구방 1, 입구방 2,
거실 발코니, 안방 발코니, 주방 발코니, 작은방 발코니
```

## 개발 서버

```bash
cd /Users/my-o/Projects/interior-checklist
npm run dev  # → http://192.168.0.14:3000 (LAN 접속 가능)
```

## 알려진 이슈 & 미완성

### 버그/이슈
- [ ] Next.js dev 서버가 간헐적으로 죽음 (zombie process → `pkill -9 -f 'next dev'`로 정리)
- [ ] `MobileMenuButton` 컴포넌트가 여전히 `fixed` 포지셔닝 코드를 가짐 (현재 estimate/measurement에서는 미사용이므로 무해)
- [ ] `/src/types/checklist.ts`의 타입 정의가 실제 데이터 구조와 불일치 (실제는 동적 JSON, 타입은 정적 인터페이스)
- [ ] 직인 이미지 (`/public/stamp.png`) 미제공 — placeholder만 있음

### 미완성 기능
- [ ] 풀 디자인 오버홀 (색상, glassmorphism, 그라데이션, 애니메이션)
- [ ] 코드 최적화 (useCallback, useMemo, 컴포넌트 분리, 공유 SidebarLayout)
- [ ] iPhone/iPad 반응형 개선 (PWA manifest, safe area, 100dvh)
- [ ] admin 페이지에서 메뉴/체크리스트/자재 항목 편집 (현재 하드코딩)
- [ ] 체크리스트 ↔ 견적 실시간 동기화 (현재는 수동 "가져오기" 버튼)
- [ ] settings/checklist, settings/materials 페이지 미완성

### 최적화 기회
- `project/[id]/page.tsx` (730줄), `estimate/[id]/page.tsx` (887줄) — 컴포넌트 분리 필요
- `SECTIONS` 배열 + `CHECKLIST_TO_ESTIMATE` 매핑을 별도 config 파일로 분리
- `DimensionInputs`, `RoomCheckGrid`, `ChecklistRow`, `NumInput` 등을 `/components/` 로 추출
- API 응답에 타입 지정 (현재 대부분 `any`)
- localStorage와 DB 간 데이터 일관성 관리 강화

## CSS 변수 시스템 (globals.css)
- `--brand-primary`: `#2563eb` (light) / `#3b82f6` (dark)
- `--background`, `--foreground`, `--card`, `--sidebar-*`, `--input-*`, `--table-*`
- 다크모드: `.dark` 클래스로 전환
- 인쇄: `@media print` 블록에서 색상 강제

## 단위 계산
- 1평 = 3,305,800 mm² (= 3.3058 m²)
- 1좌 = 900mm × 900mm = 810,000 mm²
- `calcPyeong(value)`: mm² → 평
- `calcArea(value)`: mm² → { mm2, pyeong, m2, jwa }

## 코드 최적화 (2026-03-20 16:40~)

### 분리된 파일

| 파일 | 내용 |
|------|------|
| `src/types/checklist.ts` | 모든 타입 + TAG_COLORS (재작성) |
| `src/lib/calc.ts` | calcPyeong, calcArea, calcJwa |
| `src/config/sections.ts` | SECTIONS 배열 + DEFAULT_ROOMS |
| `src/config/estimate.ts` | ESTIMATE_PRESETS + CHECKLIST_TO_ESTIMATE 매핑 |
| `src/components/checklist/option-tag.tsx` | OptionTag 컴포넌트 |
| `src/components/checklist/dimension-inputs.tsx` | DimensionInputs (W×H 다중 세그먼트) |
| `src/components/checklist/room-check-grid.tsx` | RoomCheckGrid (방별 체크) |
| `src/components/shared/num-input.tsx` | NumInput (0 클리어/복원) |
| `src/components/shared/page-nav.tsx` | PageNav (3페이지 공용 네비) |

### 코드 감소
- `project/[id]/page.tsx`: 730줄 → 488줄 (-33%)
- `estimate/[id]/page.tsx`: 887줄 → 750줄 (-15%)
- `measurement/[id]/page.tsx`: 510줄 → 486줄 (-5%)
- 총: 2,500줄 → 1,724줄 (-31%)

### 아직 남은 최적화 기회
- estimate의 `EstimateItemCard` 컴포넌트도 분리 가능 (현재 ~150줄)
- `importFromChecklist` 함수도 별도 유틸로 추출 가능
- `MobileMenuButton` 컴포넌트의 `fixed` 포지셔닝 코드 정리 (사용하지 않음)

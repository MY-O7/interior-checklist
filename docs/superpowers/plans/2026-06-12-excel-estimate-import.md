# 엑셀 견적서 가져오기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** .xls 견적서를 업로드하면 3중 검증(공종 소계·총액·미리보기)을 거쳐 웹 견적서로 변환한다.

**Architecture:** 순수 파서(`src/lib/excel-estimate.ts`, SheetJS) → 미리보기 API(저장 없음) → 커밋 API(신규 프로젝트 또는 덮어쓰기) → 공용 업로드 다이얼로그(대시보드·견적서 페이지). 검증 실패 시 전부 거부.

**Tech Stack:** Next.js 14 App Router, SheetJS(`xlsx`), vitest, Prisma 6.19.2

**스펙:** `docs/superpowers/specs/2026-06-12-excel-estimate-import-design.md`
**실데이터:** `/Volumes/Somssi/견적/2026/*.xls` (41개, 외장볼륨 — 골든 테스트는 볼륨 없으면 skip)

---

### Task 1: 의존성 + vitest 설정

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 패키지 설치**

```bash
cd ~/Projects/interior-checklist
npm install xlsx@^0.18.5
npm install -D vitest@^2.1.0
```

- [ ] **Step 2: `package.json` scripts에 추가**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: `vitest.config.ts` 생성**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 4: `npm test` 실행 — "No test files found"가 정상 (아직 테스트 없음)**

- [ ] **Step 5: Commit** — `chore: xlsx + vitest 추가`

---

### Task 2: 파서 — 타입, 테스트 픽스처 빌더, 메타/항목 파싱

**Files:**
- Create: `src/lib/excel-estimate.ts`
- Create: `tests/fixture.ts` (synthetic .xls 생성 헬퍼)
- Test: `tests/excel-estimate.test.ts`

- [ ] **Step 1: 픽스처 빌더 작성 — `tests/fixture.ts`**

실제 양식과 동일한 행 배치를 BIFF8(.xls)로 생성한다. 행 구조(0-indexed 열):
메타는 "라벨 셀(`현장명:` 등) 오른쪽 첫 비어있지 않은 셀이 값" 규칙.

```ts
import * as XLSX from 'xlsx';

export type Row = (string | number | null)[];

export function buildXls(rows: Row[]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => c ?? '')));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '견적서');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xls' }) as Buffer;
}

/** 표준 양식 견적서: 공종 블록 2개(철거 195만=52+80+18+15+30, 목공 125만) + 공과잡비 5% + VAT 0 */
export function standardFixture(): Buffer {
  return buildXls([
    ['솜씨 인테리어', null, null, '일   자:', null, 46041, null, null],
    [null, null, null, '현장명:', null, '테스트 현장', null, null],
    [null, null, null, '평   형:', null, '30평형', null, null],
    [null, null, null, '고객명:', null, '홍길동', null, null],
    ['번호', '공   종', '적용부위, 제품명, 규격', '단위', '수량', '단   가', '금   액', '비  고'],
    [null, '철거공사', '주방씽크대 철거', '식', 1, 520000, 520000, null],
    [null, null, '욕실철거', '식', 1, 800000, 800000, '변경가능'],
    [null, null, '욕조설치', '식', null, null, 0, null],          // 0원 옵션 항목
    [null, null, '기타 철거', '식', 1, 330000, 330000, null],
    [null, null, '인건비', '식', 1, 300000, 300000, null],
    [null, null, '소계:', null, null, null, 1950000, null],
    [null, '목공공사', '중문 시공', '식', 1, 1250000, 1250000, null],
    [null, '메모입니다', '문짝 교체', '식', 0, 0, 0, null],        // 1열 메모 행 (공종 아님)
    [null, null, '소계:', null, null, null, 1250000, null],
    [null, null, '소계[페이지합계]', 'ROT', 1, null, 3200000, null],
    [null, '공과잡비', '현장진행경비', '%', 5, null, 160000, null],
    [null, null, null, null, null, null, null, null],
    [null, 'VAT', '세금계산서발행', '%', null, null, 0, null],
    [null, null, '총공사금액', 'ROT', 1, null, 3360000, null],
    [null, '특이사항', '  ※ 견적외 추가공사 별도', null, null, null, null, null],
    [null, null, '  ※ 부가세 별도', null, null, null, null, null],
  ]);
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — `tests/excel-estimate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { parseEstimateXls, ImportError } from '@/lib/excel-estimate';
import { standardFixture, buildXls } from './fixture';

describe('parseEstimateXls — 메타/항목', () => {
  it('현장명·고객명·평형을 추출한다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(r.meta.siteName).toBe('테스트 현장');
    expect(r.meta.customerName).toBe('홍길동');
    expect(r.meta.pyeong).toBe('30평형');
  });

  it('공종 블록별로 항목을 파싱하고 0원 옵션 항목도 포함한다', () => {
    const r = parseEstimateXls(standardFixture());
    const demo = r.items.filter(i => i.category === '철거공사');
    expect(demo.map(i => i.name)).toEqual(
      ['주방씽크대 철거', '욕실철거', '욕조설치', '기타 철거', '인건비']);
    expect(demo[1].note).toBe('변경가능');
    expect(demo[2].unitPrice).toBe(0);
  });

  it('블록 중간의 1열 메모는 공종으로 취급하지 않는다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(r.items.find(i => i.name === '문짝 교체')!.category).toBe('목공공사');
    expect(r.items.some(i => i.category === '메모입니다')).toBe(false);
  });

  it('공과잡비는 금액이 있으면 일반 항목으로 추가된다', () => {
    const r = parseEstimateXls(standardFixture());
    const misc = r.items.find(i => i.category === '공과잡비')!;
    expect(misc.quantity * misc.unitPrice).toBe(160000);
  });

  it('특이사항은 notes로 합쳐진다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(r.notes).toContain('견적외 추가공사 별도');
    expect(r.notes).toContain('부가세 별도');
  });

  it('헤더 행이 없으면 한국어 오류를 던진다', () => {
    const bad = buildXls([['아무', '내용', '없음']]);
    expect(() => parseEstimateXls(bad)).toThrow(ImportError);
    expect(() => parseEstimateXls(bad)).toThrow(/견적서 표 헤더/);
  });
});
```

- [ ] **Step 3: `npm test` — FAIL 확인 (모듈 없음)**

- [ ] **Step 4: 파서 구현 — `src/lib/excel-estimate.ts`**

핵심 규칙:
- 헤더 행: 한 행에서 공백 제거 후 `단위`·`수량`·`금액` 셀이 모두 있는 행. 못 찾으면 `ImportError('견적서 표 헤더(번호/공종/단위/수량…)를 찾지 못했습니다. 표준 견적서 양식인지 확인해주세요.')`
- 메타: 헤더 위 행들에서 공백 제거 라벨(`현장명:`→siteName, `고객명:`→customerName, `평형:`→pyeong)을 찾고 같은 행 오른쪽 첫 비어있지 않은 셀이 값
- 공종: `expectNewCategory` 상태가 true일 때만 1열 값을 새 공종으로 채택(헤더 직후·`소계:` 행 직후). 그 외 1열 텍스트는 무시(메모)
- `소계:` 행(2열이 `소계`로 시작, `페이지합계` 미포함): 블록 종료 → 블록 검증 데이터로 기록
- `소계[페이지합계]`: 본문 종료 → 총액 검증 데이터로 기록, 이후 푸터 모드
- 푸터: `공과잡비`(1열) 금액>0이면 `{category:'공과잡비', name:2열, unit:'식', quantity:1, unitPrice:금액}` 항목 추가. `VAT`(1열): 금액>0이면 `includeVat=true, vatRate=수량열||10`, 아니면 `includeVat=false`. `총공사금액`(2열): 최종 금액 기록. `특이사항`(1열)부터: 2열 텍스트를 notes로 수집
- 항목 행: name=2열, unit=3열||'식', quantity=4열||0, unitPrice=5열||0, excelAmount=6열||0, note=7열||''. name도 excelAmount도 없으면 skip
- **금액 보정**: `quantity*unitPrice !== excelAmount`이면(수동 입력 금액) `quantity=1, unitPrice=excelAmount`로 바꾸고 note 앞에 `[원본: 수량X×단가Y] ` 추가 — 웹 계산 금액이 엑셀과 항상 일치하도록

```ts
import * as XLSX from 'xlsx';

export class ImportError extends Error {}

export interface ParsedItem {
  category: string; name: string; unit: string;
  quantity: number; unitPrice: number; note: string;
  excelAmount: number;
}
export interface CategoryCheck { category: string; parsedSum: number; excelSubtotal: number; }
export interface ParsedEstimate {
  meta: { siteName: string; customerName: string; pyeong: string };
  items: ParsedItem[];
  includeVat: boolean; vatRate: number; vatAmount: number;
  notes: string;
  checks: { categories: CategoryCheck[]; pageTotalExcel: number | null; grandTotalExcel: number | null };
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, '');
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; };

export function parseEstimateXls(buf: Buffer): ParsedEstimate {
  let wb: XLSX.WorkBook;
  try { wb = XLSX.read(buf, { type: 'buffer' }); }
  catch { throw new ImportError('엑셀 파일을 열 수 없습니다. .xls 견적서 파일이 맞는지 확인해주세요.'); }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new ImportError('엑셀에 시트가 없습니다.');
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const headerIdx = rows.findIndex(r => {
    const cells = r.map(norm);
    return cells.includes('단위') && cells.includes('수량') && cells.some(c => c === '금액');
  });
  if (headerIdx < 0) throw new ImportError('견적서 표 헤더(번호/공종/단위/수량…)를 찾지 못했습니다. 표준 견적서 양식인지 확인해주세요.');

  // ── 메타 ──
  const meta = { siteName: '', customerName: '', pyeong: '' };
  const labelMap: Record<string, keyof typeof meta> = { '현장명:': 'siteName', '고객명:': 'customerName', '평형:': 'pyeong' };
  for (let r = 0; r < headerIdx; r++) {
    rows[r].forEach((cell, c) => {
      const key = labelMap[norm(cell)];
      if (!key) return;
      const val = rows[r].slice(c + 1).find(x => String(x).trim() !== '');
      if (val !== undefined) meta[key] = String(val).trim();
    });
  }
  if (!meta.siteName) throw new ImportError('현장명을 찾지 못했습니다. 견적서 상단의 "현장명:" 칸을 확인해주세요.');

  // ── 본문 ──
  const items: ParsedItem[] = [];
  const categories: CategoryCheck[] = [];
  let category = '', expectNewCategory = true, blockSum = 0;
  let pageTotalExcel: number | null = null, grandTotalExcel: number | null = null;
  let includeVat = false, vatRate = 10, vatAmount = 0;
  let inFooter = false, inNotes = false;
  const noteLines: string[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const c1 = String(row[1] ?? '').trim(), c2 = String(row[2] ?? '').trim();
    const n1 = norm(c1), n2 = norm(c2);

    if (inNotes) { if (c2) noteLines.push(c2); continue; }
    if (n1 === '특이사항') { inNotes = true; if (c2) noteLines.push(c2); continue; }

    if (n2.startsWith('소계') && n2.includes('페이지합계')) {
      pageTotalExcel = num(row[6]); inFooter = true; continue;
    }
    if (!inFooter && n2.startsWith('소계')) {
      categories.push({ category, parsedSum: blockSum, excelSubtotal: num(row[6]) });
      blockSum = 0; expectNewCategory = true; continue;
    }
    if (inFooter) {
      if (n1 === '공과잡비' && num(row[6]) > 0)
        items.push({ category: '공과잡비', name: c2 || '현장진행경비', unit: '식', quantity: 1, unitPrice: num(row[6]), note: '', excelAmount: num(row[6]) });
      else if (n1 === 'VAT') { vatAmount = num(row[6]); includeVat = vatAmount > 0; if (includeVat && num(row[4]) > 0) vatRate = num(row[4]); }
      else if (n2 === '총공사금액') grandTotalExcel = num(row[6]);
      continue;
    }

    // 항목 행
    const excelAmount = num(row[6]);
    if (!c2 && excelAmount === 0) { continue; }            // 완전 빈 행
    if (expectNewCategory && c1) { category = c1; expectNewCategory = false; }
    if (!category) throw new ImportError(`${r + 1}번째 줄: 공종을 찾기 전에 항목이 나왔습니다.`);
    let quantity = num(row[4]), unitPrice = num(row[5]);
    let note = String(row[7] ?? '').trim();
    if (quantity * unitPrice !== excelAmount) {
      if (quantity || unitPrice) note = `[원본: 수량${row[4] || 0}×단가${row[5] || 0}] ${note}`.trim();
      quantity = excelAmount ? 1 : quantity; unitPrice = excelAmount || unitPrice;
      if (excelAmount === 0) { quantity = num(row[4]); unitPrice = 0; }
    }
    items.push({ category, name: c2, unit: String(row[3] ?? '').trim() || '식', quantity, unitPrice, note, excelAmount });
    blockSum += excelAmount;
  }

  return { meta, items, includeVat, vatRate, vatAmount, notes: noteLines.join('\n'),
           checks: { categories, pageTotalExcel, grandTotalExcel } };
}
```

- [ ] **Step 5: `npm test` — PASS 확인**

- [ ] **Step 6: Commit** — `feat: 엑셀 견적서 파서 (메타/공종블록/항목)`

---

### Task 3: 파서 — 검증 함수 (소계·총액 대조)

**Files:**
- Modify: `src/lib/excel-estimate.ts`
- Test: `tests/excel-estimate.test.ts` (추가)

- [ ] **Step 1: 실패하는 테스트 추가**

```ts
import { verifyParsed } from '@/lib/excel-estimate';

describe('verifyParsed — 3중 검증', () => {
  it('정상 파일은 통과한다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(() => verifyParsed(r)).not.toThrow();
  });

  it('소계가 항목 합과 다르면 공종명을 포함한 오류', () => {
    const r = parseEstimateXls(standardFixture());
    r.checks.categories[0].excelSubtotal += 1000;
    expect(() => verifyParsed(r)).toThrow(/철거공사/);
  });

  it('총공사금액이 다르면 거부', () => {
    const r = parseEstimateXls(standardFixture());
    r.checks.grandTotalExcel! += 1;
    expect(() => verifyParsed(r)).toThrow(/총공사금액/);
  });
});
```

- [ ] **Step 2: `npm test` — 신규 3건 FAIL 확인**

- [ ] **Step 3: `verifyParsed` 구현 (excel-estimate.ts에 추가)**

```ts
const won = (n: number) => n.toLocaleString('ko-KR') + '원';

/** 검증 실패 시 ImportError. 통과 시 무반환. */
export function verifyParsed(p: ParsedEstimate): void {
  for (const c of p.checks.categories) {
    if (c.parsedSum !== c.excelSubtotal)
      throw new ImportError(`'${c.category}' 공종의 항목 합계(${won(c.parsedSum)})가 엑셀 소계(${won(c.excelSubtotal)})와 다릅니다. 가져오기를 중단했습니다.`);
  }
  const bodySum = p.items.filter(i => i.category !== '공과잡비').reduce((s, i) => s + i.excelAmount, 0);
  if (p.checks.pageTotalExcel !== null && bodySum !== p.checks.pageTotalExcel)
    throw new ImportError(`항목 전체 합계(${won(bodySum)})가 엑셀 페이지합계(${won(p.checks.pageTotalExcel)})와 다릅니다.`);
  const allSum = p.items.reduce((s, i) => s + i.excelAmount, 0);
  if (p.checks.grandTotalExcel !== null && allSum + p.vatAmount !== p.checks.grandTotalExcel)
    throw new ImportError(`계산된 총액(${won(allSum + p.vatAmount)})이 엑셀 총공사금액(${won(p.checks.grandTotalExcel)})과 다릅니다.`);
  // 항목 자체 일관성: 웹 표시 금액(qty×price) == 엑셀 금액
  for (const i of p.items) {
    if (i.quantity * i.unitPrice !== i.excelAmount)
      throw new ImportError(`'${i.name}' 항목의 수량×단가(${won(i.quantity * i.unitPrice)})가 엑셀 금액(${won(i.excelAmount)})과 다릅니다.`);
  }
}
```

- [ ] **Step 4: `npm test` — PASS**

- [ ] **Step 5: Commit** — `feat: 파서 3중 검증 (소계/총액/항목 일관성)`

---

### Task 4: 골든 테스트 — 실파일 41개 전부

**Files:**
- Test: `tests/golden.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { parseEstimateXls, verifyParsed } from '@/lib/excel-estimate';

const DIR = '/Volumes/Somssi/견적/2026';

describe.skipIf(!existsSync(DIR))('골든 테스트 — 실제 견적서 전부', () => {
  const files = existsSync(DIR) ? readdirSync(DIR).filter(f => f.endsWith('.xls')) : [];
  it('견적서 파일이 존재한다', () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    it(`${f} — 파싱 + 3중 검증 통과`, () => {
      const parsed = parseEstimateXls(readFileSync(path.join(DIR, f)));
      verifyParsed(parsed);
      expect(parsed.meta.siteName).not.toBe('');
      expect(parsed.items.length).toBeGreaterThan(0);
    });
  }
});
```

- [ ] **Step 2: `npm test` 실행 — 41개 파일 결과 확인**

실패하는 파일이 있으면 **파서를 수정하지 말고 먼저 해당 파일을 열어 원인을 파악**한다
(`python3 + xlrd`로 행 덤프). 양식 변형이면 파서에 규칙 추가 + 해당 케이스의 synthetic
픽스처 단위 테스트 추가 후 재실행. 엑셀 자체의 수식 오류(소계 셀이 실제 합과 다른 파일)면
그 파일은 "정당한 거부"이므로 테스트에서 해당 파일을 expected-fail 목록으로 분리하고
사용자에게 보고한다.

- [ ] **Step 3: 41개 전부 결과가 확정되면 Commit** — `test: 실견적서 골든 테스트`

---

### Task 5: API — 미리보기(파싱) 엔드포인트

**Files:**
- Create: `src/app/api/estimates/import/route.ts`
- Test: 수동 (curl)

- [ ] **Step 1: 라우트 구현**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { parseEstimateXls, verifyParsed, ImportError } from '@/lib/excel-estimate';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: '파일이 너무 큽니다 (5MB 제한)' }, { status: 400 });

    const parsed = parseEstimateXls(Buffer.from(await file.arrayBuffer()));
    verifyParsed(parsed);
    return NextResponse.json({ parsed });          // 저장하지 않음 — 미리보기 전용
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error('Import parse error:', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 수동 검증**

```bash
# 로그인 쿠키 획득 후
curl -s -b cookie.txt -F "file=@/Volumes/Somssi/견적/2026/260311 월드메르디앙 101-16층 공사견적서.xls" \
  http://localhost:3000/api/estimates/import | python3 -m json.tool | head -30
# 기대: parsed.meta.siteName == "월드메르디앙 101-16층", items 배열
curl -s http://localhost:3000/api/estimates/import -X POST   # 기대: 401
```

- [ ] **Step 3: Commit** — `feat: 견적서 임포트 미리보기 API`

---

### Task 6: API — 커밋(저장) 엔드포인트

**Files:**
- Create: `src/app/api/estimates/import/commit/route.ts`

- [ ] **Step 1: 라우트 구현**

요청 body: `{ mode: 'newProject' | 'overwrite', projectId?, parsed }` (미리보기 응답의 parsed 그대로).
서버에서 `verifyParsed`를 **다시 실행**해 변조/손상 차단. EstimateItem 변환 시 `excelAmount` 제거.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canAccessProject } from '@/lib/auth';
import { verifyParsed, ImportError, type ParsedEstimate } from '@/lib/excel-estimate';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    const { user } = session;

    const { mode, projectId, parsed } = await request.json() as
      { mode: 'newProject' | 'overwrite'; projectId?: string; parsed: ParsedEstimate };
    if (!parsed?.items?.length) return NextResponse.json({ error: '가져올 항목이 없습니다' }, { status: 400 });
    verifyParsed(parsed);                                    // 저장 직전 재검증

    const items = parsed.items.map((i, idx) => ({
      id: `${Date.now()}-${idx}`, category: i.category, name: i.name,
      unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice, labor: [], note: i.note,
    }));
    const estimateData = {
      items: JSON.stringify(items), laborCost: 0, discount: 0,
      vatRate: parsed.vatRate, includeVat: parsed.includeVat, notes: parsed.notes,
    };

    let targetProjectId = projectId;
    if (mode === 'newProject') {
      const project = await prisma.project.create({ data: {
        name: parsed.meta.siteName, clientName: parsed.meta.customerName || null, userId: user.id,
      }});
      targetProjectId = project.id;
    } else {
      if (!targetProjectId) return NextResponse.json({ error: 'projectId가 필요합니다' }, { status: 400 });
      if (!(await canAccessProject(user.id, user.role, targetProjectId)))
        return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const existing = await prisma.estimate.findFirst({ where: { projectId: targetProjectId! } });
    if (existing) await prisma.estimate.update({ where: { id: existing.id }, data: estimateData });
    else await prisma.estimate.create({ data: { ...estimateData, projectId: targetProjectId!, userId: user.id } });

    return NextResponse.json({ ok: true, projectId: targetProjectId });
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error('Import commit error:', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 수동 검증** — 미리보기 응답으로 commit 호출 → 대시보드에 새 프로젝트, 견적서 페이지 금액이 엑셀 총액과 일치하는지 확인

- [ ] **Step 3: Commit** — `feat: 견적서 임포트 저장 API (신규/덮어쓰기)`

---

### Task 7: UI — 업로드 다이얼로그 + 진입점 2곳

**Files:**
- Create: `src/components/ExcelImportDialog.tsx`
- Modify: `src/app/dashboard/page.tsx` (버튼 추가)
- Modify: `src/app/estimate/[id]/page.tsx` (버튼 추가)

- [ ] **Step 1: 다이얼로그 컴포넌트**

상태 머신: `선택 → 업로드중 → 미리보기 → 저장중 → 완료/오류`.
미리보기는 공종별 그룹 합계 + 총액 표시, "등록" 버튼을 눌러야 commit API 호출.
overwrite 모드일 때 빨간 경고문 표시. 스타일은 기존 페이지의 Tailwind/CSS 변수 패턴(`var(--muted)` 등)을 따른다.

```tsx
'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';   // 기존 헬퍼가 FormData 미지원이면 fetch 직접 사용
import type { ParsedEstimate } from '@/lib/excel-estimate';

interface Props {
  mode: 'newProject' | 'overwrite';
  projectId?: string;
  onDone: (projectId: string) => void;
  onClose: () => void;
}

export default function ExcelImportDialog({ mode, projectId, onDone, onClose }: Props) {
  const [parsed, setParsed] = useState<ParsedEstimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/estimates/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '업로드 실패');
      setParsed(json.parsed);
    } catch (e) { setError(e instanceof Error ? e.message : '업로드 실패'); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!parsed) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/estimates/import/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, projectId, parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '저장 실패');
      onDone(json.projectId);
    } catch (e) { setError(e instanceof Error ? e.message : '저장 실패'); }
    finally { setBusy(false); }
  }

  const total = parsed ? parsed.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + parsed.vatAmount : 0;
  const byCategory = parsed ? Object.entries(parsed.items.reduce((m, i) => {
    (m[i.category] ??= []).push(i); return m;
  }, {} as Record<string, typeof parsed.items>)) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-3">엑셀 견적서 가져오기</h2>
        {!parsed && (
          <div>
            <input type="file" accept=".xls,.xlsx" disabled={busy}
              onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            {busy && <p className="text-sm mt-2">분석 중…</p>}
          </div>
        )}
        {parsed && (
          <div>
            <p className="text-sm mb-1">현장명: <b>{parsed.meta.siteName}</b>{parsed.meta.customerName && ` · ${parsed.meta.customerName}`}</p>
            {byCategory.map(([cat, items]) => (
              <div key={cat} className="border-b py-1.5 text-sm flex justify-between">
                <span>{cat} ({items.length}건)</span>
                <span>{items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}원</span>
              </div>
            ))}
            <p className="text-right font-bold mt-2">총액 {total.toLocaleString()}원{parsed.includeVat ? ' (VAT 포함)' : ''}</p>
            {mode === 'overwrite' && (
              <p className="text-red-500 text-sm mt-2">⚠ 등록하면 이 프로젝트의 기존 견적서를 완전히 대체합니다.</p>
            )}
            <div className="flex gap-2 mt-4 justify-end">
              <button className="px-4 py-2 rounded-lg border" onClick={onClose} disabled={busy}>취소</button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={commit} disabled={busy}>
                {busy ? '저장 중…' : '등록'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-red-500 text-sm mt-3 whitespace-pre-wrap">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 대시보드에 버튼 추가** (`src/app/dashboard/page.tsx`)

기존 "새 프로젝트" 버튼 옆에 추가. 기존 버튼의 className을 그대로 복사해 통일.

```tsx
const [showImport, setShowImport] = useState(false);
// 버튼 영역에:
<button onClick={() => setShowImport(true)} className="...기존 버튼과 동일...">엑셀 견적서 가져오기</button>
// JSX 말미에:
{showImport && (
  <ExcelImportDialog mode="newProject" onClose={() => setShowImport(false)}
    onDone={pid => { setShowImport(false); router.push(`/estimate/${pid}`); }} />
)}
```

- [ ] **Step 3: 견적서 페이지에 버튼 추가** (`src/app/estimate/[id]/page.tsx`)

사이드바 버튼 영역에 "엑셀에서 가져오기" 추가, `mode="overwrite" projectId={projectId}`,
`onDone`에서 견적 데이터 재조회(기존 load 함수 재사용).

- [ ] **Step 4: 빌드 확인** — `npm run build` 성공

- [ ] **Step 5: Commit** — `feat: 엑셀 가져오기 UI (대시보드/견적서 페이지)`

---

### Task 8: 통합 검증 + 배포

- [ ] **Step 1: `npm test` 전체 PASS (골든 41개 포함)**
- [ ] **Step 2: 로컬 dev에서 실파일 3개로 E2E**: 신규 프로젝트 생성 1건, 덮어쓰기 1건, 깨진 파일(txt를 .xls로 위장) 거부 1건. 각각 견적서 화면 총액이 엑셀 `총공사금액`과 일치하는지 눈으로 대조
- [ ] **Step 3: 검증 결과를 사용자에게 보고하고 승인 받기**
- [ ] **Step 4: push + 오라클 배포** (`git push`, 서버에서 `git pull && docker-compose down && docker-compose up -d --build`)

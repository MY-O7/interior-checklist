import * as XLSX from 'xlsx';

// 솜씨인테리어 표준 엑셀 견적서(.xls) 파서.
// 공종 블록은 추측하지 않고 엑셀 소계 셀의 SUM 수식 범위를 그대로 따른다.
// (라벨 없는 숨은 소계, 두 공종이 소계를 공유하는 케이스가 실파일에 존재)
// 수식이 없는 파일은 '소계:' 라벨 기준으로 폴백한다.
// 검증 실패 시 사용자에게 그대로 보여줄 한국어 메시지를 담은 ImportError를 던진다.

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

const AMOUNT_COL = 6; // G열 = 금액

interface Block { start: number; end: number; row: number; subtotal: number; }

export function parseEstimateXls(buf: Buffer): ParsedEstimate {
  let wb: XLSX.WorkBook;
  try { wb = XLSX.read(buf, { type: 'buffer', cellFormula: true }); }
  catch { throw new ImportError('엑셀 파일을 열 수 없습니다. .xls 견적서 파일이 맞는지 확인해주세요.'); }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws['!ref']) throw new ImportError('엑셀에 시트가 없습니다.');
  const range = XLSX.utils.decode_range(ws['!ref']);
  const cell = (r: number, c: number) => ws[XLSX.utils.encode_cell({ r, c })];
  const text = (r: number, c: number) => String(cell(r, c)?.v ?? '').trim();

  // ── 표 헤더 행 ──
  let headerIdx = -1;
  for (let r = 0; r <= range.e.r; r++) {
    const cells: string[] = [];
    for (let c = 0; c <= range.e.c; c++) cells.push(norm(cell(r, c)?.v));
    if (cells.includes('단위') && cells.includes('수량') && cells.includes('금액')) { headerIdx = r; break; }
  }
  if (headerIdx < 0) throw new ImportError('견적서 표 헤더(번호/공종/단위/수량…)를 찾지 못했습니다. 표준 견적서 양식인지 확인해주세요.');

  // ── 상단 메타: 라벨 셀 오른쪽의 첫 비어있지 않은 셀이 값 ──
  const meta = { siteName: '', customerName: '', pyeong: '' };
  const labelMap: Record<string, keyof typeof meta> = { '현장명:': 'siteName', '고객명:': 'customerName', '평형:': 'pyeong' };
  for (let r = 0; r < headerIdx; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const key = labelMap[norm(cell(r, c)?.v)];
      if (!key) continue;
      for (let c2 = c + 1; c2 <= range.e.c; c2++) {
        const v = text(r, c2);
        if (v !== '') { meta[key] = v; break; }
      }
    }
  }
  // 현장명이 빈 파일이 실존함(작성 누락) — 거부하지 않고 호출 측에서 파일명으로 대체

  // ── 집계 셀 수집: 블록 소계(연속 SUM 범위) / 페이지합계 / 라벨 폴백 ──
  const blocks: Block[] = [];
  let pageTotalExcel: number | null = null;
  let pageTotalRow = -1;
  let lastBlockEnd = headerIdx; // 라벨 폴백용

  for (let r = headerIdx + 1; r <= range.e.r; r++) {
    const g = cell(r, AMOUNT_COL);
    const label = norm(cell(r, 2)?.v);
    const f: string = g?.f ?? '';
    const isPageTotal = label.includes('페이지합계');
    const m = /^SUM\(G(\d+):G(\d+)\)$/i.exec(f.replace(/\s/g, ''));
    if (isPageTotal) {
      pageTotalExcel = num(g?.v); pageTotalRow = r; break;
    }
    if (m) {
      // 수식 범위(1-indexed) → 0-indexed, 소계 자신의 행은 제외
      const start = Number(m[1]) - 1;
      const end = Math.min(Number(m[2]) - 1, r - 1);
      blocks.push({ start, end, row: r, subtotal: num(g?.v) });
      lastBlockEnd = r;
    } else if (!f && label.startsWith('소계')) {
      blocks.push({ start: lastBlockEnd + 1, end: r - 1, row: r, subtotal: num(g?.v) });
      lastBlockEnd = r;
    }
  }
  if (blocks.length === 0) throw new ImportError('공종 소계 행을 하나도 찾지 못했습니다. 표준 견적서 양식인지 확인해주세요.');
  const bodyEnd = pageTotalRow > 0 ? pageTotalRow : Math.max(...blocks.map(b => b.row)) + 1;
  const aggregateRows = new Set(blocks.map(b => b.row));

  // ── 본문 항목 ──
  const items: ParsedItem[] = [];
  const blockItems = new Map<Block, ParsedItem[]>(blocks.map(b => [b, []]));
  const blockCategory = new Map<Block, string>();
  for (const b of blocks) {
    for (let r = b.start; r <= b.end; r++) {
      const c1 = text(r, 1);
      if (c1 && !aggregateRows.has(r)) { blockCategory.set(b, c1); break; }
    }
  }
  let prevCategory = '';
  for (const b of blocks) {
    if (!blockCategory.get(b)) blockCategory.set(b, prevCategory || '기타');
    prevCategory = blockCategory.get(b)!;
  }

  for (let r = headerIdx + 1; r < bodyEnd; r++) {
    if (aggregateRows.has(r)) continue;
    const name = text(r, 2);
    const excelAmount = num(cell(r, AMOUNT_COL)?.v);
    if (!name && excelAmount === 0) continue;
    const block = blocks.find(b => r >= b.start && r <= b.end);
    if (!block) throw new ImportError(`${r + 1}번째 줄 '${name}' 항목이 어떤 공종 소계에도 포함되지 않습니다. 엑셀 소계 수식을 확인해주세요.`);
    let quantity = num(cell(r, 4)?.v), unitPrice = num(cell(r, 5)?.v);
    let note = text(r, 7);
    if (quantity * unitPrice !== excelAmount) {
      // 금액 셀이 수량×단가와 다르면(수동 입력) 웹 계산값이 엑셀과 일치하도록 보정
      if (quantity || unitPrice) note = `[원본: 수량${quantity}×단가${unitPrice}] ${note}`.trim();
      if (excelAmount === 0) { unitPrice = 0; }
      else { quantity = 1; unitPrice = excelAmount; }
    }
    const item: ParsedItem = {
      category: blockCategory.get(block)!, name, unit: text(r, 3) || '식',
      quantity, unitPrice, note, excelAmount,
    };
    items.push(item);
    blockItems.get(block)!.push(item);
  }

  // ── 푸터: 공과잡비 / VAT / 총공사금액 / 특이사항 ──
  let includeVat = false, vatRate = 10, vatAmount = 0;
  let grandTotalExcel: number | null = null;
  let miscAmount = 0;
  const noteLines: string[] = [];
  let inNotes = false;
  for (let r = bodyEnd; r <= range.e.r; r++) {
    const c1 = text(r, 1), c2 = text(r, 2);
    const n1 = norm(c1), n2 = norm(c2);
    if (inNotes || n1 === '특이사항' || c1.startsWith('※') || c2.startsWith('※')) {
      inNotes = true;
      const line = c1.startsWith('※') ? c1 : c2;
      if (line) noteLines.push(line);
      continue;
    }
    const amount = num(cell(r, AMOUNT_COL)?.v);
    if (n1 === '공과잡비' && amount > 0) {
      miscAmount = amount;
      items.push({ category: '공과잡비', name: c2 || '현장진행경비', unit: '식', quantity: 1, unitPrice: amount, note: '', excelAmount: amount });
    } else if (n1 === 'VAT') {
      vatAmount = amount; includeVat = amount > 0;
      const rate = num(cell(r, 4)?.v);
      if (includeVat && rate > 0) vatRate = rate;
    } else if (n2.startsWith('총공사금액')) {
      grandTotalExcel = num(cell(r, AMOUNT_COL)?.v);
    }
  }

  // ── 총액 반올림 보정: 엑셀이 총공사금액을 ROUND 처리하는 양식 대응 ──
  if (grandTotalExcel !== null) {
    const expected = items.reduce((s, i) => s + i.excelAmount, 0) + vatAmount;
    const diff = grandTotalExcel - expected;
    if (diff !== 0 && Math.abs(diff) <= 10000) {
      items.push({ category: '기타', name: '총액 조정(견적서 반올림)', unit: '식', quantity: 1, unitPrice: diff, note: '엑셀 총공사금액 반올림 차액', excelAmount: diff });
    }
  }

  const categories: CategoryCheck[] = blocks.map(b => ({
    category: blockCategory.get(b)!,
    parsedSum: blockItems.get(b)!.reduce((s, i) => s + i.excelAmount, 0),
    excelSubtotal: b.subtotal,
  }));

  return { meta, items, includeVat, vatRate, vatAmount, notes: noteLines.join('\n'),
           checks: { categories, pageTotalExcel, grandTotalExcel } };
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

/** 3중 검증: 블록 소계 / 페이지합계·총공사금액 / 항목별 수량×단가 일관성. 실패 시 ImportError. */
export function verifyParsed(p: ParsedEstimate): void {
  for (const c of p.checks.categories) {
    if (c.parsedSum !== c.excelSubtotal)
      throw new ImportError(`'${c.category}' 공종의 항목 합계(${won(c.parsedSum)})가 엑셀 소계(${won(c.excelSubtotal)})와 다릅니다. 가져오기를 중단했습니다.`);
  }
  const blockSum = p.checks.categories.reduce((s, c) => s + c.excelSubtotal, 0);
  if (p.checks.pageTotalExcel !== null && blockSum !== p.checks.pageTotalExcel)
    throw new ImportError(`공종 소계 합(${won(blockSum)})이 엑셀 페이지합계(${won(p.checks.pageTotalExcel)})와 다릅니다.`);
  const allSum = p.items.reduce((s, i) => s + i.excelAmount, 0);
  if (p.checks.grandTotalExcel !== null && allSum + p.vatAmount !== p.checks.grandTotalExcel)
    throw new ImportError(`계산된 총액(${won(allSum + p.vatAmount)})이 엑셀 총공사금액(${won(p.checks.grandTotalExcel)})과 다릅니다.`);
  for (const i of p.items) {
    if (i.quantity * i.unitPrice !== i.excelAmount)
      throw new ImportError(`'${i.name}' 항목의 수량×단가(${won(i.quantity * i.unitPrice)})가 엑셀 금액(${won(i.excelAmount)})과 다릅니다.`);
  }
}

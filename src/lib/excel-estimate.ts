import * as XLSX from 'xlsx';

// 솜씨인테리어 표준 엑셀 견적서(.xls) 파서.
// 양식: docs/superpowers/specs/2026-06-12-excel-estimate-import-design.md 참조.
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

  // ── 상단 메타: 라벨 셀 오른쪽의 첫 비어있지 않은 셀이 값 ──
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

  // ── 본문: 공종 블록 단위로 항목 수집, 소계/합계 행은 검증용으로만 기록 ──
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
    if (!c2 && excelAmount === 0) continue;
    if (expectNewCategory && c1) { category = c1; expectNewCategory = false; }
    if (!category) throw new ImportError(`${r + 1}번째 줄: 공종을 찾기 전에 항목이 나왔습니다.`);
    let quantity = num(row[4]), unitPrice = num(row[5]);
    let note = String(row[7] ?? '').trim();
    if (quantity * unitPrice !== excelAmount) {
      // 금액 셀이 수량×단가와 다르면(수동 입력) 웹 계산값이 엑셀과 일치하도록 보정
      if (quantity || unitPrice) note = `[원본: 수량${row[4] || 0}×단가${row[5] || 0}] ${note}`.trim();
      if (excelAmount === 0) { unitPrice = 0; }
      else { quantity = 1; unitPrice = excelAmount; }
    }
    items.push({ category, name: c2, unit: String(row[3] ?? '').trim() || '식', quantity, unitPrice, note, excelAmount });
    blockSum += excelAmount;
  }

  return { meta, items, includeVat, vatRate, vatAmount, notes: noteLines.join('\n'),
           checks: { categories, pageTotalExcel, grandTotalExcel } };
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

/** 3중 검증: 공종 소계 / 페이지합계·총공사금액 / 항목별 수량×단가 일관성. 실패 시 ImportError. */
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
  for (const i of p.items) {
    if (i.quantity * i.unitPrice !== i.excelAmount)
      throw new ImportError(`'${i.name}' 항목의 수량×단가(${won(i.quantity * i.unitPrice)})가 엑셀 금액(${won(i.excelAmount)})과 다릅니다.`);
  }
}

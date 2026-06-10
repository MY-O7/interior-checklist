// ═══════════════════ 면적 계산 유틸리티 ═══════════════════

/** mm² → 평 (1평 = 3,305,800 mm²) */
export function calcPyeong(value: string): number {
  if (!value) return 0;
  const segments = value.split('|').filter(Boolean);
  let totalMm2 = 0;
  for (const seg of segments) {
    const [w, h] = seg.split('×').map(Number);
    if (w > 0 && h > 0) totalMm2 += w * h;
  }
  return totalMm2 / 3305800;
}

/** mm 기반 사이즈 문자열 → { mm2, pyeong, m2, jwa } */
export function calcArea(value: string): { mm2: number; pyeong: number; m2: number; jwa: number } {
  if (!value) return { mm2: 0, pyeong: 0, m2: 0, jwa: 0 };
  const segs = value.split('|').filter(Boolean);
  let totalMm2 = 0, totalJwa = 0;
  for (const seg of segs) {
    const [w, h] = seg.split('×').map(Number);
    if (w > 0 && h > 0) {
      totalMm2 += w * h;
      totalJwa += (w / 900) * (h / 900);
    }
  }
  return { mm2: totalMm2, pyeong: totalMm2 / 3305800, m2: totalMm2 / 1000000, jwa: totalJwa };
}

/** 좌평 계산 (창호 전용) */
export function calcJwa(value: string): number {
  return calcArea(value).jwa;
}

// ═══════════════════ 견적 합계 ═══════════════════

type TotalsItem = { quantity: number; unitPrice: number; labor?: { days: number; dayRate: number }[] };

export type EstimateTotals = {
  materialTotal: number;
  laborTotal: number;
  itemsSubtotal: number;
  miscRate: number;
  miscAmount: number;
  subtotal: number;
  vatAmount: number;
  total: number;
};

/** 견적 합계 공식의 단일 소스 — 견적 페이지와 고객 공유 페이지가 함께 사용 */
export function calcEstimateTotals(
  items: TotalsItem[],
  opts: { discount?: number; vatRate?: number; includeVat?: boolean; miscRate?: number } = {}
): EstimateTotals {
  const { discount = 0, vatRate = 10, includeVat = true, miscRate = 0 } = opts;
  const materialTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const laborTotal = items.reduce(
    (sum, item) => sum + (item.labor || []).reduce((s, l) => s + l.days * l.dayRate, 0),
    0
  );
  const itemsSubtotal = materialTotal + laborTotal;
  const miscAmount = Math.round((itemsSubtotal * miscRate) / 100);
  const subtotal = itemsSubtotal + miscAmount;
  const vatAmount = includeVat ? Math.round((subtotal * (vatRate || 10)) / 100) : 0;
  const total = subtotal + vatAmount - discount;
  return { materialTotal, laborTotal, itemsSubtotal, miscRate, miscAmount, subtotal, vatAmount, total };
}

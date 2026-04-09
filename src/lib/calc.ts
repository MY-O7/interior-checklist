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

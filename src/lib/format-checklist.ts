// 체크리스트 value(JSON 문자열)를 인쇄/요약용 사람이 읽는 문장으로 변환

const parse = (v?: string): any => {
  try { const o = JSON.parse(v || ''); return o && typeof o === 'object' ? o : null; } catch { return null; }
};

// 문선/몰딩: { "일반 몰딩": { count, note }, ... } → "일반 몰딩 37개, 9mm 문선 8개 (110으로 1개)"
export function formatMolding(value?: string): string {
  const map = parse(value);
  if (!map) return value || '';
  return Object.entries(map).map(([opt, raw]: [string, any]) => {
    const count = typeof raw === 'string' ? '' : (raw?.count || '');
    const note = typeof raw === 'string' ? raw : (raw?.note || '');
    let s = opt;
    if (count) s += ` ${count}개`;
    if (note) s += ` (${note})`;
    return s;
  }).join(', ');
}

// 목공 자재 발주: { "합판": { t:["12mm"], q:"5단" }, "다루끼": { q:"3단" } } → "합판 12mm 5단, 다루끼 3단"
export function formatMaterial(value?: string): string {
  const map = parse(value);
  if (!map) return value || '';
  return Object.entries(map).map(([mat, raw]: [string, any]) => {
    const t = Array.isArray(raw) ? raw : (Array.isArray(raw?.t) ? raw.t : []);
    const q = Array.isArray(raw) ? '' : (raw?.q || '');
    let s = mat;
    if (t.length) s += ` ${t.join('/')}`;
    if (q) s += ` ${q}`;
    return s;
  }).filter(Boolean).join(', ');
}

// 문/문틀(방별): { type, dw, dh, handle, fw, fh, bar } → "9/12mm 문선 · 문짝 800×2100 손잡이900 · 문틀 1500×2100"
export function formatDoorRoom(value?: string): string {
  const d = parse(value);
  if (!d) return value || '';
  const parts: string[] = [];
  if (d.type) parts.push(d.type);
  const door: string[] = [];
  if (d.dw || d.dh) door.push(`${d.dw || '?'}×${d.dh || '?'}`);
  if (d.handle) door.push(`손잡이${d.handle}`);
  if (door.length) parts.push(`문짝 ${door.join(' ')}`);
  const frame: string[] = [];
  if (d.fw || d.fh) frame.push(`${d.fw || '?'}×${d.fh || '?'}`);
  if (d.bar) frame.push(`bar${d.bar}`);
  if (frame.length) parts.push(`문틀 ${frame.join(' ')}`);
  return parts.join(' · ');
}

'use client';

import { calcPyeong } from '@/lib/calc';

export function DimensionInputs({ value, onChange, showJwa }: {
  value: string; onChange: (v: string) => void; showJwa?: boolean;
}) {
  const segments = (value || '').split('|').filter(Boolean);
  if (segments.length === 0) segments.push('×');

  const update = (idx: number, part: 'w' | 'h', val: string) => {
    const clean = val.replace(/[^0-9]/g, ''); // 숫자만
    const segs = [...segments];
    const [w, h] = (segs[idx] || '×').split('×');
    segs[idx] = part === 'w' ? `${clean}×${h || ''}` : `${w || ''}×${clean}`;
    onChange(segs.join('|'));
  };
  const addSegment = () => onChange([...segments, '×'].join('|'));
  const removeSegment = (idx: number) => {
    const segs = segments.filter((_, i) => i !== idx);
    onChange(segs.length > 0 ? segs.join('|') : '×');
  };

  const pyeong = calcPyeong(value);
  const m2 = pyeong * 3.3058;
  const jwa = (() => {
    if (!showJwa || !value) return 0;
    const segs = value.split('|').filter(Boolean);
    let total = 0;
    for (const seg of segs) {
      const [w, h] = seg.split('×').map(Number);
      if (w > 0 && h > 0) total += (w / 900) * (h / 900);
    }
    return total;
  })();

  const multi = segments.length > 1;

  return (
    <div className="mt-2 space-y-2.5">
      {segments.map((seg, idx) => {
        const [w, h] = seg.split('×');
        return (
          <div key={idx} className="space-y-1">
            {multi && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">구역 {idx + 1}</span>
                <button onClick={() => removeSegment(idx)} aria-label="구역 삭제"
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors">✕ 삭제</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <label className="flex-1">
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">가로</span>
                <input type="text" inputMode="numeric" value={w || ''} onChange={e => update(idx, 'w', e.target.value)}
                  placeholder="예: 3500"
                  className="w-full h-14 px-3 text-xl font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-300 placeholder:text-base placeholder:font-medium" />
              </label>
              <span className="pb-4 text-lg font-bold text-slate-400 shrink-0">×</span>
              <label className="flex-1">
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">세로</span>
                <input type="text" inputMode="numeric" value={h || ''} onChange={e => update(idx, 'h', e.target.value)}
                  placeholder="예: 2400"
                  className="w-full h-14 px-3 text-xl font-bold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-300 placeholder:text-base placeholder:font-medium" />
              </label>
              <span className="pb-4 text-sm font-medium text-slate-400 shrink-0">mm</span>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={addSegment}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
          + 구역 추가 <span className="text-xs font-normal text-slate-400">(ㄱ자방 등)</span>
        </button>
        {pyeong > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5">
            <span className="text-xs text-blue-500 dark:text-blue-400">≈</span>
            <span className="text-base font-bold text-blue-700 dark:text-blue-300">{pyeong.toFixed(1)}평</span>
            <span className="text-xs text-blue-500 dark:text-blue-400">/ {m2.toFixed(1)}㎡{jwa > 0 ? ` / ${jwa.toFixed(1)}좌` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

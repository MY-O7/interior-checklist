'use client';

import { calcPyeong } from '@/lib/calc';

export function DimensionInputs({ value, onChange, showJwa }: {
  value: string; onChange: (v: string) => void; showJwa?: boolean;
}) {
  const segments = (value || '').split('|').filter(Boolean);
  if (segments.length === 0) segments.push('×');

  const update = (idx: number, part: 'w' | 'h', val: string) => {
    const segs = [...segments];
    const [w, h] = (segs[idx] || '×').split('×');
    segs[idx] = part === 'w' ? `${val}×${h || ''}` : `${w || ''}×${val}`;
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

  return (
    <div className="mt-2 space-y-1">
      {segments.map((seg, idx) => {
        const [w, h] = seg.split('×');
        return (
          <div key={idx} className="flex items-center gap-1">
            <input type="text" inputMode="numeric" value={w || ''} onChange={e => update(idx, 'w', e.target.value)}
              placeholder="가로" className="w-full h-8 px-2 text-xs border border-dashed border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-500 text-center" />
            <span className="text-[10px] text-slate-400">×</span>
            <input type="text" inputMode="numeric" value={h || ''} onChange={e => update(idx, 'h', e.target.value)}
              placeholder="세로" className="w-full h-8 px-2 text-xs border border-dashed border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-500 text-center" />
            <span className="text-[9px] text-slate-400 shrink-0">mm</span>
            {segments.length > 1 && (
              <button onClick={() => removeSegment(idx)} className="text-red-400 hover:text-red-600 shrink-0 p-0.5"><span className="text-xs">✕</span></button>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between">
        <button onClick={addSegment} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">+ 사이즈 추가</button>
        {pyeong > 0 && <span className="text-[10px] text-slate-400 font-medium">{m2.toFixed(1)}㎡ / {pyeong.toFixed(1)}평{jwa > 0 ? ` / ${jwa.toFixed(1)}좌` : ''}</span>}
      </div>
    </div>
  );
}

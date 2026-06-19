'use client';

import type { RoomMeasurement } from '@/types/checklist';

const parseObj = (v?: string): any => {
  try { const o = JSON.parse(v || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; }
};

const fieldCls = 'h-9 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500 w-full min-w-0 text-center placeholder:text-slate-300';

// 라벨 항상 표시 + 입력칸
function LabeledField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="block text-[10px] font-medium text-slate-400 text-center mb-0.5">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className={fieldCls} />
    </div>
  );
}

// ── 문선/몰딩: 체크한 항목마다 [개수(숫자) 개] + [비고 자유입력] ──
export function MoldingOptionInputs({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  if (!options.length) return null;
  const map = parseObj(value);
  // 구버전(문자열) 데이터 호환: 문자열이면 비고로 취급
  const get = (opt: string) => {
    const v = map[opt];
    if (typeof v === 'string') return { count: '', note: v };
    return { count: v?.count || '', note: v?.note || '' };
  };
  const set = (opt: string, patch: { count?: string; note?: string }) => {
    onChange(JSON.stringify({ ...map, [opt]: { ...get(opt), ...patch } }));
  };
  return (
    <div className="ml-8 mt-2 space-y-2">
      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">✍️ 항목별 수량 / 비고</div>
      {options.map(opt => {
        const { count, note } = get(opt);
        return (
          <div key={opt} className="flex items-center gap-2 flex-wrap">
            <span className="w-24 shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">{opt}</span>
            <div className="flex items-center gap-1 shrink-0">
              <input type="number" inputMode="numeric" min="0" value={count}
                onChange={e => set(opt, { count: e.target.value })}
                className="w-16 h-9 px-2 text-sm text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500" />
              <span className="text-sm text-slate-500">개</span>
            </div>
            <input value={note} onChange={e => set(opt, { note: e.target.value })}
              placeholder="비고 (예: 110으로 1개)"
              className="flex-1 min-w-[120px] h-9 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 placeholder:text-xs" />
          </div>
        );
      })}
    </div>
  );
}

// ── 자재 발주: 선택한 자재마다 두께 칩(해당 자재) + 수량 입력 ──
export function MaterialThicknessInputs({ options, thicknessFor, thicknesses, value, onChange }: {
  options: string[]; thicknessFor: string[]; thicknesses: string[]; value: string; onChange: (v: string) => void;
}) {
  if (!options.length) return null;
  const map = parseObj(value);
  // 구버전(배열=두께만) 데이터 호환
  const get = (opt: string): { t: string[]; q: string } => {
    const v = map[opt];
    if (Array.isArray(v)) return { t: v, q: '' };
    return { t: Array.isArray(v?.t) ? v.t : [], q: v?.q || '' };
  };
  const set = (opt: string, patch: { t?: string[]; q?: string }) => {
    onChange(JSON.stringify({ ...map, [opt]: { ...get(opt), ...patch } }));
  };
  const toggleT = (opt: string, t: string) => {
    const cur = get(opt).t;
    set(opt, { t: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] });
  };
  return (
    <div className="ml-8 mt-2 space-y-2">
      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">📏 두께 / 수량</div>
      {options.map(opt => {
        const { t, q } = get(opt);
        const hasT = thicknessFor.includes(opt);
        return (
          <div key={opt} className="flex items-center gap-2 flex-wrap">
            <span className="w-16 shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">{opt}</span>
            {hasT && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {thicknesses.map(th => {
                  const on = t.includes(th);
                  return (
                    <button key={th} type="button" onClick={() => toggleT(opt, th)}
                      className={`px-2.5 h-8 rounded-md border text-sm font-medium transition-all ${on ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-500 hover:border-blue-400'}`}>
                      {th}
                    </button>
                  );
                })}
              </div>
            )}
            <input value={q} onChange={e => set(opt, { q: e.target.value })}
              placeholder="수량 (예: 5단 / 10개)"
              className="flex-1 min-w-[110px] h-9 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 placeholder:text-xs" />
          </div>
        );
      })}
    </div>
  );
}

// ── 문 / 문틀: 방별 (문 종류 + 문짝 가로/세로/손잡이 + 문틀 가로/세로/bar) ──
export function DoorRoomGrid({ rooms, roomList, doorTypes, onUpdate }: {
  rooms: RoomMeasurement; roomList: string[]; doorTypes: string[];
  onUpdate: (roomId: string, field: string, value: any) => void;
}) {
  const get = (room: string) => parseObj(rooms[room]?.value);
  const setField = (room: string, key: string, val: string) => {
    onUpdate(room, 'value', JSON.stringify({ ...get(room), [key]: val }));
  };
  return (
    <div className="ml-8 mt-2">
      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">📍 시공할 공간 선택</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {roomList.map(name => {
          const rd = rooms[name] || { checked: false, value: '', note: '' };
          const d = get(name);
          return (
            <div key={name} className={`rounded-lg border p-3 transition-all ${rd.checked ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rd.checked} onChange={(e) => onUpdate(name, 'checked', e.target.checked)} className="w-5 h-5 rounded border-slate-300 accent-slate-800" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
              </label>
              {rd.checked && (
                <div className="mt-2.5 space-y-2.5">
                  {doorTypes.length > 0 && (
                    <select value={d.type || ''} onChange={(e) => setField(name, 'type', e.target.value)}
                      className="w-full h-9 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500">
                      <option value="">문 종류 선택</option>
                      {doorTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">🚪 문짝</p>
                    <div className="grid grid-cols-3 gap-1">
                      <LabeledField label="가로" value={d.dw || ''} onChange={v => setField(name, 'dw', v)} />
                      <LabeledField label="세로" value={d.dh || ''} onChange={v => setField(name, 'dh', v)} />
                      <LabeledField label="손잡이높이" value={d.handle || ''} onChange={v => setField(name, 'handle', v)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">🧱 문틀</p>
                    <div className="grid grid-cols-3 gap-1">
                      <LabeledField label="가로" value={d.fw || ''} onChange={v => setField(name, 'fw', v)} />
                      <LabeledField label="세로" value={d.fh || ''} onChange={v => setField(name, 'fh', v)} />
                      <LabeledField label="bar" value={d.bar || ''} onChange={v => setField(name, 'bar', v)} />
                    </div>
                  </div>
                  <input value={rooms[name]?.note || ''} onChange={e => onUpdate(name, 'note', e.target.value)}
                    placeholder="비고" className={`${fieldCls} text-left placeholder:text-slate-400`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

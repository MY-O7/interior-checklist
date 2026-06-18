'use client';

import type { RoomMeasurement } from '@/types/checklist';

const parse = (v?: string): Record<string, string> => {
  try { const o = JSON.parse(v || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; }
};

const fieldCls = 'h-9 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500 w-full min-w-0 text-center placeholder:text-slate-400 placeholder:text-xs';

// ── 문선/몰딩: 체크한 항목마다 자유 입력 ──
export function MoldingOptionInputs({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  if (!options.length) return null;
  const map = parse(value);
  const set = (opt: string, v: string) => onChange(JSON.stringify({ ...map, [opt]: v }));
  return (
    <div className="ml-8 mt-2 space-y-2">
      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">✍️ 항목별 내용 (개수/규격 등)</div>
      {options.map(opt => (
        <div key={opt} className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-24 shrink-0">{opt}</span>
          <input value={map[opt] || ''} onChange={e => set(opt, e.target.value)}
            placeholder="예: 5개 / 110m으로 1개 등" className={`${fieldCls} flex-1 text-left`} />
        </div>
      ))}
    </div>
  );
}

// ── 문 / 문틀: 방별 (문 종류 + 문짝 가로/세로/손잡이 + 문틀 가로/세로/bar) ──
export function DoorRoomGrid({ rooms, roomList, doorTypes, onUpdate }: {
  rooms: RoomMeasurement; roomList: string[]; doorTypes: string[];
  onUpdate: (roomId: string, field: string, value: any) => void;
}) {
  const get = (room: string) => parse(rooms[room]?.value);
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
                      <input value={d.dw || ''} onChange={e => setField(name, 'dw', e.target.value)} placeholder="가로" className={fieldCls} />
                      <input value={d.dh || ''} onChange={e => setField(name, 'dh', e.target.value)} placeholder="세로" className={fieldCls} />
                      <input value={d.handle || ''} onChange={e => setField(name, 'handle', e.target.value)} placeholder="손잡이높이" className={fieldCls} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">🧱 문틀</p>
                    <div className="grid grid-cols-3 gap-1">
                      <input value={d.fw || ''} onChange={e => setField(name, 'fw', e.target.value)} placeholder="가로" className={fieldCls} />
                      <input value={d.fh || ''} onChange={e => setField(name, 'fh', e.target.value)} placeholder="세로" className={fieldCls} />
                      <input value={d.bar || ''} onChange={e => setField(name, 'bar', e.target.value)} placeholder="bar" className={fieldCls} />
                    </div>
                  </div>
                  <input value={rooms[name]?.note || ''} onChange={e => onUpdate(name, 'note', e.target.value)}
                    placeholder="비고" className={`${fieldCls} text-left`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

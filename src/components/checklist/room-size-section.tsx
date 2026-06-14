'use client';

import { useState } from 'react';
import { DimensionInputs } from './dimension-inputs';
import { calcPyeong } from '@/lib/calc';

type RoomData = { checked?: boolean; value?: string; detail?: string; note?: string };

export function RoomSizeSection({ rooms, presets, onAdd, onRemove, onUpdate }: {
  rooms: Record<string, RoomData>;
  presets: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onUpdate: (name: string, field: string, value: string) => void;
}) {
  const [custom, setCustom] = useState('');
  // 추가된 방 = checklist.roomSize 에 존재하고 체크 해제되지 않은 키 (입력 순서 유지)
  const roomNames = Object.keys(rooms).filter(n => rooms[n]?.checked !== false);
  const usedPresets = new Set(roomNames);
  const availablePresets = presets.filter(p => !usedPresets.has(p));

  const addCustom = () => {
    const name = custom.trim();
    if (!name || usedPresets.has(name)) { setCustom(''); return; }
    onAdd(name);
    setCustom('');
  };

  const totalPyeong = roomNames.reduce((sum, n) => sum + calcPyeong(rooms[n]?.value || ''), 0);

  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 space-y-4">
      {/* 안내 + 합계 */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          실측할 방을 <span className="font-semibold text-slate-700 dark:text-slate-200">아래에서 골라 추가</span>한 뒤,
          가로·세로를 mm로 입력하세요. 평수는 자동 계산됩니다.
        </p>
        {totalPyeong > 0 && (
          <div className="rounded-lg bg-blue-600 text-white px-3.5 py-1.5 shrink-0">
            <span className="text-xs opacity-80">총 면적 </span>
            <span className="text-base font-bold">{totalPyeong.toFixed(1)}평</span>
          </div>
        )}
      </div>

      {/* 방 추가 영역 */}
      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-4">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2.5">➕ 방 추가</p>
        {availablePresets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {availablePresets.map(name => (
              <button key={name} onClick={() => onAdd(name)}
                className="px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                + {name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder="직접 입력 (예: 드레스룸, 펜트리)"
            className="flex-1 h-11 px-3 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-400 placeholder:text-sm" />
          <button onClick={addCustom}
            className="h-11 px-4 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-700 dark:hover:bg-white transition-colors shrink-0">
            추가
          </button>
        </div>
      </div>

      {/* 추가된 방 목록 */}
      {roomNames.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <div className="text-4xl mb-2">📐</div>
          <p className="text-sm">아직 추가된 방이 없습니다.</p>
          <p className="text-xs mt-1">위에서 방을 선택해 시작하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roomNames.map(name => {
            const rd = rooms[name] || {};
            return (
              <div key={name} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">🏠 {name}</h4>
                  <button onClick={() => onRemove(name)} aria-label={`${name} 삭제`}
                    className="text-xs text-slate-400 hover:text-rose-500 font-medium px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                    ✕ 삭제
                  </button>
                </div>
                <DimensionInputs value={rd.value || ''} onChange={v => onUpdate(name, 'value', v)} />
                <input value={rd.note || ''} onChange={e => onUpdate(name, 'note', e.target.value)}
                  placeholder="비고 / 특이사항 (선택)"
                  className="mt-2.5 w-full h-10 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-400 placeholder:text-slate-400" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

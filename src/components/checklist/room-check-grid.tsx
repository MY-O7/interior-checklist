'use client';

import type { RoomMeasurement } from '@/types/checklist';
import { DimensionInputs } from './dimension-inputs';

export function RoomCheckGrid({ rooms, hasMeasurement, measurementLabel, showJwa, roomList, onUpdate, selectOptions, selectPlaceholder }: {
  rooms: RoomMeasurement;
  hasMeasurement?: boolean;
  measurementLabel?: string;
  showJwa?: boolean;
  roomList: string[];
  onUpdate: (roomId: string, field: string, value: any) => void;
  selectOptions?: string[]; // 체크 시 선택할 옵션 목록 (예: 문 종류)
  selectPlaceholder?: string;
}) {
  const isDimension = measurementLabel === 'W×H' || measurementLabel === 'mm×mm';
  return (
    <div className="ml-8 mt-2">
      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">📍 시공할 공간 선택</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {roomList.map(name => {
          const rd = rooms[name] || { checked: false, value: '', note: '' };
          return (
            <div key={name} className={`rounded-lg border p-3 transition-all ${rd.checked ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rd.checked} onChange={(e) => onUpdate(name, 'checked', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 accent-slate-800" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
              </label>
              {rd.checked && (
                <>
                  {/* 옵션 선택 (문 종류 등) */}
                  {selectOptions && selectOptions.length > 0 && (
                    <select value={rd.value || ''} onChange={(e) => onUpdate(name, 'value', e.target.value)}
                      className="mt-2 w-full h-9 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-500">
                      <option value="">{selectPlaceholder || '선택하세요'}</option>
                      {selectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {/* 수치 입력 (mm×mm 등) - 옵션이 없을 때만 */}
                  {hasMeasurement && !selectOptions && (
                    isDimension ? (
                      <DimensionInputs value={rd.value} onChange={(v) => onUpdate(name, 'value', v)} showJwa={showJwa} />
                    ) : (
                      <div className="mt-2 flex items-center gap-1">
                        <input type="text" value={rd.value} onChange={(e) => onUpdate(name, 'value', e.target.value)}
                          placeholder="수치" className="w-full h-9 px-2 text-sm border border-dashed border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-500" />
                        {measurementLabel && <span className="text-xs text-slate-400 shrink-0">{measurementLabel}</span>}
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

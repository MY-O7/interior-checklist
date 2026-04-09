'use client';

import { TAG_COLORS, type TagColor } from '@/types/checklist';

export function OptionTag({ label, color, checked, onToggle }: {
  label: string; color: TagColor; checked: boolean; onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${checked ? `${TAG_COLORS[color]} ring-2 ring-offset-1 ring-current opacity-100` : `${TAG_COLORS[color]} opacity-60 hover:opacity-80`}`}>
      <span className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all aspect-square ${checked ? 'bg-current border-current' : 'border-current/40 bg-white/50'}`}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </span>
      <span>{label}</span>
    </button>
  );
}

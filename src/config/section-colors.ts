// 공정별 색상 코딩 — Tailwind 정적 클래스(퍼지 방지를 위해 전체 문자열로 명시)
// dot: 사이드바/카드 색 점, num: 번호 색, chipBg/chipText: 연한 배경 칩, grad: 섹션 헤더 그라데이션

export interface SectionColor {
  dot: string;
  num: string;
  chipBg: string;
  chipText: string;
  ring: string;   // 카드 hover/선택 테두리
  grad: string;   // 헤더 그라데이션
}

export const SECTION_COLORS: Record<string, SectionColor> = {
  roomSize:   { dot: 'bg-blue-500',    num: 'text-blue-600',    chipBg: 'bg-blue-50 dark:bg-blue-950/40',       chipText: 'text-blue-700 dark:text-blue-300',       ring: 'hover:border-blue-400',    grad: 'from-blue-600 to-blue-700' },
  demolition: { dot: 'bg-orange-500',  num: 'text-orange-600',  chipBg: 'bg-orange-50 dark:bg-orange-950/40',   chipText: 'text-orange-700 dark:text-orange-300',   ring: 'hover:border-orange-400',  grad: 'from-orange-600 to-orange-700' },
  windows:    { dot: 'bg-sky-500',     num: 'text-sky-600',     chipBg: 'bg-sky-50 dark:bg-sky-950/40',         chipText: 'text-sky-700 dark:text-sky-300',         ring: 'hover:border-sky-400',     grad: 'from-sky-600 to-sky-700' },
  bathroom:   { dot: 'bg-cyan-500',    num: 'text-cyan-600',    chipBg: 'bg-cyan-50 dark:bg-cyan-950/40',       chipText: 'text-cyan-700 dark:text-cyan-300',       ring: 'hover:border-cyan-400',    grad: 'from-cyan-600 to-cyan-700' },
  equipment:  { dot: 'bg-violet-500',  num: 'text-violet-600',  chipBg: 'bg-violet-50 dark:bg-violet-950/40',   chipText: 'text-violet-700 dark:text-violet-300',   ring: 'hover:border-violet-400',  grad: 'from-violet-600 to-violet-700' },
  carpentry:  { dot: 'bg-amber-500',   num: 'text-amber-600',   chipBg: 'bg-amber-50 dark:bg-amber-950/40',     chipText: 'text-amber-700 dark:text-amber-300',     ring: 'hover:border-amber-400',   grad: 'from-amber-600 to-amber-700' },
  electrical: { dot: 'bg-yellow-500',  num: 'text-yellow-600',  chipBg: 'bg-yellow-50 dark:bg-yellow-950/40',   chipText: 'text-yellow-700 dark:text-yellow-300',   ring: 'hover:border-yellow-400',  grad: 'from-yellow-500 to-yellow-600' },
  lighting:   { dot: 'bg-rose-500',    num: 'text-rose-600',    chipBg: 'bg-rose-50 dark:bg-rose-950/40',       chipText: 'text-rose-700 dark:text-rose-300',       ring: 'hover:border-rose-400',    grad: 'from-rose-500 to-rose-600' },
  film:       { dot: 'bg-fuchsia-500', num: 'text-fuchsia-600', chipBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', chipText: 'text-fuchsia-700 dark:text-fuchsia-300', ring: 'hover:border-fuchsia-400', grad: 'from-fuchsia-600 to-fuchsia-700' },
  tile:       { dot: 'bg-teal-500',    num: 'text-teal-600',    chipBg: 'bg-teal-50 dark:bg-teal-950/40',       chipText: 'text-teal-700 dark:text-teal-300',       ring: 'hover:border-teal-400',    grad: 'from-teal-600 to-teal-700' },
  elastic:    { dot: 'bg-lime-500',    num: 'text-lime-600',    chipBg: 'bg-lime-50 dark:bg-lime-950/40',       chipText: 'text-lime-700 dark:text-lime-300',       ring: 'hover:border-lime-400',    grad: 'from-lime-500 to-lime-600' },
  flooring:   { dot: 'bg-emerald-500', num: 'text-emerald-600', chipBg: 'bg-emerald-50 dark:bg-emerald-950/40', chipText: 'text-emerald-700 dark:text-emerald-300', ring: 'hover:border-emerald-400', grad: 'from-emerald-600 to-emerald-700' },
  wallpaper:  { dot: 'bg-indigo-500',  num: 'text-indigo-600',  chipBg: 'bg-indigo-50 dark:bg-indigo-950/40',   chipText: 'text-indigo-700 dark:text-indigo-300',   ring: 'hover:border-indigo-400',  grad: 'from-indigo-600 to-indigo-700' },
  furniture:  { dot: 'bg-pink-500',    num: 'text-pink-600',    chipBg: 'bg-pink-50 dark:bg-pink-950/40',       chipText: 'text-pink-700 dark:text-pink-300',       ring: 'hover:border-pink-400',    grad: 'from-pink-600 to-pink-700' },
  hardware:   { dot: 'bg-slate-500',   num: 'text-slate-600',   chipBg: 'bg-slate-100 dark:bg-slate-800',       chipText: 'text-slate-700 dark:text-slate-300',     ring: 'hover:border-slate-400',   grad: 'from-slate-600 to-slate-700' },
  finishing:  { dot: 'bg-green-500',   num: 'text-green-600',   chipBg: 'bg-green-50 dark:bg-green-950/40',     chipText: 'text-green-700 dark:text-green-300',     ring: 'hover:border-green-400',   grad: 'from-green-600 to-green-700' },
  notes:      { dot: 'bg-stone-500',   num: 'text-stone-600',   chipBg: 'bg-stone-100 dark:bg-stone-800',       chipText: 'text-stone-700 dark:text-stone-300',     ring: 'hover:border-stone-400',   grad: 'from-stone-600 to-stone-700' },
};

const FALLBACK: SectionColor = SECTION_COLORS.hardware;

export function sectionColor(id: string): SectionColor {
  return SECTION_COLORS[id] || FALLBACK;
}

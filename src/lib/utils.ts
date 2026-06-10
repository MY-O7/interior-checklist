import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** JSON.parse 안전판 — localStorage 등 깨질 수 있는 입력용. 실패하면 fallback 반환 */
export function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/** 로컬 날짜 문자열 (YYYY-MM-DD) — UTC 변환 없이 */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 금액 표시: 1234567 → "1,234,567원" */
export function formatWon(n: number): string {
  return `${n.toLocaleString()}원`;
}

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Clipboard, Ruler, Home } from 'lucide-react';

interface PageNavProps {
  projectId: string;
  current: 'checklist' | 'estimate' | 'measurement';
}

const NAV_ITEMS = [
  { key: 'checklist', label: '체크리스트', icon: ArrowLeft, path: (id: string) => `/project/${id}` },
  { key: 'estimate', label: '견적서', icon: Clipboard, path: (id: string) => `/estimate/${id}` },
  { key: 'measurement', label: '실측 정보', icon: Ruler, path: (id: string) => `/measurement/${id}` },
  { key: 'dashboard', label: '프로젝트 목록', icon: Home, path: () => '/dashboard' },
] as const;

export function PageNav({ projectId, current }: PageNavProps) {
  const router = useRouter();
  return (
    <div className="p-3 border-t space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">이동</p>
      {NAV_ITEMS.filter(item => item.key !== current).map(item => (
        <button
          key={item.key}
          onClick={() => router.push(item.path(projectId))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-sm text-slate-500"
        >
          <item.icon className="w-4 h-4" /> {item.label}
        </button>
      ))}
    </div>
  );
}

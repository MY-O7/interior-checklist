'use client';
import { useState } from 'react';
import type { ParsedEstimate } from '@/lib/excel-estimate';

interface Props {
  mode: 'newProject' | 'overwrite';
  projectId?: string;
  onDone: (projectId: string) => void;
  onClose: () => void;
}

// 엑셀 견적서 업로드 → 미리보기 → 등록 다이얼로그.
// 검증을 통과한 파싱 결과만 미리보기로 보여주고, 사용자가 "등록"을 눌러야 저장한다.
export default function ExcelImportDialog({ mode, projectId, onDone, onClose }: Props) {
  const [parsed, setParsed] = useState<ParsedEstimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/estimates/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '업로드 실패');
      setParsed(json.parsed);
    } catch (e) { setError(e instanceof Error ? e.message : '업로드 실패'); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!parsed) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/estimates/import/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, projectId, parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '저장 실패');
      onDone(json.projectId);
    } catch (e) { setError(e instanceof Error ? e.message : '저장 실패'); }
    finally { setBusy(false); }
  }

  const total = parsed ? parsed.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + parsed.vatAmount : 0;
  const byCategory: [string, ParsedEstimate['items']][] = [];
  if (parsed) {
    const m = new Map<string, ParsedEstimate['items']>();
    for (const i of parsed.items) {
      if (!m.has(i.category)) { m.set(i.category, []); byCategory.push([i.category, m.get(i.category)!]); }
      m.get(i.category)!.push(i);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--card,white)] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-auto p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-3">엑셀 견적서 가져오기</h2>
        {!parsed && (
          <div>
            <p className="text-sm mb-3 text-[var(--muted-foreground,#666)]">.xls 견적서 파일을 선택하면 내용을 분석해서 보여드립니다. 확인 전에는 저장되지 않습니다.</p>
            <input type="file" accept=".xls,.xlsx" disabled={busy} className="text-sm"
              onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            {busy && <p className="text-sm mt-2">분석 중…</p>}
          </div>
        )}
        {parsed && (
          <div>
            <p className="text-sm mb-2">
              현장명: <b>{parsed.meta.siteName}</b>
              {parsed.meta.customerName && ` · ${parsed.meta.customerName}`}
              {parsed.meta.pyeong && ` · ${parsed.meta.pyeong}`}
            </p>
            <div className="border rounded-lg divide-y">
              {byCategory.map(([cat, items]) => (
                <div key={cat} className="py-1.5 px-3 text-sm flex justify-between">
                  <span>{cat} <span className="text-[var(--muted-foreground,#888)]">({items.length}건)</span></span>
                  <span className="font-medium">{items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}원</span>
                </div>
              ))}
            </div>
            <p className="text-right font-bold mt-2">
              총액 {total.toLocaleString()}원{parsed.includeVat ? ' (VAT 포함)' : ''}
            </p>
            {mode === 'overwrite' && (
              <p className="text-red-500 text-sm mt-2">⚠ 등록하면 이 프로젝트의 기존 견적서를 완전히 대체합니다.</p>
            )}
            <div className="flex gap-2 mt-4 justify-end">
              <button className="px-4 py-2 rounded-lg border text-sm" onClick={onClose} disabled={busy}>취소</button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50" onClick={commit} disabled={busy}>
                {busy ? '저장 중…' : '등록'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-red-500 text-sm mt-3 whitespace-pre-wrap">{error}</p>}
      </div>
    </div>
  );
}

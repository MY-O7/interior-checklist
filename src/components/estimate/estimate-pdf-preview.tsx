'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePDF } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist';
import { EstimatePdfDocument, type EstimatePdfProps } from './estimate-pdf';

// pdf.js 워커 (버전 일치하는 CDN)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = Omit<EstimatePdfProps, 'origin'> & { onClose?: () => void };

export function EstimatePdfPreview({ onClose, ...docProps }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const doc = useMemo(
    () => <EstimatePdfDocument {...docProps} origin={origin} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(docProps), origin]
  );
  const [instance, update] = usePDF({ document: doc });
  useEffect(() => { update(doc); /* eslint-disable-next-line */ }, [doc]);

  const fileName = `견적서_${docProps.project?.name || '솜씨인테리어'}.pdf`;

  // PDF blob → pdf.js로 각 페이지를 캔버스에 렌더 (아이폰 포함 모든 기기에서 인라인 표시)
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!instance.blob || !container) return;
    setRendering(true);
    (async () => {
      try {
        const buf = await instance.blob!.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;
        container.innerHTML = '';
        setPageCount(pdf.numPages);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'block bg-white shadow-md rounded mx-auto mb-4 max-w-[820px]';
          const ctx = canvas.getContext('2d')!;
          ctx.scale(dpr, dpr);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
      } catch (e) {
        console.error('PDF 렌더 오류:', e);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [instance.blob]);

  // 인쇄: 실제 PDF를 native 뷰어로 연다 (기기별 동일 출력 + 정상 인쇄)
  const openPdf = () => {
    if (instance.url) window.open(instance.url, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between bg-emerald-700 text-white rounded-xl px-4 sm:px-6 py-4 mb-4 shrink-0">
        {onClose
          ? <button onClick={onClose} className="text-sm hover:text-slate-200 transition shrink-0">← 돌아가기</button>
          : <span className="w-12" />}
        <span className="text-sm font-medium hidden sm:inline">견적서 PDF{pageCount ? ` · ${pageCount}p` : ''}</span>
        <div className="flex items-center gap-2">
          {instance.url && (
            <a href={instance.url} download={fileName}
              className="bg-white text-slate-800 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition">⬇ 다운로드</a>
          )}
          <button onClick={openPdf} disabled={!instance.url}
            className="bg-white text-slate-800 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition disabled:opacity-50">🖨 인쇄</button>
        </div>
      </div>

      <div className="flex-1 min-h-[70vh] rounded-xl overflow-auto border border-slate-300 bg-slate-200 p-3 sm:p-5">
        {(instance.loading || rendering) && (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">PDF 생성 중…</div>
        )}
        {instance.error && (
          <div className="flex items-center justify-center py-20 text-red-500 text-sm">PDF 오류: {String(instance.error)}</div>
        )}
        <div ref={containerRef} />
      </div>
      <p className="text-xs text-slate-400 text-center mt-2 px-2">
        🖨 인쇄를 누르면 PDF가 새 창으로 열립니다. 거기서 인쇄하면 모든 기기에서 동일하게 출력됩니다.
      </p>
    </div>
  );
}

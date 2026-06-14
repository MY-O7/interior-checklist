'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePDF } from '@react-pdf/renderer';
import { EstimatePdfDocument, type EstimatePdfProps } from './estimate-pdf';

type Props = Omit<EstimatePdfProps, 'origin'> & { onClose?: () => void };

export function EstimatePdfPreview({ onClose, ...docProps }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const doc = useMemo(
    () => <EstimatePdfDocument {...docProps} origin={origin} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(docProps), origin]
  );

  const [instance, update] = usePDF({ document: doc });
  useEffect(() => { update(doc); /* eslint-disable-next-line */ }, [doc]);

  const fileName = `견적서_${docProps.project?.name || '솜씨인테리어'}.pdf`;

  const printPdf = () => {
    const f = iframeRef.current;
    if (f?.contentWindow) {
      f.contentWindow.focus();
      f.contentWindow.print();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between bg-emerald-700 text-white rounded-xl px-6 py-4 mb-4 shrink-0">
        {onClose
          ? <button onClick={onClose} className="text-sm hover:text-slate-200 transition">← 돌아가기</button>
          : <span className="w-16" />}
        <span className="text-sm font-medium">견적서 PDF 미리보기</span>
        <div className="flex items-center gap-2">
          {instance.url && (
            <a href={instance.url} download={fileName}
              className="bg-white text-slate-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition">⬇ 다운로드</a>
          )}
          <button onClick={printPdf} disabled={!instance.url}
            className="bg-white text-slate-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition disabled:opacity-50">🖨 인쇄</button>
        </div>
      </div>

      <div className="flex-1 min-h-[70vh] rounded-xl overflow-hidden border border-slate-300 bg-slate-200">
        {instance.loading && <div className="flex items-center justify-center h-full text-slate-500 text-sm">PDF 생성 중…</div>}
        {instance.error && <div className="flex items-center justify-center h-full text-red-500 text-sm">PDF 생성 오류: {String(instance.error)}</div>}
        {instance.url && (
          <iframe ref={iframeRef} src={instance.url} title="견적서 PDF" className="w-full h-full min-h-[70vh]" />
        )}
      </div>
    </div>
  );
}

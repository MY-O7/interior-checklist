'use client';

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EstimateItem, CompanyInfo } from '@/types/checklist';

interface Props {
  project: { name?: string; clientPhone?: string } | null;
  estimate: { items: EstimateItem[]; discount: number; vatRate: number; includeVat: boolean; notes: string };
  companyInfo: CompanyInfo;
  miscRate: number; miscAmount: number; subtotal: number; vatAmount: number; total: number;
  categoryOrder?: string[] | null;
  onClose?: () => void;
}

const CATEGORY_DISPLAY: Record<string, string> = {
  '철거': '철거 시공', '창호': '창호 시공', '목공': '목공 시공', '전기': '전기·조명 시공',
  '조명': '전기·조명 시공', '필름': '필름 시공', '타일': '타일 시공', '탄성': '탄성코트 시공',
  '바닥재': '바닥재 시공', '도배': '도배 시공', '가구': '가구 시공', '철물': '철물 시공',
  '욕실': '욕실 시공', '설비': '설비 시공', '마감': '마감 공사', '기타': '기타',
};
const DEFAULT_ORDER = ['철거 시공', '창호 시공', '목공 시공', '전기·조명 시공', '필름 시공', '타일 시공', '탄성코트 시공', '바닥재 시공', '도배 시공', '가구 시공', '철물 시공', '욕실 시공', '설비 시공', '마감 공사', '기타'];

// A4 @96dpi
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD = 48;
const USABLE_H = PAGE_H - PAD * 2;
const BLOCK_GAP = 22; // 블록 간 여백 보정

export function EstimatePaper({ project, estimate, companyInfo, miscRate, miscAmount, subtotal, vatAmount, total, categoryOrder, onClose }: Props) {
  const grouped = estimate.items.reduce((acc, item) => {
    const cat = CATEGORY_DISPLAY[item.category] || item.category;
    (acc[cat] ||= []).push(item);
    return acc;
  }, {} as Record<string, EstimateItem[]>);

  const cats = Object.keys(grouped).sort((a, b) => {
    const order = categoryOrder?.length ? categoryOrder.map(c => CATEGORY_DISPLAY[c] || c) : DEFAULT_ORDER;
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const won = (n: number) => n.toLocaleString('ko-KR');
  let no = 0;
  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── 블록 정의 ──
  const headerInfo = (
    <div>
      <div className="flex items-end justify-between mb-6 pb-4" style={{ borderBottom: '3px solid #2f7d5f' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SOMSSI" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-3xl font-black tracking-wider text-slate-800">견 적 서</h1>
            <p className="text-[12px] tracking-widest mt-0.5" style={{ color: '#2f7d5f' }}>SOMSSI INTERIOR ESTIMATE</p>
          </div>
        </div>
        <p className="text-[13px] text-slate-500">{dateStr}</p>
      </div>
      <div className="grid grid-cols-2 gap-6 text-[13px]">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: '#2f7d5f' }}>현장 정보</p>
          <div className="space-y-2">
            <div className="flex"><span className="w-16 text-slate-400 shrink-0">현장명</span><span className="font-semibold text-slate-800">{project?.name || '-'}</span></div>
            <div className="flex"><span className="w-16 text-slate-400 shrink-0">연락처</span><span className="text-slate-700">{project?.clientPhone || '-'}</span></div>
          </div>
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: '#2f7d5f' }}>공급자</p>
          <div className="space-y-2">
            <div className="flex"><span className="w-20 text-slate-400 shrink-0">업체명</span><span className="font-semibold text-slate-800">솜씨인테리어</span></div>
            {companyInfo.ceoName && <div className="flex"><span className="w-20 text-slate-400 shrink-0">대표자</span><span className="text-slate-700">{companyInfo.ceoName}</span></div>}
            {companyInfo.bizNumber && <div className="flex"><span className="w-20 text-slate-400 shrink-0">사업자번호</span><span className="text-slate-700">{companyInfo.bizNumber}</span></div>}
            {companyInfo.address && <div className="flex"><span className="w-20 text-slate-400 shrink-0">주소</span><span className="text-slate-700">{companyInfo.address}</span></div>}
          </div>
        </div>
      </div>
    </div>
  );

  const categoryBlock = (cat: string) => {
    const items = grouped[cat];
    const catMat = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const catLab = items.reduce((s, i) => s + (i.labor || []).reduce((x, l) => x + l.days * l.dayRate, 0), 0);
    return (
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-block w-1.5 h-5 rounded-sm" style={{ backgroundColor: '#2f7d5f' }} />
          <span className="font-bold text-lg text-slate-800">{cat}</span>
          <div className="flex-1 border-b border-slate-200" />
          <span className="text-[13px] font-medium" style={{ color: '#2f7d5f' }}>{items.length}건</span>
        </div>
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th className="px-2 py-2 text-center w-7 text-[13px] font-semibold text-slate-400 border-b-2 border-slate-200">NO</th>
              <th className="px-2.5 py-2.5 text-left text-[13px] font-semibold text-slate-400 border-b-2 border-slate-200">항목명</th>
              <th className="px-2.5 py-2.5 text-center w-10 text-[13px] font-semibold text-slate-400 border-b-2 border-slate-200">단위</th>
              <th className="px-2.5 py-2.5 text-center w-10 text-[13px] font-semibold text-slate-400 border-b-2 border-slate-200">수량</th>
              <th className="px-2.5 py-2.5 text-right w-16 text-[13px] font-semibold text-slate-400 border-b-2 border-slate-200">단가</th>
              <th className="px-2.5 py-2.5 text-right w-20 text-[13px] font-semibold text-slate-400 border-b-2 border-slate-200">자재비</th>
              <th className="px-2.5 py-2.5 text-right w-20 text-[13px] font-semibold text-slate-400 border-b-2 border-slate-200">인건비</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              no++;
              const lab = (item.labor || []).reduce((s, l) => s + l.days * l.dayRate, 0);
              return (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-2.5 py-2.5 text-center text-[13px] text-slate-400">{no}</td>
                  <td className="px-2.5 py-2.5 font-medium text-slate-700 text-[13px]">{item.name || '-'}{item.note && <span className="text-[11.5px] text-slate-400 ml-1">({item.note})</span>}</td>
                  <td className="px-2.5 py-2.5 text-center text-slate-500 text-[13px]">{item.unit}</td>
                  <td className="px-2.5 py-2.5 text-center text-slate-700 font-medium text-[13px]">{item.quantity}</td>
                  <td className="px-2.5 py-2.5 text-right text-slate-500 text-[13px]">{won(item.unitPrice)}</td>
                  <td className="px-2.5 py-2.5 text-right font-medium text-[13px]">{won(item.quantity * item.unitPrice)}</td>
                  <td className="px-2.5 py-2.5 text-right font-medium text-[13px]">{lab > 0 ? won(lab) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <td colSpan={5} className="px-2.5 py-2.5 text-right font-bold text-slate-500 text-[13px] border-t-2 border-slate-200">{cat} 소계</td>
              <td className="px-2.5 py-2.5 text-right font-bold text-[13px] border-t-2 border-slate-200">{won(catMat)}</td>
              <td className="px-2.5 py-2.5 text-right font-bold text-[13px] border-t-2 border-slate-200">{won(catLab)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const totalsBlock = (
    <div className="flex justify-end">
      <div className="w-72 text-[14px]">
        {miscRate > 0 && <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">공과잡비 ({miscRate}%)</span><span className="font-medium">{won(miscAmount)}원</span></div>}
        <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">공급가액</span><span className="font-medium">{won(subtotal)}원</span></div>
        {estimate.includeVat !== false && <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">부가세 ({estimate.vatRate ?? 10}%)</span><span className="font-medium">{won(vatAmount)}원</span></div>}
        {estimate.discount > 0 && <div className="flex justify-between py-2 border-b border-slate-100 text-red-500"><span>할인</span><span className="font-medium">-{won(estimate.discount)}원</span></div>}
        <div className="flex justify-between items-center py-3 mt-2 px-4 rounded-lg" style={{ backgroundColor: '#ecfdf5' }}>
          <span className="text-[15px] font-black text-slate-800">총 견적금액</span>
          <span className="text-xl font-black" style={{ color: '#2f7d5f' }}>{won(total)}원</span>
        </div>
      </div>
    </div>
  );

  const notesBlock = (
    <div>
      <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: '#2f7d5f' }}>특이사항</p>
      <div className="rounded-lg px-4 py-3 text-[13px] text-slate-600 leading-[1.9] whitespace-pre-wrap border-l-4" style={{ backgroundColor: '#f6faf8', borderColor: '#2f7d5f' }}>
        {estimate.notes && <>{estimate.notes}{'\n\n'}</>}
        <span className="text-slate-500">※ 견적 외 추가공사는 별도 협의 후 진행됩니다.{'\n'}※ 하자 발생 시 신의성실하게 보수합니다. (단, 정상적 노후 및 고객 부주의에 의한 것은 제외){'\n'}※ 부가세 {estimate.includeVat !== false ? '포함' : '별도'}{'\n'}※ 대금지불조건: 계약금 50% / 잔금 50%{'\n'}※ 본 견적서는 발행일로부터 30일간 유효합니다.{'\n'}※ 현장 확인 후 공사금액이 변동될 수 있습니다.</span>
      </div>
    </div>
  );

  const signBlock = (
    <div className="pt-5 border-t border-slate-200 flex justify-between items-end">
      <p className="text-[13px] text-slate-400">위 금액으로 견적합니다.</p>
      <div className="text-center">
        <div className="w-20 h-20 border border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-1.5">
          <img src="/stamp.png" alt="직인" className="w-16 h-16 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <p className="text-[13px] text-slate-400">솜씨인테리어</p>
      </div>
    </div>
  );

  const blocks: ReactNode[] = [headerInfo, ...cats.map(categoryBlock), totalsBlock, notesBlock, signBlock];

  // ── 측정 후 A4 페이지 단위로 분할 ──
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)]);
  const depKey = useMemo(() => JSON.stringify({ items: estimate.items, total, categoryOrder, notes: estimate.notes }), [estimate.items, total, categoryOrder, estimate.notes]);

  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      const root = measureRef.current;
      if (!root) return;
      const heights = Array.from(root.children).map((c) => (c as HTMLElement).offsetHeight + BLOCK_GAP);
      const result: number[][] = [];
      let cur: number[] = [];
      let h = 0;
      heights.forEach((bh, i) => {
        if (i === 0) { cur = [0]; h = bh; return; } // 헤더는 항상 1페이지 상단
        if (cur.length > 0 && h + bh > USABLE_H) { result.push(cur); cur = []; h = 0; }
        cur.push(i);
        h += bh;
      });
      if (cur.length) result.push(cur);
      if (alive && result.length) setPages(result);
    };
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => { if (alive) measure(); });
    }
    measure();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return (
    <div className="estimate-paper-root">
      {/* 액션 바 */}
      <div className="flex items-center justify-between bg-emerald-700 text-white rounded-xl px-4 sm:px-6 py-4 mb-5 no-print">
        {onClose ? <button onClick={onClose} className="text-sm hover:text-slate-200 transition">← 돌아가기</button> : <span className="w-12" />}
        <span className="text-sm font-medium hidden sm:inline">견적서 미리보기 · {pages.length}p</span>
        <button onClick={() => window.print()} className="bg-white text-slate-800 px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition">🖨 인쇄</button>
      </div>

      {/* A4 페이지들 (모바일에선 가로 스크롤) */}
      <div className="paper-stack flex flex-col items-center gap-6 overflow-x-auto">
        {pages.map((idxs, pi) => (
          <div key={pi} className="a4-sheet bg-white text-slate-800 shadow-lg relative"
            style={{ width: PAGE_W, minHeight: PAGE_H, padding: PAD, fontFamily: "'Pretendard', sans-serif" }}>
            <div className="flex flex-col gap-[22px]">
              {idxs.map((bi) => <div key={bi}>{blocks[bi]}</div>)}
            </div>
            <div className="paper-pageno absolute left-0 right-0 text-center text-[13px] text-slate-400" style={{ bottom: 18 }}>{pi + 1} / {pages.length}</div>
          </div>
        ))}
      </div>

      {/* 측정용 숨김 컨테이너 (화면/인쇄 모두 비표시) */}
      <div ref={measureRef} aria-hidden className="no-print"
        style={{ position: 'absolute', left: -99999, top: 0, width: PAGE_W - PAD * 2, visibility: 'hidden', fontFamily: "'Pretendard', sans-serif" }}>
        {blocks.map((b, i) => <div key={i}>{b}</div>)}
      </div>
    </div>
  );
}

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
const GRID = '28px 1fr 46px 46px 92px 100px 92px';
const COL = 'grid items-center whitespace-nowrap';

const won = (n: number) => n.toLocaleString('ko-KR');

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

  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const matTotal = estimate.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const labTotal = estimate.items.reduce((s, i) => s + (i.labor || []).reduce((x, l) => x + l.days * l.dayRate, 0), 0);

  // ── 렌더 조각들 ──
  const headerInfoEl = (
    <div style={{ paddingBottom: 44 }}>
      <div className="flex items-end justify-between mb-6 pb-4" style={{ borderBottom: '2px solid #334155' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SOMSSI" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-3xl font-black tracking-wider text-slate-900">견 적 서</h1>
            <p className="text-[12px] text-slate-400 tracking-widest mt-0.5">SOMSSI INTERIOR ESTIMATE</p>
          </div>
        </div>
        <p className="text-[13px] text-slate-500">{dateStr}</p>
      </div>
      <div className="grid grid-cols-2 gap-6 text-[13px]">
        <div>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">현장 정보</p>
          <div className="space-y-2">
            <div className="flex"><span className="w-16 text-slate-400 shrink-0">현장명</span><span className="font-semibold text-slate-800">{project?.name || '-'}</span></div>
            <div className="flex"><span className="w-16 text-slate-400 shrink-0">연락처</span><span className="text-slate-700">{project?.clientPhone || '-'}</span></div>
          </div>
        </div>
        <div>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">공급자</p>
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

  const cheadEl = (cat: string, first: boolean, cont = false) => (
    <div style={{ marginTop: first ? 0 : 22 }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-1.5 h-5 rounded-sm bg-slate-700" />
        <span className="font-bold text-lg text-slate-900">{cat}{cont && <span className="text-[12px] font-normal text-slate-400 ml-1">(이어서)</span>}</span>
        <div className="flex-1 border-b border-slate-200" />
        <span className="text-[13px] text-slate-400">{grouped[cat].length}건</span>
      </div>
      <div className={`${COL} text-[12px] font-semibold text-slate-400`} style={{ gridTemplateColumns: GRID, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
        <span className="px-2 py-2.5 text-center">NO</span>
        <span className="px-2 py-2.5 text-left">항목명</span>
        <span className="px-2 py-2.5 text-center">단위</span>
        <span className="px-2 py-2.5 text-center">수량</span>
        <span className="px-2 py-2.5 text-right">단가</span>
        <span className="px-2 py-2.5 text-right">자재비</span>
        <span className="px-2 py-2.5 text-right">인건비</span>
      </div>
    </div>
  );

  const rowEl = (item: EstimateItem, idx: number) => {
    const lab = (item.labor || []).reduce((s, l) => s + l.days * l.dayRate, 0);
    return (
      <div className={`${COL} text-[14px] border-b border-slate-100`} style={{ gridTemplateColumns: GRID }}>
        <span className="px-2 py-2.5 text-center text-[12px] text-slate-400">{idx}</span>
        <span className="px-2 py-2.5 text-left font-medium text-slate-700 whitespace-normal break-words">{item.name || '-'}{item.note && <span className="text-[11.5px] text-slate-400 ml-1">({item.note})</span>}</span>
        <span className="px-2 py-2.5 text-center text-slate-500">{item.unit}</span>
        <span className="px-2 py-2.5 text-center font-medium text-slate-700">{item.quantity}</span>
        <span className="px-2 py-2.5 text-right text-slate-500">{won(item.unitPrice)}</span>
        <span className="px-2 py-2.5 text-right font-medium text-slate-800">{won(item.quantity * item.unitPrice)}</span>
        <span className="px-2 py-2.5 text-right font-medium text-slate-800">{lab > 0 ? won(lab) : '-'}</span>
      </div>
    );
  };

  const subEl = (cat: string) => {
    const items = grouped[cat];
    const m = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const l = items.reduce((s, i) => s + (i.labor || []).reduce((x, ll) => x + ll.days * ll.dayRate, 0), 0);
    return (
      <div className={`${COL} text-[13px] font-bold`} style={{ gridTemplateColumns: GRID, backgroundColor: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
        <span className="px-2 py-2.5 col-span-5 text-right text-slate-500" style={{ gridColumn: 'span 5' }}>{cat} 소계</span>
        <span className="px-2 py-2.5 text-right text-slate-800">{won(m)}</span>
        <span className="px-2 py-2.5 text-right text-slate-800">{won(l)}</span>
      </div>
    );
  };

  const tailEl = (
    <div style={{ marginTop: 24 }}>
      <div className="flex justify-end mb-6">
        <div className="w-80 text-[14px]">
          <div className="flex justify-between py-2.5 border-b border-slate-100"><span className="text-slate-500">자재·인건비 합계</span><span className="font-medium text-slate-800">{won(matTotal + labTotal)}원</span></div>
          <div className="flex justify-between py-2.5 border-b border-slate-100"><span className="text-slate-500">공과잡비{miscRate > 0 ? ` (${miscRate}%)` : ''}</span><span className="font-medium text-slate-800">{won(miscAmount)}원</span></div>
          <div className="flex justify-between py-2.5 border-b border-slate-100"><span className="text-slate-500">공급가액 (부가세 전)</span><span className="font-medium text-slate-800">{won(subtotal)}원</span></div>
          <div className="flex justify-between py-2.5 border-b border-slate-100"><span className="text-slate-500">부가세 ({estimate.vatRate ?? 10}%)</span><span className="font-medium text-slate-800">{won(estimate.includeVat !== false ? vatAmount : 0)}원</span></div>
          <div className="flex justify-between py-2.5 border-b border-slate-100"><span className="text-slate-500">할인</span><span className={`font-medium ${estimate.discount > 0 ? 'text-red-500' : 'text-slate-800'}`}>{estimate.discount > 0 ? `-${won(estimate.discount)}` : '0'}원</span></div>
          <div className="flex justify-between items-center py-3.5 mt-3 px-4 rounded-lg" style={{ backgroundColor: '#1e293b' }}>
            <span className="text-[15px] font-black text-white">총 견적금액</span>
            <span className="text-xl font-black text-white">{won(total)}원</span>
          </div>
        </div>
      </div>
      {estimate.notes && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">특이사항</p>
          <div className="rounded-md px-4 py-2.5 text-[12px] text-slate-700 leading-[1.6] whitespace-pre-wrap border-l-4 border-slate-300" style={{ backgroundColor: '#f8fafc' }}>{estimate.notes}</div>
        </div>
      )}
      <div className="flex items-end justify-between pt-4 border-t border-slate-200">
        <p className="text-[10.5px] text-slate-400 leading-[1.7] whitespace-pre-line">
          ※ 견적 외 추가공사는 별도 협의 · 부가세 {estimate.includeVat !== false ? '포함' : '별도'} · 대금: 계약금 50% / 잔금 50%{'\n'}※ 발행일로부터 30일간 유효 · 현장 확인 후 금액 변동 가능 · 하자는 신의성실 보수(정상 노후·고객 부주의 제외)
        </p>
        <div className="text-center shrink-0 ml-4">
          <div className="w-16 h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-1">
            <img src="/stamp.png" alt="직인" className="w-12 h-12 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <p className="text-[11px] text-slate-400">솜씨인테리어</p>
        </div>
      </div>
    </div>
  );

  // ── 측정용 블록 목록 (공정은 통째로 한 블록 — "(이어서)" 없음) ──
  let no = 0;
  const blocks: ReactNode[] = [headerInfoEl];
  cats.forEach((cat, ci) => {
    const rows = grouped[cat].map((item) => { no++; return <div key={item.id}>{rowEl(item, no)}</div>; });
    blocks.push(
      <div style={{ breakInside: 'avoid' }}>
        {cheadEl(cat, ci === 0)}
        {rows}
        {subEl(cat)}
      </div>
    );
  });
  blocks.push(tailEl);

  // ── 측정 → 페이지 분할 (블록 통째로 채움) ──
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)]);
  const depKey = useMemo(() => JSON.stringify({ items: estimate.items, total, categoryOrder, notes: estimate.notes, miscRate }), [estimate.items, total, categoryOrder, estimate.notes, miscRate]);

  // 화면 폭에 맞춰 A4 시트 축소 (모바일에서 잘리지 않게). 인쇄 시엔 원본 크기.
  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const calc = () => {
      const w = rootRef.current?.clientWidth ?? PAGE_W;
      setScale(Math.min(1, w / PAGE_W));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      const root = measureRef.current;
      if (!root) return;
      const h = Array.from(root.children).map(c => (c as HTMLElement).offsetHeight);
      const result: number[][] = [];
      let cur: number[] = [];
      let used = 0;
      blocks.forEach((_, i) => {
        const bh = (h[i] || 0) + (i > 0 ? 18 : 0); // 블록 간 여백 보정
        if (used > 0 && used + bh > USABLE_H) { result.push(cur); cur = []; used = 0; }
        cur.push(i);
        used += bh;
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
    <div className="estimate-paper-root" ref={rootRef}>
      <div className="flex items-center justify-between bg-slate-800 text-white rounded-xl px-4 sm:px-6 py-4 mb-5 no-print">
        {onClose ? <button onClick={onClose} className="text-sm hover:text-slate-200 transition">← 돌아가기</button> : <span className="w-12" />}
        <span className="text-sm font-medium hidden sm:inline">견적서 미리보기 · {pages.length}p</span>
        <button onClick={() => window.print()} className="bg-white text-slate-800 px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition">🖨 인쇄</button>
      </div>

      <div className="paper-stack flex flex-col items-center gap-6">
        {pages.map((pageUnits, pi) => (
          <div key={pi} className="a4-sheet bg-white text-slate-800 shadow-lg relative"
            style={{ width: PAGE_W, minHeight: PAGE_H, padding: PAD, fontFamily: "'Pretendard', sans-serif", zoom: scale }}>
            <div>{pageUnits.map((bi) => <div key={bi}>{blocks[bi]}</div>)}</div>
            <div className="paper-pageno absolute left-0 right-0 text-center text-[11px] text-slate-400" style={{ bottom: 18 }}>{pi + 1} / {pages.length}</div>
          </div>
        ))}
      </div>

      {/* 측정용 숨김 컨테이너 */}
      <div ref={measureRef} aria-hidden className="no-print"
        style={{ position: 'absolute', left: -99999, top: 0, width: PAGE_W - PAD * 2, visibility: 'hidden', fontFamily: "'Pretendard', sans-serif" }}>
        {blocks.map((b, i) => <div key={i}>{b}</div>)}
      </div>
    </div>
  );
}

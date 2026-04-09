'use client';

import type { EstimateItem, CompanyInfo } from '@/types/checklist';

interface PrintEstimateProps {
  project: { name?: string; clientPhone?: string } | null;
  estimate: {
    items: EstimateItem[];
    discount: number;
    vatRate: number;
    includeVat: boolean;
    notes: string;
  };
  companyInfo: CompanyInfo;
  materialTotal: number;
  laborTotal: number;
  miscRate: number;
  miscAmount: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  categoryOrder?: string[] | null;
  onClose: () => void;
}

export function PrintEstimate({ project, estimate, companyInfo, materialTotal, laborTotal, miscRate, miscAmount, subtotal, vatAmount, total, categoryOrder, onClose }: PrintEstimateProps) {
  // 카테고리 매핑 (데이터용 → 표시용)
  const categoryDisplayMap: Record<string, string> = {
    '철거': '철거 시공',
    '창호': '창호 시공',
    '목공': '목공 시공',
    '전기': '전기·조명 시공',
    '조명': '전기·조명 시공',
    '필름': '필름 시공',
    '타일': '타일 시공',
    '탄성': '탄성코트 시공',
    '바닥재': '바닥재 시공',
    '도배': '도배 시공',
    '가구': '가구 시공',
    '철물': '철물 시공',
    '욕실': '욕실 시공',
    '설비': '설비 시공',
    '마감': '마감 공사',
    '기타': '기타',
  };

  // 공종별 그룹핑 (표시용 카테고리로)
  const groupedItems = estimate.items.reduce((acc, item) => {
    const displayCategory = categoryDisplayMap[item.category] || item.category;
    if (!acc[displayCategory]) acc[displayCategory] = [];
    acc[displayCategory].push(item);
    return acc;
  }, {} as Record<string, EstimateItem[]>);

  // 표시 순서: categoryOrder가 있으면 원본 카테고리 기준으로 정렬 (매핑 전 이름)
  const defaultDisplayOrder = ['철거 시공', '창호 시공', '목공 시공', '전기·조명 시공', '필름 시공', '타일 시공', '탄성코트 시공', '바닥재 시공', '도배 시공', '가구 시공', '철물 시공', '욕실 시공', '설비 시공', '마감 공사', '기타'];

  // categoryOrder는 원본 카테고리명 기준이므로, displayCategory로 매핑 후 정렬
  const sortedCategories = (() => {
    const allDisplayCats = Object.keys(groupedItems);
    if (categoryOrder && categoryOrder.length > 0) {
      // categoryOrder의 각 항목을 displayCategory로 매핑
      const orderMapped = categoryOrder.map(c => categoryDisplayMap[c] || c);
      return allDisplayCats.sort((a, b) => {
        const aIdx = orderMapped.indexOf(a);
        const bIdx = orderMapped.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }
    return allDisplayCats.sort((a, b) => {
      const aIdx = defaultDisplayOrder.indexOf(a);
      const bIdx = defaultDisplayOrder.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  })();

  let globalIdx = 0;

  return (
    <div className="space-y-0 print-area max-w-[800px] mx-auto">
      {/* 액션 바 */}
      <div className="flex items-center justify-between bg-slate-800 text-white rounded-xl px-6 py-4 mb-6 print:hidden">
        <button onClick={onClose} className="flex items-center gap-2 text-sm hover:text-slate-300 transition">← 돌아가기</button>
        <span className="text-sm font-medium">견적서 미리보기</span>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-white text-slate-800 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition">🖨 인쇄하기</button>
      </div>

      {/* 견적서 본문 */}
      <div className="bg-white text-slate-800 px-6 sm:px-10 py-8 text-[11px] sm:text-sm leading-relaxed print:text-[11px]" style={{ fontFamily: "'Pretendard', sans-serif" }}>

        {/* 헤더: 로고 + 타이틀 + 날짜 */}
        <div className="flex items-end justify-between mb-8 pb-5 border-b-2 border-slate-800">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SOMSSI" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-2xl sm:text-3xl print:text-2xl font-black tracking-wider text-slate-800">견 적 서</h1>
              <p className="text-xs sm:text-sm print:text-xs text-slate-400 tracking-widest mt-0.5">SOMSSI INTERIOR ESTIMATE</p>
            </div>
          </div>
          <div className="text-right text-xs sm:text-sm print:text-xs text-slate-500">
            <p>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* 상단 정보: 2단 레이아웃 */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-xs sm:text-sm print:text-xs">
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">현장 정보</p>
            <div className="space-y-1.5">
              <div className="flex"><span className="w-14 text-slate-400 shrink-0">현장명</span><span className="font-semibold">{project?.name || '-'}</span></div>
              <div className="flex"><span className="w-14 text-slate-400 shrink-0">연락처</span><span>{project?.clientPhone || '-'}</span></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">공급자</p>
            <div className="space-y-1.5">
              <div className="flex"><span className="w-20 text-slate-400 shrink-0">업체명</span><span className="font-semibold">솜씨인테리어</span></div>
              {companyInfo.ceoName && <div className="flex"><span className="w-20 text-slate-400 shrink-0">대표자</span><span>{companyInfo.ceoName}</span></div>}
              {companyInfo.bizNumber && <div className="flex"><span className="w-20 text-slate-400 shrink-0">사업자번호</span><span>{companyInfo.bizNumber}</span></div>}
              {companyInfo.address && <div className="flex"><span className="w-20 text-slate-400 shrink-0">주소</span><span>{companyInfo.address}</span></div>}
            </div>
          </div>
        </div>

        {/* 공종별 내역 */}
        {sortedCategories.map((category) => {
          const items = groupedItems[category];
          const catMaterial = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
          const catLabor = items.reduce((s, i) => s + (i.labor || []).reduce((sum, l) => sum + l.days * l.dayRate, 0), 0);

          return (
            <div key={category} className="mb-5 break-inside-avoid">
              {/* 공종 헤더 */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm sm:text-base print:text-sm text-slate-800">{category}</span>
                <div className="flex-1 border-b border-slate-200" />
                <span className="text-[10px] sm:text-xs print:text-[10px] text-slate-400">{items.length}건</span>
              </div>

              {/* 테이블 */}
              <table className="w-full border-collapse text-[10.5px] sm:text-xs print:text-[10.5px]">
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th className="px-2 py-2 text-center w-7 text-[10px] sm:text-xs print:text-[10px] font-semibold text-slate-400 border-b-2 border-slate-200">NO</th>
                    <th className="px-2 py-2 text-left text-[10px] sm:text-xs print:text-[10px] font-semibold text-slate-400 border-b-2 border-slate-200">항목명</th>
                    <th className="px-2 py-2 text-center w-10 text-[10px] sm:text-xs print:text-[10px] font-semibold text-slate-400 border-b-2 border-slate-200">단위</th>
                    <th className="px-2 py-2 text-center w-10 text-[10px] sm:text-xs print:text-[10px] font-semibold text-slate-400 border-b-2 border-slate-200">수량</th>
                    <th className="px-2 py-2 text-right w-16 text-[10px] sm:text-xs print:text-[10px] font-semibold text-slate-400 border-b-2 border-slate-200">단가</th>
                    <th className="px-2 py-2 text-right w-20 text-[10px] sm:text-xs print:text-[10px] font-semibold text-slate-400 border-b-2 border-slate-200">자재비</th>
                    <th className="px-2 py-2 text-right w-20 text-[10px] sm:text-xs print:text-[10px] font-semibold text-slate-400 border-b-2 border-slate-200">인건비</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    globalIdx++;
                    const itemLabor = (item.labor || []).reduce((s, l) => s + l.days * l.dayRate, 0);
                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-2 py-2 text-center text-[10px] sm:text-xs print:text-[10px] text-slate-400">{globalIdx}</td>
                        <td className="px-2 py-2 font-medium text-slate-700 text-[10px] sm:text-xs print:text-[10px]">
                          {item.name || '-'}
                          {item.note && <span className="text-[9px] sm:text-[10px] print:text-[9px] text-slate-400 ml-1">({item.note})</span>}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-500 text-[10px] sm:text-xs print:text-[10px]">{item.unit}</td>
                        <td className="px-2 py-2 text-center text-slate-700 font-medium text-[10px] sm:text-xs print:text-[10px]">{item.quantity}</td>
                        <td className="px-2 py-2 text-right text-slate-500 text-[10px] sm:text-xs print:text-[10px]">{item.unitPrice.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-medium text-[10px] sm:text-xs print:text-[10px]">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-medium text-[10px] sm:text-xs print:text-[10px]">{itemLabor > 0 ? itemLabor.toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <td colSpan={5} className="px-2 py-2 text-right font-bold text-slate-500 text-[10px] sm:text-xs print:text-[10px] border-t-2 border-slate-200">{category} 소계</td>
                    <td className="px-2 py-2 text-right font-bold text-[10px] sm:text-xs print:text-[10px] border-t-2 border-slate-200">{catMaterial.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right font-bold text-[10px] sm:text-xs print:text-[10px] border-t-2 border-slate-200">{catLabor.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        {/* 합계 요약 */}
        <div className="mt-6 mb-6 flex justify-end break-inside-avoid">
          <div className="w-64 space-y-0 text-xs sm:text-sm print:text-xs">
            {miscRate > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs sm:text-sm print:text-xs">
                <span className="text-slate-500">공과잡비 ({miscRate}%)</span>
                <span className="font-medium">{miscAmount.toLocaleString()}원</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs sm:text-sm print:text-xs">
              <span className="text-slate-500">공급가액</span>
              <span className="font-medium">{subtotal.toLocaleString()}원</span>
            </div>
            {estimate.includeVat !== false && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs sm:text-sm print:text-xs">
                <span className="text-slate-500">부가세 ({estimate.vatRate ?? 10}%)</span>
                <span className="font-medium">{vatAmount.toLocaleString()}원</span>
              </div>
            )}
            {estimate.discount > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs sm:text-sm print:text-xs text-red-500">
                <span>할인</span>
                <span className="font-medium">-{estimate.discount.toLocaleString()}원</span>
              </div>
            )}
            <div className="flex justify-between py-2.5 text-sm sm:text-base print:text-sm font-black border-t-2 border-slate-800 mt-1">
              <span>총 견적금액</span>
              <span>{total.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 특이사항 */}
        <div className="mb-8 break-inside-avoid">
          <p className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">특이사항</p>
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs sm:text-sm print:text-xs text-slate-600 leading-[1.8] whitespace-pre-wrap" style={{ backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {estimate.notes && <>{estimate.notes}{'\n\n'}</>}
            <span className="text-slate-500">※ 견적 외 추가공사는 별도 협의 후 진행됩니다.{'\n'}※ 하자 발생 시 신의성실하게 보수합니다. (단, 정상적 노후 및 고객 부주의에 의한 것은 제외){'\n'}※ 부가세 {estimate.includeVat !== false ? '포함' : '별도'}{'\n'}※ 대금지불조건: 계약금 50% / 잔금 50%{'\n'}※ 본 견적서는 발행일로부터 30일간 유효합니다.{'\n'}※ 현장 확인 후 공사금액이 변동될 수 있습니다.</span>
          </div>
        </div>

        {/* 하단: 서명 영역 */}
        <div className="mt-10 pt-6 border-t border-slate-200 break-inside-avoid">
          <div className="flex justify-between items-end">
            <div className="text-[10px] sm:text-xs print:text-[10px] text-slate-400 leading-relaxed">
              <p>위 금액으로 견적합니다.</p>
            </div>
            <div className="text-center">
              <div className="relative w-24 h-24 border border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-2">
                <img src="/stamp.png" alt="직인" className="w-20 h-20 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <p className="text-[10px] sm:text-xs print:text-[10px] text-slate-400">솜씨인테리어</p>
            </div>
          </div>
        </div>

      </div>

      {/* 하단 액션 */}
      <div className="flex items-center justify-center gap-4 mt-6 print:hidden">
        <button onClick={onClose} className="px-6 py-3 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50 transition">← 돌아가기</button>
        <button onClick={() => window.print()} className="px-6 py-3 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition">🖨 인쇄하기</button>
      </div>
    </div>
  );
}

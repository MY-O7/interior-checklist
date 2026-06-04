'use client';

import { useEffect, useState } from 'react';
import { PrintEstimate } from '@/components/estimate/print-estimate';
import type { EstimateItem, CompanyInfo } from '@/types/checklist';

interface ShareData {
  projectName: string;
  items: EstimateItem[];
  discount: number;
  vatRate: number;
  includeVat: boolean;
  notes: string;
  categoryOrder: string[] | null;
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${params.token}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, [params.token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-6 text-center">
        <div>
          <p className="text-lg font-bold text-slate-700">유효하지 않은 링크입니다</p>
          <p className="text-sm text-slate-500 mt-2">링크가 만료되었거나 잘못되었습니다.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">견적서를 불러오는 중...</p>
      </div>
    );
  }

  // 합계 계산 (견적 페이지와 동일한 공식. miscRate는 DB에 저장되지 않으므로 0)
  const materialTotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const laborTotal = data.items.reduce(
    (s, i) => s + (i.labor || []).reduce((sum, l) => sum + l.days * l.dayRate, 0),
    0
  );
  const itemsSubtotal = materialTotal + laborTotal;
  const miscRate = 0;
  const miscAmount = 0;
  const subtotal = itemsSubtotal + miscAmount;
  const vatAmount = data.includeVat ? Math.round(subtotal * (data.vatRate || 10) / 100) : 0;
  const total = subtotal + vatAmount - data.discount;

  const companyInfo: CompanyInfo = { ceoName: '', bizNumber: '', address: '' };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6">
      <PrintEstimate
        project={{ name: data.projectName }}
        estimate={{
          items: data.items,
          discount: data.discount,
          vatRate: data.vatRate,
          includeVat: data.includeVat,
          notes: data.notes,
        }}
        companyInfo={companyInfo}
        materialTotal={materialTotal}
        laborTotal={laborTotal}
        miscRate={miscRate}
        miscAmount={miscAmount}
        subtotal={subtotal}
        vatAmount={vatAmount}
        total={total}
        categoryOrder={data.categoryOrder}
      />
    </div>
  );
}

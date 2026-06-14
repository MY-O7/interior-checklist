'use client';

import { Document, Page, View, Text, Image, Font, StyleSheet } from '@react-pdf/renderer';
import type { EstimateItem, CompanyInfo } from '@/types/checklist';

// 한글 폰트 임베드 — 모든 기기에서 동일하게 렌더되도록 정적 TTF 사용
Font.register({
  family: 'Nanum',
  fonts: [
    { src: '/fonts/NanumGothic-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NanumGothic-Bold.ttf', fontWeight: 'bold' },
  ],
});
// 줄바꿈이 한글에서 끊기지 않도록
Font.registerHyphenationCallback((word) => [word]);

const won = (n: number) => n.toLocaleString('ko-KR');

const C = {
  ink: '#1f2a24',
  sub: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  lineSoft: '#f1f5f9',
  headerBg: '#f8fafc',
  brand: '#2f7d5f',
  red: '#dc2626',
};

const s = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 40, paddingHorizontal: 34, fontFamily: 'Nanum', fontSize: 9, color: C.ink, lineHeight: 1.4 },
  // 헤더
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: C.ink, paddingBottom: 12, marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 36, height: 36, objectFit: 'contain', marginRight: 12 },
  title: { fontSize: 22, fontWeight: 'bold', letterSpacing: 4, color: C.ink },
  subtitle: { fontSize: 8, color: C.faint, letterSpacing: 2, marginTop: 2 },
  dateText: { fontSize: 9, color: C.sub },
  // 정보 2단
  infoRow: { flexDirection: 'row', marginBottom: 18 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 8, fontWeight: 'bold', color: C.faint, letterSpacing: 2, marginBottom: 6 },
  infoLine: { flexDirection: 'row', marginBottom: 3 },
  infoKey: { width: 60, color: C.faint },
  infoVal: { flex: 1 },
  // 공종
  catBlock: { marginBottom: 14 },
  catHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  catName: { fontSize: 11, fontWeight: 'bold', color: C.ink },
  catRule: { flex: 1, borderBottomWidth: 1, borderBottomColor: C.line, marginHorizontal: 6, marginBottom: 2 },
  catCount: { fontSize: 8, color: C.faint },
  // 표
  th: { flexDirection: 'row', backgroundColor: C.headerBg, borderBottomWidth: 1.5, borderBottomColor: C.line },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.lineSoft },
  tfoot: { flexDirection: 'row', backgroundColor: C.headerBg, borderTopWidth: 1.5, borderTopColor: C.line },
  cell: { paddingVertical: 5, paddingHorizontal: 4 },
  cNo: { width: 26, textAlign: 'center', color: C.faint },
  cName: { flex: 1, color: '#334155' },
  cUnit: { width: 34, textAlign: 'center', color: C.sub },
  cQty: { width: 34, textAlign: 'center', color: '#334155' },
  cPrice: { width: 64, textAlign: 'right', color: C.sub },
  cMat: { width: 74, textAlign: 'right' },
  cLabor: { width: 74, textAlign: 'right' },
  thText: { fontSize: 8, fontWeight: 'bold', color: C.faint },
  note: { fontSize: 8, color: C.faint },
  // 합계
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, marginBottom: 14 },
  totalsBox: { width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.lineSoft },
  totalKey: { color: C.sub },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 2, borderTopColor: C.ink, marginTop: 2 },
  grandText: { fontSize: 12, fontWeight: 'bold' },
  // 특이사항
  notesLabel: { fontSize: 8, fontWeight: 'bold', color: C.faint, letterSpacing: 2, marginBottom: 5 },
  notesBox: { backgroundColor: C.headerBg, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: C.sub, lineHeight: 1.7 },
  // 서명
  signWrap: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  stampBox: { width: 80, height: 80, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stamp: { width: 66, height: 66, objectFit: 'contain' },
});

const CATEGORY_DISPLAY: Record<string, string> = {
  '철거': '철거 시공', '창호': '창호 시공', '목공': '목공 시공', '전기': '전기·조명 시공',
  '조명': '전기·조명 시공', '필름': '필름 시공', '타일': '타일 시공', '탄성': '탄성코트 시공',
  '바닥재': '바닥재 시공', '도배': '도배 시공', '가구': '가구 시공', '철물': '철물 시공',
  '욕실': '욕실 시공', '설비': '설비 시공', '마감': '마감 공사', '기타': '기타',
};
const DEFAULT_ORDER = ['철거 시공', '창호 시공', '목공 시공', '전기·조명 시공', '필름 시공', '타일 시공', '탄성코트 시공', '바닥재 시공', '도배 시공', '가구 시공', '철물 시공', '욕실 시공', '설비 시공', '마감 공사', '기타'];

export interface EstimatePdfProps {
  project: { name?: string; clientPhone?: string } | null;
  estimate: { items: EstimateItem[]; discount: number; vatRate: number; includeVat: boolean; notes: string };
  companyInfo: CompanyInfo;
  miscRate: number; miscAmount: number; subtotal: number; vatAmount: number; total: number;
  categoryOrder?: string[] | null;
  origin: string; // 절대 URL 기반 (폰트/이미지 fetch용)
}

export function EstimatePdfDocument(props: EstimatePdfProps) {
  const { project, estimate, companyInfo, miscRate, miscAmount, subtotal, vatAmount, total, categoryOrder, origin } = props;

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
  let no = 0;

  return (
    <Document title={`견적서 - ${project?.name || ''}`}>
      <Page size="A4" style={s.page}>
        {/* 헤더 */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Image style={s.logo} src={`${origin}/logo.png`} />
            <View>
              <Text style={s.title}>견 적 서</Text>
              <Text style={s.subtitle}>SOMSSI INTERIOR ESTIMATE</Text>
            </View>
          </View>
          <Text style={s.dateText}>{dateStr}</Text>
        </View>

        {/* 정보 2단 */}
        <View style={s.infoRow}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>현장 정보</Text>
            <View style={s.infoLine}><Text style={s.infoKey}>현장명</Text><Text style={s.infoVal}>{project?.name || '-'}</Text></View>
            <View style={s.infoLine}><Text style={s.infoKey}>연락처</Text><Text style={s.infoVal}>{project?.clientPhone || '-'}</Text></View>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>공급자</Text>
            <View style={s.infoLine}><Text style={s.infoKey}>업체명</Text><Text style={s.infoVal}>솜씨인테리어</Text></View>
            {!!companyInfo.ceoName && <View style={s.infoLine}><Text style={s.infoKey}>대표자</Text><Text style={s.infoVal}>{companyInfo.ceoName}</Text></View>}
            {!!companyInfo.bizNumber && <View style={s.infoLine}><Text style={s.infoKey}>사업자번호</Text><Text style={s.infoVal}>{companyInfo.bizNumber}</Text></View>}
            {!!companyInfo.address && <View style={s.infoLine}><Text style={s.infoKey}>주소</Text><Text style={s.infoVal}>{companyInfo.address}</Text></View>}
          </View>
        </View>

        {/* 공종별 내역 — 각 공종은 페이지 경계에서 쪼개지지 않게 wrap=false */}
        {cats.map((cat) => {
          const items = grouped[cat];
          const catMat = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
          const catLab = items.reduce((sum, i) => sum + (i.labor || []).reduce((x, l) => x + l.days * l.dayRate, 0), 0);
          return (
            <View key={cat} style={s.catBlock} wrap={false}>
              <View style={s.catHead}>
                <Text style={s.catName}>{cat}</Text>
                <View style={s.catRule} />
                <Text style={s.catCount}>{items.length}건</Text>
              </View>
              <View style={s.th}>
                <Text style={[s.cell, s.cNo, s.thText]}>NO</Text>
                <Text style={[s.cell, s.cName, s.thText]}>항목명</Text>
                <Text style={[s.cell, s.cUnit, s.thText]}>단위</Text>
                <Text style={[s.cell, s.cQty, s.thText]}>수량</Text>
                <Text style={[s.cell, s.cPrice, s.thText]}>단가</Text>
                <Text style={[s.cell, s.cMat, s.thText]}>자재비</Text>
                <Text style={[s.cell, s.cLabor, s.thText]}>인건비</Text>
              </View>
              {items.map((item) => {
                no++;
                const lab = (item.labor || []).reduce((x, l) => x + l.days * l.dayRate, 0);
                return (
                  <View key={item.id} style={s.tr} wrap={false}>
                    <Text style={[s.cell, s.cNo]}>{no}</Text>
                    <Text style={[s.cell, s.cName]}>{item.name || '-'}{item.note ? <Text style={s.note}>  ({item.note})</Text> : ''}</Text>
                    <Text style={[s.cell, s.cUnit]}>{item.unit}</Text>
                    <Text style={[s.cell, s.cQty]}>{item.quantity}</Text>
                    <Text style={[s.cell, s.cPrice]}>{won(item.unitPrice)}</Text>
                    <Text style={[s.cell, s.cMat]}>{won(item.quantity * item.unitPrice)}</Text>
                    <Text style={[s.cell, s.cLabor]}>{lab > 0 ? won(lab) : '-'}</Text>
                  </View>
                );
              })}
              <View style={s.tfoot}>
                <Text style={[s.cell, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: C.sub }]}>{cat} 소계</Text>
                <Text style={[s.cell, s.cMat, { fontWeight: 'bold' }]}>{won(catMat)}</Text>
                <Text style={[s.cell, s.cLabor, { fontWeight: 'bold' }]}>{won(catLab)}</Text>
              </View>
            </View>
          );
        })}

        {/* 합계 */}
        <View style={s.totalsWrap} wrap={false}>
          <View style={s.totalsBox}>
            {miscRate > 0 && (
              <View style={s.totalRow}><Text style={s.totalKey}>공과잡비 ({miscRate}%)</Text><Text>{won(miscAmount)}원</Text></View>
            )}
            <View style={s.totalRow}><Text style={s.totalKey}>공급가액</Text><Text>{won(subtotal)}원</Text></View>
            {estimate.includeVat !== false && (
              <View style={s.totalRow}><Text style={s.totalKey}>부가세 ({estimate.vatRate ?? 10}%)</Text><Text>{won(vatAmount)}원</Text></View>
            )}
            {estimate.discount > 0 && (
              <View style={s.totalRow}><Text style={{ color: C.red }}>할인</Text><Text style={{ color: C.red }}>-{won(estimate.discount)}원</Text></View>
            )}
            <View style={s.grandRow}><Text style={s.grandText}>총 견적금액</Text><Text style={s.grandText}>{won(total)}원</Text></View>
          </View>
        </View>

        {/* 특이사항 */}
        <View wrap={false}>
          <Text style={s.notesLabel}>특이사항</Text>
          <View style={s.notesBox}>
            {!!estimate.notes && <Text style={{ color: C.ink, marginBottom: 8 }}>{estimate.notes}</Text>}
            <Text>※ 견적 외 추가공사는 별도 협의 후 진행됩니다.</Text>
            <Text>※ 하자 발생 시 신의성실하게 보수합니다. (단, 정상적 노후 및 고객 부주의에 의한 것은 제외)</Text>
            <Text>※ 부가세 {estimate.includeVat !== false ? '포함' : '별도'}</Text>
            <Text>※ 대금지불조건: 계약금 50% / 잔금 50%</Text>
            <Text>※ 본 견적서는 발행일로부터 30일간 유효합니다.</Text>
            <Text>※ 현장 확인 후 공사금액이 변동될 수 있습니다.</Text>
          </View>
        </View>

        {/* 서명 */}
        <View style={s.signWrap} wrap={false}>
          <Text style={{ color: C.faint }}>위 금액으로 견적합니다.</Text>
          <View style={{ alignItems: 'center' }}>
            <View style={s.stampBox}><Image style={s.stamp} src={`${origin}/stamp.png`} /></View>
            <Text style={{ fontSize: 8, color: C.faint }}>솜씨인테리어</Text>
          </View>
        </View>

        {/* 페이지 번호 */}
        <Text style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: C.faint }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

// ═══════════════════ 견적서 프리셋 ═══════════════════

export const CATEGORIES = ['철거 시공', '창호 시공', '목공 시공', '전기·조명 시공', '필름 시공', '타일 시공', '탄성코트 시공', '바닥재 시공', '도배 시공', '가구 시공', '철물 시공', '욕실 시공', '설비 시공', '마감 공사', '기타'];

// 프리셋용 내부 카테고리 (화면 표시용)
export const PRESET_CATEGORIES = ['바닥재', '타일', '필름', '도배', '욕실', '목공', '전기', '조명', '가구', '기타', '마감'];

export const ESTIMATE_PRESETS = [
  { category: '바닥재', name: '강마루 (평당)', unit: '평', unitPrice: 80000 },
  { category: '바닥재', name: '합판마루 (평당)', unit: '평', unitPrice: 120000 },
  { category: '바닥재', name: '원목마루 (평당)', unit: '평', unitPrice: 200000 },
  { category: '바닥재', name: '장판 (평당)', unit: '평', unitPrice: 30000 },
  { category: '타일', name: '포세린 600x600', unit: '평', unitPrice: 100000 },
  { category: '타일', name: '포세린 1200x600', unit: '평', unitPrice: 130000 },
  { category: '필름', name: '필름 시공', unit: '평', unitPrice: 50000 },
  { category: '도배', name: '합지 도배', unit: '평', unitPrice: 25000 },
  { category: '도배', name: '실크 도배', unit: '평', unitPrice: 40000 },
  { category: '욕실', name: '화장실 올철거', unit: '실', unitPrice: 2000000 },
  { category: '욕실', name: 'UBR 철거', unit: '실', unitPrice: 800000 },
  { category: '욕실', name: '화장실 덧방', unit: '실', unitPrice: 1500000 },
  { category: '욕실', name: '젠다이 시공', unit: '개', unitPrice: 300000 },
  { category: '욕실', name: '욕조 설치', unit: '개', unitPrice: 500000 },
  { category: '욕실', name: '샤워부스', unit: '개', unitPrice: 400000 },
  { category: '목공', name: '에어컨 단내림', unit: '개', unitPrice: 200000 },
  { category: '목공', name: '천장 평탄화', unit: '평', unitPrice: 50000 },
  { category: '목공', name: '문 교체', unit: '개', unitPrice: 300000 },
  { category: '목공', name: '스텝도어', unit: '개', unitPrice: 800000 },
  { category: '목공', name: '히든도어', unit: '개', unitPrice: 1200000 },
  { category: '전기', name: '콘센트 추가', unit: '개', unitPrice: 50000 },
  { category: '전기', name: '일괄 소등', unit: '식', unitPrice: 200000 },
  { category: '조명', name: '다운라이트', unit: '개', unitPrice: 40000 },
  { category: '조명', name: '실링팬', unit: '개', unitPrice: 300000 },
  { category: '가구', name: '신발장', unit: '개', unitPrice: 500000 },
  { category: '가구', name: '붙박이장', unit: '개', unitPrice: 2000000 },
  { category: '기타', name: '번호키', unit: '개', unitPrice: 200000 },
  { category: '기타', name: '입주 청소', unit: '건', unitPrice: 300000 },
  { category: '마감', name: 'EV 보양 / 입주민 동의서', unit: '건', unitPrice: 350000 },
  { category: '마감', name: '폐자재 반출', unit: '건', unitPrice: 300000 },
  { category: '기타', name: '엘리베이터 사용료', unit: '건', unitPrice: 0 },
];

// ═══════════════════ 체크리스트 → 견적 매핑 ═══════════════════

export const CHECKLIST_TO_ESTIMATE: Record<string, { category: string; name: string; unit: string; unitPrice: number }> = {
  // 바닥재 (flooring)
  'flooring-마루 시공:강마루': { category: '바닥재', name: '강마루', unit: '평', unitPrice: 80000 },
  'flooring-마루 시공:합판마루': { category: '바닥재', name: '합판마루', unit: '평', unitPrice: 120000 },
  'flooring-마루 시공:원목마루': { category: '바닥재', name: '원목마루', unit: '평', unitPrice: 200000 },
  'flooring-타일 시공': { category: '타일', name: '타일 시공 (바닥)', unit: '평', unitPrice: 100000 },
  'flooring-장판 시공': { category: '바닥재', name: '장판', unit: '평', unitPrice: 30000 },
  'flooring-데코타일 시공': { category: '바닥재', name: '데코타일', unit: '평', unitPrice: 50000 },
  // 철거 (demolition)
  'demolition-바닥 철거': { category: '철거', name: '바닥 철거', unit: '평', unitPrice: 20000 },
  'demolition-내부 철거': { category: '철거', name: '내부 철거', unit: '식', unitPrice: 500000 },
  // 목공 (carpentry)
  'carpentry-에어컨 단내림': { category: '목공', name: '에어컨 단내림', unit: '개', unitPrice: 200000 },
  'carpentry-천장 평탄화': { category: '목공', name: '천장 평탄화', unit: '평', unitPrice: 50000 },
  'carpentry-아트월 마감': { category: '목공', name: '아트월 마감', unit: '식', unitPrice: 500000 },
  'carpentry-문 / 문틀:일반문': { category: '목공', name: '일반문 교체', unit: '개', unitPrice: 300000 },
  'carpentry-문 / 문틀:스텝도어': { category: '목공', name: '스텝도어', unit: '개', unitPrice: 800000 },
  'carpentry-문 / 문틀:히든도어': { category: '목공', name: '히든도어', unit: '개', unitPrice: 1200000 },
  'carpentry-문 / 문틀:폴딩도어': { category: '목공', name: '폴딩도어 (목공)', unit: '개', unitPrice: 600000 },
  'carpentry-문선 / 몰딩': { category: '목공', name: '문선 / 몰딩', unit: '식', unitPrice: 150000 },
  // 전기/조명 (electrical)
  'electrical-스위치/콘센트': { category: '전기', name: '스위치/콘센트', unit: '식', unitPrice: 100000 },
  'electrical-배선 증설': { category: '전기', name: '배선 증설', unit: '식', unitPrice: 200000 },
  'electrical-조명 (기본)': { category: '조명', name: '조명 (기본)', unit: '식', unitPrice: 100000 },
  'electrical-조명 (하이엔드)': { category: '조명', name: '조명 (하이엔드)', unit: '식', unitPrice: 300000 },
  // 필름/도배 (film)
  'film-필름 시공': { category: '필름', name: '필름 시공', unit: '평', unitPrice: 50000 },
  'film-도배 시공': { category: '도배', name: '도배', unit: '평', unitPrice: 35000 },
  'film-도배 종류:합지': { category: '도배', name: '합지 도배', unit: '평', unitPrice: 25000 },
  'film-도배 종류:실크 (기본)': { category: '도배', name: '실크 도배', unit: '평', unitPrice: 40000 },
  'film-도배 종류:실크 프리미엄 (디아망 등)': { category: '도배', name: '실크 프리미엄 도배', unit: '평', unitPrice: 55000 },
  // 타일/탄성코트 (tile)
  'tile-타일 시공': { category: '타일', name: '타일 시공 (벽)', unit: '평', unitPrice: 100000 },
  'tile-탄성코트': { category: '마감', name: '탄성코트', unit: '평', unitPrice: 15000 },
  // 가구/창호 (furniture)
  'furniture-맞춤 가구': { category: '가구', name: '맞춤 가구', unit: '식', unitPrice: 1000000 },
  'furniture-시스템 에어컨': { category: '설비', name: '시스템 에어컨', unit: '대', unitPrice: 1500000 },
  'furniture-창호 (샷시)': { category: '창호', name: '창호 (샷시)', unit: '좌', unitPrice: 500000 },
  'furniture-폴딩도어': { category: '창호', name: '폴딩도어', unit: '개', unitPrice: 800000 },
  // 욕실 (bathroom)
  'bathroom-공용 화장실': { category: '욕실', name: '공용 화장실', unit: '식', unitPrice: 2000000 },
  'bathroom-안방 화장실': { category: '욕실', name: '안방 화장실', unit: '식', unitPrice: 2000000 },
  // 기타 마감 (finishing)
  'finishing-외부 실리콘': { category: '기타', name: '외부 실리콘', unit: '건', unitPrice: 100000 },
  'finishing-번호키 (도어락)': { category: '기타', name: '번호키', unit: '개', unitPrice: 200000 },
  'finishing-인터폰': { category: '기타', name: '인터폰', unit: '개', unitPrice: 150000 },
  'finishing-입주 청소': { category: '기타', name: '입주 청소', unit: '건', unitPrice: 300000 },
};

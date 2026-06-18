import type { Section } from '@/types/checklist';

export const DEFAULT_ROOMS = [
  '거실', '주방', '안방 1', '안방 2', '작은방 1', '작은방 2', '입구방 1', '입구방 2',
  '거실 발코니', '안방 발코니', '주방 발코니', '작은방 발코니',
  '공용 화장실', '안방 화장실',
];

export const SECTIONS: Section[] = [
  // 1. 방 사이즈 (맨 처음)
  { id: 'roomSize', title: '방 사이즈 (실측)', subtitle: 'Room Dimensions', items:
    DEFAULT_ROOMS.map(name => ({ name, hasMeasurement: true, measurementLabel: 'W×H' }))
  },
  
  // 2. 철거
  { id: 'demolition', title: '확장 및 철거 공사', subtitle: 'Expansion & Demolition', items: [
    { name: '확장 여부', options: ['기존 확장 유지', '신규 확장', '확장 없음'], optionColors: { '기존 확장 유지': 'green', '신규 확장': 'blue', '확장 없음': 'white' }, perRoom: true },
    { name: '바닥 철거', options: ['강마루', '강화마루', '장판', '데코타일', '타일'], optionColors: { '강마루': 'green', '강화마루': 'green', '장판': 'blue', '데코타일': 'yellow', '타일': 'pink' }, perRoom: true },
    { name: '내부 철거', options: ['아트월', '알판', '몰딩', '문·문틀', '등박스', '화단', '기타 구조물'], perRoom: true },
  ]},
  
  // 3. 창호 (가구 섹션에서 분리)
  { id: 'windows', title: '창호 공사', subtitle: 'Windows & Doors', items: [
    { name: '창호 (샷시)', options: ['KCC', 'LX하우시스'], perRoom: true, hasMeasurement: true, measurementLabel: 'W×H', showJwa: true },
    { name: '폴딩도어', options: ['일반바', '단열바', '유리 22mm', '터닝도어'], optionColors: { '일반바': 'green', '단열바': 'blue', '유리 22mm': 'yellow', '터닝도어': 'pink' }, hasMeasurement: true, measurementLabel: 'W×H', showJwa: true },
  ]},
  
  // 4. 욕실
  { id: 'bathroom', title: '욕실 공사', subtitle: 'Bathroom', items: [
    { name: '공용 화장실', subItems: [
      { name: '철거 방식', options: ['올철거 (방수 포함)', '덧방 시공'], optionColors: { '올철거 (방수 포함)': 'pink', '덧방 시공': 'blue' } },
      { name: '시공 항목', options: ['젠다이(조적)', '욕조', '파티션', '샤워부스', '환풍기(일반)', '환풍기(휴젠트)'], optionColors: { '젠다이(조적)': 'green', '욕조': 'blue', '파티션': 'green', '샤워부스': 'yellow', '환풍기(휴젠트)': 'pink' } },
      { name: '젠다이 사이즈', hasInput: true, placeholder: '젠다이 길이 (mm)' },
      { name: '화장실 장', hasInput: true, placeholder: '시스템장 규격 (mm)' },
    ]},
    { name: '안방 화장실', subItems: [
      { name: '철거 방식', options: ['올철거 (방수 포함)', '덧방 시공'], optionColors: { '올철거 (방수 포함)': 'pink', '덧방 시공': 'blue' } },
      { name: '시공 항목', options: ['젠다이(조적)', '욕조', '파티션', '샤워부스', '환풍기(일반)', '환풍기(휴젠트)'], optionColors: { '젠다이(조적)': 'green', '욕조': 'blue', '파티션': 'green', '샤워부스': 'yellow', '환풍기(휴젠트)': 'pink' } },
      { name: '젠다이 사이즈', hasInput: true, placeholder: '젠다이 길이 (mm)' },
      { name: '화장실 장', hasInput: true, placeholder: '시스템장 규격 (mm)' },
    ]},
  ]},
  
  // 5. 설비
  { id: 'equipment', title: '설비 공사', subtitle: 'Equipment', items: [
    { name: '보일러', options: ['조절기 교체', '구동기 교체'], hasInput: true, placeholder: '브랜드' },
    { name: '시스템 에어컨', perRoom: true, hasMeasurement: true, measurementLabel: '대' },
  ]},
  
  // 6. 목공
  { id: 'carpentry', title: '목공 공사', subtitle: 'Carpentry', items: [
    { name: '에어컨 단내림', perRoom: true },
    { name: '천장 평탄화', perRoom: true, hasInput: true, placeholder: '각 방별 천장 목공' },
    { name: '아트월 마감', options: ['목공 마감', '필름 마감', '타일 마감'], optionColors: { '목공 마감': 'green', '필름 마감': 'blue', '타일 마감': 'yellow' } },
    { name: '문 / 문틀', options: ['일반문', '스텝도어', '히든도어', '폴딩도어'], optionColors: { '일반문': 'green', '스텝도어': 'blue', '히든도어': 'pink', '폴딩도어': 'yellow' }, badge: 'high' as const, perRoom: true, hasMeasurement: true, measurementLabel: 'W×H' },
    { name: '문선 / 몰딩', options: ['9mm 문선', '12mm 문선', '무몰딩', '일반 몰딩', '걸레받이'], optionColors: { '9mm 문선': 'green', '12mm 문선': 'blue', '무몰딩': 'yellow', '걸레받이': 'pink' } },
  ]},
  
  // 7. 전기
  { id: 'electrical', title: '전기 공사', subtitle: 'Electrical', items: [
    { name: '스위치/콘센트', options: ['국내 일반형', '해외 브랜드', '유럽형(융 등)', '일괄 소단 추가'], optionColors: { '국내 일반형': 'green', '해외 브랜드': 'blue', '유럽형(융 등)': 'pink', '일괄 소단 추가': 'yellow' } },
    { name: '배선 증설', options: ['에어컨 전용 라인', '인덕션 단독 라인', '전선 증설', '콘센트 신설·이동'], optionColors: { '에어컨 전용 라인': 'green', '인덕션 단독 라인': 'blue', '전선 증설': 'yellow' } },
  ]},
  
  // 8. 조명
  { id: 'lighting', title: '조명 공사', subtitle: 'Lighting', items: [
    { name: '조명 (기본)', options: ['메인등', '다운라이트(매립등)', '간접조명', '커튼박스 T5'], optionColors: { '메인등': 'green', '다운라이트(매립등)': 'blue', '간접조명': 'yellow' }, perRoom: true },
    { name: '조명 (하이엔드)', options: ['마그네틱 레일', '라인 조명', '사각 그릴라이트', '실링팬'], optionColors: { '마그네틱 레일': 'pink', '라인 조명': 'pink', '사각 그릴라이트': 'pink', '실링팬': 'pink' }, badge: 'high' as const, perRoom: true },
  ]},
  
  // 9. 필름
  { id: 'film', title: '필름 공사', subtitle: 'Film', items: [
    { name: '필름 시공', perRoom: true, hasInput: true, placeholder: '브랜드 및 모델명' },
    { name: '필름 부위', options: ['벽', '천장', '가구', '가구 손잡이', '현관'] },
  ]},
  
  // 10. 타일
  { id: 'tile', title: '타일 공사', subtitle: 'Tile', items: [
    { name: '타일 시공', options: ['600×600', '1200×600', '600×1200'], optionColors: { '600×600': 'green', '1200×600': 'blue', '600×1200': 'yellow' }, hasInput: true, placeholder: '자재 모델명', perRoom: true, hasMeasurement: true, measurementLabel: '평' },
  ]},
  
  // 11. 탄성 (페인트)
  { id: 'elastic', title: '탄성코트 / 페인트', subtitle: 'Elastic Coat & Paint', items: [
    { name: '탄성코트', perRoom: true, hasMeasurement: true, measurementLabel: '평' },
  ]},
  
  // 12. 바닥재
  { id: 'flooring', title: '바닥재 시공', subtitle: 'Flooring', items: [
    { name: '마루 시공', options: ['강마루', '합판마루', '원목마루'], optionColors: { '강마루': 'green', '합판마루': 'blue', '원목마루': 'pink' }, perRoom: true, hasMeasurement: true, measurementLabel: 'W×H' },
    { name: '타일 시공', options: ['포세린 600×600', '1200×600', '600×1200'], optionColors: { '포세린 600×600': 'green', '1200×600': 'blue', '600×1200': 'yellow' }, perRoom: true, hasMeasurement: true, measurementLabel: 'W×H' },
    { name: '장판 시공', options: ['1.8T', '2.5T', '3.0T'], optionColors: { '1.8T': 'green', '2.5T': 'blue', '3.0T': 'yellow' }, perRoom: true, hasMeasurement: true, measurementLabel: 'W×H' },
    { name: '데코타일 시공', hasInput: true, placeholder: '패턴 / 시공 구역', perRoom: true, hasMeasurement: true, measurementLabel: 'W×H' },
  ]},
  
  // 13. 도배
  { id: 'wallpaper', title: '도배 공사', subtitle: 'Wallpaper', items: [
    { name: '도배 종류', options: ['합지', '실크 (기본)', '실크 프리미엄 (디아망 등)'], optionColors: { '합지': 'green', '실크 (기본)': 'blue', '실크 프리미엄 (디아망 등)': 'pink' } },
    { name: '도배 시공', perRoom: true, hasMeasurement: true, measurementLabel: '평' },
  ]},
  
  // 14. 가구
  { id: 'furniture', title: '가구 공사', subtitle: 'Furniture', items: [
    { name: '맞춤 가구', options: ['신발장', '싱크대(상·하부장)', '아일랜드', '붙박이장', '창고장', '수납장', '기타'], perRoom: true, hasMeasurement: true, measurementLabel: 'W×H' },
  ]},
  
  // 15. 철물
  { id: 'hardware', title: '철물 / 기타 설비', subtitle: 'Hardware', items: [
    { name: '번호키 (도어락)', hasInput: true, placeholder: '브랜드 / 지문인식·카드·번호 방식' },
    { name: '인터폰', options: ['일반 인터폰', '비디오폰', '스마트폰 연동형'], optionColors: { '일반 인터폰': 'green', '비디오폰': 'blue', '스마트폰 연동형': 'pink' } },
    { name: '방문 손잡이', options: ['일반형', '레버형'], hasInput: true, placeholder: '브랜드 / 교체 수량' },
    { name: '철물', options: ['경첩', '도어스토퍼', '기타 철물 교체'] },
    { name: '외부 실리콘', hasInput: true, placeholder: '외부 창호 코킹 / 시공 구역' },
  ]},
  
  // 16. 기타 마감
  { id: 'finishing', title: '입주 청소 및 기타', subtitle: 'Cleaning & Others', items: [
    { name: '입주 청소', options: ['기본 청소', '줄눈 청소 포함', '에어컨 청소 포함'], optionColors: { '기본 청소': 'green', '줄눈 청소 포함': 'blue', '에어컨 청소 포함': 'yellow' } },
  ]},
  
  // 특이사항
  { id: 'notes', title: '특이사항 및 추가 요청', subtitle: 'Special Notes', items: [] },
];

// ───────── 저장 데이터 키 마이그레이션 ─────────
// 체크리스트 저장 데이터는 섹션 id / 항목 "이름"을 키로 쓴다.
// 위 SECTIONS 의 id나 항목명을 바꾸면 기존 저장 데이터가 고아가 되므로,
// 이름을 바꿀 때는 반드시 여기에 (옛 키 → 새 키) 매핑을 추가할 것.
export const LEGACY_SECTION_KEYS: Record<string, string> = {};
export const LEGACY_ITEM_KEYS: Record<string, string> = {};

/** 저장된 체크리스트의 옛 키를 현재 키로 이관 (새 키에 이미 값이 있으면 보존) */
export function migrateChecklistKeys(
  saved: Record<string, Record<string, any>>
): Record<string, Record<string, any>> {
  const out: Record<string, Record<string, any>> = {};
  for (const [sectionKey, items] of Object.entries(saved || {})) {
    const sk = LEGACY_SECTION_KEYS[sectionKey] || sectionKey;
    const target = (out[sk] = out[sk] || {});
    for (const [itemKey, val] of Object.entries(items || {})) {
      const ik = LEGACY_ITEM_KEYS[itemKey] || itemKey;
      if (!(ik in target)) target[ik] = val;
    }
  }
  return out;
}

/** roomChecklist 키(`섹션id_항목명`)도 같은 매핑으로 이관 */
export function migrateRoomChecklistKeys(
  saved: Record<string, Record<string, any>>
): Record<string, Record<string, any>> {
  const out: Record<string, Record<string, any>> = {};
  for (const [key, val] of Object.entries(saved || {})) {
    const sep = key.indexOf('_');
    if (sep < 0) { if (!(key in out)) out[key] = val; continue; }
    const sk = LEGACY_SECTION_KEYS[key.slice(0, sep)] || key.slice(0, sep);
    const ik = LEGACY_ITEM_KEYS[key.slice(sep + 1)] || key.slice(sep + 1);
    const nk = `${sk}_${ik}`;
    if (!(nk in out)) out[nk] = val;
  }
  return out;
}

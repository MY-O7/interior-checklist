import * as XLSX from 'xlsx';

export type Row = (string | number | null)[];

export function buildXls(rows: Row[]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(c => c ?? '')));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '견적서');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xls' }) as Buffer;
}

/** 표준 양식 견적서: 공종 블록 2개(철거 195만, 목공 125만) + 공과잡비 16만 + VAT 0 */
export function standardFixture(): Buffer {
  return buildXls([
    ['솜씨 인테리어', null, null, '일   자:', null, 46041, null, null],
    [null, null, null, '현장명:', null, '테스트 현장', null, null],
    [null, null, null, '평   형:', null, '30평형', null, null],
    [null, null, null, '고객명:', null, '홍길동', null, null],
    ['번호', '공   종', '적용부위, 제품명, 규격', '단위', '수량', '단   가', '금   액', '비  고'],
    [null, '철거공사', '주방씽크대 철거', '식', 1, 520000, 520000, null],
    [null, null, '욕실철거', '식', 1, 800000, 800000, '변경가능'],
    [null, null, '욕조설치', '식', null, null, 0, null],
    [null, null, '기타 철거', '식', 1, 330000, 330000, null],
    [null, null, '인건비', '식', 1, 300000, 300000, null],
    [null, null, '소계:', null, null, null, 1950000, null],
    [null, '목공공사', '중문 시공', '식', 1, 1250000, 1250000, null],
    [null, '메모입니다', '문짝 교체', '식', 0, 0, 0, null],
    [null, null, '소계:', null, null, null, 1250000, null],
    [null, null, '소계[페이지합계]', 'ROT', 1, null, 3200000, null],
    [null, '공과잡비', '현장진행경비', '%', 5, null, 160000, null],
    [null, null, null, null, null, null, null, null],
    [null, 'VAT', '세금계산서발행', '%', null, null, 0, null],
    [null, null, '총공사금액', 'ROT', 1, null, 3360000, null],
    [null, '특이사항', '  ※ 견적외 추가공사 별도', null, null, null, null, null],
    [null, null, '  ※ 부가세 별도', null, null, null, null, null],
  ]);
}

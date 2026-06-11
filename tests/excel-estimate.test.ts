import { describe, it, expect } from 'vitest';
import { parseEstimateXls, verifyParsed, ImportError } from '@/lib/excel-estimate';
import { standardFixture, buildXls } from './fixture';

describe('parseEstimateXls — 메타/항목', () => {
  it('현장명·고객명·평형을 추출한다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(r.meta.siteName).toBe('테스트 현장');
    expect(r.meta.customerName).toBe('홍길동');
    expect(r.meta.pyeong).toBe('30평형');
  });

  it('공종 블록별로 항목을 파싱하고 0원 옵션 항목도 포함한다', () => {
    const r = parseEstimateXls(standardFixture());
    const demo = r.items.filter(i => i.category === '철거공사');
    expect(demo.map(i => i.name)).toEqual(
      ['주방씽크대 철거', '욕실철거', '욕조설치', '기타 철거', '인건비']);
    expect(demo[1].note).toBe('변경가능');
    expect(demo[2].unitPrice).toBe(0);
  });

  it('블록 중간의 1열 메모는 공종으로 취급하지 않는다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(r.items.find(i => i.name === '문짝 교체')!.category).toBe('목공공사');
    expect(r.items.some(i => i.category === '메모입니다')).toBe(false);
  });

  it('공과잡비는 금액이 있으면 일반 항목으로 추가된다', () => {
    const r = parseEstimateXls(standardFixture());
    const misc = r.items.find(i => i.category === '공과잡비')!;
    expect(misc.quantity * misc.unitPrice).toBe(160000);
  });

  it('특이사항은 notes로 합쳐진다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(r.notes).toContain('견적외 추가공사 별도');
    expect(r.notes).toContain('부가세 별도');
  });

  it('헤더 행이 없으면 한국어 오류를 던진다', () => {
    const bad = buildXls([['아무', '내용', '없음']]);
    expect(() => parseEstimateXls(bad)).toThrow(ImportError);
    expect(() => parseEstimateXls(bad)).toThrow(/견적서 표 헤더/);
  });
});

describe('verifyParsed — 3중 검증', () => {
  it('정상 파일은 통과한다', () => {
    const r = parseEstimateXls(standardFixture());
    expect(() => verifyParsed(r)).not.toThrow();
  });

  it('소계가 항목 합과 다르면 공종명을 포함한 오류', () => {
    const r = parseEstimateXls(standardFixture());
    r.checks.categories[0].excelSubtotal += 1000;
    expect(() => verifyParsed(r)).toThrow(/철거공사/);
  });

  it('총공사금액이 다르면 거부', () => {
    const r = parseEstimateXls(standardFixture());
    r.checks.grandTotalExcel! += 1;
    expect(() => verifyParsed(r)).toThrow(/총공사금액/);
  });
});

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { parseEstimateXls, verifyParsed } from '@/lib/excel-estimate';

// 실제 견적서 전수 검증. 외장볼륨이 없으면 skip (CI/서버에서는 돌지 않음).
const DIR = '/Volumes/Somssi/견적/2026';

describe.skipIf(!existsSync(DIR))('골든 테스트 — 실제 견적서 전부', () => {
  const files = existsSync(DIR) ? readdirSync(DIR).filter(f => f.endsWith('.xls')) : [];
  it('견적서 파일이 존재한다', () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    it(`${f} — 파싱 + 3중 검증 통과`, () => {
      const parsed = parseEstimateXls(readFileSync(path.join(DIR, f)));
      verifyParsed(parsed);
      expect(parsed.items.length).toBeGreaterThan(0);
    });
  }
});

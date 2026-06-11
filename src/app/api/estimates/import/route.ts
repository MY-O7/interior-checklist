import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { parseEstimateXls, verifyParsed, ImportError } from '@/lib/excel-estimate';

// 엑셀 견적서 업로드 → 파싱+검증 → 미리보기 JSON 반환 (저장하지 않음)
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: '파일이 너무 큽니다 (5MB 제한)' }, { status: 400 });

    const parsed = parseEstimateXls(Buffer.from(await file.arrayBuffer()));
    verifyParsed(parsed);
    if (!parsed.meta.siteName) {
      parsed.meta.siteName = file.name.replace(/\.(xls|xlsx)$/i, '').trim();
    }
    return NextResponse.json({ parsed });
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error('Import parse error:', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

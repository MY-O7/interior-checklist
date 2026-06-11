import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canAccessProject } from '@/lib/auth';
import { verifyParsed, ImportError, type ParsedEstimate } from '@/lib/excel-estimate';

// 미리보기에서 확인한 파싱 결과를 실제 저장. 저장 직전 서버에서 재검증한다.
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    const { user } = session;

    const { mode, projectId, parsed } = await request.json() as
      { mode: 'newProject' | 'overwrite'; projectId?: string; parsed: ParsedEstimate };
    if (!parsed?.items?.length) return NextResponse.json({ error: '가져올 항목이 없습니다' }, { status: 400 });
    if (!parsed.meta?.siteName) return NextResponse.json({ error: '현장명이 없습니다' }, { status: 400 });
    verifyParsed(parsed);

    const items = parsed.items.map((i, idx) => ({
      id: `${Date.now()}-${idx}`, category: i.category, name: i.name,
      unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice, labor: [], note: i.note,
    }));
    const estimateData = {
      items: JSON.stringify(items), laborCost: 0, discount: 0,
      vatRate: parsed.vatRate, includeVat: parsed.includeVat, notes: parsed.notes,
    };

    let targetProjectId = projectId;
    if (mode === 'newProject') {
      const project = await prisma.project.create({ data: {
        name: parsed.meta.siteName, clientName: parsed.meta.customerName || null, userId: user.id,
      }});
      targetProjectId = project.id;
    } else {
      if (!targetProjectId) return NextResponse.json({ error: 'projectId가 필요합니다' }, { status: 400 });
      if (!(await canAccessProject(user.id, user.role, targetProjectId)))
        return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const existing = await prisma.estimate.findFirst({ where: { projectId: targetProjectId! } });
    if (existing) await prisma.estimate.update({ where: { id: existing.id }, data: estimateData });
    else await prisma.estimate.create({ data: { ...estimateData, projectId: targetProjectId!, userId: user.id } });

    return NextResponse.json({ ok: true, projectId: targetProjectId });
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error('Import commit error:', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

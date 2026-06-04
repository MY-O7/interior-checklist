import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 공개(비인증) 견적서 조회 — 유효한 토큰을 가진 사람만 접근 가능.
// 견적 금액/항목과 현장명만 노출하고 그 외 정보는 반환하지 않는다.
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) return NextResponse.json({ error: '잘못된 링크' }, { status: 404 });

    const estimate = await prisma.estimate.findUnique({
      where: { shareToken: token },
      include: { project: { select: { name: true } } },
    });

    if (!estimate) {
      return NextResponse.json({ error: '유효하지 않거나 만료된 링크입니다' }, { status: 404 });
    }

    return NextResponse.json({
      projectName: estimate.project.name,
      items: JSON.parse(estimate.items || '[]'),
      discount: estimate.discount || 0,
      vatRate: estimate.vatRate ?? 10,
      includeVat: estimate.includeVat ?? true,
      notes: estimate.notes || '',
      categoryOrder: estimate.categoryOrder ? JSON.parse(estimate.categoryOrder) : null,
    });
  } catch (error) {
    console.error('Public estimate fetch error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

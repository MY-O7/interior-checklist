import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canAccessProject } from '@/lib/auth';

// 견적서 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { projectId } = params;
    const { user } = session;

    if (!(await canAccessProject(user.id, user.role, projectId))) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const estimate = await prisma.estimate.findFirst({
      where: { projectId }
    });

    if (!estimate) {
      return NextResponse.json({
        projectId,
        items: [],
        laborCost: 0,
        discount: 0,
        vatRate: 10,
        includeVat: true,
        notes: ''
      });
    }

    return NextResponse.json({
      projectId: estimate.projectId,
      items: JSON.parse(estimate.items || '[]'),
      laborCost: estimate.laborCost || 0,
      discount: estimate.discount || 0,
      vatRate: estimate.vatRate ?? 10,
      includeVat: estimate.includeVat ?? true,
      notes: estimate.notes || '',
      categoryOrder: estimate.categoryOrder ? JSON.parse(estimate.categoryOrder) : null,
    });
  } catch (error) {
    console.error('Get estimate error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 견적서 저장
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { projectId } = params;
    const { user } = session;

    if (!(await canAccessProject(user.id, user.role, projectId))) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const body = await request.json();
    const { items, laborCost, discount, vatRate, includeVat, notes, categoryOrder } = body;

    const existing = await prisma.estimate.findFirst({
      where: { projectId }
    });

    const data = {
      items: JSON.stringify(items),
      laborCost: laborCost || 0,
      discount: discount || 0,
      vatRate: vatRate ?? 10,
      includeVat: includeVat ?? true,
      notes: notes || null,
      categoryOrder: categoryOrder ? JSON.stringify(categoryOrder) : null,
    };

    if (existing) {
      await prisma.estimate.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.estimate.create({
        data: {
          projectId,
          userId: session.user.id,
          ...data,
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save estimate error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// 프로젝트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const user = session.user;
    
    // ADMIN은 전체, USER는 자기 프로젝트 + 공유받은 프로젝트
    const include = {
      user: { select: { id: true, name: true } },
      shares: { select: { userId: true } }
    };
    let projects;
    if (user.role === 'ADMIN') {
      projects = await prisma.project.findMany({ include, orderBy: { createdAt: 'desc' } });
    } else {
      projects = await prisma.project.findMany({
        where: {
          OR: [
            { userId: user.id },
            { shares: { some: { userId: user.id } } }
          ]
        },
        include,
        orderBy: { createdAt: 'desc' }
      });
    }

    // ownership 표시: 'mine' | 'shared' | 소유자 이름
    const result = projects.map(p => ({
      ...p,
      ownerName: p.user.name,
      ownership: p.userId === user.id ? 'mine' : p.shares.some((s: { userId: string }) => s.userId === user.id) ? 'shared' : 'other',
    }));

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const body = await request.json();
    const { name, clientName, address } = body;
    
    if (!name) {
      return NextResponse.json({ error: '프로젝트명 필요' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        clientName: clientName || null,
        address: address || null,
        userId: session.user.id,
      }
    });

    // 빈 체크리스트도 함께 생성
    await prisma.checklist.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        data: JSON.stringify({}),
        siteInfo: JSON.stringify({}),
      }
    });

    // 빈 견적서도 함께 생성
    await prisma.estimate.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        items: JSON.stringify([]),
      }
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

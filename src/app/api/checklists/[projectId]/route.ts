import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canAccessProject } from '@/lib/auth';

// 체크리스트 조회
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

    // 혹시 모를 중복 행에 대비해 가장 최근 것을 결정적으로 선택
    const checklist = await prisma.checklist.findFirst({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });

    if (!checklist) {
      return NextResponse.json({
        projectName: project?.name || '',
        checklist: {},
        siteInfo: {},
        specialNotes: ''
      });
    }

    return NextResponse.json({
      projectName: project?.name || '',
      checklist: JSON.parse(checklist.data || '{}'),
      roomChecklist: JSON.parse(checklist.roomData || '{}'),
      siteInfo: JSON.parse(checklist.siteInfo || '{}'),
      specialNotes: checklist.specialNotes || ''
    });
  } catch (error) {
    console.error('Get checklist error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 체크리스트 저장
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

    const { checklist, roomChecklist, siteInfo, specialNotes } = await request.json();

    const dataToSave = {
      data: JSON.stringify(checklist),
      siteInfo: JSON.stringify(siteInfo),
      specialNotes: specialNotes || null,
      roomData: JSON.stringify(roomChecklist || {}),
    };

    // 페이로드 크기 제한 (인증 사용자 DoS 방지) — 직렬화 합 4MB
    const totalSize = dataToSave.data.length + dataToSave.roomData.length + dataToSave.siteInfo.length;
    if (totalSize > 4 * 1024 * 1024) {
      return NextResponse.json({ error: '저장 데이터가 너무 큽니다' }, { status: 413 });
    }

    // 유니크 제약이 없어 동시 저장 시 중복 행이 생길 수 있으므로,
    // 트랜잭션에서 최신 1건만 갱신하고 나머지 중복은 제거한다.
    await prisma.$transaction(async (tx) => {
      const rows = await tx.checklist.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });
      if (rows.length === 0) {
        await tx.checklist.create({ data: { projectId, userId: session.user.id, ...dataToSave } });
      } else {
        await tx.checklist.update({ where: { id: rows[0].id }, data: dataToSave });
        if (rows.length > 1) {
          await tx.checklist.deleteMany({ where: { id: { in: rows.slice(1).map(r => r.id) } } });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save checklist error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

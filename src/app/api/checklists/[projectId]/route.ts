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

    const checklist = await prisma.checklist.findFirst({
      where: { projectId }
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

    // 기존 체크리스트 찾기
    const existing = await prisma.checklist.findFirst({
      where: { projectId }
    });

    const dataToSave = {
      data: JSON.stringify(checklist),
      siteInfo: JSON.stringify(siteInfo),
      specialNotes: specialNotes || null,
      roomData: JSON.stringify(roomChecklist || {}),
    };

    if (existing) {
      await prisma.checklist.update({
        where: { id: existing.id },
        data: dataToSave
      });
    } else {
      await prisma.checklist.create({
        data: { projectId, userId: session.user.id, ...dataToSave }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save checklist error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

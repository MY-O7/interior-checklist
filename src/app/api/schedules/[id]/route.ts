import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canAccessProject } from '@/lib/auth';

// 일정 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { id } = params;
    const { user } = session;
    const body = await request.json();
    const { date, task, note, projectId } = body;

    const existing = await prisma.projectSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '일정을 찾을 수 없습니다' }, { status: 404 });
    }

    // 기존 프로젝트 접근 권한 체크
    if (!(await canAccessProject(user.id, user.role, existing.projectId))) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    // 일정을 다른 프로젝트로 옮기는 경우, 옮겨갈 프로젝트의 권한도 확인 (IDOR 방지)
    if (projectId !== undefined && projectId !== existing.projectId) {
      if (!(await canAccessProject(user.id, user.role, projectId))) {
        return NextResponse.json({ error: '대상 프로젝트에 접근 권한이 없습니다' }, { status: 403 });
      }
    }

    const schedule = await prisma.projectSchedule.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(task !== undefined && { task }),
        ...(note !== undefined && { note: note || null }),
        ...(projectId !== undefined && { projectId }),
      },
      include: {
        project: { select: { id: true, name: true, color: true, clientName: true, address: true } }
      }
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('일정 수정 실패:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 일정 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { id } = params;
    const { user } = session;

    const schedule = await prisma.projectSchedule.findUnique({ where: { id } });
    if (!schedule) {
      return NextResponse.json({ error: '일정을 찾을 수 없습니다' }, { status: 404 });
    }

    if (!(await canAccessProject(user.id, user.role, schedule.projectId))) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    await prisma.projectSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('일정 삭제 실패:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

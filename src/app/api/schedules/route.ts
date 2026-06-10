import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canAccessProject } from '@/lib/auth';

// 일정 목록 조회 (ADMIN: 전체, USER: 자기 프로젝트 + 공유받은 프로젝트)
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { user } = session;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const projectId = searchParams.get('projectId');

    // USER는 자기 프로젝트 + 공유받은 프로젝트의 일정만
    // 접근 가능한 프로젝트 ID 목록을 먼저 구함
    let accessibleProjectIds: string[] | null = null;
    if (user.role !== 'ADMIN') {
      const accessibleProjects = await prisma.project.findMany({
        where: {
          OR: [
            { userId: user.id },
            { shares: { some: { userId: user.id } } }
          ]
        },
        select: { id: true }
      });
      accessibleProjectIds = accessibleProjects.map(p => p.id);
    }

    const where: Record<string, unknown> = {};

    if (year) {
      // 서버 TZ(컨테이너=UTC)와 클라이언트 로컬 날짜(KST)가 어긋나도 연말/연초 일정이
      // 빠지지 않게 UTC 기준 경계에 하루씩 여유를 둔다. 화면은 어차피 날짜별로 다시 매핑함.
      const y = parseInt(year);
      const DAY_MS = 24 * 60 * 60 * 1000;
      where.date = {
        gte: new Date(Date.UTC(y, 0, 1) - DAY_MS),
        lt: new Date(Date.UTC(y + 1, 0, 1) + DAY_MS),
      };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (accessibleProjectIds !== null) {
      where.projectId = projectId
        ? (accessibleProjectIds.includes(projectId) ? projectId : '__none__')
        : { in: accessibleProjectIds };
    }

    const schedules = await prisma.projectSchedule.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, color: true, clientName: true, address: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('일정 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류', schedules: [] }, { status: 500 });
  }
}

// 일정 추가
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { user } = session;
    const body = await request.json();
    const { projectId, date, task, note } = body;

    if (!projectId || !date || !task) {
      return NextResponse.json({ error: '필수 정보 누락' }, { status: 400 });
    }

    if (!(await canAccessProject(user.id, user.role, projectId))) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    const schedule = await prisma.projectSchedule.create({
      data: {
        projectId,
        date: new Date(date),
        task,
        note: note || null
      },
      include: {
        project: { select: { id: true, name: true, color: true, clientName: true, address: true } }
      }
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('일정 추가 실패:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

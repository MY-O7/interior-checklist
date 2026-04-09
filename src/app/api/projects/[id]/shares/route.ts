import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// 공유 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { user } = session;
    const projectId = params.id;

    // 소유자 또는 ADMIN만 공유 목록 조회 가능
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) {
      return NextResponse.json({ error: '프로젝트 없음' }, { status: 404 });
    }
    if (user.role !== 'ADMIN' && project.userId !== user.id) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const shares = await prisma.projectShare.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 공유 추가 (이메일로)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { user } = session;
    const projectId = params.id;

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) {
      return NextResponse.json({ error: '프로젝트 없음' }, { status: 404 });
    }
    if (user.role !== 'ADMIN' && project.userId !== user.id) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: '이메일을 입력해주세요' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
    if (!targetUser) {
      return NextResponse.json({ error: '해당 이메일의 사용자를 찾을 수 없습니다' }, { status: 404 });
    }

    if (targetUser.id === project.userId) {
      return NextResponse.json({ error: '프로젝트 소유자에게는 공유할 수 없습니다' }, { status: 400 });
    }

    // 이미 공유된 경우
    const existing = await prisma.projectShare.findUnique({
      where: { projectId_userId: { projectId, userId: targetUser.id } }
    });
    if (existing) {
      return NextResponse.json({ error: '이미 공유된 사용자입니다' }, { status: 400 });
    }

    const share = await prisma.projectShare.create({
      data: { projectId, userId: targetUser.id },
      include: { user: { select: { id: true, email: true, name: true } } }
    });

    return NextResponse.json({ share });
  } catch (error) {
    console.error('Add share error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 공유 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { user } = session;
    const projectId = params.id;

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) {
      return NextResponse.json({ error: '프로젝트 없음' }, { status: 404 });
    }
    if (user.role !== 'ADMIN' && project.userId !== user.id) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const { shareId } = await request.json();
    if (!shareId) {
      return NextResponse.json({ error: '삭제할 공유 ID가 필요합니다' }, { status: 400 });
    }

    await prisma.projectShare.delete({ where: { id: shareId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete share error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

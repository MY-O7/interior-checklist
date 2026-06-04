import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canAccessProject } from '@/lib/auth';
import crypto from 'crypto';

// 공유 링크 토큰 생성 (없으면 새로 만들고, 있으면 기존 것 반환)
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { projectId } = params;
    const { user } = session;
    if (!(await canAccessProject(user.id, user.role, projectId))) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const estimate = await prisma.estimate.findFirst({ where: { projectId } });
    if (!estimate) {
      return NextResponse.json({ error: '먼저 견적서를 저장해주세요' }, { status: 404 });
    }

    let token = estimate.shareToken;
    if (!token) {
      token = crypto.randomBytes(18).toString('base64url');
      await prisma.estimate.update({ where: { id: estimate.id }, data: { shareToken: token } });
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Create share link error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// 공유 링크 해제 (토큰 무효화)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { projectId } = params;
    const { user } = session;
    if (!(await canAccessProject(user.id, user.role, projectId))) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    await prisma.estimate.updateMany({ where: { projectId }, data: { shareToken: null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke share link error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

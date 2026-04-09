import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'session';

export async function getSessionUser(req: NextRequest) {
  const sessionCookie = req.cookies.get(SESSION_COOKIE);
  if (!sessionCookie) return null;
  
  try {
    const session = JSON.parse(sessionCookie.value);
    const user = await prisma.user.findUnique({ 
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true }
    });
    return user ? { user } : null;
  } catch {
    return null;
  }
}

// 프로젝트 접근 권한 체크: 소유자 / ADMIN / 공유받은 사용자
export async function canAccessProject(userId: string, role: string, projectId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project) return false;
  if (project.userId === userId) return true;
  // 공유 체크
  const share = await prisma.projectShare.findUnique({
    where: { projectId_userId: { projectId, userId } }
  });
  return !!share;
}

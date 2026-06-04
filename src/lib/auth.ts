import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const SESSION_COOKIE = 'session';

// 세션 서명용 비밀키. 운영에서는 반드시 SESSION_SECRET 환경변수로 지정할 것.
const SECRET = process.env.SESSION_SECRET || '';
if (!SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  SESSION_SECRET 환경변수가 없습니다. 세션 위조 방지를 위해 반드시 설정하세요.');
}
const effectiveSecret = SECRET || 'dev-insecure-secret-change-me';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: false, // Tailscale HTTP 접속 허용 (HTTPS면 true 권장)
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7일
  path: '/',
};

// ---- 세션 토큰 (HMAC 서명) ----

function sign(payload: string): string {
  return crypto.createHmac('sha256', effectiveSecret).update(payload).digest('base64url');
}

function createSessionToken(userId: string, role: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, role })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// 서명을 검증하고 payload를 반환. 위조/변조 시 null.
function verifySessionToken(token: string): { userId: string; role: string } | null {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

// ---- 쿠키 헬퍼 ----

export function setSessionCookie(res: NextResponse, userId: string, role: string) {
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId, role), COOKIE_OPTS);
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.delete(SESSION_COOKIE);
}

// ---- 세션 조회 ----

// 항상 DB에서 최신 사용자 정보(특히 role)를 가져온다. 쿠키의 role은 신뢰하지 않음.
export async function getSessionUser(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE);
  if (!cookie) return null;

  const payload = verifySessionToken(cookie.value);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  return user ? { user } : null;
}

// 프로젝트 접근 권한 체크: 소유자 / ADMIN / 공유받은 사용자
export async function canAccessProject(userId: string, role: string, projectId: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project) return false;
  if (project.userId === userId) return true;
  const share = await prisma.projectShare.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!share;
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const SESSION_COOKIE = 'session';

// 세션 서명용 비밀키. 운영에서는 반드시 SESSION_SECRET 환경변수로 지정할 것.
// 운영에서 누락되면 위조 가능한 기본값으로 조용히 돌지 않도록 첫 사용 시점에 에러를 낸다.
// (모듈 로드 시점에 throw 하면 SESSION_SECRET 없이 도는 next build 가 깨지므로 지연 검사)
function getSecret(): string {
  const secret = process.env.SESSION_SECRET || '';
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET 환경변수가 없습니다. docker-compose .env 에 설정한 뒤 다시 기동하세요.');
  }
  return 'dev-insecure-secret-change-me';
}

const COOKIE_OPTS = {
  httpOnly: true,
  // 기본 false: Tailscale HTTP 접속 허용. HTTPS 를 붙이면 COOKIE_SECURE=true 로 켤 것.
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7일
  path: '/',
};

// ---- 세션 토큰 (HMAC 서명) ----

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
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

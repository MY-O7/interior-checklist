import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSessionUser, setSessionCookie, clearSessionCookie } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

// 로그인 브루트포스 방지: IP+이메일 기준 1분 창에 10회 (단일 인스턴스 인메모리)
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function isLoginRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    // 만료 항목이 무한히 쌓이지 않게 가끔 청소
    if (loginAttempts.size > 1000) {
      loginAttempts.forEach((v, k) => { if (v.resetAt < now) loginAttempts.delete(k); });
    }
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;

    // 로그인
    if (action === 'login') {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
      if (isLoginRateLimited(`${ip}:${email ?? ''}`)) {
        return NextResponse.json({ error: '시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      // 사용자 존재 여부를 노출하지 않도록 동일한 메시지 사용
      const invalid = () =>
        NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 });

      if (!user) return invalid();
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return invalid();

      const res = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
      setSessionCookie(res, user.id, user.role);
      return res;
    }

    // 회원가입
    if (action === 'register') {
      if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다' }, { status: 400 });
      }
      if (!password || password.length < MIN_PASSWORD) {
        return NextResponse.json({ error: `비밀번호는 최소 ${MIN_PASSWORD}자 이상이어야 합니다` }, { status: 400 });
      }
      if (!name || !name.trim()) {
        return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: '이미 존재하는 이메일입니다' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name: name.trim(), role: 'USER' },
      });

      const res = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
      setSessionCookie(res, user.id, user.role);
      return res;
    }

    // 로그아웃
    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      clearSessionCookie(res);
      return res;
    }

    // 현재 사용자 조회
    if (action === 'me') {
      const session = await getSessionUser(req);
      return NextResponse.json({ user: session?.user ?? null });
    }

    // 내 이름 수정
    if (action === 'updateName') {
      const session = await getSessionUser(req);
      if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      if (!name || !name.trim()) {
        return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 });
      }
      const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: { name: name.trim() },
        select: { id: true, email: true, name: true, role: true },
      });
      return NextResponse.json({ success: true, user: updated });
    }

    // 전체 유저 목록 (관리자 전용) — 프로젝트 포함
    if (action === 'listUsers') {
      const session = await getSessionUser(req);
      if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      if (session.user.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

      const users = await prisma.user.findMany({
        select: {
          id: true, email: true, name: true, role: true, createdAt: true,
          projects: {
            select: { id: true, name: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ users });
    }

    // 유저 권한 변경 (관리자 전용)
    if (action === 'updateUserRole') {
      const session = await getSessionUser(req);
      if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      if (session.user.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

      const { userId, role } = body;
      if (!userId || !['USER', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      return NextResponse.json({ success: true, user: updated });
    }

    // 유저 삭제 (관리자 전용)
    if (action === 'deleteUser') {
      const session = await getSessionUser(req);
      if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      if (session.user.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

      const { userId } = body;
      if (userId === session.user.id) {
        return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다' }, { status: 400 });
      }
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

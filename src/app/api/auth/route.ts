import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 세션 쿠키 설정
const SESSION_COOKIE = 'session';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;
    
    // 로그인
    if (action === 'login') {
      
      
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 401 });
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 });
      }
      
      // 세션 생성 (간단히 userId를 쿠키에 저장)
      const res = NextResponse.json({ 
        success: true, 
        user: { id: user.id, email: user.email, name: user.name, role: user.role } 
      });
      
      // 쿠키 설정 (7일)
      res.cookies.set(SESSION_COOKIE, JSON.stringify({ userId: user.id, role: user.role }), {
        httpOnly: true,
        secure: false, // 개발 환경에서 IP 접근 허용
        sameSite: 'lax', // 같은 사이트 요청 허용
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      
      return res;
    }
    
    // 회원가입
    if (action === 'register') {
      
      
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: '이미 존재하는 이메일입니다' }, { status: 400 });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role: 'USER' },
      });
      
      const res = NextResponse.json({ 
        success: true, 
        user: { id: user.id, email: user.email, name: user.name, role: user.role } 
      });
      
      res.cookies.set(SESSION_COOKIE, JSON.stringify({ userId: user.id, role: user.role }), {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      
      return res;
    }
    
    // 로그아웃
    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    
    // 현재 사용자 조회
    if (action === 'me') {
      const sessionCookie = req.cookies.get(SESSION_COOKIE);
      if (!sessionCookie) {
        return NextResponse.json({ user: null });
      }
      
      try {
        const session = JSON.parse(sessionCookie.value);
        const user = await prisma.user.findUnique({ 
          where: { id: session.userId },
          select: { id: true, email: true, name: true, role: true }
        });
        
        return NextResponse.json({ user });
      } catch {
        return NextResponse.json({ user: null });
      }
    }

    // 내 이름 수정
    if (action === 'updateName') {
      const sessionCookie = req.cookies.get(SESSION_COOKIE);
      if (!sessionCookie) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      try {
        const session = JSON.parse(sessionCookie.value);
        const updated = await prisma.user.update({
          where: { id: session.userId },
          data: { name },
          select: { id: true, email: true, name: true, role: true }
        });
        return NextResponse.json({ success: true, user: updated });
      } catch {
        return NextResponse.json({ error: '수정 실패' }, { status: 500 });
      }
    }

    // 전체 유저 목록 (관리자 전용) — 프로젝트 포함
    if (action === 'listUsers') {
      const sessionCookie = req.cookies.get(SESSION_COOKIE);
      if (!sessionCookie) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      try {
        const session = JSON.parse(sessionCookie.value);
        if (session.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
        const users = await prisma.user.findMany({
          select: {
            id: true, email: true, name: true, role: true, createdAt: true,
            projects: {
              select: { id: true, name: true, status: true, createdAt: true },
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ users });
      } catch {
        return NextResponse.json({ error: '조회 실패' }, { status: 500 });
      }
    }

    // 유저 권한 변경 (관리자 전용)
    if (action === 'updateUserRole') {
      const sessionCookie = req.cookies.get(SESSION_COOKIE);
      if (!sessionCookie) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      try {
        const session = JSON.parse(sessionCookie.value);
        if (session.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
        const { userId, role } = body;
        if (!userId || !['USER', 'ADMIN'].includes(role)) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { role },
          select: { id: true, email: true, name: true, role: true, createdAt: true }
        });
        return NextResponse.json({ success: true, user: updated });
      } catch {
        return NextResponse.json({ error: '수정 실패' }, { status: 500 });
      }
    }

    // 유저 삭제 (관리자 전용)
    if (action === 'deleteUser') {
      const sessionCookie = req.cookies.get(SESSION_COOKIE);
      if (!sessionCookie) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
      try {
        const session = JSON.parse(sessionCookie.value);
        if (session.role !== 'ADMIN') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
        const { userId } = body;
        if (userId === session.userId) return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다' }, { status: 400 });
        await prisma.user.delete({ where: { id: userId } });
        return NextResponse.json({ success: true });
      } catch {
        return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

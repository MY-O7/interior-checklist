# 솜씨인테리어 체크리스트 앱

## 프로젝트 개요
인테리어 시공 관리 웹앱. 프로젝트 관리, 체크리스트, 견적서, 캘린더 기능 포함.

- **GitHub**: https://github.com/MY-O7/interior-checklist
- **기술 스택**: Next.js 14 + TypeScript + Tailwind CSS + Prisma 6.19.2 + PostgreSQL
- **개발**: 맥미니에서 `npm run dev`
- **운영**: Ubuntu 서버(Oracle Cloud, ARM64)에서 `docker-compose up -d --build`

## 파일 구조
```
src/app/
  api/auth/route.ts          # 로그인/회원가입/세션 (쿠키 기반)
  api/projects/              # 프로젝트 CRUD
  api/estimates/             # 견적서
  api/checklists/            # 체크리스트
  api/schedules/             # 캘린더 일정
  dashboard/page.tsx         # 메인 대시보드
  login/page.tsx             # 로그인 페이지
src/lib/
  prisma.ts                  # Prisma 싱글톤
  auth.ts                    # 세션 유틸 (getSessionUser, canAccessProject)
prisma/schema.prisma          # DB 스키마 (User, Project, Estimate, Checklist, ProjectSchedule, ProjectShare)
```

## Docker 배포 구성
- `Dockerfile` — 멀티스테이지 빌드 (builder + runner)
- `docker-compose.yml` — app(Next.js) + db(PostgreSQL 15) 컨테이너
- `docker-entrypoint.sh` — 컨테이너 시작 시 DB 준비 후 서버 실행

### 핵심 설정값
- DB 유저: `somssi` / PW: `Somssi!Interior2026` / DB명: `somssi_interior`
- 앱 포트: `3000`
- `HOSTNAME=0.0.0.0` (Tailscale 접속용)
- `SESSION_SECRET` — 세션 쿠키 HMAC 서명용 (docker-compose.yml에 지정). 바꾸면 기존 로그인 세션이 전부 무효화되어 재로그인 필요.

## 인증/세션
- 세션은 쿠키에 `base64url(payload).HMAC-SHA256(payload)` 형태로 저장 (`src/lib/auth.ts`). 서명 검증으로 위조 차단.
- 쿠키의 role은 신뢰하지 않고 `getSessionUser`가 항상 DB에서 실제 role 조회.
- 세션 생성/삭제/조회는 `lib/auth.ts`의 `setSessionCookie` / `clearSessionCookie` / `getSessionUser` 사용 (직접 쿠키 파싱 금지).

## 해결된 주요 문제들
1. **Prisma 버전 고정** — `6.19.2` 정확히 고정 (7.x 문법 충돌 방지)
2. **`prisma.config.ts` 삭제** — TS 파일이라 런타임(runner)에서 실행 불가. Prisma 6.x는 기본으로 `prisma/schema.prisma`를 찾으므로 config 파일 불필요. (남겨두면 `MODULE_NOT_FOUND` 발생)
3. **npx 권한 오류** — `docker-entrypoint.sh`에서 `npx prisma` 대신 `node /app/node_modules/prisma/build/index.js` 직접 호출
4. **Prisma CLI 의존성 체인** — `db push`는 Prisma CLI를 실행하는데 CLI가 `@prisma/config → effect → fast-check → ...` 깊은 의존성을 런타임에 끌고 옴. 모듈 하나씩 복사하면 끝없이 다음 모듈을 요구함. → **runner 스테이지에 `node_modules` 전체를 복사**해야 확실히 해결 (`COPY --from=builder /app/node_modules ./node_modules`)
5. **useSearchParams** — `dashboard/page.tsx`에서 Suspense로 감싸야 함 (적용 완료)
6. **HOSTNAME=0.0.0.0** — Tailscale IP 접속을 위해 docker-compose 환경변수에 필수

## 기능: 견적서 고객 공유 링크
- 견적 페이지 사이드바 "고객 공유 링크 복사" → 토큰 생성 후 `/share/<token>` URL 클립보드 복사.
- `Estimate.shareToken`(unique)에 랜덤 토큰 저장. `POST /api/estimates/[projectId]/share`(생성), `DELETE`(해제).
- `GET /api/share/[token]` — 비인증 공개 조회. 견적 금액/항목 + 현장명만 노출.
- `/share/[token]` 페이지 — 로그인 없이 읽기전용 견적서 표시(인쇄/PDF 가능). `PrintEstimate`를 `onClose` 없이 재사용.
- miscRate(공과잡비)는 DB 미저장이라 공유 화면에선 0으로 계산됨 (소유자 화면도 새로고침 시 동일).

## DB 정책
다른 PC에 Docker로 배포할 때 기존 데이터 마이그레이션 불필요. 새 DB로 시작해도 됨.
`prisma db push --accept-data-loss`로 스키마만 생성.

## 배포 명령어
```bash
# 처음 또는 완전 초기화
docker-compose down -v
docker-compose up -d --build

# 코드 업데이트 후 재배포
git pull
docker-compose down
docker-compose up -d --build

# 로그 확인
docker-compose logs -f app
```

## 주의사항
- `npm install -g npm@latest` Dockerfile에 넣지 말 것 (불안정)
- `.env` 파일은 `.gitignore`에 포함되어 있어 git에 올라가지 않음
- `node_modules/prisma`를 runner 스테이지에 반드시 복사할 것

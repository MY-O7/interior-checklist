# 솜씨인테리어 서버 마이그레이션 기획안

> 작성일: 2026-04-09
> 상태: 기획 단계 (실행 전)

---

## 1. 현재 상태

| 항목 | 현재 |
|------|------|
| 호스팅 | Mac mini (로컬) |
| 주소 | http://192.168.0.14:3000 (LAN only) |
| 런타임 | Next.js 14 dev 서버 (`npm run dev`) |
| DB | SQLite (prisma/dev.db) |
| 문제점 | 서버가 간헐적으로 꺼짐, 외부 접속 불가, Mac mini 전원 의존 |

## 2. 목표 아키텍처

```
Mac mini (개발) → Git Push → GitHub Private Repo
                                    ↓
                          Oracle Cloud A1 (도쿄/오사카)
                          docker compose pull & up
                                    ↓
                          https://xxx.oracledns.net:3000
```

| 항목 | 목표 |
|------|------|
| 호스팅 | Oracle Cloud A1 (Arm, Free Tier) |
| 배포 | GitHub → Docker Compose |
| 런타임 | Next.js 14 production 빌드 (`npm start`) |
| DB | SQLite (Docker volume 영속화) |
| 접속 | 공인 IP + 도메인 (외부 접속 가능) |

## 3. Oracle Cloud A1 사양 (Free Tier)

- **CPU**: 최대 4 OCPU (Arm, Ampere A1)
- **RAM**: 최대 24GB
- **스토리지**: 200GB 블록 스토리지
- **네트워크**: 10TB/월 아웃바운드
- **추천 설정**: 1 OCPU + 6GB RAM + 50GB 스토리지 (과대한 수준)
- **리전**: 도쿄/오사카 (latency ~30ms)

## 4. 프로젝트 구조

```
interior-checklist/
├── .github/
│   └── workflows/
│       └── deploy.yml          # (선택) GitHub Actions 자동 배포
├── docker-compose.yml          # 컨테이너 오케스트레이션
├── Dockerfile                  # Next.js 프로덕션 빌드
├── .dockerignore               # Docker 제외 파일
├── nginx/
│   └── nginx.conf              # (선택) 리버스 프록시 + HTTPS
├── prisma/
│   ├── schema.prisma
│   └── dev.db                  # → 서버에서는 volume으로 관리
├── src/
├── public/
├── package.json
├── next.config.js
└── ...
```

## 5. 핵심 파일

### 5.1 Dockerfile

```dockerfile
# --- 빌드 스테이지 ---
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# --- 런타임 스테이지 ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 보안: non-root 유저
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

> **참고**: standalone 모드를 사용하려면 `next.config.js`에 `output: 'standalone'` 추가 필요.
> 미사용 시 `CMD ["npm", "start"]`로 대체.

### 5.2 docker-compose.yml

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: interior-checklist
    ports:
      - "3000:3000"
    volumes:
      # SQLite DB 파일 영속화 (컨테이너 재시작해도 데이터 유지)
      - db-data:/app/prisma
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./dev.db
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  db-data:
```

### 5.3 .dockerignore

```
node_modules
.next
.git
.gitignore
*.md
.env*.local
prisma/dev.db
```

### 5.4 next.config.js 수정

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Docker 최적화 빌드
  // 기존 설정 유지...
}

module.exports = nextConfig
```

## 6. 실행 단계

### Phase 1: 사전 준비

| 순서 | 작업 | 세부 내용 |
|------|------|-----------|
| 1-1 | Oracle Cloud 인스턴스 생성 | 도쿄/오사카 리전, Ubuntu 22.04 Arm, 1 OCPU + 6GB RAM |
| 1-2 | 보안 목록(Security List) 설정 | 인그레스 규칙: TCP 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (임시) |
| 1-3 | SSH 키 페어 생성 & 저장 | `~/.ssh/oracle_a1` |
| 1-4 | 공인 IP 확인 | OCI 콘솔에서 Primary Public IP 확인 |
| 1-5 | GitHub private repo 생성 | `interior-checklist` 리포지토리 |

### Phase 2: 프로젝트 Git 설정

| 순서 | 작업 | 세부 내용 |
|------|------|-----------|
| 2-1 | .gitignore 작성 | node_modules, .next, .env, dev.db 제외 |
| 2-2 | Dockerfile, docker-compose.yml, .dockerignore 추가 | 위 내용 참조 |
| 2-3 | next.config.js 수정 | `output: 'standalone'` 추가 |
| 2-4 | 초기 커밋 & 푸시 | `git remote add origin ... && git push -u origin main` |

### Phase 3: Oracle 서버 설정

| 순서 | 작업 | 명령어 |
|------|------|--------|
| 3-1 | SSH 접속 | `ssh -i ~/.ssh/oracle_a1 ubuntu@<공인IP>` |
| 3-2 | 시스템 업데이트 | `sudo apt update && sudo apt upgrade -y` |
| 3-3 | Docker 설치 | `curl -fsSL https://get.docker.com \| sh && sudo usermod -aG docker ubuntu` |
| 3-4 | Git clone | `git clone https://github.com/<username>/interior-checklist.git && cd interior-checklist` |
| 3-5 | 기존 DB 업로드 | Mac에서 `scp -i ~/.ssh/oracle_a1 prisma/dev.db ubuntu@<IP>:~/interior-checklist/prisma/` |
| 3-6 | Docker 빌드 & 실행 | `docker compose up -d --build` |
| 3-7 | 동작 확인 | `curl http://localhost:3000` |

### Phase 4: 도메인 & HTTPS (선택)

| 순서 | 작업 | 세부 내용 |
|------|------|-----------|
| 4-1 | 무료 도메인 연결 | Freenom, DuckDNS, 또는 Oracle Cloud DNS |
| 4-2 | Nginx 리버스 프록시 설정 | 80/443 → 3000 포워딩 |
| 4-3 | Let's Encrypt SSL | `certbot --nginx -d <도메인>` |
| 4-4 | 자동 갱신 설정 | `certbot renew` 크론 |

### Phase 5: 배포 자동화 (선택)

| 순서 | 작업 | 세부 내용 |
|------|------|-----------|
| 5-1 | GitHub Actions workflow 작성 | `.github/workflows/deploy.yml` |
| 5-2 | SSH 키를 GitHub Secrets에 등록 | `DEPLOY_KEY`, `DEPLOY_HOST`, `DEPLOY_USER` |
| 5-3 | push → 자동 빌드 & 배포 | main 브랜치 push 시 자동으로 서버에 deploy |

**deploy.yml 예시:**
```yaml
name: Deploy to Oracle Cloud

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd ~/interior-checklist
            git pull origin main
            docker compose up -d --build
```

## 7. 이후 업데이트 흐름

```
Mac mini에서 코드 수정
        ↓
git add . && git commit -m "메시지" && git push
        ↓
(자동) GitHub Actions → 서버에서 git pull + docker compose up --build
(수동) ssh 접속 → cd interior-checklist → git pull → docker compose up -d --build
```

## 8. DB 백업 전략

| 방법 | 주기 | 명령어 |
|------|------|--------|
| 수동 | 필요 시 | `docker cp interior-checklist:/app/prisma/dev.db ./backup/dev-$(date +%Y%m%d).db` |
| 자동 | 매일 | 크론으로 `0 3 * * * docker cp ... && scp ... user@backup-host:` |
| Mac 로컬 백업 | 주 1회 | `scp -i key ubuntu@<IP>:~/interior-checklist/prisma/dev.db ~/backup/` |

## 9. 롤백 계획

문제 발생 시:
1. `docker compose down` → 이전 이미지로 `docker compose up -d`
2. `git checkout <이전커밋>` → `docker compose up -d --build`
3. 최악: Mac mini에서 기존대로 `npm run dev` 복귀

## 10. 예상 소요 시간

| Phase | 소요 | 비고 |
|-------|------|------|
| Phase 1 (사전 준비) | 30분 | Oracle 인스턴스 생성이 가장 오래 걸림 (가용성에 따라) |
| Phase 2 (Git 설정) | 10분 | |
| Phase 3 (서버 설정) | 30분 | Docker 설치 + 빌드 |
| Phase 4 (도메인/HTTPS) | 20분 | 선택 사항 |
| Phase 5 (자동 배포) | 15분 | 선택 사항 |
| **총계** | **~1시간 45분** | Phase 1~3만 해도 1시간 10분 |

## 11. 체크리스트

- [ ] Oracle Cloud 계정 로그인 정보 확인
- [ ] 인스턴스 생성 (도쿄/오사카, Ubuntu Arm)
- [ ] 보안 목록 인그레스 규칙 설정
- [ ] SSH 키 페어 생성
- [ ] GitHub private repo 생성
- [ ] Dockerfile, docker-compose.yml, .dockerignore 작성
- [ ] next.config.js에 `output: 'standalone'` 추가
- [ ] .gitignore 작성
- [ ] Git 초기 푸시
- [ ] 서버 Docker 설치
- [ ] Git clone & docker compose up
- [ ] 기존 DB 마이그레이션 (scp)
- [ ] 외부 접속 테스트
- [ ] (선택) 도메인 + HTTPS 설정
- [ ] (선택) GitHub Actions 자동 배포
- [ ] (선택) DB 백업 크론 설정

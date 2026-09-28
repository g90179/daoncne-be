# daon-backend/Dockerfile
# Cloudflare Containers 배포용. NestJS(Express)+Prisma(MySQL)+nodemailer(SMTP) 구성을 코드 변경
# 없이 그대로 담는다 - 로컬 uploads/ 폴더만 R2로 대체됐고(src/storage), 그 외 로직은 이전과 동일하다.

# ---- deps: 프로덕션/개발 의존성 설치(빌드에 devDependencies 필요: nest-cli, typescript, prisma CLI) ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: TS 컴파일 + Prisma 클라이언트 생성 ----
FROM node:20-slim AS build
WORKDIR /app
# prisma generate 시점에 openssl 이 없으면 감지에 실패해 잘못된 엔진(openssl-1.1.x)을
# 생성한다 - 나중에 runtime 스테이지에만 openssl 을 깔아도 이미 생성된 엔진 자체가 안 맞아
# 소용없으므로 여기서도 설치해야 한다.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime: 프로덕션 의존성만 다시 설치해 이미지 용량을 줄이고, Prisma 클라이언트(생성된 엔진
# 바이너리 포함)는 build 스테이지 것을 그대로 덮어써 재생성 과정을 생략한다 ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Prisma 쿼리 엔진 바이너리가 런타임에 libssl 을 필요로 하는데 node:20-slim 에는 기본
# 포함돼 있지 않다 - 없으면 앱이 부팅 직후(포트 오픈 전) 조용히 크래시한다.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY assets ./assets

EXPOSE 8080
# 주의: package.json 의 start:prod 스크립트는 "node dist/main.js"라고 돼 있지만, 이 프로젝트의
# tsconfig(outDir: ./dist, sourceRoot: src)가 실제로 만드는 산출물은 dist/src/main.js 이다
# (nest build 로 직접 확인함) - 그 경로를 그대로 쓴다.
CMD ["sh", "-c", "node dist/src/main.js 2>&1 | tee /tmp/app.log"]

// daon-backend\src\main.ts
import 'dotenv/config'; // 💡 반드시 최상단에 위치해야 합니다!
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; // 1. 이게 잘 서있는지 확인!
import { join } from 'path';

async function bootstrap() {
  // 2. 반드시 create 뒤에 <NestExpressApplication>이 붙어있어야 합니다!
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 💡 CORS 방어막 해제 설정 추가
  app.enableCors({
    origin: [
      'http://localhost:5173', // 로컬 개발용 프론트엔드 주소 허용
      'https://daoncne.co.kr', // 실제 배포될 프로덕션 프론트엔드 주소 허용
      'https://www.daoncne.co.kr',
      'http://rss.daoncne.co.kr',
      'https://rss.daoncne.co.kr', // 👈 추가: RSS 서브도메인 허용
    ],
    credentials: true, // 쿠키나 인증 헤더를 허용할 경우 필수
    // 🔑 핵심 추가: 프론트엔드가 보내는 Authorization 헤더를 백엔드가 거절하지 않도록 명시합니다.
    allowedHeaders: 'Content-Type, Authorization',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // /uploads 경로로 들어오는 요청을 uploads 폴더와 연결
  // 빌드 후(dist/) 기준으로 한 칸 위(..)인 /web/uploads 폴더를 바라보게 됩니다.
  // 이제 타입스크립트가 에러를 뱉지 않고 프리패스로 통과시킵니다!
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads/' });

  await app.listen(8080);
}
bootstrap();
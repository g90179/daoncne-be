import 'dotenv/config'; // 💡 반드시 최상단에 위치해야 합니다!
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 💡 CORS 방어막 해제 설정 추가
  app.enableCors({
    origin: [
      'http://localhost:5173', // 로컬 개발용 프론트엔드 주소 허용
      'https://daoncne.co.kr' // 실제 배포될 프로덕션 프론트엔드 주소 허용
    ],
    credentials: true, // 쿠키나 인증 헤더를 허용할 경우 필수
  });

  // /uploads 경로로 들어오는 요청을 uploads 폴더와 연결
  // 빌드 후(dist/) 기준으로 한 칸 위(..)인 /web/uploads 폴더를 바라보게 됩니다.
  // app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads/' });

  // 가비아 필수 사항: 8080 포트 적용
  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Application is running on port: ${port}`);
}
bootstrap();
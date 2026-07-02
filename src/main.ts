import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 (아까 만든 클라우드플레어 프론트엔드 주소 허용)
  app.enableCors({
    origin: 'https://daoncne.co.kr',
    credentials: true,
  });

  // /uploads 경로로 들어오는 요청을 uploads 폴더와 연결
  // 빌드 후(dist/) 기준으로 한 칸 위(..)인 /web/uploads 폴더를 바라보게 됩니다.
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // 가비아 필수 사항: 8080 포트 적용
  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Application is running on port: ${port}`);
}
bootstrap();
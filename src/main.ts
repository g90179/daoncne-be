import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  // 중요: /uploads 경로로 들어오는 요청을 uploads 폴더와 연결
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  
  await app.listen(3001);
}
bootstrap();
// daon-backend/src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Prisma 서비스가 정의된 모듈
import { AuthModule } from '../auth/auth.module'; // 인증 기능을 쓰기 위해 추가

@Module({
  imports: [
    PrismaModule, // DB 접근을 위해 필요
    AuthModule,   // Guard(인증)를 쓰기 위해 필요
  ],
  controllers: [PostsController],
})
export class PostsModule {}
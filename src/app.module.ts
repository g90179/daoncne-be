import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PostsController } from './posts/posts.controller'; // 1. 임포트 확인
import { CompanyModule } from './company/company.module'; // ✅ 추가
import { QuotesModule } from './quotes/quotes.module'; // 견적문의 모듈 추가

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CompanyModule,
    QuotesModule,
  ],
  controllers: [AppController, PostsController],
  providers: [AppService],
})
export class AppModule {}

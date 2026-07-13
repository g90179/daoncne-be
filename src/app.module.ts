// daon-backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core'; // ✨ 전역 가드 등록을 위해 필수
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module'; // 1. PostsModule 임포트
import { CompanyModule } from './company/company.module'; // ✅ 추가
import { QuotesModule } from './quotes/quotes.module'; // 견적문의 모듈 추가
import { MainSlidesModule } from './main-slides/main-slides.module'; // 메인 슬라이드 모듈 추가
import { PoliciesModule } from './policies/policies.module'; // 정책관리
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'; // ✨ 전역 가드로 사용할 Guard 임포트
import { RssController } from './rss/rss.controller'; // rss

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CompanyModule,
    QuotesModule,
    MainSlidesModule,
    PoliciesModule,
    PostsModule
  ],
  controllers: [AppController, RssController],
  providers: [
    AppService,
    // 🔑 전역 가드(Global Guard) 설정
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

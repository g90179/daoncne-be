// daon-backend/src/quotes/quotes.module.ts
import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt'; // 👈 추가
import { MailModule } from '../mail/mail.module';

// 🔷 기존에 이미 토큰 인증 처리를 수행하고 있는 AuthModule을 불러옵니다.
// (💡 프로젝트 구조에 맞춰 auth.module.ts의 실제 경로를 정확히 지정해 주세요)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule, // 👈 🛠️ JwtModule.register 대신 실제 인증 컨텍스트를 통째로 주입하여 401 인증 오류를 해결합니다.
    // 🛠️ [경고 제거] 가드가 먹통이 되지 않도록 기존 서버의 JWT_SECRET 설정을 주입합니다.
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'YOUR_SECRET_KEY', // AuthModule과 동일한 키 지정
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
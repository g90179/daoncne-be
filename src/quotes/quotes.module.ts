// daon-backend/src/quotes/quotes.module.ts
import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt'; // 👈 추가
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
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
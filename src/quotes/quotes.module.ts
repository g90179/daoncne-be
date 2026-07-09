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
    JwtModule // 👈 가드가 JwtService를 인식할 수 있도록 임포트 단에 주입합니다.
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
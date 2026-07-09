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
    JwtModule.register({
      // 🔑 하드코딩된 'secretKey' 대신 .env 값을 참조합니다.
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
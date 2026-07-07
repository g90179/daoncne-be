// daon-backend/src/quotes/quotes.module.ts
import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../prisma/prisma.module'; // 프로젝트 내부 PrismaModule 경로에 맞춤
import { MailService } from '../mail/mail.service'; // 🔑 신규 메일 서비스 임포트 추가

@Module({
  imports: [PrismaModule],
  controllers: [QuotesController],
  providers: [
    QuotesService,
    MailService // 🔑 MailService를 공급처(providers)에 추가하여 QuotesService가 가져다 쓸 수 있게 만듭니다!
  ],
})
export class QuotesModule {}
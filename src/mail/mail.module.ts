// daon-backend/src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // 🔑 AuthService에서 주입받을 수 있도록 반드시 내보내야 합니다!
})
export class MailModule {}
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module'; // 1. UsersModule 임포트 추가
import { MailModule } from '../mail/mail.module'; // 🔑 성현 님의 메일 모듈 임포트

@Module({
  imports: [
    PrismaModule,
    UsersModule, // 2. 여기에 UsersModule 추가
    PassportModule,
    MailModule, // 🔑 여기에 주입해야 AuthService에서 MailService를 에러 없이 쓸 수 있습니다.
    JwtModule.register({
      secret: 'secretKey',
      signOptions: { expiresIn: '60m' },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}

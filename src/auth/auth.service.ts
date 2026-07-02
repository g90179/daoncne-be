import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service'; // PrismaService 임포트 확인

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, // UsersService 대신 PrismaService를 직접 주입
    private jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    console.log(`[로그인 시도] 이메일: |${email}|, 비번: |${pass}|`);

    // this.usersService 대신 직접 prisma 호출 (현재 상황에서 가장 확실함)
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ 결과: DB에서 해당 이메일의 사용자를 찾지 못했습니다.');
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }

    console.log(`✅ 유저 발견! DB 비밀번호: |${user.password}|`);

    if (user.password !== pass) {
      console.log('❌ 결과: 비밀번호 불일치 (문자열 비교 실패)');
      console.log(`- 입력 비번 길이: ${pass.length}, DB 비번 길이: ${user.password.length}`);
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}

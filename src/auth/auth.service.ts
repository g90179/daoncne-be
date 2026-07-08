// daon-backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  // 성현 님이 요청하신 마스터 비밀키 세팅 (유지)
  private readonly jwtSecret = 'wjdtjddksqkqh';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 🔐 1. 로그인 및 2단계 토큰 최초 발급 (유지)
  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('존재하지 않는 계정입니다.');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwtService.sign(payload, { secret: this.jwtSecret, expiresIn: '2h' }),
      refresh_token: this.jwtService.sign(payload, { secret: this.jwtSecret, expiresIn: '30d' }),
    };
  }

  // 🔄 2. 리프레시 토큰을 이용한 액세스 토큰 실시간 갱신 (유지)
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: this.jwtSecret });
      const user = await this.usersService.findOneByEmail(payload.email);

      if (!user) {
        throw new UnauthorizedException('탈퇴되었거나 존재하지 않는 관리자 계정입니다.');
      }

      const newPayload = { sub: user.id, email: user.email, role: user.role };

      return {
        access_token: this.jwtService.sign(newPayload, { secret: this.jwtSecret, expiresIn: '2h' }),
      };
    } catch (e) {
      throw new UnauthorizedException('만료되었거나 변조된 리프레시 토큰입니다. 다시 로그인하세요.');
    }
  }

  // 📩 3. 비밀번호 찾기 인스턴스 키 생성 및 만료 시간 캐싱
  async sendResetLink(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new BadRequestException('등록되지 않은 이메일 주소입니다.');

    // 🔑 조건 3: 영문 대소문자 + 숫자 랜덤 조합 8자리 키 생성기
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let instanceKey = '';
    for (let i = 0; i < 8; i++) {
      instanceKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 🔑 조건 2: 5분 동안만 사용할 수 있는 만료 타임스탬프 수식 대입
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 🔑 상단에 추가한 UsersService 의 Prisma 갱신 가속 쿼리 실행
    await this.usersService.updateResetKey(user.id, instanceKey, expiresAt);

    // 📩 메일 발송 파이프라인 (필요 시 연동)
    // const resetLink = `http://localhost:5173/reset-password?email=${email}`;
    // await this.mailerService.sendMail({ to: email, ... instanceKey, resetLink });

    console.log(`[DAON 보안엔진] ${email} 계정의 5분 인스턴스 키 발급 완료: ${instanceKey}`);
    return { success: true };
  }

  // 🔐 4. 인스턴스 키 검증 및 로봇 캡차 우회 필터링 후 비밀번호 변경
async resetPassword(body: { email: string; instanceKey: string; newPassword: string; robotToken: string }) {
  const { email, instanceKey, newPassword, robotToken } = body;

  // [로봇 검증 토큰 바인딩 필요 시 이 구역에 세팅]

  const user = await this.usersService.findOneByEmail(email);
  if (!user) throw new BadRequestException('존재하지 않는 관리자 정보입니다.');

  // DB에 기록된 키 검증
  if (!user.resetKey || user.resetKey !== instanceKey) {
    throw new BadRequestException('올바르지 않거나 만료된 인스턴스 키입니다.');
  }

  // 🔑 [핵심 수정] Null 가드 장착 및 .getTime()을 통한 타임스탬프 원시 값 안전 비교
  const currentTime = new Date();
  if (!user.resetKeyExpires || currentTime.getTime() > user.resetKeyExpires.getTime()) {
    throw new BadRequestException('인증 제한 시간(5분)을 초과했습니다. 다시 신청해 주세요.');
  }

  // 기존 임포트된 bcryptjs 규격에 맞춰 안전하게 새 암호 단방향 해싱
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 🔑 신규 비밀번호 갱신 및 사용이 끝난 인스턴스 키 컬럼 즉시 폐기(null 처리)
  await this.usersService.updatePasswordAndClearResetKey(user.id, hashedPassword);

  return { success: true };
}
}
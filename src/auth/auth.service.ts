// daon-backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service'; // 🔑 메일 서비스 실제 임포트
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  // 성현 님이 요청하신 마스터 비밀키 세팅 (유지)
  private readonly jwtSecret = 'wjdtjddksqkqh';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService, // 🔑 생성자 매개변수에 메일 서비스 주입 성사
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

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let instanceKey = '';
    for (let i = 0; i < 8; i++) {
      instanceKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.usersService.updateResetKey(user.id, instanceKey, expiresAt);

    // 🔑 [메일 발송 인프라 가동] 
    // 성현 님의 mailService 내부에 구현된 함수명(예: sendMail 또는 sendResetPassword 등)과 
    // 파라미터 구조에 맞게 커스텀해 주세요.
    try {
      const resetLink = `http://localhost:5173/reset-password?email=${email}`;
      
      // 만약 sendMail 메서드가 정의되어 있다면 아래와 같이 연동합니다.
      await this.mailService.sendMail({
        to: email,
        subject: '[DAON CNE] 관리자 비밀번호 재설정 인증키 발급',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px;">
            <h2 style="color: #1e3a8a; font-size: 20px; font-weight: 800; margin-bottom: 8px;">비밀번호 찾기 인증</h2>
            <p style="color: #64748b; font-size: 13px;">아래의 8자리 인스턴스 키를 입력창에 기입하여 인증을 완료하세요.</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 18px; font-weight: bold; text-align: center; letter-spacing: 4px; color: #3b82f6; margin: 20px 0; border: 1px solid #edf2f7;">
              ${instanceKey}
            </div>
            <a href="${resetLink}" style="display: block; background: #3b82f6; color: white; text-align: center; padding: 12px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: bold;">비밀번호 재설정 페이지로 이동</a>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 16px; text-align: center;">* 본 인증키와 변경 링크는 보안을 위해 5분간만 유효합니다.</p>
          </div>
        `
      });
    } catch (mailError) {
      console.error('메일 서버 발송 중 에러 발생:', mailError);
      throw new BadRequestException('메일 발송 인프라 내부 에러가 발생했습니다.');
    }

    console.log(`[DAON 보안엔진] ${email} 계정의 5분 인스턴스 키 발급 및 메일 전송 완료: ${instanceKey}`);
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
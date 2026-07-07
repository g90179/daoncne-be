// daon-backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  // 성현 님이 요청하신 마스터 비밀키 세팅
  private readonly jwtSecret = 'wjdtjddksqkqh';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 🔐 1. 로그인 및 2단계 토큰 최초 발급
  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('존재하지 않는 계정입니다.');

    // bcryptjs 비밀번호 대조 검증
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    // 토큰에 담을 유저 메타데이터 페이로드
    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      // 액세스 토큰: 2시간 유효
      access_token: this.jwtService.sign(payload, { secret: this.jwtSecret, expiresIn: '2h' }),
      // 리프레시 토큰: 1달(30일) 유효
      refresh_token: this.jwtService.sign(payload, { secret: this.jwtSecret, expiresIn: '30d' }),
    };
  }

  // 🔄 2. 리프레시 토큰을 이용한 액세스 토큰 실시간 갱신 (보안 강화 버전)
  async refresh(refreshToken: string) {
    try {
      // 리프레시 토큰 복호화 및 위변조 서명 검증
      const payload = this.jwtService.verify(refreshToken, { secret: this.secret });
      
      // 🔑 [핵심 수정] 토큰 안의 옛날 데이터 대신, DB에서 현재 최신 유저 상태를 특수 조회합니다.
      const user = await this.usersService.findOneByEmail(payload.email);
      
      // 그 사이 계정이 삭제되었거나 정지된 경우 차단
      if (!user) {
        throw new UnauthorizedException('탈퇴되었거나 존재하지 않는 관리자 계정입니다.');
      }

      // 🔑 [동기화] 계정 관리 탭에서 변경된 가장 최신의 등급(role) 정보를 반영하여 새 페이로드 조립
      const newPayload = { sub: user.id, email: user.email, role: user.role };
      
      return {
        // 새로 가동되는 2시간짜리 갱신 액세스 토큰 리턴
        access_token: this.jwtService.sign(newPayload, { secret: this.jwtSecret, expiresIn: '2h' }),
      };
    } catch (e) {
      throw new UnauthorizedException('만료되었거나 변조된 리프레시 토큰입니다. 다시 로그인하세요.');
    }
  }
}
// daon-backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly jwtSecret = 'wjdtjddksqkqh';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 로그인 및 2단계 토큰 발급
  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('존재하지 않는 계정입니다.');

    // bcrypt 비밀번호 대조 검증
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwtService.sign(payload, { secret: this.jwtSecret, expiresIn: '2h' }),
      refresh_token: this.jwtService.sign(payload, { secret: this.jwtSecret, expiresIn: '30d' }),
    };
  }

  // 리프레시 토큰을 이용한 액세스 토큰 갱신
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: this.jwtSecret });
      const newPayload = { sub: payload.sub, email: payload.email, role: payload.role };
      
      return {
        access_token: this.jwtService.sign(newPayload, { secret: this.jwtSecret, expiresIn: '2h' }),
      };
    } catch (e) {
      throw new UnauthorizedException('만료되었거나 변조된 리프레시 토큰입니다.');
    }
  }
}
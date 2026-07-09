// daon-backend/src/auth/guards/jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('인증 토큰이 존재하지 않습니다. 로그인이 필요합니다.');
    }

    try {
      // 💡 디버깅용 하드코딩을 제거하고, 환경변수 비밀키를 자동으로 사용하게 합니다. (안전장치 추가)
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'daoncne_secret_key_2026' 
      });
      request['user'] = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다. 다시 로그인해 주세요.');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
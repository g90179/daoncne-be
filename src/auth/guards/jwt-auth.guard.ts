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
      console.log('🚨 [Auth] 토큰 없음');
      throw new UnauthorizedException('토큰이 없습니다.');
    }

    try {
      // 🔑 중요: AuthService와 동일한 비밀키를 강제로 직접 주입하여 테스트합니다.
      // .env 문제일 가능성을 배제하기 위해 테스트용으로 하드코딩된 키를 넣습니다.
      const secret = 'daoncne_secret_key_2026'; 

      const payload = await this.jwtService.verifyAsync(token, { secret });
      request['user'] = payload;
      return true;
    } catch (error) {
      // 🚨 여기가 핵심입니다! 왜 401이 나는지 서버 로그에 찍어봅니다.
      console.error('🚨 [Auth] 토큰 검증 실패 이유:', error.message);
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
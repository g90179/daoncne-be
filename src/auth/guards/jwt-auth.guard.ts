// daon-backend/src/auth/guards/jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // 로그인 시 사용하셨던 JwtService를 주입받습니다.
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // 프론트엔드 Axios 인터셉터가 보낸 Bearer 토큰 추출
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('인증 토큰이 존재하지 않습니다. 로그인이 필요합니다.');
    }

    try {
      // 토큰 복호화 및 유효성 검증
      // 💡 암호화 키(secret)는 기존 auth 설정이나 .env 파일에 맞춰 'YOUR_SECRET_KEY' 부분을 수정해 주세요.
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'YOUR_SECRET_KEY', 
      });

      // 요청(request) 객체에 유저 정보를 탑재하여 컨트롤러로 넘겨줍니다.
      request['user'] = payload;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다. 다시 로그인해 주세요.');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
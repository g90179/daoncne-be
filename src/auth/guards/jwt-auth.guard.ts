// daon-backend/src/auth/guards/jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core'; // ✨ 추가: 메타데이터 읽기용
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'; // ✨ 추가: Public 데코레이터 키

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector // ✨ 추가: Reflector 주입
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 🔑 1. 해당 핸들러(메서드)나 클래스(컨트롤러)에 @Public()이 붙어 있는지 확인
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ✨ 디버깅 로그 추가
    console.log(`[AuthGuard] 요청 경로: ${context.getClass().name}.${context.getHandler().name}, isPublic: ${isPublic}`);

    // 🔑 2. 공개(Public)라면 인증 체크 없이 바로 통과!
    if (isPublic) {
      return true;
    }

    // 3. 기존 인증 로직 (공개 API가 아니라면 아래가 실행됨)
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('인증 토큰이 존재하지 않습니다. 로그인이 필요합니다.');
    }

    try {
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
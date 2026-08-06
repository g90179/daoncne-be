// daon-backend/src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator'; // ✨ import 추가

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🔐 1. 로그인 컨트롤러 (유지)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; pass?: string; password?: string }) {
    // any 캐스팅 없이 안전하게 접근 가능
    const passwordToUse = body.password || body.pass;
    return this.authService.login(body.email, passwordToUse);
  }

  // 🔄 2. 토큰 리프레시 컨트롤러 (유지)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  // 📩 3. [신규 추가] 비밀번호 찾기 링크 및 인스턴스 키 요청 엔드포인트
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.sendResetLink(body.email);
  }

  // 🔐 4. [신규 추가] 인스턴스 키 검증 후 비밀번호 최종 변경 엔드포인트
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { email: string; instanceKey: string; newPassword: string; robotToken: string }
  ) {
    return this.authService.resetPassword(body);
  }
}
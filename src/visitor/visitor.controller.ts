// src/visitor/visitor.controller.ts
import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { VisitorService } from './visitor.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 관리자 인증 가드 (선택 적용)

@Controller('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  // 프론트엔드에서 페이지 진입 시 호출하는 로그 수집 API (누구나 접근 가능)
  @Post('log')
  async logVisit(@Req() req: any, @Body() body: { path: string }) {
    return await this.visitorService.logVisitor(req, body);
  }

  // 관리자 모드에서 호출하는 통계 조회 API
  // @UseGuards(JwtAuthGuard) // 관리자 토큰 검증 필요시 주석 해제
  @Get('admin')
  async getVisitorLogs(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return await this.visitorService.findAll(Number(page), Number(limit));
  }
}
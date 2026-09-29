// src/visitor/visitor.controller.ts
import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { VisitorService } from './visitor.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  // 로그인 안 한 일반 방문자도 기록돼야 하는데 @Public()이 빠져 있어서 전부 401로
  // 막히고 있었다 - 로그인한 관리자 본인의 방문만 찍히던 원인이 이거였다.
  @Public()
  @Post('log')
  async logVisit(@Req() req: any, @Body() body: { path: string }) {
    return await this.visitorService.logVisitor(req, body);
  }

  @Get('admin')
  async getVisitorLogs(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return await this.visitorService.findAll(Number(page), Number(limit));
  }
}
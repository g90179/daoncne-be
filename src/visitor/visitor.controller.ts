// src/visitor/visitor.controller.ts
import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { VisitorService } from './visitor.service';

@Controller('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post('log')
  async logVisit(@Req() req: any, @Body() body: { path: string }) {
    return await this.visitorService.logVisitor(req, body);
  }

  @Get('admin')
  async getVisitorLogs(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return await this.visitorService.findAll(Number(page), Number(limit));
  }
}
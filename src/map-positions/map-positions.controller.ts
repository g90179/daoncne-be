// daon-backend/src/map-positions/map-positions.controller.ts
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { MapPositionsService } from './map-positions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('map-positions')
export class MapPositionsController {
  constructor(private readonly service: MapPositionsService) {}

  // ✨ 누구나 조회 가능 (방문자들이 초기 위치를 받아가야 하므로)
  @Public()
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // 👑 관리자만 저장 가능
  @UseGuards(JwtAuthGuard)
  @Put()
  saveAll(@Body() body: { positions: { locationKey: string; offsetXPct: number; offsetYPct: number }[] }) {
    return this.service.saveAll(body.positions);
  }
}
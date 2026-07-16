// daon-backend/src/map-positions/map-positions.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PositionInput {
  locationKey: string;
  offsetXPct: number;
  offsetYPct: number;
}

@Injectable()
export class MapPositionsService {
  constructor(private readonly prisma: PrismaService) {}

  // 프론트에서 바로 쓰기 편하도록 { locationKey: { xPct, yPct } } 형태로 반환
  async findAll() {
    const rows = await this.prisma.mapTooltipPosition.findMany();
    const map: Record<string, { xPct: number; yPct: number }> = {};
    rows.forEach(r => {
      map[r.locationKey] = { xPct: r.offsetXPct, yPct: r.offsetYPct };
    });
    return map;
  }

  async saveAll(positions: PositionInput[]) {
    if (!Array.isArray(positions) || positions.length === 0) {
      return { success: false, message: '저장할 위치 데이터가 없습니다.' };
    }

    await this.prisma.$transaction(
      positions.map(p =>
        this.prisma.mapTooltipPosition.upsert({
          where: { locationKey: p.locationKey },
          update: { offsetXPct: p.offsetXPct, offsetYPct: p.offsetYPct },
          create: { locationKey: p.locationKey, offsetXPct: p.offsetXPct, offsetYPct: p.offsetYPct },
        })
      )
    );

    return { success: true };
  }
}
// daon-backend/src/map-positions/map-positions.module.ts
import { Module } from '@nestjs/common';
import { MapPositionsController } from './map-positions.controller';
import { MapPositionsService } from './map-positions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MapPositionsController],
  providers: [MapPositionsService],
})
export class MapPositionsModule {}
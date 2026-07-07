// daon-backend/src/main-slides/main-slides.module.ts
import { Module } from '@nestjs/common';
import { MainSlidesController } from './main-slides.controller';
import { MainSlidesService } from './main-slides.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MainSlidesController],
  providers: [MainSlidesService, PrismaService],
})
export class MainSlidesModule {}
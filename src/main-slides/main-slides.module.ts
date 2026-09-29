// daon-backend/src/main-slides/main-slides.module.ts
import { Module } from '@nestjs/common';
import { MainSlidesController } from './main-slides.controller';
import { MainSlidesService } from './main-slides.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module'; // 업로드 파일 저장(R2)

@Module({
  imports: [StorageModule],
  controllers: [MainSlidesController],
  providers: [MainSlidesService, PrismaService],
  exports: [MainSlidesService],
})
export class MainSlidesModule {}
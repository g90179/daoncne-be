// daon-backend/src/brochure/brochure.module.ts
import { Module } from '@nestjs/common';
import { BrochureController } from './brochure.controller';
import { BrochureService } from './brochure.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module'; // 업로드 파일 저장(R2)

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [BrochureController],
  providers: [BrochureService],
})
export class BrochureModule {}
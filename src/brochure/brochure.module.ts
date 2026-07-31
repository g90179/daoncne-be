// daon-backend/src/brochure/brochure.module.ts
import { Module } from '@nestjs/common';
import { BrochureController } from './brochure.controller';
import { BrochureService } from './brochure.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrochureController],
  providers: [BrochureService],
})
export class BrochureModule {}
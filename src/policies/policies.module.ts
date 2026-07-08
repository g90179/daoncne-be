// daon-backend/src/policies/policies.module.ts
import { Module } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PoliciesController],
  providers: [PoliciesService],
})
export class PoliciesModule {}
// daon-backend/src/stamp/stamp.module.ts
import { Module } from '@nestjs/common';
import { StampController } from './stamp.controller';
import { StampService } from './stamp.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StampController],
  providers: [StampService],
})
export class StampModule {}
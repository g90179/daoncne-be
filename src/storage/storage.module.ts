// daon-backend/src/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { R2Service } from './r2.service';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [R2Service],
  exports: [R2Service],
})
export class StorageModule {}

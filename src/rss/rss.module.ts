// daon-backend\src\rss\rss.module.ts
import { Module } from '@nestjs/common';
import { RssController } from './rss.controller';
import { PrismaModule } from '../prisma/prisma.module'; // PrismaService 사용을 위해 필요

@Module({
  imports: [PrismaModule],
  controllers: [RssController],
})
export class RssModule {}
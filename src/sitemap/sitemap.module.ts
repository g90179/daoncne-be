import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SitemapController],
})
export class SitemapModule {}
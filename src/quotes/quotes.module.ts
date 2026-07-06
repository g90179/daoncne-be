// daon-backend/src/quotes/quotes.module.ts
import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../prisma/prisma.module'; // 프로젝트 내부 PrismaModule 경로에 맞춤

@Module({
  imports: [PrismaModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
// daon-backend/src/quotes/quotes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // 프로젝트 내부 PrismaService 경로에 맞춤
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQuoteDto: CreateQuoteDto) {
    return await this.prisma.quote.create({
      data: createQuoteDto,
    });
  }

  async findAll() {
    return await this.prisma.quote.findMany({
      orderBy: {
        id: 'desc',
      },
    });
  }
}
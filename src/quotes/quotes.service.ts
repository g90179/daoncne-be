import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    const newQuote = this.quoteRepository.create(createQuoteDto);
    return await this.quoteRepository.save(newQuote);
  }

  async findAll(): Promise<Quote[]> {
    // 최신글이 상단에 배치되도록 내림차순 정렬하여 리스트 반환
    return await this.quoteRepository.find({
      order: { id: 'DESC' },
    });
  }
}
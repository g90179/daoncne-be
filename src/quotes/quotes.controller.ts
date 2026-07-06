// src/quotes/quotes.controller.ts
import { Controller, Get, Post, Body, Param, Put, ParseIntPipe, Headers } from '@nestjs/common'; // 🔑 Headers 임포트 추가!
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('captcha')
  getCaptcha() {
    return this.quotesService.generateCaptcha();
  }

  @Post()
  async create(
    @Body() createQuoteDto: CreateQuoteDto,
    // 🛡️ 가비아 WAF 우회를 위해 헤더 객체 전체를 통째로 안전하게 가져옵니다.
    @Headers() headers: Record<string, string>,
  ) {
    // HTTP 프로토콜 규칙에 따라 헤더 Key 명칭은 백엔드 내부적으로 자동 소문자 처리됩니다.
    const plt = headers['x-stealth-plt'];
    const ans = headers['x-stealth-ans'];
    const cc = headers['x-stealth-cc'];
    const exp = headers['x-stealth-exp'];

    return this.quotesService.create(createQuoteDto, {
      plt: plt ? parseInt(plt, 10) : 0,
      ans: ans || '',
      cc: cc || '',
      exp: exp ? parseInt(exp, 10) : 0,
    });
  }

  @Get()
  findAll() {
    return this.quotesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotesService.findOne(id);
  }

  @Post(':id/verify')
  verify(@Param('id', ParseIntPipe) id: number, @Body('password') password: string) {
    return this.quotesService.verifyAndPassword(id, password);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateQuoteDto: UpdateQuoteDto) {
    return this.quotesService.update(id, updateQuoteDto);
  }

  @Put(':id/reply')
  addReply(@Param('id', ParseIntPipe) id: number, @Body('reply') reply: string) {
    return this.quotesService.addReply(id, reply);
  }
}
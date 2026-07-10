// src/quotes/quotes.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('init')
  initToken() {
    return this.quotesService.initToken();
  }

  @Get('quiz')
  getQuiz() {
    return this.quotesService.generateCaptcha();
  }

  // 비로그인 사용자 문의 접수 (가드 없음)
  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
  }

  @Public()
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

  /**
   * 🔓 [공용] 특정 견적 문의글 수정
   * 비로그인 사용자는 Body에 password를 포함하여 본인 확인을 진행합니다.
   */
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateQuoteDto: UpdateQuoteDto
  ) {
    // 서비스단에서 dto 내부의 password를 확인하여 수정 권한을 부여합니다.
    return this.quotesService.update(id, updateQuoteDto);
  }

  /**
   * 👑 [관리자 전용] 특정 견적 문의글 답변 등록
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id/reply')
  addReply(@Param('id', ParseIntPipe) id: number, @Body('reply') reply: string) {
    return this.quotesService.addReply(id, reply);
  }

  /**
   * 🔓 [공용] 특정 견적 문의글 완전 삭제
   * JwtAuthGuard를 제거하여 비로그인 사용자도 password 확인을 통해 삭제 가능하도록 변경
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string // 본인 확인용 비밀번호
  ) {
    // 서비스단에서 관리자 여부 확인 혹은 password 일치 여부 확인 후 삭제 수행
    return await this.quotesService.remove(id, password);
  }
}
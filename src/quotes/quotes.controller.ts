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

  @Public() // ✨ 비로그인 사용자 폼 접근 허용 (인증 만료 알림 해결)
  @Get('init')
  initToken() {
    return this.quotesService.initToken();
  }

  @Public() // ✨ 비로그인 사용자 캡차 접근 허용
  @Get('quiz')
  getQuiz() {
    return this.quotesService.generateCaptcha();
  }

  @Public() // ✨ 비로그인 사용자 문의 접수 허용
  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
  }

  @Public() // ✨ 전체 목록 조회 허용
  @Get()
  findAll() {
    return this.quotesService.findAll();
  }

  @Public() // ✨ 비로그인 사용자 상세 보기 접근 허용
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotesService.findOne(id);
  }

  @Public() // ✨ 비로그인 사용자 비밀번호 인증 기능 허용
  @Post(':id/verify')
  verify(@Param('id', ParseIntPipe) id: number, @Body('password') password: string) {
    return this.quotesService.verifyAndPassword(id, password);
  }

  /**
   * 🔓 [공용] 특정 견적 문의글 수정
   * 비로그인 사용자는 Body에 password를 포함하여 본인 확인을 진행합니다.
   */
  @Public() // ✨ 비로그인 사용자 수정 접근 허용
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateQuoteDto: UpdateQuoteDto
  ) {
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
  @Public() // ✨ 비로그인 사용자 삭제 접근 허용
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string // 본인 확인용 비밀번호
  ) {
    // 💡 서비스로 id와 password 2개를 넘깁니다. (TS 에러 원인 위치)
    return await this.quotesService.remove(id, password);
  }
}
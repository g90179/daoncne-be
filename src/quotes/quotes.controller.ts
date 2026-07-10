// src/quotes/quotes.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, // 👈 추가
  Param, 
  Body, 
  UseGuards, // 👈 추가
  ParseIntPipe, 
  HttpCode, // 👈 추가
  HttpStatus // 👈 추가
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
// 2. 관리자 인증 가드인 JwtAuthGuard를 불러옵니다.
// 💡 프로젝트 내부의 실제 auth guard 파일 주소 위치에 맞게 경로(../ 등)를 확인해 주세요.
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


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

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.quotesService.findAll(); // { success: true, data: [...] } 가 반환됨
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

  /**
   * 👑 [관리자 전용] 특정 견적 문의글 완전 삭제
   * DELETE /quotes/:id
   */
  @UseGuards(JwtAuthGuard) // 🔒 인가되지 않은 비로그인 사용자의 악의적 API 호출을 원천 차단합니다.
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.quotesService.remove(id);
  }
}
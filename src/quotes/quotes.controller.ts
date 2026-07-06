// src/quotes/quotes.controller.ts
import { Controller, Get, Post, Body, Param, Put, ParseIntPipe } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(createQuoteDto);
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
//daon-backend\src\main-slides\main-slides.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe } from '@nestjs/common';
import { MainSlidesService } from './main-slides.service';
import { CreateMainSlideDto } from './dto/create-main-slide.dto';
import { UpdateMainSlideDto } from './dto/update-main-slide.dto';

@Controller('main-slides')
export class MainSlidesController {
  constructor(private readonly mainSlidesService: MainSlidesService) {}

  @Post()
  create(@Body() createMainSlideDto: CreateMainSlideDto) {
    return this.mainSlidesService.create(createMainSlideDto);
  }

  @Get()
  findAll() {
    return this.mainSlidesService.findAll();
  }

  @Get('exposed') // 🌍 대문 배너 호출 전용 라우터 (Public)
  findExposed() {
    return this.mainSlidesService.findExposed();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mainSlidesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMainSlideDto: UpdateMainSlideDto) {
    return this.mainSlidesService.update(id, updateMainSlideDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mainSlidesService.remove(id);
  }
}
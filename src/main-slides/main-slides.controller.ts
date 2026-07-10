//daon-backend\src\main-slides\main-slides.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { MainSlidesService } from './main-slides.service';
import { CreateMainSlideDto } from './dto/create-main-slide.dto';
import { UpdateMainSlideDto } from './dto/update-main-slide.dto';
import { Public } from '../auth/decorators/public.decorator'; // ✨ import 추가

@Controller('main-slides')
export class MainSlidesController {
  constructor(private readonly mainSlidesService: MainSlidesService) {}

  // 🎬 [신규 추가] 대용량 비디오 업로드 엔진 (최대 200MB 허용 설정)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/slides';
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `slide-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 200 * 1024 * 1024 }, // 🛡️ 200MB까지 파일 제한 확장
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(mp4|webm|ogg|quicktime)$/)) {
          return cb(new BadRequestException('비디오 파일(.mp4, .webm 등)만 업로드할 수 있습니다.'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 정상적으로 업로드되지 않았습니다.');
    }
    // 프론트엔드에서 고유 스태틱 자원으로 접근할 수 있는 정적 릴레이션 경로 반환
    return { videoUrl: `/uploads/slides/${file.filename}` };
  }

  @Post()
  create(@Body() createMainSlideDto: CreateMainSlideDto) {
    return this.mainSlidesService.create(createMainSlideDto);
  }

  @Public()
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
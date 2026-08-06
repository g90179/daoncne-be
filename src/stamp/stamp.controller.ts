// daon-backend/src/stamp/stamp.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { StampService, StampPlacement } from './stamp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stamp')
@UseGuards(JwtAuthGuard) // 👑 도장 관련 기능은 전부 관리자 로그인 필요
export class StampController {
  constructor(private readonly stampService: StampService) {}

  // ✨ 프론트 미리보기에서 도장 이미지를 보여주기 위한 엔드포인트
  @Get('seal-image')
  async getSealImage(@Res() res: Response) {
    const filePath = path.join(process.cwd(), 'assets', 'stamp', 'stamp.png');
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('등록된 도장 이미지가 없습니다.');
    }
    res.sendFile(filePath);
  }

  // ✨ 계약서 PDF + 도장 위치 정보를 받아 합성된 PDF를 반환
  @Post('apply')
  @UseInterceptors(FileInterceptor('contract', { storage: memoryStorage() }))
  async apply(
    @UploadedFile() contract: Express.Multer.File,
    @Body('placements') placementsRaw: string,
    @Res() res: Response,
  ) {
    if (!contract) throw new BadRequestException('계약서 PDF 파일이 필요합니다.');

    let placements: StampPlacement[];
    try {
      placements = JSON.parse(placementsRaw);
    } catch (e) {
      throw new BadRequestException('placements 형식이 올바르지 않습니다.');
    }

    const resultBytes = await this.stampService.applyStamps(contract.buffer, placements);

    const originalName = Buffer.from(contract.originalname, 'latin1').toString('utf8');
    const stampedName = originalName.replace(/\.pdf$/i, '') + '_도장.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(stampedName)}"`);
    res.send(Buffer.from(resultBytes));
  }
}
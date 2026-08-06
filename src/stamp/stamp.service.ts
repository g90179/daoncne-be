// daon-backend/src/stamp/stamp.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface StampPlacement {
  page: number;    // 0-based 페이지 인덱스
  xPct: number;    // 페이지 가로 기준 도장 중심 위치 (0~100)
  yPct: number;    // 페이지 세로 기준 도장 중심 위치 (0~100, 위에서부터)
  widthPct: number; // 페이지 가로 대비 도장 너비 비율 (0~100)
}

@Injectable()
export class StampService {
  private stampPath() {
    return path.join(process.cwd(), 'assets', 'stamp', 'stamp.png');
  }

  async applyStamps(pdfBuffer: Buffer, placements: StampPlacement[]): Promise<Uint8Array> {
    if (!fs.existsSync(this.stampPath())) {
      throw new BadRequestException('서버에 등록된 도장 이미지(stamp.png)가 없습니다.');
    }
    if (!placements || placements.length === 0) {
      throw new BadRequestException('도장을 찍을 위치 정보가 없습니다.');
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const stampBytes = fs.readFileSync(this.stampPath());
    const stampImage = await pdfDoc.embedPng(stampBytes);
    const stampAspect = stampImage.height / stampImage.width;

    for (const p of placements) {
      const pages = pdfDoc.getPages();
      if (p.page < 0 || p.page >= pages.length) continue;

      const page = pages[p.page];
      const { width, height } = page.getSize();

      const stampWidth = width * (p.widthPct / 100);
      const stampHeight = stampWidth * stampAspect;

      // ✨ 프론트에서 준 좌표는 "도장 중심점" 기준이라, pdf-lib의 좌하단 원점에 맞춰 변환
      const centerX = width * (p.xPct / 100);
      const centerYFromTop = height * (p.yPct / 100);

      const x = centerX - stampWidth / 2;
      const y = height - centerYFromTop - stampHeight / 2;

      page.drawImage(stampImage, { x, y, width: stampWidth, height: stampHeight });
    }

    return pdfDoc.save();
  }
}
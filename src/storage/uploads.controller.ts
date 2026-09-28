// daon-backend/src/storage/uploads.controller.ts
// 예전엔 useStaticAssets 가 로컬 uploads/ 폴더를 "/uploads/*" 로 그대로 서빙했다. 이제 파일은
// R2에 있으므로, 같은 경로를 그대로 유지한 채 R2에서 읽어 스트리밍만 대신 해준다 - 그래야 DB에
// 이미 저장된 "/uploads/xxxx.ext" 값들과 게시글 본문(HTML)에 박힌 <img> 경로가 코드/데이터
// 변경 없이 계속 동작한다.
import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { R2Service } from './r2.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly r2: R2Service) {}

  @Public()
  @Get(':key')
  async serve(@Param('key') key: string, @Res() res: Response) {
    const file = await this.r2.get(key);
    if (!file) throw new NotFoundException('파일을 찾을 수 없습니다.');
    if (file.contentType) res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(file.buffer);
  }
}

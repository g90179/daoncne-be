// daon-backend/src/storage/uploads.controller.ts
// 예전엔 useStaticAssets 가 로컬 uploads/ 폴더를 "/uploads/*" 로 그대로 서빙했다. 이제 파일은
// R2에 있으므로 같은 경로를 그대로 유지한 채 R2로 넘겨준다 - 그래야 DB에 이미 저장된
// "/uploads/xxxx.ext" 값들과 게시글 본문(HTML)에 박힌 <img> 경로가 코드/데이터 변경 없이
// 계속 동작한다.
//
// R2_PUBLIC_URL 이 등록돼 있으면(R2 버킷을 공개로 전환한 경우) 파일을 컨테이너가 직접
// 버퍼링해서 보내는 대신 R2 공개 주소로 302 리다이렉트한다 - 이러면 이미지/동영상이 작은
// 컨테이너 인스턴스 하나를 거치지 않고 R2/Cloudflare 엣지에서 바로 내려가서 훨씬 빠르다.
// R2_PUBLIC_URL 이 없으면(아직 비공개면) 예전처럼 컨테이너가 직접 스트리밍해 하위 호환한다.
import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { R2Service } from './r2.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly r2: R2Service) {}

  // 마이그레이션 이전 main-slides 코드가 "/uploads/slides/xxx.mp4"처럼 하위 폴더를 쓰던
  // 시절의 URL이 DB에 남아있어, 그 경로도 따로 받는다(path-to-regexp v8은 Express 4 스타일
  // ":key*" 와일드카드를 지원하지 않아 명시적으로 라우트를 하나 더 둔다). 실제 R2 키는
  // 항상 파일명만(마지막 구간)이라 r2.keyFromUrlOrKey로 폴더 부분을 잘라낸다.
  @Public()
  @Get('slides/:key')
  async serveSlide(@Param('key') keyParam: string, @Res() res: Response) {
    return this.serve(keyParam, res);
  }

  @Public()
  @Get(':key')
  async serve(@Param('key') keyParam: string, @Res() res: Response) {
    const key = this.r2.keyFromUrlOrKey(keyParam);
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
    if (publicBase) {
      res.redirect(302, `${publicBase}/${encodeURIComponent(key)}`);
      return;
    }
    const file = await this.r2.get(key);
    if (!file) throw new NotFoundException('파일을 찾을 수 없습니다.');
    if (file.contentType) res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(file.buffer);
  }
}

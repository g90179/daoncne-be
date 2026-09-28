// (임시 디버그) 컨테이너 stdout을 파일로도 받아서 HTTP로 확인하기 위한 컨트롤러.
// 문제 해결 후 반드시 제거할 것.
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import * as fs from 'fs';

@Controller('debug-log')
export class DebugController {
  @Public()
  @Get()
  getLog() {
    try {
      return fs.readFileSync('/tmp/app.log', 'utf8').slice(-8000);
    } catch (e) {
      return 'no log yet: ' + (e as Error).message;
    }
  }
}

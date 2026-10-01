import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

/** DAON 운영 백엔드의 배포 버전 확인용 공개 엔드포인트. */
export const SYSTEM_VERSION = '1.0.00051';
const SYSTEM_STARTED_AT = new Date().toISOString();

@Public()
@Controller('system')
export class SystemController {
  @Get('version')
  version() {
    return { version: SYSTEM_VERSION, startedAt: SYSTEM_STARTED_AT };
  }
}

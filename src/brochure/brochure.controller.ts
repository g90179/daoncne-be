// daon-backend/src/brochure/brochure.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BrochureService } from './brochure.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('brochure')
export class BrochureController {
  constructor(private readonly brochureService: BrochureService) {}

  @Public()
  @Get('download')
  async download(@Res() res: Response) {
    await this.brochureService.generate(res);
  }
}
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
// 기존 posts/users에서 쓰는 인증 가드가 있다면 같은 걸 import 해서 POST에 적용해주세요.
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  getCompany() {
    return this.companyService.findOne();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  saveCompany(@Body() dto: any) {
    return this.companyService.upsert(dto);
  }
}
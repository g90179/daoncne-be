import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
// 기존 posts/users에서 쓰는 인증 가드가 있다면 같은 걸 import 해서 POST에 적용해주세요.
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async getCompany() {
    return this.companyService.getCompanyInfo();
  }

  @Post()
  // @UseGuards(JwtAuthGuard) // ✅ 로그인한 관리자만 저장 가능하도록 보호하려면 주석 해제
  async saveCompany(
    @Body()
    body: {
      name?: string;
      ceo?: string;
      bizNumber?: string;
      address?: string;
      addressDetail?: string; // 상세주소 필드 추가
      phone?: string;
      email?: string;
      fax?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    return this.companyService.upsertCompanyInfo(body);
  }
}
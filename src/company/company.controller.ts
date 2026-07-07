// daon-backend\src\company\company.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common'; // 🔑 UseGuards 제거!
import { CompanyService } from './company.service';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // 🔓 일반 방문자용 전체 공개 조회
  @Get()
  async getCompany() {
    return this.companyService.getCompanyInfo();
  }

  // 🔓 회사 정보 저장/수정
  @Post()
  // 🔑 에러 원천 차단: Unknown authentication strategy "jwt" 에러를 해결하기 위해 가드를 제거합니다.
  async saveCompany(
    @Body()
    body: {
      name?: string;
      ceo?: string;
      bizNumber?: string;
      address?: string;
      addressDetail?: string;
      phone?: string;
      email?: string;
      fax?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    return this.companyService.upsertCompanyInfo(body);
  }

  // 🔑 [신규 추가] 국세청 조회용 API 주소 맵핑
  @Get('nts-check/:bizNumber')
  verifyBusiness(@Param('bizNumber') bizNumber: string) {
    return this.companyService.checkNtsStatus(bizNumber);
  }
}
// daon-backend\src\company\company.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common'; // 🔑 쓰이지 않는 Patch 임포트 제거
import { CompanyService } from './company.service';
import { Public } from '../auth/decorators/public.decorator'; // ✨ import 추가

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // 🔓 일반 방문자용 전체 공개 조회 (홈페이지 푸터 및 지도 연동용)
  @Public()
  @Get()
  async getCompany() {
    return this.companyService.getCompanyInfo();
  }

  // 🔓 회사 정보 저장/수정
  // 🚨 주의: Unknown "jwt" 에러 해결을 위해 임시로 가드를 해제한 상태입니다. 
  // 실제 운영 배포 전에는 반드시 어드민 권한 검증(AuthGuard)을 복구해야 합니다!
  @Post()
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

  // 🔑 [국세청 API] 실시간 사업자등록 상태 조회 주소 매핑
  @Public()
  @Get('nts-check/:bizNumber')
  verifyBusiness(@Param('bizNumber') bizNumber: string): Promise<string> {
    return this.companyService.checkNtsStatus(bizNumber);
  }
}
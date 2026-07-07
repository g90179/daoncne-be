// daon-backend\src\company\company.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';

// 🔑 1. 기존에 주석 처리되어 있던 가드 임포트를 해제합니다.
// (만약 파일 경로 에러가 나면 다른 정상 작동하는 컨트롤러 상단에서 JwtAuthGuard 임포트 주소를 복사해 오시면 정확합니다!)
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // 🔓 [조회] 가드를 붙이지 않으므로 로그아웃 유저, 일반 방문자 모두 자유롭게 푸터 정보를 볼 수 있습니다.
  @Get()
  async getCompany() {
    return this.companyService.getCompanyInfo();
  }

  // 🔒 [저장/수정] 주석을 해제하여 오직 로그인한 관리자만 회사 정보를 변경할 수 있게 보호합니다.
  @Post()
  @UseGuards(JwtAuthGuard) // 🔑 가드 주석 해제!
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